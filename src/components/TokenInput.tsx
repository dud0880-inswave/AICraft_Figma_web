import { useState, useEffect } from 'react'

interface TokenInputProps {
  onSubmit: (token: string, fileUrl: string) => void
  loading: boolean
  savedToken?: string
  onOpenSettings?: () => void
  onBack?: () => void
}

export default function TokenInput({ onSubmit, loading, savedToken = '', onOpenSettings, onBack }: TokenInputProps) {
  const [token, setToken] = useState(savedToken)
  const [fileUrl, setFileUrl] = useState('')

  // savedToken이 변경되면 반영
  useEffect(() => {
    if (savedToken) {
      setToken(savedToken)
    }
  }, [savedToken])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (token && fileUrl) {
      onSubmit(token, fileUrl)
    }
  }

  const hasToken = !!token

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      {/* 뒤로가기 버튼 */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          대시보드로 돌아가기
        </button>
      )}

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <path d="M10.667 32C13.612 32 16 29.612 16 26.667V21.333H10.667C7.722 21.333 5.333 23.722 5.333 26.667C5.333 29.612 7.722 32 10.667 32Z" fill="#0ACF83"/>
              <path d="M5.333 16C5.333 13.055 7.722 10.667 10.667 10.667H16V21.333H10.667C7.722 21.333 5.333 18.945 5.333 16Z" fill="#A259FF"/>
              <path d="M5.333 5.333C5.333 2.388 7.722 0 10.667 0H16V10.667H10.667C7.722 10.667 5.333 8.278 5.333 5.333Z" fill="#F24E1E"/>
              <path d="M16 0H21.333C24.278 0 26.667 2.388 26.667 5.333C26.667 8.278 24.278 10.667 21.333 10.667H16V0Z" fill="#FF7262"/>
              <path d="M26.667 16C26.667 18.945 24.278 21.333 21.333 21.333C18.388 21.333 16 18.945 16 16C16 13.055 18.388 10.667 21.333 10.667C24.278 10.667 26.667 13.055 26.667 16Z" fill="#1ABCFE"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">새 파일 추가</h1>
          <p className="text-gray-400 mt-2">Figma 파일 URL을 입력하여 프로젝트에 추가하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 shadow-xl">
          {/* 토큰 상태 표시 */}
          {hasToken ? (
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">
                  Figma Access Token
                </label>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  변경
                </button>
              </div>
              <div className="mt-2 flex items-center text-sm text-green-400 bg-green-900/20 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                토큰이 설정되어 있습니다
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">
                  Figma Access Token
                </label>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  설정
                </button>
              </div>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="figd_xxxxxxxxxxxxxxxx"
                className="mt-2 w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Figma Settings → Account → Personal access tokens
              </p>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Figma File URL
            </label>
            <input
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://www.figma.com/design/xxxxx/..."
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token || !fileUrl}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                불러오는 중...
              </>
            ) : (
              '파일 불러오기'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
