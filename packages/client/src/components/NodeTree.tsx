import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import type { FigmaNode } from '../types/figma'
import { getNodeIcon } from '../utils/tree-utils'

interface NodeTreeProps {
  nodes: FigmaNode[]
  selectedNodeIds: string[]
  mappedNodeIds: Set<string>
  onSelectNode: (node: FigmaNode, ctrlKey: boolean, shiftKey?: boolean) => void
  onSelectNodeIds?: (nodeIds: string[]) => void
  onHoverNode: (node: FigmaNode | null) => void
  onGroupNodes: () => void
  onUngroupNodes?: () => void
  onReorderNodes?: (parentId: string | null, nodeId: string, newIndex: number) => void
}

// 검색어에 매칭되는 노드 ID와 상위 노드 ID 수집
function collectMatchingNodeIds(nodes: FigmaNode[], searchQuery: string): { all: Set<string>, direct: Set<string> } {
  const allMatchingIds = new Set<string>()
  const directMatchingIds = new Set<string>()
  const query = searchQuery.toLowerCase()

  function traverse(node: FigmaNode, ancestors: string[]): boolean {
    const nameMatches = node.name.toLowerCase().includes(query)
    let childMatches = false

    if (node.children) {
      for (const child of node.children) {
        if (traverse(child, [...ancestors, node.id])) {
          childMatches = true
        }
      }
    }

    if (nameMatches) {
      directMatchingIds.add(node.id)
      allMatchingIds.add(node.id)
      ancestors.forEach(id => allMatchingIds.add(id))
      return true
    }

    if (childMatches) {
      allMatchingIds.add(node.id)
      ancestors.forEach(id => allMatchingIds.add(id))
      return true
    }

    return false
  }

  nodes.forEach(node => traverse(node, []))
  return { all: allMatchingIds, direct: directMatchingIds }
}

interface TreeItemProps {
  node: FigmaNode
  depth: number
  index: number
  parentId: string | null
  selectedNodeIds: string[]
  mappedNodeIds: Set<string>
  expandedIds: Set<string>
  dragState: DragState | null
  searchQuery: string
  matchingIds: Set<string>
  onToggle: (id: string) => void
  onSelect: (node: FigmaNode, ctrlKey: boolean, shiftKey?: boolean) => void
  onHover: (node: FigmaNode | null) => void
  onDragStart: (e: React.DragEvent, node: FigmaNode, parentId: string | null, index: number) => void
  onDragOver: (e: React.DragEvent, node: FigmaNode, parentId: string | null, index: number) => void
  onDragEnd: () => void
  onDrop: (e: React.DragEvent, targetParentId: string | null, targetIndex: number) => void
}

interface DragState {
  nodeId: string
  parentId: string | null
  index: number
}


