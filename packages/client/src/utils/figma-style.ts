import type { FigmaNode } from '../types/figma'

// ============================================================
// Figma JSON → inline style 변환
// 룰 기반: layoutMode 유무에 따라 flex / absolute 분기
// ============================================================

// --- 헬퍼 ---

// INSTANCE → 자식이 1개(wrapper FRAME)일 때만 layout 빌려옴
function findLayoutNode(n: FigmaNode): FigmaNode {
  if (n.layoutMode && n.layoutMode !== 'NONE') return n
  if (n.type === 'INSTANCE' && n.children?.length === 1) {
    const child = n.children[0]
    if (child.type === 'FRAME' && child.layoutMode && child.layoutMode !== 'NONE') {
      return child
    }
  }
  return n
}

// 내부 TEXT 자식 검색
function findFirstText(n: FigmaNode): FigmaNode | null {
  if (n.type === 'TEXT') return n
  for (const child of n.children ?? []) {
    const found = findFirstText(child)
    if (found) return found
  }
  return null
}

// TEXT 노드의 실효 fontWeight (characterStyleOverrides 반영)
function getEffectiveFontWeight(textNode: FigmaNode): number | undefined {
  const baseWeight = textNode.style?.fontWeight
  const overrides = textNode.characterStyleOverrides
  const table = textNode.styleOverrideTable
  if (!overrides || !table || overrides.length === 0) return baseWeight
  const charLen = textNode.characters?.length ?? 0
  if (overrides.length === charLen) {
    const firstKey = String(overrides[0])
    const allSame = overrides.every(o => String(o) === firstKey)
    if (allSame && table[firstKey]?.fontWeight) {
      return table[firstKey].fontWeight
    }
  }
  return baseWeight
}

// rgb/rgba 문자열
function colorToRgb(r: number, g: number, b: number, a?: number, opacity?: number): string {
  const alpha = opacity !== undefined ? opacity : (a ?? 1)
  const rgb = `${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)}`
  return alpha < 1 ? `rgba(${rgb},${alpha.toFixed(2)})` : `rgb(${rgb})`
}

// 부모가 auto-layout인지
function parentHasAutoLayout(parentNode?: FigmaNode): boolean {
  if (!parentNode) return false
  const ln = findLayoutNode(parentNode)
  return !!(ln.layoutMode && ln.layoutMode !== 'NONE' && ln.itemSpacing !== undefined)
}

// --- 공통 스타일 push 함수 ---

// 사이징: layoutSizing에 따라 width/height 결정
function pushSizing(styles: string[], node: FigmaNode, isParentAutoLayout: boolean, parentNode?: FigmaNode) {
  const bb = node.absoluteBoundingBox
  if (!bb) return

  const parentClips = parentNode?.clipsContent === true

  // width
  if (isParentAutoLayout && node.layoutGrow === 1) {
    styles.push('flex:1 0 0')
  }
  styles.push(`width:${Math.round(bb.width)}px`)

  // height
  if (node.layoutSizingVertical === 'FILL' && isParentAutoLayout) {
    styles.push('align-self:stretch')
  } else {
    styles.push(`height:${Math.round(bb.height)}px`)
  }

  // flex-shrink:0 for FIXED size in flex container (가로 또는 세로 FIXED)
  if (isParentAutoLayout && node.layoutGrow !== 1 &&
      (node.layoutSizingHorizontal === 'FIXED' || node.layoutSizingVertical === 'FIXED')) {
    styles.push('flex-shrink:0')
  }
}

// absolute 포지셔닝 (부모가 auto-layout이 아닐 때)
function pushAbsolutePosition(styles: string[], node: FigmaNode, parentNode?: FigmaNode) {
  if (parentNode?.absoluteBoundingBox && node.absoluteBoundingBox) {
    styles.push('position:absolute')
    styles.push(`left:${Math.round(node.absoluteBoundingBox.x - parentNode.absoluteBoundingBox.x)}px`)
    styles.push(`top:${Math.round(node.absoluteBoundingBox.y - parentNode.absoluteBoundingBox.y)}px`)
  }
}

// 공통: position + sizing 처리 (layoutPositioning: ABSOLUTE 대응)
function pushPositionAndSizing(styles: string[], node: FigmaNode, parentNode: FigmaNode | undefined, isParentAL: boolean) {
  const isAbsoluteChild = node.layoutPositioning === 'ABSOLUTE'
  if (parentNode && (!isParentAL || isAbsoluteChild)) {
    pushAbsolutePosition(styles, node, parentNode)
  }
  pushSizing(styles, node, isParentAL && !isAbsoluteChild, parentNode)
}

