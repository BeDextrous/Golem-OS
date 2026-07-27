'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { ClientRow } from '@/types/entities'

const STATUSES = ['Active', 'Prospective', 'Past', 'Archived']
const STATUS_COLOR: Record<string, string> = {
  'Active':      '#7FA98A',
  'Prospective': '#DA6B51',
  'Past':        '#A8A39A',
  'Archived':    '#A8A39A',
}

type Form = Partial<Omit<ClientRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

/**
 * Client workspaces under the Work pillar. Clients are grouped by
 * `workspace_group` — e.g. "dextrous" groups every Dextrous client
 * (Solmax, etc.) under one Dextrous heading, while clients with no
 * workspace_group (e.g. Casa Boca) render as standalone workspaces
 * directly under Work.
 */
export function WorkClientsView({ initialClients }: { initialClients: ClientRow[] }) {
  const [items, setItems]           = useState(initialClients)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm]             = useState<Form>({})

  const upd = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm(f => ({ ...f, [k]: v ?? undefined }))

  const openNew = () => {
    setForm({ status: 'Active', currency: 'USD' })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Name is required'); return }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const payload = { ...form, name: form.name! }
    const { data, error } = await sb.from('clients').insert({ ...payload, user_id: user.id }).select().single()
    if (error) throw error
    if (data) setItems(prev => [...prev, data])
    toast.success('Client workspace added')
    setDrawerOpen(false)
  }

  const { groups, standalone } = useMemo(() => {
    const groupMap = new Map<string, ClientRow[]>()
    const standalone: ClientRow[] = []
    items.forEach(c => {
      if (c.workspace_group) {
        const arr = groupMap.get(c.workspace_group) ?? []
        arr.push(c)
        groupMap.set(c.workspace_group, arr)
      } else {
        standalone.push(c)
      }
    })
    return { groups: [...groupMap.entries()], standalone }
  }, [items])

  const groupLabel = (key: string) =>
    key === 'dextrous' ? 'Dextrous' : key.charAt(0).toUpperCase() + key.slice(1)

  const ClientRow_ = ({ client }: { client: ClientRow }) => (
    <Link
      href={`/work/clients/${client.id}`}
      className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors border-t border-stone-100 dark:border-stone-800 first:border-t-0"
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: STATUS_COLOR[client.status ?? 'Active'] }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
          {client.name}
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
          {client.company ?? client.status ?? '—'}
        </p>
      </div>
      <ChevronRight size={16} className="text-stone-300 dark:text-stone-600 shrink-0" />
    </Link>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Clients</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {items.length} client workspace{items.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus size={14} /> New Client
        </Button>
      </div>

      <div className="space-y-6">
        {groups.map(([key, clients]) => (
          <section key={key}>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
              {groupLabel(key)}
            </p>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
              {clients.map(client => <ClientRow_ key={client.id} client={client} />)}
            </div>
          </section>
        ))}

        {standalone.length > 0 && (
          <section>
            {groups.length > 0 && (
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
                Standalone
              </p>
            )}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
              {standalone.map(client => <ClientRow_ key={client.id} client={client} />)}
            </div>
          </section>
        )}
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">No client workspaces yet.</p>
        </div>
      )}

      <ItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="New Client Workspace"
        onSave={handleSave}
      >
        <Input
          label="Name"
          value={form.name ?? ''}
          onChange={e => upd('name', e.target.value)}
          placeholder="Client name"
        />
        <Input
          label="Company"
          value={form.company ?? ''}
          onChange={e => upd('company', e.target.value || undefined)}
          placeholder="Company or org"
        />
        <Select
          label="Status"
          value={form.status ?? ''}
          onChange={e => upd('status', e.target.value || undefined)}
          placeholder="— None —"
          options={STATUSES.map(s => ({ value: s, label: s }))}
        />
        <Select
          label="Group under"
          value={form.workspace_group ?? ''}
          onChange={e => upd('workspace_group', e.target.value || undefined)}
          placeholder="Standalone (directly under Work)"
          options={[{ value: 'dextrous', label: 'Dextrous' }]}
        />
        <Textarea
          label="Notes"
          value={form.notes ?? ''}
          onChange={e => upd('notes', e.target.value || undefined)}
          placeholder="Context, engagement details…"
          rows={3}
        />
      </ItemDrawer>
    </div>
  )
}
