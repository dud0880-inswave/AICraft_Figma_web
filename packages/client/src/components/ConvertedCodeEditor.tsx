import { useState, useEffect, useRef, useCallback } from 'react'
import type { FigmaNode } from '../types/figma'
import hljs from 'highlight.js/lib/core'
import xml from 'highlight.js/lib/languages/xml'

hljs.registerLanguage('xml', xml)

// 미리보기 디바이스(뷰포트) 프리셋
type DevicePresetKey = 'desktop' | 'mobile' | 'mobileL' | 'tablet'
const DEVICE_PRESETS: Record<DevicePresetKey, { label: string; width: number | null; height: number | null }> = {
  desktop: { label: '데스크탑', width: null, height: null },  // 패널을 꽉 채움
  mobile: { label: '모바일', width: 375, height: 667 },        // iPhone SE/8 기준
  mobileL: { label: '모바일 L', width: 414, height: 896 },     // iPhone 11/XR 기준
  tablet: { label: '태블릿', width: 768, height: 1024 },       // iPad 기준
}

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
import { fetchMappings, updateFigmaFileCompleted, generateClusters, saveFigmaFileData, fetchProjectSettings, fetchNodeSvgs, getFigmaFileXmlFilename, setFigmaFileXmlFilename, fetchProjectFiles, assetUrl } from '../utils/api'
import { createXmlGenerator } from '../utils/xml-generator'
import { isVsCodeEnv, downloadFile } from '../utils/webDownload'


interface ConvertedCodeEditorProps {
  fileKey: string | null
  nodeId: string | null  // 특정 노드 ID (완료 상태 저장용)
  projectId: string | null  // 프로젝트 ID (클러스터 생성용)
  rootNode: FigmaNode | null
  registry: RegistryItem[]
  document: object | null  // 전체 document 구조 (클러스터 생성용)
  convertTrigger: number  // 이 값이 변경되면 자동 변환
  cssRefreshKey?: number  // CSS 새로고침 트리거
  onComplete?: () => void  // 완료 후 콜백
  token?: string  // Figma API 토큰 (SVG 내보내기용)
}

