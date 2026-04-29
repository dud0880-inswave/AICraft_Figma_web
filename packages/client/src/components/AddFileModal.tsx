import { useState, useEffect } from 'react'
import { getPersonalSettings } from '../utils/api'

interface AddFileModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (token: string, fileUrl: string, projectId: string) => void
  loading: boolean
  projectId?: string
}

export default function AddFileModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
  projectId = '',
}: AddFileModalProps) {
  const [token, setToken] = useState('')
  const [fileUrl, setFileUrl] = useState('')

  // 모달 열릴 때 프로젝트 설정에서 토큰 로드
  useEffect(() => {
    if (isOpen && projectId) {
      setFileUrl('')
      const loadToken = async () => {
        try {
          const personal = await getPersonalSettings(projectId)
          setToken(personal['figma-token'] || '')
        } catch {
          setToken('')
        }
      }
      loadToken()
    }
  }, [isOpen, projectId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (token && fileUrl && projectId) {
      onSubmit(token, fileUrl, projectId)
    }
  }

  if (!isOpen) return null

  const hasToken = !!token

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative w-full max-w-md mx-4 theme-bg-secondary rounded-lg shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border">
          <h2 className="text-lg font-semibold theme-text-primary">새 파일 추가</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* 토큰 입력 */}
          <div className="mb-4">
            <label className="block text-sm font-medium theme-text-primary mb-2">
              Figma Access Token
            </label>
            {hasToken ? (
              <div className="flex items-center text-sm text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                토큰이 설정되어 있습니다
                <button
                  type="button"
                  onClick={() => setToken('')}
                  className="ml-auto text-xs theme-text-secondary theme-text-hover"
                >
                  변경
                </button>
              </div>
            ) : (
              <>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="figd_xxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 theme-bg-tertiary border theme-border rounded-lg theme-text-primary placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
                <p className="text-xs theme-text-secondary mt-1">
                  Figma Settings → Account → Personal access tokens
                </p>
              </>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Figma File URL
            </label>
            <input
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://www.figma.com/design/xxxxx/..."
              className="w-full px-4 py-2 theme-bg-tertiary border theme-border rounded-lg theme-text-primary placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              autoFocus
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 theme-bg-tertiary hover:opacity-80 theme-text-primary font-medium rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !token || !fileUrl}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  불러오는 중...
                </>
              ) : (
                '추가'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
