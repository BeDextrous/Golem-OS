import { describe, expect, it } from 'vitest'
import {
  NO_INVOICE_LABEL, REMINDER_LABEL, billingTypeLabel, needsAttention, statusInfo, type BillingRow,
} from './billing-status'
import type { ClientRow, InvoiceRow } from '@/types/entities'

const client = (over: Partial<ClientRow> = {}) =>
  ({ id: 1, name: 'Acme', billing_type: 'flat', contract_value: 5000, hourly_rate: null, ...over }) as ClientRow
const invoice = (over: Partial<InvoiceRow> = {}) =>
  ({ id: 1, client_id: 1, status: 'Draft', amount: 100, wave_invoice_id: null, ...over }) as InvoiceRow
const row = (c: Partial<ClientRow>, i: Partial<InvoiceRow> | null): BillingRow =>
  ({ client: client(c), currentInvoice: i ? invoice(i) : null })

describe('statusInfo', () => {
  it('flags a missing invoice', () => {
    expect(statusInfo(row({}, null)).label).toBe(NO_INVOICE_LABEL)
  })
  it('recognises an hourly reminder placeholder', () => {
    const r = row({ billing_type: 'hourly' }, { amount: 0, wave_invoice_id: null })
    expect(statusInfo(r).label).toBe(REMINDER_LABEL)
  })
  it('does not treat a $0 flat invoice as a reminder', () => {
    expect(statusInfo(row({}, { amount: 0, status: 'Sent' })).label).toBe('Sent, awaiting payment')
  })
  it('falls back to the raw status for unknown values', () => {
    expect(statusInfo(row({}, { status: 'Weird' })).label).toBe('Weird')
  })
})

describe('needsAttention', () => {
  it.each([
    [null, true],
    [{ status: 'Draft' }, true],
    [{ status: 'Overdue' }, true],
    [{ status: 'Sent' }, false],
    [{ status: 'Paid' }, false],
  ])('invoice %j -> %s', (inv, expected) => {
    expect(needsAttention(row({}, inv as Partial<InvoiceRow> | null))).toBe(expected)
  })
})

describe('billingTypeLabel', () => {
  it('formats flat and hourly', () => {
    expect(billingTypeLabel(client())).toBe('Flat $5,000/mo')
    expect(billingTypeLabel(client({ billing_type: 'hourly', hourly_rate: 300 }))).toBe('Hourly $300/hr')
    expect(billingTypeLabel(client({ billing_type: 'hourly', hourly_rate: null }))).toBe('Hourly')
  })
})
