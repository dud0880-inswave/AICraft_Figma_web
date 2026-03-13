import { useState, useEffect, useRef } from 'react'
import type { FigmaNode } from '../types/figma'
import type { RegistryItem, NodeMapping } from '../utils/api'
import { fetchRegistry, fetchMapping, saveMapping, deleteMapping } from '../utils/api'
import { loadSavedCssList, loadComponentClassMapping, type CssItem, type ComponentClassMapping } from './SettingsModal'

interface MappingEditorProps {
  node: FigmaNode | null  // 단일 선택 (프리뷰용)
  nodes: FigmaNode[]  // 다중 선택 (일괄 적용용)
  fileKey: string | null
  onRegistryLoad?: (registry: RegistryItem[]) => void
  onMappingChange?: () => void
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

  // 첫 번째 자식(행)의 텍스트들을 수집
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

export default function MappingEditor({ node, nodes, fileKey, onRegistryLoad, onMappingChange }: MappingEditorProps) {
  const [registry, setRegistry] = useState<RegistryItem[]>([])
  const [mapping, setMapping] = useState<NodeMapping | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cssList, setCssList] = useState<CssItem[]>([])
  const [componentClassMapping, setComponentClassMapping] = useState<ComponentClassMapping>({})
  const [selectedCssId, setSelectedCssId] = useState<string | null>(null)
  const [topHeight, setTopHeight] = useState<number | null>(null) // null = 콘텐츠 높이 auto
  const [isDragging, setIsDragging] = useState(false)
  const [classSearchQuery, setClassSearchQuery] = useState('')
  const [newAttrKey, setNewAttrKey] = useState('')
  const [newAttrValue, setNewAttrValue] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const splitContainerRef = useRef<HTMLDivElement>(null)

  // CSS 목록 및 매핑 로드
  useEffect(() => {
    const list = loadSavedCssList()
    setCssList(list)
    setComponentClassMapping(loadComponentClassMapping())
    if (list.length > 0 && !selectedCssId) {
      setSelectedCssId(list[0].id)
    }
  }, [])

  // 레지스트리 로드
  useEffect(() => {
    const load = async () => {
      try {
        const items = await fetchRegistry()
        setRegistry(items)
        onRegistryLoad?.(items)
      } catch {
        // ignore
      }
    }
    load()
  }, [])

