import { describe, it, expect } from 'vitest'
import {
  findNodeById,
  collectNodeIds,
  countNodes,
  getNodeIcon,
  findParentNode,
  deepCloneNode,
} from './tree-utils'
import type { FigmaNode } from '../types/figma'

describe('tree-utils', () => {
  const mockTree: FigmaNode = {
    id: 'root',
    name: 'Document',
    type: 'DOCUMENT',
    children: [
      {
        id: 'page1',
        name: 'Page 1',
        type: 'CANVAS',
        children: [{ id: 'frame1', name: 'Frame', type: 'FRAME' }],
      },
    ],
  } as FigmaNode

  describe('findNodeById', () => {
    it('루트 노드를 찾는다', () => {
      const result = findNodeById(mockTree, 'root')
      expect(result?.id).toBe('root')
    })

    it('중첩된 노드를 찾는다', () => {
      const result = findNodeById(mockTree, 'frame1')
      expect(result?.name).toBe('Frame')
    })

    it('존재하지 않는 노드는 null을 반환한다', () => {
      expect(findNodeById(mockTree, 'not-exist')).toBeNull()
    })

    it('깊이 중첩된 노드도 찾는다', () => {
      const result = findNodeById(mockTree, 'page1')
      expect(result?.type).toBe('CANVAS')
    })
  })

  describe('collectNodeIds', () => {
    it('모든 노드 ID를 수집한다', () => {
      const ids = collectNodeIds(mockTree)
      expect(ids).toContain('root')
      expect(ids).toContain('page1')
      expect(ids).toContain('frame1')
      expect(ids).toHaveLength(3)
    })

    it('단일 노드의 ID를 수집한다', () => {
      const singleNode: FigmaNode = { id: 'single', name: 'Single', type: 'FRAME' } as FigmaNode
      expect(collectNodeIds(singleNode)).toEqual(['single'])
    })
  })

  describe('countNodes', () => {
    it('전체 노드 수를 계산한다', () => {
      expect(countNodes(mockTree)).toBe(3)
    })

    it('단일 노드는 1을 반환한다', () => {
      const singleNode: FigmaNode = { id: 'single', name: 'Single', type: 'FRAME' } as FigmaNode
      expect(countNodes(singleNode)).toBe(1)
    })
  })

  describe('getNodeIcon', () => {
    it('각 타입에 맞는 아이콘을 반환한다', () => {
      expect(getNodeIcon('FRAME')).toBe('⬜')
      expect(getNodeIcon('TEXT')).toBe('📝')
      expect(getNodeIcon('COMPONENT')).toBe('🧩')
      expect(getNodeIcon('INSTANCE')).toBe('🔗')
      expect(getNodeIcon('GROUP')).toBe('📁')
    })

    it('알 수 없는 타입은 기본 아이콘을 반환한다', () => {
      expect(getNodeIcon('UNKNOWN')).toBe('•')
      expect(getNodeIcon('')).toBe('•')
    })
  })

  describe('findParentNode', () => {
    it('자식 노드의 부모를 찾는다', () => {
      const parent = findParentNode(mockTree, 'frame1')
      expect(parent?.id).toBe('page1')
    })

    it('1단계 자식의 부모는 루트다', () => {
      const parent = findParentNode(mockTree, 'page1')
      expect(parent?.id).toBe('root')
    })

    it('루트 노드의 부모는 null이다', () => {
      expect(findParentNode(mockTree, 'root')).toBeNull()
    })

    it('존재하지 않는 노드의 부모는 null이다', () => {
      expect(findParentNode(mockTree, 'not-exist')).toBeNull()
    })
  })

  describe('deepCloneNode', () => {
    it('노드를 깊은 복사한다', () => {
      const clone = deepCloneNode(mockTree)
      expect(clone).toEqual(mockTree)
      expect(clone).not.toBe(mockTree)
    })

    it('복사본 수정이 원본에 영향을 주지 않는다', () => {
      const clone = deepCloneNode(mockTree)
      clone.name = 'Modified'
      expect(mockTree.name).toBe('Document')
    })

    it('자식 노드도 깊은 복사된다', () => {
      const clone = deepCloneNode(mockTree)
      if (clone.children && mockTree.children) {
        expect(clone.children[0]).not.toBe(mockTree.children[0])
        expect(clone.children[0]).toEqual(mockTree.children[0])
      }
    })
  })
})
