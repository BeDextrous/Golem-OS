'use client'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Select } from '@/components/ui'
import type { LeadRow } from '@/types/entities'

const STATUSES = ['New', 'Contacted', 'Qualified', 'Archived']
const STATUS_COLOR: Record<string, string> = {
  New:       '#DA6B51',
  Contacted: '#D8A930',
  Qualified: '#7FA98A',
  Archived:  '#A8A39A',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function LeadsView({ initialLeads }: { initialLeads: LeadRow[] }) {
  const [items, setItems] = useState(initialLeads)

  const updateStatus = async (lead: LeadRow, status: string) => {
    const sb = createClient()
    const { error } = await sb.from('dextrous_leads').update({ status }).eq('id', lead.id)
    if (error) { toast.error('Could not update status'); return }
    setItems(prev => prev.map(l => (l.id === lead.id ? { ...l, status } : l)))
  }

  const byStatus = useMemo(() => {
    const map = new Map<string, LeadRow[]>()
    items.forEach(l => {
      const s = l.status ?? 'New'
      const arr = map.get(s) ?? []
      arr.push(l)
      map.set(s, arr)
    })
    return STATUSES.filter(s => map.has(s)).map(s => [s, map.get(s)!] as const)
  }, [items])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Leads</h1>
        <p className="text-xs text-stone-400 mt-0.5">
          {items.filter(l => (l.status ?? 'New') === 'New').length} new · from bedextrous.com contact form
        </p>
      </div>

      <div className="space-y-6">
        {byStatus.map(([status, leads]) => (
          <section key={status}>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
              {status}
            </p>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
              {leads.map((lead, idx) => (
                <div
                  key={lead.id}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                    style={{ backgroundColor: STATUS_COLOR[lead.status ?? 'New'] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                      {lead.name}{' '}
                      <span className="text-stone-400 font-normal">· {lead.email}</span>
                    </p>
                    {lead.message && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-3">
                        {lead.message}
                      </p>
                    )}
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                      {fmtDate(lead.created_at)}
                    </p>
                  </div>
                  <Select
                    value={lead.status ?? 'New'}
                    onChange={e => updateStatus(lead, e.target.value)}
                    options={STATUSES.map(s => ({ value: s, label: s }))}
                    className="shrink-0 w-32"
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">No leads yet — submissions from the bedextrous.com contact form will show up here.</p>
        </div>
      )}
    </div>
  )
}
