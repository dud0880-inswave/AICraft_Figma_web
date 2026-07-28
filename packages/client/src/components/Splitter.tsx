import { useCallback, useEffect, useId, useRef, useState } from 'react'

export type PanelSection = 'left' | 'middle' | 'right'

interface SplitterProps {
  direction: 'horizontal' | 'vertical'
  onResize: (delta: number) => void
}

// VS Code 스타일 패널 토글 아이콘: 3분할 직사각형에서 해당 칸을 강조
// open=true(펼침) → 칸 채움 / open=false(접힘) → 칸 비움
export function PanelToggleIcon({ section, open, className = 'w-4 h-4' }: { section: PanelSection; open: boolean; className?: string }) {
  const clipId = useId()
  // 내부 영역 x: 1.5 ~ 14.5 (너비 13)을 3등분
  const colW = 13 / 3
  const colX = section === 'left' ? 1.5 : section === 'middle' ? 1.5 + colW : 1.5 + colW * 2
  return (
    <svg viewBox="0 0 16 16" className={className}>
      <defs>
        <clipPath id={clipId}>
          <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
        </clipPath>
      </defs>
      {/* 강조 칸 채움 */}
      {open && (
        <rect x={colX} y="2.5" width={colW} height="11" fill="currentColor" clipPath={`url(#${clipId})`} />
      )}
      {/* 외곽 + 칸 구분선 */}
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1={1.5 + colW} y1="2.5" x2={1.5 + colW} y2="13.5" stroke="currentColor" strokeWidth="1" />
      <line x1={1.5 + colW * 2} y1="2.5" x2={1.5 + colW * 2} y2="13.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

export default function Splitter({ direction, onResize }: SplitterProps) {
  const [isDragging, setIsDragging] = useState(false)
  const lastPos = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    lastPos.current = direction === 'horizontal' ? e.clientX : e.clientY
  }, [direction])

  useEffect(() => {
    if (!isDragging) return

    // iframe 이벤트 가로채기 방지용 전체 오버레이
    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;cursor:' + (direction === 'horizontal' ? 'col-resize' : 'row-resize')
    document.body.appendChild(overlay)

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY
      const delta = currentPos - lastPos.current
      lastPos.current = currentPos
      onResize(delta)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.removeChild(overlay)
    }
  }, [isDragging, direction, onResize])

  return (
    <div
      className={`
        ${direction === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
        theme-border hover:bg-blue-500 transition-colors flex-shrink-0
        ${isDragging ? 'bg-blue-500' : 'theme-bg-tertiary'}
      `}
      onMouseDown={handleMouseDown}
    />
  )
}
