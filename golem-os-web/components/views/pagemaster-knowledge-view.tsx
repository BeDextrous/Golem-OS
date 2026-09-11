'use client'
import { useMemo, useState } from 'react'
import type { KnowledgeRow } from '@/types/entities'
import type { KnowledgeMemoryItem } from '@/lib/queries'

function groupByClient(extracted: KnowledgeMemoryItem[]) {
  const groups = new Map<string, KnowledgeMemoryItem[]>()
  for (const item of extracted) {
    const key = item.client_name ?? 'Unassigned'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

export function PagemasterKnowledgeView({
  extracted,
  items,
}: {
  extracted: KnowledgeMemoryItem[]
  items: KnowledgeRow[]
}) {
  const grouped = useMemo(() => groupByClient(extracted), [extracted])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (client: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(client)) next.delete(client)
      else next.add(client)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div>
        {grouped.length === 0 ? (
          <p className="text-sm text-stone-400 dark:text-stone-500">
            No extracted knowledge yet — it appears here once the worker processes client documents.
          </p>
        ) : (
          <div className="space-y-2">
            {grouped.map(([client, clientItems]) => {
              const isOpen = expanded.has(client)
              return (
                <div
                  key={client}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggle(client)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50"
                  >
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-50">{client}</p>
                    <span className="text-xs text-stone-400 dark:text-stone-500 shrink-0">
                      {clientItems.length} item{clientItems.length === 1 ? '' : 's'} {isOpen ? '▲' : '▼'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-stone-100 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
                      {clientItems.map(item => (
                        <div key={item.id} className="px-4 py-3">
                          <p className="text-sm text-stone-700 dark:text-stone-300">{item.content}</p>
                          {item.document_title && (
                            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                              Source: {item.document_title}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
          Dextrous knowledge items
        </p>
        {items.length === 0 ? (
          <p className="text-sm text-stone-400 dark:text-stone-500">
            No knowledge items yet. Add them from Dextrous → Knowledge.
          </p>
        ) : (
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
        )}
      </div>
    </div>
  )
}
