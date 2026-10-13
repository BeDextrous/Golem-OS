'use client'
import { useMemo, useState } from 'react'
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor,
  useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { cn, todayStr } from '@/lib/utils'
import { TASK_PRIORITY_COLOR, TASK_STATUS_COLOR } from '@/lib/task-constants'
import type { TaskRow } from '@/types/entities'

const NO_STATUS = '__none__'
const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 }

const byPriorityThenDue = (a: TaskRow, b: TaskRow) =>
  (PRIORITY_RANK[a.priority ?? ''] ?? 3) - (PRIORITY_RANK[b.priority ?? ''] ?? 3) ||
  (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') ||
  a.name.localeCompare(b.name)

/** Keyboard drag: Left/Right jump to the neighbouring column instead of nudging 25px. */
const columnJumpCoordinates: KeyboardCoordinateGetter = (event, { context: { droppableRects, droppableContainers, collisionRect }, currentCoordinates }) => {
  if (!collisionRect || (event.code !== 'ArrowRight' && event.code !== 'ArrowLeft')) return undefined
  const cols = droppableContainers.getEnabled()
    .map(c => ({ rect: droppableRects.get(c.id) }))
    .filter((c): c is { rect: NonNullable<typeof c.rect> } => !!c.rect)
    .sort((a, b) => a.rect.left - b.rect.left)
  const centerX = collisionRect.left + collisionRect.width / 2
  const current = cols.findIndex(c => centerX >= c.rect.left && centerX <= c.rect.left + c.rect.width)
  const next = cols[current + (event.code === 'ArrowRight' ? 1 : -1)]
  if (!next) return currentCoordinates
  event.preventDefault()
  return { x: next.rect.left + 8, y: next.rect.top + 48 }
}

interface BoardProps {
  tasks: TaskRow[]
  /** Columns to show, in order (the active status filter). */
  statuses: string[]
  projectName: Record<string, string>
  onOpen: (task: TaskRow) => void
  /** Persist a status change; should throw on failure so the board can revert. */
  onMove: (task: TaskRow, status: string | null) => Promise<void>
}

function CardBody({ task, projectName, overdue }: { task: TaskRow; projectName: Record<string, string>; overdue: boolean }) {
  return (
    <>
      <p className="text-sm font-medium text-stone-900 dark:text-stone-100 leading-snug line-clamp-3">{task.name}</p>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {task.priority && (
          <span className={cn('text-xs font-semibold', TASK_PRIORITY_COLOR[task.priority] ?? 'text-muted')}>
            {task.priority}
          </span>
        )}
        {task.due_date && (
          <span className={cn('text-xs', overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted')}>
            {overdue ? `overdue ${task.due_date}` : task.due_date}
          </span>
        )}
        {task.project_id && projectName[String(task.project_id)] && (
          <span className="text-xs text-muted truncate max-w-full">{projectName[String(task.project_id)]}</span>
        )}
      </div>
    </>
  )
}

function Card({ task, projectName, overdue, onOpen }: {
  task: TaskRow; projectName: Record<string, string>; overdue: boolean; onOpen: (t: TaskRow) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task)}
      onKeyDown={e => {
        // Space is dnd-kit's pick-up key; Enter opens the task
        if (e.key === 'Enter') { e.preventDefault(); onOpen(task) }
        else listeners?.onKeyDown?.(e)
      }}
      aria-label={`${task.name}. Press space to move between columns, enter to open.`}
      className={cn(
        'touch-manipulation select-none cursor-grab active:cursor-grabbing text-left',
        'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-3',
        'hover:border-stone-300 dark:hover:border-stone-700 transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500',
        isDragging && 'opacity-40'
      )}
    >
      <CardBody task={task} projectName={projectName} overdue={overdue} />
    </div>
  )
}

function Column({ id, label, color, count, children }: {
  id: string; label: string; color: string; count: number; children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <section
      ref={setNodeRef}
      aria-label={`${label}, ${count} task${count === 1 ? '' : 's'}`}
      className={cn(
        'shrink-0 w-[78vw] sm:w-72 snap-start rounded-xl p-2 transition-colors',
        'bg-stone-100/70 dark:bg-stone-800/40 border border-transparent',
        isOver && 'border-stone-400 dark:border-stone-500 bg-stone-100 dark:bg-stone-800/70'
      )}
    >
      <header className="flex items-center gap-2 px-1.5 pb-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-stone-700 dark:text-stone-300">{label}</h2>
        <span className="text-xs text-muted tabular-nums">{count}</span>
      </header>
      <div className="space-y-2 min-h-16">{children}</div>
    </section>
  )
}

export function TasksBoard({ tasks, statuses, projectName, onOpen, onMove }: BoardProps) {
  const [activeId, setActiveId] = useState<number | null>(null)
  const today = todayStr()

  const sensors = useSensors(
    // A short drag distance keeps plain clicks (open drawer) working
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Press-and-hold on touch so vertical/horizontal scrolling still works
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
      coordinateGetter: columnJumpCoordinates,
    }),
  )

  const columns = useMemo(() => {
    const cols = statuses.map(s => ({ id: s, label: s, color: TASK_STATUS_COLOR[s] ?? '#6B6560' }))
    const hasNoStatus = tasks.some(t => !t.status)
    if (hasNoStatus) cols.push({ id: NO_STATUS, label: 'No status', color: '#A8A39A' })
    return cols
  }, [statuses, tasks])

  const grouped = useMemo(() => {
    const map: Record<string, TaskRow[]> = {}
    columns.forEach(c => { map[c.id] = [] })
    tasks.forEach(t => { map[t.status ?? NO_STATUS]?.push(t) })
    Object.values(map).forEach(list => list.sort(byPriorityThenDue))
    return map
  }, [columns, tasks])

  const activeTask = activeId != null ? tasks.find(t => t.id === activeId) ?? null : null

  const handleDragStart = (e: DragStartEvent) => setActiveId(Number(e.active.id))
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    if (!e.over) return
    const task = tasks.find(t => t.id === Number(e.active.id))
    const target = String(e.over.id)
    if (!task || (task.status ?? NO_STATUS) === target) return
    void onMove(task, target === NO_STATUS ? null : target)
  }

  if (columns.length === 0) {
    return <p className="text-sm text-muted text-center py-16">Turn on at least one status to see the board.</p>
  }

  return (
    <DndContext
      id="tasks-board" // stable id: dnd-kit's generated aria ids differ between server and client
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto snap-x pb-3 -mx-4 px-4 items-start">
        {columns.map(col => {
          const list = grouped[col.id] ?? []
          return (
            <Column key={col.id} id={col.id} label={col.label} color={col.color} count={list.length}>
              {list.map(t => (
                <Card
                  key={t.id}
                  task={t}
                  projectName={projectName}
                  overdue={!!t.due_date && t.due_date < today && t.status !== 'Done'}
                  onOpen={onOpen}
                />
              ))}
              {list.length === 0 && <p className="text-xs text-muted px-1.5 py-3">Drop tasks here</p>}
            </Column>
          )
        })}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg p-3 shadow-xl rotate-1 w-72">
            <CardBody
              task={activeTask}
              projectName={projectName}
              overdue={!!activeTask.due_date && activeTask.due_date < today && activeTask.status !== 'Done'}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