// background-color
function pushBackgroundColor(styles: string[], node: FigmaNode, fallbackTransparent = false) {
  const solidFill = node.fills?.find(f => f.type === 'SOLID' && f.visible !== false)
  if (solidFill?.color) {
    styles.push(`background-color:${colorToRgb(solidFill.color.r, solidFill.color.g, solidFill.color.b, solidFill.color.a, solidFill.opacity)}`)
  } else if (fallbackTransparent) {
    styles.push('background-color:transparent')
  }
}

// border-radius
function pushBorderRadius(styles: string[], node: FigmaNode) {
  if (node.cornerRadius) {
    styles.push(`border-radius:${node.cornerRadius}px`)
  } else if (node.rectangleCornerRadii) {
    const [tl, tr, br, bl] = node.rectangleCornerRadii
    styles.push(`border-radius:${tl}px ${tr}px ${br}px ${bl}px`)
  }
}

// border (solid/dashed, individualStrokeWeights 지원)
function pushBorder(styles: string[], node: FigmaNode) {
  const solidStroke = node.strokes?.find(s => s.type === 'SOLID' && s.visible !== false)
  if (!solidStroke?.color) return
  const { r, g, b } = solidStroke.color
  const color = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`
  const borderStyle = node.strokeDashes?.length ? 'dashed' : 'solid'

  if (node.individualStrokeWeights) {
    const w = node.individualStrokeWeights
    if (w.top && !w.right && !w.bottom && !w.left) {
      styles.push(`border-top:${w.top}px ${borderStyle} ${color}`)
    } else if (!w.top && !w.right && w.bottom && !w.left) {
      styles.push(`border-bottom:${w.bottom}px ${borderStyle} ${color}`)
    } else {
      // 여러 방향
      if (w.top) styles.push(`border-top:${w.top}px ${borderStyle} ${color}`)
      if (w.right) styles.push(`border-right:${w.right}px ${borderStyle} ${color}`)
      if (w.bottom) styles.push(`border-bottom:${w.bottom}px ${borderStyle} ${color}`)
      if (w.left) styles.push(`border-left:${w.left}px ${borderStyle} ${color}`)
    }
  } else if (node.strokeWeight) {
    styles.push(`border:${node.strokeWeight}px ${borderStyle} ${color}`)
  }
}

// ============================================================
// group: box-sizing + size + flex/absolute layout + visual
// ============================================================
function extractGroupStyle(node: FigmaNode, parentNode?: FigmaNode): string {
  const layoutNode = findLayoutNode(node)
  const isParentAL = parentHasAutoLayout(parentNode)
  // layoutMode가 있어도 itemSpacing이 없으면 실질적 absolute 배치
  const hasOwnLayout = !!(layoutNode.layoutMode && layoutNode.layoutMode !== 'NONE' && layoutNode.itemSpacing !== undefined)
  const styles: string[] = ['box-sizing:border-box']

  // opacity
  if (node.opacity !== undefined && node.opacity < 1) {
    styles.push(`opacity:${node.opacity}`)
  }

  // position + sizing
  pushPositionAndSizing(styles, node, parentNode, isParentAL)

  // 자체 auto-layout → flex
  if (hasOwnLayout) {
    // absolute 자식의 기준점 역할을 위해 position:relative 추가
    if (!styles.includes('position:absolute')) {
      styles.push('position:relative')
    }
    styles.push('display:flex')
    styles.push(`flex-direction:${layoutNode.layoutMode === 'HORIZONTAL' ? 'row' : 'column'}`)

    const justifyMap: Record<string, string> = {
      MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', SPACE_BETWEEN: 'space-between',
    }
    if (layoutNode.primaryAxisAlignItems && layoutNode.primaryAxisAlignItems !== 'MIN') {
      styles.push(`justify-content:${justifyMap[layoutNode.primaryAxisAlignItems]}`)
    }

    const alignMap: Record<string, string> = {
      MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', BASELINE: 'baseline', STRETCH: 'stretch',
    }
    const counterAlign = layoutNode.counterAxisAlignItems ?? 'MIN'
    styles.push(`align-items:${alignMap[counterAlign] ?? 'flex-start'}`)

    if (layoutNode.itemSpacing && layoutNode.primaryAxisAlignItems !== 'SPACE_BETWEEN') {
      styles.push(`gap:${layoutNode.itemSpacing}px`)
    }
  } else if (node.children?.length) {
    // auto-layout 없으면 position:relative (자식이 absolute)
    // 단, 이미 position:absolute가 들어있으면 추가하지 않음
    if (!styles.includes('position:absolute')) {
      styles.push('position:relative')
    }
  }

  // padding: layoutNode에 있으면 사용, 없으면 INSTANCE→자식 FRAME 좌표 차이로 계산
  let pt = layoutNode.paddingTop || 0
  let pr = layoutNode.paddingRight || 0
  let pb = layoutNode.paddingBottom || 0
  let pl = layoutNode.paddingLeft || 0
  if (!pt && !pr && !pb && !pl && node !== layoutNode && node.absoluteBoundingBox && layoutNode.absoluteBoundingBox) {
    const nbb = node.absoluteBoundingBox
    const lbb = layoutNode.absoluteBoundingBox
    pl = Math.round(lbb.x - nbb.x)
    pt = Math.round(lbb.y - nbb.y)
    pr = Math.round((nbb.x + nbb.width) - (lbb.x + lbb.width))
    pb = Math.round((nbb.y + nbb.height) - (lbb.y + lbb.height))
    if (pl < 0) pl = 0
    if (pt < 0) pt = 0
    if (pr < 0) pr = 0
    if (pb < 0) pb = 0
  }
  if (pt || pr || pb || pl) {
    styles.push(
      pt === pr && pr === pb && pb === pl
        ? `padding:${pt}px`
        : `padding:${pt}px ${pr}px ${pb}px ${pl}px`
    )
  }

  // clipsContent
  if (node.clipsContent) styles.push('overflow:hidden')

  // visual
  pushBackgroundColor(styles, node, true)
  pushBorderRadius(styles, node)
  pushBorder(styles, node)

  return styles.join(';')
}

// ============================================================
// button / trigger
// ============================================================
function extractButtonStyle(node: FigmaNode, parentNode?: FigmaNode): string {
  const isParentAL = parentHasAutoLayout(parentNode)
  const styles: string[] = []

  pushPositionAndSizing(styles, node, parentNode, isParentAL)

  // padding (-1 보정)
  const pt = Math.max(0, (node.paddingTop || 0) - 1)
  const pb = Math.max(0, (node.paddingBottom || 0) - 1)
  if (pt || pb) styles.push(`padding-top:${pt}px;padding-bottom:${pb}px`)

  // 텍스트 수직 가운데
  if (node.absoluteBoundingBox) {
    const innerH = Math.round(node.absoluteBoundingBox.height) - (node.paddingTop || 0) - (node.paddingBottom || 0)
    if (innerH > 0) styles.push(`line-height:${innerH}px`)
  }

  pushBackgroundColor(styles, node)
  pushBorderRadius(styles, node)
  pushBorder(styles, node)

  // typography
  const textNode = findFirstText(node)
  if (textNode) {
    const textFill = textNode.fills?.find(f => f.type === 'SOLID' && f.visible !== false)
    if (textFill?.color) {
      styles.push(`color:${colorToRgb(textFill.color.r, textFill.color.g, textFill.color.b, textFill.color.a, textFill.opacity)}`)
    }
    if (textNode.style?.fontSize) styles.push(`font-size:${textNode.style.fontSize}px`)
    const fw = getEffectiveFontWeight(textNode)
    if (fw) styles.push(`font-weight:${fw}`)
  }

  return styles.join(';')
}

// ============================================================
// anchor
// ============================================================
function extractAnchorStyle(node: FigmaNode, parentNode?: FigmaNode): string {
  const isParentAL = parentHasAutoLayout(parentNode)
  const styles: string[] = ['display:block']

  pushPositionAndSizing(styles, node, parentNode, isParentAL)

  const solidFill = node.fills?.find(f => f.type === 'SOLID' && f.visible !== false)
  if (solidFill?.color) {
    styles.push(`color:${colorToRgb(solidFill.color.r, solidFill.color.g, solidFill.color.b, solidFill.color.a, solidFill.opacity)}`)
  }

  if (node.style) {
    const s = node.style
    if (s.fontSize) styles.push(`font-size:${s.fontSize}px`)
    if (s.fontWeight) styles.push(`font-weight:${s.fontWeight}`)
    if (s.fontFamily) styles.push(`font-family:${s.fontFamily}`)
    if (s.letterSpacing) styles.push(`letter-spacing:${s.letterSpacing}px`)
    if (s.lineHeightPx) styles.push(`line-height:${s.lineHeightPx}px`)
    if (s.textAlignHorizontal) {
      const textAlignMap: Record<string, string> = { LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' }
      const align = textAlignMap[s.textAlignHorizontal]
      if (align) styles.push(`text-align:${align}`)
    }
  }

  return styles.join(';')
}

// ============================================================
// textbox
// ============================================================
function extractTextboxStyle(node: FigmaNode, parentNode?: FigmaNode): string {
  const textNode = findFirstText(node)
  const isParentAL = parentHasAutoLayout(parentNode)
  const styles: string[] = []

  // white-space: WIDTH_AND_HEIGHT이거나 가로세로 모두 HUG면 nowrap
  if (textNode?.textAutoResize === 'WIDTH_AND_HEIGHT' ||
      (node.layoutSizingHorizontal === 'HUG' && node.layoutSizingVertical === 'HUG')) {
    styles.push('white-space:nowrap')
  }

  const isAbsoluteChild = node.layoutPositioning === 'ABSOLUTE'
  if (parentNode && (!isParentAL || isAbsoluteChild)) {
    pushAbsolutePosition(styles, node, parentNode)
  }
  const effectiveParentAL = isParentAL && !isAbsoluteChild

  // size: HUG이면 height 미지정
  const bb = node.absoluteBoundingBox
  if (bb) {
    if (effectiveParentAL && (node.layoutSizingHorizontal === 'FILL' || node.layoutGrow === 1)) {
      styles.push('flex:1 0 0')
      styles.push(`width:${Math.round(bb.width)}px`)
    } else if (node.layoutSizingHorizontal !== 'HUG') {
      styles.push(`width:${Math.round(bb.width)}px`)
    }
    // height: textAutoResize가 HEIGHT나 WIDTH_AND_HEIGHT면 auto
    if (textNode?.textAutoResize !== 'HEIGHT' && textNode?.textAutoResize !== 'WIDTH_AND_HEIGHT' && node.layoutSizingVertical !== 'HUG') {
      styles.push(`height:${Math.round(bb.height)}px`)
    }
  }

  // padding
  const pt = node.paddingTop || 0
  const pr = node.paddingRight || 0
  const pb = node.paddingBottom || 0
  const pl = node.paddingLeft || 0
  if (pt || pr || pb || pl) {
    styles.push(
      pt === pr && pr === pb && pb === pl
        ? `padding:${pt}px`
        : `padding:${pt}px ${pr}px ${pb}px ${pl}px`
    )
  }

  pushBorderRadius(styles, node)
  pushBorder(styles, node)

  // typography
  if (textNode) {
    if (textNode.style?.fontFamily) styles.push(`font-family:${textNode.style.fontFamily}`)
    if (textNode.style?.fontSize) styles.push(`font-size:${textNode.style.fontSize}px`)
    const fw = getEffectiveFontWeight(textNode)
    if (fw) styles.push(`font-weight:${fw}`)
    // line-height: 한 줄이면 bb.height로 (leadingTrim 대응), 여러 줄이면 %
    const isMultiLine = !!(textNode.characters?.includes('\n'))
    if (isMultiLine && textNode.style?.lineHeightPercentFontSize) {
      styles.push(`line-height:${textNode.style.lineHeightPercentFontSize}%`)
    } else if (textNode.absoluteBoundingBox) {
      styles.push(`line-height:${Math.round(textNode.absoluteBoundingBox.height)}px`)
    }
    if (textNode.style?.letterSpacing) styles.push(`letter-spacing:${textNode.style.letterSpacing}px`)
    if (textNode.style?.textAlignHorizontal) {
      const textAlignMap: Record<string, string> = { LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' }
      const align = textAlignMap[textNode.style.textAlignHorizontal]
      if (align) styles.push(`text-align:${align}`)
    }
    const textFill = textNode.fills?.find(f => f.type === 'SOLID' && f.visible !== false)
    if (textFill?.color) {
      styles.push(`color:${colorToRgb(textFill.color.r, textFill.color.g, textFill.color.b, textFill.color.a, textFill.opacity)}`)
    }
  }

  return styles.join(';')
}

// ============================================================
// grid: width only
// ============================================================
function extractGridStyle(node: FigmaNode, parentNode?: FigmaNode): string {
  const isParentAL = parentHasAutoLayout(parentNode)
  const styles: string[] = []
  pushPositionAndSizing(styles, node, parentNode, isParentAL)
  // grid는 width만
  return styles.filter(s => !s.startsWith('height:')).join(';')
}

// ============================================================
// table: width + height
// ============================================================
function extractTableStyle(node: FigmaNode, parentNode?: FigmaNode): string {
  const isParentAL = parentHasAutoLayout(parentNode)
  const styles: string[] = []
  pushPositionAndSizing(styles, node, parentNode, isParentAL)
  return styles.join(';')
}

// ============================================================
// input: size + border + padding + typography
// ============================================================
function extractInputStyle(node: FigmaNode, parentNode?: FigmaNode): string {
  const isParentAL = parentHasAutoLayout(parentNode)
  const styles: string[] = []

  pushPositionAndSizing(styles, node, parentNode, isParentAL)
  pushBorderRadius(styles, node)
  pushBorder(styles, node)

  // padding
  const pt = node.paddingTop || 0
  const pr = node.paddingRight || 0
  const pb = node.paddingBottom || 0
  const pl = node.paddingLeft || 0
  if (pt || pr || pb || pl) {
    styles.push(
      pt === pr && pr === pb && pb === pl
        ? `padding:${pt}px`
        : `padding:${pt}px ${pr}px ${pb}px ${pl}px`
    )
  }

  // typography
  const textNode = findFirstText(node)
  if (textNode) {
    if (textNode.style?.fontFamily) styles.push(`font-family:${textNode.style.fontFamily}`)
    if (textNode.style?.fontSize) styles.push(`font-size:${textNode.style.fontSize}px`)
    const fw = getEffectiveFontWeight(textNode)
    if (fw) styles.push(`font-weight:${fw}`)
    if (textNode.style?.letterSpacing) styles.push(`letter-spacing:${textNode.style.letterSpacing}px`)
    const textFill = textNode.fills?.find(f => f.type === 'SOLID' && f.visible !== false)
    if (textFill?.color) {
      styles.push(`color:${colorToRgb(textFill.color.r, textFill.color.g, textFill.color.b, textFill.color.a, textFill.opacity)}`)
    }
  }

  return styles.join(';')
}

// ============================================================
// image: width + height + position
// ============================================================
function extractImageStyle(node: FigmaNode, parentNode?: FigmaNode): string {
  const isParentAL = parentHasAutoLayout(parentNode)
  const styles: string[] = []
  pushPositionAndSizing(styles, node, parentNode, isParentAL)
  pushBorderRadius(styles, node)
  styles.push('object-fit:contain')
  styles.push('object-position:top left')
  return styles.join(';')
}

// ============================================================
// select / multiselect: size + border + padding + typography
// ============================================================
function extractSelectStyle(node: FigmaNode, parentNode?: FigmaNode): string {
  const isParentAL = parentHasAutoLayout(parentNode)
  const styles: string[] = []

  pushPositionAndSizing(styles, node, parentNode, isParentAL)
  pushBorderRadius(styles, node)
  pushBorder(styles, node)

  const pt = node.paddingTop || 0
  const pr = node.paddingRight || 0
  const pb = node.paddingBottom || 0
  const pl = node.paddingLeft || 0
  if (pt || pr || pb || pl) {
    styles.push(
      pt === pr && pr === pb && pb === pl
        ? `padding:${pt}px`
        : `padding:${pt}px ${pr}px ${pb}px ${pl}px`
    )
  }

  const textNode = findFirstText(node)
  if (textNode) {
    if (textNode.style?.fontSize) styles.push(`font-size:${textNode.style.fontSize}px`)
    const fw = getEffectiveFontWeight(textNode)
    if (fw) styles.push(`font-weight:${fw}`)
  }

  return styles.join(';')
}

// ============================================================
// 컴포넌트 이름 → 스타일 추출 함수 라우팅
// parentNode: 부모 노드 (flex/absolute 판단용)
// ============================================================
export function extractInlineStyle(node: FigmaNode, componentName?: string, parentNode?: FigmaNode): string {
  switch (componentName?.toLowerCase()) {
    case 'group':
    case 'th':
    case 'td':       return extractGroupStyle(node, parentNode)
    case 'button':
    case 'trigger':  return extractButtonStyle(node, parentNode)
    case 'anchor':   return extractAnchorStyle(node, parentNode)
    case 'textbox':  return extractTextboxStyle(node, parentNode)
    case 'input':    return extractInputStyle(node, parentNode)
    case 'select':
    case 'multiselect': return extractSelectStyle(node, parentNode)
    case 'image':    return extractImageStyle(node, parentNode)
    case 'gridview': return extractGridStyle(node, parentNode)
    case 'table':    return extractTableStyle(node, parentNode)
    default:         return ''
  }
}
