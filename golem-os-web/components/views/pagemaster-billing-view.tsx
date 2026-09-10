'use client'
import type { ClientRow, InvoiceRow } from '@/types/entities'

type BillingRow = { client: ClientRow; currentInvoice: InvoiceRow | null }

const STATUS_LABEL: Record<string, string> = {
  Draft: 'Draft — not yet sent',
  Sent: 'Sent, awaiting payment',
  Paid: 'Paid',
  Overdue: 'Overdue',
  Cancelled: 'Cancelled',
}
const STATUS_COLOR: Record<string, string> = {
  Draft: '#D9B45C',
  Sent: '#DA6B51',
  Paid: '#7FA98A',
  Overdue: '#5B5F8D',
  Cancelled: '#A8A39A',
}
const NO_INVOICE_LABEL = 'No invoice yet this month'
const REMINDER_LABEL = 'Reminder created — fill in hours'
const NO_INVOICE_COLOR = '#DA6B51'
const REMINDER_COLOR = '#A8A39A'

const URGENCY_RANK: Record<string, number> = {
  [NO_INVOICE_LABEL]: 0,
  Overdue: 1,
  'Draft — not yet sent': 2,
  [REMINDER_LABEL]: 3,
  'Sent, awaiting payment': 4,
  Paid: 5,
  Cancelled: 6,
}

function billingTypeLabel(client: ClientRow): string {
  if (client.billing_type === 'flat') {
    return client.contract_value != null
      ? `Flat $${client.contract_value.toLocaleString()}/mo`
      : 'Flat'
  }
  if (client.billing_type === 'hourly') {
    return client.hourly_rate != null ? `Hourly $${client.hourly_rate}/hr` : 'Hourly'
  }
  return client.billing_type
}

function statusInfo(row: BillingRow): { label: string; color: string } {
  const { client, currentInvoice } = row
  if (!currentInvoice) {
    return { label: NO_INVOICE_LABEL, color: NO_INVOICE_COLOR }
  }
  if (client.billing_type === 'hourly' && !currentInvoice.wave_invoice_id && currentInvoice.amount === 0) {
    return { label: REMINDER_LABEL, color: REMINDER_COLOR }
  }
  const status = currentInvoice.status ?? 'Draft'
  return { label: STATUS_LABEL[status] ?? status, color: STATUS_COLOR[status] ?? '#A8A39A' }
}

export function needsAttention(row: BillingRow): boolean {
  const { label } = statusInfo(row)
  return label === NO_INVOICE_LABEL || label === 'Draft — not yet sent' || label === 'Overdue'
}

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
