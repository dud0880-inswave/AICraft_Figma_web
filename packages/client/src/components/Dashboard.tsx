import { useState, useEffect } from 'react'
import type { FigmaFileRecord, Project } from '../utils/api'
import { fetchProjects, fetchProjectFiles, deleteProject, createProject, updateProject, deleteFigmaFile, generateClusters, fetchProjectSettings, saveProjectSettings, saveFigmaFileData, saveFigmaFileImage, deleteFigmaFileData, deleteFigmaFileImage } from '../utils/api'
import { parseFigmaUrl, fetchFigmaFile, fetchNodeImages } from '../utils/figma-api'
import { findNodeById } from '../utils/tree-utils'
import { useDialog } from '../contexts/DialogContext'

interface DashboardProps {
  onSelectFile: (fileKey: string, nodeId: string | null, projectId: string, projectName?: string, version?: string) => void
  onAddNewFile: (projectId: string) => void
  onOpenSettings: (projectId: string, projectName: string) => void
  onRefreshFile: (fileKey: string, nodeId: string | null, projectId: string) => Promise<void>
  onOpenSpec: (projectId: string, fileKey: string, nodeId: string | null, srcFileKey?: string, srcNodeId?: string | null) => void
  initialProjectId?: string | null  // 초기 선택할 프로젝트 ID
}

type ViewMode = 'projects' | 'files'

