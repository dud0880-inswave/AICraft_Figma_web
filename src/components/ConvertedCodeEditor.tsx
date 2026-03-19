import { useState, useEffect, useRef, useCallback } from 'react'
import type { FigmaNode } from '../types/figma'
import { findTextInChildren, collectAllTexts, collectTopLevelTexts } from '../utils/text-utils'

function formatXml(xml: string): string {
  const INDENT = '    '

  // CDATA 섹션 보존
  const cdatas: string[] = []
  const sanitized = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, (m) => {
    cdatas.push(m)
    return `__CDATA_${cdatas.length - 1}__`
  })

  // 태그 단위로 분리
  const tokens = sanitized
    .replace(/>\s*</g, '>\n<')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  let level = 0
  const lines: string[] = []

  for (const token of tokens) {
    if (/^<\//.test(token)) {
      // 닫는 태그
      level = Math.max(0, level - 1)
      lines.push(INDENT.repeat(level) + token)
    } else if (/^<[?!]/.test(token) || /\/>$/.test(token)) {
      // 선언 또는 자기닫힘 태그
      lines.push(INDENT.repeat(level) + token)
    } else if (/^<[^/]/.test(token)) {
      // 여는 태그 + 인라인 닫힘 여부 확인
      const hasInlineClose = /<\/[^>]+>$/.test(token)
      lines.push(INDENT.repeat(level) + token)
      if (!hasInlineClose) level++
    } else {
      // 텍스트 또는 CDATA 플레이스홀더
      lines.push(INDENT.repeat(level) + token)
    }
  }

  let result = lines.join('\n')
  cdatas.forEach((cdata, i) => {
    result = result.replace(`__CDATA_${i}__`, cdata)
  })
  return result
}


import type { RegistryItem } from '../utils/api'
import { fetchMappings, updateFigmaFileCompleted, generateClusters, exportXml, saveFigmaFileData } from '../utils/api'
import { loadSavedCssList, loadXmlExportPath } from './SettingsModal'