function TreeItem({
  node,
  depth,
  index,
  parentId,
  selectedNodeIds,
  mappedNodeIds,
  expandedIds,
  dragState,
  searchQuery,
  matchingIds,
  onToggle,
  onSelect,
  onHover,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: TreeItemProps) {
  const [dropTarget, setDropTarget] = useState<'before' | 'after' | null>(null)
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedNodeIds.includes(node.id)
  const isVisible = node.visible !== false
  const isMapped = mappedNodeIds.has(node.id)
  const isDragging = dragState?.nodeId === node.id

  // 검색 중일 때 매칭되지 않으면 숨김
  if (searchQuery && !matchingIds.has(node.id)) {
    return null
  }

  // 검색어가 노드 이름에 직접 매칭되는지 확인 (하이라이트용)
  const isDirectMatch = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase())

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!dragState || dragState.nodeId === node.id) return

    // 같은 부모 내에서만 이동 가능
    if (dragState.parentId !== parentId) return

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const half = rect.height / 2

    if (y < half) {
      setDropTarget('before')
    } else {
      setDropTarget('after')
    }

    onDragOver(e, node, parentId, index)
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!dragState || dragState.nodeId === node.id) return
    if (dragState.parentId !== parentId) return

    // 드롭 위치 계산
    let targetIndex = index
    if (dropTarget === 'after') {
      targetIndex = index + 1
    }

    // 드래그 노드가 타겟보다 앞에 있으면, 삭제 후 인덱스가 1 줄어듦
    if (dragState.index < targetIndex) {
      targetIndex -= 1
    }

    onDrop(e, parentId, targetIndex)
    setDropTarget(null)
  }

  return (
    <div>
      <div
        data-node-id={node.id}
        className={`tree-node flex items-center ${isSelected ? 'selected' : ''} ${!isVisible ? 'opacity-40' : ''} ${isDragging ? 'opacity-50' : ''}`}
        style={{
          paddingLeft: `${depth * 16 + 8}px`,
          borderTop: dropTarget === 'before' ? '2px solid #3b82f6' : 'none',
          borderBottom: dropTarget === 'after' ? '2px solid #3b82f6' : 'none',
          marginTop: dropTarget === 'before' ? '-2px' : '0',
          marginBottom: dropTarget === 'after' ? '-2px' : '0',
        }}
        draggable
        onClick={(e) => isVisible && onSelect(node, e.ctrlKey || e.metaKey, e.shiftKey)}
        onMouseEnter={() => onHover(node)}
        onMouseLeave={() => onHover(null)}
        onDragStart={(e) => onDragStart(e, node, parentId, index)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={onDragEnd}
      >
        {/* 드래그 핸들 */}
        <span className="w-4 h-4 flex items-center justify-center mr-1 text-gray-600 cursor-grab active:cursor-grabbing">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
          </svg>
        </span>

        {/* 확장/축소 버튼 */}
        <span
          className="w-4 h-4 flex items-center justify-center mr-1 text-gray-500"
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) {
              onToggle(node.id)
            }
          }}
        >
          {hasChildren ? (
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            ''
          )}
        </span>

        {/* 노드 아이콘 */}
        <span className="mr-2 text-sm">{getNodeIcon(node.type)}</span>

        {/* 매핑 표시 */}
        {isMapped && (
          <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-green-500 mr-1.5 flex-shrink-0" title="매핑됨" />
        )}

        {/* 노드 이름 */}
        <span className={`truncate text-sm ${isMapped ? 'text-blue-600 dark:text-green-400' : ''} ${isDirectMatch ? 'bg-yellow-500/30 rounded px-0.5' : ''}`} title={node.name}>
          {node.name}
        </span>

        {/* 노드 타입 */}
        <span className="ml-2 text-xs text-gray-500 hidden group-hover:inline">
          {node.type}
        </span>
      </div>

      {/* 자식 노드 */}
      {hasChildren && (isExpanded || searchQuery) && (
        <div>
          {node.children!.map((child, childIndex) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              index={childIndex}
              parentId={node.id}
              selectedNodeIds={selectedNodeIds}
              mappedNodeIds={mappedNodeIds}
              expandedIds={expandedIds}
              dragState={dragState}
              searchQuery={searchQuery}
              matchingIds={matchingIds}
              onToggle={onToggle}
              onSelect={onSelect}
              onHover={onHover}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 노드 ID로 노드 찾기
function findNodeById(nodes: FigmaNode[], id: string): FigmaNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

export default function NodeTree({
  nodes,
  selectedNodeIds,
  mappedNodeIds,
  onSelectNode,
  onSelectNodeIds,
  onHoverNode,
  onGroupNodes,
  onUngroupNodes,
  onReorderNodes
}: NodeTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // 기본적으로 첫 번째 레벨은 확장
    const ids = new Set<string>()
    nodes.forEach((node) => ids.add(node.id))
    return ids
  })
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showParents, setShowParents] = useState(true)

  // 검색어에 매칭되는 노드 ID 계산
  const { allMatchingIds, directMatchingIds } = useMemo(() => {
    if (!searchQuery.trim()) return { allMatchingIds: new Set<string>(), directMatchingIds: new Set<string>() }
    const result = collectMatchingNodeIds(nodes, searchQuery.trim())
    return { allMatchingIds: result.all, directMatchingIds: result.direct }
  }, [nodes, searchQuery])

  // showParents에 따라 트리에 표시할 노드 결정
  const matchingIds = showParents ? allMatchingIds : directMatchingIds

  // 검색 결과 전체 선택
  const handleSelectAllSearchResults = useCallback(() => {
    if (onSelectNodeIds && directMatchingIds.size > 0) {
      onSelectNodeIds(Array.from(directMatchingIds))
    }
  }, [onSelectNodeIds, directMatchingIds])

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleExpandAll = () => {
    const allIds = new Set<string>()
    function collect(node: FigmaNode) {
      allIds.add(node.id)
      node.children?.forEach(collect)
    }
    nodes.forEach(collect)
    setExpandedIds(allIds)
  }

  const handleCollapseAll = () => {
    const rootIds = new Set<string>()
    nodes.forEach((node) => rootIds.add(node.id))
    setExpandedIds(rootIds)
  }

  const handleDragStart = (e: React.DragEvent, node: FigmaNode, parentId: string | null, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', node.id)
    setDragState({ nodeId: node.id, parentId, index })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragEnd = () => {
    setDragState(null)
  }

  const handleDrop = (e: React.DragEvent, targetParentId: string | null, targetIndex: number) => {
    e.preventDefault()

    if (!dragState || !onReorderNodes) return

    // 같은 부모 내에서만 이동
    if (dragState.parentId !== targetParentId) return

    // 같은 위치면 무시
    if (dragState.index === targetIndex) return

    onReorderNodes(targetParentId, dragState.nodeId, targetIndex)
    setDragState(null)
  }

  // 현재 보이는 노드를 flat 리스트로 수집
  const flatVisibleNodes = useMemo(() => {
    const result: FigmaNode[] = []
    if (searchQuery && !showParents) {
      // 상위항목 미표시: 전체 재귀 탐색 후 직접 매칭만
      function collectAll(nodeList: FigmaNode[]) {
        for (const node of nodeList) {
          if (directMatchingIds.has(node.id)) result.push(node)
          if (node.children) collectAll(node.children)
        }
      }
      collectAll(nodes)
    } else {
      function collect(nodeList: FigmaNode[]) {
        for (const node of nodeList) {
          if (searchQuery && !matchingIds.has(node.id)) continue
          result.push(node)
          if (node.children && (expandedIds.has(node.id) || searchQuery)) {
            collect(node.children)
          }
        }
      }
      collect(nodes)
    }
    return result
  }, [nodes, expandedIds, searchQuery, matchingIds, showParents, directMatchingIds])

  const treeRef = useRef<HTMLDivElement>(null)

  // Shift 클릭 범위 선택 처리
  const handleNodeSelect = useCallback((node: FigmaNode, ctrlKey: boolean, shiftKey?: boolean) => {
    if (node.visible === false) return
    if (shiftKey && onSelectNodeIds && selectedNodeIds.length > 0) {
      const lastId = selectedNodeIds[selectedNodeIds.length - 1]
      const lastIndex = flatVisibleNodes.findIndex(n => n.id === lastId)
      const currentIndex = flatVisibleNodes.findIndex(n => n.id === node.id)
      if (lastIndex >= 0 && currentIndex >= 0) {
        const start = Math.min(lastIndex, currentIndex)
        const end = Math.max(lastIndex, currentIndex)
        const rangeIds = flatVisibleNodes.slice(start, end + 1).filter(n => n.visible !== false).map(n => n.id)
        // 기존 선택에 합치기
        const merged = new Set([...selectedNodeIds, ...rangeIds])
        onSelectNodeIds(Array.from(merged))
        return
      }
    }
    onSelectNode(node, ctrlKey)
  }, [flatVisibleNodes, selectedNodeIds, onSelectNode, onSelectNodeIds])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!flatVisibleNodes.length) return
    const currentId = selectedNodeIds[selectedNodeIds.length - 1]
    const currentIndex = currentId ? flatVisibleNodes.findIndex(n => n.id === currentId) : -1

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      let nextIndex = currentIndex + 1
      while (nextIndex < flatVisibleNodes.length && flatVisibleNodes[nextIndex].visible === false) nextIndex++
      if (nextIndex < flatVisibleNodes.length) handleNodeSelect(flatVisibleNodes[nextIndex], false, e.shiftKey)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      let prevIndex = currentIndex - 1
      while (prevIndex >= 0 && flatVisibleNodes[prevIndex].visible === false) prevIndex--
      if (prevIndex >= 0) handleNodeSelect(flatVisibleNodes[prevIndex], false, e.shiftKey)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (currentId) {
        const node = flatVisibleNodes[currentIndex]
        if (node?.children?.length && !expandedIds.has(node.id)) {
          handleToggle(node.id)
        }
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (currentId) {
        const node = flatVisibleNodes[currentIndex]
        if (node?.children?.length && expandedIds.has(node.id)) {
          handleToggle(node.id)
        }
      }
    }
  }, [flatVisibleNodes, selectedNodeIds, expandedIds, onSelectNode, handleToggle])

  // 선택 변경 시 해당 노드가 보이도록 스크롤
  useEffect(() => {
    const currentId = selectedNodeIds[selectedNodeIds.length - 1]
    if (!currentId || !treeRef.current) return
    const el = treeRef.current.querySelector(`[data-node-id="${currentId}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [selectedNodeIds])

  return (
    <div className="h-full flex flex-col theme-bg-secondary" onKeyDown={handleKeyDown} tabIndex={0} style={{ outline: 'none' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 border-b theme-border">
        <h2 className="text-sm font-medium theme-text-secondary">
          노드 트리
          {selectedNodeIds.length > 0 && (
            <span className="ml-2 text-xs text-blue-400">({selectedNodeIds.length}개 선택)</span>
          )}
        </h2>
        <div className="flex gap-1">
          {selectedNodeIds.length >= 1 && (
            <button
              onClick={onGroupNodes}
              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded whitespace-nowrap"
              title="선택한 노드 그룹화"
            >
              그룹화
            </button>
          )}
          {selectedNodeIds.length === 1 && onUngroupNodes && (() => {
            const selectedNode = findNodeById(nodes, selectedNodeIds[0])
            const isGroupType = selectedNode?.type === 'GROUP' || selectedNode?.type === 'FRAME'
            const hasChildren = selectedNode?.children && selectedNode.children.length > 0
            if (isGroupType && hasChildren) {
              return (
                <button
                  onClick={onUngroupNodes}
                  className="px-2 py-1 text-xs bg-orange-600 hover:bg-orange-500 text-white rounded whitespace-nowrap"
                  title="그룹 해제"
                >
                  그룹해제
                </button>
              )
            }
            return null
          })()}
          <button
            onClick={handleExpandAll}
            className="p-1 text-gray-400 hover:text-white text-xs"
            title="모두 펼치기"
          >
            ⊞
          </button>
          <button
            onClick={handleCollapseAll}
            className="p-1 text-gray-400 hover:text-white text-xs"
            title="모두 접기"
          >
            ⊟
          </button>
        </div>
      </div>

      {/* 검색 영역 */}
      <div className="px-3 py-2 border-b theme-border">
        <div className="relative">
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="노드 검색..."
            className="w-full pl-8 pr-8 py-1.5 theme-bg-tertiary border theme-border rounded text-sm theme-text-primary placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {directMatchingIds.size}개 발견
              </span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showParents}
                  onChange={(e) => setShowParents(e.target.checked)}
                  className="w-3 h-3 rounded"
                />
                <span className="text-xs text-gray-500">상위항목</span>
              </label>
            </div>
            {directMatchingIds.size > 0 && onSelectNodeIds && (
              <button
                onClick={handleSelectAllSearchResults}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                전체 선택
              </button>
            )}
          </div>
        )}
      </div>

      {/* 트리 */}
      <div ref={treeRef} className="flex-1 overflow-auto py-2">
        {searchQuery && !showParents ? (
          // 상위항목 미표시: 매칭 노드만 flat 렌더링
          flatVisibleNodes
            .filter(n => directMatchingIds.has(n.id))
            .map((node, index) => (
              <TreeItem
                key={node.id}
                node={node}
                depth={0}
                index={index}
                parentId={null}
                selectedNodeIds={selectedNodeIds}
                mappedNodeIds={mappedNodeIds}
                expandedIds={expandedIds}
                dragState={dragState}
                searchQuery=""
                matchingIds={matchingIds}
                onToggle={handleToggle}
                onSelect={handleNodeSelect}
                onHover={onHoverNode}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
              />
            ))
        ) : (
          nodes.map((node, index) => (
            <TreeItem
              key={node.id}
              node={node}
              depth={0}
              index={index}
              parentId={null}
              selectedNodeIds={selectedNodeIds}
              mappedNodeIds={mappedNodeIds}
              expandedIds={expandedIds}
              dragState={dragState}
              searchQuery={searchQuery}
              matchingIds={matchingIds}
              onToggle={handleToggle}
              onSelect={handleNodeSelect}
              onHover={onHoverNode}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
            />
          ))
        )}
      </div>
    </div>
  )
}
