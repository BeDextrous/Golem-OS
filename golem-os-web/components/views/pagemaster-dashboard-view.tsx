import Link from 'next/link'
import { needsAttention } from '@/lib/pagemaster/billing-status'
import type { DeadlineRow, KnowledgeRow } from '@/types/entities'
import type { BillingRow } from '@/lib/pagemaster/billing-status'

export function PagemasterDashboardView({
  deadlines,
  billingRows,
  knowledge,
}: {
  deadlines: DeadlineRow[]
  billingRows: BillingRow[]
  knowledge: KnowledgeRow[]
}) {
  const needsReviewCount = deadlines.filter(d => d.status === 'needs_review').length
  const billingAttentionRows = billingRows.filter(needsAttention)
  const upcomingDeadlines = deadlines.filter(d => d.status === 'open').slice(0, 5)
  const recentKnowledge = knowledge.slice(0, 5)
  const hasAttention = needsReviewCount + billingAttentionRows.length > 0

  return (
    <div className="space-y-6">
      {hasAttention && (
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
            Needs attention
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {needsReviewCount > 0 && (
              <Link
                href="/pagemaster/deadlines"
                className="block bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 rounded-lg p-4 hover:border-amber-400 dark:hover:border-amber-700 transition-colors"
              >
                <p className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{needsReviewCount}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  deadline{needsReviewCount === 1 ? '' : 's'} to review
                </p>
              </Link>
            )}
            {billingAttentionRows.length > 0 && (
              <Link
                href="/pagemaster/billing"
                className="block bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 rounded-lg p-4 hover:border-amber-400 dark:hover:border-amber-700 transition-colors"
              >
                <p className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{billingAttentionRows.length}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  invoice{billingAttentionRows.length === 1 ? '' : 's'} needing attention
                </p>
              </Link>
            )}
          </div>
        </section>
      )}

      {upcomingDeadlines.length > 0 && (
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
            Upcoming deadlines
          </p>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
            {upcomingDeadlines.map((d, idx) => (
              <Link
                key={d.id}
                href="/pagemaster/deadlines"
                className={`flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${
                  idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
                }`}
              >
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{d.title}</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 shrink-0">{d.due_date}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {recentKnowledge.length > 0 && (
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
            Recent knowledge
          </p>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
            {recentKnowledge.map((k, idx) => (
              <Link
                key={k.id}
                href="/pagemaster/knowledge"
                className={`block px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${
                  idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
                }`}
              >
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{k.title}</p>
                {k.content && (
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">{k.content}</p>
                )}
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                  {new Date(k.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
