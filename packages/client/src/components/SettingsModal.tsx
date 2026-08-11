import { useState, useEffect, useRef } from 'react'
import {
  fetchRegistry,
  createRegistryItem,
  updateRegistryItem,
  deleteRegistryItem,
  exportMappingRules,
  importMappingRules,
  fetchDefaultMappingRulesGrouped,
  createDefaultMappingRule,
  deleteDefaultMappingRule,
  resetDefaultMappingRules,
  fetchProjectSettings,
  saveProjectSettings,
  generateClusters,
  migratePersonalSettingsToDb,
  uploadAsset,
  listAssets,
  deleteAsset,
} from '../utils/api'
import type { RegistryItem, MappingRulesJson, DefaultMappingRuleGrouped } from '../utils/api'
import { useTheme } from '../contexts/ThemeContext'
import { isVsCodeEnv } from '../utils/webDownload'
import { useDialog } from '../contexts/DialogContext'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveToken: (token: string) => void
  onCssChange?: () => void  // CSS 변경 시 호출
  onRegistryChange?: () => void  // Registry 변경 시 호출
  projectId?: string | null  // 프로젝트별 설정
  projectName?: string
}

type TabType = 'basic' | 'components' | 'css' | 'mappingRules'

export interface CssItem {
  id: string
  name: string
  content: string
  filePath?: string     // CSS 파일 경로 (워크스페이스 폴더 기준 상대경로) — 레거시(extension)
  wsFolder?: string     // 워크스페이스 폴더 이름 (멀티 루트 대응) — 레거시(extension)
  assetPath?: string    // 서버 에셋 상대경로 (예: css/common.css). 미리보기 url() 해석 기준
  classNames: string[]  // CSS에서 추출한 클래스명
}

// CSS파일별 컴포넌트-클래스 매핑
// cssId -> componentId -> classNames
export interface ComponentClassMapping {
  [cssId: string]: {
    [componentId: string]: string[]
  }
}

// CSS에서 클래스명 추출
export function extractClassNames(cssContent: string): string[] {
  // 주석·문자열·url() 제거 → 셀렉터가 아닌 곳에서의 오탐 차단
  const cleaned = cssContent
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, ' ')
    .replace(/url\([^)]*\)/gi, ' ')
  // 식별자 끝까지 매칭 (복합 셀렉터 .a.b, :not(.x), 파일 끝 모두 대응)
  const classRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g
  const classes = new Set<string>()
  let match
  while ((match = classRegex.exec(cleaned)) !== null) {
    classes.add(match[1])
  }
  return Array.from(classes).sort()
}

// 클래스명 패턴 → 컴포넌트 이름 매핑 규칙
const CLASS_PATTERN_RULES: { patterns: RegExp[]; componentName: string }[] = [
  { patterns: [/^btn[_-]/i, /button/i, /^btn$/i], componentName: 'button' },
  { patterns: [/^input[_-]/i, /^inp[_-]/i, /textfield/i], componentName: 'input' },
  { patterns: [/^chk[_-]/i, /^checkbox[_-]/i, /check/i], componentName: 'checkbox' },
  { patterns: [/^radio[_-]/i, /^rdo[_-]/i], componentName: 'radio' },
  { patterns: [/^select[_-]/i, /^sel[_-]/i, /dropdown/i, /combo/i], componentName: 'select' },
  { patterns: [/^txt[_-]/i, /^text[_-]/i, /^label[_-]/i, /^lbl[_-]/i], componentName: 'textbox' },
  { patterns: [/^tbl[_-]/i, /^table[_-]/i, /^grid[_-]/i], componentName: 'grid' },
  { patterns: [/^tab[_-]/i, /tabmenu/i], componentName: 'tabcontrol' },
  { patterns: [/^img[_-]/i, /^image[_-]/i, /^icon[_-]/i], componentName: 'image' },
  { patterns: [/^link[_-]/i, /^anchor[_-]/i], componentName: 'anchor' },
  { patterns: [/^textarea[_-]/i, /^txa[_-]/i], componentName: 'textarea' },
  { patterns: [/^date[_-]/i, /^calendar[_-]/i, /^cal[_-]/i], componentName: 'calendar' },
  { patterns: [/^popup[_-]/i, /^modal[_-]/i, /^dialog[_-]/i], componentName: 'popup' },
  // box 패턴에서 다른 컴포넌트명이 포함된 경우 제외 (selectbox, textbox, searchbox 등)
  { patterns: [/^grp[_-]/i, /^group[_-]/i, /^panel[_-]/i, /^pnl[_-]/i, /(?<!select|text|search|check|combo|input|radio|grid|tab|image|link|date|dialog|msg|message|alert)box/i], componentName: 'group' },
]

// 클래스명에서 컴포넌트 이름 추론
export function inferComponentFromClassName(className: string): string | null {
  for (const rule of CLASS_PATTERN_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(className)) {
        return rule.componentName
      }
    }
  }
  return null
}

// 클래스 목록을 자동으로 컴포넌트에 매핑 (특정 CSS 파일에 대해)
export function autoMapClassesToComponents(
  cssId: string,
  classNames: string[],
  registry: RegistryItem[],
  existingMapping: ComponentClassMapping
): ComponentClassMapping {
  const newMapping = { ...existingMapping }
  if (!newMapping[cssId]) {
    newMapping[cssId] = {}
  }

  for (const className of classNames) {
    const inferredComponentName = inferComponentFromClassName(className)
    if (!inferredComponentName) continue

    // 레지스트리에서 해당 이름의 컴포넌트 찾기
    const component = registry.find(r => r.name.toLowerCase() === inferredComponentName.toLowerCase())
    if (!component) continue

    // 이미 매핑되어 있지 않으면 추가
    const currentClasses = newMapping[cssId][component.id] || []
    if (!currentClasses.includes(className)) {
      newMapping[cssId][component.id] = [...currentClasses, className]
    }
  }

  return newMapping
}


