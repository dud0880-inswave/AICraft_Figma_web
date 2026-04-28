import { useRef, useState, useEffect, useCallback } from 'react'
import type { FigmaNode, BoundingBox } from '../types/figma'

interface FigmaViewerProps {
  imageUrl: string | null
  pageBounds: BoundingBox | null
  selectedNodes: FigmaNode[]
  hoveredNode: FigmaNode | null
  loading: boolean
  imageScale?: number
  rootNode?: FigmaNode | null       // 호버 hit test용 노드 트리
  onHoverNode?: (node: FigmaNode | null) => void
  onSelectNode?: (node: FigmaNode) => void
}

// 노드 맵 빌드
function buildNodeMap(root: FigmaNode): Map<string, FigmaNode> {
  const map = new Map<string, FigmaNode>()
  function walk(n: FigmaNode) {
    map.set(n.id, n)
    if (n.children) n.children.forEach(walk)
  }
  walk(root)
  return map
}

// 마우스 좌표에서 가장 깊은 노드 찾기 (면적 작은 것 우선)
function findDeepestAt(
  root: FigmaNode,
  cx: number, cy: number,
  pageBounds: BoundingBox,
  sx: number, sy: number
): FigmaNode | null {
  let bestNode: FigmaNode | null = null
  let bestArea = Infinity

  function walk(node: FigmaNode) {
    if (!node.children) return
    for (const child of node.children) {
      if (child.visible === false) continue
      const bb = child.absoluteBoundingBox
      if (!bb || bb.width <= 0 || bb.height <= 0) continue
      const l = (bb.x - pageBounds.x) * sx
      const t = (bb.y - pageBounds.y) * sy
      const w = bb.width * sx
      const h = bb.height * sy
      if (cx >= l && cx <= l + w && cy >= t && cy <= t + h) {
        const area = w * h
        if (area <= bestArea) {
          bestArea = area
          bestNode = child
        }
        walk(child)
      }
    }
  }
  walk(root)
  return bestNode
}

