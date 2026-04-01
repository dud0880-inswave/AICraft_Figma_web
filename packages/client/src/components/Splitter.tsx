import { useCallback, useEffect, useRef, useState } from 'react'

interface SplitterProps {
  direction: 'horizontal' | 'vertical'
  onResize: (delta: number) => void
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
