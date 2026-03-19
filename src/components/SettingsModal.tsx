import { useState, useEffect } from 'react'
import { fetchRegistry, createRegistryItem, updateRegistryItem, deleteRegistryItem, exportMappingRules, importMappingRules } from '../utils/api'
import type { RegistryItem, MappingRulesJson } from '../utils/api'
import { useTheme } from '../contexts/ThemeContext'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  token: string
  onSaveToken: (token: string) => void
}

type TabType = 'basic' | 'components' | 'css' | 'mappingRules'

const STORAGE_KEY = 'figma-viewer-token'
const CSS_STORAGE_KEY = 'figma-viewer-css-list'
const CSS_CLASS_MAPPING_KEY = 'figma-viewer-css-class-mapping'
const XML_EXPORT_PATH_KEY = 'figma-viewer-xml-export-path'

export interface CssItem {
  id: string
  name: string
  content: string
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
  const classRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)(?=[\s\t\r\n,{:[>+~])/g
  const classes = new Set<string>()
  let match
  while ((match = classRegex.exec(cssContent)) !== null) {
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

// 컴포넌트-클래스 매핑 로드
export function loadComponentClassMapping(): ComponentClassMapping {
  const data = localStorage.getItem(CSS_CLASS_MAPPING_KEY)
  if (!data) return {}
  try {
    return JSON.parse(data)
  } catch {
    return {}
  }
}

// 컴포넌트-클래스 매핑 저장
export function saveComponentClassMapping(mapping: ComponentClassMapping): void {
  localStorage.setItem(CSS_CLASS_MAPPING_KEY, JSON.stringify(mapping))
}

export function loadSavedToken(): string {
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function saveToken(token: string): void {
  if (token) {
    localStorage.setItem(STORAGE_KEY, token)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function loadXmlExportPath(): string {
  return localStorage.getItem(XML_EXPORT_PATH_KEY) || ''
}

export function saveXmlExportPath(path: string): void {
  if (path) {
    localStorage.setItem(XML_EXPORT_PATH_KEY, path)
  } else {
    localStorage.removeItem(XML_EXPORT_PATH_KEY)
  }
}

export function loadSavedCssList(): CssItem[] {
  const data = localStorage.getItem(CSS_STORAGE_KEY)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

export function saveCssList(items: CssItem[]): void {
  if (items.length > 0) {
    localStorage.setItem(CSS_STORAGE_KEY, JSON.stringify(items))
  } else {
    localStorage.removeItem(CSS_STORAGE_KEY)
  }
}

export function applyCssToPage(items: CssItem[]): void {
  // 기존 스타일 제거
  document.querySelectorAll('style[data-custom-css]').forEach(el => el.remove())

  // 새 스타일 적용
  items.forEach(item => {
    const styleEl = document.createElement('style')
    styleEl.setAttribute('data-custom-css', item.id)
    styleEl.textContent = item.content
    document.head.appendChild(styleEl)
  })
}

// 기본 탭 컴포넌트
function BasicTab({ token, onSaveToken, onClose }: { token: string; onSaveToken: (t: string) => void; onClose: () => void }) {
  const [inputToken, setInputToken] = useState(token)
  const [xmlExportPath, setXmlExportPath] = useState(loadXmlExportPath())
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setInputToken(token)
  }, [token])

  const handleSave = () => {
    saveToken(inputToken)
    saveXmlExportPath(xmlExportPath)
    onSaveToken(inputToken)
    onClose()
  }

  const handleClearToken = () => {
    setInputToken('')
    saveToken('')
    onSaveToken('')
  }

  const handleClearPath = () => {
    setXmlExportPath('')
    saveXmlExportPath('')
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
                ? 'border-blue-500 bg-gray-800'
                : 'border-gray-600 hover:border-gray-500 bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
              <span className="text-sm text-gray-300">다크</span>
            </div>
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
              theme === 'light'
                ? 'border-blue-500 bg-gray-100'
                : 'border-gray-600 hover:border-gray-500 bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className={`w-5 h-5 ${theme === 'light' ? 'text-yellow-500' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
              <span className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>라이트</span>
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
            <div className="flex items-center text-sm text-green-500">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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

      {/* XML Export Path */}
      <div>
        <label className="block text-sm font-medium theme-text-primary mb-2">
          XML Export 경로
        </label>
        <input
          type="text"
          value={xmlExportPath}
          onChange={(e) => setXmlExportPath(e.target.value)}
          placeholder="C:\exports\xml 또는 /home/user/exports"
          className="w-full px-4 py-2 theme-bg-secondary border theme-border rounded-lg theme-text-primary placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm"
        />
        <p className="text-xs theme-text-secondary mt-1">
          XML 파일을 저장할 기본 경로 (비어있으면 다운로드 폴더 사용)
        </p>
        {xmlExportPath && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center text-sm text-green-500">
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

      {/* 저장 버튼 */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          저장
        </button>
      </div>
    </div>
  )
}

// 컴포넌트 탭 컴포넌트
function ComponentsTab() {
  const [registry, setRegistry] = useState<RegistryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', tagName: '', properties: '' })
  const [error, setError] = useState<string | null>(null)

  const loadRegistry = async () => {
    try {
      const items = await fetchRegistry()
      setRegistry(items)
    } catch {
      setError('컴포넌트 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRegistry()
  }, [])

  const resetForm = () => {
    setFormData({ name: '', tagName: '', properties: '' })
    setShowAddForm(false)
    setEditingId(null)
    setError(null)
  }

  const handleAdd = async () => {
    if (!formData.name || !formData.tagName) {
      setError('이름과 태그명은 필수입니다')
      return
    }

    try {
      let props: Record<string, string> = {}
      if (formData.properties.trim()) {
        props = JSON.parse(formData.properties)
      }
      await createRegistryItem({ name: formData.name, tagName: formData.tagName, properties: props })
      await loadRegistry()
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
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 실패')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 컴포넌트를 삭제하시겠습니까?')) return

    try {
      await deleteRegistryItem(id)
      await loadRegistry()
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
    return <div className="text-gray-400 text-center py-8">로딩 중...</div>
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
        <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-white">
            {editingId ? '컴포넌트 수정' : '새 컴포넌트 추가'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">이름</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="button"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">태그명</label>
              <input
                type="text"
                value={formData.tagName}
                onChange={(e) => setFormData({ ...formData, tagName: e.target.value })}
                placeholder="w2:button"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">속성 (JSON)</label>
            <textarea
              value={formData.properties}
              onChange={(e) => setFormData({ ...formData, properties: e.target.value })}
              placeholder='{"appearance": "full"}'
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-600 rounded"
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
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-700/50 border-b border-gray-700">
          <span className="text-sm text-gray-300">컴포넌트 목록 ({registry.length})</span>
          {!showAddForm && !editingId && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              + 추가
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-auto">
          {registry.length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-sm">
              등록된 컴포넌트가 없습니다
            </div>
          ) : (
            registry.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between px-3 py-2 border-b border-gray-700 last:border-b-0 hover:bg-gray-700/30 ${
                  editingId === item.id ? 'bg-blue-900/20' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">{item.name}</span>
                    <span className="text-xs text-gray-500 font-mono">{item.tagName}</span>
                  </div>
                  {Object.keys(item.properties).length > 0 && (
                    <div className="text-xs text-gray-500 truncate">
                      {Object.entries(item.properties).map(([k, v]) => `${k}="${v}"`).join(' ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1 text-gray-400 hover:text-blue-400"
                    title="수정"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-gray-400 hover:text-red-400"
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
function CssTab() {
  const [cssList, setCssList] = useState<CssItem[]>([])
  const [editingItem, setEditingItem] = useState<CssItem | null>(null)
  const [subView, setSubView] = useState<CssSubView>('list')
  const [registry, setRegistry] = useState<RegistryItem[]>([])
  const [componentClassMapping, setComponentClassMapping] = useState<ComponentClassMapping>({})
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const [selectedCssId, setSelectedCssId] = useState<string | null>(null)

  // 초기 데이터 로드
  useEffect(() => {
    setCssList(loadSavedCssList())
    setComponentClassMapping(loadComponentClassMapping())
    fetchRegistry().then(setRegistry).catch((e) => console.error('Failed to fetch registry:', e))
  }, [])

  // 매핑 모드 진입 시 첫 번째 CSS 파일 자동 선택
  useEffect(() => {
    if (subView === 'mapping' && !selectedCssId && cssList.length > 0) {
      setSelectedCssId(cssList[0].id)
    }
  }, [subView, cssList, selectedCssId])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newItems: CssItem[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.name.endsWith('.css')) continue

      const content = await file.text()
      const classNames = extractClassNames(content)
      newItems.push({
        id: `css-${Date.now()}-${i}`,
        name: file.name,
        content,
        classNames,
      })
    }

    if (newItems.length > 0) {
      const updated = [...cssList, ...newItems]
      setCssList(updated)
      saveCssList(updated)

      // 각 CSS 파일별로 자동 매핑 적용
      if (registry.length > 0) {
        let currentMapping = { ...componentClassMapping }
        for (const item of newItems) {
          if (item.classNames.length > 0) {
            currentMapping = autoMapClassesToComponents(item.id, item.classNames, registry, currentMapping)
          }
        }
        setComponentClassMapping(currentMapping)
        saveComponentClassMapping(currentMapping)
      }
    }

    e.target.value = ''
  }

  const handleDelete = (id: string) => {
    const updated = cssList.filter(item => item.id !== id)
    setCssList(updated)
    saveCssList(updated)
  }

  const handleEdit = (item: CssItem) => {
    setEditingItem({ ...item })
    setSubView('edit')
  }

  const handleSaveEdit = () => {
    if (!editingItem) return

    const classNames = extractClassNames(editingItem.content)
    const updatedItem = { ...editingItem, classNames }
    const updated = cssList.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    )
    setCssList(updated)
    saveCssList(updated)

    // 새로 추출된 클래스에 대해 자동 매핑 적용
    if (classNames.length > 0 && registry.length > 0) {
      const autoMapped = autoMapClassesToComponents(editingItem.id, classNames, registry, componentClassMapping)
      setComponentClassMapping(autoMapped)
      saveComponentClassMapping(autoMapped)
    }

    setEditingItem(null)
    setSubView('list')
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

  const handleSaveNew = () => {
    if (!editingItem || !editingItem.content.trim()) return

    const classNames = extractClassNames(editingItem.content)
    const newItem = { ...editingItem, classNames }
    const updated = [...cssList, newItem]
    setCssList(updated)
    saveCssList(updated)

    // 새로 추출된 클래스에 대해 자동 매핑 적용
    if (classNames.length > 0 && registry.length > 0) {
      const autoMapped = autoMapClassesToComponents(editingItem.id, classNames, registry, componentClassMapping)
      setComponentClassMapping(autoMapped)
      saveComponentClassMapping(autoMapped)
    }

    setEditingItem(null)
    setSubView('list')
  }

  const handleCancelEdit = () => {
    setEditingItem(null)
    setSubView('list')
  }

  // 컴포넌트-클래스 매핑 토글 (CSS 파일별)
  const toggleClassForComponent = (cssId: string, componentId: string, className: string) => {
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
    saveComponentClassMapping(newMapping)
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
          <h3 className="text-sm font-medium text-white">
            {isNewItem ? '새 CSS 추가' : 'CSS 편집'}
          </h3>
          <button
            onClick={handleCancelEdit}
            className="text-gray-400 hover:text-white text-sm"
          >
            취소
          </button>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">파일명</label>
          <input
            type="text"
            value={editingItem.name}
            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">CSS 내용</label>
          <textarea
            value={editingItem.content}
            onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
            placeholder="/* CSS 스타일을 입력하세요 */"
            rows={10}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
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
  const handleAutoMap = () => {
    if (!selectedCssId || !selectedCss || registry.length === 0) return
    const autoMapped = autoMapClassesToComponents(selectedCssId, selectedCss.classNames, registry, componentClassMapping)
    setComponentClassMapping(autoMapped)
    saveComponentClassMapping(autoMapped)
  }

  // 선택된 CSS 파일의 매핑 초기화
  const handleClearCssMappings = () => {
    if (!selectedCssId) return
    if (!confirm('이 CSS 파일의 클래스 매핑을 초기화하시겠습니까?')) return
    const newMapping = { ...componentClassMapping }
    delete newMapping[selectedCssId]
    setComponentClassMapping(newMapping)
    saveComponentClassMapping(newMapping)
  }

  // 클래스 매핑 모드
  if (subView === 'mapping') {
    return (
      <div className="space-y-4">
        {/* 탭 전환 */}
        <div className="flex gap-2">
          <button
            onClick={() => setSubView('list')}
            className="px-3 py-1 text-sm rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
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
          <h3 className="text-sm font-medium text-white">CSS 파일별 클래스 매핑</h3>
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
                className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
              >
                초기화
              </button>
            </div>
          )}
        </div>

        {cssList.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">
            CSS 파일이 없습니다.<br />
            먼저 CSS 파일을 추가해주세요.
          </div>
        ) : (
          <div className="space-y-3">
            {/* CSS 파일 탭 */}
            <div className="border-b border-gray-700">
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
                          ? 'border-blue-500 text-blue-400 bg-blue-900/20'
                          : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                      }`}
                    >
                      <span>{css.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
                      }`}>
                        {css.classNames?.length || 0}
                      </span>
                      {mappingCount > 0 && (
                        <span className="text-xs text-green-400">({mappingCount} 매핑)</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedCssId && selectedCss ? (
              <div className="flex gap-3">
                {/* 컴포넌트 목록 */}
                <div className="w-1/3 border border-gray-700 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-700/50 border-b border-gray-700">
                    <span className="text-xs text-gray-400">컴포넌트</span>
                  </div>
                  <div className="max-h-48 overflow-auto">
                    {registry.map(comp => {
                      const classCount = (componentClassMapping[selectedCssId]?.[comp.id] || []).length
                      return (
                        <button
                          key={comp.id}
                          onClick={() => setSelectedComponentId(comp.id)}
                          className={`w-full px-3 py-2 text-left text-sm border-b border-gray-700 last:border-b-0 flex items-center justify-between ${
                            selectedComponentId === comp.id
                              ? 'bg-blue-900/50 text-blue-400'
                              : 'text-white hover:bg-gray-700/50'
                          }`}
                        >
                          <span>{comp.name}</span>
                          {classCount > 0 && (
                            <span className="text-xs bg-blue-600 px-1.5 py-0.5 rounded">{classCount}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 클래스 목록 */}
                <div className="flex-1 border border-gray-700 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-700/50 border-b border-gray-700">
                    <span className="text-xs text-gray-400">
                      {selectedComponent
                        ? `${selectedCss.name} → ${selectedComponent.name}`
                        : `${selectedCss.name}의 클래스 (${selectedCss.classNames?.length || 0}개)`}
                    </span>
                  </div>
                  <div className="max-h-48 overflow-auto p-2">
                    {selectedComponentId ? (
                      <div className="flex flex-wrap gap-1">
                        {(selectedCss.classNames || []).map(cls => {
                          const isAssigned = assignedClasses.includes(cls)
                          return (
                            <button
                              key={cls}
                              onClick={() => toggleClassForComponent(selectedCssId, selectedComponentId, cls)}
                              className={`px-2 py-1 text-xs rounded font-mono ${
                                isAssigned
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              .{cls}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 text-sm py-4">
                        왼쪽에서 컴포넌트를 선택하세요
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 text-sm py-4">
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
          className="px-3 py-1 text-sm rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
        >
          클래스 매핑
        </button>
      </div>

      {/* 파일 업로드 */}
      <div>
        <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-gray-500 hover:bg-gray-700/30 transition-colors">
          <input
            type="file"
            accept=".css"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="text-center">
            <svg className="w-6 h-6 mx-auto text-gray-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm text-gray-400">클릭하여 CSS 파일 선택</span>
          </div>
        </label>
      </div>

      {/* CSS 목록 */}
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-700/50 border-b border-gray-700">
          <span className="text-sm text-gray-300">CSS 파일 ({cssList.length})</span>
          <button
            onClick={handleAddNew}
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            + 직접 추가
          </button>
        </div>
        <div className="max-h-48 overflow-auto">
          {cssList.length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-sm">
              등록된 CSS가 없습니다
            </div>
          ) : (
            cssList.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-3 py-2 border-b border-gray-700 last:border-b-0 hover:bg-gray-700/30"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-white truncate">{item.name}</span>
                  <span className="text-xs text-green-400">
                    {item.classNames?.length || 0} 클래스
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1 text-gray-400 hover:text-blue-400"
                    title="편집"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-gray-400 hover:text-red-400"
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
        <div className="text-xs text-gray-400">
          총 {new Set(cssList.flatMap(item => item.classNames || [])).size}개 클래스 추출됨
        </div>
      )}
    </div>
  )
}

// ---- 매핑룰 탭 ----
function MappingRulesTab() {
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    try {
      setLoading(true)
      const data = await exportMappingRules()
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
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        setLoading(true)
        const data = JSON.parse(ev.target?.result as string) as MappingRulesJson
        if (data.version !== 1) throw new Error('지원하지 않는 버전')
        const result = await importMappingRules(data)
        setStatus({ type: 'success', text: `가져오기 완료 — 기본규칙 ${result.defaultAdded}개 추가, 커스텀룰 ${result.clusterUpdated}개 적용` })
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

      {status && (
        <div className={`text-sm px-3 py-2 rounded ${status.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {status.text}
        </div>
      )}
    </div>
  )
}

export default function SettingsModal({ isOpen, onClose, token, onSaveToken }: SettingsModalProps) {
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
      <div className="relative theme-bg-secondary rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold theme-text-primary">설정</h2>
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
        <div className="p-6">
          {activeTab === 'basic' && (
            <BasicTab token={token} onSaveToken={onSaveToken} onClose={onClose} />
          )}
          {activeTab === 'components' && <ComponentsTab />}
          {activeTab === 'css' && <CssTab />}
          {activeTab === 'mappingRules' && <MappingRulesTab />}
        </div>
      </div>
    </div>
  )
}