// 기본 탭 컴포넌트
function BasicTab({ onSaveToken, onClose, projectId, onCssChange }: { onSaveToken: (t: string) => void; onClose: () => void; projectId?: string | null; onCssChange?: () => void }) {
  const [inputToken, setInputToken] = useState('')
  const [xmlExportPath, setXmlExportPath] = useState('')
  const [xmlExportWsFolder, setXmlExportWsFolder] = useState('')
  const [clusterIncludeNodeName, setClusterIncludeNodeName] = useState(true)
  const [enableInlineStyle, setEnableInlineStyle] = useState(true)
  const [showMappingBadge, setShowMappingBadge] = useState(true)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const { theme, setTheme } = useTheme()
  const previousClusterSetting = useRef<boolean>(true)

  // 프로젝트 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      if (!projectId) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        // 구 개인 설정(settings.json)이 남아있으면 DB로 1회 이관
        await migratePersonalSettingsToDb(projectId)

        // 전체 설정 (서버 DB)
        const settings = await fetchProjectSettings(projectId)
        const includeNodeName = settings['cluster-include-node-name'] !== 'false'
        setClusterIncludeNodeName(includeNodeName)
        previousClusterSetting.current = includeNodeName
        setEnableInlineStyle(settings['enable-inline-style'] !== 'false')
        setShowMappingBadge(settings['show-mapping-badge'] !== 'false')
        setInputToken(settings['figma-token'] || '')
        setXmlExportPath(settings['xml-export-path'] || '')
        setXmlExportWsFolder(settings['xml-export-ws-folder'] || '')
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [projectId])

  // 토스트 자동 숨김
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  const handleSave = async () => {
    if (!projectId) {
      onClose()
      return
    }

    try {
      // 클러스터 설정 변경 여부 확인
      const clusterSettingChanged = previousClusterSetting.current !== clusterIncludeNodeName

      // 전체 설정 저장 (서버 DB)
      await saveProjectSettings(projectId, {
        'cluster-include-node-name': clusterIncludeNodeName ? 'true' : 'false',
        'enable-inline-style': enableInlineStyle ? 'true' : 'false',
        'show-mapping-badge': showMappingBadge ? 'true' : 'false',
        'figma-token': inputToken,
        'xml-export-path': xmlExportPath,
        'xml-export-ws-folder': xmlExportWsFolder,
      })
      onSaveToken(inputToken)

      // 클러스터 설정이 변경되었다면 재생성
      if (clusterSettingChanged) {
        setRegenerating(true)
        try {
          await generateClusters(projectId)
          setToastMessage('클러스터가 재생성되었습니다.')
        } catch (err) {
          console.error('Failed to regenerate clusters:', err)
          setToastMessage('클러스터 재생성에 실패했습니다.')
        } finally {
          setRegenerating(false)
        }
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
    onCssChange?.()
    onClose()
  }

  const handleClearToken = () => {
    setInputToken('')
  }

  const handleClearPath = () => {
    setXmlExportPath('')
    setXmlExportWsFolder('')
  }

  if (loading) {
    return <div className="text-center py-8 theme-text-secondary">로딩 중...</div>
  }

  return (
    <div className="space-y-6">
      {/* 테마 선택 */}
      <div>
        <label className="block text-sm font-medium theme-text-primary mb-2">
          테마
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
              theme === 'dark'
                ? 'border-blue-500 bg-gray-800 text-gray-300'
                : 'theme-border hover:border-blue-500 theme-bg-tertiary'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'theme-text-secondary'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'theme-text-primary'}`}>다크</span>
            </div>
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
              theme === 'light'
                ? 'border-blue-500 bg-blue-50 text-gray-700'
                : 'theme-border hover:border-blue-500 theme-bg-tertiary'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className={`w-5 h-5 ${theme === 'light' ? 'text-yellow-500' : 'theme-text-secondary'}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
              <span className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'theme-text-primary'}`}>라이트</span>
            </div>
          </button>
        </div>
      </div>

      {/* Figma Access Token */}
      <div>
        <label className="block text-sm font-medium theme-text-primary mb-2">
          Figma Access Token
        </label>
        <input
          type="password"
          value={inputToken}
          onChange={(e) => setInputToken(e.target.value)}
          placeholder="figd_xxxxxxxxxxxxxxxx"
          className="w-full px-4 py-2 theme-bg-secondary border theme-border rounded-lg theme-text-primary placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-xs theme-text-secondary mt-1">
          Figma Settings &rarr; Account &rarr; Personal access tokens
        </p>
        {inputToken && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center text-sm text-green-600 dark:text-green-400">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414-1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              토큰이 설정됨
            </div>
            <button
              onClick={handleClearToken}
              className="text-xs text-red-400 hover:text-red-300"
            >
              삭제
            </button>
          </div>
        )}
      </div>

      {/* 저장 경로 */}
      <div>
        <label className="block text-sm font-medium theme-text-primary mb-2">
          저장 경로
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={isVsCodeEnv() ? (xmlExportWsFolder ? `${xmlExportWsFolder}/${xmlExportPath}` : xmlExportPath) : ''}
            readOnly
            placeholder={isVsCodeEnv() ? '폴더를 선택해주세요' : '웹 다운로드 (기본)'}
            className="flex-1 px-4 py-2 theme-bg-secondary border theme-border rounded-lg theme-text-primary placeholder-gray-400 font-mono text-sm cursor-default"
          />
          <button
            type="button"
            disabled={!isVsCodeEnv()}
            onClick={() => {
              const vsc = (window as unknown as { __vscode?: { postMessage: (msg: unknown) => void } }).__vscode
              if (!vsc) return
              const requestId = `pickFolder-${Date.now()}`
              const handler = (e: MessageEvent) => {
                if (e.data?.type === 'folderPicked' && e.data?.requestId === requestId) {
                  window.removeEventListener('message', handler)
                  setXmlExportPath(e.data.relativePath)
                  setXmlExportWsFolder(e.data.wsFolder || '')
                }
              }
              window.addEventListener('message', handler)
              vsc.postMessage({ type: 'pickFolder', requestId })
            }}
            className="px-3 py-2 text-sm theme-bg-tertiary border theme-border rounded-lg hover:border-blue-500 theme-text-secondary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-transparent"
          >
            폴더 선택
          </button>
        </div>
        <p className="text-xs theme-text-secondary mt-1">
          {isVsCodeEnv()
            ? 'XML, 스펙 문서가 저장될 위치 (프로젝트 기준 상대경로)'
            : '웹 버전에서는 XML, 스펙 문서가 브라우저 다운로드로 저장됩니다'}
        </p>
        {isVsCodeEnv() && xmlExportPath && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center text-sm text-green-600 dark:text-green-400">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              경로 설정됨
            </div>
            <button
              onClick={handleClearPath}
              className="text-xs text-red-400 hover:text-red-300"
            >
              삭제
            </button>
          </div>
        )}
      </div>

      {/* 인라인 스타일 설정 */}
      <div>
        <label className="block text-sm font-medium theme-text-primary mb-2">
          인라인 스타일
        </label>
        <label className="flex items-start gap-3 p-3 rounded-lg theme-bg-tertiary border theme-border cursor-pointer hover:border-blue-500 transition-colors">
          <input
            type="checkbox"
            checked={enableInlineStyle}
            onChange={(e) => setEnableInlineStyle(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <div className="flex-1">
            <div className="text-sm theme-text-primary font-medium">XML 변환 시 인라인 스타일 포함</div>
            <div className="text-xs theme-text-secondary mt-1">
              체크 해제 시 변환된 XML에 Figma에서 추출한 style 속성을 넣지 않습니다.
            </div>
          </div>
        </label>
      </div>

      {/* 클러스터 설정 */}
      <div>
        <label className="block text-sm font-medium theme-text-primary mb-2">
          자동 매핑 클러스터 설정
        </label>
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-lg theme-bg-tertiary border theme-border cursor-pointer hover:border-blue-500 transition-colors">
            <input
              type="checkbox"
              checked={clusterIncludeNodeName}
              onChange={(e) => setClusterIncludeNodeName(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <div className="flex-1">
              <div className="text-sm theme-text-primary font-medium">노드 이름 포함</div>
              <div className="text-xs theme-text-secondary mt-1">
                클러스터 생성 시 노드 이름을 포함합니다. 체크 해제 시 구조만 비교하여 더 많은 노드가 자동 매핑됩니다.
              </div>
            </div>
          </label>
          <div className="text-xs theme-text-secondary bg-blue-900/20 border border-blue-500/30 rounded p-2">
            <span className="font-medium text-blue-400">💡 팁:</span>
            {clusterIncludeNodeName
              ? " 노드 이름까지 일치해야 같은 클러스터로 인식됩니다. 정확도는 높지만 적중률이 낮을 수 있습니다."
              : " 노드 구조만 같으면 이름이 달라도 같은 클러스터로 인식됩니다. 적중률은 높지만 오매칭 가능성이 있습니다."
            }
          </div>
        </div>
      </div>

      {/* 노드 트리 표시 설정 */}
      <div>
        <label className="block text-sm font-medium theme-text-primary mb-2">
          노드 트리 표시 설정
        </label>
        <label className="flex items-start gap-3 p-3 rounded-lg theme-bg-tertiary border theme-border cursor-pointer hover:border-blue-500 transition-colors">
          <input
            type="checkbox"
            checked={showMappingBadge}
            onChange={(e) => setShowMappingBadge(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <div className="flex-1">
            <div className="text-sm theme-text-primary font-medium">매핑 컴포넌트 뱃지 표시</div>
            <div className="text-xs theme-text-secondary mt-1">
              노드 트리에서 매핑된 노드 앞에 컴포넌트 태그 뱃지(예: xf:group)를 표시합니다. 해제하면 점 표시만 나타납니다.
            </div>
          </div>
        </label>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={regenerating}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {regenerating && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {regenerating ? '클러스터 재생성 중...' : '저장'}
        </button>
      </div>

      {/* 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg z-50 shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  )
}

// 컴포넌트 탭 컴포넌트
function ComponentsTab({ projectId, onRegistryChange }: { projectId?: string | null; onRegistryChange?: () => void }) {
  const { showConfirm } = useDialog()
  const [registry, setRegistry] = useState<RegistryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', tagName: '', properties: '' })
  const [error, setError] = useState<string | null>(null)

  const loadRegistry = async () => {
    if (!projectId) {
      setLoading(false)
      return
    }
    try {
      const items = await fetchRegistry(projectId)
      setRegistry(items)
    } catch {
      setError('컴포넌트 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRegistry()
  }, [projectId])

  const resetForm = () => {
    setFormData({ name: '', tagName: '', properties: '' })
    setShowAddForm(false)
    setEditingId(null)
    setError(null)
  }

  const handleAdd = async () => {
    if (!projectId) return
    if (!formData.name || !formData.tagName) {
      setError('이름과 태그명은 필수입니다')
      return
    }

    try {
      let props: Record<string, string> = {}
      if (formData.properties.trim()) {
        props = JSON.parse(formData.properties)
      }
      await createRegistryItem(projectId, { name: formData.name, tagName: formData.tagName, properties: props })
      await loadRegistry()
      onRegistryChange?.()
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : '추가 실패')
    }
  }

  const handleUpdate = async () => {
    if (!editingId || !formData.name || !formData.tagName) {
      setError('이름과 태그명은 필수입니다')
      return
    }

    try {
      let props: Record<string, string> = {}
      if (formData.properties.trim()) {
        props = JSON.parse(formData.properties)
      }
      await updateRegistryItem(editingId, { name: formData.name, tagName: formData.tagName, properties: props })
      await loadRegistry()
      onRegistryChange?.()
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 실패')
    }
  }

  const handleDelete = async (id: string) => {
    if (!await showConfirm('이 컴포넌트를 삭제하시겠습니까?')) return

    try {
      await deleteRegistryItem(id)
      await loadRegistry()
      onRegistryChange?.()
    } catch {
      setError('삭제 실패')
    }
  }

  const handleEdit = (item: RegistryItem) => {
    setEditingId(item.id)
    setFormData({
      name: item.name,
      tagName: item.tagName,
      properties: Object.keys(item.properties).length > 0 ? JSON.stringify(item.properties, null, 2) : '',
    })
    setShowAddForm(false)
  }

  if (loading) {
    return <div className="theme-text-secondary text-center py-8">로딩 중...</div>
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* 추가/수정 폼 */}
      {(showAddForm || editingId) && (
        <div className="theme-bg-tertiary border theme-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium theme-text-primary">
            {editingId ? '컴포넌트 수정' : '새 컴포넌트 추가'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs theme-text-secondary mb-1">이름</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="button"
                className="w-full px-3 py-2 theme-bg-secondary border theme-border rounded text-sm theme-text-primary placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs theme-text-secondary mb-1">태그명</label>
              <input
                type="text"
                value={formData.tagName}
                onChange={(e) => setFormData({ ...formData, tagName: e.target.value })}
                placeholder="w2:button"
                className="w-full px-3 py-2 theme-bg-secondary border theme-border rounded text-sm theme-text-primary placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs theme-text-secondary mb-1">속성 (JSON)</label>
            <textarea
              value={formData.properties}
              onChange={(e) => setFormData({ ...formData, properties: e.target.value })}
              placeholder='{"appearance": "full"}'
              rows={2}
              className="w-full px-3 py-2 theme-bg-secondary border theme-border rounded text-sm theme-text-primary placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="px-3 py-1.5 text-sm theme-text-secondary theme-text-hover theme-bg-hover rounded"
            >
              취소
            </button>
            <button
              onClick={editingId ? handleUpdate : handleAdd}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              {editingId ? '수정' : '추가'}
            </button>
          </div>
        </div>
      )}

      {/* 컴포넌트 목록 */}
      <div className="border theme-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 theme-bg-tertiary border-b theme-border">
          <span className="text-sm theme-text-secondary">컴포넌트 목록 ({registry.length})</span>
          {!showAddForm && !editingId && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              + 추가
            </button>
          )}
        </div>
        <div className={`overflow-auto ${editingId || showAddForm ? 'max-h-[320px]' : 'max-h-[590px]'}`}>
          {registry.length === 0 ? (
            <div className="px-3 py-4 text-center theme-text-secondary text-sm">
              등록된 컴포넌트가 없습니다
            </div>
          ) : (
            registry.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between px-3 py-2 border-b theme-border last:border-b-0 theme-bg-hover ${
                  editingId === item.id ? 'bg-blue-900/20' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm theme-text-primary font-medium">{item.name}</span>
                    <span className="text-xs theme-text-secondary font-mono">{item.tagName}</span>
                  </div>
                  {Object.keys(item.properties).length > 0 && (
                    <div className="text-xs theme-text-secondary truncate">
                      {Object.entries(item.properties).map(([k, v]) => `${k}="${v}"`).join(' ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1 theme-text-secondary hover:text-blue-400"
                    title="수정"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 theme-text-secondary hover:text-red-400"
                    title="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// CSS 탭 서브 뷰
type CssSubView = 'list' | 'edit' | 'mapping'

// CSS 탭 컴포넌트
function CssTab({ projectId, onCssChange }: { projectId?: string | null; onCssChange?: () => void }) {
  const { showConfirm } = useDialog()
  const [cssList, setCssList] = useState<CssItem[]>([])
  const [editingItem, setEditingItem] = useState<CssItem | null>(null)
  const [subView, setSubView] = useState<CssSubView>('list')
  const [registry, setRegistry] = useState<RegistryItem[]>([])
  const [componentClassMapping, setComponentClassMapping] = useState<ComponentClassMapping>({})
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const [selectedCssId, setSelectedCssId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [classSearchQuery, setClassSearchQuery] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [imageUploading, setImageUploading] = useState(false)
  // 업로드 진행 모달: null = 미표시, done = 완료(실패 목록 표시용)
  const [uploadProgress, setUploadProgress] = useState<{
    current: number
    total: number
    currentFile: string
    failed: string[]
    done: boolean
  } | null>(null)

  // 업로드된 에셋 목록 로드 (css/ 제외 — 이미지/폰트 등)
  const refreshUploadedImages = async () => {
    if (!projectId) { setUploadedImages([]); return }
    try {
      const paths = await listAssets(projectId)
      setUploadedImages(paths.filter(p => !p.startsWith('css/')))
    } catch { setUploadedImages([]) }
  }
  useEffect(() => { refreshUploadedImages() }, [projectId])

  // 에셋 업로드 (개별 파일 또는 폴더 전체)
  // 폴더: webkitRelativePath(선택 폴더명 포함) 그대로 저장 → images 선택 시 images/base2/…,
  //       font 선택 시 font/pretendard/… 로 CSS의 ../images, ../font 참조와 일치
  // 개별: images/<파일명> 로 저장 (평면 참조용)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isFolder: boolean) => {
    const files = e.target.files
    if (!files || files.length === 0 || !projectId) return
    const fileList = Array.from(files)
    setImageUploading(true)
    const failed: string[] = []
    setUploadProgress({ current: 0, total: fileList.length, currentFile: '', failed: [], done: false })
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        const wkPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath
        const rel = isFolder && wkPath ? wkPath : `images/${file.name}`
        if (!rel) continue
        setUploadProgress(p => p ? { ...p, current: i, currentFile: rel } : p)
        // 파일별 독립 처리: 실패해도 나머지 계속, 1회 자동 재시도
        let ok = false
        for (let attempt = 0; attempt < 2 && !ok; attempt++) {
          try {
            await uploadAsset(projectId, rel, await file.arrayBuffer())
            ok = true
          } catch (err) {
            if (attempt === 0) {
              await new Promise(r => setTimeout(r, 1000))  // 1초 후 재시도
            } else {
              console.error('업로드 실패:', rel, err)
            }
          }
        }
        if (!ok) failed.push(rel)
        setUploadProgress(p => p ? { ...p, current: i + 1, failed: [...failed] } : p)
      }
      await refreshUploadedImages()
    } finally {
      setImageUploading(false)
      e.target.value = ''
      if (failed.length > 0) {
        // 실패 있음 → 모달을 완료 상태로 전환해 실패 목록 표시
        setUploadProgress(p => p ? { ...p, done: true } : p)
      } else {
        setUploadProgress(null)
      }
    }
  }

  // 프로젝트 설정 로드/저장 헬퍼 (서버 DB)
  const loadCssListFromSettings = async (): Promise<CssItem[]> => {
    if (!projectId) return []
    try {
      const settings = await fetchProjectSettings(projectId)
      const data = settings['css-list']
      if (data) {
        return JSON.parse(data)
      }
    } catch (err) {
      console.error('Failed to load CSS list:', err)
    }
    return []
  }

  const saveCssListToSettings = async (items: CssItem[]) => {
    if (!projectId) return
    // content 포함 저장 (웹 환경에서도 CSS 내용을 쓸 수 있도록 DB에 보관)
    const value = JSON.stringify(items)
    try {
      await saveProjectSettings(projectId, { 'css-list': value })
    } catch (err) {
      console.error('Failed to save CSS list:', err)
    }
  }

  const loadMappingFromSettings = async (): Promise<ComponentClassMapping> => {
    if (!projectId) return {}
    try {
      const settings = await fetchProjectSettings(projectId)
      const data = settings['css-class-mapping']
      if (data) {
        return JSON.parse(data)
      }
    } catch (err) {
      console.error('Failed to load CSS mapping:', err)
    }
    return {}
  }

  const saveMappingToSettings = async (mapping: ComponentClassMapping) => {
    if (!projectId) return
    const value = JSON.stringify(mapping)
    try {
      await saveProjectSettings(projectId, { 'css-class-mapping': value })
    } catch (err) {
      console.error('Failed to save CSS mapping:', err)
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const [cssItems, mapping, reg] = await Promise.all([
          loadCssListFromSettings(),
          loadMappingFromSettings(),
          fetchRegistry(projectId),
        ])
        setCssList(cssItems)
        setComponentClassMapping(mapping)
        setRegistry(reg)
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [projectId])

  // 매핑 모드 진입 시 첫 번째 CSS 파일 자동 선택
  useEffect(() => {
    if (subView === 'mapping' && !selectedCssId && cssList.length > 0) {
      setSelectedCssId(cssList[0].id)
    }
  }, [subView, cssList, selectedCssId])

  // 브라우저: input file로 content 읽기 + 서버 에셋으로 업로드
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newItems: CssItem[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.name.endsWith('.css')) continue
      const content = await file.text()
      const classNames = extractClassNames(content)
      // 서버 에셋으로 업로드 (css/<파일명>) → 미리보기에서 <link>로 로드하여 url() 해석
      const assetPath = `css/${file.name}`
      if (projectId) {
        try {
          await uploadAsset(projectId, assetPath, content)
        } catch (err) {
          console.error('CSS 업로드 실패:', err)
        }
      }
      newItems.push({ id: `css-${Date.now()}-${i}`, name: file.name, content, classNames, assetPath })
    }

    if (newItems.length > 0) {
      const updated = [...cssList, ...newItems]
      setCssList(updated)
      await saveCssListToSettings(updated)
      if (registry.length > 0) {
        let currentMapping = { ...componentClassMapping }
        for (const item of newItems) {
          if (item.classNames.length > 0) {
            currentMapping = autoMapClassesToComponents(item.id, item.classNames, registry, currentMapping)
          }
        }
        setComponentClassMapping(currentMapping)
        await saveMappingToSettings(currentMapping)
      }
      onCssChange?.()
    }
    e.target.value = ''
  }

  // Extension: VS Code 파일 다이얼로그로 상대경로 획득 → filePath + content 저장
  const handleVsCodeFileSelect = () => {
    const vsc = (window as unknown as { __vscode?: { postMessage: (msg: unknown) => void } }).__vscode
    if (!vsc) return
    const requestId = `pick-${Date.now()}`
    const handler = async (e: MessageEvent) => {
      if (e.data?.type === 'filePicked' && e.data?.requestId === requestId) {
        window.removeEventListener('message', handler)
        const relativePath = e.data.relativePath as string
        const wsFolder = (e.data.wsFolder as string) || ''
        const isExternal = !!e.data.external
        const fileName = relativePath.split('/').pop() || ''
        // 파일 내용을 extension host에 요청하여 읽기
        const readId = `read-${Date.now()}`
        let content = ''
        let classNames: string[] = []
        try {
          content = await new Promise<string>((resolve) => {
            const readHandler = (ev: MessageEvent) => {
              if (ev.data?.type === 'fileContent' && ev.data?.requestId === readId) {
                window.removeEventListener('message', readHandler)
                resolve(ev.data.content || '')
              }
            }
            window.addEventListener('message', readHandler)
            setTimeout(() => { window.removeEventListener('message', readHandler); resolve('') }, 5000)
            vsc.postMessage({ type: 'readFile', requestId: readId, relativePath, wsFolder })
          })
          if (content) classNames = extractClassNames(content)
        } catch { /* ignore */ }
        // 워크스페이스 내부: filePath(상대경로) 저장, content는 저장 시 제외
        // 워크스페이스 외부: filePath 없이 content 포함하여 저장
        const newItem: CssItem = isExternal
          ? { id: `css-${Date.now()}`, name: fileName, content, classNames }
          : { id: `css-${Date.now()}`, name: fileName, content, filePath: relativePath, wsFolder, classNames }
        const updated = [...cssList, newItem]
        setCssList(updated)
        await saveCssListToSettings(updated)
        if (classNames.length > 0 && registry.length > 0) {
          const mapped = autoMapClassesToComponents(newItem.id, classNames, registry, componentClassMapping)
          setComponentClassMapping(mapped)
          await saveMappingToSettings(mapped)
        }
        onCssChange?.()
      }
    }
    window.addEventListener('message', handler)
    vsc.postMessage({ type: 'pickFile', requestId, filters: { 'CSS': ['css'] } })
  }

  const handleDelete = async (id: string) => {
    const target = cssList.find(item => item.id === id)
    const updated = cssList.filter(item => item.id !== id)
    setCssList(updated)
    await saveCssListToSettings(updated)
    // 해당 CSS의 클래스 매핑도 삭제
    const newMapping = { ...componentClassMapping }
    delete newMapping[id]
    setComponentClassMapping(newMapping)
    await saveMappingToSettings(newMapping)
    // 서버 에셋 파일도 삭제 (같은 파일을 참조하는 다른 항목이 없을 때만)
    if (target?.assetPath && projectId) {
      const stillReferenced = updated.some(item => item.assetPath === target.assetPath)
      if (!stillReferenced) {
        try {
          await deleteAsset(projectId, target.assetPath)
        } catch (err) {
          console.warn('CSS 에셋 파일 삭제 실패:', err)
        }
      }
    }
    onCssChange?.()
  }

  const handleEdit = async (item: CssItem) => {
    // filePath가 있고 content가 없으면 파일에서 읽기
    if (item.filePath && !item.content) {
      const vsc = (window as unknown as { __vscode?: { postMessage: (msg: unknown) => void } }).__vscode
      if (vsc) {
        const readId = `read-${Date.now()}`
        const content = await new Promise<string>((resolve) => {
          const handler = (e: MessageEvent) => {
            if (e.data?.type === 'fileContent' && e.data?.requestId === readId) {
              window.removeEventListener('message', handler)
              resolve(e.data.content || '')
            }
          }
          window.addEventListener('message', handler)
          setTimeout(() => { window.removeEventListener('message', handler); resolve('') }, 5000)
          vsc.postMessage({ type: 'readFile', requestId: readId, relativePath: item.filePath, wsFolder: item.wsFolder || '' })
        })
        setEditingItem({ ...item, content })
        setSubView('edit')
        return
      }
    }
    setEditingItem({ ...item })
    setSubView('edit')
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return

    const classNames = extractClassNames(editingItem.content)
    const updatedItem = { ...editingItem, classNames }
    const updated = cssList.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    )
    setCssList(updated)
    await saveCssListToSettings(updated)

    if (classNames.length > 0 && registry.length > 0) {
      const autoMapped = autoMapClassesToComponents(editingItem.id, classNames, registry, componentClassMapping)
      setComponentClassMapping(autoMapped)
      await saveMappingToSettings(autoMapped)
    }

    setEditingItem(null)
    setSubView('list')
    onCssChange?.()
  }

  const handleAddNew = () => {
    setEditingItem({
      id: `css-${Date.now()}`,
      name: 'custom.css',
      content: '',
      classNames: [],
    })
    setSubView('edit')
  }

  const handleSaveNew = async () => {
    if (!editingItem || !editingItem.content.trim()) return

    const classNames = extractClassNames(editingItem.content)
    const newItem = { ...editingItem, classNames }
    const updated = [...cssList, newItem]
    setCssList(updated)
    await saveCssListToSettings(updated)

    if (classNames.length > 0 && registry.length > 0) {
      const autoMapped = autoMapClassesToComponents(editingItem.id, classNames, registry, componentClassMapping)
      setComponentClassMapping(autoMapped)
      await saveMappingToSettings(autoMapped)
    }

    setEditingItem(null)
    setSubView('list')
    onCssChange?.()
  }

  const handleCancelEdit = () => {
    setEditingItem(null)
    setSubView('list')
  }

  // 컴포넌트-클래스 매핑 토글 (CSS 파일별)
  const toggleClassForComponent = async (cssId: string, componentId: string, className: string) => {
    const newMapping = { ...componentClassMapping }
    if (!newMapping[cssId]) {
      newMapping[cssId] = {}
    }
    const current = newMapping[cssId][componentId] || []
    const updated = current.includes(className)
      ? current.filter(c => c !== className)
      : [...current, className]

    newMapping[cssId][componentId] = updated
    setComponentClassMapping(newMapping)
    await saveMappingToSettings(newMapping)
    onCssChange?.()
  }

  const isNewItem = editingItem && !cssList.find(item => item.id === editingItem.id)
  const selectedComponent = registry.find(r => r.id === selectedComponentId)
  const selectedCss = cssList.find(c => c.id === selectedCssId)
  const assignedClasses = (selectedCssId && selectedComponentId)
    ? (componentClassMapping[selectedCssId]?.[selectedComponentId] || [])
    : []

  // 편집 모드
  if (subView === 'edit' && editingItem) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium theme-text-primary">
            {isNewItem ? '새 CSS 추가' : 'CSS 편집'}
          </h3>
          <button
            onClick={handleCancelEdit}
            className="theme-text-secondary theme-text-hover text-sm"
          >
            취소
          </button>
        </div>
        <div>
          <label className="block text-xs theme-text-secondary mb-1">파일명</label>
          <input
            type="text"
            value={editingItem.name}
            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
            className="w-full px-3 py-2 theme-bg-tertiary border theme-border rounded text-sm theme-text-primary focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs theme-text-secondary mb-1">CSS 내용</label>
          <textarea
            value={editingItem.content}
            onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
            placeholder="/* CSS 스타일을 입력하세요 */"
            rows={10}
            className="w-full px-3 py-2 theme-bg-tertiary border theme-border rounded text-sm theme-text-primary placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={isNewItem ? handleSaveNew : handleSaveEdit}
            disabled={!editingItem.content.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
          >
            {isNewItem ? '추가' : '저장'}
          </button>
        </div>
      </div>
    )
  }

  // 자동 매핑 재실행 (선택된 CSS 파일에 대해)
  const handleAutoMap = async () => {
    if (!selectedCssId || !selectedCss || registry.length === 0) return
    const autoMapped = autoMapClassesToComponents(selectedCssId, selectedCss.classNames, registry, componentClassMapping)
    setComponentClassMapping(autoMapped)
    await saveMappingToSettings(autoMapped)
    onCssChange?.()
  }

  // 선택된 CSS 파일의 매핑 초기화
  const handleClearCssMappings = async () => {
    if (!selectedCssId) return
    if (!await showConfirm('이 CSS 파일의 클래스 매핑을 초기화하시겠습니까?')) return
    const newMapping = { ...componentClassMapping }
    delete newMapping[selectedCssId]
    setComponentClassMapping(newMapping)
    await saveMappingToSettings(newMapping)
    onCssChange?.()
  }

  if (loading) {
    return <div className="text-center py-8 theme-text-secondary">로딩 중...</div>
  }

  // 클래스 매핑 모드
  if (subView === 'mapping') {
    return (
      <div className="space-y-4">
        {/* 탭 전환 */}
        <div className="flex gap-2">
          <button
            onClick={() => setSubView('list')}
            className="px-3 py-1 text-sm rounded theme-bg-tertiary theme-text-secondary theme-bg-hover"
          >
            CSS 파일
          </button>
          <button
            onClick={() => setSubView('mapping')}
            className="px-3 py-1 text-sm rounded bg-blue-600 text-white"
          >
            클래스 매핑
          </button>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium theme-text-primary">CSS 파일별 클래스 매핑</h3>
          {selectedCssId && (
            <div className="flex gap-2">
              <button
                onClick={handleAutoMap}
                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                title="클래스명 패턴을 분석하여 자동으로 컴포넌트에 매핑합니다"
              >
                자동 매핑
              </button>
              <button
                onClick={handleClearCssMappings}
                className="px-2 py-1 text-xs theme-bg-tertiary theme-bg-hover theme-text-primary rounded"
              >
                초기화
              </button>
            </div>
          )}
        </div>

        {cssList.length === 0 ? (
          <div className="text-center theme-text-secondary text-sm py-4">
            CSS 파일이 없습니다.<br />
            먼저 CSS 파일을 추가해주세요.
          </div>
        ) : (
          <div className="space-y-3">
            {/* CSS 파일 탭 */}
            <div className="border-b theme-border">
              <div className="flex gap-1 overflow-x-auto">
                {cssList.map(css => {
                  const mappingCount = Object.values(componentClassMapping[css.id] || {}).flat().length
                  const isSelected = selectedCssId === css.id
                  return (
                    <button
                      key={css.id}
                      onClick={() => {
                        setSelectedCssId(css.id)
                        setSelectedComponentId(null)
                      }}
                      className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                        isSelected
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50'
                          : 'border-transparent theme-text-secondary theme-text-hover theme-bg-hover'
                      }`}
                    >
                      <span>{css.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-blue-600 text-white' : 'theme-bg-tertiary theme-text-secondary'
                      }`}>
                        {css.classNames?.length || 0}
                      </span>
                      {mappingCount > 0 && (
                        <span className="text-xs text-green-600 dark:text-green-400">({mappingCount} 매핑)</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedCssId && selectedCss ? (
              <div className="flex gap-3">
                {/* 컴포넌트 목록 */}
                <div className="w-2/5 border theme-border rounded-lg overflow-hidden">
                  <div className="px-3 h-9 theme-bg-tertiary border-b theme-border flex items-center">
                    <span className="text-xs theme-text-secondary">컴포넌트</span>
                  </div>
                  <div className="h-[460px] max-h-[460px] overflow-auto">
                    {registry.map(comp => {
                      const classCount = (componentClassMapping[selectedCssId]?.[comp.id] || []).length
                      return (
                        <button
                          key={comp.id}
                          onClick={() => { setSelectedComponentId(comp.id); setClassSearchQuery(''); }}
                          className={`w-full px-3 py-2 text-left text-sm border-b theme-border last:border-b-0 flex items-center justify-between ${
                            selectedComponentId === comp.id
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                              : 'theme-text-primary theme-bg-hover'
                          }`}
                        >
                          <span>{comp.name}</span>
                          {classCount > 0 && (
                            <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">{classCount}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 클래스 목록 */}
                <div className="flex-1 border theme-border rounded-lg overflow-hidden">
                  <div className="px-3 h-9 theme-bg-tertiary border-b theme-border flex items-center justify-between gap-2 overflow-hidden">
                    <span className="text-xs theme-text-secondary truncate min-w-0">
                      {selectedComponent
                        ? `${selectedCss.name} → ${selectedComponent.name}`
                        : `${selectedCss.name}의 클래스 (${selectedCss.classNames?.length || 0}개)`}
                    </span>
                    {selectedComponentId && (
                      <input
                        type="text"
                        value={classSearchQuery}
                        onChange={(e) => setClassSearchQuery(e.target.value)}
                        placeholder="검색..."
                        className="w-24 flex-shrink-0 px-2 py-1 text-xs theme-bg-secondary border theme-border rounded focus:outline-none focus:border-blue-500 theme-text-primary"
                      />
                    )}
                  </div>
                  <div className="h-[460px] max-h-[460px] overflow-auto p-2">
                    {selectedComponentId ? (
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const allClasses = selectedCss.classNames || []
                          // 검색 필터 적용
                          const filtered = classSearchQuery
                            ? allClasses.filter(cls => cls.toLowerCase().includes(classSearchQuery.toLowerCase()))
                            : allClasses
                          // 선택된 클래스 최상위 정렬
                          const sorted = [...filtered].sort((a, b) => {
                            const aAssigned = assignedClasses.includes(a)
                            const bAssigned = assignedClasses.includes(b)
                            if (aAssigned && !bAssigned) return -1
                            if (!aAssigned && bAssigned) return 1
                            return 0
                          })
                          return sorted.map(cls => {
                            const isAssigned = assignedClasses.includes(cls)
                            return (
                              <button
                                key={cls}
                                onClick={() => toggleClassForComponent(selectedCssId, selectedComponentId, cls)}
                                className={`px-2 py-1 text-xs rounded font-mono ${
                                  isAssigned
                                    ? 'bg-blue-600 text-white'
                                    : 'theme-bg-tertiary theme-text-secondary theme-bg-hover'
                                }`}
                              >
                                .{cls}
                              </button>
                            )
                          })
                        })()}
                      </div>
                    ) : (
                      <div className="text-center theme-text-secondary text-sm py-4">
                        왼쪽에서 컴포넌트를 선택하세요
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center theme-text-secondary text-sm py-4">
                위에서 CSS 파일을 선택하세요
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // 기본 리스트 모드 (subView === 'list')
  return (
    <div className="space-y-4">
      {/* 탭 전환 */}
      <div className="flex gap-2">
        <button
          onClick={() => setSubView('list')}
          className="px-3 py-1 text-sm rounded bg-blue-600 text-white"
        >
          CSS 파일
        </button>
        <button
          onClick={() => setSubView('mapping')}
          className="px-3 py-1 text-sm rounded theme-bg-tertiary theme-text-secondary theme-bg-hover"
        >
          클래스 매핑
        </button>
      </div>

      {/* 파일 업로드 */}
      <div>
        {(window as unknown as { __vscode?: unknown }).__vscode ? (
          <button
            onClick={handleVsCodeFileSelect}
            className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed theme-border rounded-lg cursor-pointer hover:border-blue-500 theme-bg-hover transition-colors"
          >
            <div className="text-center">
              <svg className="w-6 h-6 mx-auto theme-text-secondary mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm theme-text-secondary">클릭하여 CSS 파일 선택</span>
            </div>
          </button>
        ) : (
          <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed theme-border rounded-lg cursor-pointer hover:border-blue-500 theme-bg-hover transition-colors">
            <input
              type="file"
              accept=".css"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="text-center">
              <svg className="w-6 h-6 mx-auto theme-text-secondary mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm theme-text-secondary">클릭하여 CSS 파일 선택</span>
            </div>
          </label>
        )}
      </div>

      {/* 이미지 에셋 업로드 (웹 전용) — CSS url() 참조 이미지를 서버에 올림 */}
      {!isVsCodeEnv() && (
        <div className="border theme-border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm theme-text-secondary">
              업로드된 에셋 ({uploadedImages.length}){imageUploading && ' · 업로드 중…'}
            </span>
            <div className="flex gap-2">
              <label className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer">
                + 이미지
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => handleImageUpload(e, false)} />
              </label>
              <label className="px-2 py-1 text-xs theme-bg-tertiary theme-text-secondary border theme-border rounded cursor-pointer hover:border-blue-500">
                + 폴더 업로드
                <input type="file" multiple className="hidden"
                  {...{ webkitdirectory: '', directory: '' }}
                  onChange={(e) => handleImageUpload(e, true)} />
              </label>
            </div>
          </div>
          <p className="text-xs theme-text-secondary">
            CSS가 <code>url(../images/…)</code>, <code>url(../font/…)</code>로 참조하는 파일을 올립니다.
            <b> 폴더 업로드</b>는 선택한 폴더명이 그대로 경로가 됩니다 — <code>images</code> 폴더 선택 → <code>images/base2/…</code>, <code>font</code> 폴더 선택 → <code>font/…</code>.
          </p>
        </div>
      )}

      {/* 업로드 진행/결과 모달 */}
      {uploadProgress && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-md mx-4 theme-bg-secondary rounded-lg shadow-xl p-6">
            {!uploadProgress.done ? (
              <>
                <h3 className="text-sm font-semibold theme-text-primary mb-3">
                  에셋 업로드 중… ({uploadProgress.current} / {uploadProgress.total})
                </h3>
                {/* 프로그레스 바 */}
                <div className="w-full h-2 theme-bg-tertiary rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-blue-600 transition-all duration-200"
                    style={{ width: `${uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0}%` }}
                  />
                </div>
                <p className="text-xs theme-text-secondary truncate" title={uploadProgress.currentFile}>
                  {uploadProgress.currentFile || '준비 중…'}
                </p>
                {uploadProgress.failed.length > 0 && (
                  <p className="text-xs text-red-500 mt-1">실패 {uploadProgress.failed.length}개 (완료 후 목록 표시)</p>
                )}
                <p className="text-xs theme-text-secondary mt-3">업로드가 끝날 때까지 창을 닫지 마세요.</p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold theme-text-primary mb-2">
                  업로드 완료 — 성공 {uploadProgress.total - uploadProgress.failed.length}개 · <span className="text-red-500">실패 {uploadProgress.failed.length}개</span>
                </h3>
                <p className="text-xs theme-text-secondary mb-2">
                  실패한 파일 (같은 폴더를 다시 업로드하면 성공한 파일은 덮어쓰고 실패분만 다시 올라갑니다):
                </p>
                <div className="max-h-48 overflow-auto border theme-border rounded p-2 mb-4">
                  {uploadProgress.failed.map(f => (
                    <div key={f} className="text-xs font-mono text-red-500 truncate" title={f}>{f}</div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setUploadProgress(null)}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    닫기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CSS 목록 */}
      <div className="border theme-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 theme-bg-tertiary border-b theme-border">
          <span className="text-sm theme-text-secondary">CSS 파일 ({cssList.length})</span>
          <button
            onClick={handleAddNew}
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            + 직접 추가
          </button>
        </div>
        <div className="h-[430px] overflow-auto">
          {cssList.length === 0 ? (
            <div className="px-3 py-4 text-center theme-text-secondary text-sm">
              등록된 CSS가 없습니다
            </div>
          ) : (
            cssList.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-3 py-2 border-b theme-border theme-bg-hover"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm theme-text-primary truncate">{item.name}</span>
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {item.classNames?.length || 0} 클래스
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1 theme-text-secondary hover:text-blue-400"
                    title="편집"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 theme-text-secondary hover:text-red-400"
                    title="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 상태 표시 */}
      {cssList.length > 0 && (
        <div className="text-xs theme-text-secondary">
          총 {new Set(cssList.flatMap(item => item.classNames || [])).size}개 클래스 추출됨
        </div>
      )}
    </div>
  )
}

// ---- 매핑룰 탭 ----
type MappingRulesSubView = 'default' | 'export'

function MappingRulesTab({ projectId, onCssChange }: { projectId?: string | null; onCssChange?: () => void }) {
  const { showConfirm } = useDialog()
  const [subView, setSubView] = useState<MappingRulesSubView>('default')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // Default mapping rules state
  const [defaultRules, setDefaultRules] = useState<DefaultMappingRuleGrouped[]>([])
  const [registry, setRegistry] = useState<RegistryItem[]>([])
  const [rulesLoading, setRulesLoading] = useState(true)
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set())
  const [newKeyword, setNewKeyword] = useState<{ [registryId: string]: string }>({})
  const [showAddComponent, setShowAddComponent] = useState(false)
  const [selectedNewComponent, setSelectedNewComponent] = useState<string>('')

  // 데이터 로드
  const loadData = async () => {
    if (!projectId) {
      setRulesLoading(false)
      return
    }
    setRulesLoading(true)
    try {
      const [rules, reg] = await Promise.all([
        fetchDefaultMappingRulesGrouped(projectId),
        fetchRegistry(projectId),
      ])
      setDefaultRules(rules)
      setRegistry(reg)
    } catch {
      setStatus({ type: 'error', text: '데이터 로드 실패' })
    } finally {
      setRulesLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [projectId])

  // 컴포넌트 확장/축소 토글
  const toggleExpand = (registryId: string) => {
    setExpandedComponents(prev => {
      const next = new Set(prev)
      if (next.has(registryId)) {
        next.delete(registryId)
      } else {
        next.add(registryId)
      }
      return next
    })
  }

  // 키워드 추가
  const handleAddKeyword = async (registryId: string) => {
    if (!projectId) return
    const keyword = newKeyword[registryId]?.trim()
    if (!keyword) return

    try {
      await createDefaultMappingRule(projectId, { registryId, keyword })
      setNewKeyword(prev => ({ ...prev, [registryId]: '' }))
      await loadData()
      setStatus({ type: 'success', text: `키워드 "${keyword}" 추가됨` })
    } catch (err) {
      setStatus({ type: 'error', text: err instanceof Error ? err.message : '추가 실패' })
    }
  }

  // 키워드 삭제
  const handleDeleteKeyword = async (ruleId: string, keyword: string) => {
    try {
      await deleteDefaultMappingRule(ruleId)
      await loadData()
      setStatus({ type: 'success', text: `키워드 "${keyword}" 삭제됨` })
    } catch {
      setStatus({ type: 'error', text: '삭제 실패' })
    }
  }

  // 초기화 (기본값으로 복원)
  const handleReset = async () => {
    if (!projectId) return
    if (!await showConfirm('모든 기본 매핑 규칙을 삭제하고 기본값으로 복원하시겠습니까?')) return

    setLoading(true)
    try {
      const result = await resetDefaultMappingRules(projectId)
      await loadData()
      setStatus({ type: 'success', text: `${result.count}개 규칙으로 초기화됨` })
    } catch {
      setStatus({ type: 'error', text: '초기화 실패' })
    } finally {
      setLoading(false)
    }
  }

  // 새 컴포넌트 추가 (첫 키워드와 함께)
  const handleAddNewComponent = async () => {
    if (!projectId) return
    if (!selectedNewComponent) return
    const keyword = newKeyword[selectedNewComponent]?.trim()
    if (!keyword) {
      setStatus({ type: 'error', text: '키워드를 입력하세요' })
      return
    }

    try {
      await createDefaultMappingRule(projectId, { registryId: selectedNewComponent, keyword })
      setNewKeyword(prev => ({ ...prev, [selectedNewComponent]: '' }))
      setShowAddComponent(false)
      setSelectedNewComponent('')
      setExpandedComponents(prev => new Set(prev).add(selectedNewComponent))
      await loadData()
      setStatus({ type: 'success', text: '컴포넌트 규칙 추가됨' })
    } catch (err) {
      setStatus({ type: 'error', text: err instanceof Error ? err.message : '추가 실패' })
    }
  }

  // 규칙이 없는 컴포넌트 목록
  const componentsWithoutRules = registry.filter(
    r => !defaultRules.some(dr => dr.registryId === r.id)
  )

  const handleExport = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const data = await exportMappingRules(projectId)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mapping-rules-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setStatus({ type: 'success', text: '다운로드 완료' })
    } catch {
      setStatus({ type: 'error', text: '내보내기 실패' })
    } finally {
      setLoading(false)
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!projectId) return
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        setLoading(true)
        const data = JSON.parse(ev.target?.result as string) as MappingRulesJson
        if (data.version !== 1 && data.version !== 2) throw new Error('지원하지 않는 버전')
        const result = await importMappingRules(projectId, data) as { defaultAdded: number; clusterUpdated: number; cssImported?: boolean }
        const cssMsg = result.cssImported ? ', CSS 설정 적용됨' : ''
        setStatus({ type: 'success', text: `가져오기 완료 — 기본규칙 ${result.defaultAdded}개 추가, 커스텀룰 ${result.clusterUpdated}개 적용${cssMsg}` })
        await loadData()
        if (result.cssImported && onCssChange) {
          onCssChange()
        }
      } catch (err) {
        setStatus({ type: 'error', text: err instanceof Error ? err.message : '가져오기 실패' })
      } finally {
        setLoading(false)
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      {/* 서브 탭 */}
      <div className="flex gap-2">
        <button
          onClick={() => setSubView('default')}
          className={`px-3 py-1 text-sm rounded ${
            subView === 'default' ? 'bg-blue-600 text-white' : 'theme-bg-tertiary theme-text-secondary theme-bg-hover'
          }`}
        >
          기본 매핑 규칙
        </button>
        <button
          onClick={() => setSubView('export')}
          className={`px-3 py-1 text-sm rounded ${
            subView === 'export' ? 'bg-blue-600 text-white' : 'theme-bg-tertiary theme-text-secondary theme-bg-hover'
          }`}
        >
          내보내기/가져오기
        </button>
      </div>

      {/* 상태 메시지 */}
      {status && (
        <div className={`text-sm px-3 py-2 rounded ${status.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {status.text}
          <button onClick={() => setStatus(null)} className="ml-2 opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {subView === 'default' && (
        <div className="space-y-3">
          {rulesLoading ? (
            <div className="text-center theme-text-secondary py-4">로딩 중...</div>
          ) : (
            <>
              {/* 컴포넌트 추가 버튼 */}
              {componentsWithoutRules.length > 0 && !showAddComponent && (
                <button
                  onClick={() => setShowAddComponent(true)}
                  className="w-full px-3 py-2 border-2 border-dashed theme-border rounded-lg text-sm theme-text-secondary hover:border-blue-500 theme-text-hover"
                >
                  + 컴포넌트 규칙 추가
                </button>
              )}

              {/* 새 컴포넌트 추가 폼 */}
              {showAddComponent && (
                <div className="border theme-border rounded-lg p-3 theme-bg-tertiary space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedNewComponent}
                      onChange={(e) => setSelectedNewComponent(e.target.value)}
                      className="flex-1 px-3 py-2 theme-bg-tertiary border theme-border rounded text-sm theme-text-primary"
                    >
                      <option value="">컴포넌트 선택...</option>
                      {componentsWithoutRules.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => { setShowAddComponent(false); setSelectedNewComponent('') }}
                      className="px-2 py-2 theme-text-secondary theme-text-hover"
                    >
                      ×
                    </button>
                  </div>
                  {selectedNewComponent && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newKeyword[selectedNewComponent] || ''}
                        onChange={(e) => setNewKeyword(prev => ({ ...prev, [selectedNewComponent]: e.target.value }))}
                        placeholder="첫 번째 키워드 입력"
                        className="flex-1 px-3 py-2 theme-bg-secondary border theme-border rounded text-sm theme-text-primary"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNewComponent()}
                      />
                      <button
                        onClick={handleAddNewComponent}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded"
                      >
                        추가
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 규칙 목록 */}
              <div className="border theme-border rounded-lg h-[468px] max-h-[468px] overflow-y-auto">
                {defaultRules.length === 0 ? (
                  <div className="px-3 py-4 text-center theme-text-secondary text-sm">
                    등록된 기본 매핑 규칙이 없습니다
                  </div>
                ) : (
                  defaultRules.map(group => {
                    const isExpanded = expandedComponents.has(group.registryId)
                    return (
                      <div key={group.registryId} className="border-b theme-border last:border-b-0">
                        {/* 컴포넌트 헤더 */}
                        <button
                          onClick={() => toggleExpand(group.registryId)}
                          className="w-full px-3 py-2 flex items-center justify-between theme-bg-hover"
                        >
                          <div className="flex items-center gap-2">
                            <svg
                              className={`w-4 h-4 theme-text-secondary transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-sm font-medium theme-text-primary">{group.registryName}</span>
                          </div>
                          <span className="text-xs theme-bg-tertiary px-2 py-0.5 rounded theme-text-secondary">
                            {group.keywords.length}개 키워드
                          </span>
                        </button>

                        {/* 키워드 목록 */}
                        {isExpanded && (
                          <div className="px-3 py-2 theme-bg-tertiary space-y-2">
                            {/* 기존 키워드 */}
                            <div className="flex flex-wrap gap-1">
                              {group.rules.map(rule => (
                                <span
                                  key={rule.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-800/50 border border-blue-200 dark:border-blue-600 rounded text-sm text-blue-700 dark:text-blue-200"
                                >
                                  {rule.keyword}
                                  <button
                                    onClick={() => handleDeleteKeyword(rule.id, rule.keyword)}
                                    className="text-blue-400 hover:text-red-400"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>

                            {/* 키워드 추가 */}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newKeyword[group.registryId] || ''}
                                onChange={(e) => setNewKeyword(prev => ({ ...prev, [group.registryId]: e.target.value }))}
                                placeholder="새 키워드..."
                                className="flex-1 px-2 py-1 theme-bg-secondary border theme-border rounded text-sm theme-text-primary placeholder-gray-500"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword(group.registryId)}
                              />
                              <button
                                onClick={() => handleAddKeyword(group.registryId)}
                                disabled={!newKeyword[group.registryId]?.trim()}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs rounded"
                              >
                                추가
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              <p className="text-xs theme-text-secondary">
                노드 이름에 키워드가 포함되면 해당 컴포넌트로 자동 매핑됩니다. (대소문자 무시)
              </p>

              {/* 초기화 버튼 */}
              <div className="pt-2 border-t theme-border">
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs theme-bg-tertiary theme-bg-hover theme-text-primary rounded disabled:opacity-50"
                >
                  {loading ? '초기화 중...' : '기본값으로 초기화'}
                </button>
                <span className="ml-2 text-xs theme-text-secondary">모든 규칙을 삭제하고 기본값으로 복원합니다.</span>
              </div>
            </>
          )}
        </div>
      )}

      {subView === 'export' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium theme-text-primary mb-1">매핑룰 내보내기</h3>
            <p className="text-xs theme-text-secondary mb-3">기본 매핑 규칙과 커스텀 매핑 규칙을 JSON 파일로 저장합니다.</p>
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded"
            >
              {loading ? '처리 중...' : '다운로드'}
            </button>
          </div>

          <div className="border-t theme-border pt-6">
            <h3 className="text-sm font-medium theme-text-primary mb-1">매핑룰 가져오기</h3>
            <p className="text-xs theme-text-secondary mb-3">JSON 파일을 불러와 규칙을 적용합니다. 기본규칙은 중복 키워드를 건너뛰고, 커스텀룰은 시그니처 기준으로 덮어씁니다.</p>
            <label className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded cursor-pointer inline-block">
              파일 선택
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
                disabled={loading}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettingsModal({ isOpen, onClose, onSaveToken, onCssChange, onRegistryChange, projectId, projectName }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic')

  // 모달 열릴 때 기본 탭으로 리셋
  useEffect(() => {
    if (isOpen) {
      setActiveTab('basic')
    }
  }, [isOpen])

  if (!isOpen) return null

  const tabs: { id: TabType; label: string }[] = [
    { id: 'basic', label: '기본' },
    { id: 'components', label: '컴포넌트' },
    { id: 'css', label: 'CSS' },
    { id: 'mappingRules', label: '매핑룰' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative theme-bg-secondary rounded-lg shadow-xl w-full max-w-lg mx-4 h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-lg font-semibold theme-text-primary">설정</h2>
            {projectId && projectName && (
              <p className="text-sm theme-text-secondary mt-1">프로젝트: {projectName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="theme-text-secondary hover:theme-text-primary p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b theme-border px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-500 border-blue-500'
                  : 'theme-text-secondary border-transparent hover:theme-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 */}
        <div className="p-6 flex-1 overflow-auto">
          {activeTab === 'basic' && (
            <BasicTab onSaveToken={onSaveToken} onClose={onClose} projectId={projectId} onCssChange={onCssChange} />
          )}
          {activeTab === 'components' && <ComponentsTab projectId={projectId} onRegistryChange={onRegistryChange} />}
          {activeTab === 'css' && <CssTab projectId={projectId} onCssChange={onCssChange} />}
          {activeTab === 'mappingRules' && <MappingRulesTab projectId={projectId} onCssChange={onCssChange} />}
        </div>
      </div>
    </div>
  )
}