  // 노드 변경 시 매핑 로드
  useEffect(() => {
    if (!node || !fileKey) {
      setMapping(null)
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const m = await fetchMapping(fileKey, node.id)
        setMapping(m)
      } catch {
        setMapping(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [node?.id, fileKey])

  // 매핑 변경 시 바인딩된 클래스가 있는 CSS 파일 우선 선택, 없으면 첫 번째 파일
  useEffect(() => {
    if (mapping?.registryId && cssList.length > 0) {
      const firstCssWithBoundClasses = cssList.find(css => {
        const classes = componentClassMapping[css.id]?.[mapping.registryId!] || []
        return classes.length > 0
      })
      if (firstCssWithBoundClasses) {
        setSelectedCssId(firstCssWithBoundClasses.id)
      } else if (!selectedCssId) {
        setSelectedCssId(cssList[0].id)
      }
    }
  }, [mapping?.registryId, cssList, componentClassMapping])

  // 컴포넌트 선택 (다중 노드 지원)
  const handleSelectComponent = async (item: RegistryItem) => {
    if (!fileKey) return
    const targetNodes = nodes.length > 0 ? nodes : (node ? [node] : [])
    if (targetNodes.length === 0) return

    setSaving(true)
    try {
      let lastMapping: NodeMapping | null = null
      for (const n of targetNodes) {
        lastMapping = await saveMapping({
          figmaFileKey: fileKey,
          figmaNodeId: n.id,
          figmaNodeName: n.name,
          figmaNodeType: n.type,
          registryId: item.id,
          registryName: item.name,
          registryTag: '',
          customAttrs: {},
          status: 'mapped',
        })
      }
      if (lastMapping && targetNodes.length === 1) {
        setMapping(lastMapping)
      }
      onMappingChange?.()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  // 매핑 해제 (다중 노드 지원)
  const handleClearMapping = async () => {
    if (!fileKey) return
    const targetNodes = nodes.length > 0 ? nodes : (node ? [node] : [])
    if (targetNodes.length === 0) return

    setSaving(true)
    try {
      for (const n of targetNodes) {
        await deleteMapping(fileKey, n.id)
      }
      setMapping(null)
      onMappingChange?.()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  // 클래스 토글 (다중 노드 지원)
  const handleToggleClass = async (className: string) => {
    if (!fileKey || !mapping) return
    const targetNodes = nodes.length > 0 ? nodes : (node ? [node] : [])
    if (targetNodes.length === 0) return

    setSaving(true)
    try {
      let lastMapping: NodeMapping | null = null
      for (const n of targetNodes) {
        // 각 노드의 기존 매핑 가져오기
        const nodeMapping = await fetchMapping(fileKey, n.id)
        if (nodeMapping) {
          const nodeCurrentClasses = (nodeMapping.customAttrs?.class || '').split(' ').filter(Boolean)
          const nodeNewClasses = nodeCurrentClasses.includes(className)
            ? nodeCurrentClasses.filter(c => c !== className)
            : [...nodeCurrentClasses, className]

          lastMapping = await saveMapping({
            figmaFileKey: fileKey,
            figmaNodeId: n.id,
            figmaNodeName: n.name,
            figmaNodeType: n.type,
            registryId: nodeMapping.registryId,
            registryName: nodeMapping.registryName,
            registryTag: nodeMapping.registryTag || '',
            customAttrs: { ...nodeMapping.customAttrs, class: nodeNewClasses.join(' ') },
            status: 'mapped',
          })
        }
      }
      if (lastMapping && targetNodes.length === 1) {
        setMapping(lastMapping)
      } else {
        // 다중 선택 시 첫 번째 노드의 매핑 다시 로드
        if (node) {
          const m = await fetchMapping(fileKey, node.id)
          setMapping(m)
        }
      }
      onMappingChange?.()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  // 속성 추가 (다중 노드 지원)
  const handleAddAttribute = async () => {
    if (!fileKey || !mapping || !newAttrKey.trim()) return
    const targetNodes = nodes.length > 0 ? nodes : (node ? [node] : [])
    if (targetNodes.length === 0) return

    setSaving(true)
    try {
      let lastMapping: NodeMapping | null = null
      for (const n of targetNodes) {
        const nodeMapping = await fetchMapping(fileKey, n.id)
        if (nodeMapping) {
          const nodeNewAttrs = {
            ...nodeMapping.customAttrs,
            [newAttrKey.trim()]: newAttrValue
          }
          lastMapping = await saveMapping({
            figmaFileKey: fileKey,
            figmaNodeId: n.id,
            figmaNodeName: n.name,
            figmaNodeType: n.type,
            registryId: nodeMapping.registryId,
            registryName: nodeMapping.registryName,
            registryTag: nodeMapping.registryTag || '',
            customAttrs: nodeNewAttrs,
            status: 'mapped',
          })
        }
      }

      if (lastMapping && targetNodes.length === 1) {
        setMapping(lastMapping)
      } else if (node) {
        const m = await fetchMapping(fileKey, node.id)
        setMapping(m)
      }

      setNewAttrKey('')
      setNewAttrValue('')
      onMappingChange?.()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  // 속성 삭제
  const handleRemoveAttribute = async (key: string) => {
    if (!fileKey || !mapping) return
    const targetNodes = nodes.length > 0 ? nodes : (node ? [node] : [])
    if (targetNodes.length === 0) return

    setSaving(true)
    try {
      let lastMapping: NodeMapping | null = null
      for (const n of targetNodes) {
        const nodeMapping = await fetchMapping(fileKey, n.id)
        if (nodeMapping) {
          const { [key]: _, ...restAttrs } = nodeMapping.customAttrs || {}
          lastMapping = await saveMapping({
            figmaFileKey: fileKey,
            figmaNodeId: n.id,
            figmaNodeName: n.name,
            figmaNodeType: n.type,
            registryId: nodeMapping.registryId,
            registryName: nodeMapping.registryName,
            registryTag: nodeMapping.registryTag || '',
            customAttrs: restAttrs,
            status: 'mapped',
          })
        }
      }

      if (lastMapping && targetNodes.length === 1) {
        setMapping(lastMapping)
      } else if (node) {
        const m = await fetchMapping(fileKey, node.id)
        setMapping(m)
      }

      onMappingChange?.()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  // 현재 선택된 CSS 파일
  const selectedCss = cssList.find(c => c.id === selectedCssId)
  // 선택된 CSS 파일의 모든 클래스
  const allClassesInCss = selectedCss?.classNames || []
  // 현재 컴포넌트에 바인딩된 클래스 (설정에서 매핑된 것)
  const boundClasses = (mapping?.registryId && selectedCssId)
    ? (componentClassMapping[selectedCssId]?.[mapping.registryId] || [])
    : []
  // 현재 노드에 적용된 클래스
  const selectedClasses = (mapping?.customAttrs?.class || '').split(' ').filter(Boolean)

  // 검색 필터링
  const filteredRegistry = registry.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // CSS 클래스 검색 필터링
  const filteredClasses = classSearchQuery
    ? allClassesInCss.filter(cls => cls.toLowerCase().includes(classSearchQuery.toLowerCase()))
    : allClassesInCss

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 스플리터 드래그 핸들링
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!splitContainerRef.current) return
      const rect = splitContainerRef.current.getBoundingClientRect()
      const relativeY = e.clientY - rect.top
      const minH = rect.height * 0.2
      const maxH = rect.height * 0.8
      setTopHeight(Math.max(minH, Math.min(maxH, relativeY)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  if (!node && nodes.length === 0) {
    return (
      <div className="h-full theme-bg-secondary p-4">
        <p className="theme-text-secondary text-sm">노드를 선택하면 컴포넌트를 매핑할 수 있습니다</p>
      </div>
    )
  }

  // 다중 선택 시 node가 null이면 첫 번째 노드 사용
  const displayNode = node || nodes[0]
  if (!displayNode) {
    return (
      <div className="h-full theme-bg-secondary p-4">
        <p className="theme-text-secondary text-sm">노드를 선택하면 컴포넌트를 매핑할 수 있습니다</p>
      </div>
    )
  }

  return (
    <div className="h-full theme-bg-secondary flex flex-col">
      {/* 노드 정보 */}
      <div className="px-4 py-3 border-b theme-border flex-shrink-0">
        <h2 className="text-sm font-medium theme-text-primary truncate" title={displayNode.name}>
          {nodes.length > 1 ? `${nodes.length}개 노드 선택됨` : displayNode.name}
        </h2>
        <p className="text-xs theme-text-secondary mt-0.5">
          {nodes.length > 1
            ? `일괄 적용 모드`
            : `${displayNode.type} · ${displayNode.id}`}
        </p>
      </div>

      {/* 현재 매핑 상태 */}
      <div className="px-4 py-3 border-b theme-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">변환 컴포넌트</span>
          {mapping && (
            <button
              onClick={handleClearMapping}
              disabled={saving}
              className="text-xs text-red-400 hover:text-red-300"
            >
              해제
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">로딩...</div>
        ) : mapping ? (
          <div className="mapped-component-box border rounded-lg p-3">
            <span className="text-blue-500 font-mono text-sm">{mapping.registryName}</span>
          </div>
        ) : (
          <div className="theme-bg-tertiary border theme-border rounded-lg p-3 text-center">
            <p className="text-sm theme-text-secondary">매핑되지 않음</p>
            <p className="text-xs theme-text-secondary mt-1">아래에서 컴포넌트를 선택하세요</p>
          </div>
        )}
      </div>

      {/* 스플리터 영역 */}
      <div className="flex-1 flex flex-col min-h-0" ref={splitContainerRef}>
        {/* 상단: 컴포넌트 선택 */}
        <div className="overflow-auto" style={{ height: topHeight ?? 'auto', flexShrink: 0 }}>
          <div className="px-4 py-3">
            <div className="text-xs text-gray-400 mb-2">컴포넌트 선택</div>
            <div ref={dropdownRef} className="relative">
              <input
                type="text"
                placeholder="컴포넌트 검색..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setDropdownOpen(true)
                }}
                onFocus={() => setDropdownOpen(true)}
                disabled={saving}
                className="w-full px-3 py-2 text-sm theme-bg-tertiary border theme-border rounded theme-text-primary placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute z-10 w-full mt-1 theme-bg-secondary border theme-border rounded shadow-lg max-h-48 overflow-auto">
                  {filteredRegistry.length > 0 ? (
                    filteredRegistry.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleSelectComponent(item)
                          setSearchQuery('')
                          setDropdownOpen(false)
                        }}
                        className={`w-full px-3 py-2 text-left text-sm theme-bg-hover ${
                          mapping?.registryId === item.id ? 'bg-blue-900/50 text-blue-400' : 'theme-text-primary'
                        }`}
                      >
                        {item.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-400">검색 결과 없음</div>
                  )}
                </div>
              )}
            </div>

            {/* 속성 추가 영역 */}
            {mapping && (
              <div className="mt-3 p-3 theme-bg-tertiary border theme-border rounded-lg">
                <div className="text-xs text-gray-400 mb-2">커스텀 속성</div>

                {/* 추가된 속성 목록 */}
                {mapping.customAttrs && Object.entries(mapping.customAttrs)
                  .filter(([key]) => key !== 'class')
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 mb-2">
                      <span className="text-xs theme-text-attr-key font-mono theme-bg-primary px-2 py-1 rounded">{key}</span>
                      <span className="text-xs text-gray-400">=</span>
                      <span className="text-xs theme-text-attr-value font-mono theme-bg-primary px-2 py-1 rounded flex-1 truncate">"{value}"</span>
                      <button
                        onClick={() => handleRemoveAttribute(key)}
                        disabled={saving}
                        className="text-xs text-red-400 hover:text-red-300 p-1"
                        title="삭제"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}

                {/* 새 속성 입력 */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="key"
                    value={newAttrKey}
                    onChange={(e) => setNewAttrKey(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs theme-bg-primary border theme-border rounded theme-text-primary placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="value"
                    value={newAttrValue}
                    onChange={(e) => setNewAttrValue(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs theme-bg-primary border theme-border rounded theme-text-primary placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    onClick={handleAddAttribute}
                    disabled={saving || !newAttrKey.trim()}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded"
                  >
                    추가
                  </button>
                </div>
              </div>
            )}

            {/* 선택된 컴포넌트의 소스코드 */}
            {mapping?.registryId && (() => {
              const selectedItem = registry.find((r) => r.id === mapping.registryId)
              if (!selectedItem) return null

              const { tagName, properties } = selectedItem
              const mergedProps: Record<string, string> = { ...properties }
              const selectedItemNameLower = selectedItem.name.toLowerCase()

              // 커스텀 속성 병합 (class 포함 모든 속성)
              if (mapping.customAttrs) {
                Object.entries(mapping.customAttrs).forEach(([key, value]) => {
                  mergedProps[key] = value
                })
              }

              if (selectedItemNameLower === 'textbox' && displayNode?.characters) {
                const textContent = displayNode.characters
                  .split('\n')
                  .map(line => line.trim())
                  .filter(Boolean)
                  .join('<br/>')
                mergedProps.label = textContent
              }

              if (selectedItemNameLower === 'button') {
                const text = displayNode?.characters || findTextInChildren(displayNode)
                if (text) mergedProps.label = text
              }

              if (selectedItemNameLower === 'input') {
                const text = displayNode?.characters || findTextInChildren(displayNode)
                if (text) mergedProps.placeholder = text
              }

              if (selectedItemNameLower === 'checkbox') {
                const texts = collectAllTexts(displayNode)
                const propsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
                const items = texts.length > 0 ? texts : ['옵션1']
                const itemsCode = items.map(t =>
`      <xf:item>
        <xf:label><![CDATA[${t}]]></xf:label>
        <xf:value><![CDATA[${t}]]></xf:value>
      </xf:item>`
                ).join('\n')

                const code = `<${tagName} ${propsStr}>
  <xf:choices>
${itemsCode}
  </xf:choices>
</${tagName}>`

                return (
                  <pre className="mt-3 p-3 theme-bg-primary border theme-border rounded text-sm font-mono theme-text-code-green overflow-x-auto whitespace-pre">
                    {code}
                  </pre>
                )
              }

              // 속성 문자열 생성 헬퍼
              const buildPropsStr = (props: Record<string, string>) => {
                return Object.entries(props).map(([k, v]) => `${k}="${v}"`).join(' ')
              }

              // table 특수 처리
              if (selectedItemNameLower === 'table') {
                const tablePropsStr = buildPropsStr(mergedProps)
                const code = `<xf:group ${tablePropsStr}>
    <w2:attributes>
        <w2:summary></w2:summary>
    </w2:attributes>
    <xf:group tagname="colgroup">
    </xf:group>
</xf:group>`

                return (
                  <pre className="mt-3 p-3 theme-bg-primary border theme-border rounded text-sm font-mono theme-text-code-green overflow-x-auto whitespace-pre">
                    {code}
                  </pre>
                )
              }

              // tr 특수 처리
              if (selectedItemNameLower === 'tr') {
                const trPropsStr = buildPropsStr(mergedProps)
                const code = `<xf:group ${trPropsStr}>
    <!-- children -->
</xf:group>`

                return (
                  <pre className="mt-3 p-3 theme-bg-primary border theme-border rounded text-sm font-mono theme-text-code-green overflow-x-auto whitespace-pre">
                    {code}
                  </pre>
                )
              }

              // th 특수 처리
              if (selectedItemNameLower === 'th') {
                const thPropsStr = buildPropsStr(mergedProps)
                const code = `<xf:group ${thPropsStr}>
    <w2:attributes>
        <w2:scope>row</w2:scope>
    </w2:attributes>
    <!-- children -->
</xf:group>`

                return (
                  <pre className="mt-3 p-3 theme-bg-primary border theme-border rounded text-sm font-mono theme-text-code-green overflow-x-auto whitespace-pre">
                    {code}
                  </pre>
                )
              }

              // td 특수 처리
              if (selectedItemNameLower === 'td') {
                const tdPropsStr = buildPropsStr(mergedProps)
                const code = `<xf:group ${tdPropsStr}>
    <!-- children -->
</xf:group>`

                return (
                  <pre className="mt-3 p-3 theme-bg-primary border theme-border rounded text-sm font-mono theme-text-code-green overflow-x-auto whitespace-pre">
                    {code}
                  </pre>
                )
              }

              // gridView 특수 처리
              if (selectedItemNameLower === 'gridview') {
                const topTexts = collectTopLevelTexts(displayNode)
                const gridPropsStr = buildPropsStr(mergedProps)

                // header columns 생성
                const headerCols = topTexts.length > 0
                  ? topTexts.map((text, idx) => `            <w2:column id="column${idx}" width="70" displayMode="label" value="${text}"></w2:column>`).join('\n')
                  : `            <w2:column id="column0" width="70" displayMode="label" value="컬럼1"></w2:column>
            <w2:column id="column1" width="70" displayMode="label" value="컬럼2"></w2:column>
            <w2:column id="column2" width="70" displayMode="label" value="컬럼3"></w2:column>`

                // gBody columns 생성
                const bodyCols = topTexts.length > 0
                  ? topTexts.map((_, idx) => `            <w2:column id="gBodyColumn${idx}" width="70" inputType="text"></w2:column>`).join('\n')
                  : `            <w2:column id="gBodyColumn0" width="70" inputType="text"></w2:column>
            <w2:column id="gBodyColumn1" width="70" inputType="text"></w2:column>
            <w2:column id="gBodyColumn2" width="70" inputType="text"></w2:column>`

                const code = `<w2:gridView ${gridPropsStr}>
    <w2:caption id="caption1" style="" value="this is a grid caption."></w2:caption>
    <w2:header id="" style="">
        <w2:row>
${headerCols}
        </w2:row>
    </w2:header>
    <w2:gBody id="" style="">
        <w2:row>
${bodyCols}
        </w2:row>
    </w2:gBody>
</w2:gridView>`

                return (
                  <div className="mt-3">
                    <div className="text-xs text-gray-400 mb-2">헤더 텍스트 ({topTexts.length}개):</div>
                    <div className="p-2 bg-gray-900 border border-gray-600 rounded mb-2">
                      {topTexts.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {topTexts.map((text, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">
                              {text}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">텍스트 없음 (기본 3컬럼)</span>
                      )}
                    </div>
                    <pre className="p-3 theme-bg-primary border theme-border rounded text-sm font-mono theme-text-code-green overflow-x-auto whitespace-pre">
                      {code}
                    </pre>
                  </div>
                )
              }

              const propsStr = Object.entries(mergedProps).map(([k, v]) => `${k}="${v}"`).join(' ')
              const code = Object.keys(mergedProps).length > 0
                ? `<${tagName} ${propsStr}></${tagName}>`
                : `<${tagName}/>`

              return (
                <pre className="mt-3 p-3 theme-bg-primary border theme-border rounded text-sm font-mono theme-text-code-green overflow-x-auto">
                  {code}
                </pre>
              )
            })()}
          </div>
        </div>

        {/* 스플리터 핸들 */}
        <div
          className={`h-1.5 theme-bg-tertiary hover:bg-blue-500 cursor-row-resize flex items-center justify-center transition-colors select-none ${isDragging ? 'bg-blue-500' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
        >
          <div className="w-10 h-0.5 bg-gray-400 rounded" />
        </div>

        {/* 하단: CSS 클래스 선택 */}
        <div className="overflow-auto" style={{ flex: '1 1 0', minHeight: 0 }}>
          {mapping && cssList.length > 0 ? (
            <div className="px-4 py-3 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="text-xs text-gray-400">CSS 클래스</div>
                {/* 클래스 검색 */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="클래스 검색..."
                    value={classSearchQuery}
                    onChange={(e) => setClassSearchQuery(e.target.value)}
                    className="w-32 px-2 py-1 text-xs theme-bg-tertiary border theme-border rounded theme-text-primary placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
                  />
                  {classSearchQuery && (
                    <button
                      onClick={() => setClassSearchQuery('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* CSS 파일 탭 */}
              <div className="flex gap-1 mb-2 border-b theme-border overflow-x-auto flex-shrink-0">
                {cssList.map(css => {
                  const boundCount = (componentClassMapping[css.id]?.[mapping.registryId!] || []).length
                  const totalCount = css.classNames?.length || 0
                  const isActive = selectedCssId === css.id
                  return (
                    <button
                      key={css.id}
                      onClick={() => {
                        setSelectedCssId(css.id)
                        setClassSearchQuery('')
                      }}
                      className={`px-2 py-1 text-xs whitespace-nowrap border-b-2 transition-colors ${
                        isActive
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent theme-text-secondary hover:opacity-80'
                      }`}
                    >
                      {css.name}
                      <span className="ml-1 text-gray-500">
                        {boundCount > 0 ? `${boundCount}/` : ''}{totalCount}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* 클래스 목록 */}
              <div className="flex-1 overflow-auto">
                {filteredClasses.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {filteredClasses.map(cls => {
                      const isSelected = selectedClasses.includes(cls)
                      const isBound = boundClasses.includes(cls)
                      return (
                        <button
                          key={cls}
                          onClick={() => handleToggleClass(cls)}
                          disabled={saving}
                          className={`px-2 py-1 text-xs rounded font-mono ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : isBound
                                ? 'bound-class-btn'
                                : 'theme-bg-tertiary theme-text-secondary hover:opacity-80'
                          }`}
                          title={isBound ? '컴포넌트에 바인딩된 클래스' : '바인딩되지 않은 클래스'}
                        >
                          .{cls}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">
                    {classSearchQuery ? '검색 결과 없음' : '클래스 없음'}
                  </div>
                )}
              </div>

              {selectedClasses.length > 0 && (
                <div className="mt-2 text-xs theme-text-secondary">
                  선택됨: {selectedClasses.join(', ')}
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-3 text-xs theme-text-secondary">
              {!mapping ? '컴포넌트를 먼저 선택하세요' : 'CSS 파일이 없습니다'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
