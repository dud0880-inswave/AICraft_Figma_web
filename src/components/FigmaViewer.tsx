import { useRef, useState, useEffect, useCallback } from 'react'
import type { FigmaNode, BoundingBox } from '../types/figma'

interface FigmaViewerProps {
  imageUrl: string | null
  pageNode: FigmaNode | null
  pageBounds: BoundingBox | null
  selectedNodes: FigmaNode[]  // 멀티 셀렉트 지원
  hoveredNode: FigmaNode | null
  loading: boolean
  imageScale?: number  // Figma API 요청 시 사용한 scale (기본값 2)
}

export default function FigmaViewer({
  imageUrl,
  pageNode: _pageNode,
  pageBounds,
  selectedNodes,
  hoveredNode,
  loading,
  imageScale = 2,  // Figma API 요청 시 사용한 scale
}: FigmaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })

  // 이미지 로드 시 크기 계산
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight })

    // 초기 뷰 맞추기
    if (containerRef.current) {
      const container = containerRef.current
      const scaleX = (container.clientWidth - 40) / img.naturalWidth
      const scaleY = (container.clientHeight - 40) / img.naturalHeight
      const fitScale = Math.min(scaleX, scaleY, 1)
      setScale(fitScale)
      setPan({
        x: (container.clientWidth - img.naturalWidth * fitScale) / 2,
        y: (container.clientHeight - img.naturalHeight * fitScale) / 2,
      })
    }
  }


  // 마우스 휠 줌
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(5, scale * delta))

    // 마우스 위치 기준으로 줌
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const newPanX = mouseX - (mouseX - pan.x) * (newScale / scale)
      const newPanY = mouseY - (mouseY - pan.y) * (newScale / scale)

      setScale(newScale)
      setPan({ x: newPanX, y: newPanY })
    }
  }, [scale, pan])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => container.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // 패닝
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true)
      setLastMouse({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMouse.x
      const dy = e.clientY - lastMouse.y
      setPan({ x: pan.x + dx, y: pan.y + dy })
      setLastMouse({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }


  // 줌 컨트롤
  const handleZoomIn = () => setScale((s) => Math.min(5, s * 1.2))
  const handleZoomOut = () => setScale((s) => Math.max(0.1, s / 1.2))
  const handleZoomFit = () => {
    if (containerRef.current && imageSize.width > 0) {
      const container = containerRef.current
      const scaleX = (container.clientWidth - 40) / imageSize.width
      const scaleY = (container.clientHeight - 40) / imageSize.height
      const fitScale = Math.min(scaleX, scaleY, 1)
      setScale(fitScale)
      setPan({
        x: (container.clientWidth - imageSize.width * fitScale) / 2,
        y: (container.clientHeight - imageSize.height * fitScale) / 2,
      })
    }
  }

  // 하이라이트 렌더링
  // pageBounds는 absoluteRenderBounds 기준 (이미지 렌더링 시작점)
  // 개별 노드는 absoluteBoundingBox 사용 (실제 요소 크기)
  const renderHighlight = (node: FigmaNode | null, color: string, borderWidth: number) => {
    if (!node || !pageBounds || !node.absoluteBoundingBox) return null

    const box = node.absoluteBoundingBox

    // 상대 좌표 계산 (pageBounds 기준)
    const relX = box.x - pageBounds.x
    const relY = box.y - pageBounds.y

    // 이미지 픽셀 좌표로 변환
    const pixelX = relX * imageScale
    const pixelY = relY * imageScale
    const pixelW = box.width * imageScale
    const pixelH = box.height * imageScale

    return (
      <div
        className="highlight-box"
        style={{
          left: pixelX,
          top: pixelY,
          width: pixelW,
          height: pixelH,
          borderColor: color,
          borderWidth: borderWidth,
          backgroundColor: `${color}20`,
        }}
      />
    )
  }

  return (
    <div className="h-full flex flex-col theme-bg-primary">
      {/* 툴바 */}
      <div className="flex items-center justify-between px-4 py-2 border-b theme-border theme-bg-secondary">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="px-2 py-1 text-sm theme-bg-tertiary hover:opacity-80 rounded theme-text-primary"
            title="축소"
          >
            −
          </button>
          <span className="text-sm theme-text-secondary w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="px-2 py-1 text-sm theme-bg-tertiary hover:opacity-80 rounded theme-text-primary"
            title="확대"
          >
            +
          </button>
          <button
            onClick={handleZoomFit}
            className="px-2 py-1 text-sm theme-bg-tertiary hover:opacity-80 rounded ml-2 theme-text-primary"
            title="화면에 맞추기"
          >
            맞추기
          </button>
        </div>

        {selectedNodes.length > 0 && (
          <div className="text-sm theme-text-secondary">
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
        className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
        style={{ backgroundColor: '#f5f5f5' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
            className="absolute"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Figma 렌더링 이미지 */}
            <img
              src={imageUrl}
              alt="Figma Page"
              onLoad={handleImageLoad}
              className="max-w-none"
              draggable={false}
            />

            {/* 하이라이트 오버레이 */}
            {renderHighlight(hoveredNode, '#ffcc00', 2)}
            {selectedNodes.map((node) => (
              <div key={node.id}>{renderHighlight(node, '#1877f2', 3)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
