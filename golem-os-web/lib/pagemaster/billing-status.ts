import type { ClientRow, InvoiceRow } from '@/types/entities'

export type BillingRow = { client: ClientRow; currentInvoice: InvoiceRow | null }

export const STATUS_LABEL: Record<string, string> = {
  Draft: 'Draft — not yet sent',
  Sent: 'Sent, awaiting payment',
  Paid: 'Paid',
  Overdue: 'Overdue',
  Cancelled: 'Cancelled',
}
export const STATUS_COLOR: Record<string, string> = {
  Draft: '#D9B45C',
  Sent: '#DA6B51',
  Paid: '#7FA98A',
  Overdue: '#5B5F8D',
  Cancelled: '#A8A39A',
}
export const NO_INVOICE_LABEL = 'No invoice yet this month'
export const REMINDER_LABEL = 'Reminder created — fill in hours'
export const NO_INVOICE_COLOR = '#DA6B51'
export const REMINDER_COLOR = '#A8A39A'

export const URGENCY_RANK: Record<string, number> = {
  [NO_INVOICE_LABEL]: 0,
  Overdue: 1,
  'Draft — not yet sent': 2,
  [REMINDER_LABEL]: 3,
  'Sent, awaiting payment': 4,
  Paid: 5,
  Cancelled: 6,
}

export function billingTypeLabel(client: ClientRow): string {
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

export function statusInfo(row: BillingRow): { label: string; color: string } {
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
