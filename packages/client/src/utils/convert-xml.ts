// ============================================================
// XML 변환 로직 (공유 유틸)
// ConvertedCodeEditor와 Spec에서 공용 사용
// ============================================================

import type { FigmaNode } from '../types/figma'
import type { RegistryItem, NodeMapping } from './api'
import { extractInlineStyle } from './figma-style'
import { findTextInChildren, collectAllTexts, collectTopLevelTexts } from './text-utils'

// table 내 최대 컬럼 수 계산
function countMaxColumnsInTable(
  node: FigmaNode,
  mappingMap: Map<string, NodeMapping>,
  registry: RegistryItem[]
): number {
  let maxCols = 0
  for (const child of node.children || []) {
    const childMapping = mappingMap.get(child.id)
    const childReg = childMapping?.registryId ? registry.find(r => r.id === childMapping.registryId) : null
    if (childReg?.name.toLowerCase() === 'tr') {
      let cols = 0
      for (const gc of child.children || []) {
        const gcMapping = mappingMap.get(gc.id)
        const gcReg = gcMapping?.registryId ? registry.find(r => r.id === gcMapping.registryId) : null
        if (gcReg && ['th', 'td'].includes(gcReg.name.toLowerCase())) {
          const colspan = parseInt(gcMapping?.customAttrs?.colspan || '1', 10)
          cols += colspan
        }
      }
      if (cols > maxCols) maxCols = cols
    }
  }
  return maxCols
}

export interface ConvertOptions {
  rootNode: FigmaNode
  mappings: NodeMapping[]
  registry: RegistryItem[]
  imageSvgMap?: Map<string, string>
  autoCssEnabled?: boolean
}

