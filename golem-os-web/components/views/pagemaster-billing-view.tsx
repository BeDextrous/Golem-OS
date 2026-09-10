'use client'
import type { BillingRow } from '@/lib/pagemaster/billing-status'
import { billingTypeLabel, statusInfo, URGENCY_RANK } from '@/lib/pagemaster/billing-status'

export function PagemasterBillingView({ rows }: { rows: BillingRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-stone-400 dark:text-stone-500">
        No clients with billing configured yet.
      </p>
    )
  }

  const sorted = [...rows].sort(
    (a, b) => URGENCY_RANK[statusInfo(a).label] - URGENCY_RANK[statusInfo(b).label]
  )

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
      {sorted.map((row, idx) => {
        const { label, color } = statusInfo(row)
        return (
          <div
            key={row.client.id}
            className={`flex items-center justify-between gap-3 px-4 py-3 ${
              idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                {row.client.name}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                {billingTypeLabel(row.client)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: color }}
              >
                {label}
              </span>
              {row.currentInvoice?.wave_view_url && (
                <a
                  href={row.currentInvoice.wave_view_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 underline"
                >
                  View in Wave ↗
                </a>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
