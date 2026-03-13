import { useState, useCallback, useEffect, useRef } from 'react'
import type { FigmaFile, FigmaNode, BoundingBox } from './types/figma'
import type { RegistryItem, AutoMappingSuggestion, FigmaNodeForSignature } from './utils/api'
import { saveFigmaFile, touchFigmaFile, fetchMappings, fetchFigmaFileData, saveFigmaFileData, saveMapping, fetchAutoMappingSuggestions, applyAutoMappingSuggestions } from './utils/api'
import { parseFigmaUrl, fetchFigmaFile, fetchNodeImages } from './utils/figma-api'
import { findNodeById, calculatePageBounds, groupNodes, ungroupNode, reorderNodes } from './utils/tree-utils'
import Dashboard from './components/Dashboard'
import AddFileModal from './components/AddFileModal'
import PageTabs from './components/PageTabs'
import NodeTree from './components/NodeTree'
import FigmaViewer from './components/FigmaViewer'
import MappingEditor from './components/MappingEditor'
import ConvertedCodeEditor from './components/ConvertedCodeEditor'
import Splitter from './components/Splitter'
import SettingsModal, { loadSavedToken } from './components/SettingsModal'
import AutoMappingSuggestionModal from './components/AutoMappingSuggestionModal'

type AppView = 'dashboard' | 'editor'

interface AppState {
  token: string
  fileKey: string | null
  file: FigmaFile | null
  currentPageId: string | null
  targetNodeId: string | null  // URL에서 지정한 노드 ID
  selectedNodeIds: string[]  // 멀티 셀렉트 지원
  primarySelectedId: string | null  // 마지막 선택된 노드 (매핑 에디터용)
  hoveredNodeId: string | null
  nodeImages: Record<string, string>  // 노드별 이미지
  nodeBounds: Record<string, BoundingBox>  // 노드별 바운딩박스
  loading: boolean
  imageLoading: boolean
  error: string | null
}

const initialState: AppState = {
  token: '',
  fileKey: null,
  file: null,
  currentPageId: null,
  targetNodeId: null,
  selectedNodeIds: [],
  primarySelectedId: null,
  hoveredNodeId: null,
  nodeImages: {},
  nodeBounds: {},
  loading: false,
  imageLoading: false,
  error: null,
}

