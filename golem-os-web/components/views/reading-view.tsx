'use client'
import { useState, useEffect, useMemo } from 'react'
import { Plus, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button, Input, Select } from '@/components/ui'
import { StatusFilter, initStatuses, saveStatuses } from '@/components/data/status-filter'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { ReadingRow } from '@/types/entities'

const STATUSES = ['Want to Read', 'Reading', 'Paused', 'Read']
const FILTER_KEY = 'golem:filter:reading'

const STATUS_COLOR: Record<string, string> = {
  'Reading':       '#DA6B51',
  'Want to Read':  '#6B6560',
  'Paused':        '#5B5F8D',
  'Read':          '#A8A39A',
}

type Form = Partial<Omit<ReadingRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export function ReadingView({ initialItems }: { initialItems: ReadingRow[] }) {
  const [items, setItems] = useState(initialItems)
  const [activeStatuses, setActiveStatuses] = useState<string[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editItem, setEditItem] = useState<ReadingRow | null>(null)
  const [form, setForm] = useState<Form>({})

  useEffect(() => {
    setActiveStatuses(initStatuses(FILTER_KEY, STATUSES, ['Read']))
  }, [])

  const upd = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm(f => ({ ...f, [k]: v ?? null }))

  const openNew = () => {
    setEditItem(null)
    setForm({ status: 'Want to Read' })
    setDrawerOpen(true)
  }

  const openEdit = (item: ReadingRow) => {
    setEditItem(item)
    setForm({
      book_title: item.book_title,
      author: item.author,
      status: item.status,
      progress_pct: item.progress_pct,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    if (!form.book_title?.trim()) { toast.error('Title is required'); return }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    if (editItem) {
      const { error } = await sb.from('reading').update(form).eq('id', editItem.id)
      if (error) throw error
      setItems(prev => prev.map(r => r.id === editItem.id ? { ...r, ...form } : r))
      toast.success('Updated')
    } else {
      const { data, error } = await sb
        .from('reading')
        .insert({ ...form, book_title: form.book_title!, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      if (data) setItems(prev => [data, ...prev])
      toast.success('Added to reading list')
    }
    setDrawerOpen(false)
  }

  const handleDelete = async () => {
    if (!editItem) return
    const sb = createClient()
    const { error } = await sb.from('reading').delete().eq('id', editItem.id)
    if (error) throw error
    setItems(prev => prev.filter(r => r.id !== editItem.id))
    setDrawerOpen(false)
    toast.success('Removed')
  }

  const filtered = useMemo(() =>
    items.filter(r => !r.status || activeStatuses.includes(r.status)),
    [items, activeStatuses]
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Reading</h1>
        <Button onClick={openNew} size="sm">
          <Plus size={14} /> Add Book
        </Button>
      </div>

      <StatusFilter
        statuses={STATUSES}
        active={activeStatuses}
        onChange={(next) => { setActiveStatuses(next); saveStatuses(FILTER_KEY, next) }}
        colorMap={STATUS_COLOR}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map(item => (
          <button
            key={item.id}
            onClick={() => openEdit(item)}
            className="text-left bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 hover:border-stone-300 dark:hover:border-stone-700 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <BookOpen
                size={16}
                className="shrink-0 mt-0.5"
                style={{ color: item.status ? (STATUS_COLOR[item.status] ?? '#6B6560') : '#6B6560' }}
              />
              {item.status && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: (STATUS_COLOR[item.status] ?? '#6B6560') + '22',
                    color: STATUS_COLOR[item.status] ?? '#6B6560',
                  }}
                >
                  {item.status}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100 leading-snug line-clamp-2 mb-1">
              {item.book_title}
            </p>
            {item.author && (
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{item.author}</p>
            )}
            {item.progress_pct != null && item.progress_pct > 0 && (
              <div className="mt-2">
                <div className="h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.progress_pct}%`,
                      backgroundColor: STATUS_COLOR['Reading'],
                    }}
                  />
                </div>
                <p className="text-xs text-stone-400 mt-0.5">{item.progress_pct}%</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">No books match the current filter.</p>
        </div>
      )}

      <ItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editItem ? 'Edit Book' : 'Add Book'}
        onSave={handleSave}
        onDelete={editItem ? handleDelete : undefined}
      >
        <Input
          label="Book Title"
          value={form.book_title ?? ''}
          onChange={e => upd('book_title', e.target.value)}
          placeholder="Title"
        />
        <Input
          label="Author"
          value={form.author ?? ''}
          onChange={e => upd('author', e.target.value)}
          placeholder="Author"
        />
        <Select
          label="Status"
          value={form.status ?? ''}
          onChange={e => upd('status', e.target.value)}
          placeholder="— None —"
          options={STATUSES.map(s => ({ value: s, label: s }))}
        />
        <Input
          label="Progress %"
          type="number"
          min="0"
          max="100"
          value={form.progress_pct ?? ''}
          onChange={e => upd('progress_pct', e.target.value ? Number(e.target.value) : null)}
          placeholder="0–100"
        />
      </ItemDrawer>
    </div>
  )
}
