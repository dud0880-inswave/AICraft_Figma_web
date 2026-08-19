import { useState, useCallback, useEffect, useRef } from 'react'
import type { FigmaFile, FigmaNode, BoundingBox } from './types/figma'
import type { RegistryItem, AutoMappingSuggestion, FigmaNodeForSignature } from './utils/api'
import { saveFigmaFile, touchFigmaFile, fetchMappings, fetchFigmaFileData, saveFigmaFileData, saveMapping, fetchAutoMappingSuggestions, fetchDefaultRuleSuggestions, applyAutoMappingSuggestions, refreshFigmaFile, saveFigmaFileImage, getFigmaFileImageUrl, bumpFigmaFileVersion, fetchProjectFiles, fetchProjectSettings, saveProjectSettings, migratePersonalSettingsToDb } from './utils/api'
import { parseFigmaUrl, fetchFigmaFile, fetchNodeImages } from './utils/figma-api'
import { getConfig } from './config'
import { useDialog } from './contexts/DialogContext'
import { findNodeById, calculatePageBounds, groupNodes, ungroupNode, reorderNodes } from './utils/tree-utils'
import Dashboard from './components/Dashboard'
import AddFileModal from './components/AddFileModal'
import Spec from './Spec'
import PageTabs from './components/PageTabs'
import NodeTree, { type MappedNodeInfo } from './components/NodeTree'
import FigmaViewer from './components/FigmaViewer'
import MappingEditor from './components/MappingEditor'
import ConvertedCodeEditor from './components/ConvertedCodeEditor'
import Splitter, { PanelToggleIcon } from './components/Splitter'
import SettingsModal from './components/SettingsModal'
import AutoMappingSuggestionModal from './components/AutoMappingSuggestionModal'

type AppView = 'dashboard' | 'editor' | 'spec'

interface AppState {
  token: string
  fileKey: string | null
  projectId: string | null  // 현재 프로젝트 ID
  projectName: string | null  // 현재 프로젝트 이름
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
  fileVersion: string | null
}

const initialState: AppState = {
  token: '',
  fileKey: null,
  projectId: null,
  projectName: null,
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
  fileVersion: null,
}


