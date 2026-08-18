// ============================================================
// XML 생성 코어 — 노드 트리 + 매핑 → WebSquare XML 변환
// ConvertedCodeEditor(전체 변환)와 MappingEditor(코드조각)가 공유한다.
// 두 곳의 출력이 어긋나지 않도록 변환 규칙은 반드시 이 파일에서만 수정할 것.
// ============================================================
import type { FigmaNode } from '../types/figma'
import type { RegistryItem, NodeMapping } from './api'
import { extractInlineStyle } from './figma-style'
import { findTextInChildren, collectAllTexts, collectTopLevelTexts } from './text-utils'

export interface XmlGeneratorOptions {
  mappingMap: Map<string, NodeMapping>
  registry: RegistryItem[]
  enableInlineStyle: boolean
  // 노드ID → SVG 원문 (image 매핑용, 전체 변환 시에만 프리페치해서 전달)
  imageSvgMap?: Map<string, string>
  // false면 자식 노드를 출력하지 않음 (코드조각용 — 자기 자신의 구조만 표시)
  includeChildren?: boolean
}

export interface XmlGenerator {
  traverse: (n: FigmaNode, depth: number, parent?: FigmaNode) => string
  // widget 조립 부산물 (전체 변환의 head 템플릿에서 사용)
  widgetInitScripts: string[]
  getWidgetTitleHeight: () => number
}

// 테이블 내 tr당 th/td 최대 개수 카운트
function countMaxColumnsInTable(
  tableNode: FigmaNode,
  mappingMap: Map<string, { registryId?: string }>,
  registry: { id: string; name: string }[]
): number {
  let maxCols = 0

  // registryId로 컴포넌트 이름 찾기
  const getComponentName = (nodeId: string): string | null => {
    const mapping = mappingMap.get(nodeId)
    if (!mapping?.registryId) return null
    const regItem = registry.find(r => r.id === mapping.registryId)
    return regItem?.name.toLowerCase() || null
  }

  // 노드 하위에서 th/td 개수 카운트 (재귀)
  const countThTdInNode = (node: FigmaNode): number => {
    let count = 0
    const componentName = getComponentName(node.id)

    if (componentName === 'th' || componentName === 'td') {
      return 1
    }

    if (node.children) {
      for (const child of node.children) {
        count += countThTdInNode(child)
      }
    }
    return count
  }

  // tr 노드 찾기 및 th/td 카운트
  const findTrAndCount = (node: FigmaNode) => {
    const componentName = getComponentName(node.id)

    if (componentName === 'tr') {
      // tr 하위의 모든 th, td 개수 카운트
      const colCount = countThTdInNode(node)
      maxCols = Math.max(maxCols, colCount)
    }

    // 자식 노드 순회
    if (node.children) {
      for (const child of node.children) {
        findTrAndCount(child)
      }
    }
  }

  findTrAndCount(tableNode)
  return maxCols
}

