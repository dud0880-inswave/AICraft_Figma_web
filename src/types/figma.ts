// Figma API 응답 타입 정의

export interface FigmaFile {
  name: string
  lastModified: string
  thumbnailUrl: string
  version: string
  document: FigmaDocument
  nodes?: Record<string, { document: FigmaDocument }>  // 특정 노드 조회 시 사용
}

export interface FigmaDocument {
  id: string
  name: string
  type: string
  children: FigmaNode[]
}

export interface FigmaNode {
  id: string
  name: string
  type: string
  visible?: boolean
  children?: FigmaNode[]
  absoluteBoundingBox?: BoundingBox
  absoluteRenderBounds?: BoundingBox
  backgroundColor?: Color
  fills?: Paint[]
  strokes?: Paint[]
  strokeWeight?: number
  cornerRadius?: number
  characters?: string
  style?: TypeStyle
  componentId?: string
  componentProperties?: Record<string, { value: string; type: string }>
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL'
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface Color {
  r: number
  g: number
  b: number
  a: number
}

export interface Paint {
  type: string
  visible?: boolean
  opacity?: number
  color?: Color
  gradientHandlePositions?: Vector[]
  gradientStops?: ColorStop[]
  imageRef?: string
}

export interface Vector {
  x: number
  y: number
}

export interface ColorStop {
  position: number
  color: Color
}

export interface TypeStyle {
  fontFamily?: string
  fontPostScriptName?: string
  fontWeight?: number
  fontSize?: number
  textAlignHorizontal?: string
  textAlignVertical?: string
  letterSpacing?: number
  lineHeightPx?: number
  lineHeightPercent?: number
}

export interface FigmaImageResponse {
  err: string | null
  images: Record<string, string>
}

// 앱 내부 상태 타입
export interface ViewerState {
  token: string
  fileUrl: string
  fileKey: string | null
  file: FigmaFile | null
  selectedNodeId: string | null
  pageImages: Record<string, string>
  currentPageId: string | null
  loading: boolean
  error: string | null
  scale: number
  pan: { x: number; y: number }
}

// 트리 노드 (UI용 확장)
export interface TreeNode extends FigmaNode {
  depth: number
  expanded: boolean
  hasChildren: boolean
}
