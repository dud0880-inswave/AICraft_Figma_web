import { describe, it, expect } from 'vitest'
import { findTextInChildren, collectAllTexts, collectTopLevelTexts } from './text-utils'
import type { FigmaNode } from '../types/figma'

describe('text-utils', () => {
  // 테스트용 목 데이터
  const mockNode: FigmaNode = {
    id: '1',
    name: 'Frame',
    type: 'FRAME',
    children: [
      { id: '2', name: 'Text1', type: 'TEXT', characters: '안녕하세요' },
      {
        id: '3',
        name: 'Group',
        type: 'GROUP',
        children: [
          { id: '4', name: 'Text2', type: 'TEXT', characters: '반갑습니다' },
        ],
      },
    ],
  } as FigmaNode

  const emptyNode: FigmaNode = {
    id: '1',
    name: 'Empty',
    type: 'FRAME',
  } as FigmaNode

  describe('findTextInChildren', () => {
    it('첫 번째 텍스트를 찾아 반환한다', () => {
      const result = findTextInChildren(mockNode)
      expect(result).toBe('안녕하세요')
    })

    it('텍스트가 없으면 null을 반환한다', () => {
      expect(findTextInChildren(emptyNode)).toBeNull()
    })

    it('null 입력에 대해 null을 반환한다', () => {
      expect(findTextInChildren(null)).toBeNull()
    })

    it('children이 없는 노드에서 null을 반환한다', () => {
      const nodeWithoutChildren: FigmaNode = {
        id: '1',
        name: 'Single',
        type: 'FRAME',
      } as FigmaNode
      expect(findTextInChildren(nodeWithoutChildren)).toBeNull()
    })
  })

  describe('collectAllTexts', () => {
    it('모든 하위 텍스트를 수집한다', () => {
      const result = collectAllTexts(mockNode)
      expect(result).toEqual(['안녕하세요', '반갑습니다'])
    })

    it('텍스트가 없으면 빈 배열을 반환한다', () => {
      expect(collectAllTexts(emptyNode)).toEqual([])
    })

    it('null 입력에 대해 빈 배열을 반환한다', () => {
      expect(collectAllTexts(null)).toEqual([])
    })
  })

  describe('collectTopLevelTexts', () => {
    it('첫 번째 행의 텍스트들을 수집한다', () => {
      const result = collectTopLevelTexts(mockNode)
      expect(result).toContain('안녕하세요')
    })

    it('children이 없으면 빈 배열을 반환한다', () => {
      expect(collectTopLevelTexts(emptyNode)).toEqual([])
    })

    it('null 입력에 대해 빈 배열을 반환한다', () => {
      expect(collectTopLevelTexts(null)).toEqual([])
    })
  })
})