export default function App() {
  const { showAlert, showConfirm } = useDialog()
  const [state, setState] = useState<AppState>(initialState)
  const [view, setView] = useState<AppView>('dashboard')
  const [showSettings, setShowSettings] = useState(false)
  const [showAddFileModal, setShowAddFileModal] = useState(false)
  const [dashboardKey, setDashboardKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // 패널 너비 상태
  const [leftPanelWidth, setLeftPanelWidth] = useState(360)  // 기본 360px
  const [leftCollapsed, setLeftCollapsed] = useState(false)  // 노드 트리 패널 접힘 여부
  const [rightPanelWidth, setRightPanelWidth] = useState(600)  // 기본 maxWidth
  const [rightCollapsed, setRightCollapsed] = useState(false)  // 매핑 편집기 패널 접힘 여부
  const [codeEditorWidth, setCodeEditorWidth] = useState(800)  // 기본 maxWidth
  const [codeEditorVisible, setCodeEditorVisible] = useState(true)  // 기본 표시
  const [registry, setRegistry] = useState<RegistryItem[]>([])  // 레지스트리 데이터
  const [convertTrigger, setConvertTrigger] = useState(0)  // 변환 트리거
  const [mappedNodeIds, setMappedNodeIds] = useState<Set<string>>(new Set())  // 매핑된 노드 ID
  const [mappedInfo, setMappedInfo] = useState<Map<string, MappedNodeInfo>>(new Map())  // 노드ID → 매핑 컴포넌트 정보 (트리 표시용)
  const [showMappingBadge, setShowMappingBadge] = useState(true)  // 노드 트리 매핑 뱃지 표시 여부 (프로젝트 설정)
  const [cssRefreshKey, setCssRefreshKey] = useState(0)  // CSS 새로고침 트리거
  const [registryRefreshKey, setRegistryRefreshKey] = useState(0)  // Registry 새로고침 트리거
  const containerRef = useRef<HTMLDivElement>(null)

  // 자동 매핑 제안 모달 상태
  const [autoMappingSuggestions, setAutoMappingSuggestions] = useState<AutoMappingSuggestion[]>([])
  const [showAutoMappingModal, setShowAutoMappingModal] = useState(false)
  const [autoMappingLoading, setAutoMappingLoading] = useState(false)
  const [pendingFileKey, setPendingFileKey] = useState<string | null>(null)
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null)
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null)
  const [pendingProjectName, setPendingProjectName] = useState<string | null>(null)
  const [addFileProjectId, setAddFileProjectId] = useState<string | null>(null)
  const [settingsProjectId, setSettingsProjectId] = useState<string | null>(null)
  const [settingsProjectName, setSettingsProjectName] = useState<string | null>(null)
  // Spec 뷰 컨텍스트
  const [specContext, setSpecContext] = useState<{
    projectId: string; fileKey: string; nodeId: string | null;
    srcFileKey: string | null; srcNodeId: string | null;
  } | null>(null)
  const [navigateToProjectId, setNavigateToProjectId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('projectId')
  })

  // Extension 메시지 수신
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      // 프로젝트 선택 → 파일 대시보드 직행
      if (e.data?.type === 'selectProject') {
        const { projectId, projectName } = e.data
        setState(s => ({ ...s, projectId, projectName }))
        setNavigateToProjectId(projectId)
        setView('dashboard')
        setDashboardKey(k => k + 1)
      }
      // 사이드바 노드 클릭 → 선택 (파란색 하이라이트)
      if (e.data?.type === 'selectNode') {
        const { nodeId } = e.data
        setState(s => ({
          ...s,
          selectedNodeIds: [nodeId],
          primarySelectedId: nodeId,
        }))
      }
      // 사이드바 노드 포커스 이동 → 호버 (노란색 하이라이트)
      if (e.data?.type === 'hoverNode') {
        const { nodeId } = e.data
        setState(s => ({ ...s, hoveredNodeId: nodeId }))
      }
      // 프로젝트 목록으로 돌아가기
      if (e.data?.type === 'backToProjects') {
        setState(s => ({ ...initialState, token: s.token }))
        setView('dashboard')
        setNavigateToProjectId(null)
        setDashboardKey(k => k + 1)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // 왼쪽 패널 리사이즈
  const handleLeftResize = useCallback((delta: number) => {
    setLeftPanelWidth(prev => Math.max(360, Math.min(600, prev + delta)))
  }, [])

  // 오른쪽 패널 리사이즈
  const handleRightResize = useCallback((delta: number) => {
    setRightPanelWidth(prev => Math.max(200, Math.min(600, prev - delta)))
  }, [])

  // 코드 에디터 리사이즈
  const handleCodeEditorResize = useCallback((delta: number) => {
    setCodeEditorWidth(prev => Math.max(200, Math.min(1400, prev - delta)))
  }, [])


  // 파일 추가 (대시보드에 추가 + 자동 매핑 제안)
  const handleAddFile = useCallback(async (token: string, fileUrl: string, projectId: string) => {
    const parsed = parseFigmaUrl(fileUrl)
    if (!parsed) {
      setState((s) => ({ ...s, error: '올바른 Figma URL이 아닙니다' }))
      return
    }

    const { fileKey, nodeId } = parsed
    setState((s) => ({ ...s, loading: true, error: null, token }))

    try {
      // 토큰을 프로젝트 설정에 저장 (서버 DB)
      await saveProjectSettings(projectId, { 'figma-token': token })

      const file = await fetchFigmaFile(fileKey, token, nodeId)


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
          // 디버그 JSON 다운로드 (config.enableDebugJson일 때만)
          if (getConfig().enableDebugJson) {
            const jsonBlob = new Blob([JSON.stringify(targetNode, null, 2)], { type: 'application/json' })
            const downloadUrl = URL.createObjectURL(jsonBlob)
            const a = document.createElement('a')
            a.href = downloadUrl
            a.download = `figma-${fileKey}-${nodeId.replace(':', '-')}.json`
            a.click()
            URL.revokeObjectURL(downloadUrl)
          }
          // 노드 이미지 가져오기
          const images = await fetchNodeImages(fileKey, token, [nodeId], 'svg', 1)
          const thumbnailUrl = images.images[nodeId] || undefined
          await saveFigmaFile(fileKey, nodeId, targetNode.name, thumbnailUrl, projectId)
          // 노드 트리 저장 (displayRoot 단일 노드)
          try {
            await saveFigmaFileData(projectId, fileKey, nodeId, targetNode)
          } catch (e) { console.error('노드 트리 저장 실패:', e) }
          // 이미지 파일 저장 (서버가 presigned URL을 받아 로컬에 다운로드)
          if (thumbnailUrl) {
            try {
              await saveFigmaFileImage(projectId, fileKey, nodeId, thumbnailUrl)
            } catch (e) { console.error('이미지 저장 실패:', e) }
          }
        } else {
          throw new Error('해당 노드를 찾을 수 없습니다')
        }
      } else {
        // 전체 파일 저장 — 첫 페이지를 displayRoot로 저장
        displayRoot = pages[0] || null
        await saveFigmaFile(fileKey, null, file.name, file.thumbnailUrl, projectId)
        if (displayRoot) {
          try {
            await saveFigmaFileData(projectId, fileKey, null, displayRoot)
          } catch (e) { console.error('노드 트리 저장 실패:', e) }
          // 첫 페이지 이미지 가져와서 저장
          try {
            const images = await fetchNodeImages(fileKey, token, [displayRoot.id], 'svg', 1)
            const pageImageUrl = images.images[displayRoot.id]
            if (pageImageUrl) {
              await saveFigmaFileImage(projectId, fileKey, null, pageImageUrl)
            }
          } catch (e) { console.error('이미지 저장 실패:', e) }
        }
      }

      setState((s) => ({ ...s, loading: false }))
      setShowAddFileModal(false)
      setAddFileProjectId(null)
      setNavigateToProjectId(projectId) // 프로젝트 선택 상태 유지
      // Extension 사이드바 프로젝트 목록 갱신
      try {
        const vsc = (window as unknown as { __vscode?: { postMessage: (msg: unknown) => void } }).__vscode
        if (vsc) vsc.postMessage({ type: 'refreshProjects' })
      } catch { /* ignore */ }
      setDashboardKey((k) => k + 1) // 대시보드 새로고침

      // 자동 매핑 제안 확인
      if (displayRoot && displayRoot.children) {
        try {
          const convertNode = (node: FigmaNode): FigmaNodeForSignature => ({
            id: node.id,
            name: node.name,
            type: node.type,
            ...(node.componentProperties && { componentProperties: node.componentProperties }),
            children: node.children?.filter(c => c.visible !== false).map(c => convertNode(c)),
          })

          // displayRoot 자체를 보내서 서버에서 트리 구조를 유지하며 parent 추적 가능하도록 함
          const nodesForSignature = [convertNode(displayRoot)]

          // 클러스터 제안 + default rule 제안 병렬 조회 (프로젝트별 클러스터)
          const [clusterSuggestions, defaultSuggestions] = await Promise.all([
            fetchAutoMappingSuggestions(nodesForSignature, [], projectId).then(s => s.map(s => ({ ...s, source: 'cluster' as const }))),
            fetchDefaultRuleSuggestions(projectId, nodesForSignature),
          ])

          // 병합: 중복 허용 (클러스터/기본규칙 둘 다 표시)
          const merged = [...clusterSuggestions, ...defaultSuggestions]

          if (merged.length > 0) {
            setAutoMappingSuggestions(merged)
            setPendingFileKey(fileKey)
            setPendingNodeId(nodeId)
            setPendingProjectId(projectId)
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

  // 에러 메시지 자동 숨김 (3초 후)
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        setState((s) => ({ ...s, error: null }))
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [state.error])

  // 이미지 로드 (서버에 저장된 PNG 사용)
  useEffect(() => {
    const nodeIdToLoad = state.targetNodeId || state.currentPageId
    if (!nodeIdToLoad || !state.fileKey || !state.projectId) {
      return
    }
    if (state.nodeImages[nodeIdToLoad]) {
      return
    }
    const url = `${getFigmaFileImageUrl(state.projectId, state.fileKey, state.targetNodeId)}&t=${Date.now()}`
    setState((s) => ({
      ...s,
      nodeImages: { ...s.nodeImages, [nodeIdToLoad]: url },
      imageLoading: false,
    }))
  }, [state.targetNodeId, state.currentPageId, state.fileKey, state.projectId])

  // 매핑 정보 로드
  useEffect(() => {
    if (!state.fileKey || !state.projectId) {
      setMappedNodeIds(new Set())
      setMappedInfo(new Map())
      return
    }

    const loadMappings = async () => {
      try {
        const mappings = await fetchMappings(state.projectId!, state.fileKey!, state.targetNodeId)
        const ids = new Set(mappings.map(m => m.figmaNodeId))
        setMappedNodeIds(ids)
        // 트리 표시용: 노드ID → 매핑 컴포넌트 정보
        const infoMap = new Map<string, MappedNodeInfo>()
        for (const m of mappings) {
          if (m.status === 'mapped' && (m.registryTag || m.registryName)) {
            // 과거 저장분은 registryTag가 비어있을 수 있어 레지스트리에서 태그 보완
            const tagName = m.registryTag || registry.find(r => r.id === m.registryId)?.tagName
            infoMap.set(m.figmaNodeId, { tagName, registryName: m.registryName })
          }
        }
        setMappedInfo(infoMap)
      } catch (err) {
        console.error('매핑 정보 로드 실패:', err)
      }
    }

    loadMappings()
  }, [state.fileKey, state.projectId, convertTrigger, registry])

  // 매핑 뱃지 표시 설정 로드 (프로젝트 변경 시 + 설정 저장 후 재적용)
  const reloadBadgeSetting = useCallback(async () => {
    if (!state.projectId) return
    try {
      const settings = await fetchProjectSettings(state.projectId)
      setShowMappingBadge(settings['show-mapping-badge'] !== 'false')
    } catch { /* ignore */ }
  }, [state.projectId])

  useEffect(() => { reloadBadgeSetting() }, [reloadBadgeSetting])

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

  // 현재 프로젝트로 이동
  const handleBackToProject = useCallback(() => {
    const projectId = state.projectId
    setState((s) => ({ ...initialState, token: s.token }))  // 토큰은 유지
    setNavigateToProjectId(projectId)
    setView('dashboard')
    // Extension 사이드바 다시 열기
    try {
      const vsc = (window as unknown as { __vscode?: { postMessage: (msg: unknown) => void } }).__vscode
      if (vsc) vsc.postMessage({ type: 'backToProject' })
    } catch { /* ignore */ }
  }, [state.projectId])

  // 파일 새로고침
  const handleRefreshFile = useCallback(async (fileKey: string, nodeId: string | null, projectId: string) => {
    try {
      // 1. 토큰 (프로젝트 설정 - 서버 DB)
      const settings = await fetchProjectSettings(projectId)
      const token = settings['figma-token']
      if (!token) {
        throw new Error('Figma Access Token이 설정되어 있지 않습니다.')
      }

      // 2. Figma에서 최신 데이터 받아와서 displayRoot(단일 노드) 추출
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
      if (!displayRoot) throw new Error('등록된 노드를 Figma에서 찾을 수 없습니다.\n노드가 삭제되었거나 이동되었을 수 있습니다.')

      // 3. 서버에 전달 → 변경 감지 + (변경 있으면) 저장 + 매핑 정리 + 신규 노드 반환
      const result = await refreshFigmaFile(projectId, fileKey, nodeId, displayRoot)
      console.log(`[Refresh] hasChanges=${result.hasChanges}, 삭제매핑=${result.deletedMappingsCount}, 신규노드=${result.newNodeIds.length}`)

      if (!result.hasChanges) {
        await showAlert('변경된 내용이 없습니다.')
        return
      }

      // 4. 변경 있음 → 이미지 갱신 + state 반영
      try {
        const images = await fetchNodeImages(fileKey, token, [displayRoot.id], 'svg', 1)
        const imgUrl = images.images[displayRoot.id]
        if (imgUrl) await saveFigmaFileImage(projectId, fileKey, nodeId, imgUrl)
      } catch (e) { console.error('이미지 저장 실패:', e) }

      const isSameFile = state.fileKey === fileKey &&
                         (state.targetNodeId === nodeId || (!state.targetNodeId && !nodeId))

      if (isSameFile) {
        const syntheticFile = {
          document: { id: 'synthetic', name: 'synthetic', type: 'DOCUMENT', children: [displayRoot] }
        } as unknown as FigmaFile

        const imageKey = nodeId ? displayRoot.id : displayRoot.id
        const freshImageUrl = `${getFigmaFileImageUrl(projectId, fileKey, nodeId)}&t=${Date.now()}`

        const nodeBounds: Record<string, BoundingBox> = {}
        if (nodeId) {
          const bounds = displayRoot.absoluteRenderBounds || displayRoot.absoluteBoundingBox
          if (bounds) nodeBounds[displayRoot.id] = bounds
        } else {
          const bounds = calculatePageBounds(displayRoot)
          if (bounds) nodeBounds[displayRoot.id] = bounds
        }

        setState(s => ({
          ...s,
          file: syntheticFile,
          token,
          nodeBounds,
          nodeImages: { [imageKey]: freshImageUrl },
        }))
        setConvertTrigger(t => t + 1)
      }

      // 5. 버전업 컨펌
      if (await showConfirm('Figma 파일에 변경사항이 있습니다.\n버전을 올리시겠습니까?')) {
        try {
          const { version } = await bumpFigmaFileVersion(projectId, fileKey, nodeId)
          console.log(`[Refresh] 버전 증가 → v${version}`)
          setState(s => ({ ...s, fileVersion: version }))
        } catch (e) {
          console.error('버전 증가 실패:', e)
        }
      }

      // 6. 새 노드가 있으면 자동 매핑 제안
      const newNodeIdSet = new Set(result.newNodeIds)
      if (newNodeIdSet.size > 0) {
        try {
          const convertNode = (node: FigmaNode): FigmaNodeForSignature => ({
            id: node.id,
            name: node.name,
            type: node.type,
            ...(node.componentProperties && { componentProperties: node.componentProperties }),
            children: node.children?.filter(c => c.visible !== false).map(c => convertNode(c)),
          })

          const nodesForSignature = [convertNode(displayRoot)]

          const allIds: string[] = []
          const collectAllIds = (node: FigmaNodeForSignature) => {
            allIds.push(node.id)
            node.children?.forEach(collectAllIds)
          }
          nodesForSignature.forEach(collectAllIds)
          const nonNewIds = allIds.filter(id => !newNodeIdSet.has(id))

          const newNodesList: FigmaNodeForSignature[] = []
          const collectNewNodes = (n: FigmaNodeForSignature) => {
            if (newNodeIdSet.has(n.id)) newNodesList.push(n)
            n.children?.forEach(collectNewNodes)
          }
          nodesForSignature.forEach(collectNewNodes)

          const [clusterSuggestions, defaultSuggestions] = await Promise.all([
            fetchAutoMappingSuggestions(nodesForSignature, nonNewIds, projectId).then(s => s.map(s => ({ ...s, source: 'cluster' as const }))),
            fetchDefaultRuleSuggestions(projectId, newNodesList),
          ])

          const merged = [...clusterSuggestions, ...defaultSuggestions]
          if (merged.length > 0) {
            setAutoMappingSuggestions(merged)
            setPendingFileKey(fileKey)
            setPendingNodeId(nodeId)
            setPendingProjectId(projectId)
            setShowAutoMappingModal(true)
          }
        } catch (e) {
          console.error('Failed to fetch auto mapping suggestions for new nodes:', e)
        }
      }
    } catch (err) {
      console.error('Failed to refresh file:', err)
      throw err
    }
  }, [state.fileKey, state.targetNodeId])

  // 대시보드에서 파일 선택
  const handleSelectFileFromDashboard = useCallback(async (fileKey: string, nodeId: string | null, projectId: string, projectName?: string, version?: string) => {
    // 프로젝트 설정에서 토큰 불러오기
    let token = state.token
    try {
      await migratePersonalSettingsToDb(projectId)
      const settings = await fetchProjectSettings(projectId)
      const projectToken = settings['figma-token']
      if (projectToken) {
        token = projectToken
      }
    } catch (e) {
      console.error('Failed to fetch project settings:', e)
    }

    if (!token) {
      setSettingsProjectId(projectId)
      setSettingsProjectName(projectName || null)
      setShowSettings(true)
      return
    }

    setState((s) => ({ ...s, loading: true, error: null, token }))

    try {
      // DB에서 저장된 노드 트리 로드
      let displayRoot: FigmaNode | null = null
      try {
        const savedData = await fetchFigmaFileData(projectId, fileKey, nodeId)
        if (savedData && savedData.data) {
          displayRoot = savedData.data as FigmaNode
        }
      } catch (e) {
        console.error('Failed to load saved file data:', e)
      }

      // 레거시 파일: DB에 저장된 트리 없으면 Figma에서 한 번 받아와 저장
      if (!displayRoot) {
        const file = await fetchFigmaFile(fileKey, token, nodeId)
        const pages = file.document.children || []
        if (nodeId) {
          for (const page of pages) {
            const node = findNodeById(page, nodeId)
            if (node) { displayRoot = node; break }
          }
        } else {
          displayRoot = pages[0] || null
        }
        if (displayRoot) {
          try {
            await saveFigmaFileData(projectId, fileKey, nodeId, displayRoot)
          } catch (e) { console.error('레거시 트리 저장 실패:', e) }
          // 이미지도 없으면 받아서 저장
          try {
            const images = await fetchNodeImages(fileKey, token, [displayRoot.id], 'svg', 1)
            const imgUrl = images.images[displayRoot.id]
            if (imgUrl) await saveFigmaFileImage(projectId, fileKey, nodeId, imgUrl)
          } catch (e) { console.error('레거시 이미지 저장 실패:', e) }
        }
      }

      if (!displayRoot) {
        throw new Error('파일 트리를 로드할 수 없습니다.')
      }

      // 렌더링 코드 재사용을 위한 synthetic 파일 구조
      const syntheticFile = {
        document: { id: 'synthetic', name: 'synthetic', type: 'DOCUMENT', children: [displayRoot] }
      } as unknown as FigmaFile

      const targetPageId = displayRoot.id
      const targetNodeId: string | null = nodeId ? displayRoot.id : null

      // 바운딩 박스 계산
      const nodeBounds: Record<string, BoundingBox> = {}
      if (targetNodeId) {
        const bounds = displayRoot.absoluteRenderBounds || displayRoot.absoluteBoundingBox
        if (bounds) nodeBounds[targetNodeId] = bounds
      } else {
        const bounds = calculatePageBounds(displayRoot)
        if (bounds) nodeBounds[displayRoot.id] = bounds
      }

      // 이미지 URL은 서버 엔드포인트로 고정 (DB 사전 저장된 PNG)
      const imageKey = targetNodeId || targetPageId
      const imageUrl = imageKey ? `${getFigmaFileImageUrl(projectId, fileKey, nodeId)}&t=${Date.now()}` : null

      // lastOpenedAt 업데이트
      try {
        await touchFigmaFile(projectId, fileKey, nodeId)
      } catch (e) {
        console.error('Failed to update file info:', e)
      }

      // 버전이 전달 안 된 경우 (auto-mapping 경유 등) DB에서 조회
      let resolvedVersion = version
      if (!resolvedVersion) {
        try {
          const projectFiles = await fetchProjectFiles(projectId)
          const rec = projectFiles.find(f => f.fileKey === fileKey && (f.nodeId ?? null) === (nodeId ?? null))
          resolvedVersion = rec?.version
        } catch { /* ignore */ }
      }

      setState((s) => ({
        ...s,
        fileKey,
        projectId,
        projectName: projectName || null,
        file: syntheticFile,
        currentPageId: targetPageId,
        targetNodeId,
        selectedNodeIds: [],
        primarySelectedId: null,
        nodeBounds,
        nodeImages: imageUrl && imageKey ? { [imageKey]: imageUrl } : {},
        loading: false,
        fileVersion: resolvedVersion || null,
      }))
      setView('editor')

      // Extension에 파일 열림 알림 (사이드바 노드트리 전환)
      try {
        const vsc = (window as unknown as { __vscode?: { postMessage: (msg: unknown) => void } }).__vscode
        if (vsc) vsc.postMessage({ type: 'fileOpened', projectId, fileKey, nodeId })
      } catch { /* ignore */ }

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

  // 에디터 화면에서 자동 매핑 버튼 클릭
  const handleAutoMappingFromEditor = useCallback(async () => {
    if (!state.fileKey || !state.file || !state.projectId) return
    const currentPage = state.file.document.children?.find((p: FigmaNode) => p.id === state.currentPageId) || null
    const root = state.targetNodeId && currentPage
      ? findNodeById(currentPage, state.targetNodeId)
      : currentPage
    if (!root) return
    setAutoMappingLoading(true)
    try {
      const convertNode = (node: FigmaNode): FigmaNodeForSignature => ({
        id: node.id,
        name: node.name,
        type: node.type,
        ...(node.componentProperties && { componentProperties: node.componentProperties }),
        children: node.children?.filter(c => c.visible !== false).map(c => convertNode(c)),
      })
      // root 자체를 보내서 서버에서 트리 구조를 유지하며 parent 추적 가능하도록 함
      const nodesForSignature = [convertNode(root)]
      const [clusterSuggestions, defaultSuggestions] = await Promise.all([
        fetchAutoMappingSuggestions(nodesForSignature, [], state.projectId!).then(s => s.map(s => ({ ...s, source: 'cluster' as const }))),
        fetchDefaultRuleSuggestions(state.projectId!, nodesForSignature),
      ])
      // 중복 허용 (클러스터/기본규칙 둘 다 표시)
      const merged = [...clusterSuggestions, ...defaultSuggestions]
      setPendingFileKey(state.fileKey)
      setPendingNodeId(state.targetNodeId)
      setPendingProjectId(state.projectId)
      setPendingProjectName(state.projectName)
      setAutoMappingSuggestions(merged)
      setShowAutoMappingModal(true)
    } catch (e) {
      console.error('Failed to fetch auto mapping suggestions:', e)
    } finally {
      setAutoMappingLoading(false)
    }
  }, [state.fileKey, state.file, state.currentPageId, state.targetNodeId, state.projectId])

  // 자동 매핑 적용 후 에디터로 이동
  const handleApplyAutoMapping = useCallback(async (selectedSuggestions: AutoMappingSuggestion[]) => {
    const fileKey = pendingFileKey
    const nodeId = pendingNodeId
    const projectId = pendingProjectId
    const projectName = pendingProjectName

    if (!fileKey || !projectId) {
      setShowAutoMappingModal(false)
      return
    }

    setAutoMappingLoading(true)
    try {
      if (selectedSuggestions.length > 0) {
        // 중복 nodeId 처리: 클러스터 우선 (cluster가 default보다 앞에 있으므로 먼저 만난 것 유지)
        const seen = new Set<string>()
        const deduped = selectedSuggestions.filter(s => {
          if (seen.has(s.nodeId)) return false
          seen.add(s.nodeId)
          return true
        })

        await applyAutoMappingSuggestions(
          fileKey,
          projectId,
          deduped.map(s => ({
            nodeId: s.nodeId,
            nodeName: s.nodeName,
            nodeType: s.nodeType,
            registryId: s.registryId,
            registryName: s.registryName,
            customAttrs: s.customAttrs,
          })),
          nodeId
        )
        // 매핑 다시 로드하여 노드트리 업데이트
        setConvertTrigger(t => t + 1)
      }
      setShowAutoMappingModal(false)
      // 에디터로 이동
      handleSelectFileFromDashboard(fileKey, nodeId, projectId, projectName || undefined)
    } catch (e) {
      console.error('Failed to apply auto mapping:', e)
    } finally {
      setAutoMappingLoading(false)
    }
  }, [pendingFileKey, pendingNodeId, pendingProjectId, pendingProjectName, handleSelectFileFromDashboard])

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

    // 서버에 저장 (displayRoot만 저장 — synthetic wrapper 저장 금지)
    try {
      if (s.projectId) {
        await saveFigmaFileData(s.projectId, s.fileKey, s.targetNodeId, newDisplayRoot)
      }
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

    // 서버에 저장 (displayRoot만 저장)
    try {
      if (s.projectId) {
        await saveFigmaFileData(s.projectId, s.fileKey, s.targetNodeId, result.newRoot)
      }
    } catch (e) {
      console.error('Failed to save file data:', e)
    }

    // 새 그룹에 'group' 컴포넌트 매핑 추가
    const groupRegistry = registry.find(r => r.name === 'group')
    if (groupRegistry && s.projectId) {
      try {
        await saveMapping({
          projectId: s.projectId,
          figmaFileKey: s.fileKey,
          figmaRootNodeId: s.targetNodeId,
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

    // 서버에 저장 (displayRoot만 저장)
    try {
      if (s.projectId) {
        await saveFigmaFileData(s.projectId, s.fileKey, s.targetNodeId, result.newRoot)
      }
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

  // 스펙 문서 화면 (대시보드에서 진입)
  if (view === 'spec' && specContext) {
    return (
      <Spec
        projectId={specContext.projectId}
        fileKey={specContext.fileKey}
        nodeId={specContext.nodeId}
        srcFileKey={specContext.srcFileKey}
        srcNodeId={specContext.srcNodeId}
        onClose={() => {
          setSpecContext(null)
          setNavigateToProjectId(specContext.projectId)
          setView('dashboard')
        }}
      />
    )
  }

  // 대시보드 화면
  if (view === 'dashboard' || !state.file) {
    return (
      <>
        <Dashboard
          key={dashboardKey}
          onSelectFile={handleSelectFileFromDashboard}
          onAddNewFile={async (projectId) => {
            // 프로젝트 설정에서 토큰 확인
            try {
              await migratePersonalSettingsToDb(projectId)
              const settings = await fetchProjectSettings(projectId)
              const token = settings['figma-token']
              if (!token) {
                setState((s) => ({ ...s, error: 'Figma Access Token이 설정되어 있지 않습니다. 프로젝트 설정에서 토큰을 먼저 등록해주세요.' }))
                return
              }
              setAddFileProjectId(projectId)
              setShowAddFileModal(true)
            } catch (err) {
              setState((s) => ({ ...s, error: '프로젝트 설정을 불러오는데 실패했습니다.' }))
            }
          }}
          onOpenSettings={(projectId, projectName) => {
            setSettingsProjectId(projectId)
            setSettingsProjectName(projectName)
            setShowSettings(true)
          }}
          onRefreshFile={handleRefreshFile}
          onOpenSpec={(projectId, fileKey, nodeId, srcFileKey, srcNodeId) => {
            setSpecContext({ projectId, fileKey, nodeId, srcFileKey: srcFileKey ?? null, srcNodeId: srcNodeId ?? null })
            setView('spec')
          }}
          initialProjectId={navigateToProjectId}
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
          onClose={() => {
            setShowAddFileModal(false)
            setAddFileProjectId(null)
          }}
          onSubmit={handleAddFile}
          loading={state.loading}
          projectId={addFileProjectId || ''}
        />
        <SettingsModal
          isOpen={showSettings}
          onClose={() => {
            setShowSettings(false)
            setSettingsProjectId(null)
            setSettingsProjectName(null)
          }}
          onSaveToken={handleSaveToken}
          onCssChange={() => setCssRefreshKey(k => k + 1)}
          onRegistryChange={() => setRegistryRefreshKey(k => k + 1)}
          projectId={settingsProjectId}
          projectName={settingsProjectName || undefined}
        />
        {/* 자동 매핑 제안 모달 */}
        <AutoMappingSuggestionModal
          isOpen={showAutoMappingModal}
          onClose={() => {
            setShowAutoMappingModal(false)
            // 건너뛰기 시에도 에디터로 이동
            if (pendingFileKey && pendingProjectId) {
              handleSelectFileFromDashboard(pendingFileKey, pendingNodeId, pendingProjectId, pendingProjectName || undefined)
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
          <img src="/websquareAI.png" width="24" height="24" alt="WebSquare AI" className="rounded" />
          <h1 className="text-lg font-semibold theme-text-primary">{state.projectName}</h1>
          {state.targetNodeId && displayRootNode && (
            <span className="text-sm text-blue-500 mapped-component-box border px-2 py-0.5 rounded">
              {displayRootNode.name}
              {state.fileVersion && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-mono">v{state.fileVersion}</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 패널 접기/펼치기 토글 — 4분할 아이콘의 칸 위치가 실제 화면 배치와 대응
              (0=노드트리, 1=피그마 뷰어(항상 표시, 버튼 없음), 2=매핑, 3=변환 결과) */}
          <div className="flex items-center gap-0.5 mr-1">
            <button
              onClick={() => setLeftCollapsed(v => !v)}
              className="p-1.5 theme-text-secondary hover:text-blue-500 theme-bg-hover rounded"
              title={leftCollapsed ? '노드 트리 펼치기' : '노드 트리 접기'}
            >
              <PanelToggleIcon section={0} open={!leftCollapsed} className="w-5 h-5" />
            </button>
            <button
              onClick={() => setRightCollapsed(v => !v)}
              className="p-1.5 theme-text-secondary hover:text-blue-500 theme-bg-hover rounded"
              title={rightCollapsed ? '매핑 편집기 펼치기' : '매핑 편집기 접기'}
            >
              <PanelToggleIcon section={2} open={!rightCollapsed} className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCodeEditorVisible(v => !v)}
              className="p-1.5 theme-text-secondary hover:text-blue-500 theme-bg-hover rounded"
              title={codeEditorVisible ? '변환 결과 접기' : '변환 결과 펼치기'}
            >
              <PanelToggleIcon section={3} open={codeEditorVisible} className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={async () => {
              if (!state.fileKey || !state.projectId || refreshing) return
              try {
                setRefreshing(true)
                await handleRefreshFile(state.fileKey, state.targetNodeId, state.projectId)
              } catch (err) {
                // 에디터 뷰에는 state.error 토스트가 없으므로 알림창으로 표시
                await showAlert(err instanceof Error ? err.message : '파일을 새로고침하는데 실패했습니다.')
              } finally {
                setRefreshing(false)
              }
            }}
            disabled={refreshing}
            className="p-2 theme-text-secondary hover:text-blue-500 theme-bg-hover rounded disabled:opacity-50"
            title="파일 새로고침"
          >
            <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleAutoMappingFromEditor}
            disabled={autoMappingLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded disabled:opacity-50 transition-colors"
            title="자동 매핑 제안"
          >
            {autoMappingLoading ? '분석 중...' : '자동 매핑'}
          </button>
          <button
            onClick={handleBackToProject}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm theme-text-secondary theme-text-hover theme-bg-hover-strong rounded"
            title="현재 프로젝트로 이동"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            프로젝트 이동
          </button>
          <button
            onClick={() => {
              setSettingsProjectId(state.projectId)
              setSettingsProjectName(state.projectName)
              setShowSettings(true)
            }}
            className="p-2 theme-text-secondary hover:text-blue-500 theme-bg-hover rounded"
            title="프로젝트 설정"
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
        {/* 좌측: 노드 트리 (접힘 시 미렌더) */}
        {!leftCollapsed && (
          <div
            className="flex-shrink-0 border-r theme-border overflow-hidden theme-bg-secondary"
            style={{ width: leftPanelWidth }}
          >
            {displayRootNode && (
              <NodeTree
                nodes={state.targetNodeId ? [displayRootNode] : (displayRootNode.children || [])}
                selectedNodeIds={state.selectedNodeIds}
                mappedNodeIds={mappedNodeIds}
                mappedInfo={showMappingBadge ? mappedInfo : undefined}
                onSelectNode={handleSelectNode}
                onSelectNodeIds={handleSelectNodeIds}
                onHoverNode={handleHoverNode}
                onGroupNodes={handleGroupNodes}
                onUngroupNodes={handleUngroupNodes}
                onReorderNodes={handleReorderNodes}
              />
            )}
          </div>
        )}

        {/* 왼쪽 스플리터 (펼침 시에만) */}
        {!leftCollapsed && <Splitter direction="horizontal" onResize={handleLeftResize} />}

        {/* 중앙: Figma 뷰어 */}
        <div className="flex-1 min-w-0">
          <FigmaViewer
            imageUrl={currentImage}
            pageBounds={currentBounds}
            selectedNodes={selectedNodes}
            hoveredNode={hoveredNode}
            loading={state.imageLoading}
            imageScale={1}
            rootNode={displayRootNode}
            onHoverNode={(node) => setState(s => ({ ...s, hoveredNodeId: node?.id || null }))}
            onSelectNode={(node) => setState(s => ({
              ...s,
              selectedNodeIds: [node.id],
              primarySelectedId: node.id,
            }))}
          />
        </div>

        {/* 오른쪽 스플리터 (매핑 펼침 시에만) */}
        {!rightCollapsed && <Splitter direction="horizontal" onResize={handleRightResize} />}

        {/* 우측: 매핑 편집기 + 코드 에디터 */}
        <div className="flex-shrink-0 flex border-l theme-border overflow-hidden relative">
          {/* 매핑 편집기 (접힘 시 미렌더) */}
          {!rightCollapsed && (
          <div
            className="flex-shrink-0 overflow-hidden"
            style={{ width: rightPanelWidth }}
          >
            <MappingEditor
              node={primarySelectedNode}
              nodes={selectedNodes}
              tree={displayRootNode}
              fileKey={state.fileKey}
              rootNodeId={state.targetNodeId}
              projectId={state.projectId}
              cssRefreshKey={cssRefreshKey}
              registryRefreshKey={registryRefreshKey}
              mappingRefreshKey={convertTrigger}
              token={state.token}
              onRegistryLoad={setRegistry}
              onMappingChange={() => {
                setConvertTrigger(t => t + 1)
                try {
                  const vsc = (window as unknown as { __vscode?: { postMessage: (msg: unknown) => void } }).__vscode
                  if (vsc && state.projectId && state.fileKey) vsc.postMessage({ type: 'mappingChanged', projectId: state.projectId, fileKey: state.fileKey, nodeId: state.targetNodeId })
                } catch { /* ignore */ }
              }}
            />
          </div>
          )}

          {/* 코드 에디터 스플리터 (펼침 시에만) */}
          {codeEditorVisible && <Splitter direction="horizontal" onResize={handleCodeEditorResize} />}

          {/* 코드 에디터 (펼침 시에만) */}
          {codeEditorVisible && (
            <div className="flex-shrink-0 overflow-hidden border-l theme-border" style={{ width: codeEditorWidth }}>
              <ConvertedCodeEditor
                fileKey={state.fileKey}
                nodeId={state.targetNodeId}
                projectId={state.projectId}
                rootNode={displayRootNode}
                document={state.file?.document || null}
                registry={registry}
                convertTrigger={convertTrigger}
                cssRefreshKey={cssRefreshKey}
                token={state.token}
                onComplete={() => {
                  setDashboardKey(k => k + 1)
                  handleBackToProject()
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 설정 모달 */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false)
          setSettingsProjectId(null)
          setSettingsProjectName(null)
          reloadBadgeSetting()  // 설정 창에서 뱃지 표시 변경 시 즉시 반영
        }}
        onSaveToken={handleSaveToken}
        onCssChange={() => setCssRefreshKey(k => k + 1)}
        onRegistryChange={() => setRegistryRefreshKey(k => k + 1)}
        projectId={settingsProjectId}
        projectName={settingsProjectName || undefined}
      />

      {/* 자동 매핑 제안 모달 */}
      <AutoMappingSuggestionModal
        isOpen={showAutoMappingModal}
        onClose={() => {
          setShowAutoMappingModal(false)
          // 건너뛰기 시에도 에디터로 이동
          if (pendingFileKey && pendingProjectId) {
            handleSelectFileFromDashboard(pendingFileKey, pendingNodeId, pendingProjectId, pendingProjectName || undefined)
          }
        }}
        suggestions={autoMappingSuggestions}
        onApply={handleApplyAutoMapping}
        loading={autoMappingLoading}
      />

      {/* 새로고침 로딩 오버레이 */}
      {refreshing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 px-6 py-4 rounded-lg text-white flex items-center gap-3">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            파일 새로고침 중...
          </div>
        </div>
      )}
    </div>
  )
}