export function convertToXml(options: ConvertOptions): string {
  const { rootNode, mappings, registry, imageSvgMap = new Map() } = options
  const mappingMap = new Map(mappings.map(m => [m.figmaNodeId, m]))

  // 위젯 초기화 스크립트 수집 (여러 widgetContainer 대응)
  const widgetInitScripts: string[] = []

  const traverse = (n: FigmaNode, depth: number, parent?: FigmaNode): string => {
    if (n.visible === false) return ''

    const indentStr = '    '.repeat(depth)
    const nodeMapping = mappingMap.get(n.id)
    const regItem = nodeMapping?.registryId
      ? registry.find(r => r.id === nodeMapping.registryId)
      : null

    const childrenCode = n.children
      ? n.children.map(child => traverse(child, depth + 1, n)).filter(Boolean).join('\n')
      : ''

    if (regItem) {
      const { tagName, properties } = regItem
      const mergedProps: Record<string, string> = { ...properties, 'data-nodeid': n.id }
      const regItemNameLower = regItem.name.toLowerCase()

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

      if (!nodeMapping?.customAttrs?.id) {
        delete mergedProps.id
      }

      const hasCustomStyleKey = nodeMapping?.customAttrs && 'style' in nodeMapping.customAttrs
      if (!hasCustomStyleKey && (!mergedProps.class || ['table', 'gridview'].includes(regItemNameLower))) {
        const inlineStyle = extractInlineStyle(n, regItemNameLower, parent)
        if (inlineStyle) {
          const existingStyle = mergedProps.style ? `${mergedProps.style};` : ''
          mergedProps.style = `${existingStyle}${inlineStyle}`
        }
      }

      // textbox
      if (regItemNameLower === 'textbox') {
        const textNode = n.type === 'TEXT' ? n : (function findText(node: FigmaNode): FigmaNode | null {
          if (node.type === 'TEXT') return node
          for (const c of node.children ?? []) { const f = findText(c); if (f) return f }
          return null
        })(n)

        const overrides = textNode?.characterStyleOverrides
        const overrideTable = textNode?.styleOverrideTable
        const chars = textNode?.characters || n.characters || ''
        if (overrides && overrideTable && overrides.length === chars.length) {
          const segments: { text: string; overrideKey: string }[] = []
          let currentKey = String(overrides[0] ?? 0)
          let currentText = chars[0] || ''
          for (let i = 1; i < overrides.length; i++) {
            const key = String(overrides[i] ?? 0)
            if (key === currentKey) { currentText += chars[i] }
            else { segments.push({ text: currentText, overrideKey: currentKey }); currentKey = key; currentText = chars[i] }
          }
          if (currentText) segments.push({ text: currentText, overrideKey: currentKey })

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
              const ovFills = (ov as Record<string, unknown>)?.fills as Array<{ type: string; visible?: boolean; color?: { r: number; g: number; b: number; a: number } }> | undefined
              const fill = ovFills?.find(f => f.type === 'SOLID' && f.visible !== false) || baseFill
              if (fill?.color) {
                const { r, g, b } = fill.color
                parts.push(`color:rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`)
              }
              return parts.join(';')
            }

            const lineTypes = textNode?.lineTypes ?? []
            type LineSeg = { text: string; overrideKey: string }
            const lines: { segs: LineSeg[]; lineIndex: number }[] = [{ segs: [], lineIndex: 0 }]
            let currentLineIndex = 0
            for (const seg of segments) {
              const subLines = seg.text.split('\n')
              for (let si = 0; si < subLines.length; si++) {
                if (si > 0) { currentLineIndex++; lines.push({ segs: [], lineIndex: currentLineIndex }) }
                const text = subLines[si].trim()
                if (text.length > 0) lines[lines.length - 1].segs.push({ text, overrideKey: seg.overrideKey })
              }
            }
            const nonEmptyLines = lines.filter(l => l.segs.length > 0)
            const lineTags = nonEmptyLines.map(line => {
              const lineType = lineTypes[line.lineIndex]
              const isBullet = lineType === 'UNORDERED'
              const textboxes = line.segs.map((seg, segIdx) => {
                const style = buildSegmentStyle(seg)
                let label = seg.text.replace(/"/g, '&quot;')
                if (segIdx === 0 && isBullet) label = `• ${label}`
                return `${indentStr}        <w2:textbox style="${style}" label="${label}"></w2:textbox>`
              }).join('\n')
              if (line.segs.length === 1) return textboxes.replace(/^ {8}/, '    ')
              return `${indentStr}    <xf:group style="display:flex;flex-direction:row;align-items:baseline;gap:4px;background-color:transparent">\n${textboxes}\n${indentStr}    </xf:group>`
            }).join('\n')

            const groupStyle = mergedProps.style || ''
            const direction = nonEmptyLines.length > 1 ? 'column' : 'row'
            const wrapStyle = `display:flex;flex-direction:${direction};align-items:flex-start;background-color:transparent${groupStyle ? ';' + groupStyle : ''}`
            return `${indentStr}<xf:group style="${wrapStyle}">\n${lineTags}\n${indentStr}</xf:group>`
          }
        }

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
          if (textContent.includes('&lt;br/&gt;')) mergedProps.escape = 'false'
        }
      }

      if (regItemNameLower === 'button' || regItemNameLower === 'span') {
        const text = n.characters || findTextInChildren(n)
        if (text) mergedProps.label = text
      }
      if (regItemNameLower === 'trigger') {
        const text = n.characters || findTextInChildren(n)
        const propsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
        const labelTag = text ? `\n${indentStr}    <xf:label><![CDATA[${text}]]></xf:label>\n${indentStr}` : ''
        return `${indentStr}<${tagName} ${propsStr}>${labelTag}</${tagName}>`
      }
      if (regItemNameLower === 'anchor') {
        const text = n.characters || findTextInChildren(n)
        const anchorPropsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
        const cdataText = text?.replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16))) || ''
        const labelTag = cdataText ? `\n${indentStr}    <xf:label><![CDATA[${cdataText}]]></xf:label>\n${indentStr}` : ''
        return `${indentStr}<${tagName} ${anchorPropsStr}>${labelTag}</${tagName}>`
      }
      if (regItemNameLower === 'input') {
        const text = n.characters || findTextInChildren(n)
        if (text) mergedProps.placeholder = text
      }
      if (regItemNameLower === 'image') {
        const svgContent = imageSvgMap.get(n.id)
        if (svgContent) {
          const svgBase64 = btoa(unescape(encodeURIComponent(svgContent.replace(/[\r\n]/g, '')))).replace(/[\r\n]/g, '')
          mergedProps.src = `data:image/svg+xml;base64,${svgBase64}`
        } else {
          mergedProps.src = ''
        }
      }
      if (regItemNameLower === 'select' || regItemNameLower === 'multiselect') {
        const texts = collectAllTexts(n)
        const propsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
        const items = texts.length > 0 ? texts : ['new row']
        const itemsCode = items.map(t => `${indentStr}        <xf:item>\n${indentStr}            <xf:label><![CDATA[${t}]]></xf:label>\n${indentStr}            <xf:value></xf:value>\n${indentStr}        </xf:item>`).join('\n')
        return `${indentStr}<${tagName} ${propsStr}>\n${indentStr}    <xf:choices>\n${itemsCode}\n${indentStr}    </xf:choices>\n${indentStr}</${tagName}>`
      }
      if (regItemNameLower === 'checkbox' || regItemNameLower === 'radio') {
        const texts = collectAllTexts(n)
        const propsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
        const items = texts.length > 0 ? texts : ['옵션1']
        const itemsCode = items.map(t => `${indentStr}        <xf:item>\n${indentStr}            <xf:label><![CDATA[${t}]]></xf:label>\n${indentStr}            <xf:value><![CDATA[${t}]]></xf:value>\n${indentStr}        </xf:item>`).join('\n')
        return `${indentStr}<${tagName} ${propsStr}>\n${indentStr}    <xf:choices>\n${itemsCode}\n${indentStr}    </xf:choices>\n${indentStr}</${tagName}>`
      }
      if (regItemNameLower === 'table') {
        const tablePropsStr = Object.entries(mergedProps).filter(([k]) => k !== 'tagname').map(([k, v]) => `${k}="${v}"`).join(' ')
        const innerContent = childrenCode ? `\n${childrenCode}\n${indentStr}` : ''
        const maxCols = countMaxColumnsInTable(n, mappingMap, registry)
        const colWidth = maxCols > 0 ? (100 / maxCols).toFixed(2) : '100.00'
        const colsCode = maxCols > 0 ? '\n' + Array(maxCols).fill(0).map(() => `${indentStr}        <xf:group tagname="col" style="width:${colWidth}%"></xf:group>`).join('\n') + '\n' + indentStr + '    ' : ''
        return `${indentStr}<xf:group tagname="table" ${tablePropsStr}>\n${indentStr}    <w2:attributes>\n${indentStr}        <w2:summary></w2:summary>\n${indentStr}    </w2:attributes>\n${indentStr}    <xf:group tagname="colgroup">${colsCode}</xf:group>${innerContent}\n${indentStr}</xf:group>`
      }
      if (regItemNameLower === 'gridview') {
        const topTexts = collectTopLevelTexts(n)
        const gridPropsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
        const headerCols = topTexts.length > 0
          ? topTexts.map((text, idx) => `${indentStr}            <w2:column id="column${idx}" width="70" displayMode="label" value="${text}"></w2:column>`).join('\n')
          : `${indentStr}            <w2:column id="column0" width="70" displayMode="label" value="컬럼1"></w2:column>`
        const bodyCols = topTexts.length > 0
          ? topTexts.map((_, idx) => `${indentStr}            <w2:column id="gBodyColumn${idx}" width="70" inputType="text"></w2:column>`).join('\n')
          : `${indentStr}            <w2:column id="gBodyColumn0" width="70" inputType="text"></w2:column>`
        return `${indentStr}<w2:gridView ${gridPropsStr}>\n${indentStr}    <w2:caption id="caption1" style="" value="this is a grid caption."></w2:caption>\n${indentStr}    <w2:header id="" style="">\n${indentStr}        <w2:row>\n${headerCols}\n${indentStr}        </w2:row>\n${indentStr}    </w2:header>\n${indentStr}    <w2:gBody id="" style="">\n${indentStr}        <w2:row>\n${bodyCols}\n${indentStr}        </w2:row>\n${indentStr}    </w2:gBody>\n${indentStr}</w2:gridView>`
      }
      if (regItemNameLower === 'tr') {
        const trProps = { ...mergedProps }; delete trProps.tagname
        const trPropsStr = Object.keys(trProps).length > 0 ? ' ' + Object.entries(trProps).map(([k, v]) => `${k}="${v}"`).join(' ') : ''
        return childrenCode ? `${indentStr}<xf:group tagname="tr"${trPropsStr}>\n${childrenCode}\n${indentStr}</xf:group>` : `${indentStr}<xf:group tagname="tr"${trPropsStr}></xf:group>`
      }
      if (regItemNameLower === 'th') {
        const { tagname: _thTag, colspan, rowspan, ...thProps } = mergedProps as Record<string, string>
        const thPropsStr = Object.entries(thProps).map(([k, v]) => `${k}="${v}"`).join(' ')
        const spanAttrs = [(colspan && colspan !== '1') || (rowspan && rowspan !== '1')
          ? `${indentStr}        <w2:scope>row</w2:scope>\n${indentStr}        <w2:colspan>${colspan || '1'}</w2:colspan>\n${indentStr}        <w2:rowspan>${rowspan || '1'}</w2:rowspan>`
          : `${indentStr}        <w2:scope>row</w2:scope>`]
        const innerContent = childrenCode ? `\n${childrenCode}\n${indentStr}` : ''
        return `${indentStr}<xf:group tagname="th" ${thPropsStr}>\n${indentStr}    <w2:attributes>\n${spanAttrs.join('\n')}\n${indentStr}    </w2:attributes>${innerContent}</xf:group>`
      }
      if (regItemNameLower === 'td') {
        const { tagname: _tdTag, colspan, rowspan, ...tdProps } = mergedProps as Record<string, string>
        const tdPropsStr = Object.entries(tdProps).map(([k, v]) => `${k}="${v}"`).join(' ')
        const hasSpan = (colspan && colspan !== '1') || (rowspan && rowspan !== '1')
        const attrsBlock = hasSpan ? `\n${indentStr}    <w2:attributes>\n${indentStr}        <w2:scope>row</w2:scope>\n${indentStr}        <w2:colspan>${colspan || '1'}</w2:colspan>\n${indentStr}        <w2:rowspan>${rowspan || '1'}</w2:rowspan>\n${indentStr}    </w2:attributes>` : ''
        const innerContent = childrenCode ? `\n${childrenCode}\n${indentStr}` : ''
        return `${indentStr}<xf:group tagname="td" ${tdPropsStr}>${attrsBlock}${innerContent}</xf:group>`
      }

      // widgetContainer: 하위 widgetItem 들을 스캔하여 addWidgets JS 코드 생성
      if (regItemNameLower === 'widget') {
        const widgetContainerId = mergedProps.id || n.name.replace(/[^a-zA-Z0-9_]/g, '_')
        const widgetDefs: Array<{ id: string; title: string; src: string; x: number; y: number; unitWidth: number; unitHeight: number }> = []

        // 하위 widgetItem 탐색
        for (const child of n.children || []) {
          const childMapping = mappingMap.get(child.id)
          const childReg = childMapping?.registryId ? registry.find(r => r.id === childMapping.registryId) : null
          if (childReg?.name.toLowerCase() !== 'widgetitem') continue

          let title = ''
          let contentId = ''
          const childBB = child.absoluteBoundingBox
          const parentBB = n.absoluteBoundingBox

          for (const grandChild of child.children || []) {
            const gcMapping = mappingMap.get(grandChild.id)
            const gcReg = gcMapping?.registryId ? registry.find(r => r.id === gcMapping.registryId) : null
            if (!gcReg) continue
            const gcName = gcReg.name.toLowerCase()

            if (gcName === 'widgettitle') {
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
              title = findTextboxText(grandChild) || grandChild.name
            }
            if (gcName === 'widgetcontent') {
              contentId = gcMapping?.customAttrs?.id || grandChild.name.replace(/[^a-zA-Z0-9_]/g, '_')
            }
          }

          if (!contentId) contentId = child.name.replace(/[^a-zA-Z0-9_]/g, '_')
          if (!title) title = child.name

          widgetDefs.push({
            id: contentId,
            title,
            src: `widgets/${contentId}.xml`,
            x: childBB && parentBB ? Math.round(childBB.x - parentBB.x) : 0,
            y: childBB && parentBB ? Math.round(childBB.y - parentBB.y) : 0,
            unitWidth: childBB ? Math.round(childBB.width) : 240,
            unitHeight: childBB ? Math.round(childBB.height) : 400,
          })
        }

        // widgetContainer XML + JS 코드 수집 (onpageload에 삽입)
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

      // widgetItem / widgetTitle / widgetContent: 가상 컴포넌트 — XML 출력 안 함 (widget 변환에서 데이터로만 사용)
      if (['widgetitem', 'widgettitle', 'widgetcontent'].includes(regItemNameLower)) {
        return ''
      }

      const propsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
      if (childrenCode) {
        return propsStr ? `${indentStr}<${tagName} ${propsStr}>\n${childrenCode}\n${indentStr}</${tagName}>` : `${indentStr}<${tagName}>\n${childrenCode}\n${indentStr}</${tagName}>`
      } else {
        return propsStr ? `${indentStr}<${tagName} ${propsStr}></${tagName}>` : `${indentStr}<${tagName}/>`
      }
    }

    return childrenCode
  }

  const rawCode = traverse(rootNode, 0) || ''
  const innerCode = rawCode.split('\n').map(line => line ? '            ' + line : '').join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:w2="http://www.inswave.com/websquare"
    xmlns:xf="http://www.w3.org/2002/xforms">
    <head>
        <w2:type>COMPONENT</w2:type>
        <w2:buildDate />
        <w2:MSA />
        <xf:model>
            <w2:dataCollection baseNode="map" />
            <w2:workflowCollection />
        </xf:model>
        <w2:mfeSubmission />
        <w2:layoutInfo />
        <w2:publicInfo method="" />
        <script lazy="false" type="text/javascript"><![CDATA[
scwin.onpageload = function() {
${widgetInitScripts.length > 0 ? widgetInitScripts.join('\n\n') + '\n' : ''}};
]]></script>
    </head>
    <body ev:onpageload="scwin.onpageload">
${innerCode}
    </body>
</html>`
}