export default function ConvertedCodeEditor({
  fileKey,
  nodeId,
  projectId,
  rootNode,
  document: _document,
  registry,
  convertTrigger,
  cssRefreshKey,
  onComplete,
  token: _token,
}: ConvertedCodeEditorProps) {
  const [convertedCode, setConvertedCode] = useState<string | null>(null)
  const [currentInitScript, setCurrentInitScript] = useState('')
  const [currentWidgetStyle, setCurrentWidgetStyle] = useState('')
  const [converting, setConverting] = useState(false)
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview')
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [iframeReady, setIframeReady] = useState(false)
  const [previewZoom, setPreviewZoom] = useState(1)
  const [previewDevice, setPreviewDevice] = useState<DevicePresetKey>('desktop')
  const [completing, setCompleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [cssContents, setCssContents] = useState<string[]>([])  // CSS 내용 (클래스 매핑용)
  const [cssPaths, setCssPaths] = useState<string[]>([])        // CSS 파일 경로 (preview <link>용)
  const [enableInlineStyle, setEnableInlineStyle] = useState(true)
  const [showFilenameModal, setShowFilenameModal] = useState(false)
  const [inputFilename, setInputFilename] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const codeRef = useRef<HTMLElement>(null)

  // 프로젝트 설정에서 CSS 목록 로드
  useEffect(() => {
    const loadCss = async () => {
      if (!projectId) {
        setCssContents([])
        return
      }
      try {
        const settings = await fetchProjectSettings(projectId)
        const cssListData = settings['css-list']
        if (cssListData) {
          const cssList = JSON.parse(cssListData) as Array<{ content?: string; filePath?: string; wsFolder?: string; assetPath?: string }>
          if (isVsCodeEnv()) {
            // Extension: filePath 항목은 로컬 파일에서 직접 로드 (항상 최신)
            setCssContents(cssList.filter(item => !item.filePath && !item.assetPath).map(item => item.content || '').filter(Boolean))
            // wsFolder가 있으면 {wsFolder}/{filePath}로 조합
            setCssPaths(cssList
              .filter(item => item.filePath)
              .map(item => item.wsFolder ? `${item.wsFolder}/${item.filePath}` : item.filePath!)
            )
          } else {
            // 웹: assetPath 항목은 서버 URL <link>로 로드(url() 이미지 해석 보장),
            //     그 외(직접 입력)는 인라인 content 주입
            setCssPaths(cssList
              .filter(item => item.assetPath)
              .map(item => assetUrl(projectId, item.assetPath!)))
            setCssContents(cssList
              .filter(item => !item.assetPath)
              .map(item => item.content || '').filter(Boolean))
          }
        } else {
          setCssContents([])
          setCssPaths([])
        }
        setEnableInlineStyle(settings['enable-inline-style'] !== 'false')
      } catch {
        setCssContents([])
        setCssPaths([])
      }
    }
    loadCss()
  }, [projectId, cssRefreshKey])

  // 완료 처리
  const handleComplete = async () => {
    if (!fileKey || !projectId) return
    setCompleting(true)
    try {
      await updateFigmaFileCompleted(projectId, fileKey, nodeId, true)
      // displayRoot 저장 (synthetic wrapper가 아닌 실제 루트 노드) 후 클러스터 생성
      try {
        if (rootNode && projectId) {
          await saveFigmaFileData(projectId, fileKey, nodeId, rootNode)
        }
        if (projectId) {
          await generateClusters(projectId)
        }
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

  // Extension host에 파일 저장 요청
  const saveFileViaExtension = (content: string, relativePath: string, wsFolder?: string): Promise<{ path: string }> => {
    return new Promise((resolve, reject) => {
      const vsc = (window as unknown as { __vscode?: { postMessage: (msg: unknown) => void } }).__vscode
      if (!vsc) { reject(new Error('Not in extension')); return }
      const requestId = `save-${Date.now()}`
      const handler = (e: MessageEvent) => {
        if (e.data?.type === 'fileSaved' && e.data?.requestId === requestId) {
          window.removeEventListener('message', handler)
          if (e.data.error) reject(new Error(e.data.error))
          else resolve({ path: e.data.path })
        }
      }
      window.addEventListener('message', handler)
      setTimeout(() => { window.removeEventListener('message', handler); reject(new Error('Timeout')) }, 10000)
      vsc.postMessage({ type: 'saveFile', requestId, content, relativePath, wsFolder })
    })
  }

  // 실제 export 실행 (파일명 확보된 상태에서 호출)
  const doExportXml = async (rawFilename: string) => {
    if (!convertedCode || !projectId || !fileKey) return

    setSaving(true)
    setSaveMessage(null)
    try {
      const settings = await fetchProjectSettings(projectId)
      const exportPath = settings['xml-export-path'] || ''
      const exportWsFolder = settings['xml-export-ws-folder'] || ''

      // 현재 파일 버전 조회 (DB 기준, 자동 증가 안 함)
      let version = '01'
      try {
        const projectFiles = await fetchProjectFiles(projectId)
        const rec = projectFiles.find(f => f.fileKey === fileKey && (f.nodeId ?? null) === (nodeId ?? null))
        if (rec?.version) version = rec.version
      } catch { /* ignore */ }

      const filename = rawFilename.replace(/[<>:"/\\|?*]/g, '_')

      let savedPath: string
      if (isVsCodeEnv()) {
        // Extension: 워크스페이스 기준 상대경로로 저장
        const basePath = exportPath ? `${exportPath}/${filename}` : filename
        const relativePath = `${basePath}/v${version.padStart(2, '0')}/${filename}.xml`
        const result = await saveFileViaExtension(convertedCode, relativePath, exportWsFolder)
        savedPath = result.path
      } else {
        // 웹 버전: 브라우저 다운로드가 기본
        savedPath = `${filename}.xml`
        downloadFile(convertedCode, savedPath)
      }

      // 최초 저장 시 figma_files.xmlFilename에 기록
      try {
        await setFigmaFileXmlFilename(projectId, fileKey, nodeId, filename)
      } catch { /* ignore */ }

      setSaveMessage({ type: 'success', text: isVsCodeEnv() ? `저장 완료: ${savedPath}` : `다운로드 완료: ${savedPath}` })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (e) {
      console.error('Failed to save XML:', e)
      setSaveMessage({ type: 'error', text: e instanceof Error ? e.message : '저장 실패' })
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  // XML 저장 버튼 클릭: 항상 모달 열어 파일명 확인/변경 가능
  const handleSaveXml = async () => {
    if (!convertedCode || !rootNode) return
    if (!projectId || !fileKey) {
      setSaveMessage({ type: 'error', text: '프로젝트를 선택해주세요' })
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }

    let current = rootNode.name.replace(/[<>:"/\\|?*]/g, '_')
    try {
      const saved = await getFigmaFileXmlFilename(projectId, fileKey, nodeId)
      if (saved) current = saved
    } catch { /* ignore */ }
    setInputFilename(current)
    setShowFilenameModal(true)
  }

  // 모달 확인: 입력한 파일명으로 export
  const handleConfirmSave = async () => {
    if (!convertedCode || !inputFilename) return
    setShowFilenameModal(false)
    await doExportXml(inputFilename)
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
  }, [convertTrigger, fileKey, rootNode, registry, enableInlineStyle])

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
        iframeRef.current?.contentWindow?.postMessage(
          { event: 'previewFrame.sendXML', xml: convertedCode, css: cssContents, cssPaths: cssPaths, initScript: currentInitScript, widgetStyle: currentWidgetStyle },
          '*'
        )
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [activeTab, convertedCode, iframeReady, cssContents, cssPaths, currentInitScript])

  // 코드 하이라이팅 적용
  useEffect(() => {
    if (convertedCode && codeRef.current && activeTab === 'code') {
      // 기존 하이라이팅 제거
      codeRef.current.removeAttribute('data-highlighted')
      codeRef.current.className = 'language-xml'
      // 새로운 하이라이팅 적용
      hljs.highlightElement(codeRef.current)
    }
  }, [convertedCode, activeTab])

  // 미리보기 하드 리셋 - iframe(엔진)까지 완전히 다시 로드
  // 로드 완료 후 previewFrame.ready 수신 → iframeReady=true → 렌더링 effect가 XML을 자동 재전송
  const renderPreview = useCallback(() => {
    if (!iframeRef.current?.contentWindow) {
      setPreviewError('미리보기를 사용할 수 없습니다')
      return
    }
    setIframeReady(false)
    setPreviewError(null)
    iframeRef.current.contentWindow.location.reload()
  }, [])

  // 변환 실행
  const handleConvert = async () => {
    if (!fileKey || !rootNode || !projectId) return

    setConverting(true)
    try {
      // 모든 매핑 가져오기
      const allMappings = await fetchMappings(projectId, fileKey, nodeId)
      const mappingMap = new Map(allMappings.map(m => [m.figmaNodeId, m]))


      // image 매핑 노드 SVG 프리페치 (서버 경유)
      const imageSvgMap = new Map<string, string>()
      if (fileKey && projectId) {
        const imageNodeIds: string[] = []
        for (const [nid, mapping] of mappingMap) {
          const reg = mapping.registryId ? registry.find(r => r.id === mapping.registryId) : null
          if (reg?.name.toLowerCase() === 'image') imageNodeIds.push(nid)
        }
        if (imageNodeIds.length > 0) {
          try {
            const svgs = await fetchNodeSvgs(projectId, fileKey, imageNodeIds, _token)
            for (const [id, svg] of Object.entries(svgs)) {
              imageSvgMap.set(id, svg)
            }
          } catch (e) {
            console.warn('[Image] SVG fetch 실패:', e)
          }
        }
      }

      // 공용 XML 생성기 — MappingEditor 코드조각과 동일 로직 공유 (utils/xml-generator.ts)
      const gen = createXmlGenerator({ mappingMap, registry, enableInlineStyle, imageSvgMap })
      const rawCode = gen.traverse(rootNode, 0) || ''
      const widgetInitScripts = gen.widgetInitScripts
      const widgetTitleHeight = gen.getWidgetTitleHeight()

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
${widgetInitScripts.length > 0 ? `        <style type="text/css"><![CDATA[.w2widget_content {padding:0}${widgetTitleHeight > 0 ? ` .w2widget_title {height:${widgetTitleHeight}px}` : ''}]]></style>\n` : ''}        <script lazy="false" type="text/javascript"><![CDATA[
scwin.onpageload = function onpageload() {
${widgetInitScripts.length > 0 ? widgetInitScripts.join('\n\n') + '\n' : ''}};
]]></script>
    </head>
    <body ev:onpageload="scwin.onpageload">
${innerCode}
    </body>
</html>`

      setConvertedCode(formatXml(result))
      setCurrentInitScript(widgetInitScripts.length > 0 ? widgetInitScripts.join('\n\n') : '')
      // 위젯 관련 인라인 스타일 수집 (preview에서 별도 주입)
      const widgetCss = widgetInitScripts.length > 0
        ? `.w2widget_content {padding:0}${widgetTitleHeight > 0 ? ` .w2widget_title {height:${widgetTitleHeight}px}` : ''}`
        : ''
      setCurrentWidgetStyle(widgetCss)
    } catch (e) {
      console.error('Failed to convert XML:', e)
    } finally {
      setConverting(false)
    }
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
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 text-xs rounded-l transition ${
                  activeTab === 'preview'
                    ? 'bg-green-600 text-white'
                    : 'theme-text-secondary theme-text-hover'
                }`}
              >
                미리보기
                {!iframeReady && <span className="ml-1 text-yellow-400">*</span>}
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1 text-xs rounded-r transition ${
                  activeTab === 'code'
                    ? 'bg-blue-600 text-white'
                    : 'theme-text-secondary theme-text-hover'
                }`}
              >
                코드
              </button>
            </div>
          )}
        </div>
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
                    onClick={handleSaveXml}
                    disabled={saving}
                    className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                  >
                    {saving ? '다운로드 중...' : '다운로드'}
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(convertedCode)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    복사
                  </button>
                </div>
                <pre className="flex-1 p-3 theme-bg-primary border theme-border rounded text-sm font-mono overflow-auto whitespace-pre">
                  <code ref={codeRef} className="language-xml">
                    {convertedCode}
                  </code>
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
                    {/* 디바이스(뷰포트) 비율 선택 */}
                    <div className="flex items-center gap-0.5 mr-1">
                      {(Object.keys(DEVICE_PRESETS) as DevicePresetKey[]).map((key) => (
                        <button
                          key={key}
                          onClick={() => setPreviewDevice(key)}
                          title={
                            DEVICE_PRESETS[key].width
                              ? `${DEVICE_PRESETS[key].label} (${DEVICE_PRESETS[key].width}×${DEVICE_PRESETS[key].height})`
                              : DEVICE_PRESETS[key].label
                          }
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            previewDevice === key
                              ? 'bg-blue-600 text-white'
                              : 'theme-text-secondary theme-text-hover theme-bg-hover'
                          }`}
                        >
                          {DEVICE_PRESETS[key].label}
                        </button>
                      ))}
                    </div>
                    <span className="text-gray-600">|</span>
                    <button
                      onClick={() => setPreviewZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))}
                      className="text-xs px-1.5 py-0.5 rounded theme-text-secondary theme-text-hover theme-bg-hover"
                    >−</button>
                    <span className="text-xs theme-text-secondary w-10 text-center">{Math.round(previewZoom * 100)}%</span>
                    <button
                      onClick={() => setPreviewZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}
                      className="text-xs px-1.5 py-0.5 rounded theme-text-secondary theme-text-hover theme-bg-hover"
                    >+</button>
                    <button
                      onClick={() => setPreviewZoom(1)}
                      className="text-xs px-1.5 py-0.5 rounded theme-text-secondary theme-text-hover theme-bg-hover"
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
                {/* 데스크탑: 패널을 꽉 채움(1/zoom 확대 후 scale). 모바일/태블릿: 고정 px 뷰포트를 가운데 배치.
                    iframe은 재마운트(재로딩) 방지를 위해 항상 동일한 DOM 위치에 유지하고 wrapper 스타일만 변경 */}
                {(() => {
                  const preset = DEVICE_PRESETS[previewDevice]
                  const isFluid = preset.width === null
                  return (
                    <div
                      className={`flex-1 relative ${
                        isFluid
                          ? 'overflow-hidden'
                          : 'overflow-auto flex items-start justify-center p-4 theme-bg-tertiary'
                      }`}
                    >
                      {previewError && (
                        <div className="absolute top-0 left-0 right-0 p-2 bg-red-900/80 text-red-200 text-xs z-10">
                          {previewError}
                        </div>
                      )}
                      {/* 스케일된 크기만큼 공간을 차지하도록 wrapper로 감싸 스크롤이 정상 동작하게 함 */}
                      <div
                        style={
                          isFluid
                            ? { width: '100%', height: '100%' }
                            : {
                                width: preset.width! * previewZoom,
                                height: preset.height! * previewZoom,
                                flexShrink: 0,
                              }
                        }
                      >
                        <iframe
                          ref={iframeRef}
                          src="/websquare/preview.html"
                          style={{
                            display: 'block',
                            border: 'none',
                            width: isFluid ? `${100 / previewZoom}%` : preset.width!,
                            height: isFluid ? `${100 / previewZoom}%` : preset.height!,
                            background: '#fff',
                            boxShadow: isFluid
                              ? undefined
                              : '0 0 0 1px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.15)',
                            transform: `scale(${previewZoom})`,
                            transformOrigin: 'top left',
                          }}
                          title="WebSquare Preview"
                        />
                      </div>
                    </div>
                  )
                })()}
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
            onClick={handleComplete}
            disabled={completing}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium rounded"
          >
            {completing ? '처리 중...' : '완료'}
          </button>
        </div>
      )}

      {/* 파일명 입력 모달 */}
      {showFilenameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="theme-bg-secondary rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold theme-text-primary mb-4">
              파일명 입력
            </h3>
            <input
              type="text"
              value={inputFilename}
              onChange={(e) => setInputFilename(e.target.value)}
              placeholder="파일명 (.xml 확장자 제외)"
              className="w-full px-3 py-2 rounded border theme-border theme-bg-tertiary theme-text-primary mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmSave()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowFilenameModal(false)}
                className="px-4 py-2 text-sm theme-text-secondary hover:theme-text-primary"
              >
                취소
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={!inputFilename.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
