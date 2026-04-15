import { useState, useEffect, useCallback, useRef } from 'react'
import type { FigmaNode, BoundingBox } from './types/figma'
import { fetchProjectSettings, saveProjectSettings, fetchMappings, fetchRegistry, fetchNodeSvgs, generateSpec, autoMapSpec, type NodeMapping, type RegistryItem } from './utils/api'
import { convertToXml } from './utils/convert-xml'
import { fetchFigmaFile, fetchNodeImages } from './utils/figma-api'
import { findNodeById, calculatePageBounds } from './utils/tree-utils'
import NodeTree from './components/NodeTree'
import FigmaViewer from './components/FigmaViewer'
import Splitter from './components/Splitter'

function getUrlParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    projectId: params.get('projectId') || '',
    fileKey: params.get('fileKey') || '',
    nodeId: params.get('nodeId') || null,
    srcFileKey: params.get('srcFileKey') || null,  // 원본 디자인 파일
    srcNodeId: params.get('srcNodeId') || null,
  }
}

function collectTextNodes(node: FigmaNode): Array<{ nodeId: string; name: string; text: string }> {
  const result: Array<{ nodeId: string; name: string; text: string }> = []
  if (node.characters && node.characters.trim()) {
    result.push({ nodeId: node.id, name: node.name, text: node.characters })
  }
  for (const child of node.children ?? []) {
    result.push(...collectTextNodes(child))
  }
  return result
}

// 경량 노드 트리 수집 (자동 매핑 대상 후보용)
interface LightNode { nodeId: string; name: string; type: string; children?: LightNode[] }
function collectLightTree(node: FigmaNode): LightNode {
  const light: LightNode = { nodeId: node.id, name: node.name, type: node.type }
  if (node.children && node.children.length > 0) {
    light.children = node.children.map(c => collectLightTree(c))
  }
  return light
}

const META_OPTIONS = [
  { value: '', label: '선택 안함' },
  { value: 'description', label: '설명' },
  { value: 'screenName', label: '화면 명' },
]

