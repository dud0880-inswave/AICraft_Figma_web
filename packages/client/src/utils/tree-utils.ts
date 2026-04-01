import type { FigmaNode, BoundingBox } from '../types/figma'

// 노드 ID로 노드 찾기
export function findNodeById(node: FigmaNode, id: string): FigmaNode | null {
  if (node.id === id) {
    return node
  }

  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id)
      if (found) {
        return found
      }
    }
  }

  return null
}

// 노드의 모든 자손 ID 수집
export function collectNodeIds(node: FigmaNode): string[] {
  const ids: string[] = [node.id]

  if (node.children) {
    for (const child of node.children) {
      ids.push(...collectNodeIds(child))
    }
  }

  return ids
}

// 노드 타입에 따른 아이콘 반환
export function getNodeIcon(type: string): string {
  const icons: Record<string, string> = {
    DOCUMENT: '📄',
    CANVAS: '🖼️',
    FRAME: '⬜',
    GROUP: '📁',
    COMPONENT: '🧩',
    COMPONENT_SET: '📦',
    INSTANCE: '🔗',
    TEXT: '📝',
    RECTANGLE: '▢',
    ELLIPSE: '⬭',
    LINE: '─',
    VECTOR: '✏️',
    BOOLEAN_OPERATION: '🔀',
    SLICE: '✂️',
    STAR: '⭐',
    REGULAR_POLYGON: '⬡',
  }

  return icons[type] || '•'
}

// 페이지의 바운딩 박스 계산 (모든 자식 노드 포함)
// absoluteRenderBounds 우선 사용 (Figma 이미지 렌더링과 일치)
export function calculatePageBounds(page: FigmaNode): BoundingBox | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  function traverse(node: FigmaNode) {
    const box = node.absoluteRenderBounds || node.absoluteBoundingBox
    if (box) {
      minX = Math.min(minX, box.x)
      minY = Math.min(minY, box.y)
      maxX = Math.max(maxX, box.x + box.width)
      maxY = Math.max(maxY, box.y + box.height)
    }

    if (node.children) {
      node.children.forEach(traverse)
    }
  }

  if (page.children) {
    page.children.forEach(traverse)
  }

  if (minX === Infinity) {
    return null
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

// 노드의 상대 좌표 계산 (페이지 기준)
export function getRelativePosition(
  node: FigmaNode,
  pageBounds: BoundingBox,
  scale: number
): { x: number; y: number; width: number; height: number } | null {
  if (!node.absoluteBoundingBox) {
    return null
  }

  const box = node.absoluteBoundingBox

  return {
    x: (box.x - pageBounds.x) * scale,
    y: (box.y - pageBounds.y) * scale,
    width: box.width * scale,
    height: box.height * scale,
  }
}

// 노드 카운트
export function countNodes(node: FigmaNode): number {
  let count = 1
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child)
    }
  }
  return count
}

// 부모 노드 찾기
export function findParentNode(root: FigmaNode, targetId: string): FigmaNode | null {
  if (root.children) {
    for (const child of root.children) {
      if (child.id === targetId) {
        return root
      }
      const found = findParentNode(child, targetId)
      if (found) return found
    }
  }
  return null
}

