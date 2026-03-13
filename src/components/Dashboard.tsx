import { useState, useEffect } from 'react'
import type { FigmaFileRecord } from '../utils/api'
import { fetchFigmaFiles, deleteFigmaFile } from '../utils/api'

interface DashboardProps {
  onSelectFile: (fileKey: string, nodeId: string | null) => void
  onAddNewFile: () => void
  onOpenSettings: () => void
}

export default function Dashboard({ onSelectFile, onAddNewFile, onOpenSettings }: DashboardProps) {
  const [files, setFiles] = useState<FigmaFileRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    setLoading(true)
    try {
      const data = await fetchFigmaFiles()
      setFiles(data)
    } catch (err) {
      console.error('Failed to load files:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (fileKey: string, nodeId: string | null, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('이 파일을 삭제하시겠습니까?')) return

    try {
      await deleteFigmaFile(fileKey, nodeId)
      setFiles(files.filter(f => !(f.fileKey === fileKey && f.nodeId === nodeId)))
    } catch (err) {
      console.error('Failed to delete file:', err)
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
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M10.667 32C13.612 32 16 29.612 16 26.667V21.333H10.667C7.722 21.333 5.333 23.722 5.333 26.667C5.333 29.612 7.722 32 10.667 32Z" fill="#0ACF83"/>
              <path d="M5.333 16C5.333 13.055 7.722 10.667 10.667 10.667H16V21.333H10.667C7.722 21.333 5.333 18.945 5.333 16Z" fill="#A259FF"/>
              <path d="M5.333 5.333C5.333 2.388 7.722 0 10.667 0H16V10.667H10.667C7.722 10.667 5.333 8.278 5.333 5.333Z" fill="#F24E1E"/>
              <path d="M16 0H21.333C24.278 0 26.667 2.388 26.667 5.333C26.667 8.278 24.278 10.667 21.333 10.667H16V0Z" fill="#FF7262"/>
              <path d="M26.667 16C26.667 18.945 24.278 21.333 21.333 21.333C18.388 21.333 16 18.945 16 16C16 13.055 18.388 10.667 21.333 10.667C24.278 10.667 26.667 13.055 26.667 16Z" fill="#1ABCFE"/>
            </svg>
            <h1 className="text-xl font-bold theme-text-primary">Figma Analyzer</h1>
          </div>
          <button
            onClick={onOpenSettings}
            className="p-2 theme-text-secondary hover:theme-text-primary hover:bg-gray-700 dark:hover:bg-gray-700 light:hover:bg-gray-200 rounded"
            title="설정"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* 타이틀 + 새 파일 버튼 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold theme-text-primary">내 프로젝트</h2>
          <button
            onClick={onAddNewFile}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 파일 추가
          </button>
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
              onClick={onAddNewFile}
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
                onClick={() => onSelectFile(file.fileKey, file.nodeId)}
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
                  {/* 삭제 버튼 */}
                  <button
                    onClick={(e) => handleDelete(file.fileKey, file.nodeId, e)}
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
      </main>
    </div>
  )
}
