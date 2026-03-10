import { useState, useEffect, useRef, useCallback } from 'react'
import type { FigmaNode } from '../types/figma'
import type { RegistryItem } from '../utils/api'
import { fetchMappings, updateFigmaFileCompleted, generateClusters } from '../utils/api'
import { loadSavedCssList } from './SettingsModal'

interface ConvertedCodeEditorProps {
  fileKey: string | null
  nodeId: string | null  // 특정 노드 ID (완료 상태 저장용)
  rootNode: FigmaNode | null
  registry: RegistryItem[]
  visible: boolean
  onToggle: () => void
  convertTrigger: number  // 이 값이 변경되면 자동 변환
  onComplete?: () => void  // 완료 후 콜백
}

// 하위 노드에서 텍스트 찾기 (첫 번째만)
function findTextInChildren(node: FigmaNode | null): string | null {
  if (!node?.children) return null

  for (const child of node.children) {
    if (child.characters) {
      return child.characters
    }
    const found = findTextInChildren(child)
    if (found) return found
  }

  return null
}

// 하위 노드에서 모든 텍스트 수집
function collectAllTexts(node: FigmaNode | null): string[] {
  const texts: string[] = []

  function traverse(n: FigmaNode) {
    if (n.characters) {
      texts.push(n.characters)
    }
    if (n.children) {
      for (const child of n.children) {
        traverse(child)
      }
    }
  }

  if (node) traverse(node)
  return texts
}

