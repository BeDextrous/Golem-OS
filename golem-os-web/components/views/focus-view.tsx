'use client'
import { useState, useEffect, useMemo } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { StatusFilter, initStatuses, saveStatuses } from '@/components/data/status-filter'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { TaskRow, GoalRow, ObjectiveRow } from '@/types/entities'

// ── Constants ─────────────────────────────────────────────────────────────────

type ItemType = 'task' | 'goal' | 'objective'

const TASK_STATUSES  = ['To Do', 'Active', 'On Hold', 'Done']
const GOAL_STATUSES  = ['Active', 'Paused', 'Done', 'Archived']
const ALL_STATUSES   = ['To Do', 'Active', 'On Hold', 'Paused', 'Done', 'Archived']
const PRIORITIES     = ['High', 'Medium', 'Low']
const FILTER_KEY     = 'golem:filter:focus'
const PILLAR_OPTS    = [
  { value: 'life',      label: 'Life',      color: '#7FA98A' },
  { value: 'dextrous',  label: 'Dextrous',  color: '#DA6B51' },
  { value: 'work',      label: 'Work',      color: '#5B5F8D' },
]
const TYPE_COLORS: Record<ItemType, string> = {
  task:      '#5B5F8D',
  goal:      '#DA6B51',
  objective: '#9B59B6',
}
const STATUS_COLOR: Record<string, string> = {
  'Active':   '#7FA98A',
  'To Do':    '#6B6560',
  'On Hold':  '#5B5F8D',
  'Paused':   '#F5A623',
  'Done':     '#A8A39A',
  'Archived': '#C0B9B2',
}
const PRIORITY_COLOR: Record<string, string> = {
  High:   'text-red-500',
  Medium: 'text-amber-500',
  Low:    'text-stone-400',
}
const SORT_OPTIONS = [
  { value: 'created', label: 'Created' },
  { value: 'due',     label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'status',   label: 'Status' },
  { value: 'pillar',   label: 'Pillar' },
]
const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
const STATUS_ORDER: Record<string, number>   = { 'To Do': 0, Active: 1, 'On Hold': 2, Paused: 3, Done: 4, Archived: 5 }
const PILLAR_ORDER: Record<string, number>   = { life: 0, work: 1, dextrous: 2 }

// ── Normalised shape ──────────────────────────────────────────────────────────

interface FocusItem {
  type:       ItemType
  id:         number
  title:      string
  status:     string | null
  priority:   string | null
  dueDate:    string | null
  pillar:     string | null
  goalTitle?: string
  progress?:  string
  raw:        TaskRow | GoalRow | ObjectiveRow
}

function normalise(
  tasks: TaskRow[],
  goals: GoalRow[],
  objectives: ObjectiveRow[],
): FocusItem[] {
  const goalTitleMap = Object.fromEntries(goals.map(g => [g.id, g.title ?? '']))
  const taskItems: FocusItem[] = tasks.map(t => ({
    type: 'task', id: t.id,
    title: t.name ?? '', status: t.status, priority: t.priority,
    dueDate: t.due_date, pillar: t.pillar, raw: t,
  }))
  const goalItems: FocusItem[] = goals.map(g => ({
    type: 'goal', id: g.id,
    title: g.title ?? '', status: g.status, priority: null,
    dueDate: null, pillar: g.pillar, raw: g,
  }))
  const objItems: FocusItem[] = objectives.map(o => {
    const progress = o.target_value != null
      ? `${o.current_value ?? 0}${o.metric_unit ? ` ${o.metric_unit}` : ''} / ${o.target_value}${o.metric_unit ? ` ${o.metric_unit}` : ''}`
      : undefined
    return {
      type: 'objective', id: o.id,
      title: o.title ?? '', status: null, priority: null,
      dueDate: o.deadline, pillar: o.pillar,
      goalTitle: o.goal_id ? goalTitleMap[o.goal_id] : undefined,
      progress, raw: o,
    }
  })
  return [...taskItems, ...goalItems, ...objItems]
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initialTasks:      TaskRow[]
  initialGoals:      GoalRow[]
  initialObjectives: ObjectiveRow[]
}

// ── Form types ────────────────────────────────────────────────────────────────

type TaskForm = Partial<Omit<TaskRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
type GoalForm = Partial<Omit<GoalRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
type ObjForm  = Partial<Omit<ObjectiveRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// ── Component ─────────────────────────────────────────────────────────────────

