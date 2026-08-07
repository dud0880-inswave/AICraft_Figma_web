import { useState, useEffect, useRef, useMemo } from 'react'
import type { FigmaNode } from '../types/figma'
import type { RegistryItem, NodeMapping, FigmaNodeForSignature } from '../utils/api'
import { fetchRegistry, fetchMapping, fetchMappings, saveMapping, deleteMapping, clearAllMappings, fetchProjectSettings, getRecommendedClasses, checkUniqueCluster, applyMappingBySignature, type RecommendedClass, type UniqueClusterCheck } from '../utils/api'
import { type CssItem, type ComponentClassMapping } from './SettingsModal'
import { findTextInChildren, collectAllTexts, collectTopLevelTexts } from '../utils/text-utils'
import { findParentNode } from '../utils/tree-utils'
import { extractInlineStyle } from '../utils/figma-style'
import { useDialog } from '../contexts/DialogContext'
import hljs from 'highlight.js/lib/core'
import xml from 'highlight.js/lib/languages/xml'

hljs.registerLanguage('xml', xml)


interface MappingEditorProps {
  node: FigmaNode | null  // 단일 선택 (프리뷰용)
  nodes: FigmaNode[]  // 다중 선택 (일괄 적용용)
  tree: FigmaNode | null  // 전체 트리 (parent 찾기용)
  fileKey: string | null
  rootNodeId: string | null  // 등록된 최상위 노드 ID
  projectId: string | null  // 프로젝트 ID (CSS 설정 로드용)
  cssRefreshKey?: number  // CSS 새로고침 트리거
  registryRefreshKey?: number  // Registry 새로고침 트리거
  token?: string  // Figma API 토큰 (SVG 내보내기용)
  onRegistryLoad?: (registry: RegistryItem[]) => void
  onMappingChange?: () => void
}



// FigmaNode → FigmaNodeForSignature 변환
function convertNodeForSignature(node: FigmaNode): FigmaNodeForSignature {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    componentProperties: node.componentProperties,
    children: node.children?.map(convertNodeForSignature)
  }
}

