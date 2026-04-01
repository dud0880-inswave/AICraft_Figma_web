import { useState, useMemo, useEffect } from 'react'
import type { AutoMappingSuggestion } from '../utils/api'

interface AutoMappingSuggestionModalProps {
  isOpen: boolean
  onClose: () => void
  suggestions: AutoMappingSuggestion[]
  onApply: (selectedSuggestions: AutoMappingSuggestion[]) => void
  loading: boolean
}

// 고유 키 생성: nodeId + source 조합
const getSuggestionKey = (s: AutoMappingSuggestion) => `${s.nodeId}::${s.source}`

export default function AutoMappingSuggestionModal({
  isOpen,
  onClose,
  suggestions,
  onApply,
  loading,
}: AutoMappingSuggestionModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(suggestions.map(getSuggestionKey))
  )

  // suggestions가 변경되면 selectedKeys를 업데이트 (모든 제안 기본 선택)
  useEffect(() => {
    setSelectedKeys(new Set(suggestions.map(getSuggestionKey)))
  }, [suggestions])

  // 소스별 분류 (고유 키 기준)
  const clusterKeys = useMemo(() => suggestions.filter(s => s.source === 'cluster').map(getSuggestionKey), [suggestions])
  const defaultRuleKeys = useMemo(() => suggestions.filter(s => s.source !== 'cluster').map(getSuggestionKey), [suggestions])

  // 전체 선택 상태
  const allSelected = useMemo(() => {
    return suggestions.length > 0 && selectedKeys.size === suggestions.length
  }, [suggestions, selectedKeys])

  const someSelected = useMemo(() => {
    return selectedKeys.size > 0 && selectedKeys.size < suggestions.length
  }, [suggestions, selectedKeys])

  // 소스별 선택 상태
  const clusterAllSelected = useMemo(() => clusterKeys.length > 0 && clusterKeys.every(key => selectedKeys.has(key)), [clusterKeys, selectedKeys])
  const defaultRuleAllSelected = useMemo(() => defaultRuleKeys.length > 0 && defaultRuleKeys.every(key => selectedKeys.has(key)), [defaultRuleKeys, selectedKeys])

  // 체크박스 토글
  const toggleSelection = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // 전체 선택/해제
  const toggleAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(suggestions.map(getSuggestionKey)))
    }
  }

  // 소스별 선택/해제
  const toggleBySource = (keys: string[], allSelected: boolean) => {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (allSelected) {
        keys.forEach(key => next.delete(key))
      } else {
        keys.forEach(key => next.add(key))
      }
      return next
    })
  }

  // 적용
  const handleApply = () => {
    const selected = suggestions.filter(s => selectedKeys.has(getSuggestionKey(s)))
    onApply(selected)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative w-full max-w-2xl mx-4 theme-bg-secondary rounded-lg shadow-xl max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border">
          <div>
            <h2 className="text-lg font-semibold theme-text-primary">자동 매핑 제안</h2>
            <p className="text-sm theme-text-secondary mt-1">
              클러스터 및 기본 규칙으로 매칭된 노드 목록입니다
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 theme-text-secondary hover:theme-text-primary rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-auto p-4">
          {/* 전체 선택 */}
          <div className="flex items-center gap-3 pb-3 mb-3 border-b theme-border flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => {
                  if (el) el.indeterminate = someSelected
                }}
                onChange={toggleAll}
                className="w-4 h-4 rounded theme-border theme-bg-tertiary text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm theme-text-primary">
                전체 ({selectedKeys.size}/{suggestions.length})
              </span>
            </label>
            {clusterKeys.length > 0 && (
              <button
                type="button"
                onClick={() => toggleBySource(clusterKeys, clusterAllSelected)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  clusterAllSelected
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                }`}
              >
                클러스터 {clusterAllSelected ? '해제' : '전체선택'} ({clusterKeys.filter(key => selectedKeys.has(key)).length}/{clusterKeys.length})
              </button>
            )}
            {defaultRuleKeys.length > 0 && (
              <button
                type="button"
                onClick={() => toggleBySource(defaultRuleKeys, defaultRuleAllSelected)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  defaultRuleAllSelected
                    ? 'bg-green-600 text-white'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                }`}
              >
                기본규칙 {defaultRuleAllSelected ? '해제' : '전체선택'} ({defaultRuleKeys.filter(key => selectedKeys.has(key)).length}/{defaultRuleKeys.length})
              </button>
            )}
          </div>

          {/* 제안 목록 */}
          <div className="space-y-2">
            {suggestions.map(suggestion => {
              const key = getSuggestionKey(suggestion)
              return (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedKeys.has(key)
                      ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-500'
                      : 'theme-bg-tertiary border theme-border hover:opacity-80'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(key)}
                    onChange={() => toggleSelection(key)}
                    className="w-4 h-4 rounded theme-border theme-bg-tertiary text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="theme-text-primary font-medium truncate">
                        {suggestion.nodeName}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                        {suggestion.nodeType}
                      </span>
                      {suggestion.source === 'cluster' ? (
                        <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded">클러스터</span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">기본규칙</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-blue-600 dark:text-blue-400">
                        {suggestion.registryName}
                      </span>
                      {suggestion.source === 'cluster' ? (
                        <span className="text-xs theme-text-secondary">({suggestion.sampleCount}회 매핑됨)</span>
                      ) : (
                        <span className="text-xs theme-text-secondary">(키워드: {suggestion.matchedKeyword})</span>
                      )}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex gap-3 px-6 py-4 border-t theme-border">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 theme-bg-tertiary hover:opacity-80 theme-text-primary font-medium rounded-lg transition-colors"
          >
            건너뛰기
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={loading || selectedKeys.size === 0}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                적용 중...
              </>
            ) : (
              `${selectedKeys.size}개 적용`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
