import type { KnowledgeRow } from '@/types/entities'

export function PagemasterKnowledgeView({ items }: { items: KnowledgeRow[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-stone-400 dark:text-stone-500">
        No knowledge items yet. Add them from Dextrous → Knowledge.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div
          key={item.id}
          className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4"
        >
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-50">{item.title}</p>
          {item.content && (
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">{item.content}</p>
          )}
          {item.tags && (
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">{item.tags}</p>
          )}
        </div>
      ))}
    </div>
  )
}