export default function App() {
  const [state, setState] = useState<AppState>(() => ({
    ...initialState,
    token: loadSavedToken(),  // localStorage에서 토큰 불러오기
  }))
  const [view, setView] = useState<AppView>('dashboard')
  const [showSettings, setShowSettings] = useState(false)
  const [showAddFileModal, setShowAddFileModal] = useState(false)
  const [dashboardKey, setDashboardKey] = useState(0)

  // 패널 너비 상태
  const [leftPanelWidth, setLeftPanelWidth] = useState(288)  // 기본 w-72 (18rem = 288px)
  const [rightPanelWidth, setRightPanelWidth] = useState(600)  // 기본 maxWidth
  const [codeEditorWidth, setCodeEditorWidth] = useState(800)  // 기본 maxWidth
  const [codeEditorVisible, setCodeEditorVisible] = useState(true)  // 기본 표시
  const [registry, setRegistry] = useState<RegistryItem[]>([])  // 레지스트리 데이터
  const [convertTrigger, setConvertTrigger] = useState(0)  // 변환 트리거
  const [mappedNodeIds, setMappedNodeIds] = useState<Set<string>>(new Set())  // 매핑된 노드 ID
  const containerRef = useRef<HTMLDivElement>(null)

  // 자동 매핑 제안 모달 상태
  const [autoMappingSuggestions, setAutoMappingSuggestions] = useState<AutoMappingSuggestion[]>([])
  const [showAutoMappingModal, setShowAutoMappingModal] = useState(false)
  const [autoMappingLoading, setAutoMappingLoading] = useState(false)
  const [pendingFileKey, setPendingFileKey] = useState<string | null>(null)
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null)

  // 왼쪽 패널 리사이즈
  const handleLeftResize = useCallback((delta: number) => {
    setLeftPanelWidth(prev => Math.max(320, Math.min(600, prev + delta)))
  }, [])

  // 오른쪽 패널 리사이즈
  const handleRightResize = useCallback((delta: number) => {
    setRightPanelWidth(prev => Math.max(200, Math.min(600, prev - delta)))
  }, [])

  // 코드 에디터 리사이즈
  const handleCodeEditorResize = useCallback((delta: number) => {
    setCodeEditorWidth(prev => Math.max(200, Math.min(800, prev - delta)))
  }, [])

  // 파일 추가 (대시보드에 추가 + 자동 매핑 제안)
  const handleAddFile = useCallback(async (token: string, fileUrl: string) => {
    const parsed = parseFigmaUrl(fileUrl)
    if (!parsed) {
      setState((s) => ({ ...s, error: '올바른 Figma URL이 아닙니다' }))
      return
    }

    const { fileKey, nodeId } = parsed
    setState((s) => ({ ...s, loading: true, error: null, token }))

    try {
      const file = await fetchFigmaFile(fileKey, token)
      const pages = file.document.children || []
      let displayRoot: FigmaNode | null = null

      // nodeId가 있으면 해당 노드 정보로 저장
      if (nodeId) {
        let targetNode: FigmaNode | null = null
        for (const page of pages) {
          targetNode = findNodeById(page, nodeId)
          if (targetNode) break
        }

        if (targetNode) {
          displayRoot = targetNode
          // 노드 이미지 가져오기
          const images = await fetchNodeImages(fileKey, token, [nodeId], 'png', 1)
          const thumbnailUrl = images.images[nodeId] || undefined
          await saveFigmaFile(fileKey, nodeId, targetNode.name, thumbnailUrl)
        } else {
          throw new Error('해당 노드를 찾을 수 없습니다')
        }
      } else {
        // 전체 파일 저장
        displayRoot = pages[0] || null
        await saveFigmaFile(fileKey, null, file.name, file.thumbnailUrl)
      }

      setState((s) => ({ ...s, loading: false }))
      setShowAddFileModal(false)
      setDashboardKey((k) => k + 1) // 대시보드 새로고침

      // 자동 매핑 제안 확인
      console.log('[DEBUG] 자동 매핑 제안 확인 시작', { displayRoot: !!displayRoot, hasChildren: !!displayRoot?.children })
      if (displayRoot && displayRoot.children) {
        try {
          // 노드를 시그니처용 형태로 변환 (전체 자식 포함)
          const convertNode = (node: FigmaNode): FigmaNodeForSignature => ({
            id: node.id,
            name: node.name,
            type: node.type,
            children: node.children?.map(c => convertNode(c)),
          })

          const nodesForSignature = displayRoot.children.map(c => convertNode(c))
          console.log('[DEBUG] 시그니처용 노드 수:', nodesForSignature.length)

          const suggestions = await fetchAutoMappingSuggestions(nodesForSignature, [])
          console.log('[DEBUG] 자동 매핑 제안 결과:', suggestions.length, suggestions)

          if (suggestions.length > 0) {
            setAutoMappingSuggestions(suggestions)
            setPendingFileKey(fileKey)
            setPendingNodeId(nodeId)
            setShowAutoMappingModal(true)
          }
        } catch (e) {
          console.error('Failed to fetch auto mapping suggestions:', e)
        }
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : '파일 추가 실패',
      }))
    }
  }, [])

  // 이미지 로드 (노드 또는 페이지)
  useEffect(() => {
    const nodeIdToLoad = state.targetNodeId || state.currentPageId
    console.log('[DEBUG] 이미지 로드 useEffect:', {
      nodeIdToLoad,
      fileKey: state.fileKey,
      hasToken: !!state.token,
      alreadyLoaded: nodeIdToLoad ? !!state.nodeImages[nodeIdToLoad] : false
    })

    if (!nodeIdToLoad || !state.fileKey || !state.token) {
      console.log('[DEBUG] 이미지 로드 스킵 - 필수 값 없음')
      return
    }
    if (state.nodeImages[nodeIdToLoad]) {
      console.log('[DEBUG] 이미지 로드 스킵 - 이미 로드됨')
      return
    }

    const loadImage = async () => {
      console.log('[DEBUG] 이미지 로드 시작:', nodeIdToLoad)
      setState((s) => ({ ...s, imageLoading: true }))

      try {
        const result = await fetchNodeImages(
          state.fileKey!,
          state.token,
          [nodeIdToLoad],
          'png',
          2 // scale 2x for better quality
        )

        console.log('[DEBUG] 이미지 로드 결과:', result)
        const imageUrl = result.images[nodeIdToLoad]
        if (imageUrl) {
          console.log('[DEBUG] 이미지 URL 획득:', imageUrl.substring(0, 50) + '...')
          setState((s) => ({
            ...s,
            nodeImages: { ...s.nodeImages, [nodeIdToLoad]: imageUrl },
            imageLoading: false,
          }))
        } else {
          console.log('[DEBUG] 이미지 URL 없음')
          setState((s) => ({ ...s, imageLoading: false }))
        }
      } catch (err) {
        console.error('이미지 로드 실패:', err)
        setState((s) => ({ ...s, imageLoading: false }))
      }
    }

    loadImage()
  }, [state.targetNodeId, state.currentPageId, state.fileKey, state.token])

  // 매핑 정보 로드
  useEffect(() => {
    if (!state.fileKey) {
      setMappedNodeIds(new Set())
      return
    }

    const loadMappings = async () => {
      try {
        const mappings = await fetchMappings(state.fileKey!)
        const ids = new Set(mappings.map(m => m.figmaNodeId))
        setMappedNodeIds(ids)
      } catch (err) {
        console.error('매핑 정보 로드 실패:', err)
      }
    }

    loadMappings()
  }, [state.fileKey, convertTrigger])

  // 페이지 선택
  const handleSelectPage = useCallback((pageId: string) => {
    setState((s) => ({
      ...s,
      currentPageId: pageId,
      targetNodeId: null,  // 페이지 선택 시 타겟 노드 해제
      selectedNodeIds: [],
      primarySelectedId: null,
      hoveredNodeId: null,
    }))
  }, [])

  // 노드 선택 (Ctrl+클릭으로 멀티 셀렉트)
  const handleSelectNode = useCallback((node: FigmaNode, ctrlKey: boolean) => {
    setState((s) => {
      if (ctrlKey) {
        // Ctrl+클릭: 토글
        const isSelected = s.selectedNodeIds.includes(node.id)
        if (isSelected) {
          const newIds = s.selectedNodeIds.filter(id => id !== node.id)
          return {
            ...s,
            selectedNodeIds: newIds,
            primarySelectedId: newIds.length > 0 ? newIds[newIds.length - 1] : null,
          }
        } else {
          return {
            ...s,
            selectedNodeIds: [...s.selectedNodeIds, node.id],
            primarySelectedId: node.id,
          }
        }
      } else {
        // 일반 클릭: 단일 선택
        return {
          ...s,
          selectedNodeIds: [node.id],
          primarySelectedId: node.id,
        }
      }
    })
  }, [])

  // 여러 노드 선택 (검색 결과 전체 선택 등)
  const handleSelectNodeIds = useCallback((nodeIds: string[]) => {
    setState((s) => ({
      ...s,
      selectedNodeIds: nodeIds,
      primarySelectedId: nodeIds.length > 0 ? nodeIds[nodeIds.length - 1] : null,
    }))
  }, [])

  // 노드 호버
  const handleHoverNode = useCallback((node: FigmaNode | null) => {
    setState((s) => ({ ...s, hoveredNodeId: node?.id || null }))
  }, [])

  // 리셋 (대시보드로 돌아가기)
  const handleReset = useCallback(() => {
    setState((s) => ({ ...initialState, token: s.token }))  // 토큰은 유지
    setView('dashboard')
  }, [])

  // 대시보드에서 파일 선택
  const handleSelectFileFromDashboard = useCallback(async (fileKey: string, nodeId: string | null) => {
    if (!state.token) {
      setShowSettings(true)
      return
    }

    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      // Figma에서 원본 파일 가져오기
      let file = await fetchFigmaFile(fileKey, state.token)

      // 저장된 수정 데이터가 있으면 적용
      try {
        const savedData = await fetchFigmaFileData(fileKey, nodeId)
        if (savedData && savedData.data) {
          // 저장된 document 구조로 교체
          file = { ...file, document: savedData.data as typeof file.document }
        }
      } catch (e) {
        console.error('Failed to load saved file data:', e)
      }

      const pages = file.document.children || []

      console.log('[DEBUG] 파일 로드:', { fileKey, nodeId, pagesCount: pages.length })

      let targetPageId = pages[0]?.id || null
      let targetNodeId: string | null = null

      // nodeId가 있으면 해당 노드 찾기
      if (nodeId) {
        console.log('[DEBUG] nodeId로 노드 찾기 시작:', nodeId)
        for (const page of pages) {
          const node = findNodeById(page, nodeId)
          if (node) {
            console.log('[DEBUG] 노드 찾음:', { pageId: page.id, nodeName: node.name })
            targetPageId = page.id
            targetNodeId = nodeId
            break
          }
        }
        if (!targetNodeId) {
          console.log('[DEBUG] 노드를 찾지 못함! nodeId:', nodeId)
        }
      }

      // 바운딩 박스 계산
      // Figma 이미지 렌더링은 absoluteRenderBounds 기준 (그림자, 블러 등 효과 포함)
      const nodeBounds: Record<string, BoundingBox> = {}
      if (targetNodeId && targetPageId) {
        const page = pages.find(p => p.id === targetPageId)
        if (page) {
          const targetNode = findNodeById(page, targetNodeId)
          // absoluteRenderBounds 우선 사용 (이미지 렌더링과 일치)
          const bounds = targetNode?.absoluteRenderBounds || targetNode?.absoluteBoundingBox
          if (bounds) {
            nodeBounds[targetNodeId] = bounds
          }
        }
      } else {
        for (const page of pages) {
          const bounds = calculatePageBounds(page)
          if (bounds) {
            nodeBounds[page.id] = bounds
          }
        }
      }

      // DB 업데이트 (lastOpenedAt만)
      try {
        await touchFigmaFile(fileKey, nodeId)
      } catch (e) {
        console.error('Failed to update file info:', e)
      }

      setState((s) => ({
        ...s,
        fileKey,
        file,
        currentPageId: targetPageId,
        targetNodeId,
        selectedNodeIds: [],
        primarySelectedId: null,
        nodeBounds,
        loading: false,
      }))
      setView('editor')

    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : '파일 로드 실패',
      }))
    }
  }, [state.token])

  // 토큰 저장
  const handleSaveToken = useCallback((token: string) => {
    setState((s) => ({ ...s, token }))
  }, [])

  // 자동 매핑 적용 후 에디터로 이동
  const handleApplyAutoMapping = useCallback(async (selectedSuggestions: AutoMappingSuggestion[]) => {
    const fileKey = pendingFileKey
    const nodeId = pendingNodeId

    if (!fileKey) {
      setShowAutoMappingModal(false)
      return
    }

    setAutoMappingLoading(true)
    try {
      if (selectedSuggestions.length > 0) {
        await applyAutoMappingSuggestions(
          fileKey,
          selectedSuggestions.map(s => ({
            nodeId: s.nodeId,
            nodeName: s.nodeName,
            nodeType: s.nodeType,
            registryId: s.registryId,
            registryName: s.registryName,
            customAttrs: s.customAttrs,
          }))
        )
      }
      setShowAutoMappingModal(false)
      // 에디터로 이동
      handleSelectFileFromDashboard(fileKey, nodeId)
    } catch (e) {
      console.error('Failed to apply auto mapping:', e)
    } finally {
      setAutoMappingLoading(false)
    }
  }, [pendingFileKey, pendingNodeId, handleSelectFileFromDashboard])

  // 노드 순서 변경
  const handleReorderNodes = useCallback(async (parentId: string | null, nodeId: string, newIndex: number) => {
    const s = state
    if (!s.file || !s.fileKey) return

    const pages = s.file.document.children || []
    const currentPage = pages.find((p) => p.id === s.currentPageId)
    if (!currentPage) return

    const displayRoot = s.targetNodeId
      ? findNodeById(currentPage, s.targetNodeId)
      : currentPage
    if (!displayRoot) return

    const newDisplayRoot = reorderNodes(displayRoot, parentId, nodeId, newIndex)

    // 파일 구조 업데이트
    const newPages = pages.map(p => {
      if (p.id === s.currentPageId) {
        if (s.targetNodeId) {
          // targetNodeId가 있으면 해당 노드를 찾아서 교체
          const replaceNode = (node: typeof p): typeof p => {
            if (node.id === s.targetNodeId) {
              return newDisplayRoot as typeof p
            }
            if (node.children) {
              return { ...node, children: node.children.map(replaceNode) }
            }
            return node
          }
          return replaceNode(p)
        } else {
          return newDisplayRoot as typeof p
        }
      }
      return p
    })

    const newDocument = {
      ...s.file.document,
      children: newPages,
    }

    const newFile = {
      ...s.file,
      document: newDocument,
    }

    // 서버에 저장
    try {
      await saveFigmaFileData(s.fileKey, s.targetNodeId, newDocument)
    } catch (e) {
      console.error('Failed to save file data:', e)
    }

    setState(prev => ({ ...prev, file: newFile }))
  }, [state])

  // 노드 그룹화
  const handleGroupNodes = useCallback(async () => {
    const s = state
    if (s.selectedNodeIds.length < 1) return
    if (!s.file || !s.fileKey) return

    const pages = s.file.document.children || []
    const currentPage = pages.find((p) => p.id === s.currentPageId)
    if (!currentPage) return

    const displayRoot = s.targetNodeId
      ? findNodeById(currentPage, s.targetNodeId)
      : currentPage
    if (!displayRoot) return

    const result = groupNodes(displayRoot, s.selectedNodeIds)
    if (!result) return

    // 파일 구조 업데이트
    const newPages = pages.map(p => {
      if (p.id === s.currentPageId) {
        if (s.targetNodeId) {
          const newPage = { ...p }
          const replaceNode = (node: typeof p): typeof p => {
            if (node.id === s.targetNodeId) {
              return result.newRoot as typeof p
            }
            if (node.children) {
              return { ...node, children: node.children.map(replaceNode) }
            }
            return node
          }
          return replaceNode(newPage)
        } else {
          return result.newRoot as typeof p
        }
      }
      return p
    })

    const newDocument = {
      ...s.file.document,
      children: newPages,
    }

    const newFile = {
      ...s.file,
      document: newDocument,
    }

    // 서버에 저장
    try {
      await saveFigmaFileData(s.fileKey, s.targetNodeId, newDocument)
    } catch (e) {
      console.error('Failed to save file data:', e)
    }

    // 새 그룹에 'group' 컴포넌트 매핑 추가
    const groupRegistry = registry.find(r => r.name === 'group')
    if (groupRegistry) {
      try {
        await saveMapping({
          figmaFileKey: s.fileKey,
          figmaNodeId: result.groupId,
          figmaNodeName: 'Group',
          figmaNodeType: 'GROUP',
          registryId: groupRegistry.id,
          registryName: groupRegistry.name,
          registryTag: groupRegistry.tagName,
          customAttrs: {},
          status: 'mapped',
        })
        setConvertTrigger(t => t + 1)  // 변환 트리거
      } catch (e) {
        console.error('Failed to save group mapping:', e)
      }
    }

    setState(prev => ({
      ...prev,
      file: newFile,
      selectedNodeIds: [result.groupId],
      primarySelectedId: result.groupId,
    }))
  }, [state, registry])

  // 노드 그룹 해제
  const handleUngroupNodes = useCallback(async () => {
    const s = state
    if (s.selectedNodeIds.length !== 1) return
    if (!s.file || !s.fileKey) return

    const pages = s.file.document.children || []
    const currentPage = pages.find((p) => p.id === s.currentPageId)
    if (!currentPage) return

    const displayRoot = s.targetNodeId
      ? findNodeById(currentPage, s.targetNodeId)
      : currentPage
    if (!displayRoot) return

    const result = ungroupNode(displayRoot, s.selectedNodeIds[0])
    if (!result) return

    // 파일 구조 업데이트
    const newPages = pages.map(p => {
      if (p.id === s.currentPageId) {
        if (s.targetNodeId) {
          const newPage = { ...p }
          const replaceNode = (node: typeof p): typeof p => {
            if (node.id === s.targetNodeId) {
              return result.newRoot as typeof p
            }
            if (node.children) {
              return { ...node, children: node.children.map(replaceNode) }
            }
            return node
          }
          return replaceNode(newPage)
        } else {
          return result.newRoot as typeof p
        }
      }
      return p
    })

    const newDocument = {
      ...s.file.document,
      children: newPages,
    }

    const newFile = {
      ...s.file,
      document: newDocument,
    }

    // 서버에 저장
    try {
      await saveFigmaFileData(s.fileKey, s.targetNodeId, newDocument)
    } catch (e) {
      console.error('Failed to save file data:', e)
    }

    setState(prev => ({
      ...prev,
      file: newFile,
      selectedNodeIds: result.childIds,
      primarySelectedId: result.childIds[0] || null,
    }))
  }, [state])

  // 현재 데이터 계산
  const pages = state.file?.document.children || []
  const currentPage = pages.find((p) => p.id === state.currentPageId) || null

  // 표시할 루트 노드 (targetNodeId가 있으면 해당 노드, 없으면 페이지)
  const displayRootNode = state.targetNodeId && currentPage
    ? findNodeById(currentPage, state.targetNodeId)
    : currentPage

  // 이미지 관련
  const imageKey = state.targetNodeId || state.currentPageId
  const currentImage = imageKey ? state.nodeImages[imageKey] : null
  const currentBounds = imageKey ? state.nodeBounds[imageKey] : null

  // 선택/호버 노드
  const selectedNodes = displayRootNode
    ? state.selectedNodeIds.map(id => findNodeById(displayRootNode, id)).filter(Boolean) as FigmaNode[]
    : []
  const primarySelectedNode = state.primarySelectedId && displayRootNode
    ? findNodeById(displayRootNode, state.primarySelectedId)
    : null
  const hoveredNode = state.hoveredNodeId && displayRootNode
    ? findNodeById(displayRootNode, state.hoveredNodeId)
    : null

  // 대시보드 화면
  if (view === 'dashboard' || !state.file) {
    return (
      <>
        <Dashboard
          key={dashboardKey}
          onSelectFile={handleSelectFileFromDashboard}
          onAddNewFile={() => setShowAddFileModal(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
        {state.error && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg z-50">
            {state.error}
          </div>
        )}
        {state.loading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
            <div className="bg-gray-800 px-6 py-4 rounded-lg text-white">로딩 중...</div>
          </div>
        )}
        <AddFileModal
          isOpen={showAddFileModal}
          onClose={() => setShowAddFileModal(false)}
          onSubmit={handleAddFile}
          loading={state.loading}
          savedToken={state.token}
          onOpenSettings={() => setShowSettings(true)}
        />
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          token={state.token}
          onSaveToken={handleSaveToken}
        />
        {/* 자동 매핑 제안 모달 */}
        <AutoMappingSuggestionModal
          isOpen={showAutoMappingModal}
          onClose={() => {
            setShowAutoMappingModal(false)
            // 건너뛰기 시에도 에디터로 이동
            if (pendingFileKey) {
              handleSelectFileFromDashboard(pendingFileKey, pendingNodeId)
            }
          }}
          suggestions={autoMappingSuggestions}
          onApply={handleApplyAutoMapping}
          loading={autoMappingLoading}
        />
      </>
    )
  }

  // 메인 UI
  return (
    <div className="h-screen flex flex-col theme-bg-primary">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 py-2 theme-bg-secondary border-b theme-border">
        <div className="flex items-center gap-3">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <path d="M10.667 32C13.612 32 16 29.612 16 26.667V21.333H10.667C7.722 21.333 5.333 23.722 5.333 26.667C5.333 29.612 7.722 32 10.667 32Z" fill="#0ACF83"/>
            <path d="M5.333 16C5.333 13.055 7.722 10.667 10.667 10.667H16V21.333H10.667C7.722 21.333 5.333 18.945 5.333 16Z" fill="#A259FF"/>
            <path d="M5.333 5.333C5.333 2.388 7.722 0 10.667 0H16V10.667H10.667C7.722 10.667 5.333 8.278 5.333 5.333Z" fill="#F24E1E"/>
            <path d="M16 0H21.333C24.278 0 26.667 2.388 26.667 5.333C26.667 8.278 24.278 10.667 21.333 10.667H16V0Z" fill="#FF7262"/>
            <path d="M26.667 16C26.667 18.945 24.278 21.333 21.333 21.333C18.388 21.333 16 18.945 16 16C16 13.055 18.388 10.667 21.333 10.667C24.278 10.667 26.667 13.055 26.667 16Z" fill="#1ABCFE"/>
          </svg>
          <h1 className="text-lg font-semibold theme-text-primary">{state.file.name}</h1>
          {state.targetNodeId && displayRootNode && (
            <span className="text-sm text-blue-500 mapped-component-box border px-2 py-0.5 rounded">
              {displayRootNode.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm theme-text-secondary theme-text-hover theme-bg-hover-strong rounded"
            title="대시보드로 이동"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            대시보드
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 theme-text-secondary theme-text-hover theme-bg-hover-strong rounded"
            title="설정"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* 페이지 탭 (타겟 노드가 없을 때만 표시) */}
      {!state.targetNodeId && (
        <PageTabs
          pages={pages}
          currentPageId={state.currentPageId}
          onSelectPage={handleSelectPage}
        />
      )}

      {/* 메인 콘텐츠 */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* 좌측: 노드 트리 */}
        <div
          className="flex-shrink-0 border-r theme-border overflow-hidden theme-bg-secondary"
          style={{ width: leftPanelWidth }}
        >
          {displayRootNode && (
            <NodeTree
              nodes={displayRootNode.children || []}
              selectedNodeIds={state.selectedNodeIds}
              mappedNodeIds={mappedNodeIds}
              onSelectNode={handleSelectNode}
              onSelectNodeIds={handleSelectNodeIds}
              onHoverNode={handleHoverNode}
              onGroupNodes={handleGroupNodes}
              onUngroupNodes={handleUngroupNodes}
              onReorderNodes={handleReorderNodes}
            />
          )}
        </div>

        {/* 왼쪽 스플리터 */}
        <Splitter direction="horizontal" onResize={handleLeftResize} />

        {/* 중앙: Figma 뷰어 */}
        <div className="flex-1 min-w-0">
          <FigmaViewer
            imageUrl={currentImage}
            pageNode={displayRootNode}
            pageBounds={currentBounds}
            selectedNodes={selectedNodes}
            hoveredNode={hoveredNode}
            loading={state.imageLoading}
          />
        </div>

        {/* 오른쪽 스플리터 */}
        <Splitter direction="horizontal" onResize={handleRightResize} />

        {/* 우측: 매핑 편집기 + 코드 에디터 */}
        <div className="flex-shrink-0 flex border-l theme-border overflow-hidden relative">
          {/* 매핑 편집기 */}
          <div
            className="flex-shrink-0 overflow-hidden"
            style={{ width: rightPanelWidth }}
          >
            <MappingEditor
              node={primarySelectedNode}
              nodes={selectedNodes}
              fileKey={state.fileKey}
              onRegistryLoad={setRegistry}
              onMappingChange={() => setConvertTrigger(t => t + 1)}
            />
          </div>

          {/* 코드 에디터 스플리터 */}
          {codeEditorVisible && (
            <Splitter direction="horizontal" onResize={handleCodeEditorResize} />
          )}

          {/* 코드 에디터 */}
          {codeEditorVisible ? (
            <div
              className="flex-shrink-0 overflow-hidden border-l theme-border"
              style={{ width: codeEditorWidth }}
            >
              <ConvertedCodeEditor
                fileKey={state.fileKey}
                nodeId={state.targetNodeId}
                rootNode={displayRootNode}
                registry={registry}
                visible={codeEditorVisible}
                onToggle={() => setCodeEditorVisible(v => !v)}
                convertTrigger={convertTrigger}
                onComplete={() => {
                  setDashboardKey(k => k + 1)
                  handleReset()
                }}
              />
            </div>
          ) : (
            <ConvertedCodeEditor
              fileKey={state.fileKey}
              nodeId={state.targetNodeId}
              rootNode={displayRootNode}
              registry={registry}
              visible={codeEditorVisible}
              onToggle={() => setCodeEditorVisible(v => !v)}
              convertTrigger={convertTrigger}
              onComplete={() => {
                setDashboardKey(k => k + 1)
                handleReset()
              }}
            />
          )}
        </div>
      </div>

      {/* 설정 모달 */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        token={state.token}
        onSaveToken={handleSaveToken}
      />

      {/* 자동 매핑 제안 모달 */}
      <AutoMappingSuggestionModal
        isOpen={showAutoMappingModal}
        onClose={() => {
          setShowAutoMappingModal(false)
          // 건너뛰기 시에도 에디터로 이동
          if (pendingFileKey) {
            handleSelectFileFromDashboard(pendingFileKey, pendingNodeId)
          }
        }}
        suggestions={autoMappingSuggestions}
        onApply={handleApplyAutoMapping}
        loading={autoMappingLoading}
      />
    </div>
  )
}
