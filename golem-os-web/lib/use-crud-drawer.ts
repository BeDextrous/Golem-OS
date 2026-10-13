'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { createRow, deleteRow, updateRow } from '@/app/actions/crud'
import type { CrudTable } from '@/lib/validation'

interface Options<Row extends { id: number }, Form> {
  table: CrudTable
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

    if (editItem) {
      const result = await updateRow(table, editItem.id, payload)
      if (!result.ok) throw new Error(result.error)
      setItems(prev => prev.map(r => r.id === editItem.id ? { ...r, ...result.data } as unknown as Row : r))
      toast.success(messages?.updated ?? 'Updated')
    } else if (canCreate) {
      const result = await createRow(table, payload)
      if (!result.ok) throw new Error(result.error)
      setItems(prev => [result.data as unknown as Row, ...prev])
      toast.success(messages?.created ?? 'Created')
    }
    setDrawerOpen(false)
  }

  const remove = async () => {
    if (!editItem) return
    const result = await deleteRow(table, editItem.id)
    if (!result.ok) throw new Error(result.error)
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
