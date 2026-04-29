import { useState, useEffect, useCallback, useRef } from 'react'
import type { FigmaNode, BoundingBox } from './types/figma'
import { fetchProjectSettings, saveProjectSettings, fetchMappings, fetchRegistry, generateSpec, autoMapSpec, getFigmaFileXmlFilename, setFigmaFileXmlFilename, fetchProjectFiles, refreshFigmaFile, saveFigmaFileImage, bumpFigmaFileVersion, fetchFigmaFileData, getFigmaFileImageUrl, deleteFigmaFileData, deleteFigmaFileImage, getPersonalSettings, type NodeMapping, type RegistryItem, type SpecType } from './utils/api'
import { convertToXml } from './utils/convert-xml'
import { useDialog } from './contexts/DialogContext'
import { fetchFigmaFile, fetchNodeImages } from './utils/figma-api'
import { findNodeById, calculatePageBounds } from './utils/tree-utils'
import NodeTree from './components/NodeTree'
import FigmaViewer from './components/FigmaViewer'
import Splitter from './components/Splitter'

export interface SpecProps {
  projectId: string
  fileKey: string
  nodeId: string | null
  srcFileKey: string | null  // 원본 디자인 파일
  srcNodeId: string | null
  onClose: () => void        // 닫기 (대시보드 등으로 복귀)
}

function collectTextNodes(node: FigmaNode): Array<{ nodeId: string; name: string; text: string }> {
  const result: Array<{ nodeId: string; name: string; text: string }> = []
  if (node.visible === false) return result
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
function collectLightTree(node: FigmaNode): LightNode | null {
  if (node.visible === false) return null
  const light: LightNode = { nodeId: node.id, name: node.name, type: node.type }
  if (node.children && node.children.length > 0) {
    const kids = node.children.map(c => collectLightTree(c)).filter((c): c is LightNode => c !== null)
    if (kids.length > 0) light.children = kids
  }
  return light
}

// SVG URL → PNG data URL 변환 (Claude API는 SVG 미지원)
function svgToPngDataUrl(svgUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || 1024
      canvas.height = img.naturalHeight || 768
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(null); return }
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = svgUrl
  })
}

const META_OPTIONS = [
  { value: '', label: '선택 안함' },
  { value: 'description', label: '설명' },
  { value: 'screenName', label: '화면 명' },
]

