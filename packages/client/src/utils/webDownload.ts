// 웹 버전(브라우저) 환경 여부 및 파일 다운로드 헬퍼
// Extension(VS Code webview) 환경에서는 window.__vscode가 주입됨

export const isVsCodeEnv = (): boolean =>
  !!(window as unknown as { __vscode?: unknown }).__vscode

const MIME_MAP: Record<string, string> = {
  xml: 'application/xml',
  json: 'application/json',
  md: 'text/markdown',
}

// 웹 버전 기본 저장 방식: 브라우저 다운로드
export function downloadFile(content: string, filename: string): void {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const mime = MIME_MAP[ext] || 'text/plain'
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
