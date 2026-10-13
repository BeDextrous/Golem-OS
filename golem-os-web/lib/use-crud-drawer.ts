'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

interface Options<Row extends { id: number }, Form> {
  table: string
  initialItems: Row[]
  /** Form state for a blank "new" item. */
  newForm: () => Form
  /** Form state when editing an existing row. */
  toForm: (row: Row) => Form
  /** Return an error message to block the save. */
  validate?: (form: Form) => string | null
  /** Shape the payload written to the database (defaults to the form as-is). */
  toPayload?: (form: Form) => Partial<Form>
  /** Omit to make the drawer edit-only. */
  canCreate?: boolean
  messages?: { created?: string; updated?: string; deleted?: string }
}

/**
 * State and Supabase writes for a list + edit-drawer view: open/close, form
 * state, create / update / delete with local list sync. Save and delete
 * throw on database errors; ItemDrawer catches them and shows a toast.
 */
export function useCrudDrawer<Row extends { id: number }, Form extends object>({
  table, initialItems, newForm, toForm, validate, toPayload, canCreate = true, messages,
}: Options<Row, Form>) {
  const [items, setItems] = useState<Row[]>(initialItems)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editItem, setEditItem] = useState<Row | null>(null)
  const [form, setForm] = useState<Form>({} as Form)

  const upd = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm(f => ({ ...f, [k]: v ?? null }))

  const openNew = () => {
    setEditItem(null)
    setForm(newForm())
    setDrawerOpen(true)
  }

  const openEdit = (row: Row) => {
    setEditItem(row)
    setForm(toForm(row))
    setDrawerOpen(true)
  }

  const closeDrawer = () => setDrawerOpen(false)

  const save = async () => {
    const problem = validate?.(form)
    if (problem) { toast.error(problem); return }
    const payload = (toPayload ? toPayload(form) : form) as Record<string, unknown>
    const sb = createClient()

    if (editItem) {
      const { error } = await sb.from(table).update(payload).eq('id', editItem.id)
      if (error) throw error
      setItems(prev => prev.map(r => r.id === editItem.id ? { ...r, ...payload } as Row : r))
      toast.success(messages?.updated ?? 'Updated')
    } else if (canCreate) {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await sb
        .from(table)
        .insert({ ...payload, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      if (data) setItems(prev => [data as Row, ...prev])
      toast.success(messages?.created ?? 'Created')
    }
    setDrawerOpen(false)
  }

  const remove = async () => {
    if (!editItem) return
    const sb = createClient()
    const { error } = await sb.from(table).delete().eq('id', editItem.id)
    if (error) throw error
    setItems(prev => prev.filter(r => r.id !== editItem.id))
    setDrawerOpen(false)
    toast.success(messages?.deleted ?? 'Deleted')
  }

  return {
    items, setItems, form, setForm, upd,
    drawerOpen, closeDrawer, editItem,
    openNew, openEdit, save, remove,
  }
}