export default function Dashboard({ onSelectFile, onAddNewFile, onOpenSettings, onRefreshFile, onOpenSpec, initialProjectId }: DashboardProps) {
  const { showAlert, showConfirm } = useDialog()
  const [viewMode, setViewMode] = useState<ViewMode>('projects')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [files, setFiles] = useState<FigmaFileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [refreshingFileKey, setRefreshingFileKey] = useState<string | null>(null)

  // 스펙문서 URL 입력 모달
  const [specModalOpen, setSpecModalOpen] = useState(false)
  const [specModalFile, setSpecModalFile] = useState<{ fileKey: string; nodeId: string | null } | null>(null)
  const [specLoading, setSpecLoading] = useState(false)
  // 파일별 등록된 스펙 URL: key = "fileKey-nodeId"
  const [specUrlMap, setSpecUrlMap] = useState<Record<string, { specFileKey: string; specNodeId: string | null; url: string }>>({})

  // 프로젝트 생성/수정 모달
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectError, setProjectError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  // initialProjectId가 있으면 해당 프로젝트로 바로 이동
  useEffect(() => {
    if (initialProjectId && projects.length > 0 && !initialLoaded) {
      const project = projects.find(p => p.id === initialProjectId)
      if (project) {
        loadProjectFiles(project)
        setInitialLoaded(true)
      }
    }
  }, [initialProjectId, projects, initialLoaded])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const data = await fetchProjects()
      setProjects(data)
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadProjectFiles = async (project: Project) => {
    setLoading(true)
    try {
      const data = await fetchProjectFiles(project.id)
      setFiles(data)
      setSelectedProject(project)
      setViewMode('files')
      // 스펙 URL 맵 로드
      try {
        const settings = await fetchProjectSettings(project.id)
        const specData = settings['spec-url-map']
        setSpecUrlMap(specData ? JSON.parse(specData) : {})
      } catch { setSpecUrlMap({}) }
    } catch (err) {
      console.error('Failed to load project files:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!await showConfirm(`프로젝트 "${project.name}"을(를) 삭제하시겠습니까?\n하위 파일도 모두 삭제됩니다.`)) return

    try {
      await deleteProject(project.id)
      setProjects(projects.filter(p => p.id !== project.id))
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
  }

  const handleDeleteFile = async (fileKey: string, nodeId: string | null, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!selectedProject) return
    if (!await showConfirm('이 파일을 삭제하시겠습니까?')) return

    try {
      // 연결된 스펙 문서 삭제
      const specKey = `${fileKey}-${nodeId || ''}`
      const specEntry = specUrlMap[specKey]
      if (specEntry) {
        try {
          // 스펙 트리 데이터 삭제
          await deleteFigmaFileData(selectedProject.id, specEntry.specFileKey, specEntry.specNodeId)
          // 스펙 이미지 (_spec.svg) 삭제
          await deleteFigmaFileImage(selectedProject.id, fileKey, nodeId, 'spec')
          // 스펙 매핑 설정 삭제
          const specSettingsKey = `spec-meta-${specEntry.specFileKey}-${specEntry.specNodeId || ''}`
          const markTargetKey = `spec-mark-target-${specEntry.specFileKey}-${specEntry.specNodeId || ''}`
          await saveProjectSettings(selectedProject.id, {
            [specSettingsKey]: JSON.stringify({}),
            [markTargetKey]: JSON.stringify({}),
          })
          // spec-url-map에서 제거
          const newMap = { ...specUrlMap }
          delete newMap[specKey]
          await saveProjectSettings(selectedProject.id, { 'spec-url-map': JSON.stringify(newMap) })
          setSpecUrlMap(newMap)
        } catch (e) { console.warn('스펙 삭제 실패:', e) }
      }

      await deleteFigmaFile(selectedProject.id, fileKey, nodeId)
      setFiles(files.filter(f => !(f.fileKey === fileKey && f.nodeId === nodeId)))
      generateClusters(selectedProject.id).catch((e) => console.error('Failed to regenerate clusters:', e))
    } catch (err) {
      console.error('Failed to delete file:', err)
    }
  }

  const handleOpenProjectModal = (project?: Project) => {
    if (project) {
      setEditingProject(project)
      setProjectName(project.name)
    } else {
      setEditingProject(null)
      setProjectName('')
    }
    setProjectError('')
    setProjectModalOpen(true)
  }

  const handleSaveProject = async () => {
    if (!projectName.trim()) return
    setProjectError('')

    try {
      if (editingProject) {
        const updated = await updateProject(editingProject.id, projectName.trim())
        setProjects(projects.map(p => p.id === updated.id ? updated : p))
        if (selectedProject?.id === updated.id) {
          setSelectedProject(updated)
        }
      } else {
        const created = await createProject(projectName.trim())
        setProjects([created, ...projects])
      }
      setProjectModalOpen(false)
      setProjectName('')
      setEditingProject(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '프로젝트 저장에 실패했습니다'
      setProjectError(errorMessage)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen theme-bg-primary">
      {/* 헤더 */}
      <header className="theme-bg-secondary border-b theme-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/websquareAI.png" width="32" height="32" alt="WebSquare AI" className="rounded" />
            <h1 className="text-xl font-bold theme-text-primary">WebSquare AI</h1>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {viewMode === 'projects' ? (
          <>
            {/* 프로젝트 타이틀 + 새 프로젝트 버튼 */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold theme-text-primary">프로젝트</h2>
              <button
                onClick={() => handleOpenProjectModal()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                새 프로젝트
              </button>
            </div>

            {/* 프로젝트 목록 */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-gray-400">로딩 중...</div>
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 mb-4 rounded-full theme-bg-secondary flex items-center justify-center">
                  <svg className="w-8 h-8 theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <p className="theme-text-secondary mb-2">아직 프로젝트가 없습니다</p>
                <p className="text-gray-500 text-sm mb-4">프로젝트를 생성하여 Figma 파일을 관리하세요</p>
                <button
                  onClick={() => handleOpenProjectModal()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  첫 프로젝트 생성
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => loadProjectFiles(project)}
                    className="group theme-bg-secondary border theme-border rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
                  >
                    {/* 프로젝트 아이콘 영역 */}
                    <div className="aspect-video theme-bg-tertiary flex items-center justify-center relative">
                      <svg className="w-12 h-12 theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      {/* 수정 버튼 */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenProjectModal(project); }}
                        className="absolute top-2 right-10 p-1.5 bg-gray-900/80 text-gray-400 hover:text-blue-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="수정"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* 삭제 버튼 */}
                      <button
                        onClick={(e) => handleDeleteProject(project, e)}
                        className="absolute top-2 right-2 p-1.5 bg-gray-900/80 text-gray-400 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    {/* 프로젝트 정보 */}
                    <div className="p-3">
                      <h3 className="text-sm font-medium theme-text-primary truncate" title={project.name}>
                        {project.name}
                      </h3>
                      <p className="text-xs theme-text-secondary mt-1">
                        {project.fileCount}개의 파일
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* 파일 타이틀 + 네비게이션 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold theme-text-primary">{selectedProject?.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectedProject && onOpenSettings(selectedProject.id, selectedProject.name)}
                  className="p-2 theme-text-secondary hover:text-blue-500 theme-bg-hover rounded"
                  title="프로젝트 설정"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => selectedProject && onAddNewFile(selectedProject.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  새 파일 추가
                </button>
              </div>
            </div>

            {/* 파일 목록 */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-gray-400">로딩 중...</div>
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 mb-4 rounded-full theme-bg-secondary flex items-center justify-center">
                  <svg className="w-8 h-8 theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="theme-text-secondary mb-2">아직 추가된 파일이 없습니다</p>
                <p className="text-gray-500 text-sm mb-4">Figma 파일을 추가하여 컴포넌트를 매핑해보세요</p>
                <button
                  onClick={() => selectedProject && onAddNewFile(selectedProject.id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  첫 파일 추가하기
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => selectedProject && onSelectFile(file.fileKey, file.nodeId, selectedProject.id, selectedProject.name, file.version)}
                    className="group theme-bg-secondary border theme-border rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
                  >
                    {/* 썸네일 영역 */}
                    <div className="aspect-video theme-bg-tertiary flex items-center justify-center relative">
                      {file.thumbnailUrl ? (
                        <img
                          src={file.thumbnailUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-12 h-12 theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                      {/* 완료 표시 뱃지 */}
                      {file.completed && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          완료
                        </span>
                      )}
                      {/* 노드 표시 뱃지 */}
                      {file.nodeId && !file.completed && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                          노드
                        </span>
                      )}
                      {/* Refresh 버튼 */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!selectedProject || refreshingFileKey) return
                          const fileId = `${file.fileKey}-${file.nodeId || ''}`
                          try {
                            setRefreshingFileKey(fileId)
                            await onRefreshFile(file.fileKey, file.nodeId, selectedProject.id)
                            // 파일 목록 새로고침
                            await loadProjectFiles(selectedProject)
                          } catch (err) {
                            console.error('Failed to refresh file:', err)
                            showAlert('파일을 새로고침하는데 실패했습니다.')
                          } finally {
                            setRefreshingFileKey(null)
                          }
                        }}
                        disabled={refreshingFileKey === `${file.fileKey}-${file.nodeId || ''}`}
                        className="absolute top-2 right-10 p-1.5 bg-gray-900/80 text-gray-400 hover:text-blue-400 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                        title="새로고침"
                      >
                        {refreshingFileKey === `${file.fileKey}-${file.nodeId || ''}` ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                      </button>
                      {/* 스펙문서 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!selectedProject) return
                          const specKey = `${file.fileKey}-${file.nodeId || ''}`
                          const existing = specUrlMap[specKey]
                          if (existing) {
                            // 이미 등록됨 → 바로 이동
                            onOpenSpec(selectedProject.id, existing.specFileKey, existing.specNodeId, file.fileKey, file.nodeId)
                          } else {
                            // 미등록 → 모달
                            setSpecModalFile({ fileKey: file.fileKey, nodeId: file.nodeId })
                            setSpecModalOpen(true)
                          }
                        }}
                        className={`absolute top-2 right-[4.5rem] p-1.5 bg-gray-900/80 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          specUrlMap[`${file.fileKey}-${file.nodeId || ''}`] ? 'text-green-400 hover:text-green-300' : 'text-gray-400 hover:text-green-400'
                        }`}
                        title={specUrlMap[`${file.fileKey}-${file.nodeId || ''}`] ? '스펙문서 보기' : '스펙문서 등록'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      {/* 삭제 버튼 */}
                      <button
                        onClick={(e) => handleDeleteFile(file.fileKey, file.nodeId, e)}
                        className="absolute top-2 right-2 p-1.5 bg-gray-900/80 text-gray-400 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    {/* 파일 정보 */}
                    <div className="p-3">
                      <h3 className="text-sm font-medium theme-text-primary truncate" title={file.name}>
                        {file.name}
                      </h3>
                      <p className="text-xs theme-text-secondary mt-1">
                        {formatDate(file.lastOpenedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* 프로젝트 생성/수정 모달 */}
      {projectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="theme-bg-secondary rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold theme-text-primary mb-4">
              {editingProject ? '프로젝트 수정' : '새 프로젝트'}
            </h3>
            <input
              type="text"
              value={projectName}
              onChange={(e) => { setProjectName(e.target.value); setProjectError(''); }}
              placeholder="프로젝트 이름"
              className="w-full px-3 py-2 rounded border theme-border theme-bg-tertiary theme-text-primary mb-2"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveProject()}
            />
            {projectError && (
              <p className="text-sm text-red-500 mb-2">{projectError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setProjectModalOpen(false)}
                className="px-4 py-2 text-sm theme-text-secondary hover:theme-text-primary"
              >
                취소
              </button>
              <button
                onClick={handleSaveProject}
                disabled={!projectName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
              >
                {editingProject ? '저장' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 스펙문서 URL 입력 모달 */}
      {specModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSpecModalOpen(false)} />
          <div className="relative w-full max-w-md mx-4 theme-bg-secondary rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b theme-border">
              <h2 className="text-lg font-semibold theme-text-primary">스펙문서 생성</h2>
              <button onClick={() => setSpecModalOpen(false)} className="p-1 text-gray-400 hover:text-white rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!selectedProject || specLoading) return
                const form = e.target as HTMLFormElement
                const specUrl = (form.elements.namedItem('specUrl') as HTMLInputElement).value
                if (!specUrl) return

                const parsed = parseFigmaUrl(specUrl)
                if (!parsed) { showAlert('올바른 Figma URL이 아닙니다'); return }

                if (!specModalFile) return
                setSpecLoading(true)
                try {
                  // 토큰 (프로젝트 설정 - 서버 DB)
                  const settings = await fetchProjectSettings(selectedProject.id)
                  const token = settings['figma-token']
                  if (!token) {
                    showAlert('Figma Access Token이 설정되어 있지 않습니다.')
                    return
                  }

                  // 1. 스펙 Figma에서 노드 트리 받아오기
                  const file = await fetchFigmaFile(parsed.fileKey, token, parsed.nodeId)
                  const pages = file.document.children || []
                  let displayRoot = null
                  if (parsed.nodeId) {
                    for (const page of pages) {
                      const found = findNodeById(page, parsed.nodeId)
                      if (found) { displayRoot = found; break }
                    }
                  } else {
                    displayRoot = pages[0] || null
                  }
                  if (!displayRoot) {
                    showAlert('해당 노드를 찾을 수 없습니다.')
                    return
                  }

                  // 2. figma_file_data 에 스펙 트리 저장
                  await saveFigmaFileData(selectedProject.id, parsed.fileKey, parsed.nodeId, displayRoot)

                  // 3. 이미지 SVG 저장 — 이름 규칙: {srcFileKey}__{srcNodeId}_spec.svg
                  try {
                    const images = await fetchNodeImages(parsed.fileKey, token, [displayRoot.id], 'svg', 1)
                    const imgUrl = images.images[displayRoot.id]
                    if (imgUrl) {
                      await saveFigmaFileImage(selectedProject.id, specModalFile.fileKey, specModalFile.nodeId, imgUrl, 'spec')
                    }
                  } catch (e) { console.warn('스펙 이미지 저장 실패:', e) }

                  // 4. spec-url-map 에 등록
                  const specKey = `${specModalFile.fileKey}-${specModalFile.nodeId || ''}`
                  const newMap = {
                    ...specUrlMap,
                    [specKey]: { specFileKey: parsed.fileKey, specNodeId: parsed.nodeId, url: specUrl }
                  }
                  await saveProjectSettings(selectedProject.id, { 'spec-url-map': JSON.stringify(newMap) })
                  setSpecUrlMap(newMap)

                  setSpecModalOpen(false)

                  // 5. 스펙 뷰로 전환
                  onOpenSpec(selectedProject.id, parsed.fileKey, parsed.nodeId, specModalFile.fileKey, specModalFile.nodeId)
                } catch (err) {
                  console.error('스펙문서 등록 실패:', err)
                  showAlert('스펙문서 등록에 실패했습니다.')
                } finally {
                  setSpecLoading(false)
                }
              }}
              className="p-6"
            >
              <div className="mb-6">
                <label className="block text-sm font-medium theme-text-secondary mb-2">
                  설계서 Figma URL
                </label>
                <input
                  type="url"
                  name="specUrl"
                  placeholder="https://www.figma.com/design/xxxxx/..."
                  className="w-full px-4 py-2 theme-bg-tertiary border theme-border rounded-lg theme-text-primary placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoFocus
                  required
                />
                <p className="text-xs theme-text-secondary mt-2">
                  화면 설계서가 작성된 Figma 파일 또는 노드 URL을 입력하세요
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSpecModalOpen(false)}
                  className="flex-1 py-2.5 px-4 theme-bg-tertiary hover:opacity-80 theme-text-primary font-medium rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={specLoading}
                  className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
                >
                  {specLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      생성 중...
                    </>
                  ) : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
