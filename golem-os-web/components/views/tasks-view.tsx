'use client'
import { useMemo } from 'react'
import { Plus, LayoutGrid, List } from 'lucide-react'
import toast from 'react-hot-toast'
import { updateRow } from '@/app/actions/crud'
import { TasksBoard } from './tasks-board'
import { useCrudDrawer } from '@/lib/use-crud-drawer'
import { TASK_STATUSES, TASK_PRIORITIES, TASK_STATUS_COLOR, TASK_PRIORITY_COLOR, groupObjectivesByGoal } from '@/lib/task-constants'
import { cn } from '@/lib/utils'
import { Button, Input, Select } from '@/components/ui'
import { StatusFilter, usePersistedStatuses } from '@/components/data/status-filter'
import { useLocalStorage } from '@/lib/use-local-storage'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { TaskRow, GoalRow, ObjectiveRow, ProjectRow, ClientRow } from '@/types/entities'

const STATUSES = TASK_STATUSES
const PRIORITIES = TASK_PRIORITIES
const STATUS_COLOR = TASK_STATUS_COLOR
const PRIORITY_COLOR = TASK_PRIORITY_COLOR
const FILTER_KEY = 'golem:filter:tasks'
const VIEW_KEY = 'golem:view:tasks'
const DEFAULT_HIDDEN = ['Done']
type ViewMode = 'list' | 'board'



type Form = Partial<Omit<TaskRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

interface Props {
  initialTasks:  TaskRow[]
  goals:         GoalRow[]
  objectives:    ObjectiveRow[]
  defaultPillar?: string
  projects?: ProjectRow[]
  clients?: ClientRow[]
  defaultProjectId?: number
}

export function TasksView({
  initialTasks, goals, objectives, defaultPillar,
  projects = [], clients = [], defaultProjectId,
}: Props) {
  const [activeStatuses, setActiveStatuses] = usePersistedStatuses(FILTER_KEY, STATUSES, DEFAULT_HIDDEN)
  const [viewRaw, setViewRaw] = useLocalStorage(VIEW_KEY)
  const view: ViewMode = viewRaw === 'board' ? 'board' : 'list'

  const {
    items, setItems, form, upd, drawerOpen, closeDrawer, editItem,
    openNew, openEdit, save: handleSave, remove: handleDelete,
  } = useCrudDrawer<TaskRow, Form>({
    table: 'tasks',
    initialItems: initialTasks,
    newForm: () => ({ status: 'To Do', pillar: defaultPillar ?? null, project_id: defaultProjectId ?? null }),
    toForm: item => ({
      name: item.name,
      status: item.status,
      priority: item.priority,
      area: item.area,
      due_date: item.due_date,
      objective_id: item.objective_id,
      pillar: item.pillar,
      project_id: item.project_id,
    }),
    validate: f => (f.name?.trim() ? null : 'Name is required'),
    messages: { created: 'Task created', updated: 'Task updated', deleted: 'Task deleted' },
  })

  const changeView = (next: ViewMode) => setViewRaw(next)

  // Optimistic status change from the board; revert and toast if the write fails
  const moveTask = async (task: TaskRow, status: string | null) => {
    const previous = task.status
    setItems(prev => prev.map(t => t.id === task.id ? { ...t, status } : t))
    const result = await updateRow('tasks', task.id, { status })
    if (!result.ok) {
      setItems(prev => prev.map(t => t.id === task.id ? { ...t, status: previous } : t))
      toast.error(`Couldn't move task: ${result.error}`)
    }
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

  const objByGoal = useMemo(() => groupObjectivesByGoal(objectives), [objectives])

  const goalTitle = useMemo(() =>
    Object.fromEntries(goals.map(g => [String(g.id), g.title || ''])),
    [goals]
  )

  const clientName = useMemo(() =>
    Object.fromEntries(clients.map(c => [String(c.id), c.name])),
    [clients]
  )

  const projectName = useMemo(() =>
    Object.fromEntries(projects.map(p => [String(p.id), p.name])),
    [projects]
  )

  const projectsByClient = useMemo(() => {
    const map = new Map<string, { id: number; name: string }[]>()
    projects.forEach(p => {
      const k = p.client_id ? clientName[String(p.client_id)] ?? `Client #${p.client_id}` : 'No Client'
      const entry = map.get(k) ?? []
      entry.push({ id: p.id, name: p.name })
      map.set(k, entry)
    })
    return map
  }, [projects, clientName])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Tasks</h1>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="View" className="inline-flex rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden">
            {([['list', 'List', List], ['board', 'Board', LayoutGrid]] as const).map(([mode, label, Icon]) => (
              <button
                key={mode}
                onClick={() => changeView(mode)}
                aria-pressed={view === mode}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 h-8 pointer-coarse:h-11 text-xs font-medium transition-colors',
                  view === mode
                    ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                    : 'text-muted hover:bg-stone-100 dark:hover:bg-stone-800'
                )}
              >
                <Icon size={13} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
          <Button onClick={openNew} size="sm">
            <Plus size={14} /> New Task
          </Button>
        </div>
      </div>

      <StatusFilter
        statuses={STATUSES}
        active={activeStatuses}
        onChange={setActiveStatuses}
        colorMap={STATUS_COLOR}
      />

      {view === 'board' && (
        <TasksBoard
          tasks={filtered}
          statuses={STATUSES.filter(s => activeStatuses.includes(s))}
          projectName={projectName}
          onOpen={openEdit}
          onMove={moveTask}
        />
      )}

      {view === 'list' && areas.map(area => {
        const areaItems = byArea[area]
        if (!areaItems?.length) return null
        return (
          <section key={area}>
            <p className="text-xs font-bold uppercase tracking-widest text-muted mb-2">
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
                      <span className={cn('text-xs font-semibold', PRIORITY_COLOR[task.priority] ?? 'text-muted')}>
                        {task.priority}
                      </span>
                    )}
                    {task.due_date && (
                      <span className="text-xs text-muted">{task.due_date}</span>
                    )}
                    {task.project_id && projectName[String(task.project_id)] && (
                      <span className="text-xs text-muted truncate">
                        {projectName[String(task.project_id)]}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )
      })}

      {view === 'list' && filtered.length === 0 && (
        <div className="text-center py-16 text-muted">
          <p className="text-sm">No tasks match the current filter.</p>
        </div>
      )}

      <ItemDrawer
        open={drawerOpen}
        onClose={closeDrawer}
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
            { value: 'palette', label: 'Palette Media' },
          ]}
        />
        {projects.length > 0 && (
          <Select
            label="Project"
            value={form.project_id ? String(form.project_id) : ''}
            onChange={e => upd('project_id', e.target.value ? Number(e.target.value) : null)}
            placeholder="— None —"
            groups={[...projectsByClient.entries()].map(([client, projs]) => ({
              label: client,
              options: projs.map(p => ({ value: String(p.id), label: p.name })),
            }))}
          />
        )}
      </ItemDrawer>
    </div>
  )
}