export default function MappingEditor({ node, nodes, tree, fileKey, rootNodeId, projectId, cssRefreshKey, registryRefreshKey, token: _token, onRegistryLoad, onMappingChange }: MappingEditorProps) {
  const { showAlert, showConfirm } = useDialog()
  const [registry, setRegistry] = useState<RegistryItem[]>([])
  const [mapping, setMapping] = useState<NodeMapping | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cssList, setCssList] = useState<CssItem[]>([])
  const [enableInlineStyle, setEnableInlineStyle] = useState(true)
  const [componentClassMapping, setComponentClassMapping] = useState<ComponentClassMapping>({})
  const [selectedCssId, setSelectedCssId] = useState<string | null>(null)
  const [topHeight, setTopHeight] = useState<number | null>(null) // null = 콘텐츠 높이 auto
  const [isDragging, setIsDragging] = useState(false)
  const [classSearchQuery, setClassSearchQuery] = useState('')
  const [newAttrKey, setNewAttrKey] = useState('')
  const [newAttrValue, setNewAttrValue] = useState('')
  const [recommendedClasses, setRecommendedClasses] = useState<RecommendedClass[]>([])
  const [commonClasses, setCommonClasses] = useState<string[]>([])
  const [undoStack, setUndoStack] = useState<(NodeMapping | null)[]>([])
  const [uniqueCheck, setUniqueCheck] = useState<UniqueClusterCheck & { savedMapping: NodeMapping } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const splitContainerRef = useRef<HTMLDivElement>(null)

  const pushUndo = (state: NodeMapping | null) => {
    setUndoStack(prev => [...prev.slice(-9), state])
  }


  const checkAndPromptUnique = async (savedMapping: NodeMapping) => {
    if (!projectId || !node || !tree) return
    try {
      const parent = findParentNode(tree, node.id)
      const toSig = (n: typeof node) => ({
        id: n.id, name: n.name, type: n.type,
        componentProperties: n.componentProperties,
        children: n.children?.map(c => convertNodeForSignature(c)),
      })
      const result = await checkUniqueCluster(projectId, toSig(node), parent ? toSig(parent) : null)
      if (result.isUnique && result.affectedCount && result.affectedCount > 1) {
        setUniqueCheck({ ...result, savedMapping })
      }
    } catch {
      // ignore
    }
  }

  const handleUndo = async () => {
    if (undoStack.length === 0 || !fileKey || !projectId) return
    const prev = undoStack[undoStack.length - 1]
    setUndoStack(s => s.slice(0, -1))
    const targetNode = nodes.length > 0 ? nodes[0] : node
    if (!targetNode) return
    setSaving(true)
    try {
      if (prev === null) {
        await deleteMapping(projectId, fileKey, targetNode.id, rootNodeId)
        setMapping(null)
      } else {
        const restored = await saveMapping(prev)
        setMapping(restored)
      }
      onMappingChange?.()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  // CSS 목록 및 매핑 로드 (프로젝트 설정에서)
  useEffect(() => {
    const loadCssSettings = async () => {
      if (!projectId) {
        setCssList([])
        setComponentClassMapping({})
        return
      }
      try {
        const settings = await fetchProjectSettings(projectId)
        const cssListData = settings['css-list']
        const classMappingData = settings['css-class-mapping']

        const list: CssItem[] = cssListData ? JSON.parse(cssListData) : []
        const mapping: ComponentClassMapping = classMappingData ? JSON.parse(classMappingData) : {}

        setCssList(list)
        setComponentClassMapping(mapping)
        setEnableInlineStyle(settings['enable-inline-style'] !== 'false')
        if (list.length > 0 && !selectedCssId) {
          setSelectedCssId(list[0].id)
        }
      } catch {
        setCssList([])
        setComponentClassMapping({})
      }
    }
    loadCssSettings()
  }, [projectId, cssRefreshKey])

  // 레지스트리 로드
  useEffect(() => {
    const load = async () => {
      if (!projectId) {
        setRegistry([])
        return
      }
      try {
        const items = await fetchRegistry(projectId)
        setRegistry(items)
        onRegistryLoad?.(items)
      } catch {
        // ignore
      }
    }
    load()
  }, [projectId, registryRefreshKey])

  // 노드 변경 시 매핑 로드 (다중 선택 시 첫 번째 노드)
  useEffect(() => {
    const targetNode = node || nodes[0] || null
    setUndoStack([])
    if (!targetNode || !fileKey || !projectId) {
      setMapping(null)
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const m = await fetchMapping(projectId, fileKey, targetNode.id, rootNodeId)
        setMapping(m)
      } catch {
        setMapping(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [node?.id, nodes[0]?.id, fileKey, rootNodeId, projectId])

  // 추천 클래스 조회 (매핑된 노드만)
  useEffect(() => {
    const targetNode = node || nodes[0] || null
    if (!projectId || !mapping?.registryId || !targetNode || !tree) {
      setRecommendedClasses([])
      setCommonClasses([])
      return
    }

    const loadRecommended = async () => {
      try {
        // parent 찾기 (rootNodeId === nodeId인 경우 parent는 null)
        const isRootNode = rootNodeId === targetNode.id
        const parent = isRootNode ? null : findParentNode(tree, targetNode.id)

        const { commonClasses, recommendedClasses } = await getRecommendedClasses(
          projectId,
          convertNodeForSignature(targetNode),
          parent ? convertNodeForSignature(parent) : null
        )
        setCommonClasses(commonClasses)
        setRecommendedClasses(recommendedClasses)
      } catch {
        setRecommendedClasses([])
        setCommonClasses([])
      }
    }
    loadRecommended()
  }, [mapping?.registryId, projectId, node?.id, nodes[0]?.id, tree, rootNodeId])

  // 매핑 변경 시 바인딩된 클래스가 있는 CSS 파일 우선 선택, 없으면 첫 번째 파일
  useEffect(() => {
    if (mapping?.registryId && cssList.length > 0) {
      const firstCssWithBoundClasses = cssList.find(css => {
        const classes = componentClassMapping[css.id]?.[mapping.registryId!] || []
        return classes.length > 0
      })
      if (firstCssWithBoundClasses) {
        setSelectedCssId(firstCssWithBoundClasses.id)
      } else if (!selectedCssId) {
        setSelectedCssId(cssList[0].id)
      }
    }
  }, [mapping?.registryId, cssList, componentClassMapping])

  // 컴포넌트 선택 (다중 노드 지원)
  const handleSelectComponent = async (item: RegistryItem) => {
    if (!fileKey || !projectId) return
    const targetNodes = nodes.length > 0 ? nodes : (node ? [node] : [])
    if (targetNodes.length === 0) return

    pushUndo(mapping)
    setSaving(true)
    try {
      // widget / widgetContent: 다중 선택 시 개별 채번을 위한 사전 조회
      const itemNameLower = item.name.toLowerCase()
      let allMappings: NodeMapping[] = []
      let baseCount = 0
      let widgetIdForWc = ''
      if (itemNameLower === 'widget' || (itemNameLower === 'widgetcontent' && tree)) {
        try { allMappings = await fetchMappings(projectId, fileKey, rootNodeId) } catch { /* ignore */ }
      }
      if (itemNameLower === 'widget') {
        const widgetReg = registry.find(r => r.name.toLowerCase() === 'widget')
        baseCount = widgetReg ? allMappings.filter(m => m.registryId === widgetReg.id && m.status === 'mapped').length : 0
      } else if (itemNameLower === 'widgetcontent' && tree && targetNodes.length > 0) {
        // 첫 노드 기준으로 상위 widget 찾기
        let ancestorId = targetNodes[0].id
        const widgetReg = registry.find(r => r.name.toLowerCase() === 'widget')
        for (let i = 0; i < 10; i++) {
          const parent = findParentNode(tree, ancestorId)
          if (!parent) break
          const parentMapping = allMappings.find(m => m.figmaNodeId === parent.id && m.status === 'mapped')
          if (parentMapping && widgetReg && parentMapping.registryId === widgetReg.id) {
            widgetIdForWc = parentMapping.customAttrs?.id || ''
            break
          }
          ancestorId = parent.id
        }
        if (widgetIdForWc) {
          const wcReg = registry.find(r => r.name.toLowerCase() === 'widgetcontent')
          baseCount = wcReg ? allMappings.filter(m => m.registryId === wcReg.id && m.status === 'mapped' && m.customAttrs?.id?.startsWith(`${widgetIdForWc}_wc_`)).length : 0
        }
      }

      let lastMapping: NodeMapping | null = null
      for (let idx = 0; idx < targetNodes.length; idx++) {
        const n = targetNodes[idx]
        // 개별 채번
        let autoAttrs: Record<string, string> = {}
        if (itemNameLower === 'widget') {
          autoAttrs = { id: `wg_${String(baseCount + idx + 1).padStart(2, '0')}` }
        } else if (itemNameLower === 'widgetcontent' && widgetIdForWc) {
          autoAttrs = { id: `${widgetIdForWc}_wc_${String(baseCount + idx + 1).padStart(2, '0')}` }
        }

        lastMapping = await saveMapping({
          projectId,
          figmaFileKey: fileKey,
          figmaRootNodeId: rootNodeId,
          figmaNodeId: n.id,
          figmaNodeName: n.name,
          figmaNodeType: n.type,
          registryId: item.id,
          registryName: item.name,
          registryTag: '',
          customAttrs: autoAttrs,
          status: 'mapped',
        })
      }
      // 다중 선택이어도 mapping 업데이트 (마지막 노드 기준)
      if (lastMapping) {
        setMapping(lastMapping)
        if (targetNodes.length === 1) checkAndPromptUnique(lastMapping)
      }
      onMappingChange?.()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  // 인라인 스타일 삭제/복원 토글
  const handleToggleStyle = async () => {
    if (!fileKey || !projectId || !mapping) return
    const targetNodes = nodes.length > 0 ? nodes : (node ? [node] : [])
    if (targetNodes.length === 0) return

    pushUndo(mapping)
    setSaving(true)
    try {
      let lastMapping: NodeMapping | null = null
      for (const n of targetNodes) {
        const nodeMapping = await fetchMapping(projectId, fileKey, n.id, rootNodeId)
        if (nodeMapping) {
          const newAttrs = { ...nodeMapping.customAttrs }
          if ('style' in newAttrs) {
            delete newAttrs.style
          } else {
            newAttrs.style = ''
          }
          lastMapping = await saveMapping({
            projectId,
            figmaFileKey: fileKey,
            figmaRootNodeId: rootNodeId,
            figmaNodeId: n.id,
            figmaNodeName: n.name,
            figmaNodeType: n.type,
            registryId: nodeMapping.registryId,
            registryName: nodeMapping.registryName,
            registryTag: nodeMapping.registryTag || '',
            customAttrs: newAttrs,
            status: 'mapped',
          })
        }
      }
      if (lastMapping && targetNodes.length === 1) {
        setMapping(lastMapping)
      } else if (node) {
        const m = await fetchMapping(projectId, fileKey, node.id, rootNodeId)
        setMapping(m)
      }
      onMappingChange?.()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  // 매핑 해제 (다중 노드 지원)
  const handleClearMapping = async () => {
    if (!fileKey || !projectId) return
    const targetNodes = nodes.length > 0 ? nodes : (node ? [node] : [])
    if (targetNodes.length === 0) return

    pushUndo(mapping)
    setSaving(true)
    try {
      for (const n of targetNodes) {
        await deleteMapping(projectId, fileKey, n.id, rootNodeId)
      }
      setMapping(null)
      onMappingChange?.()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  // 파일 전체 매핑 초기화
  const handleClearAllMappings = async () => {
    if (!fileKey || !projectId) return

    if (!await showConfirm('현재 파일의 모든 매핑을 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    setSaving(true)
    try {
      const result = await clearAllMappings(projectId, fileKey, rootNodeId)
      console.log(`${result.count}개의 매핑이 삭제되었습니다.`)
      setMapping(null)
      onMappingChange?.()
    } catch (error) {
      console.error('Failed to clear all mappings:', error)
      showAlert('매핑 초기화에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 클래스 토글 (다중 노드 지원)
  const handleToggleClass = async (className: string) => {
    if (!fileKey || !projectId || !mapping) return
    const targetNodes = nodes.length > 0 ? nodes : (node ? [node] : [])
    if (targetNodes.length === 0) return

    pushUndo(mapping)
    setSaving(true)
    try {
      let lastMapping: NodeMapping | null = null
      for (const n of targetNodes) {
        // 각 노드의 기존 매핑 가져오기
        const nodeMapping = await fetchMapping(projectId, fileKey, n.id, rootNodeId)
        if (nodeMapping) {
          const nodeCurrentClasses = (nodeMapping.customAttrs?.class || '').split(' ').filter(Boolean)
          const nodeNewClasses = nodeCurrentClasses.includes(className)
            ? nodeCurrentClasses.filter(c => c !== className)
            : [...nodeCurrentClasses, className]

          lastMapping = await saveMapping({
            projectId,
            figmaFileKey: fileKey,
            figmaRootNodeId: rootNodeId,
            figmaNodeId: n.id,
            figmaNodeName: n.name,
            figmaNodeType: n.type,
            registryId: nodeMapping.registryId,
            registryName: nodeMapping.registryName,
            registryTag: nodeMapping.registryTag || '',
            customAttrs: { ...nodeMapping.customAttrs, class: nodeNewClasses.join(' ') },
            status: 'mapped',
          })
        }
      }
      if (lastMapping && targetNodes.length === 1) {
        setMapping(lastMapping)
        checkAndPromptUnique(lastMapping)
      } else {
        // 다중 선택 시 첫 번째 노드의 매핑 다시 로드
        if (node) {
          const m = await fetchMapping(projectId, fileKey, node.id, rootNodeId)
          setMapping(m)
        }
      }
      onMappingChange?.()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  // 속성 추가 (다중 노드 지원)
  const handleAddAttribute = async () => {
    if (!fileKey || !projectId || !mapping || !newAttrKey.trim()) return
    const targetNodes = nodes.length > 0 ? nodes : (node ? [node] : [])
    if (targetNodes.length === 0) return

    pushUndo(mapping)
    setSaving(true)
    try {
      let lastMapping: NodeMapping | null = null
      for (const n of targetNodes) {
        const nodeMapping = await fetchMapping(projectId, fileKey, n.id, rootNodeId)
        if (nodeMapping) {
          const nodeNewAttrs = {
            ...nodeMapping.customAttrs,
            [newAttrKey.trim()]: newAttrValue
          }
          lastMapping = await saveMapping({
            projectId,
            figmaFileKey: fileKey,
            figmaRootNodeId: rootNodeId,
            figmaNodeId: n.id,
            figmaNodeName: n.name,
            figmaNodeType: n.type,
            registryId: nodeMapping.registryId,
            registryName: nodeMapping.registryName,
            registryTag: nodeMapping.registryTag || '',
            customAttrs: nodeNewAttrs,
            status: 'mapped',
          })
        }
      }

      if (lastMapping && targetNodes.length === 1) {
        setMapping(lastMapping)
        checkAndPromptUnique(lastMapping)
      } else if (node) {
        const m = await fetchMapping(projectId, fileKey, node.id, rootNodeId)
        setMapping(m)
      }

      setNewAttrKey('')
      setNewAttrValue('')
      onMappingChange?.()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  // 속성 삭제
  const handleRemoveAttribute = async (key: string) => {
    if (!fileKey || !projectId || !mapping) return
    const targetNodes = nodes.length > 0 ? nodes : (node ? [node] : [])
    if (targetNodes.length === 0) return

    pushUndo(mapping)
    setSaving(true)
    try {
      let lastMapping: NodeMapping | null = null
      for (const n of targetNodes) {
        const nodeMapping = await fetchMapping(projectId, fileKey, n.id, rootNodeId)
        if (nodeMapping) {
          const { [key]: _, ...restAttrs } = nodeMapping.customAttrs || {}
          lastMapping = await saveMapping({
            projectId,
            figmaFileKey: fileKey,
            figmaRootNodeId: rootNodeId,
            figmaNodeId: n.id,
            figmaNodeName: n.name,
            figmaNodeType: n.type,
            registryId: nodeMapping.registryId,
            registryName: nodeMapping.registryName,
            registryTag: nodeMapping.registryTag || '',
            customAttrs: restAttrs,
            status: 'mapped',
          })
        }
      }

      if (lastMapping && targetNodes.length === 1) {
        setMapping(lastMapping)
        checkAndPromptUnique(lastMapping)
      } else if (node) {
        const m = await fetchMapping(projectId, fileKey, node.id, rootNodeId)
        setMapping(m)
      }

      onMappingChange?.()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  // 현재 선택된 CSS 파일
  const selectedCss = cssList.find(c => c.id === selectedCssId)
  // 선택된 CSS 파일의 모든 클래스
  const allClassesInCss = selectedCss?.classNames || []
  // 현재 컴포넌트에 바인딩된 클래스 (설정에서 매핑된 것)
  const boundClasses = (mapping?.registryId && selectedCssId)
    ? (componentClassMapping[selectedCssId]?.[mapping.registryId] || [])
    : []
  // 현재 노드에 적용된 클래스
  const selectedClasses = (mapping?.customAttrs?.class || '').split(' ').filter(Boolean)

  // 검색 필터링
  const filteredRegistry = registry.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // CSS 클래스 검색 필터링 (검색어 완전일치 > 선택된 클래스 > 추천 클래스 > 매핑된 클래스 > 나머지)
  const filteredClasses = useMemo(() => {
    // 맨 앞 점(.) 제거 — 칩은 ".btn"으로 표시되지만 클래스명 자체는 "btn"
    const query = classSearchQuery.trim().replace(/^\./, '').toLowerCase()
    const base = query
      ? allClassesInCss.filter(cls => cls.toLowerCase().includes(query))
      : allClassesInCss
    const selected = new Set(selectedClasses)
    const recommended = new Set([
      ...commonClasses,
      ...recommendedClasses.map(r => r.className)
    ])
    const bound = new Set(boundClasses)
    const priority = (c: string) => {
      // 검색어와 완전히 동일한 클래스는 항상 최상단
      if (query && c.toLowerCase() === query) return -1
      return selected.has(c) ? 0 : recommended.has(c) ? 1 : bound.has(c) ? 2 : 3
    }
    return [...base].sort((a: string, b: string) => priority(a) - priority(b))
  }, [allClassesInCss, classSearchQuery, selectedClasses, commonClasses, recommendedClasses, boundClasses])

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Ctrl+Z 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [undoStack, fileKey, projectId, node, nodes, rootNodeId])

  // 스플리터 드래그 핸들링
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!splitContainerRef.current) return
      const rect = splitContainerRef.current.getBoundingClientRect()
      const relativeY = e.clientY - rect.top
      const minH = rect.height * 0.2
      const maxH = rect.height * 0.8
      setTopHeight(Math.max(minH, Math.min(maxH, relativeY)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // 다중 선택 시 node가 null이면 첫 번째 노드 사용
  const displayNode = node || nodes[0] || null

  return (
    <>
    <div className="h-full theme-bg-secondary flex flex-col">
      {/* 노드 정보 */}
      <div className="px-4 py-3 border-b theme-border flex-shrink-0">
        {displayNode ? (
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-medium theme-text-primary truncate" title={displayNode.name}>
                {nodes.length > 1 ? `${nodes.length}개 노드 선택됨` : displayNode.name}
              </h2>
              <p className="text-xs theme-text-secondary mt-0.5">
                {nodes.length > 1
                  ? `일괄 적용 모드`
                  : `${displayNode.type} · ${displayNode.id}`}
              </p>
            </div>
            <button
              onClick={handleClearAllMappings}
              disabled={saving}
              className="ml-2 px-2 py-1 text-xs bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded whitespace-nowrap"
              title="현재 파일의 모든 매핑을 초기화합니다"
            >
              매핑 초기화
            </button>
          </div>
        ) : (
          <p className="text-sm theme-text-secondary">노드를 선택하면 컴포넌트를 매핑할 수 있습니다</p>
        )}
      </div>

      {/* 현재 매핑 상태 */}
      {displayNode && (
        <div className="px-4 py-3 border-b theme-border flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">변환 컴포넌트</span>
            <div className="flex items-center gap-2">
              {undoStack.length > 0 && (
                <button
                  onClick={handleUndo}
                  disabled={saving}
                  title="실행 취소 (Ctrl+Z)"
                  className="text-xs text-gray-400 hover:text-gray-200"
                >
                  ↩ {undoStack.length}
                </button>
              )}
              {mapping && (
                <button
                  onClick={handleClearMapping}
                  disabled={saving}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  해제
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">로딩...</div>
          ) : mapping ? (
            <div className="mapped-component-box border rounded-lg p-3">
              <span className="text-blue-500 font-mono text-sm">{mapping.registryName}</span>
            </div>
          ) : (
            <div className="theme-bg-tertiary border theme-border rounded-lg p-3 text-center">
              <p className="text-sm theme-text-secondary">매핑되지 않음</p>
              <p className="text-xs theme-text-secondary mt-1">아래에서 컴포넌트를 선택하세요</p>
            </div>
          )}
        </div>
      )}

      {/* 스플리터 영역 */}
      <div className="flex-1 flex flex-col min-h-0" ref={splitContainerRef}>
        {/* 상단: 컴포넌트 선택 */}
        <div className="overflow-auto" style={{ height: topHeight ?? 'auto', flexShrink: 0, minHeight: 278, maxHeight: topHeight ? undefined : '50%' }}>
          <div className="px-4 py-3">
            <div className="text-xs text-gray-400 mb-2">컴포넌트 선택</div>
            <div ref={dropdownRef} className="relative">
              <input
                type="text"
                placeholder="컴포넌트 검색..."
                value={searchQuery || (mapping?.registryId ? registry.find(r => r.id === mapping.registryId)?.name || '' : '')}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setDropdownOpen(true)
                  setHighlightedIndex(-1)
                }}
                onFocus={() => {
                  setSearchQuery('')
                  setDropdownOpen(true)
                }}
                onKeyDown={(e) => {
                  if (!dropdownOpen || filteredRegistry.length === 0) return
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setHighlightedIndex(i => Math.min(i + 1, filteredRegistry.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setHighlightedIndex(i => Math.max(i - 1, 0))
                  } else if (e.key === 'Enter' && highlightedIndex >= 0) {
                    e.preventDefault()
                    handleSelectComponent(filteredRegistry[highlightedIndex])
                    setSearchQuery('')
                    setDropdownOpen(false)
                    setHighlightedIndex(-1)
                  } else if (e.key === 'Escape') {
                    setDropdownOpen(false)
                    setHighlightedIndex(-1)
                  }
                }}
                disabled={saving}
                className="w-full px-3 py-2 text-sm theme-bg-tertiary border theme-border rounded theme-text-primary placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute z-10 w-full mt-1 theme-bg-secondary border theme-border rounded shadow-lg max-h-48 overflow-auto">
                  {filteredRegistry.length > 0 ? (
                    filteredRegistry.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleSelectComponent(item)
                          setSearchQuery('')
                          setDropdownOpen(false)
                          setHighlightedIndex(-1)
                        }}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full px-3 py-2 text-left text-sm ${
                          idx === highlightedIndex
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : mapping?.registryId === item.id
                              ? 'bg-blue-100 text-blue-800 font-medium dark:bg-blue-900/60 dark:text-blue-300'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {item.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-400">검색 결과 없음</div>
                  )}
                </div>
              )}
            </div>

            {/* 인라인 스타일 삭제/복원 버튼 */}
            {mapping && (
              <button
                type="button"
                onClick={handleToggleStyle}
                disabled={saving}
                className={`mt-2 w-full px-3 py-1.5 text-xs rounded border ${
                  'style' in (mapping.customAttrs ?? {})
                    ? 'border-blue-500 text-blue-400 hover:bg-blue-900/30'
                    : 'theme-border text-gray-400 hover:text-red-400 hover:border-red-400'
                }`}
              >
                {'style' in (mapping.customAttrs ?? {}) ? '스타일 복원' : '스타일 삭제'}
              </button>
            )}

            {/* 속성 추가 영역 */}
            {mapping && (() => {
              const selectedItem = registry.find((r) => r.id === mapping.registryId)
              const selectedItemNameLower = selectedItem?.name.toLowerCase() || ''
              const isThOrTd = selectedItemNameLower === 'th' || selectedItemNameLower === 'td'

              // colspan/rowspan 값 업데이트 핸들러
              const handleSpanChange = async (attrKey: 'colspan' | 'rowspan', value: string) => {
                if (!fileKey || !projectId || !mapping) return
                const targetNodes = nodes.length > 0 ? nodes : (node ? [node] : [])
                if (targetNodes.length === 0) return

                pushUndo(mapping)
                setSaving(true)
                try {
                  let lastMapping: NodeMapping | null = null
                  for (const n of targetNodes) {
                    const nodeMapping = await fetchMapping(projectId, fileKey, n.id, rootNodeId)
                    if (nodeMapping) {
                      const newAttrs = { ...nodeMapping.customAttrs }
                      if (value && value !== '1') {
                        newAttrs[attrKey] = value
                      } else {
                        delete newAttrs[attrKey]
                      }
                      lastMapping = await saveMapping({
                        projectId,
                        figmaFileKey: fileKey,
                        figmaRootNodeId: rootNodeId,
                        figmaNodeId: n.id,
                        figmaNodeName: n.name,
                        figmaNodeType: n.type,
                        registryId: nodeMapping.registryId,
                        registryName: nodeMapping.registryName,
                        registryTag: nodeMapping.registryTag || '',
                        customAttrs: newAttrs,
                        status: 'mapped',
                      })
                    }
                  }
                  if (lastMapping && targetNodes.length === 1) {
                    setMapping(lastMapping)
                  } else if (node) {
                    const m = await fetchMapping(projectId, fileKey, node.id, rootNodeId)
                    setMapping(m)
                  }
                  onMappingChange?.()
                } catch {
                  // ignore
                } finally {
                  setSaving(false)
                }
              }

              return (
              <div className="mt-3 p-3 theme-bg-tertiary border theme-border rounded-lg">
                <div className="text-xs text-gray-400 mb-2">커스텀 속성</div>

                {/* th/td 전용: colspan, rowspan */}
                {isThOrTd && (
                  <div className="flex gap-4 mb-3 pb-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs theme-text-secondary font-mono">colspan</label>
                      <input
                        type="number"
                        min="1"
                        value={mapping.customAttrs?.colspan || ''}
                        onChange={(e) => handleSpanChange('colspan', e.target.value)}
                        placeholder="1"
                        disabled={saving}
                        className="w-16 px-2 py-1 text-xs theme-bg-primary border theme-border rounded theme-text-primary placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs theme-text-secondary font-mono">rowspan</label>
                      <input
                        type="number"
                        min="1"
                        value={mapping.customAttrs?.rowspan || ''}
                        onChange={(e) => handleSpanChange('rowspan', e.target.value)}
                        placeholder="1"
                        disabled={saving}
                        className="w-16 px-2 py-1 text-xs theme-bg-primary border theme-border rounded theme-text-primary placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 추가된 속성 목록 */}
                {mapping.customAttrs && Object.entries(mapping.customAttrs)
                  .filter(([key]) => key !== 'class' && !(isThOrTd && (key === 'colspan' || key === 'rowspan')))
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 mb-2">
                      <span className="text-xs theme-text-attr-key font-mono theme-bg-primary px-2 py-1 rounded">{key}</span>
                      <span className="text-xs text-gray-400">=</span>
                      <span className="text-xs theme-text-attr-value font-mono theme-bg-primary px-2 py-1 rounded flex-1 truncate">"{value}"</span>
                      <button
                        onClick={() => handleRemoveAttribute(key)}
                        disabled={saving}
                        className="text-xs text-red-400 hover:text-red-300 p-1"
                        title="삭제"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}

                {/* 새 속성 입력 */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="key"
                    value={newAttrKey}
                    onChange={(e) => setNewAttrKey(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs theme-bg-primary border theme-border rounded theme-text-primary placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="value"
                    value={newAttrValue}
                    onChange={(e) => setNewAttrValue(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs theme-bg-primary border theme-border rounded theme-text-primary placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    onClick={handleAddAttribute}
                    disabled={saving || !newAttrKey.trim()}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded"
                  >
                    추가
                  </button>
                </div>
              </div>
              )
            })()}

            {/* 선택된 컴포넌트의 소스코드 */}
            {mapping?.registryId && (() => {
              const selectedItem = registry.find((r) => r.id === mapping.registryId)
              if (!selectedItem) return null

              const { tagName, properties } = selectedItem
              const mergedProps: Record<string, string> = { ...properties, 'data-nodeid': displayNode?.id || '' }
              const selectedItemNameLower = selectedItem.name.toLowerCase()

              // 커스텀 속성 병합 (class는 default 뒤에 추가)
              if (mapping.customAttrs) {
                Object.entries(mapping.customAttrs).forEach(([key, value]) => {
                  if (key === 'class' && mergedProps.class) {
                    const defaultClasses = mergedProps.class.split(' ').filter(Boolean)
                    const customClasses = value.split(' ').filter((c: string) => c && !defaultClasses.includes(c))
                    mergedProps.class = [...defaultClasses, ...customClasses].join(' ')
                  } else {
                    mergedProps[key] = value
                  }
                })
              }

              if (selectedItemNameLower === 'textbox' && displayNode?.characters) {
                const textContent = displayNode.characters
                  .split('\n')
                  .map(line => line.trim())
                  .filter(Boolean)
                  .join('<br/>')
                mergedProps.label = textContent
              }

              if (selectedItemNameLower === 'button') {
                const text = displayNode?.characters || findTextInChildren(displayNode)
                if (text) mergedProps.label = text
              }

              if (selectedItemNameLower === 'input') {
                const text = displayNode?.characters || findTextInChildren(displayNode)
                if (text) mergedProps.placeholder = text
              }


              // class 없으면 컴포넌트별 인라인 스타일 적용
              // customAttrs에 style 키가 있으면 (빈 값 포함) 인라인 스타일 생성 skip
              // 설정에서 인라인 스타일이 꺼져 있으면 skip
              const hasCustomStyleKey = mapping?.customAttrs && 'style' in mapping.customAttrs
              if (enableInlineStyle && !hasCustomStyleKey && !mergedProps.class && displayNode) {
                const parentOfDisplay = tree ? findParentNode(tree, displayNode.id) : undefined
                const inlineStyle = extractInlineStyle(displayNode, selectedItemNameLower, parentOfDisplay ?? undefined)
                if (inlineStyle) {
                  const existingStyle = mergedProps.style ? `${mergedProps.style};` : ''
                  mergedProps.style = `${existingStyle}${inlineStyle}`
                }
              }


              // widget: cols 속성 추가
              if (selectedItemNameLower === 'widget' && displayNode?.absoluteBoundingBox) {
                mergedProps.cols = String(Math.round(displayNode.absoluteBoundingBox.width))
              }

              if (selectedItemNameLower === 'checkbox') {
                const texts = collectAllTexts(displayNode)
                const propsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
                const items = texts.length > 0 ? texts : ['옵션1']
                const itemsCode = items.map(t =>
`      <xf:item>
        <xf:label><![CDATA[${t}]]></xf:label>
        <xf:value><![CDATA[${t}]]></xf:value>
      </xf:item>`
                ).join('\n')

                const code = `<${tagName} ${propsStr}>
  <xf:choices>
${itemsCode}
  </xf:choices>
</${tagName}>`

                return (
                  <pre className="mt-3 p-3 theme-bg-primary border theme-border rounded text-sm font-mono theme-text-code-green overflow-x-auto whitespace-pre">
                    {code}
                  </pre>
                )
              }

              // 속성 문자열 생성 헬퍼
              const buildPropsStr = (props: Record<string, string>) => {
                return Object.entries(props).map(([k, v]) => `${k}="${v}"`).join(' ')
              }

              // table 특수 처리
              if (selectedItemNameLower === 'table') {
                const tablePropsStr = buildPropsStr(mergedProps)
                const code = `<xf:group ${tablePropsStr}>
    <w2:attributes>
        <w2:summary></w2:summary>
    </w2:attributes>
    <xf:group tagname="colgroup">
    </xf:group>
</xf:group>`

                return (
                  <pre className="mt-3 p-3 theme-bg-primary border theme-border rounded text-sm font-mono theme-text-code-green overflow-x-auto whitespace-pre">
                    {code}
                  </pre>
                )
              }

              // tr 특수 처리
              if (selectedItemNameLower === 'tr') {
                const trPropsStr = buildPropsStr(mergedProps)
                const code = `<xf:group ${trPropsStr}>
    <!-- children -->
</xf:group>`

                return (
                  <pre className="mt-3 p-3 theme-bg-primary border theme-border rounded text-sm font-mono theme-text-code-green overflow-x-auto whitespace-pre">
                    {code}
                  </pre>
                )
              }

              // th 특수 처리
              if (selectedItemNameLower === 'th') {
                const { colspan, rowspan, ...thProps } = mergedProps
                const thPropsStr = buildPropsStr(thProps)
                const hasSpan = (colspan && colspan !== '1') || (rowspan && rowspan !== '1')
                const spanAttrs = hasSpan
                  ? [
                      '<w2:scope>row</w2:scope>',
                      `<w2:colspan>${colspan || '1'}</w2:colspan>`,
                      `<w2:rowspan>${rowspan || '1'}</w2:rowspan>`
                    ]
                  : ['<w2:scope>row</w2:scope>']
                const attrsContent = spanAttrs.map(a => `        ${a}`).join('\n')
                const code = `<xf:group ${thPropsStr}>
    <w2:attributes>
${attrsContent}
    </w2:attributes>
    <!-- children -->
</xf:group>`

                return (
                  <pre className="mt-3 p-3 theme-bg-primary border theme-border rounded text-sm font-mono theme-text-code-green overflow-x-auto whitespace-pre">
                    {code}
                  </pre>
                )
              }

              // td 특수 처리
              if (selectedItemNameLower === 'td') {
                const { colspan, rowspan, ...tdProps } = mergedProps
                const tdPropsStr = buildPropsStr(tdProps)
                const hasSpan = (colspan && colspan !== '1') || (rowspan && rowspan !== '1')

                const attrsBlock = hasSpan
                  ? `\n    <w2:attributes>
        <w2:scope>row</w2:scope>
        <w2:colspan>${colspan || '1'}</w2:colspan>
        <w2:rowspan>${rowspan || '1'}</w2:rowspan>
    </w2:attributes>`
                  : ''
                const code = `<xf:group ${tdPropsStr}>${attrsBlock}
    <!-- children -->
</xf:group>`

                return (
                  <pre className="mt-3 p-3 theme-bg-primary border theme-border rounded text-sm font-mono theme-text-code-green overflow-x-auto whitespace-pre">
                    {code}
                  </pre>
                )
              }

              // gridView 특수 처리
              if (selectedItemNameLower === 'gridview') {
                const topTexts = collectTopLevelTexts(displayNode)
                const gridPropsStr = buildPropsStr(mergedProps)

                // header columns 생성
                const headerCols = topTexts.length > 0
                  ? topTexts.map((text, idx) => `            <w2:column id="column${idx}" width="70" displayMode="label" value="${text}"></w2:column>`).join('\n')
                  : `            <w2:column id="column0" width="70" displayMode="label" value="컬럼1"></w2:column>
            <w2:column id="column1" width="70" displayMode="label" value="컬럼2"></w2:column>
            <w2:column id="column2" width="70" displayMode="label" value="컬럼3"></w2:column>`

                // gBody columns 생성
                const bodyCols = topTexts.length > 0
                  ? topTexts.map((_, idx) => `            <w2:column id="gBodyColumn${idx}" width="70" inputType="text"></w2:column>`).join('\n')
                  : `            <w2:column id="gBodyColumn0" width="70" inputType="text"></w2:column>
            <w2:column id="gBodyColumn1" width="70" inputType="text"></w2:column>
            <w2:column id="gBodyColumn2" width="70" inputType="text"></w2:column>`

                const code = `<w2:gridView ${gridPropsStr}>
    <w2:caption id="caption1" style="" value="this is a grid caption."></w2:caption>
    <w2:header id="" style="">
        <w2:row>
${headerCols}
        </w2:row>
    </w2:header>
    <w2:gBody id="" style="">
        <w2:row>
${bodyCols}
        </w2:row>
    </w2:gBody>
</w2:gridView>`

                return (
                  <div className="mt-3">
                    <div className="text-xs theme-text-secondary mb-2">헤더 텍스트 ({topTexts.length}개):</div>
                    <div className="p-2 theme-bg-tertiary border theme-border rounded mb-2">
                      {topTexts.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {topTexts.map((text, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 text-xs rounded">
                              {text}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="theme-text-secondary text-sm">텍스트 없음 (기본 3컬럼)</span>
                      )}
                    </div>
                    <pre className="p-3 theme-bg-primary border theme-border rounded text-sm font-mono theme-text-code-green overflow-x-auto whitespace-pre">
                      {code}
                    </pre>
                  </div>
                )
              }

              const propsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
              const code = Object.keys(mergedProps).length > 0
                ? `<${tagName} ${propsStr}></${tagName}>`
                : `<${tagName}/>`

              return (
                <pre className="mt-3 p-3 theme-bg-primary border theme-border rounded text-sm font-mono overflow-x-auto">
                  <code className="language-xml" ref={(el) => { if (el) { el.removeAttribute('data-highlighted'); el.textContent = code; hljs.highlightElement(el) } }} />
                </pre>
              )
            })()}
          </div>
        </div>

        {/* 스플리터 핸들 */}
        <div
          className={`h-1.5 theme-bg-tertiary hover:bg-blue-500 cursor-row-resize flex items-center justify-center transition-colors select-none ${isDragging ? 'bg-blue-500' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
        >
          <div className="w-10 h-0.5 bg-gray-400 rounded" />
        </div>

        {/* 하단: CSS 클래스 선택 */}
        <div className="overflow-auto" style={{ flex: '1 1 0', minHeight: 0 }}>
          {mapping && cssList.length > 0 ? (
            <div className="px-4 py-3 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="text-xs text-gray-400">CSS 클래스</div>
                {/* 클래스 검색 */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="클래스 검색..."
                    value={classSearchQuery}
                    onChange={(e) => setClassSearchQuery(e.target.value)}
                    className="w-32 px-2 py-1 text-xs theme-bg-tertiary border theme-border rounded theme-text-primary placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
                  />
                  {classSearchQuery && (
                    <button
                      onClick={() => setClassSearchQuery('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* CSS 파일 탭 */}
              <div className="flex gap-1 mb-2 border-b theme-border overflow-x-auto flex-shrink-0">
                {cssList.map(css => {
                  const boundCount = (componentClassMapping[css.id]?.[mapping.registryId!] || []).length
                  const totalCount = css.classNames?.length || 0
                  const isActive = selectedCssId === css.id
                  return (
                    <button
                      key={css.id}
                      onClick={() => setSelectedCssId(css.id)}
                      className={`px-2 py-1 text-xs whitespace-nowrap border-b-2 transition-colors ${
                        isActive
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent theme-text-secondary hover:opacity-80'
                      }`}
                    >
                      {css.name}
                      <span className="ml-1 text-gray-500">
                        {boundCount > 0 ? `${boundCount}/` : ''}{totalCount}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* 클래스 목록 */}
              <div className="flex-1 overflow-auto">
                {filteredClasses.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {filteredClasses.map(cls => {
                      const isSelected = selectedClasses.includes(cls)
                      const isBound = boundClasses.includes(cls)
                      const isCommon = commonClasses.includes(cls)
                      const recommended = recommendedClasses.find(r => r.className === cls)
                      const isRecommended = !!recommended

                      return (
                        <button
                          key={cls}
                          onClick={() => handleToggleClass(cls)}
                          disabled={saving}
                          className={`px-2 py-1 text-xs rounded font-mono flex items-center gap-1 ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : isBound
                                ? 'bound-class-btn'
                                : isRecommended
                                  ? 'theme-bg-tertiary border border-yellow-500 theme-text-secondary hover:opacity-80'
                                  : 'theme-bg-tertiary theme-text-secondary hover:opacity-80'
                          }`}
                          title={
                            isCommon
                              ? '공통 클래스 (모든 variant에 적용됨)'
                              : isRecommended
                                ? `추천 클래스 (${recommended.frequency}/${recommended.total})`
                                : isBound
                                  ? '컴포넌트에 바인딩된 클래스'
                                  : '바인딩되지 않은 클래스'
                          }
                        >
                          {isRecommended && <span className="text-yellow-400">⭐</span>}
                          .{cls}
                          {isRecommended && <span className="text-xs text-yellow-400">({recommended.frequency}/{recommended.total})</span>}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">
                    {classSearchQuery ? '검색 결과 없음' : '클래스 없음'}
                  </div>
                )}
              </div>

              {selectedClasses.length > 0 && (
                <div className="mt-2 text-xs theme-text-secondary">
                  선택됨: {selectedClasses.join(', ')}
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-3 text-xs theme-text-secondary">
              {!mapping ? '컴포넌트를 먼저 선택하세요' : 'CSS 파일이 없습니다'}
            </div>
          )}
        </div>
      </div>
    </div>
    {/* 단일값 클러스터 전체 적용 팝업 */}
    {uniqueCheck && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="theme-bg-secondary rounded-lg w-full max-w-sm p-5">
          <h3 className="text-sm font-semibold theme-text-primary mb-2">동일 구조 노드에 매핑 적용</h3>
          <p className="text-xs theme-text-secondary mb-4">
            이 노드와 동일한 구조를 가진 <span className="text-blue-400 font-medium">{uniqueCheck.affectedCount}개</span> 노드에
            같은 매핑을 적용할까요?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setUniqueCheck(null)}
              className="px-3 py-1.5 text-xs theme-text-secondary hover:theme-text-primary"
            >
              이 노드만
            </button>
            <button
              onClick={async () => {
                if (!uniqueCheck.signature || !projectId) return
                try {
                  const result = await applyMappingBySignature(projectId, uniqueCheck.signature, uniqueCheck.mode ?? 'base', {
                    registryId: uniqueCheck.savedMapping.registryId!,
                    registryName: uniqueCheck.savedMapping.registryName!,
                    registryTag: uniqueCheck.savedMapping.registryTag,
                    customAttrs: uniqueCheck.savedMapping.customAttrs,
                  })
                  setUniqueCheck(null)
                  onMappingChange?.()
                  showAlert(`${result.appliedCount}개 노드에 매핑이 적용되었습니다.`)
                } catch {
                  showAlert('전체 적용에 실패했습니다.')
                }
              }}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded"
            >
              전체 적용
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
