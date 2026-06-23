'use client'
import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { InvoiceRow, ClientRow } from '@/types/entities'

const STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
const STATUS_COLOR: Record<string, string> = {
  Draft:     '#A8A39A',
  Sent:      '#DA6B51',
  Paid:      '#7FA98A',
  Overdue:   '#5B5F8D',
  Cancelled: '#A8A39A',
}

type Form = Partial<Omit<InvoiceRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

const today = () => new Date().toISOString().slice(0, 10)

function fmtMoney(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

export function InvoicesView({
  initialInvoices,
  clients,
}: {
  initialInvoices: InvoiceRow[]
  clients: ClientRow[]
}) {
  const [items, setItems]           = useState(initialInvoices)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editItem, setEditItem]     = useState<InvoiceRow | null>(null)
  const [form, setForm]             = useState<Form>({})

  const upd = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm(f => ({ ...f, [k]: v ?? undefined }))

  const openNew = () => {
    setEditItem(null)
    setForm({ status: 'Draft', currency: 'USD', issued_date: today() })
    setDrawerOpen(true)
  }
  const openEdit = (item: InvoiceRow) => {
    setEditItem(item)
    setForm({
      amount:      item.amount,
      client_id:   item.client_id   ?? undefined,
      status:      item.status      ?? undefined,
      currency:    item.currency    ?? undefined,
      issued_date: item.issued_date ?? undefined,
      due_date:    item.due_date    ?? undefined,
      paid_date:   item.paid_date   ?? undefined,
      notes:       item.notes       ?? undefined,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    if (form.amount == null) { toast.error('Amount is required'); return }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const payload = { ...form, amount: form.amount! }
    if (editItem) {
      const { error } = await sb.from('invoices').update(payload).eq('id', editItem.id)
      if (error) throw error
      setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...payload } : i))
      toast.success('Updated')
    } else {
      const { data, error } = await sb.from('invoices').insert({ ...payload, user_id: user.id }).select().single()
      if (error) throw error
      if (data) setItems(prev => [data, ...prev])
      toast.success('Invoice created')
    }
    setDrawerOpen(false)
  }

  const handleDelete = async () => {
    if (!editItem) return
    const sb = createClient()
    const { error } = await sb.from('invoices').delete().eq('id', editItem.id)
    if (error) throw error
    setItems(prev => prev.filter(i => i.id !== editItem.id))
    setDrawerOpen(false)
    toast.success('Deleted')
  }

  const clientName = (id: number | null) =>
    id ? (clients.find(c => c.id === id)?.name ?? `#${id}`) : null

  const byStatus = useMemo(() => {
    const order = ['Overdue', 'Sent', 'Draft', 'Paid', 'Cancelled']
    const map = new Map<string, InvoiceRow[]>()
    items.forEach(inv => {
      const s = inv.status ?? 'Draft'
      const arr = map.get(s) ?? []
      arr.push(inv)
      map.set(s, arr)
    })
    return order.filter(s => map.has(s)).map(s => [s, map.get(s)!] as const)
  }, [items])

  const totalOutstanding = useMemo(() =>
    items
      .filter(i => i.status === 'Sent' || i.status === 'Overdue')
      .reduce((s, i) => s + i.amount, 0),
    [items]
  )
  const totalPaid = useMemo(() =>
    items.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0),
    [items]
  )

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Invoices</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {totalOutstanding > 0 && <span className="text-amber-600 dark:text-amber-400">{fmtMoney(totalOutstanding)} outstanding · </span>}
            {totalPaid > 0 && <span className="text-stone-500">{fmtMoney(totalPaid)} paid</span>}
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus size={14} /> New Invoice
        </Button>
      </div>

      <div className="space-y-6">
        {byStatus.map(([status, invoices]) => (
          <section key={status}>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
              {status}
            </p>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
              {invoices.map((inv, idx) => {
                const isOverdue = inv.status === 'Sent' && inv.due_date && inv.due_date < todayStr
                return (
                  <button
                    key={inv.id}
                    onClick={() => openEdit(inv)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${
                      idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: isOverdue ? '#5B5F8D' : STATUS_COLOR[inv.status ?? 'Draft'] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                        {clientName(inv.client_id) ?? 'No client'}
                      </p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                        {inv.issued_date && <span>Issued {inv.issued_date}</span>}
                        {inv.due_date && <span className={`ml-2 ${isOverdue ? 'text-red-500' : ''}`}>· Due {inv.due_date}</span>}
                        {inv.paid_date && <span className="ml-2 text-stone-400">· Paid {inv.paid_date}</span>}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-stone-700 dark:text-stone-300 shrink-0">
                      {fmtMoney(inv.amount, inv.currency ?? 'USD')}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">No invoices yet.</p>
        </div>
      )}

      <ItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editItem ? 'Edit Invoice' : 'New Invoice'}
        onSave={handleSave}
        onDelete={editItem ? handleDelete : undefined}
      >
        {clients.length > 0 && (
          <Select
            label="Client"
            value={form.client_id?.toString() ?? ''}
            onChange={e => upd('client_id', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="— No client —"
            options={clients.map(c => ({ value: c.id.toString(), label: c.name }))}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            value={form.amount ?? ''}
            onChange={e => upd('amount', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
          <Select
            label="Currency"
            value={form.currency ?? 'USD'}
            onChange={e => upd('currency', e.target.value || undefined)}
            options={CURRENCIES.map(c => ({ value: c, label: c }))}
          />
        </div>
        <Select
          label="Status"
          value={form.status ?? ''}
          onChange={e => upd('status', e.target.value || undefined)}
          placeholder="— None —"
          options={STATUSES.map(s => ({ value: s, label: s }))}
        />
        <Input
          label="Issued Date"
          type="date"
          value={form.issued_date ?? ''}
          onChange={e => upd('issued_date', e.target.value || undefined)}
        />
        <Input
          label="Due Date"
          type="date"
          value={form.due_date ?? ''}
          onChange={e => upd('due_date', e.target.value || undefined)}
        />
        <Input
          label="Paid Date"
          type="date"
          value={form.paid_date ?? ''}
          onChange={e => upd('paid_date', e.target.value || undefined)}
        />
        <Textarea
          label="Notes"
          value={form.notes ?? ''}
          onChange={e => upd('notes', e.target.value || undefined)}
          placeholder="Invoice details, scope…"
          rows={3}
        />
      </ItemDrawer>
    </div>
  )
}
