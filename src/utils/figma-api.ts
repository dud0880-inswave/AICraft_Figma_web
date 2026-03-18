import type { FigmaFile, FigmaImageResponse } from '../types/figma'

const FIGMA_API_BASE = '/api/figma-proxy'

export interface ParsedFigmaUrl {
  fileKey: string
  nodeId: string | null
}

export function extractFileKey(url: string): string | null {
  const parsed = parseFigmaUrl(url)
  return parsed?.fileKey || null
}

export function parseFigmaUrl(url: string): ParsedFigmaUrl | null {
  // https://www.figma.com/design/XXXXX/...?node-id=123-456 또는
  // https://www.figma.com/file/XXXXX/...?node-id=123:456 형식에서 추출
  const patterns = [
    /figma\.com\/design\/([a-zA-Z0-9]+)/,
    /figma\.com\/file\/([a-zA-Z0-9]+)/,
  ]

  let fileKey: string | null = null
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      fileKey = match[1]
      break
    }
  }

  if (!fileKey) return null

  // node-id 추출 (123-456 또는 123:456 형식)
  let nodeId: string | null = null
  const nodeIdMatch = url.match(/node-id=([0-9]+[-:][0-9]+)/)
  if (nodeIdMatch) {
    // Figma API는 콜론(:) 형식 사용, URL은 하이픈(-) 사용
    nodeId = nodeIdMatch[1].replace('-', ':')
  }

  return { fileKey, nodeId }
}

export async function fetchFigmaFile(fileKey: string, token: string, nodeId?: string | null): Promise<FigmaFile> {
  const url = nodeId
    ? `${FIGMA_API_BASE}/v1/files/${fileKey}?ids=${encodeURIComponent(nodeId)}`
    : `${FIGMA_API_BASE}/v1/files/${fileKey}`
  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': token,
    },
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('접근 권한이 없습니다. 토큰을 확인하세요.')
    }
    if (response.status === 404) {
      throw new Error('파일을 찾을 수 없습니다. URL을 확인하세요.')
    }
    const error = await response.text()
    throw new Error(`Figma API 오류: ${response.status} - ${error}`)
  }

  return response.json()
}

export async function fetchNodeImages(
  fileKey: string,
  token: string,
  nodeIds: string[],
  format: 'png' | 'svg' = 'png',
  scale: number = 1
): Promise<FigmaImageResponse> {
  const ids = nodeIds.join(',')
  const url = `${FIGMA_API_BASE}/v1/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=${format}&scale=${scale}`

  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': token,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Figma Image API 오류: ${response.status} - ${error}`)
  }

  return response.json()
}

export async function fetchPageImage(
  fileKey: string,
  token: string,
  pageId: string,
  scale: number = 1
): Promise<string | null> {
  const result = await fetchNodeImages(fileKey, token, [pageId], 'png', scale)
  return result.images[pageId] || null
}