interface ConvertedCodeEditorProps {
  fileKey: string | null
  nodeId: string | null  // 특정 노드 ID (완료 상태 저장용)
  rootNode: FigmaNode | null
  registry: RegistryItem[]
  visible: boolean
  onToggle: () => void
  document: object | null  // 전체 document 구조 (클러스터 생성용)
  convertTrigger: number  // 이 값이 변경되면 자동 변환
  onComplete?: () => void  // 완료 후 콜백
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

export default function ConvertedCodeEditor({
  fileKey,
  nodeId,
  rootNode,
  document,
  registry,
  visible,
  onToggle,
  convertTrigger,
  onComplete,
}: ConvertedCodeEditorProps) {
  const [convertedCode, setConvertedCode] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code')
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [iframeReady, setIframeReady] = useState(false)
  const [previewZoom, setPreviewZoom] = useState(1)
  const [completing, setCompleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // 완료 처리
  const handleComplete = async () => {
    if (!fileKey) return
    setCompleting(true)
    try {
      await updateFigmaFileCompleted(fileKey, nodeId, true)
      // 현재 document 저장 후 클러스터 생성
      try {
        if (document) {
          await saveFigmaFileData(fileKey, nodeId, document)
        }
        await generateClusters(fileKey, nodeId)
      } catch (e) {
        console.error('Failed to generate clusters:', e)
      }
      onComplete?.()
    } catch (e) {
      console.error('Failed to mark as complete:', e)
    } finally {
      setCompleting(false)
    }
  }

  // XML 저장 처리
  const handleSaveXml = async () => {
    if (!convertedCode || !rootNode) return

    const exportPath = loadXmlExportPath()
    if (!exportPath) {
      setSaveMessage({ type: 'error', text: '설정에서 XML Export 경로를 지정해주세요' })
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }

    setSaving(true)
    setSaveMessage(null)
    try {
      // 파일명 생성: 노드 이름 기반
      const filename = rootNode.name.replace(/[<>:"/\\|?*]/g, '_')
      const result = await exportXml(convertedCode, filename, exportPath)
      setSaveMessage({ type: 'success', text: `저장 완료: ${result.path}` })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (e) {
      console.error('Failed to save XML:', e)
      setSaveMessage({ type: 'error', text: e instanceof Error ? e.message : '저장 실패' })
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  // iframe으로부터 메시지 수신
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.event === 'previewFrame.ready') {
        setIframeReady(true)
      } else if (event.data?.event === 'previewFrame.sendXMLResponse') {
        setPreviewLoading(false)
        if (event.data.success) {
          setPreviewError(null)
        } else {
          setPreviewError(event.data.error || '렌더링 실패')
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // convertTrigger 변경 시 또는 registry 로드 완료 시 자동 변환
  useEffect(() => {
    if (fileKey && rootNode && registry.length > 0) {
      handleConvert()
    }
  }, [convertTrigger, fileKey, rootNode, registry])

  // 탭 전환 시 iframe ready 상태 리셋 (iframe이 새로 마운트되므로)
  useEffect(() => {
    if (activeTab !== 'preview') {
      setIframeReady(false)
    }
  }, [activeTab])

  // 미리보기 탭 전환 시 렌더링
  useEffect(() => {
    if (activeTab === 'preview' && convertedCode && iframeReady && iframeRef.current?.contentWindow) {
      const timer = setTimeout(() => {
        const cssList = loadSavedCssList()
        const cssContents = cssList.map(item => item.content)

        iframeRef.current?.contentWindow?.postMessage(
          { event: 'previewFrame.sendXML', xml: convertedCode, css: cssContents },
          '*'
        )
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [activeTab, convertedCode, iframeReady])

  // WebSquare 미리보기 렌더링 (iframe postMessage 방식)
  const renderPreview = useCallback(() => {
    if (!convertedCode || !iframeRef.current?.contentWindow) {
      setPreviewError('미리보기를 사용할 수 없습니다')
      return
    }

    if (!iframeReady) {
      setPreviewError('WebSquare 엔진 로딩 중...')
      return
    }

    setPreviewLoading(true)
    setPreviewError(null)

    // 설정에서 CSS 목록 가져오기
    const cssList = loadSavedCssList()
    const cssContents = cssList.map(item => item.content)

    iframeRef.current.contentWindow.postMessage(
      { event: 'previewFrame.sendXML', xml: convertedCode, css: cssContents },
      '*'
    )
  }, [convertedCode, iframeReady])

  // 변환 실행
  const handleConvert = async () => {
    if (!fileKey || !rootNode) return

    setConverting(true)
    try {
      // 모든 매핑 가져오기
      const allMappings = await fetchMappings(fileKey, nodeId)
      const mappingMap = new Map(allMappings.map(m => [m.figmaNodeId, m]))

      // 트리 순회하며 계층 구조로 코드 생성
      const traverse = (n: FigmaNode, depth: number): string => {
        // hidden 요소는 XML에서 제외
        if (n.visible === false) return ''

        const indentStr = '    '.repeat(depth)
        const nodeMapping = mappingMap.get(n.id)
        const regItem = nodeMapping?.registryId
          ? registry.find(r => r.id === nodeMapping.registryId)
          : null

        // 자식 노드들의 코드 먼저 생성
        const childrenCode = n.children
          ? n.children.map(child => traverse(child, depth + 1)).filter(Boolean).join('\n')
          : ''

        // 매핑된 노드인 경우
        if (regItem) {
          const { tagName, properties } = regItem
          const mergedProps = { ...properties }
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

          // textbox 특수 처리 - label 속성으로 텍스트 설정 (하위 노드까지 탐색)
          if (regItemNameLower === 'textbox') {
            const rawText = n.characters || findTextInChildren(n)
            if (rawText) {
              const textContent = rawText
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .join('&lt;br/&gt;')
              mergedProps.label = textContent
            }
          }

          // 컴포넌트별 속성 처리
          if (regItemNameLower === 'button') {
            const text = n.characters || findTextInChildren(n)
            if (text) mergedProps.label = text
          }
          if (regItemNameLower === 'anchor') {
            const text = n.characters || findTextInChildren(n)
            const anchorPropsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
            const labelTag = text
              ? `\n${indentStr}    <xf:label><![CDATA[${text}]]></xf:label>\n${indentStr}`
              : ''
            return `${indentStr}<${tagName} ${anchorPropsStr}>${labelTag}</${tagName}>`
          }
          if (regItemNameLower === 'input') {
            const text = n.characters || findTextInChildren(n)
            if (text) mergedProps.placeholder = text
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
            const { tagname: _thTag, ...thProps } = mergedProps as Record<string, string>
            const thPropsStr = Object.entries(thProps).map(([k, v]) => `${k}="${v}"`).join(' ')
            const innerContent = childrenCode ? `\n${childrenCode}\n${indentStr}` : ''
            return `${indentStr}<xf:group tagname="th" ${thPropsStr}>
${indentStr}    <w2:attributes>
${indentStr}        <w2:scope>row</w2:scope>
${indentStr}    </w2:attributes>${innerContent}</xf:group>`
          }

          // td 특수 처리
          if (regItemNameLower === 'td') {
            const { tagname: _tdTag, ...tdProps } = mergedProps as Record<string, string>
            const tdPropsStr = Object.entries(tdProps).map(([k, v]) => `${k}="${v}"`).join(' ')
            const innerContent = childrenCode ? `\n${childrenCode}\n${indentStr}` : ''
            return `${indentStr}<xf:group tagname="td" ${tdPropsStr}>${innerContent}</xf:group>`
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

      const rawCode = traverse(rootNode, 0) || ''

      // 들여쓰기 추가 (12칸 = 3탭)
      const innerCode = rawCode
        .split('\n')
        .map(line => line ? '            ' + line : '')
        .join('\n')

      // XML 템플릿에 삽입
      const result = `<?xml version="1.0" encoding="UTF-8"?>
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

};
]]></script>
    </head>
    <body ev:onpageload="scwin.onpageload">
${innerCode}
    </body>
</html>`

      setConvertedCode(formatXml(result))
    } catch (e) {
      console.error('Failed to convert XML:', e)
    } finally {
      setConverting(false)
    }
  }

  // 토글 버튼만 표시 (닫힌 상태)
  if (!visible) {
    return (
      <button
        onClick={onToggle}
        className="absolute right-0 top-1/2 -translate-y-1/2 theme-bg-tertiary hover:opacity-80 theme-text-primary px-1 py-4 rounded-l text-xs"
        title="변환 결과 열기"
      >
        &lt;
      </button>
    )
  }

  return (
    <div className="h-full theme-bg-secondary flex flex-col relative">
      {/* 토스트 메시지 */}
      {saveMessage && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all ${
          saveMessage.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {saveMessage.type === 'success' && (
            <span className="mr-2">✓</span>
          )}
          {saveMessage.text}
        </div>
      )}
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 border-b theme-border">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-medium theme-text-secondary">
            변환 결과
            {converting && <span className="ml-2 text-xs theme-text-secondary">변환 중...</span>}
          </h2>
          {/* 탭 버튼 */}
          {convertedCode && (
            <div className="flex theme-bg-tertiary rounded">
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1 text-xs rounded-l transition ${
                  activeTab === 'code'
                    ? 'bg-blue-600 text-white'
                    : 'theme-text-secondary theme-text-hover'
                }`}
              >
                코드
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 text-xs rounded-r transition ${
                  activeTab === 'preview'
                    ? 'bg-green-600 text-white'
                    : 'theme-text-secondary theme-text-hover'
                }`}
              >
                미리보기
                {!iframeReady && <span className="ml-1 text-yellow-400">*</span>}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1 theme-text-secondary theme-text-hover text-xs"
          title="닫기"
        >
          &gt;
        </button>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-hidden">
        {convertedCode ? (
          <>
            {/* 코드 탭 */}
            {activeTab === 'code' && (
              <div className="h-full flex flex-col p-4">
                <div className="flex justify-end gap-3 mb-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(convertedCode)
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    복사
                  </button>
                </div>
                <pre className="flex-1 p-3 theme-bg-primary border theme-border rounded text-sm font-mono theme-text-code-green overflow-auto whitespace-pre">
                  {convertedCode}
                </pre>
              </div>
            )}

            {/* 미리보기 탭 */}
            {activeTab === 'preview' && (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center px-4 py-2 border-b theme-border">
                  <span className="text-xs text-gray-500">
                    {previewLoading ? '렌더링 중...' : iframeReady ? '준비됨' : '엔진 로딩...'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))}
                      className="text-xs text-gray-400 hover:text-gray-200 w-5 h-5 flex items-center justify-center"
                    >−</button>
                    <span className="text-xs text-gray-400 w-10 text-center">{Math.round(previewZoom * 100)}%</span>
                    <button
                      onClick={() => setPreviewZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}
                      className="text-xs text-gray-400 hover:text-gray-200 w-5 h-5 flex items-center justify-center"
                    >+</button>
                    <button
                      onClick={() => setPreviewZoom(1)}
                      className="text-xs text-gray-400 hover:text-gray-200"
                    >100%</button>
                    <button
                      onClick={renderPreview}
                      disabled={!iframeReady || previewLoading}
                      className="text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-600"
                    >
                      새로고침
                    </button>
                  </div>
                </div>
                {/* iframe은 항상 패널을 꽉 채움. 1/zoom 크기로 키운 뒤 scale(zoom) 적용 */}
                <div className="flex-1 relative overflow-hidden">
                  {previewError && (
                    <div className="absolute top-0 left-0 right-0 p-2 bg-red-900/80 text-red-200 text-xs z-10">
                      {previewError}
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    src="/websquare/preview.html"
                    style={{
                      display: 'block',
                      border: 'none',
                      width: `${100 / previewZoom}%`,
                      height: `${100 / previewZoom}%`,
                      transform: `scale(${previewZoom})`,
                      transformOrigin: 'top left',
                    }}
                    title="WebSquare Preview"
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            {registry.length === 0
              ? '컴포넌트 레지스트리 로딩 중...'
              : '노드를 매핑하면 변환 결과가 표시됩니다'}
          </div>
        )}
      </div>

      {/* 하단 버튼 영역 */}
      {convertedCode && (
        <div className="flex justify-end gap-2 px-4 py-2 border-t theme-border">
          <button
            onClick={handleSaveXml}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          <button
            onClick={handleComplete}
            disabled={completing}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium rounded"
          >
            {completing ? '처리 중...' : '완료'}
          </button>
        </div>
      )}
    </div>
  )
}