export function createXmlGenerator(opts: XmlGeneratorOptions): XmlGenerator {
  const { mappingMap, registry, enableInlineStyle } = opts
  const imageSvgMap = opts.imageSvgMap ?? new Map<string, string>()
  const includeChildren = opts.includeChildren ?? true

  // 위젯 초기화 스크립트 수집
  const widgetInitScripts: string[] = []
  let widgetTitleHeight = 0

  // tabControl의 w2:tabs / w2:content ID 채번 (문서 전체에서 유일하도록 누적)
  let tabIdSeq = 0
  let contentIdSeq = 0
  // accordion의 w2:panels ID 채번
  let accordionPanelSeq = 0

  // 트리 순회하며 계층 구조로 코드 생성
  const traverse = (n: FigmaNode, depth: number, parent?: FigmaNode): string => {
    // hidden 요소는 XML에서 제외
    if (n.visible === false) return ''

    const indentStr = '    '.repeat(depth)
    const nodeMapping = mappingMap.get(n.id)
    const regItem = nodeMapping?.registryId
      ? registry.find(r => r.id === nodeMapping.registryId)
      : null

    // 자식 노드들의 코드 먼저 생성 (includeChildren=false면 생략 — 코드조각용)
    const childrenCode = includeChildren && n.children
      ? n.children.map(child => traverse(child, depth + 1, n)).filter(Boolean).join('\n')
      : ''

    // 매핑된 노드인 경우
    if (regItem) {
      const { tagName, properties } = regItem
      const mergedProps: Record<string, string> = { ...properties, 'data-nodeid': n.id }
      const regItemNameLower = regItem.name.toLowerCase()

      // 커스텀 속성 병합 (class는 default 뒤에 추가)
      if (nodeMapping?.customAttrs) {
        Object.entries(nodeMapping.customAttrs).forEach(([key, value]) => {
          if (key === 'class' && mergedProps.class) {
            const defaultClasses = mergedProps.class.split(' ').filter(Boolean)
            const customClasses = value.split(' ').filter((c: string) => c && !defaultClasses.includes(c))
            mergedProps.class = [...defaultClasses, ...customClasses].join(' ')
          } else {
            mergedProps[key] = value
          }
        })
      }

      // registry 기본 properties.id는 같은 타입 노드 전체에 공유되므로 제거
      // customAttrs에 명시된 경우만 id 사용
      if (!nodeMapping?.customAttrs?.id) {
        delete mergedProps.id
      }

      // class 없거나 table/gridview이면 컴포넌트별 인라인 스타일 적용
      // customAttrs에 style 키가 있으면 (빈 값 포함) 인라인 스타일 생성 skip
      // 설정에서 인라인 스타일이 꺼져 있으면 skip
      const hasCustomStyleKey = nodeMapping?.customAttrs && 'style' in nodeMapping.customAttrs
      if (enableInlineStyle && !hasCustomStyleKey && (!mergedProps.class || ['table', 'gridview'].includes(regItemNameLower))) {
        const inlineStyle = extractInlineStyle(n, regItemNameLower, parent)
        if (inlineStyle) {
          const existingStyle = mergedProps.style ? `${mergedProps.style};` : ''
          mergedProps.style = `${existingStyle}${inlineStyle}`
        }
      }

      // textbox 특수 처리 - label 속성으로 텍스트 설정 (하위 노드까지 탐색)
      if (regItemNameLower === 'textbox') {
        const textNode = n.type === 'TEXT' ? n : (function findText(node: FigmaNode): FigmaNode | null {
          if (node.type === 'TEXT') return node
          for (const c of node.children ?? []) { const f = findText(c); if (f) return f }
          return null
        })(n)

        // characterStyleOverrides로 mixed style 감지 → 구간별 분리
        const overrides = textNode?.characterStyleOverrides
        const overrideTable = textNode?.styleOverrideTable
        const chars = textNode?.characters || n.characters || ''
        if (overrides && overrideTable && overrides.length === chars.length) {
          // override 구간 분할
          const segments: { text: string; overrideKey: string }[] = []
          let currentKey = String(overrides[0] ?? 0)
          let currentText = chars[0] || ''
          for (let i = 1; i < overrides.length; i++) {
            const key = String(overrides[i] ?? 0)
            if (key === currentKey) {
              currentText += chars[i]
            } else {
              segments.push({ text: currentText, overrideKey: currentKey })
              currentKey = key
              currentText = chars[i]
            }
          }
          if (currentText) segments.push({ text: currentText, overrideKey: currentKey })

          // 복수 구간이면 분리
          if (segments.length > 1) {
            const baseStyle = textNode?.style
            const baseFill = textNode?.fills?.find(f => f.type === 'SOLID' && f.visible !== false)

            const buildSegmentStyle = (seg: { text: string; overrideKey: string }) => {
              const ov = seg.overrideKey !== '0' ? overrideTable[seg.overrideKey] : null
              const parts: string[] = ['white-space:nowrap']
              const family = ov?.fontFamily || baseStyle?.fontFamily
              const size = ov?.fontSize || baseStyle?.fontSize
              const weight = ov?.fontWeight || baseStyle?.fontWeight
              const lhPct = ov?.lineHeightPercentFontSize || baseStyle?.lineHeightPercentFontSize
              const ls = ov?.letterSpacing ?? baseStyle?.letterSpacing
              if (family) parts.push(`font-family:${family}`)
              if (size) parts.push(`font-size:${size}px`)
              if (weight) parts.push(`font-weight:${weight}`)
              if (lhPct) parts.push(`line-height:${lhPct}%`)
              if (ls) parts.push(`letter-spacing:${ls}px`)
              // color: override fills 우선
              const ovFills = (ov as Record<string, unknown>)?.fills as Array<{ type: string; visible?: boolean; color?: { r: number; g: number; b: number; a: number } }> | undefined
              const fill = ovFills?.find(f => f.type === 'SOLID' && f.visible !== false) || baseFill
              if (fill?.color) {
                const { r, g, b } = fill.color
                parts.push(`color:rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`)
              }
              return parts.join(';')
            }

            // 줄별 lineTypes
            const lineTypes = textNode?.lineTypes ?? []

            // \n 기준으로 줄 단위 그룹 생성 (줄 번호 추적)
            type LineSeg = { text: string; overrideKey: string }
            const lines: { segs: LineSeg[]; lineIndex: number }[] = [{ segs: [], lineIndex: 0 }]
            let currentLineIndex = 0
            for (const seg of segments) {
              const subLines = seg.text.split('\n')
              for (let si = 0; si < subLines.length; si++) {
                if (si > 0) {
                  currentLineIndex++
                  lines.push({ segs: [], lineIndex: currentLineIndex })
                }
                const text = subLines[si].trim()
                if (text.length > 0) {
                  lines[lines.length - 1].segs.push({ text, overrideKey: seg.overrideKey })
                }
              }
            }
            // 빈 줄 제거
            const nonEmptyLines = lines.filter(l => l.segs.length > 0)

            // 줄별로 태그 생성
            const lineTags = nonEmptyLines.map(line => {
              const lineType = lineTypes[line.lineIndex]
              const isBullet = lineType === 'UNORDERED'

              const textboxes = line.segs.map((seg, segIdx) => {
                const style = buildSegmentStyle(seg)
                let label = seg.text.replace(/"/g, '&quot;')
                // 해당 줄이 UNORDERED면 첫 segment에 불릿
                if (segIdx === 0 && isBullet) label = `• ${label}`
                return `${indentStr}        <w2:textbox style="${style}" label="${label}"></w2:textbox>`
              }).join('\n')

              // 한 줄에 segment 1개면 row 그룹 불필요
              if (line.segs.length === 1) {
                return textboxes.replace(/^ {8}/, '    ')
              }
              return `${indentStr}    <xf:group style="display:flex;flex-direction:row;align-items:baseline;gap:4px;background-color:transparent">\n${textboxes}\n${indentStr}    </xf:group>`
            }).join('\n')

            const groupStyle = mergedProps.style || ''
            // 여러 줄이면 column, 한 줄이면 row
            const direction = nonEmptyLines.length > 1 ? 'column' : 'row'
            const wrapStyle = `display:flex;flex-direction:${direction};align-items:flex-start;background-color:transparent${groupStyle ? ';' + groupStyle : ''}`
            return `${indentStr}<xf:group style="${wrapStyle}">\n${lineTags}\n${indentStr}</xf:group>`
          }
        }

        // 단일 스타일 또는 override 없음 → 기존 로직
        const rawText = textNode?.characters || n.characters || findTextInChildren(n)
        if (rawText) {
          const lines = rawText.split('\n')
          const lineTypes = textNode?.lineTypes ?? []
          const textContent = lines
            .map((line, i) => {
              const trimmed = line.trim()
              if (!trimmed) return ''
              const type = lineTypes[i]
              if (type === 'UNORDERED') return `• ${trimmed}`
              if (type === 'ORDERED') return `${i + 1}. ${trimmed}`
              return trimmed
            })
            .filter(Boolean)
            .join('&lt;br/&gt;')
          mergedProps.label = textContent.replace(/"/g, '&quot;')
          if (textContent.includes('&lt;br/&gt;')) {
            mergedProps.escape = 'false'
          }
        }
      }

      // 커스텀 속성으로 label을 지정했는지 여부 (지정 시 Figma 텍스트보다 우선 = 덮어쓰기)
      const customLabel = nodeMapping?.customAttrs && 'label' in nodeMapping.customAttrs
        ? nodeMapping.customAttrs.label
        : undefined

      // 컴포넌트별 속성 처리
      if (regItemNameLower === 'button' || regItemNameLower === 'span') {
        // 커스텀 label이 있으면 그것을 사용(이미 mergedProps.label에 병합됨), 없으면 Figma 텍스트 사용
        if (customLabel === undefined) {
          const text = n.characters || findTextInChildren(n)
          if (text) mergedProps.label = text
        }
      }
      if (regItemNameLower === 'trigger') {
        // 커스텀 label은 attribute가 아니라 <xf:label> 내용으로 사용
        const text = customLabel !== undefined ? customLabel : (n.characters || findTextInChildren(n))
        const { label: _omitLabel, ...triggerProps } = mergedProps
        const propsStr = Object.entries(triggerProps).map(([k, v]) => `${k}="${v}"`).join(' ')
        const labelTag = text
          ? `\n${indentStr}    <xf:label><![CDATA[${text}]]></xf:label>\n${indentStr}`
          : ''
        return `${indentStr}<${tagName} ${propsStr}>${labelTag}</${tagName}>`
      }
      if (regItemNameLower === 'anchor') {
        const text = customLabel !== undefined ? customLabel : (n.characters || findTextInChildren(n))
        const { label: _omitLabel, ...anchorProps } = mergedProps
        const anchorPropsStr = Object.entries(anchorProps).map(([k, v]) => `${k}="${v}"`).join(' ')
        // &#x...; → 실제 유니코드 문자로 역변환 (CDATA 안에서는 엔티티 미해석)
        const cdataText = text?.replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16))) || ''
        const labelTag = cdataText
          ? `\n${indentStr}    <xf:label><![CDATA[${cdataText}]]></xf:label>\n${indentStr}`
          : ''
        return `${indentStr}<${tagName} ${anchorPropsStr}>${labelTag}</${tagName}>`
      }
      if (regItemNameLower === 'input') {
        const text = n.characters || findTextInChildren(n)
        if (text) mergedProps.placeholder = text
      }

      // image 특수 처리 - SVG를 base64로 src에 지정
      if (regItemNameLower === 'image') {
        const svgContent = imageSvgMap.get(n.id)
        if (svgContent) {
          const svgBase64 = btoa(unescape(encodeURIComponent(svgContent.replace(/[\r\n]/g, '')))).replace(/[\r\n]/g, '')
          mergedProps.src = `data:image/svg+xml;base64,${svgBase64}`
        } else {
          mergedProps.src = ''
        }
      }

      // select / multiselect 특수 처리
      if (regItemNameLower === 'select' || regItemNameLower === 'multiselect') {
        const texts = collectAllTexts(n)
        const propsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
        const items = texts.length > 0 ? texts : ['new row']
        const itemsCode = items.map(t =>
`${indentStr}        <xf:item>
${indentStr}            <xf:label><![CDATA[${t}]]></xf:label>
${indentStr}            <xf:value></xf:value>
${indentStr}        </xf:item>`
        ).join('\n')

        return `${indentStr}<${tagName} ${propsStr}>
${indentStr}    <xf:choices>
${itemsCode}
${indentStr}    </xf:choices>
${indentStr}</${tagName}>`
      }

      // checkbox 특수 처리
      if (regItemNameLower === 'checkbox') {
        const texts = collectAllTexts(n)
        const propsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
        const items = texts.length > 0 ? texts : ['옵션1']
        const itemsCode = items.map(t =>
`${indentStr}        <xf:item>
${indentStr}            <xf:label><![CDATA[${t}]]></xf:label>
${indentStr}            <xf:value><![CDATA[${t}]]></xf:value>
${indentStr}        </xf:item>`
        ).join('\n')

        return `${indentStr}<${tagName} ${propsStr}>
${indentStr}    <xf:choices>
${itemsCode}
${indentStr}    </xf:choices>
${indentStr}</${tagName}>`
      }

      // radio 특수 처리
      if (regItemNameLower === 'radio') {
        const texts = collectAllTexts(n)
        const propsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
        const items = texts.length > 0 ? texts : ['옵션1']
        const itemsCode = items.map(t =>
`${indentStr}        <xf:item>
${indentStr}            <xf:label><![CDATA[${t}]]></xf:label>
${indentStr}            <xf:value><![CDATA[${t}]]></xf:value>
${indentStr}        </xf:item>`
        ).join('\n')

        return `${indentStr}<${tagName} ${propsStr}>
${indentStr}    <xf:choices>
${itemsCode}
${indentStr}    </xf:choices>
${indentStr}</${tagName}>`
      }

      // 자손 중 특정 컴포넌트로 매핑된 노드 수집 (찾으면 그 하위로는 더 안 들어감)
      // tabControl/accordion 등 복합 컴포넌트 조립용
      const collectMapped = (node: FigmaNode, name: string, acc: FigmaNode[]) => {
        for (const c of node.children ?? []) {
          const m = mappingMap.get(c.id)
          const reg = m?.registryId ? registry.find(r => r.id === m.registryId) : null
          if (reg?.name.toLowerCase() === name) acc.push(c)
          else collectMapped(c, name, acc)
        }
      }

      // 역할 컴포넌트 속성 문자열: 기본값 위에 해당 노드 매핑의 customAttrs를 덮어씀
      const roleAttrs = (base: Record<string, string>, node?: FigmaNode | null): string => {
        const custom = node ? (mappingMap.get(node.id)?.customAttrs ?? {}) : {}
        return Object.entries({ ...base, ...custom }).map(([k, v]) => `${k}="${v}"`).join(' ')
      }

      // tabControl 특수 처리 - 매핑 기반 조립 (위젯 방식)
      // 자손 중 'tabs'로 매핑된 노드 → w2:tabs, 'tabcontent'로 매핑된 노드 → w2:content
      // w2:content는 항상 탭 수만큼 생성: 매핑된 tabcontent는 자식 변환 삽입, 부족분은 빈 태그
      if (regItemNameLower === 'tabcontrol') {
        const tabNodes: FigmaNode[] = []
        collectMapped(n, 'tabs', tabNodes)

        if (tabNodes.length > 0) {
          const contentNodes: FigmaNode[] = []
          collectMapped(n, 'tabcontent', contentNodes)

          // 탭 버튼 높이: 첫 tabs 노드 기준
          const tabH = Math.round(tabNodes[0].absoluteBoundingBox?.height ?? 40)

          const tabsCode = tabNodes.map(t => {
            tabIdSeq += 1
            const label = (t.characters || findTextInChildren(t) || `탭${tabIdSeq}`).trim()
            const attrs = roleAttrs({ disabled: 'false', style: `height:${tabH}px;`, id: `tabs${tabIdSeq}`, label }, t)
            return `${indentStr}    <w2:tabs ${attrs}></w2:tabs>`
          }).join('\n')

          const contentsCode = tabNodes.map((_, i) => {
            contentIdSeq += 1
            const src = contentNodes[i]
            const inner = includeChildren && src
              ? (src.children ?? []).map(c => traverse(c, depth + 2, src)).filter(Boolean).join('\n')
              : ''
            const innerWrapped = inner ? `\n${inner}\n${indentStr}    ` : ''
            const attrs = roleAttrs({ style: '', id: `content${contentIdSeq}` }, src)
            return `${indentStr}    <w2:content ${attrs}>${innerWrapped}</w2:content>`
          }).join('\n')

          const tabPropsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
          return `${indentStr}<${tagName}${tabPropsStr ? ' ' + tabPropsStr : ''}>\n${tabsCode}\n${contentsCode}\n${indentStr}</${tagName}>`
        }
        // tabs로 매핑된 자손이 없으면 일반 변환으로 진행
      }

      // accordion 특수 처리 - 매핑 기반 조립 (위젯 방식)
      // 자손 중 'panels' 매핑 노드 → w2:panels, 각 패널 내 'paneltitle' 매핑 → 타이틀 라벨,
      // 'panelcontent' 매핑 → 자식 변환 삽입 (없으면 빈 panelContent)
      if (regItemNameLower === 'accordion') {
        const panelNodes: FigmaNode[] = []
        collectMapped(n, 'panels', panelNodes)

        if (panelNodes.length > 0) {
          const panelsCode = panelNodes.map(p => {
            accordionPanelSeq += 1
            const seq = accordionPanelSeq

            const titleNodes: FigmaNode[] = []
            collectMapped(p, 'paneltitle', titleNodes)
            const contentNodes: FigmaNode[] = []
            collectMapped(p, 'panelcontent', contentNodes)

            const titleNode = titleNodes[0]
            const contentNode = contentNodes[0]
            // 라벨: paneltitle 매핑의 텍스트 → 없으면 패널 내 첫 텍스트 → 최후엔 AccordionN
            const label = ((titleNode && (titleNode.characters || findTextInChildren(titleNode)))
              || findTextInChildren(p) || `Accordion${seq}`).trim()
            const inner = includeChildren && contentNode
              ? (contentNode.children ?? []).map(c => traverse(c, depth + 3, contentNode)).filter(Boolean).join('\n')
              : ''
            const contentInner = inner ? `\n${inner}\n${indentStr}        ` : ''
            const panelAttrs = roleAttrs({ style: '', id: `panels${seq}`, class: '' }, p)
            const titleAttrs = roleAttrs({ style: '', id: `panelTitle${seq}`, label }, titleNode)
            const contentAttrs = roleAttrs({ style: '', id: `panelContent${seq}` }, contentNode)
            return `${indentStr}    <w2:panels ${panelAttrs}>
${indentStr}        <w2:panelTitle ${titleAttrs}></w2:panelTitle>
${indentStr}        <w2:panelContent ${contentAttrs}>${contentInner}</w2:panelContent>
${indentStr}    </w2:panels>`
          }).join('\n')

          const accPropsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
          return `${indentStr}<${tagName}${accPropsStr ? ' ' + accPropsStr : ''}>\n${panelsCode}\n${indentStr}</${tagName}>`
        }
        // panels로 매핑된 자손이 없으면 일반 변환으로 진행
      }

      // table 특수 처리
      if (regItemNameLower === 'table') {
        const tablePropsStr = Object.entries(mergedProps)
          .filter(([k]) => k !== 'tagname') // tagname은 제외
          .map(([k, v]) => `${k}="${v}"`).join(' ')
        const innerContent = childrenCode ? `\n${childrenCode}\n${indentStr}` : ''

        // th/td 최대 개수로 col 생성
        const maxCols = countMaxColumnsInTable(n, mappingMap, registry)
        const colWidth = maxCols > 0 ? (100 / maxCols).toFixed(2) : '100.00'
        const colsCode = maxCols > 0
          ? '\n' + Array(maxCols).fill(0).map(() =>
              `${indentStr}        <xf:group tagname="col" style="width:${colWidth}%"></xf:group>`
            ).join('\n') + '\n' + indentStr + '    '
          : ''

        return `${indentStr}<xf:group tagname="table" ${tablePropsStr}>
${indentStr}    <w2:attributes>
${indentStr}        <w2:summary></w2:summary>
${indentStr}    </w2:attributes>
${indentStr}    <xf:group tagname="colgroup">${colsCode}</xf:group>${innerContent}
${indentStr}</xf:group>`
      }

      // gridView 특수 처리
      if (regItemNameLower === 'gridview') {
        const topTexts = collectTopLevelTexts(n)
        const gridPropsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')

        // header columns 생성
        const headerCols = topTexts.length > 0
          ? topTexts.map((text, idx) => `${indentStr}            <w2:column id="column${idx}" width="70" displayMode="label" value="${text}"></w2:column>`).join('\n')
          : `${indentStr}            <w2:column id="column0" width="70" displayMode="label" value="컬럼1"></w2:column>
${indentStr}            <w2:column id="column1" width="70" displayMode="label" value="컬럼2"></w2:column>
${indentStr}            <w2:column id="column2" width="70" displayMode="label" value="컬럼3"></w2:column>`

        // gBody columns 생성
        const bodyCols = topTexts.length > 0
          ? topTexts.map((_, idx) => `${indentStr}            <w2:column id="gBodyColumn${idx}" width="70" inputType="text"></w2:column>`).join('\n')
          : `${indentStr}            <w2:column id="gBodyColumn0" width="70" inputType="text"></w2:column>
${indentStr}            <w2:column id="gBodyColumn1" width="70" inputType="text"></w2:column>
${indentStr}            <w2:column id="gBodyColumn2" width="70" inputType="text"></w2:column>`

        return `${indentStr}<w2:gridView ${gridPropsStr}>
${indentStr}    <w2:caption id="caption1" style="" value="this is a grid caption."></w2:caption>
${indentStr}    <w2:header id="" style="">
${indentStr}        <w2:row>
${headerCols}
${indentStr}        </w2:row>
${indentStr}    </w2:header>
${indentStr}    <w2:gBody id="" style="">
${indentStr}        <w2:row>
${bodyCols}
${indentStr}        </w2:row>
${indentStr}    </w2:gBody>
${indentStr}</w2:gridView>`
      }

      // tr 특수 처리
      if (regItemNameLower === 'tr') {
        // tagname 제외한 나머지 속성 적용
        const trProps = { ...mergedProps }
        delete trProps.tagname
        const trPropsStr = Object.keys(trProps).length > 0
          ? ' ' + Object.entries(trProps).map(([k, v]) => `${k}="${v}"`).join(' ')
          : ''
        if (childrenCode) {
          return `${indentStr}<xf:group tagname="tr"${trPropsStr}>\n${childrenCode}\n${indentStr}</xf:group>`
        }
        return `${indentStr}<xf:group tagname="tr"${trPropsStr}></xf:group>`
      }

      // th 특수 처리
      if (regItemNameLower === 'th') {
        const { tagname: _thTag, colspan, rowspan, ...thProps } = mergedProps as Record<string, string>
        const thPropsStr = Object.entries(thProps).map(([k, v]) => `${k}="${v}"`).join(' ')
        const hasSpan = (colspan && colspan !== '1') || (rowspan && rowspan !== '1')
        const spanAttrs = hasSpan
          ? [
              `${indentStr}        <w2:scope>row</w2:scope>`,
              `${indentStr}        <w2:colspan>${colspan || '1'}</w2:colspan>`,
              `${indentStr}        <w2:rowspan>${rowspan || '1'}</w2:rowspan>`
            ]
          : [`${indentStr}        <w2:scope>row</w2:scope>`]
        const innerContent = childrenCode ? `\n${childrenCode}\n${indentStr}` : ''
        return `${indentStr}<xf:group tagname="th" ${thPropsStr}>
${indentStr}    <w2:attributes>
${spanAttrs.join('\n')}
${indentStr}    </w2:attributes>${innerContent}</xf:group>`
      }

      // td 특수 처리
      if (regItemNameLower === 'td') {
        const { tagname: _tdTag, colspan, rowspan, ...tdProps } = mergedProps as Record<string, string>
        const tdPropsStr = Object.entries(tdProps).map(([k, v]) => `${k}="${v}"`).join(' ')
        const hasSpan = (colspan && colspan !== '1') || (rowspan && rowspan !== '1')
        const attrsBlock = hasSpan
          ? `\n${indentStr}    <w2:attributes>
${indentStr}        <w2:scope>row</w2:scope>
${indentStr}        <w2:colspan>${colspan || '1'}</w2:colspan>
${indentStr}        <w2:rowspan>${rowspan || '1'}</w2:rowspan>
${indentStr}    </w2:attributes>`
          : ''
        const innerContent = childrenCode ? `\n${childrenCode}\n${indentStr}` : ''
        return `${indentStr}<xf:group tagname="td" ${tdPropsStr}>${attrsBlock}${innerContent}</xf:group>`
      }

      // widgetContainer: 하위 widgetItem 스캔 → addWidgets JS 코드 생성
      if (regItemNameLower === 'widget') {
        // cols: width 값으로 설정
        if (n.absoluteBoundingBox) {
          mergedProps.cols = String(Math.round(n.absoluteBoundingBox.width))
        }
        const widgetContainerId = mergedProps.id || n.name.replace(/[^a-zA-Z0-9_]/g, '_')
        const widgetDefs: Array<{ id: string; title: string; src: string; x: number; y: number; unitWidth: number; unitHeight: number }> = []

        for (const child of n.children || []) {
          const childMapping = mappingMap.get(child.id)
          const childReg = childMapping?.registryId ? registry.find(r => r.id === childMapping.registryId) : null
          if (childReg?.name.toLowerCase() !== 'widgetitem') continue

          let title = ''
          let contentId = ''
          let titleHeight = 0
          const childBB = child.absoluteBoundingBox
          const parentBB = n.absoluteBoundingBox

          for (const gc of child.children || []) {
            const gcMapping = mappingMap.get(gc.id)
            const gcReg = gcMapping?.registryId ? registry.find(r => r.id === gcMapping.registryId) : null
            if (!gcReg) continue
            const gcName = gcReg.name.toLowerCase()
            if (gcName === 'widgettitle') {
              // widgetTitle 높이 기록
              titleHeight = gc.absoluteBoundingBox?.height || 0
              if (titleHeight > widgetTitleHeight) widgetTitleHeight = Math.round(titleHeight)
              // textbox로 매핑된 하위 노드의 텍스트만 추출
              const findTextboxText = (node: FigmaNode): string => {
                const m = mappingMap.get(node.id)
                const r = m?.registryId ? registry.find(reg => reg.id === m.registryId) : null
                if (r?.name.toLowerCase() === 'textbox') {
                  return node.characters || ''
                }
                for (const c of node.children ?? []) {
                  const t = findTextboxText(c)
                  if (t) return t
                }
                return ''
              }
              title = findTextboxText(gc) || gc.name
            }
            if (gcName === 'widgetcontent') {
              contentId = gcMapping?.customAttrs?.id || gc.name.replace(/[^a-zA-Z0-9_]/g, '_')
            }
          }

          if (!contentId) contentId = child.name.replace(/[^a-zA-Z0-9_]/g, '_')
          if (!title) title = child.name

          widgetDefs.push({
            id: contentId, title,
            src: `widgets/${contentId}.xml`,
            x: childBB && parentBB ? Math.round(childBB.x - parentBB.x) : 0,
            y: childBB && parentBB ? Math.round(childBB.y - parentBB.y) : 0,
            unitWidth: childBB ? Math.round(childBB.width) : 240,
            unitHeight: childBB ? Math.round(childBB.height) : 400,
          })
        }

        const wcPropsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')

        if (widgetDefs.length > 0) {
          const defsJson = widgetDefs.map(d =>
            `        {id:"${d.id}", title:"${d.title}", src:"${d.src}", x:${d.x}, y:${d.y}, unitWidth:${d.unitWidth}, unitHeight:${d.unitHeight}}`
          ).join(',\n')

          widgetInitScripts.push(
`    // --- ${widgetContainerId} 위젯 초기화 ---
    const ${widgetContainerId}_items = [
${defsJson}
    ];
    for (let i = 0; i < ${widgetContainerId}_items.length; i++) {
        const opts = ${widgetContainerId}_items[i];
        opts.scope = true;
        opts.buttonFormatter = {"id": "btnMore", "className": "w2widget_btnMore", "isCustom": true, "title": "더보기", "ariaLabel": "더보기"};
        ${widgetContainerId}.addWidgets(opts);
    }`)
        }

        return `${indentStr}<${tagName} ${wcPropsStr}></${tagName}>`
      }

      // widgetItem / widgetTitle / widgetContent: 가상 컴포넌트 — XML 출력 안 함
      if (['widgetitem', 'widgettitle', 'widgetcontent'].includes(regItemNameLower)) {
        return ''
      }

      // tabs/tabcontent는 tabControl, panels/paneltitle/panelcontent는 accordion 조립에서
      // 소비되므로 단독 출력하지 않음
      if (['tabs', 'tabcontent', 'panels', 'paneltitle', 'panelcontent'].includes(regItemNameLower)) {
        return ''
      }

      const propsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')

      // 자식 코드가 있으면 중첩 구조로
      if (childrenCode) {
        return propsStr
          ? `${indentStr}<${tagName} ${propsStr}>\n${childrenCode}\n${indentStr}</${tagName}>`
          : `${indentStr}<${tagName}>\n${childrenCode}\n${indentStr}</${tagName}>`
      } else {
        return propsStr
          ? `${indentStr}<${tagName} ${propsStr}></${tagName}>`
          : `${indentStr}<${tagName}/>`
      }
    }

    // 매핑되지 않은 노드는 자식 코드만 반환
    return childrenCode
  }

  return {
    traverse,
    widgetInitScripts,
    getWidgetTitleHeight: () => widgetTitleHeight,
  }
}