export function FocusView({ initialTasks, initialGoals, initialObjectives }: Props) {
  const [tasks,      setTasks]      = useState(initialTasks)
  const [goals,      setGoals]      = useState(initialGoals)
  const [objectives, setObjectives] = useState(initialObjectives)

  // Filters
  const [typeFilter,   setTypeFilter]   = useState<ItemType | 'all'>('all')
  const [pillarFilter, setPillarFilter] = useState<string | null>(null)
  const [sortBy,       setSortBy]       = useState<string>('created')
  const [activeStatuses, setActiveStatuses] = useState<string[]>([])

  useEffect(() => {
    setActiveStatuses(initStatuses(FILTER_KEY, ALL_STATUSES, ['Done', 'Archived']))
  }, [])

  // ── Task drawer ────────────────────────────────────────────────────────────
  const [taskOpen,  setTaskOpen]  = useState(false)
  const [editTask,  setEditTask]  = useState<TaskRow | null>(null)
  const [taskForm,  setTaskForm]  = useState<TaskForm>({})

  const updT = <K extends keyof TaskForm>(k: K, v: TaskForm[K]) =>
    setTaskForm(f => ({ ...f, [k]: v ?? null }))

  const openNewTask = () => {
    setEditTask(null)
    setTaskForm({ status: 'To Do', pillar: pillarFilter })
    setTaskOpen(true)
  }
  const openEditTask = (t: TaskRow) => {
    setEditTask(t)
    setTaskForm({ name: t.name, status: t.status, priority: t.priority, area: t.area, due_date: t.due_date, objective_id: t.objective_id, pillar: t.pillar })
    setTaskOpen(true)
  }
  const handleSaveTask = async () => {
    if (!taskForm.name?.trim()) { toast.error('Name is required'); return }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    if (editTask) {
      const { error } = await sb.from('tasks').update(taskForm).eq('id', editTask.id)
      if (error) throw error
      setTasks(prev => prev.map(t => t.id === editTask.id ? { ...t, ...taskForm } : t))
      toast.success('Task updated')
    } else {
      const { data, error } = await sb.from('tasks').insert({ ...taskForm, name: taskForm.name!, user_id: user.id }).select().single()
      if (error) throw error
      if (data) setTasks(prev => [data, ...prev])
      toast.success('Task created')
    }
    setTaskOpen(false)
  }
  const handleDeleteTask = async () => {
    if (!editTask) return
    const sb = createClient()
    const { error } = await sb.from('tasks').delete().eq('id', editTask.id)
    if (error) throw error
    setTasks(prev => prev.filter(t => t.id !== editTask.id))
    setTaskOpen(false)
    toast.success('Deleted')
  }

  // ── Goal drawer ────────────────────────────────────────────────────────────
  const [goalOpen,  setGoalOpen]  = useState(false)
  const [editGoal,  setEditGoal]  = useState<GoalRow | null>(null)
  const [goalForm,  setGoalForm]  = useState<GoalForm>({})

  const updG = <K extends keyof GoalForm>(k: K, v: GoalForm[K]) =>
    setGoalForm(f => ({ ...f, [k]: v ?? undefined }))

  const openNewGoal = () => {
    setEditGoal(null)
    setGoalForm({ status: 'Active', pillar: pillarFilter ?? undefined })
    setGoalOpen(true)
  }
  const openEditGoal = (g: GoalRow) => {
    setEditGoal(g)
    setGoalForm({ title: g.title, status: g.status ?? undefined, area: g.area ?? undefined, pillar: g.pillar ?? undefined, notes: g.notes ?? undefined })
    setGoalOpen(true)
  }
  const handleSaveGoal = async () => {
    if (!goalForm.title?.trim()) { toast.error('Title is required'); return }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const payload = { ...goalForm, title: goalForm.title! }
    if (editGoal) {
      const { error } = await sb.from('goals').update(payload).eq('id', editGoal.id)
      if (error) throw error
      setGoals(prev => prev.map(g => g.id === editGoal.id ? { ...g, ...payload } : g))
      toast.success('Updated')
    } else {
      const { data, error } = await sb.from('goals').insert({ ...payload, user_id: user.id }).select().single()
      if (error) throw error
      if (data) setGoals(prev => [data, ...prev])
      toast.success('Goal added')
    }
    setGoalOpen(false)
  }
  const handleDeleteGoal = async () => {
    if (!editGoal) return
    const sb = createClient()
    const { error } = await sb.from('goals').delete().eq('id', editGoal.id)
    if (error) throw error
    setGoals(prev => prev.filter(g => g.id !== editGoal.id))
    setObjectives(prev => prev.filter(o => o.goal_id !== editGoal.id))
    setGoalOpen(false)
    toast.success('Deleted')
  }

  // ── Objective drawer ───────────────────────────────────────────────────────
  const [objOpen,  setObjOpen]  = useState(false)
  const [editObj,  setEditObj]  = useState<ObjectiveRow | null>(null)
  const [objForm,  setObjForm]  = useState<ObjForm>({})

  const updO = <K extends keyof ObjForm>(k: K, v: ObjForm[K]) =>
    setObjForm(f => ({ ...f, [k]: v ?? undefined }))

  const openEditObj = (o: ObjectiveRow) => {
    setEditObj(o)
    setObjForm({ title: o.title, goal_id: o.goal_id ?? undefined, current_value: o.current_value ?? undefined, target_value: o.target_value ?? undefined, metric_unit: o.metric_unit ?? undefined, deadline: o.deadline ?? undefined, pillar: o.pillar ?? undefined })
    setObjOpen(true)
  }
  const handleSaveObj = async () => {
    if (!objForm.title?.trim()) { toast.error('Title is required'); return }
    const sb = createClient()
    if (editObj) {
      const { error } = await sb.from('objectives').update(objForm).eq('id', editObj.id)
      if (error) throw error
      setObjectives(prev => prev.map(o => o.id === editObj.id ? { ...o, ...objForm } : o))
      toast.success('Updated')
    }
    setObjOpen(false)
  }
  const handleDeleteObj = async () => {
    if (!editObj) return
    const sb = createClient()
    const { error } = await sb.from('objectives').delete().eq('id', editObj.id)
    if (error) throw error
    setObjectives(prev => prev.filter(o => o.id !== editObj.id))
    setObjOpen(false)
    toast.success('Deleted')
  }

  // ── Click handler dispatcher ──────────────────────────────────────────────
  const openItem = (item: FocusItem) => {
    if (item.type === 'task')      openEditTask(item.raw as TaskRow)
    else if (item.type === 'goal') openEditGoal(item.raw as GoalRow)
    else                           openEditObj(item.raw as ObjectiveRow)
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const allItems = useMemo(() => normalise(tasks, goals, objectives), [tasks, goals, objectives])

  const filtered = useMemo(() => {
    let items = allItems
    if (typeFilter !== 'all')  items = items.filter(i => i.type === typeFilter)
    if (pillarFilter)          items = items.filter(i => i.pillar === pillarFilter)
    // Status filter: objectives have no status — always show them unless type-filtered to hide
    items = items.filter(i =>
      i.type === 'objective' ? true : (!i.status || activeStatuses.includes(i.status))
    )
    return items
  }, [allItems, typeFilter, pillarFilter, activeStatuses])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    switch (sortBy) {
      case 'due':
        return copy.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return a.dueDate.localeCompare(b.dueDate)
        })
      case 'priority':
        return copy.sort((a, b) =>
          (PRIORITY_ORDER[a.priority ?? ''] ?? 99) - (PRIORITY_ORDER[b.priority ?? ''] ?? 99)
        )
      case 'status':
        return copy.sort((a, b) =>
          (STATUS_ORDER[a.status ?? ''] ?? 99) - (STATUS_ORDER[b.status ?? ''] ?? 99)
        )
      case 'pillar':
        return copy.sort((a, b) =>
          (PILLAR_ORDER[a.pillar ?? ''] ?? 99) - (PILLAR_ORDER[b.pillar ?? ''] ?? 99)
        )
      default:
        return copy // created order (already sorted by insertion)
    }
  }, [filtered, sortBy])

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
    Object.fromEntries(goals.map(g => [String(g.id), g.title ?? ''])),
    [goals]
  )

  const dynamicAreas = useMemo(() =>
    [...new Set(tasks.map(t => t.area).filter(Boolean) as string[])].sort(),
    [tasks]
  )

  const counts = useMemo(() => ({
    task:      allItems.filter(i => i.type === 'task').length,
    goal:      allItems.filter(i => i.type === 'goal').length,
    objective: allItems.filter(i => i.type === 'objective').length,
  }), [allItems])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Focus</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {counts.task} tasks · {counts.goal} goals · {counts.objective} objectives
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openNewTask} size="sm" variant="secondary">
            <Plus size={13} /> Task
          </Button>
          <Button onClick={openNewGoal} size="sm">
            <Plus size={13} /> Goal
          </Button>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-1 flex-wrap">
        {(['all', 'task', 'goal', 'objective'] as const).map(t => {
          const isActive = typeFilter === t
          const count    = t === 'all' ? allItems.length : counts[t]
          const color    = t !== 'all' ? TYPE_COLORS[t] : '#292524'
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors capitalize ${
                isActive
                  ? 'text-white border-transparent'
                  : 'bg-white dark:bg-stone-900 text-stone-500 border-stone-200 dark:border-stone-700 hover:border-stone-400'
              }`}
              style={isActive ? { backgroundColor: color, borderColor: color } : undefined}
            >
              {t === 'all' ? 'All' : t === 'objective' ? 'Objectives' : `${t.charAt(0).toUpperCase() + t.slice(1)}s`}
              <span className={`ml-1.5 ${isActive ? 'opacity-70' : 'text-stone-400'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Pillar + Sort row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          {([null, ...PILLAR_OPTS] as const).map(p => {
            const isActive = pillarFilter === (p ? p.value : null)
            return (
              <button
                key={p ? p.value : 'all'}
                onClick={() => setPillarFilter(p ? p.value : null)}
                className={`px-2.5 py-0.5 text-xs rounded-full border transition-colors ${
                  isActive
                    ? 'text-white border-transparent'
                    : 'bg-white dark:bg-stone-900 text-stone-500 border-stone-200 dark:border-stone-700 hover:border-stone-400'
                }`}
                style={isActive ? { backgroundColor: p ? p.color : '#292524', borderColor: p ? p.color : '#292524' } : undefined}
              >
                {p ? p.label : 'All pillars'}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-400">Sort:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md px-2 py-1 text-stone-700 dark:text-stone-300 outline-none cursor-pointer hover:border-stone-300 transition-colors"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status filter (tasks + goals only) */}
      {typeFilter !== 'objective' && (
        <StatusFilter
          statuses={typeFilter === 'task' ? TASK_STATUSES : typeFilter === 'goal' ? GOAL_STATUSES : ALL_STATUSES}
          active={activeStatuses}
          onChange={(next) => { setActiveStatuses(next); saveStatuses(FILTER_KEY, next) }}
          colorMap={STATUS_COLOR}
        />
      )}

      {/* Item list */}
      <div className="space-y-1.5">
        {sorted.map(item => {
          const pillarConf = PILLAR_OPTS.find(p => p.value === item.pillar)
          const typeColor  = TYPE_COLORS[item.type]
          return (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => openItem(item)}
              className="w-full text-left bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg px-4 py-3 hover:border-stone-300 dark:hover:border-stone-700 transition-colors group flex items-center gap-3"
            >
              {/* Type badge */}
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wide"
                style={{ backgroundColor: typeColor + '18', color: typeColor }}
              >
                {item.type === 'objective' ? 'Obj' : item.type === 'task' ? 'Task' : 'Goal'}
              </span>

              {/* Pillar dot */}
              {pillarConf && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: pillarConf.color }}
                  title={pillarConf.label}
                />
              )}

              {/* Title + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate group-hover:text-stone-700 dark:group-hover:text-stone-200">
                  {item.title}
                </p>
                {(item.goalTitle || item.progress) && (
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 truncate">
                    {item.goalTitle && <span>{item.goalTitle}</span>}
                    {item.goalTitle && item.progress && <span className="mx-1">·</span>}
                    {item.progress && <span>{item.progress}</span>}
                  </p>
                )}
              </div>

              {/* Right meta */}
              <div className="flex items-center gap-2 shrink-0">
                {item.priority && (
                  <span className={cn('text-xs font-semibold', PRIORITY_COLOR[item.priority] ?? 'text-stone-400')}>
                    {item.priority}
                  </span>
                )}
                {item.status && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: (STATUS_COLOR[item.status] ?? '#6B6560') + '22',
                      color: STATUS_COLOR[item.status] ?? '#6B6560',
                    }}
                  >
                    {item.status}
                  </span>
                )}
                {item.dueDate && (
                  <span className="text-xs text-stone-400 dark:text-stone-500 font-mono">
                    {item.dueDate}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">No items match the current filters.</p>
        </div>
      )}

      {/* Task drawer */}
      <ItemDrawer
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        title={editTask ? 'Edit Task' : 'New Task'}
        onSave={handleSaveTask}
        onDelete={editTask ? handleDeleteTask : undefined}
      >
        <Input label="Name" value={taskForm.name ?? ''} onChange={e => updT('name', e.target.value)} placeholder="Task name" />
        <Select label="Status" value={taskForm.status ?? ''} onChange={e => updT('status', e.target.value)} placeholder="— None —" options={TASK_STATUSES.map(s => ({ value: s, label: s }))} />
        <Select label="Priority" value={taskForm.priority ?? ''} onChange={e => updT('priority', e.target.value)} placeholder="— None —" options={PRIORITIES.map(p => ({ value: p, label: p }))} />
        <Select label="Area" value={taskForm.area ?? ''} onChange={e => updT('area', e.target.value)} placeholder="— None —" options={dynamicAreas.map(a => ({ value: a, label: a }))} />
        <Input label="Due Date" type="date" value={taskForm.due_date ?? ''} onChange={e => updT('due_date', e.target.value || null)} />
        <Select
          label="Objective"
          value={taskForm.objective_id ? String(taskForm.objective_id) : ''}
          onChange={e => updT('objective_id', e.target.value ? Number(e.target.value) : null)}
          placeholder="— None —"
          groups={[...objByGoal.entries()].map(([gid, objs]) => ({
            label: goalTitle[gid] || (gid === 'unlinked' ? 'Unlinked' : `Goal ${gid}`),
            options: objs.map(o => ({ value: String(o.id), label: o.title })),
          }))}
        />
        <Select label="Pillar" value={taskForm.pillar ?? ''} onChange={e => updT('pillar', e.target.value)} placeholder="— None —" options={PILLAR_OPTS.map(p => ({ value: p.value, label: p.label }))} />
      </ItemDrawer>

      {/* Goal drawer */}
      <ItemDrawer
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        title={editGoal ? 'Edit Goal' : 'New Goal'}
        onSave={handleSaveGoal}
        onDelete={editGoal ? handleDeleteGoal : undefined}
      >
        <Input label="Title" value={goalForm.title ?? ''} onChange={e => updG('title', e.target.value)} placeholder="Goal title" />
        <Select label="Status" value={goalForm.status ?? ''} onChange={e => updG('status', e.target.value || undefined)} placeholder="— None —" options={GOAL_STATUSES.map(s => ({ value: s, label: s }))} />
        <Select label="Pillar" value={goalForm.pillar ?? ''} onChange={e => updG('pillar', e.target.value || undefined)} placeholder="— None —" options={PILLAR_OPTS.map(p => ({ value: p.value, label: p.label }))} />
        <Input label="Area" value={goalForm.area ?? ''} onChange={e => updG('area', e.target.value || undefined)} placeholder="e.g. Health, Career, Finance" />
        <Textarea label="Notes" value={goalForm.notes ?? ''} onChange={e => updG('notes', e.target.value || undefined)} placeholder="Context, motivation, next steps..." rows={4} />
      </ItemDrawer>

      {/* Objective drawer */}
      <ItemDrawer
        open={objOpen}
        onClose={() => setObjOpen(false)}
        title="Edit Objective"
        onSave={handleSaveObj}
        onDelete={editObj ? handleDeleteObj : undefined}
      >
        <Input label="Title" value={objForm.title ?? ''} onChange={e => updO('title', e.target.value)} placeholder="Objective title" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Current" type="number" step="any" value={objForm.current_value ?? ''} onChange={e => updO('current_value', e.target.value ? Number(e.target.value) : undefined)} placeholder="0" />
          <Input label="Target" type="number" step="any" value={objForm.target_value ?? ''} onChange={e => updO('target_value', e.target.value ? Number(e.target.value) : undefined)} placeholder="100" />
        </div>
        <Input label="Unit" value={objForm.metric_unit ?? ''} onChange={e => updO('metric_unit', e.target.value || undefined)} placeholder="e.g. km, books, sessions" />
        <Input label="Deadline" type="date" value={objForm.deadline ?? ''} onChange={e => updO('deadline', e.target.value || undefined)} />
        <Select label="Pillar" value={objForm.pillar ?? ''} onChange={e => updO('pillar', e.target.value || undefined)} placeholder="— None —" options={PILLAR_OPTS.map(p => ({ value: p.value, label: p.label }))} />
      </ItemDrawer>
    </div>
  )
}
