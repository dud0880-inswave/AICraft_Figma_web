import type { FigmaNode } from '../types/figma'

// 하위 노드에서 텍스트 찾기 (첫 번째만)
export function findTextInChildren(node: FigmaNode | null): string | null {
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
export function collectAllTexts(node: FigmaNode | null): string[] {
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
export function collectTopLevelTexts(node: FigmaNode | null): string[] {
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
