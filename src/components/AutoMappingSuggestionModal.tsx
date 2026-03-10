import { useState, useMemo } from 'react'
import type { AutoMappingSuggestion } from '../utils/api'

interface AutoMappingSuggestionModalProps {
  isOpen: boolean
  onClose: () => void
  suggestions: AutoMappingSuggestion[]
  onApply: (selectedSuggestions: AutoMappingSuggestion[]) => void
  loading: boolean
}

export default function AutoMappingSuggestionModal({
  isOpen,
  onClose,
  suggestions,
  onApply,
  loading,
}: AutoMappingSuggestionModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(suggestions.map(s => s.nodeId))
  )

  // 전체 선택 상태
  const allSelected = useMemo(() => {
    return suggestions.length > 0 && selectedIds.size === suggestions.length
  }, [suggestions, selectedIds])

  const someSelected = useMemo(() => {
    return selectedIds.size > 0 && selectedIds.size < suggestions.length
  }, [suggestions, selectedIds])

  // 체크박스 토글
  const toggleSelection = (nodeId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  // 전체 선택/해제
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(suggestions.map(s => s.nodeId)))
    }
  }

  // 적용
  const handleApply = () => {
    const selected = suggestions.filter(s => selectedIds.has(s.nodeId))
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
      <div className="relative w-full max-w-2xl mx-4 bg-gray-800 rounded-lg shadow-xl max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">자동 매핑 제안</h2>
            <p className="text-sm text-gray-400 mt-1">
              이전에 매핑한 노드와 동일한 구조의 노드를 발견했습니다
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-auto p-4">
          {/* 전체 선택 */}
          <div className="flex items-center gap-3 pb-3 mb-3 border-b border-gray-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => {
                  if (el) el.indeterminate = someSelected
                }}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
              />
              <span className="text-sm text-gray-300">
                전체 선택 ({selectedIds.size}/{suggestions.length})
              </span>
            </label>
          </div>

          {/* 제안 목록 */}
          <div className="space-y-2">
            {suggestions.map(suggestion => (
              <label
                key={suggestion.nodeId}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedIds.has(suggestion.nodeId)
                    ? 'bg-blue-900/30 border border-blue-500/50'
                    : 'bg-gray-700/50 border border-gray-600 hover:bg-gray-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(suggestion.nodeId)}
                  onChange={() => toggleSelection(suggestion.nodeId)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium truncate">
                      {suggestion.nodeName}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-600 text-gray-300 rounded">
                      {suggestion.nodeType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-blue-400">
                      {suggestion.registryName}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({suggestion.sampleCount}회 매핑됨)
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            건너뛰기
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={loading || selectedIds.size === 0}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center"
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
              `${selectedIds.size}개 적용`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
