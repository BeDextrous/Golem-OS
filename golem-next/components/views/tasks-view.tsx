'use client'
import { useState, useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button, Input, Select, Badge } from '@/components/ui'
import { StatusFilter, initStatuses, saveStatuses } from '@/components/data/status-filter'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { TaskRow, GoalRow, ObjectiveRow } from '@/types/entities'

const STATUSES = ['To Do', 'Active', 'On Hold', 'Done']
const PRIORITIES = ['High', 'Medium', 'Low']
const FILTER_KEY = 'golem:filter:tasks'

const STATUS_COLOR: Record<string, string> = {
  'Active':  '#639922',
  'To Do':   '#6B6560',
  'On Hold': '#D85A30',
  'Done':    '#A8A39A',
}

const PRIORITY_COLOR: Record<string, string> = {
  High:   'text-red-500',
  Medium: 'text-amber-500',
  Low:    'text-stone-400',
}

type Form = Partial<Omit<TaskRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

interface Props {
  initialTasks: TaskRow[]
  goals: GoalRow[]
  objectives: ObjectiveRow[]
}

export function TasksView({ initialTasks, goals, objectives }: Props) {
  const [items, setItems] = useState(initialTasks)
  const [activeStatuses, setActiveStatuses] = useState<string[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editItem, setEditItem] = useState<TaskRow | null>(null)
  const [form, setForm] = useState<Form>({})

  useEffect(() => {
    setActiveStatuses(initStatuses(FILTER_KEY, STATUSES, ['Done']))
  }, [])

  const upd = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm(f => ({ ...f, [k]: v ?? null }))

  const openNew = () => {
    setEditItem(null)
    setForm({ status: 'To Do' })
    setDrawerOpen(true)
  }

  const openEdit = (item: TaskRow) => {
    setEditItem(item)
    setForm({
      name: item.name,
      status: item.status,
      priority: item.priority,
      area: item.area,
      due_date: item.due_date,
      objective_id: item.objective_id,
      pillar: item.pillar,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Name is required'); return }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    if (editItem) {
      const { error } = await sb.from('tasks').update(form).eq('id', editItem.id)
      if (error) throw error
      setItems(prev => prev.map(t => t.id === editItem.id ? { ...t, ...form } : t))
      toast.success('Task updated')
    } else {
      const { data, error } = await sb
        .from('tasks')
        .insert({ ...form, name: form.name!, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      if (data) setItems(prev => [data, ...prev])
      toast.success('Task created')
    }
    setDrawerOpen(false)
  }

  const handleDelete = async () => {
    if (!editItem) return
    const sb = createClient()
    const { error } = await sb.from('tasks').delete().eq('id', editItem.id)
    if (error) throw error
    setItems(prev => prev.filter(t => t.id !== editItem.id))
    setDrawerOpen(false)
    toast.success('Task deleted')
  }

  const filtered = useMemo(() =>
    items.filter(t => !t.status || activeStatuses.includes(t.status)),
    [items, activeStatuses]
  )

  const areas = useMemo(() => {
    const s = new Set(items.map(t => t.area || 'Unassigned'))
    return ['Unassigned', ...([...s].filter(x => x !== 'Unassigned').sort())]
  }, [items])

  const byArea = useMemo(() =>
    areas.reduce<Record<string, TaskRow[]>>((acc, area) => {
      acc[area] = filtered.filter(t => (t.area || 'Unassigned') === area)
      return acc
    }, {}),
    [areas, filtered]
  )

  const dynamicAreas = useMemo(() =>
    [...new Set(items.map(t => t.area).filter(Boolean) as string[])].sort(),
    [items]
  )

  const objByGoal = useMemo(() => {
    const map = new Map<string, { id: number; title: string }[]>()
    objectives.forEach(o => {
      const k = String(o.goal_id ?? 'unlinked')
      const entry = map.get(k) ?? []
      entry.push({ id: o.id, title: o.title || '' })
      map.set(k, entry)
    })
    return map
  }, [objectives])

  const goalTitle = useMemo(() =>
    Object.fromEntries(goals.map(g => [String(g.id), g.title || ''])),
    [goals]
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Tasks</h1>
        <Button onClick={openNew} size="sm">
          <Plus size={14} /> New Task
        </Button>
      </div>

      <StatusFilter
        statuses={STATUSES}
        active={activeStatuses}
        onChange={(next) => { setActiveStatuses(next); saveStatuses(FILTER_KEY, next) }}
        colorMap={STATUS_COLOR}
      />

      {areas.map(area => {
        const areaItems = byArea[area]
        if (!areaItems?.length) return null
        return (
          <section key={area}>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
              {area}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {areaItems.map(task => (
                <button
                  key={task.id}
                  onClick={() => openEdit(task)}
                  className="text-left bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 hover:border-stone-300 dark:hover:border-stone-700 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100 leading-snug line-clamp-2 group-hover:text-stone-700 dark:group-hover:text-stone-200">
                      {task.name}
                    </p>
                    {task.status && (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: (STATUS_COLOR[task.status] ?? '#6B6560') + '22',
                          color: STATUS_COLOR[task.status] ?? '#6B6560',
                        }}
                      >
                        {task.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.priority && (
                      <span className={cn('text-xs font-semibold', PRIORITY_COLOR[task.priority] ?? 'text-stone-400')}>
                        {task.priority}
                      </span>
                    )}
                    {task.due_date && (
                      <span className="text-xs text-stone-400">{task.due_date}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )
      })}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">No tasks match the current filter.</p>
        </div>
      )}

      <ItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editItem ? 'Edit Task' : 'New Task'}
        onSave={handleSave}
        onDelete={editItem ? handleDelete : undefined}
      >
        <Input
          label="Name"
          value={form.name ?? ''}
          onChange={e => upd('name', e.target.value)}
          placeholder="Task name"
        />
        <Select
          label="Status"
          value={form.status ?? ''}
          onChange={e => upd('status', e.target.value)}
          placeholder="— None —"
          options={STATUSES.map(s => ({ value: s, label: s }))}
        />
        <Select
          label="Priority"
          value={form.priority ?? ''}
          onChange={e => upd('priority', e.target.value)}
          placeholder="— None —"
          options={PRIORITIES.map(p => ({ value: p, label: p }))}
        />
        <Select
          label="Area"
          value={form.area ?? ''}
          onChange={e => upd('area', e.target.value)}
          placeholder="— None —"
          options={dynamicAreas.map(a => ({ value: a, label: a }))}
        />
        <Input
          label="Due Date"
          type="date"
          value={form.due_date ?? ''}
          onChange={e => upd('due_date', e.target.value || null)}
        />
        <Select
          label="Objective"
          value={form.objective_id ? String(form.objective_id) : ''}
          onChange={e => upd('objective_id', e.target.value ? Number(e.target.value) : null)}
          placeholder="— None —"
          groups={[...objByGoal.entries()].map(([gid, objs]) => ({
            label: goalTitle[gid] || (gid === 'unlinked' ? 'Unlinked' : `Goal ${gid}`),
            options: objs.map(o => ({ value: String(o.id), label: o.title })),
          }))}
        />
        <Select
          label="Pillar"
          value={form.pillar ?? ''}
          onChange={e => upd('pillar', e.target.value)}
          placeholder="— None —"
          options={[
            { value: 'life', label: 'Life' },
            { value: 'dextrous', label: 'Dextrous' },
            { value: 'work', label: 'Work' },
          ]}
        />
      </ItemDrawer>
    </div>
  )
}
