import type { FigmaNode } from '../types/figma'

interface NodeInfoProps {
  node: FigmaNode | null
}

export default function NodeInfo({ node }: NodeInfoProps) {
  if (!node) {
    return (
      <div className="h-full bg-gray-800 p-4">
        <p className="text-gray-500 text-sm">노드를 선택하면 상세 정보가 표시됩니다</p>
      </div>
    )
  }

  const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  const properties: { label: string; value: string | number }[] = [
    { label: 'ID', value: node.id },
    { label: '이름', value: node.name },
    { label: '타입', value: node.type },
    { label: '표시', value: node.visible !== false ? '예' : '아니오' },
  ]

  if (node.absoluteBoundingBox) {
    const box = node.absoluteBoundingBox
    properties.push(
      { label: 'X', value: Math.round(box.x) },
      { label: 'Y', value: Math.round(box.y) },
      { label: '너비', value: Math.round(box.width) },
      { label: '높이', value: Math.round(box.height) }
    )
  }

  if (node.characters) {
    properties.push({ label: '텍스트', value: node.characters })
  }

  if (node.cornerRadius) {
    properties.push({ label: '모서리 반경', value: node.cornerRadius })
  }

  if (node.children) {
    properties.push({ label: '자식 노드 수', value: node.children.length })
  }

  return (
    <div className="h-full bg-gray-800 flex flex-col">
      <div className="px-4 py-2 border-b border-gray-700">
        <h2 className="text-sm font-medium text-gray-300">노드 정보</h2>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {properties.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-gray-500">{label}</dt>
              <dd className="text-sm text-white mt-0.5 break-all">
                {renderValue(value)}
              </dd>
            </div>
          ))}
        </div>

        {/* 스타일 정보 */}
        {node.fills && node.fills.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h3 className="text-xs text-gray-500 mb-2">Fills</h3>
            <pre className="text-xs text-gray-300 bg-gray-900 p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(node.fills, null, 2)}
            </pre>
          </div>
        )}

        {node.style && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h3 className="text-xs text-gray-500 mb-2">텍스트 스타일</h3>
            <pre className="text-xs text-gray-300 bg-gray-900 p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(node.style, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
