import type { FigmaNode } from '../types/figma'

interface PageTabsProps {
  pages: FigmaNode[]
  currentPageId: string | null
  onSelectPage: (pageId: string) => void
}

export default function PageTabs({ pages, currentPageId, onSelectPage }: PageTabsProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-800 border-b border-gray-700 overflow-x-auto">
      {pages.map((page) => (
        <button
          key={page.id}
          onClick={() => onSelectPage(page.id)}
          className={`
            px-3 py-1.5 text-sm rounded-t whitespace-nowrap transition-colors
            ${currentPageId === page.id
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }
          `}
        >
          {page.name}
        </button>
      ))}
    </div>
  )
}
