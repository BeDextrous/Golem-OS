'use client'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { DeadlineWithClient } from '@/lib/queries'

const STATUS_LABEL: Record<string, string> = {
  needs_review: 'REVIEW',
  open: 'OPEN',
  done: 'DONE',
  waived: 'WAIVED',
}
const STATUS_COLOR: Record<string, string> = {
  needs_review: '#D9B45C',
  open: '#7FA98A',
  done: '#A8A39A',
  waived: '#A8A39A',
}

function groupByClient(deadlines: DeadlineWithClient[]) {
  const groups = new Map<string, DeadlineWithClient[]>()
  for (const d of deadlines) {
    const key = d.client_name ?? 'Unassigned'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(d)
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

export function PagemasterDeadlinesView({ initialDeadlines }: { initialDeadlines: DeadlineWithClient[] }) {
  const [deadlines, setDeadlines] = useState(initialDeadlines)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (client: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(client)) next.delete(client)
      else next.add(client)
      return next
    })
  }

  const setStatus = async (id: number, status: 'open' | 'waived') => {
    const supabase = createClient()
    const { error } = await supabase.from('deadlines').update({ status }).eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    setDeadlines(prev => prev.map(d => (d.id === id ? { ...d, status } : d)))
    toast.success(status === 'open' ? 'Confirmed' : 'Dismissed')
  }

  const grouped = useMemo(() => groupByClient(deadlines), [deadlines])

  if (deadlines.length === 0) {
    return <p className="text-sm text-stone-400 dark:text-stone-500">No deadlines tracked yet.</p>
  }

  return (
    <div className="space-y-2">
      {grouped.map(([client, clientDeadlines]) => {
        const isOpen = expanded.has(client)
        const reviewCount = clientDeadlines.filter(d => d.status === 'needs_review').length
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
              <span className="text-xs text-stone-400 dark:text-stone-500 shrink-0 flex items-center gap-2">
                {reviewCount > 0 && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: STATUS_COLOR.needs_review }}
                  >
                    {reviewCount} to review
                  </span>
                )}
                {clientDeadlines.length} total {isOpen ? '▲' : '▼'}
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-stone-100 dark:border-stone-800">
                {clientDeadlines.map((d, idx) => (
                  <div
                    key={d.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 ${
                      idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white shrink-0"
                          style={{ backgroundColor: STATUS_COLOR[d.status] ?? '#A8A39A' }}
                        >
                          {STATUS_LABEL[d.status] ?? d.status.toUpperCase()}
                        </span>
                        <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{d.title}</p>
                      </div>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{d.due_date}</p>
                    </div>
                    {d.status === 'needs_review' && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setStatus(d.id, 'open')}
                          title="Confirm"
                          className="w-6 h-6 flex items-center justify-center rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setStatus(d.id, 'waived')}
                          title="Dismiss"
                          className="w-6 h-6 flex items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