export default function FigmaViewer({
  imageUrl,
  pageBounds,
  selectedNodes,
  hoveredNode,
  loading,
  imageScale: _imageScale = 1,
  rootNode,
  onHoverNode,
  onSelectNode,
}: FigmaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [svgScale, setSvgScale] = useState({ sx: 1, sy: 1 })
  const [svgLoaded, setSvgLoaded] = useState(false)
  const nodeMapRef = useRef<Map<string, FigmaNode>>(new Map())
  const [spaceDown, setSpaceDown] = useState(false)

  // 노드 맵 업데이트
  useEffect(() => {
    if (rootNode) {
      nodeMapRef.current = buildNodeMap(rootNode)
    }
  }, [rootNode])

  // SVG 로드 (inline 렌더링)
  useEffect(() => {
    if (!imageUrl || !canvasRef.current) { setSvgLoaded(false); return }

    const canvas = canvasRef.current
    setSvgLoaded(false)

    fetch(imageUrl)
      .then(res => res.ok ? res.text() : Promise.reject('SVG fetch failed'))
      .then(svgContent => {
        // viewBox 파싱
        let vbW = 100, vbH = 100
        const vbMatch = svgContent.match(/viewBox="([^"]+)"/)
        if (vbMatch) {
          const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number)
          if (parts.length === 4) { vbW = parts[2]; vbH = parts[3] }
        }

        // width/height 파싱
        let svgW = vbW, svgH = vbH
        const wAttr = svgContent.match(/<svg[^>]*\bwidth="([^"]+)"/)
        const hAttr = svgContent.match(/<svg[^>]*\bheight="([^"]+)"/)
        if (wAttr) svgW = parseFloat(wAttr[1])
        if (hAttr) svgH = parseFloat(hAttr[1])

        // 스케일 계산
        const sx = svgW / vbW
        const sy = svgH / vbH
        setSvgScale({ sx, sy })

        // canvas 크기 설정
        setCanvasSize({ width: svgW, height: svgH })

        // inline SVG 삽입
        canvas.innerHTML = svgContent
        const svgEl = canvas.querySelector('svg')
        if (svgEl) {
          svgEl.setAttribute('width', String(svgW))
          svgEl.setAttribute('height', String(svgH))
          svgEl.style.display = 'block'
          svgEl.style.position = 'absolute'
          svgEl.style.top = '0'
          svgEl.style.left = '0'
        }

        setSvgLoaded(true)

        // 초기 뷰 맞추기
        if (containerRef.current) {
          const container = containerRef.current
          const fitScaleX = (container.clientWidth - 40) / svgW
          const fitScaleY = (container.clientHeight - 40) / svgH
          const fitScale = Math.min(fitScaleX, fitScaleY, 1)
          setScale(fitScale)
          setPan({
            x: (container.clientWidth - svgW * fitScale) / 2,
            y: (container.clientHeight - svgH * fitScale) / 2,
          })
        }
      })
      .catch(err => {
        console.warn('[FigmaViewer] SVG load failed:', err)
        canvas.innerHTML = ''
        setSvgLoaded(false)
      })
  }, [imageUrl])

  // Space 키 (패닝 모드)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spaceDown) { setSpaceDown(true); e.preventDefault() }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') { setSpaceDown(false); e.preventDefault() }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [spaceDown])

  // 마우스 휠 줌
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey) {
      // Ctrl+wheel: zoom
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        const newScale = Math.max(0.05, Math.min(20, scale * factor))
        setPan(p => ({
          x: cx - (cx - p.x) * (newScale / scale),
          y: cy - (cy - p.y) * (newScale / scale),
        }))
        setScale(newScale)
      }
    } else if (e.shiftKey) {
      setPan(p => ({ ...p, x: p.x - e.deltaY }))
    } else {
      setPan(p => ({ ...p, y: p.y - e.deltaY }))
    }
  }, [scale])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => container.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // 패닝
  const handleMouseDown = (e: React.MouseEvent) => {
    if (spaceDown && e.button === 0) {
      setIsPanning(true)
      setLastMouse({ x: e.clientX, y: e.clientY })
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMouse.x
      const dy = e.clientY - lastMouse.y
      setPan(p => ({ x: p.x + dx, y: p.y + dy }))
      setLastMouse({ x: e.clientX, y: e.clientY })
      return
    }

    // 호버 hit test (스페이스 누르고 있으면 스킵)
    if (spaceDown || !rootNode || !pageBounds || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const cx = (e.clientX - rect.left - pan.x) / scale
    const cy = (e.clientY - rect.top - pan.y) / scale
    const found = findDeepestAt(rootNode, cx, cy, pageBounds, svgScale.sx, svgScale.sy)
    onHoverNode?.(found)
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // 클릭 → 선택
  const handleClick = (e: React.MouseEvent) => {
    if (spaceDown || isPanning) return
    if (!rootNode || !pageBounds || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const cx = (e.clientX - rect.left - pan.x) / scale
    const cy = (e.clientY - rect.top - pan.y) / scale
    const found = findDeepestAt(rootNode, cx, cy, pageBounds, svgScale.sx, svgScale.sy)
    if (found) onSelectNode?.(found)
  }

  const handleMouseLeave = () => {
    setIsPanning(false)
    onHoverNode?.(null)
  }

  // 줌 컨트롤
  const handleZoomIn = () => setScale(s => Math.min(20, s * 1.25))
  const handleZoomOut = () => setScale(s => Math.max(0.05, s / 1.25))
  const handleZoomFit = () => {
    if (containerRef.current && canvasSize.width > 0) {
      const container = containerRef.current
      const fitScaleX = (container.clientWidth - 40) / canvasSize.width
      const fitScaleY = (container.clientHeight - 40) / canvasSize.height
      const fitScale = Math.min(fitScaleX, fitScaleY, 1)
      setScale(fitScale)
      setPan({
        x: (container.clientWidth - canvasSize.width * fitScale) / 2,
        y: (container.clientHeight - canvasSize.height * fitScale) / 2,
      })
    }
  }

  // 하이라이트 렌더링
  const renderHighlight = (node: FigmaNode | null, color: string, borderWidth: number, label?: string) => {
    if (!node || !pageBounds || !node.absoluteBoundingBox) return null
    const bb = node.absoluteBoundingBox
    const x = (bb.x - pageBounds.x) * svgScale.sx
    const y = (bb.y - pageBounds.y) * svgScale.sy
    const w = bb.width * svgScale.sx
    const h = bb.height * svgScale.sy

    return (
      <div
        style={{
          position: 'absolute',
          left: x, top: y, width: w, height: h,
          border: `${borderWidth}px solid ${color}`,
          backgroundColor: `${color}15`,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        {label && (
          <span style={{
            position: 'absolute', top: -18, left: 0,
            fontSize: 10, color: '#fff', padding: '1px 5px',
            borderRadius: 2, whiteSpace: 'nowrap',
            maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
            background: color,
          }}>
            {label}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col theme-bg-primary">
      {/* 툴바 */}
      <div className="flex items-center justify-between px-4 py-2 border-b theme-border theme-bg-secondary">
        <div className="flex items-center gap-2">
          <button onClick={handleZoomOut} className="px-2 py-1 text-sm theme-bg-tertiary hover:opacity-80 rounded theme-text-primary" title="축소">−</button>
          <span className="text-sm theme-text-secondary w-16 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={handleZoomIn} className="px-2 py-1 text-sm theme-bg-tertiary hover:opacity-80 rounded theme-text-primary" title="확대">+</button>
          <button onClick={handleZoomFit} className="px-2 py-1 text-sm theme-bg-tertiary hover:opacity-80 rounded ml-2 theme-text-primary" title="화면에 맞추기">맞추기</button>
        </div>
        {selectedNodes.length > 0 && (
          <div className="text-sm theme-text-secondary truncate max-w-[300px]" title={selectedNodes.length === 1 ? selectedNodes[0].name : `${selectedNodes.length}개 선택`}>
            선택: <span className="theme-text-primary">{selectedNodes.length}개</span>
            {selectedNodes.length === 1 && (
              <span className="theme-text-secondary ml-2">({selectedNodes[0].name})</span>
            )}
          </div>
        )}
      </div>

      {/* 뷰어 */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-hidden relative ${spaceDown ? 'cursor-grab' : 'cursor-default'} ${isPanning ? '!cursor-grabbing' : ''}`}
        style={{ backgroundColor: '#f5f5f5' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="theme-text-secondary">이미지 로딩 중...</p>
            </div>
          </div>
        ) : !imageUrl ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="theme-text-secondary">페이지를 선택하세요</p>
          </div>
        ) : (
          <div
            style={{
              position: 'absolute',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              width: canvasSize.width || 'auto',
              height: canvasSize.height || 'auto',
            }}
          >
            {/* Inline SVG canvas */}
            <div ref={canvasRef} style={{ position: 'relative' }} />

            {/* 하이라이트 오버레이 */}
            {svgLoaded && hoveredNode && renderHighlight(hoveredNode, '#a259ff', 2, hoveredNode.name)}
            {svgLoaded && selectedNodes.map(node => (
              <div key={node.id}>{renderHighlight(node, '#1877f2', 2, node.name)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