// 선택된 노드들을 그룹화
export function groupNodes(root: FigmaNode, selectedIds: string[]): { newRoot: FigmaNode; groupId: string } | null {
  if (selectedIds.length === 0) return null

  // 첫 번째 선택된 노드의 부모 찾기
  const firstParent = findParentNode(root, selectedIds[0])
  if (!firstParent || !firstParent.children) return null

  // 모든 선택된 노드가 같은 부모를 가지는지 확인
  const allSameParent = selectedIds.every(id => {
    const parent = findParentNode(root, id)
    return parent?.id === firstParent.id
  })

  if (!allSameParent) {
    console.warn('선택된 노드들이 같은 부모를 가지지 않습니다')
    return null
  }

  // 선택된 노드들 추출
  const selectedNodes = firstParent.children.filter(child => selectedIds.includes(child.id))
  const remainingNodes = firstParent.children.filter(child => !selectedIds.includes(child.id))

  // 그룹 바운딩 박스 계산
  const groupBounds = calculateGroupBounds(selectedNodes)

  // 새 그룹 노드 생성
  const groupId = `group_${Date.now()}`
  const newGroup: FigmaNode = {
    id: groupId,
    name: 'Group',
    type: 'GROUP',
    children: selectedNodes,
    absoluteBoundingBox: groupBounds || undefined,
    visible: true,
  }

  // 딥 클론하여 새 트리 생성
  const newRoot = deepCloneNode(root)
  const newParent = findNodeById(newRoot, firstParent.id)

  if (newParent) {
    // 선택된 노드들의 원래 위치 (첫 번째 선택된 노드의 인덱스)
    const originalIndex = firstParent.children.findIndex(child => selectedIds.includes(child.id))

    // 부모의 children 업데이트: 선택된 노드들을 그룹으로 대체
    const newChildren = [...remainingNodes]
    newChildren.splice(Math.max(0, originalIndex), 0, newGroup)
    newParent.children = newChildren
  }

  return { newRoot, groupId }
}

// 노드들의 바운딩 박스 계산
function calculateGroupBounds(nodes: FigmaNode[]): BoundingBox | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of nodes) {
    if (node.absoluteBoundingBox) {
      const box = node.absoluteBoundingBox
      minX = Math.min(minX, box.x)
      minY = Math.min(minY, box.y)
      maxX = Math.max(maxX, box.x + box.width)
      maxY = Math.max(maxY, box.y + box.height)
    }
  }

  if (minX === Infinity) return null

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

// 노드 딥 클론
export function deepCloneNode(node: FigmaNode): FigmaNode {
  const clone: FigmaNode = { ...node }
  if (node.children) {
    clone.children = node.children.map(child => deepCloneNode(child))
  }
  return clone
}

// 그룹 해제 (그룹의 자식들을 부모로 이동)
export function ungroupNode(root: FigmaNode, groupId: string): { newRoot: FigmaNode; childIds: string[] } | null {
  // 그룹 노드 찾기
  const groupNode = findNodeById(root, groupId)
  if (!groupNode || !groupNode.children || groupNode.children.length === 0) return null

  // 그룹의 부모 찾기
  const parentNode = findParentNode(root, groupId)
  if (!parentNode || !parentNode.children) return null

  // 그룹의 인덱스 찾기
  const groupIndex = parentNode.children.findIndex(child => child.id === groupId)
  if (groupIndex === -1) return null

  // 자식 노드들의 ID 저장
  const childIds = groupNode.children.map(child => child.id)

  // 딥 클론하여 새 트리 생성
  const newRoot = deepCloneNode(root)
  const newParent = findNodeById(newRoot, parentNode.id)

  if (newParent && newParent.children) {
    // 그룹 노드 찾기
    const newGroupIndex = newParent.children.findIndex(child => child.id === groupId)
    const newGroupNode = newParent.children[newGroupIndex]

    if (newGroupNode && newGroupNode.children) {
      // 그룹 제거하고 그 자리에 자식들 삽입
      newParent.children.splice(newGroupIndex, 1, ...newGroupNode.children)
    }
  }

  return { newRoot, childIds }
}

// 노드 순서 변경
export function reorderNodes(
  root: FigmaNode,
  parentId: string | null,
  nodeId: string,
  newIndex: number
): FigmaNode {
  const newRoot = deepCloneNode(root)

  // 부모 노드 찾기 (parentId가 null이면 root의 children)
  let parent: FigmaNode | null = null
  if (parentId === null) {
    parent = newRoot
  } else {
    parent = findNodeById(newRoot, parentId)
  }

  if (!parent || !parent.children) {
    return newRoot
  }

  // 현재 인덱스 찾기
  const currentIndex = parent.children.findIndex(child => child.id === nodeId)
  if (currentIndex === -1) {
    return newRoot
  }

  // 노드 추출
  const [node] = parent.children.splice(currentIndex, 1)

  // 새 위치에 삽입
  parent.children.splice(newIndex, 0, node)

  return newRoot
}