// 최상단 레벨의 텍스트들만 수집 (첫 번째 행)
function collectTopLevelTexts(node: FigmaNode | null): string[] {
  if (!node?.children) return []

  const texts: string[] = []
  const firstRow = node.children[0]
  if (firstRow) {
    function collectTextsFromNode(n: FigmaNode) {
      if (n.characters) {
        texts.push(n.characters)
      }
      if (n.children) {
        for (const child of n.children) {
          collectTextsFromNode(child)
        }
      }
    }
    collectTextsFromNode(firstRow)
  }

  return texts
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
  const [completing, setCompleting] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // 완료 처리
  const handleComplete = async () => {
    if (!fileKey) return
    setCompleting(true)
    try {
      await updateFigmaFileCompleted(fileKey, nodeId, true)
      // 클러스터 생성 (자동 매핑용)
      try {
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
        // 설정에서 CSS 목록 가져오기
        const cssList = loadSavedCssList()
        const cssContents = cssList.map(item => item.content)

        // iframe에 XML과 CSS 전달
        iframeRef.current?.contentWindow?.postMessage(
          {
            event: 'previewFrame.sendXML',
            xml: convertedCode,
            css: cssContents
          },
          '*'
        )
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [activeTab, convertedCode, iframeReady])

  // iframe 로드 시 ready 상태 리셋
  const handleIframeLoad = useCallback(() => {
    // iframe이 로드되면 ready 메시지를 기다림
  }, [])

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

    // iframe에 XML과 CSS 전달
    iframeRef.current.contentWindow.postMessage(
      {
        event: 'previewFrame.sendXML',
        xml: convertedCode,
        css: cssContents
      },
      '*'
    )
  }, [convertedCode, iframeReady])

  // 변환 실행
  const handleConvert = async () => {
    if (!fileKey || !rootNode) return

    setConverting(true)
    try {
      // 모든 매핑 가져오기
      const allMappings = await fetchMappings(fileKey)
      const mappingMap = new Map(allMappings.map(m => [m.figmaNodeId, m]))

      // 트리 순회하며 계층 구조로 코드 생성
      const traverse = (n: FigmaNode, depth: number): string => {
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
          console.log('[DEBUG] 컴포넌트 속성:', { name: regItem.name, tagName, properties })
          const mergedProps = { ...properties }
          const regItemNameLower = regItem.name.toLowerCase()

          // 커스텀 속성 병합 (class 포함 모든 속성)
          if (nodeMapping?.customAttrs) {
            Object.entries(nodeMapping.customAttrs).forEach(([key, value]) => {
              mergedProps[key] = value
            })
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
          if (regItemNameLower === 'input') {
            const text = n.characters || findTextInChildren(n)
            if (text) mergedProps.placeholder = text
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
            // 기본값 설정 후 mergedProps로 덮어쓰기
            const tableProps = { class: 'w2tb', style: 'width:100%;', id: '', ...mergedProps }
            const tablePropsStr = Object.entries(tableProps)
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
            // 기본값 설정 후 mergedProps로 덮어쓰기
            const gridProps = { id: '', style: 'height:153px;', ...mergedProps }
            const gridPropsStr = Object.entries(gridProps).map(([k, v]) => `${k}="${v}"`).join(' ')

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
            // 기본값 설정 후 mergedProps로 덮어쓰기
            const thProps = { style: '', class: 'w2tb_th', ...mergedProps }
            delete thProps.tagname
            const thPropsStr = Object.entries(thProps).map(([k, v]) => `${k}="${v}"`).join(' ')
            const innerContent = childrenCode ? `\n${childrenCode}\n${indentStr}` : ''
            return `${indentStr}<xf:group tagname="th" ${thPropsStr}>
${indentStr}    <w2:attributes>
${indentStr}        <w2:scope>row</w2:scope>
${indentStr}    </w2:attributes>${innerContent}</xf:group>`
          }

          // td 특수 처리
          if (regItemNameLower === 'td') {
            // 기본값 설정 후 mergedProps로 덮어쓰기
            const tdProps = { style: '', class: 'w2tb_td', ...mergedProps }
            delete tdProps.tagname
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

      const rawCode = rootNode.children
        ? rootNode.children.map(child => traverse(child, 0)).filter(Boolean).join('\n')
        : ''

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

      setConvertedCode(result)
    } catch {
      // 변환 실패
    } finally {
      setConverting(false)
    }
  }

  // 토글 버튼만 표시 (닫힌 상태)
  if (!visible) {
    return (
      <button
        onClick={onToggle}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-700 hover:bg-gray-600 text-white px-1 py-4 rounded-l text-xs"
        title="변환 결과 열기"
      >
        &lt;
      </button>
    )
  }

  return (
    <div className="h-full bg-gray-800 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-medium text-gray-300">
            변환 결과
            {converting && <span className="ml-2 text-xs text-gray-500">변환 중...</span>}
          </h2>
          {/* 탭 버튼 */}
          {convertedCode && (
            <div className="flex bg-gray-700 rounded">
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1 text-xs rounded-l transition ${
                  activeTab === 'code'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                코드
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 text-xs rounded-r transition ${
                  activeTab === 'preview'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:text-white'
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
          className="p-1 text-gray-400 hover:text-white text-xs"
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
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(convertedCode)
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    복사
                  </button>
                </div>
                <pre className="flex-1 p-3 bg-gray-900 border border-gray-600 rounded text-sm font-mono text-green-400 overflow-auto whitespace-pre">
                  {convertedCode}
                </pre>
              </div>
            )}

            {/* 미리보기 탭 */}
            {activeTab === 'preview' && (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700">
                  <span className="text-xs text-gray-500">
                    {previewLoading ? '렌더링 중...' : iframeReady ? '준비됨' : '엔진 로딩...'}
                  </span>
                  <button
                    onClick={renderPreview}
                    disabled={!iframeReady || previewLoading}
                    className="text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-600"
                  >
                    새로고침
                  </button>
                </div>
                <div className="flex-1 relative">
                  {previewError && (
                    <div className="absolute top-0 left-0 right-0 p-2 bg-red-900/80 text-red-200 text-xs z-10">
                      {previewError}
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    src="/websquare/preview.html"
                    onLoad={handleIframeLoad}
                    className="w-full h-full border-0 bg-white"
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

      {/* 하단 완료 버튼 */}
      {convertedCode && (
        <div className="flex justify-end px-4 py-2 border-t border-gray-700">
          <button
            onClick={handleComplete}
            disabled={completing}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white text-sm font-medium rounded"
          >
            {completing ? '처리 중...' : '완료'}
          </button>
        </div>
      )}
    </div>
  )
}