export default function Spec() {
  const { projectId, fileKey, nodeId, srcFileKey, srcNodeId } = getUrlParams()

  const [loading, setLoading] = useState(true)
  const [rootNode, setRootNode] = useState<FigmaNode | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [hoveredNode, setHoveredNode] = useState<FigmaNode | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [pageBounds, setPageBounds] = useState<BoundingBox | null>(null)
  const [mappedNodeIds, setMappedNodeIds] = useState<Set<string>>(new Set())
  const [mappings, setMappings] = useState<NodeMapping[]>([])
  const [registry, setRegistry] = useState<RegistryItem[]>([])
  const [srcRootNode, setSrcRootNode] = useState<FigmaNode | null>(null)  // 원본 디자인 파일 트리
  const [fileName, setFileName] = useState('')

  // 노드 → 메타 태그 맵: { nodeId: 'screenName' | 'description' }
  const [metaTagMap, setMetaTagMap] = useState<Record<string, string>>({})
  // 설명 → 대상 노드 연결 맵: { descNodeId: targetNodeId }
  const [markTargetMap, setMarkTargetMap] = useState<Record<string, string>>({})
  // "대상 지정" 모드: 현재 연결 중인 번호 노드 ID
  const [linkingMarkId, setLinkingMarkId] = useState<string | null>(null)

  const [leftPanelWidth, setLeftPanelWidth] = useState(288) // w-72
  const [rightPanelWidth, setRightPanelWidth] = useState(320) // w-80

  const handleLeftResize = useCallback((delta: number) => {
    setLeftPanelWidth(prev => Math.max(200, Math.min(500, prev + delta)))
  }, [])
  const handleRightResize = useCallback((delta: number) => {
    setRightPanelWidth(prev => Math.max(200, Math.min(600, prev - delta)))
  }, [])

  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [autoMapping, setAutoMapping] = useState(false)
  const [includeSpecJson, setIncludeSpecJson] = useState(true)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const specSettingsKey = `spec-meta-${fileKey}-${nodeId || ''}`
  const markTargetKey = `spec-mark-target-${fileKey}-${nodeId || ''}`

  useEffect(() => {
    if (!projectId || !fileKey) return

    const loadData = async () => {
      setLoading(true)
      try {
        const settings = await fetchProjectSettings(projectId)
        const token = settings['figma-token']
        if (!token) { setLoading(false); return }

        const file = await fetchFigmaFile(fileKey, token, nodeId)
        const pages = file.document.children || []
        let displayRoot: FigmaNode | null = null

        if (nodeId) {
          for (const page of pages) {
            const found = findNodeById(page, nodeId)
            if (found) { displayRoot = found; break }
          }
        } else {
          displayRoot = pages[0] || null
        }

        let loadedImageUrl: string | null = null
        if (displayRoot) {
          setRootNode(displayRoot)
          setFileName(displayRoot.name || file.name)

          const nodeIdForImage = nodeId || displayRoot.id
          setPageBounds(calculatePageBounds(displayRoot))

          try {
            const images = await fetchNodeImages(fileKey, token, [nodeIdForImage], 'png', 2)
            loadedImageUrl = images.images[nodeIdForImage] || null
            setImageUrl(loadedImageUrl)
          } catch { /* ignore */ }
        }

        // 메타 태그 맵 로드
        const metaData = settings[specSettingsKey]
        let hasExistingMeta = false
        if (metaData) {
          const parsed = JSON.parse(metaData)
          if (Object.keys(parsed).length > 0) {
            setMetaTagMap(parsed)
            setMappedNodeIds(new Set(Object.keys(parsed)))
            hasExistingMeta = true
          }
        }

        // 설명→대상 연결 맵 로드
        const markData = settings[markTargetKey]
        if (markData) {
          setMarkTargetMap(JSON.parse(markData))
        }

        // 최초 등록 시 자동 매핑
        if (!hasExistingMeta && displayRoot) {
          const textNodes = collectTextNodes(displayRoot)
          if (textNodes.length > 0) {
            const nodeTree = collectLightTree(displayRoot)
            setAutoMapping(true)
            try {
              const imgForMap = loadedImageUrl ?? undefined
              const { metaTagMap: autoMap, markTargetMap: autoMarkMap } = await autoMapSpec(textNodes, nodeTree, imgForMap)
              if (Object.keys(autoMap).length > 0) {
                setMetaTagMap(autoMap)
                setMappedNodeIds(new Set(Object.keys(autoMap)))
                const newMarkMap = autoMarkMap || {}
                setMarkTargetMap(newMarkMap)
                await saveProjectSettings(projectId, {
                  [specSettingsKey]: JSON.stringify(autoMap),
                  [markTargetKey]: JSON.stringify(newMarkMap),
                })
              }
            } catch (err) {
              console.error('[Spec] 자동 매핑 실패:', err)
            } finally {
              setAutoMapping(false)
            }
          }
        }

        // 매핑 정보 + 레지스트리 + 원본 디자인 파일 트리 로드
        try {
          const mappingFileKey = srcFileKey || fileKey
          const mappingNodeId = srcFileKey ? srcNodeId : nodeId
          const [mappingData, registryData] = await Promise.all([
            fetchMappings(projectId, mappingFileKey, mappingNodeId),
            fetchRegistry(projectId),
          ])
          setMappings(mappingData.filter(m => m.status === 'mapped'))
          setRegistry(registryData)

          // 원본 디자인 파일 트리 로드 (XML 변환용)
          if (srcFileKey && token) {
            try {
              const srcFile = await fetchFigmaFile(srcFileKey, token, srcNodeId)
              const srcPages = srcFile.document.children || []
              let srcRoot: FigmaNode | null = null
              if (srcNodeId) {
                for (const page of srcPages) {
                  const found = findNodeById(page, srcNodeId)
                  if (found) { srcRoot = found; break }
                }
              } else {
                srcRoot = srcPages[0] || null
              }
              setSrcRootNode(srcRoot)
            } catch { /* ignore */ }
          }
        } catch { /* ignore */ }

      } catch (err) {
        console.error('[Spec] 데이터 로드 실패:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [projectId, fileKey, nodeId, specSettingsKey, markTargetKey])

  // 노드 선택
  const handleSelectNode = useCallback((node: FigmaNode, ctrlKey: boolean) => {
    // 대상 지정 모드: 클릭한 노드를 번호의 대상으로 연결
    if (linkingMarkId) {
      const newMap = { ...markTargetMap, [linkingMarkId]: node.id }
      setMarkTargetMap(newMap)
      setLinkingMarkId(null)
      // 저장
      saveData(undefined, newMap)
      return
    }

    if (ctrlKey) {
      setSelectedNodeIds(prev =>
        prev.includes(node.id) ? prev.filter(id => id !== node.id) : [...prev, node.id]
      )
    } else {
      setSelectedNodeIds([node.id])
    }
  }, [linkingMarkId, markTargetMap])

  // 저장 (디바운스)
  const saveData = useCallback((newMetaMap?: Record<string, string>, newMarkMap?: Record<string, string>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        const data: Record<string, string> = {}
        if (newMetaMap !== undefined) data[specSettingsKey] = JSON.stringify(newMetaMap)
        if (newMarkMap !== undefined) data[markTargetKey] = JSON.stringify(newMarkMap)
        await saveProjectSettings(projectId, data)
      } catch (err) {
        console.error('저장 실패:', err)
      } finally {
        setSaving(false)
      }
    }, 500)
  }, [projectId, specSettingsKey, markTargetKey])

  // 메타 태그 변경
  const handleMetaChange = useCallback((nid: string, metaValue: string) => {
    const newMap = { ...metaTagMap }
    if (metaValue) {
      newMap[nid] = metaValue
    } else {
      delete newMap[nid]
      // 번호 해제 시 연결도 제거
      const newMarkMap = { ...markTargetMap }
      delete newMarkMap[nid]
      setMarkTargetMap(newMarkMap)
      saveData(newMap, newMarkMap)
      setMetaTagMap(newMap)
      setMappedNodeIds(new Set(Object.keys(newMap)))
      return
    }
    setMetaTagMap(newMap)
    setMappedNodeIds(new Set(Object.keys(newMap)))
    saveData(newMap, undefined)
  }, [metaTagMap, markTargetMap, saveData])

  // 연결 해제
  const handleUnlinkMark = useCallback((descriptiondeId: string) => {
    const newMap = { ...markTargetMap }
    delete newMap[descriptiondeId]
    setMarkTargetMap(newMap)
    saveData(undefined, newMap)
  }, [markTargetMap, saveData])

  const selectedNodes = rootNode
    ? selectedNodeIds.map(id => findNodeById(rootNode, id)).filter(Boolean) as FigmaNode[]
    : []

  const selectedNode = selectedNodes[0] || null
  const selectedMetaTag = selectedNode ? metaTagMap[selectedNode.id] || '' : ''

  // 노드 텍스트 추출
  const getNodeText = (node: FigmaNode): string => {
    if (node.characters) return node.characters
    if (node.children) {
      for (const child of node.children) {
        const text = getNodeText(child)
        if (text) return text
      }
    }
    return ''
  }

  // 자동 매핑 실행
  const runAutoMapping = useCallback(async () => {
    if (!rootNode || autoMapping) return
    const textNodes = collectTextNodes(rootNode)
    if (textNodes.length === 0) return

    const nodeTree = collectLightTree(rootNode)

    setAutoMapping(true)
    try {
      const { metaTagMap: autoMap, markTargetMap: autoMarkMap } = await autoMapSpec(textNodes, nodeTree, imageUrl ?? undefined)
      if (Object.keys(autoMap).length > 0) {
        setMetaTagMap(autoMap)
        setMappedNodeIds(new Set(Object.keys(autoMap)))
        const newMarkMap = autoMarkMap || {}
        setMarkTargetMap(newMarkMap)
        await saveProjectSettings(projectId, {
          [specSettingsKey]: JSON.stringify(autoMap),
          [markTargetKey]: JSON.stringify(newMarkMap),
        })
      }
    } catch (err) {
      console.error('[Spec] 자동 매핑 실패:', err)
      alert('자동 매핑에 실패했습니다.')
    } finally {
      setAutoMapping(false)
    }
  }, [rootNode, autoMapping, imageUrl, projectId, specSettingsKey, markTargetKey])

  // 스펙 매핑 삭제
  const handleDeleteSpec = useCallback(async () => {
    if (!confirm('스펙 매핑 정보를 모두 삭제하시겠습니까?')) return
    setMetaTagMap({})
    setMarkTargetMap({})
    setMappedNodeIds(new Set())
    try {
      await saveProjectSettings(projectId, {
        [specSettingsKey]: JSON.stringify({}),
        [markTargetKey]: JSON.stringify({}),
      })
    } catch (err) {
      console.error('삭제 실패:', err)
    }
  }, [projectId, specSettingsKey, markTargetKey])

  // 스펙 문서 자체 삭제 (등록 해제 + 매핑 삭제 + 목록으로 이동)
  const handleDeleteDocument = useCallback(async () => {
    if (!confirm('스펙 문서를 삭제하시겠습니까?\n매핑 정보와 등록 정보가 모두 삭제됩니다.')) return
    try {
      // 1. spec-url-map에서 해당 엔트리 제거
      const settings = await fetchProjectSettings(projectId)
      const specUrlMapRaw = settings['spec-url-map']
      if (specUrlMapRaw) {
        const specUrlMap = JSON.parse(specUrlMapRaw)
        // srcFileKey-srcNodeId 키로 찾아 삭제
        const specKey = `${srcFileKey || fileKey}-${srcNodeId || ''}`
        delete specUrlMap[specKey]
        await saveProjectSettings(projectId, { 'spec-url-map': JSON.stringify(specUrlMap) })
      }

      // 2. 매핑 데이터 삭제
      await saveProjectSettings(projectId, {
        [specSettingsKey]: JSON.stringify({}),
        [markTargetKey]: JSON.stringify({}),
      })

      // 3. 목록으로 이동
      window.location.href = `/?projectId=${projectId}`
    } catch (err) {
      console.error('스펙 문서 삭제 실패:', err)
      alert('삭제에 실패했습니다.')
    }
  }, [projectId, fileKey, srcFileKey, srcNodeId, specSettingsKey, markTargetKey])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center theme-bg-primary">
        <div className="text-center">
          <svg className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="theme-text-secondary">스펙문서 데이터 로드 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col theme-bg-primary theme-text-primary">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 border-b theme-border theme-bg-secondary">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { window.location.href = `/?projectId=${projectId}` }}
            className="p-1 theme-text-secondary hover:theme-text-primary"
            title="뒤로가기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-sm font-medium">스펙문서 - {fileName}</h1>
          {saving && <span className="text-xs theme-text-secondary">저장 중...</span>}
          {autoMapping && (
            <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded animate-pulse">
              자동 매핑 중...
            </span>
          )}
          {linkingMarkId && (
            <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded animate-pulse">
              대상 노드를 선택하세요
              <button
                onClick={() => setLinkingMarkId(null)}
                className="ml-2 underline"
              >
                취소
              </button>
            </span>
          )}
        </div>
        {/* 우측 버튼 그룹 */}
        <div className="flex items-center gap-3">
          <button
            onClick={runAutoMapping}
            disabled={autoMapping}
            className="px-2 py-1 text-xs border theme-border rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-500 disabled:opacity-50"
            title="LLM으로 텍스트 노드를 자동 분류합니다"
          >
            {autoMapping ? '매핑 중...' : '자동 매핑'}
          </button>
          {Object.keys(metaTagMap).length > 0 && (
            <button
              onClick={handleDeleteSpec}
              className="px-2 py-1 text-xs border theme-border rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"
              title="스펙 매핑 정보를 모두 삭제합니다"
            >
              매핑 삭제
            </button>
          )}
          <button
            onClick={handleDeleteDocument}
            className="px-2 py-1 text-xs border border-red-300 dark:border-red-700 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
            title="스펙 문서 등록을 해제하고 목록으로 돌아갑니다"
          >
            문서 삭제
          </button>
          {Object.keys(metaTagMap).length > 0 && (<>
            <label className="flex items-center gap-1 text-xs theme-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={includeSpecJson}
                onChange={(e) => setIncludeSpecJson(e.target.checked)}
                className="w-3.5 h-3.5 rounded"
              />
              스펙 매핑정보 포함
            </label>
          <button
            disabled={generating}
            onClick={async () => {
              // --- 1. 스펙 JSON 조합 ---
              let screenName = ''
              const specEntries: Array<Record<string, unknown>> = []

              for (const [nid, metaType] of Object.entries(metaTagMap)) {
                const nd = rootNode ? findNodeById(rootNode, nid) : null
                if (!nd) continue

                if (metaType === 'screenName') {
                  screenName = getNodeText(nd) || nd.name
                }

                const entry: Record<string, unknown> = {
                  nodeId: nid,
                  nodeName: nd.name,
                  metaType,
                  text: getNodeText(nd),
                }

                if (metaType === 'description') {
                  const allTexts: string[] = []
                  const collect = (n: FigmaNode) => {
                    if (n.characters) allTexts.push(n.characters)
                    for (const c of n.children ?? []) collect(c)
                  }
                  collect(nd)
                  entry.texts = allTexts

                  if (markTargetMap[nid]) {
                    const target = rootNode ? findNodeById(rootNode, markTargetMap[nid]) : null
                    entry.target = { nodeId: markTargetMap[nid], nodeName: target?.name || '' }
                  }
                }

                specEntries.push(entry)
              }

              const specJson = { screenName, fileName, mappings: specEntries }

              // --- 2. 전체 변환 XML 생성 (원본 디자인 파일 기준) ---
              let convertedXml: string | undefined
              if (srcRootNode && mappings.length > 0) {
                try {
                  convertedXml = convertToXml({ rootNode: srcRootNode, mappings, registry })
                } catch (e) {
                  console.warn('XML 변환 실패:', e)
                }
              }

              // --- 3. LLM 호출 ---
              setGenerating(true)
              try {
                const markdown = await generateSpec(includeSpecJson ? specJson : null, convertedXml, includeSpecJson ? (screenName || fileName) : undefined, imageUrl || undefined)

                // --- 4. 다운로드 ---
                const blob = new Blob([markdown], { type: 'text/markdown' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${screenName || fileName || 'spec'}.md`
                a.click()
                URL.revokeObjectURL(url)
              } catch (err) {
                console.error('문서 생성 실패:', err)
                alert('문서 생성에 실패했습니다. API 키를 확인하세요.')
              } finally {
                setGenerating(false)
              }
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded transition ${
              generating
                ? 'bg-gray-500 text-white cursor-wait'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {generating ? '생성 중...' : '문서 생성'}
          </button>
          </>)}
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측: 노드 트리 */}
        <div className="flex-shrink-0 border-r theme-border overflow-auto" style={{ width: leftPanelWidth }}>
          {rootNode && (
            <NodeTree
              nodes={rootNode.children || []}
              selectedNodeIds={selectedNodeIds}
              mappedNodeIds={mappedNodeIds}
              onSelectNode={handleSelectNode}
              onHoverNode={setHoveredNode}
              onGroupNodes={() => {}}
              hideGroupButton
            />
          )}
        </div>

        <Splitter direction="horizontal" onResize={handleLeftResize} />

        {/* 중앙: 피그마 뷰어 */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <FigmaViewer
            imageUrl={imageUrl}
            pageBounds={pageBounds}
            selectedNodes={selectedNodes}
            hoveredNode={hoveredNode}
            loading={false}
            imageScale={2}
          />
        </div>

        <Splitter direction="horizontal" onResize={handleRightResize} />

        {/* 우측: 메타데이터 에디터 */}
        <div className="flex-shrink-0 border-l theme-border overflow-auto" style={{ width: rightPanelWidth }}>
          <div className="p-4">
            {/* 선택된 노드 정보 */}
            {selectedNode ? (
              <>
                <div className="mb-4">
                  <div className="text-xs theme-text-secondary mb-1">선택된 노드</div>
                  <div className="text-sm font-medium theme-text-primary truncate">{selectedNode.name}</div>
                  {getNodeText(selectedNode) && (
                    <div className="text-xs theme-text-secondary mt-1 truncate">"{getNodeText(selectedNode)}"</div>
                  )}
                </div>

                <div className="border-t theme-border pt-4">
                  <div className="text-xs theme-text-secondary mb-2">메타데이터 매핑</div>

                  {/* 셀렉트박스 */}
                  <select
                    value={selectedMetaTag}
                    onChange={(e) => handleMetaChange(selectedNode.id, e.target.value)}
                    className="w-full px-3 py-2 text-sm theme-bg-tertiary border theme-border rounded theme-text-primary focus:outline-none focus:border-blue-500"
                  >
                    {META_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  {selectedMetaTag && (
                    <div className="mt-2 px-3 py-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded">
                      이 노드는 <strong>{META_OPTIONS.find(o => o.value === selectedMetaTag)?.label}</strong>로 지정됨
                    </div>
                  )}

                  {/* 번호 → 대상 연결 */}
                  {selectedMetaTag === 'description' && (
                    <div className="mt-3 p-3 border theme-border rounded">
                      <div className="text-xs theme-text-secondary mb-2">대상 요소 연결</div>
                      {markTargetMap[selectedNode.id] ? (
                        <div className="flex items-center justify-between">
                          <span
                            className="text-xs text-blue-500 cursor-pointer hover:underline truncate max-w-[160px]"
                            onClick={() => {
                              const targetId = markTargetMap[selectedNode.id]
                              setSelectedNodeIds([targetId])
                            }}
                          >
                            {rootNode && findNodeById(rootNode, markTargetMap[selectedNode.id])?.name || markTargetMap[selectedNode.id]}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setLinkingMarkId(selectedNode.id)}
                              className="text-xs px-2 py-1 theme-border border rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"
                            >
                              변경
                            </button>
                            <button
                              onClick={() => handleUnlinkMark(selectedNode.id)}
                              className="text-xs px-2 py-1 theme-border border rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"
                            >
                              해제
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setLinkingMarkId(selectedNode.id)}
                          className="w-full px-3 py-1.5 text-xs border border-dashed theme-border rounded hover:border-orange-400 hover:text-orange-400 theme-text-secondary transition"
                        >
                          + 대상 노드 선택
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs theme-text-secondary">노드를 선택하면 매핑을 편집할 수 있습니다</p>
              </div>
            )}

            {/* 매핑 요약 — 항상 표시 */}
            {Object.keys(metaTagMap).length > 0 && (
              <div className="border-t theme-border mt-4 pt-4">
                <div className="text-xs theme-text-secondary mb-2">매핑 요약</div>
                {META_OPTIONS.filter(o => o.value).map(opt => {
                  const entries = Object.entries(metaTagMap).filter(([, v]) => v === opt.value)
                  if (entries.length === 0) {
                    return (
                      <div key={opt.value} className="flex items-center justify-between py-1.5 text-xs">
                        <span className="theme-text-secondary">{opt.label}</span>
                        <span className="theme-text-secondary opacity-50">미지정</span>
                      </div>
                    )
                  }
                  return entries.map(([nid]) => {
                    const node = rootNode ? findNodeById(rootNode, nid) : null
                    const targetId = opt.value === 'description' ? markTargetMap[nid] : undefined
                    const targetNode = targetId && rootNode ? findNodeById(rootNode, targetId) : null
                    return (
                      <div key={nid} className="grid py-1.5 text-xs gap-x-2 items-center" style={{ gridTemplateColumns: '3rem 1fr auto 1fr' }}>
                        <span className="theme-text-secondary">{opt.label}</span>
                        <span
                          className="text-blue-500 cursor-pointer hover:underline truncate"
                          onClick={() => setSelectedNodeIds([nid])}
                        >
                          {node?.name || nid}
                        </span>
                        {targetNode ? (
                          <>
                            <span className="theme-text-secondary">→</span>
                            <span
                              className="text-green-500 cursor-pointer hover:underline truncate"
                              onClick={() => setSelectedNodeIds([targetNode.id])}
                            >
                              {targetNode.name}
                            </span>
                          </>
                        ) : (
                          <><span /><span /></>
                        )}
                      </div>
                    )
                  })
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