export default function Spec({ projectId, fileKey, nodeId, srcFileKey, srcNodeId, onClose }: SpecProps) {
  const { showAlert, showConfirm } = useDialog()

  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text })
  }, [])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])
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
  const [fileVersion, setFileVersion] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

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
        const personal = await getPersonalSettings(projectId)
        const token = personal['figma-token']
        if (!token) { setLoading(false); return }

        // 버전: 매핑 파일(srcFile) 기준
        try {
          const projectFiles = await fetchProjectFiles(projectId)
          const srcKey = srcFileKey || fileKey
          const srcNid = srcFileKey ? srcNodeId : nodeId
          const rec = projectFiles.find(f => f.fileKey === srcKey && (f.nodeId ?? null) === (srcNid ?? null))
          if (rec?.version) setFileVersion(rec.version)
        } catch { /* ignore */ }

        // 스펙 노드 트리: DB에서 로드
        let displayRoot: FigmaNode | null = null
        try {
          const saved = await fetchFigmaFileData(projectId, fileKey, nodeId)
          if (saved && saved.data) displayRoot = saved.data as FigmaNode
        } catch { /* ignore */ }

        let loadedImageUrl: string | null = null
        if (displayRoot) {
          setRootNode(displayRoot)
          setFileName(displayRoot.name || '')

          setPageBounds(calculatePageBounds(displayRoot))

          // 이미지: 서버에 저장된 _spec.svg (identity=srcFile)
          const imgFileKey = srcFileKey || fileKey
          const imgNodeId = srcFileKey ? srcNodeId : nodeId
          loadedImageUrl = `${getFigmaFileImageUrl(projectId, imgFileKey, imgNodeId, 'spec')}&t=${Date.now()}`
          setImageUrl(loadedImageUrl)
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
          const nodeTree = collectLightTree(displayRoot)
          if (textNodes.length > 0 && nodeTree) {
            setAutoMapping(true)
            try {
              const pngForMap = loadedImageUrl ? await svgToPngDataUrl(loadedImageUrl) : null
              const { metaTagMap: autoMap, markTargetMap: autoMarkMap } = await autoMapSpec(textNodes, nodeTree, pngForMap ?? undefined)
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

  // 새로고침 — 스펙 파일의 Figma 데이터 갱신 + 변경 있으면 버전업 컨펌
  const handleRefresh = useCallback(async () => {
    if (!projectId || !fileKey || refreshing) return
    setRefreshing(true)
    try {
      const personal = await getPersonalSettings(projectId)
      const token = personal['figma-token']
      if (!token) {
        showToast('error', 'Figma Access Token이 설정되어 있지 않습니다.')
        return
      }

      // 1. Figma에서 최신 데이터 받아 displayRoot 추출
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
      if (!displayRoot) {
        showToast('error', '스펙 노드를 찾을 수 없습니다.')
        return
      }

      // 2. 서버에 비교 요청
      const result = await refreshFigmaFile(projectId, fileKey, nodeId, displayRoot)
      if (!result.hasChanges) {
        showToast('info', '변경된 내용이 없습니다.')
        return
      }

      // 3. 변경 있음 → 새 스펙 SVG 저장 (_spec.svg, identity=srcFile)
      const imgFileKey = srcFileKey || fileKey
      const imgNodeId = srcFileKey ? srcNodeId : nodeId
      try {
        const images = await fetchNodeImages(fileKey, token, [displayRoot.id], 'svg', 1)
        const imgUrl = images.images[displayRoot.id]
        if (imgUrl) {
          await saveFigmaFileImage(projectId, imgFileKey, imgNodeId, imgUrl, 'spec')
          setImageUrl(`${getFigmaFileImageUrl(projectId, imgFileKey, imgNodeId, 'spec')}&t=${Date.now()}`)
        }
      } catch (e) { console.warn('이미지 갱신 실패:', e) }

      setRootNode(displayRoot)
      setFileName(displayRoot.name || file.name)
      setPageBounds(calculatePageBounds(displayRoot))

      // 4. 매핑 파일(srcFile) 버전업 컨펌
      const versionFileKey = srcFileKey || fileKey
      const versionNodeId = srcFileKey ? srcNodeId : nodeId
      if (await showConfirm('스펙 문서에 변경사항이 있습니다.\n매핑 파일 버전을 올리시겠습니까?')) {
        try {
          const { version } = await bumpFigmaFileVersion(projectId, versionFileKey, versionNodeId)
          setFileVersion(version)
          showToast('success', `매핑 파일이 v${version}로 기록되었습니다.`)
        } catch (e) {
          console.error('버전 증가 실패:', e)
          showToast('error', '버전 증가에 실패했습니다.')
        }
      } else {
        showToast('success', '최신 데이터로 갱신되었습니다.')
      }

      // 5. 자동매핑 전체 재실행 (기존 덮어쓰기)
      try {
        setAutoMapping(true)
        const textNodes = collectTextNodes(displayRoot)
        const nodeTree = collectLightTree(displayRoot)
        if (textNodes.length > 0 && nodeTree) {
          const svgForMap = `${getFigmaFileImageUrl(projectId, imgFileKey, imgNodeId, 'spec')}&t=${Date.now()}`
          const pngForMap = await svgToPngDataUrl(svgForMap)
          const { metaTagMap: autoMap, markTargetMap: autoMarkMap } = await autoMapSpec(textNodes, nodeTree, pngForMap ?? undefined)
          const newMetaMap = autoMap || {}
          const newMarkMap = autoMarkMap || {}
          setMetaTagMap(newMetaMap)
          setMappedNodeIds(new Set(Object.keys(newMetaMap)))
          setMarkTargetMap(newMarkMap)
          await saveProjectSettings(projectId, {
            [specSettingsKey]: JSON.stringify(newMetaMap),
            [markTargetKey]: JSON.stringify(newMarkMap),
          })
          showToast('success', '자동 매핑이 재실행되었습니다.')
        }
      } catch (e) {
        console.error('자동매핑 재실행 실패:', e)
        showToast('error', '자동매핑 재실행에 실패했습니다.')
      } finally {
        setAutoMapping(false)
      }
    } catch (err) {
      console.error('[Spec] 새로고침 실패:', err)
      showToast('error', '새로고침에 실패했습니다.')
    } finally {
      setRefreshing(false)
    }
  }, [projectId, fileKey, nodeId, srcFileKey, srcNodeId, refreshing, showToast, specSettingsKey, markTargetKey])

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
    if (!nodeTree) return

    setAutoMapping(true)
    try {
      const pngForMap = imageUrl ? await svgToPngDataUrl(imageUrl) : null
      const { metaTagMap: autoMap, markTargetMap: autoMarkMap } = await autoMapSpec(textNodes, nodeTree, pngForMap ?? undefined)
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
      showAlert('자동 매핑에 실패했습니다.')
    } finally {
      setAutoMapping(false)
    }
  }, [rootNode, autoMapping, imageUrl, projectId, specSettingsKey, markTargetKey])

  // 스펙 매핑 삭제
  const handleDeleteSpec = useCallback(async () => {
    if (!await showConfirm('스펙 매핑 정보를 모두 삭제하시겠습니까?')) return
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
    if (!await showConfirm('스펙 문서를 삭제하시겠습니까?\n매핑 정보와 등록 정보가 모두 삭제됩니다.')) return
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

      // 3. 스펙 노드 트리 삭제 (figma_file_data)
      try {
        await deleteFigmaFileData(projectId, fileKey, nodeId)
      } catch (e) { console.warn('스펙 트리 삭제 실패:', e) }

      // 4. 스펙 이미지 (_spec.svg) 삭제 — identity=srcFile
      try {
        const imgFileKey = srcFileKey || fileKey
        const imgNodeId = srcFileKey ? srcNodeId : nodeId
        await deleteFigmaFileImage(projectId, imgFileKey, imgNodeId, 'spec')
      } catch (e) { console.warn('스펙 이미지 삭제 실패:', e) }

      // 5. 목록으로 이동
      onClose()
    } catch (err) {
      console.error('스펙 문서 삭제 실패:', err)
      showAlert('삭제에 실패했습니다.')
    }
  }, [projectId, fileKey, nodeId, srcFileKey, srcNodeId, specSettingsKey, markTargetKey, onClose])

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
            onClick={onClose}
            className="p-1 theme-text-secondary hover:theme-text-primary"
            title="뒤로가기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-sm font-medium">스펙문서 - {fileName}</h1>
          {fileVersion && (
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">v{fileVersion}</span>
          )}
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
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1 theme-text-secondary hover:text-blue-500 disabled:opacity-50"
            title="스펙 문서 새로고침"
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
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

              setGenerating(true)
              try {
                // --- 3. 경로/파일명/버전 준비 ---
                const personalForPath = await getPersonalSettings(projectId)
                const exportPath = personalForPath['xml-export-path'] || ''

                const folderFileKey = srcFileKey || fileKey
                const folderNodeId = srcFileKey ? srcNodeId : nodeId
                let folderName = await getFigmaFileXmlFilename(projectId, folderFileKey, folderNodeId)
                let version = '01'
                try {
                  const projectFiles = await fetchProjectFiles(projectId)
                  const rec = projectFiles.find(f => f.fileKey === folderFileKey && (f.nodeId ?? null) === (folderNodeId ?? null))
                  if (rec?.version) version = rec.version
                } catch { /* ignore */ }
                if (!folderName) {
                  const defaultName = (screenName || fileName || 'spec').replace(/[<>:"/\\|?*]/g, '_')
                  const input = window.prompt('파일명을 입력해주세요 (.xml 확장자 제외)', defaultName)
                  if (!input || !input.trim()) {
                    showToast('error', '파일명이 필요합니다. 저장을 취소합니다.')
                    return
                  }
                  folderName = input.trim().replace(/[<>:"/\\|?*]/g, '_')
                  try {
                    await setFigmaFileXmlFilename(projectId, folderFileKey, folderNodeId, folderName)
                  } catch (e) {
                    console.warn('xmlFilename 저장 실패:', e)
                  }
                }

                const exportWsFolder = personalForPath['xml-export-ws-folder'] || ''

                // --- Extension host 헬퍼 ---
                const vscApi = (window as unknown as { __vscode?: { postMessage: (msg: unknown) => void } }).__vscode
                const saveFileViaExtension = (content: string, relativePath: string): Promise<{ path: string }> => {
                  return new Promise((resolve, reject) => {
                    if (!vscApi) { reject(new Error('Not in extension')); return }
                    const rid = `save-${Date.now()}-${Math.random()}`
                    const handler = (ev: MessageEvent) => {
                      if (ev.data?.type === 'fileSaved' && ev.data?.requestId === rid) {
                        window.removeEventListener('message', handler)
                        if (ev.data.error) reject(new Error(ev.data.error))
                        else resolve({ path: ev.data.path })
                      }
                    }
                    window.addEventListener('message', handler)
                    setTimeout(() => { window.removeEventListener('message', handler); reject(new Error('Timeout')) }, 30000)
                    vscApi.postMessage({ type: 'saveFile', requestId: rid, content, relativePath, wsFolder: exportWsFolder })
                  })
                }
                const readPriorSpecs = (basePath: string, upToVersion: number, specFileName: string): Promise<Array<{ version: string; content: string }>> => {
                  return new Promise((resolve) => {
                    if (!vscApi) { resolve([]); return }
                    const rid = `prior-${Date.now()}-${Math.random()}`
                    const handler = (ev: MessageEvent) => {
                      if (ev.data?.type === 'priorSpecsLoaded' && ev.data?.requestId === rid) {
                        window.removeEventListener('message', handler)
                        resolve(ev.data.priorSpecs || [])
                      }
                    }
                    window.addEventListener('message', handler)
                    setTimeout(() => { window.removeEventListener('message', handler); resolve([]) }, 10000)
                    vscApi.postMessage({ type: 'readPriorSpecs', requestId: rid, wsFolder: exportWsFolder, basePath, upToVersion, fileName: specFileName })
                  })
                }

                // --- 4. v02 이상이면 이전 스펙 조회 (v01 ~ v(N-1)) - 3종 각각 ---
                const versionNum = parseInt(version, 10)
                const specTypes: Array<{ type: SpecType; fileName: string }> = [
                  { type: 'screen-info', fileName: 'screen-info.md' },
                  { type: 'test-plan', fileName: 'test-plan.md' },
                  { type: 'interface-metadata', fileName: 'interface-metadata.json' },
                ]

                const basePath = exportPath ? `${exportPath}/${folderName}` : folderName

                // 이전 스펙 조회 (3종 병렬) — extension host에서 워크스페이스 파일 읽기
                const priorSpecsMap: Record<string, Array<{ version: string; content: string }>> = {}
                if (versionNum > 1) {
                  const priorResults = await Promise.all(
                    specTypes.map(async (st) => {
                      try {
                        return { type: st.type, specs: await readPriorSpecs(basePath, versionNum, st.fileName) }
                      } catch (e) {
                        console.warn(`이전 스펙 조회 실패 (${st.type}):`, e)
                        return { type: st.type, specs: [] }
                      }
                    })
                  )
                  for (const r of priorResults) priorSpecsMap[r.type] = r.specs
                }

                // --- 5. LLM 호출 (SVG→PNG 변환 후 3종 병렬 생성) ---
                const pngForSpec = imageUrl ? await svgToPngDataUrl(imageUrl) : null
                const specJsonArg = includeSpecJson ? specJson : null
                const screenNameArg = includeSpecJson ? (screenName || fileName) : undefined
                const imgArg = pngForSpec || undefined

                const generateResults = await Promise.all(
                  specTypes.map(async (st) => {
                    const priorSpecs = priorSpecsMap[st.type] || []
                    const content = await generateSpec(
                      specJsonArg,
                      convertedXml,
                      screenNameArg,
                      imgArg,
                      priorSpecs.length > 0 ? priorSpecs : undefined,
                      st.type,
                    )
                    return { ...st, content }
                  })
                )

                // --- 6. Extension host로 3종 파일 저장 (병렬) ---
                const versionFolder = `v${version.padStart(2, '0')}`
                const saveResults = await Promise.all(
                  generateResults.map(r =>
                    saveFileViaExtension(r.content, `${basePath}/${versionFolder}/${r.fileName}`)
                  )
                )
                const hasPrior = Object.values(priorSpecsMap).some(specs => specs.length > 0)
                const mode = hasPrior ? `변경분 (이전 스펙 참조)` : '전체 스펙'
                const savedPaths = saveResults.map(r => r.path.split(/[/\\]/).pop()).join(', ')
                showToast('success', `3종 문서 저장 완료 [${mode}]: ${savedPaths}`)
              } catch (err) {
                console.error('문서 생성/저장 실패:', err)
                showToast('error', '문서 생성/저장에 실패했습니다. 설정과 API 키를 확인하세요.')
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
            imageScale={1}
            rootNode={rootNode}
            onHoverNode={(node) => setHoveredNode(node)}
            onSelectNode={(node) => handleSelectNode(node, false)}
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
                    <div className="text-xs theme-text-secondary mt-1 truncate max-w-full overflow-hidden" title={getNodeText(selectedNode)}>"{getNodeText(selectedNode)}"</div>
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

      {/* 토스트 메시지 */}
      {toast && (
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg z-50 shadow-lg text-white ${
          toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-gray-700'
        }`}>
          {toast.text}
        </div>
      )}
    </div>
  )
}
