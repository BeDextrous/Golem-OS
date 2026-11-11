'use client'
import { useMemo } from 'react'
import { useCrudDrawer } from '@/lib/use-crud-drawer'
import { TASK_STATUSES, TASK_PRIORITIES, TASK_STATUS_COLOR, TASK_PRIORITY_COLOR, groupObjectivesByGoal } from '@/lib/task-constants'
import { cn, todayStr as getTodayStr } from '@/lib/utils'
import { Input, Select } from '@/components/ui'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { TaskRow, GoalRow, ObjectiveRow } from '@/types/entities'

const STATUSES = TASK_STATUSES
const PRIORITIES = TASK_PRIORITIES
const PRIORITY_COLOR = TASK_PRIORITY_COLOR
const STATUS_COLOR = TASK_STATUS_COLOR

type TaskForm = Partial<Omit<TaskRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

interface Props {
  initialTasks: TaskRow[]
  goals:        GoalRow[]
  objectives:   ObjectiveRow[]
  /** If provided, show only tasks due on or before this date string (YYYY-MM-DD) */
  dueBefore?: string
  maxItems?:  number
}

export function ClickableTaskList({ initialTasks, goals, objectives, dueBefore, maxItems }: Props) {
  const {
    items: tasks, form, upd, drawerOpen, closeDrawer, editItem,
    openEdit, save: handleSave, remove: handleDelete,
  } = useCrudDrawer<TaskRow, TaskForm>({
    table: 'tasks',
    initialItems: initialTasks,
    canCreate: false,
    newForm: () => ({}),
    toForm: task => ({
      name: task.name, status: task.status, priority: task.priority, area: task.area,
      due_date: task.due_date, objective_id: task.objective_id, pillar: task.pillar,
    }),
    validate: f => (f.name?.trim() ? null : 'Name is required'),
    messages: { updated: 'Task updated', deleted: 'Deleted' },
  })

  const displayed = useMemo(() => {
    let list = tasks
    if (dueBefore) list = list.filter(t => t.due_date && t.due_date <= dueBefore && t.status !== 'Done')
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
    return maxItems ? list.slice(0, maxItems) : list
  }, [tasks, dueBefore, maxItems])

  const todayStr = getTodayStr()

  const objByGoal = useMemo(() => groupObjectivesByGoal(objectives), [objectives])

  const goalTitle = useMemo(() =>
    Object.fromEntries(goals.map(g => [String(g.id), g.title ?? ''])),
    [goals]
  )

  const dynamicAreas = useMemo(() =>
    [...new Set(tasks.map(t => t.area).filter(Boolean) as string[])].sort(),
    [tasks]
  )

  if (displayed.length === 0) return null

  return (
    <>
      {displayed.map((task, idx) => {
        const isOverdue = dueBefore ? (task.due_date ?? '') < todayStr : false
        return (
          <button
            key={task.id}
            onClick={() => openEdit(task)}
            className={cn(
              'w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors',
              idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
            )}
          >
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              isOverdue ? 'bg-red-400' : task.status === 'Active' ? 'bg-life-400' : 'bg-stone-300 dark:bg-stone-600'
            }`} />
            <p className="text-sm text-stone-800 dark:text-stone-200 flex-1 truncate text-left">
              {task.name}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {task.priority && (
                <span className={cn('text-xs font-semibold hidden sm:inline', PRIORITY_COLOR[task.priority] ?? 'text-muted')}>
                  {task.priority}
                </span>
              )}
              {task.status && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: (STATUS_COLOR[task.status] ?? '#6B6560') + '22',
                    color: STATUS_COLOR[task.status] ?? '#6B6560',
                  }}
                >
                  {task.status}
                </span>
              )}
              {task.due_date && (
                <span className={`text-xs shrink-0 ${isOverdue ? 'text-red-500' : 'text-muted'}`}>
                  {isOverdue ? `overdue ${task.due_date}` : task.due_date === todayStr ? 'today' : task.due_date}
                </span>
              )}
            </div>
          </button>
        )
      })}

      <ItemDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="Edit Task"
        onSave={handleSave}
        onDelete={editItem ? handleDelete : undefined}
      >
        <Input label="Name" value={form.name ?? ''} onChange={e => upd('name', e.target.value)} placeholder="Task name" />
        <Select label="Status" value={form.status ?? ''} onChange={e => upd('status', e.target.value)} placeholder="— None —" options={STATUSES.map(s => ({ value: s, label: s }))} />
        <Select label="Priority" value={form.priority ?? ''} onChange={e => upd('priority', e.target.value)} placeholder="— None —" options={PRIORITIES.map(p => ({ value: p, label: p }))} />
        <Select label="Area" value={form.area ?? ''} onChange={e => upd('area', e.target.value)} placeholder="— None —" options={dynamicAreas.map(a => ({ value: a, label: a }))} />
        <Input label="Due Date" type="date" value={form.due_date ?? ''} onChange={e => upd('due_date', e.target.value || null)} />
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
            { value: 'palette', label: 'Palette Media' },
          ]}
        />
      </ItemDrawer>
    </>
  )
}
