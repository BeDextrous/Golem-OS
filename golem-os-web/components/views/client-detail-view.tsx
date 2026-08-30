'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Check, X as XIcon, FolderPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button, Select, Textarea, Input } from '@/components/ui'
import { DriveWidget } from '@/components/widgets/drive-widget'
import { extractDriveFolderId } from '@/lib/utils'
import type { ClientRow, ProjectRow, TaskRow, InvoiceRow } from '@/types/entities'

const STATUSES = ['Prospect', 'Active', 'Paused', 'Closed']
const STATUS_COLOR: Record<string, string> = {
  Prospect: '#DA6B51',
  Active:   '#7FA98A',
  Paused:   '#D9B45C',
  Closed:   '#A8A39A',
}

function fmtMoney(n: number | null, currency = 'USD') {
  if (n == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(iso: string): number {
  const target = new Date(iso + 'T00:00:00').getTime()
  return Math.round((target - new Date().setHours(0, 0, 0, 0)) / 86_400_000)
}

interface OutstandingItem {
  key: string
  label: string
  date: string | null
  kind: 'task' | 'project' | 'invoice'
}

interface DoneItem {
  key: string
  label: string
  when: string
  kind: 'task' | 'project'
}

export function ClientDetailView({
  client, projects, tasks, invoices,
}: {
  client: ClientRow
  projects: ProjectRow[]
  tasks: TaskRow[]
  invoices: InvoiceRow[]
}) {
  const [current, setCurrent]   = useState(client)
  const [editingStatus, setEditingStatus] = useState(false)
  const [editingUpdate, setEditingUpdate] = useState(false)
  const [editingFolder, setEditingFolder] = useState(false)
  const [statusDraft, setStatusDraft]     = useState(current.status ?? 'Active')
  const [updateDraft, setUpdateDraft]     = useState(current.latest_update ?? '')
  const [folderDraft, setFolderDraft]     = useState(current.drive_folder_url ?? '')
  const [saving, setSaving]               = useState(false)

  const openTasks    = tasks.filter(t => t.status !== 'Done')
  const doneTasks     = tasks.filter(t => t.status === 'Done')
  const openProjects = projects.filter(p => p.status !== 'Done' && p.status !== 'Cancelled')
  const doneProjects  = projects.filter(p => p.status === 'Done')
  const unpaidInvoices = invoices.filter(i => i.status === 'Draft' || i.status === 'Sent' || i.status === 'Overdue')
  const overdueInvoices = invoices.filter(i => i.status === 'Overdue')

  const outstanding: OutstandingItem[] = [
    ...openTasks.map(t => ({ key: `task-${t.id}`, label: t.name, date: t.due_date, kind: 'task' as const })),
    ...openProjects.map(p => ({ key: `project-${p.id}`, label: p.name, date: p.end_date, kind: 'project' as const })),
    ...unpaidInvoices.map(i => ({
      key: `invoice-${i.id}`,
      label: `Invoice ${fmtMoney(i.amount, i.currency ?? 'USD')}${i.status === 'Overdue' ? ' (overdue)' : ''}`,
      date: i.due_date,
      kind: 'invoice' as const,
    })),
  ].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date)
  })

  const nextDeadline = outstanding.find(i => i.date)?.date ?? null

  const recentDone: DoneItem[] = [
    ...doneTasks.map(t => ({ key: `task-${t.id}`, label: t.name, when: t.updated_at, kind: 'task' as const })),
    ...doneProjects.map(p => ({ key: `project-${p.id}`, label: p.name, when: p.updated_at, kind: 'project' as const })),
  ]
    .sort((a, b) => b.when.localeCompare(a.when))
    .slice(0, 6)

  const saveField = async (patch: Partial<ClientRow>) => {
    setSaving(true)
    try {
      const sb = createClient()
      const { error } = await sb.from('clients').update(patch).eq('id', current.id)
      if (error) throw error
      setCurrent(prev => ({ ...prev, ...patch }))
      toast.success('Updated')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveStatus = async () => {
    await saveField({ status: statusDraft })
    setEditingStatus(false)
  }

  const handleSaveUpdate = async () => {
    await saveField({ latest_update: updateDraft || null, latest_update_at: updateDraft ? new Date().toISOString() : null })
    setEditingUpdate(false)
  }

  const handleSaveFolder = async () => {
    const id = extractDriveFolderId(folderDraft)
    if (folderDraft && !id) {
      toast.error("Couldn't find a folder ID in that link")
      return
    }
    await saveField({ drive_folder_url: folderDraft || null, drive_folder_id: id })
    setEditingFolder(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link
          href="/dextrous/clients"
          className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors mb-3"
        >
          <ArrowLeft size={12} /> All clients
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">{current.name}</h1>
            <p className="text-xs text-stone-400 mt-0.5">
              {current.company ?? '—'}
              {current.contract_value != null && (
                <span className="ml-1">· {fmtMoney(current.contract_value, current.currency ?? 'USD')}</span>
              )}
            </p>
          </div>

          {/* Status pill / editor */}
          {editingStatus ? (
            <div className="flex items-center gap-1.5">
              <Select
                value={statusDraft}
                onChange={e => setStatusDraft(e.target.value)}
                options={STATUSES.map(s => ({ value: s, label: s }))}
              />
              <button onClick={handleSaveStatus} disabled={saving} className="p-1.5 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40">
                <Check size={14} />
              </button>
              <button onClick={() => { setEditingStatus(false); setStatusDraft(current.status ?? 'Active') }} className="p-1.5 rounded-md text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800">
                <XIcon size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingStatus(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0"
              style={{ backgroundColor: `${STATUS_COLOR[current.status ?? 'Active']}22`, color: STATUS_COLOR[current.status ?? 'Active'] }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[current.status ?? 'Active'] }} />
              {current.status ?? 'Active'}
              <Pencil size={10} className="opacity-60" />
            </button>
          )}
        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-stone-100 dark:divide-stone-800 border-b border-stone-100 dark:border-stone-800">
          <div className="px-4 py-3">
            <p className="text-lg font-semibold text-stone-900 dark:text-stone-50 tabular-nums">{outstanding.length}</p>
            <p className="text-xs text-stone-400">outstanding</p>
          </div>
          <div className="px-4 py-3">
            <p className={`text-lg font-semibold tabular-nums ${overdueInvoices.length > 0 ? 'text-red-500' : 'text-stone-900 dark:text-stone-50'}`}>
              {nextDeadline ? fmtDate(nextDeadline) : '—'}
            </p>
            <p className="text-xs text-stone-400">
              {nextDeadline ? `next deadline · ${daysUntil(nextDeadline)}d` : 'no deadlines'}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-lg font-semibold text-stone-900 dark:text-stone-50 tabular-nums">
              {unpaidInvoices.length > 0 ? fmtMoney(unpaidInvoices.reduce((s, i) => s + i.amount, 0)) : '$0'}
            </p>
            <p className="text-xs text-stone-400">unpaid ({unpaidInvoices.length})</p>
          </div>
        </div>

        {/* Latest update note */}
        <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Latest update</p>
            {!editingUpdate && (
              <button onClick={() => setEditingUpdate(true)} className="text-stone-300 hover:text-stone-500">
                <Pencil size={11} />
              </button>
            )}
          </div>
          {editingUpdate ? (
            <div className="space-y-2">
              <Textarea
                value={updateDraft}
                onChange={e => setUpdateDraft(e.target.value)}
                placeholder="What's the latest on this client?"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveUpdate} loading={saving}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingUpdate(false); setUpdateDraft(current.latest_update ?? '') }}>Cancel</Button>
              </div>
            </div>
          ) : current.latest_update ? (
            <>
              <p className="text-sm text-stone-700 dark:text-stone-300">{current.latest_update}</p>
              {current.latest_update_at && (
                <p className="text-xs text-stone-400 mt-1">{fmtDate(current.latest_update_at.slice(0, 10))}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-stone-400 italic">No update yet — click the pencil to add one.</p>
          )}
        </div>

        {/* Outstanding + recently done */}
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-stone-100 dark:divide-stone-800">
          <div className="px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">Outstanding</p>
            {outstanding.length === 0 ? (
              <p className="text-xs text-stone-400">Nothing open.</p>
            ) : (
              <ul className="space-y-1.5">
                {outstanding.slice(0, 8).map(item => (
                  <li key={item.key} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-stone-700 dark:text-stone-300 truncate">{item.label}</span>
                    {item.date && <span className="text-stone-400 shrink-0 tabular-nums">{fmtDate(item.date)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">Latest work done</p>
            {recentDone.length === 0 ? (
              <p className="text-xs text-stone-400">Nothing marked done yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {recentDone.map(item => (
                  <li key={item.key} className="text-xs text-stone-700 dark:text-stone-300 truncate">
                    {item.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ── Work product (Drive) ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Work Product</p>
          {current.drive_folder_id && !editingFolder && (
            <button onClick={() => setEditingFolder(true)} className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
              Change folder
            </button>
          )}
        </div>

        {editingFolder || !current.drive_folder_id ? (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <FolderPlus size={18} className="text-stone-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-700 dark:text-stone-300">
                  Paste the link to this client's Drive work-product folder
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  e.g. My Drive/Projects/Dextrous/Clients/{current.name}/work-product
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={folderDraft}
                onChange={e => setFolderDraft(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/…"
                className="flex-1"
              />
              <Button size="sm" onClick={handleSaveFolder} loading={saving}>Save</Button>
              {current.drive_folder_id && (
                <Button size="sm" variant="ghost" onClick={() => { setEditingFolder(false); setFolderDraft(current.drive_folder_url ?? '') }}>Cancel</Button>
              )}
            </div>
          </div>
        ) : (
          <DriveWidget connection="dextrous" folderId={current.drive_folder_id} />
        )}
      </section>
    </div>
  )
}
