import type { ObjectiveRow } from '@/types/entities'

export const TASK_STATUSES = ['To Do', 'Active', 'On Hold', 'Done']
export const TASK_PRIORITIES = ['High', 'Medium', 'Low']

export const TASK_STATUS_COLOR: Record<string, string> = {
  'Active':  '#7FA98A',
  'To Do':   '#6B6560',
  'On Hold': '#5B5F8D',
  'Done':    '#A8A39A',
}

export const TASK_PRIORITY_COLOR: Record<string, string> = {
  High:   'text-red-500',
  Medium: 'text-amber-500',
  Low:    'text-muted',
}

/** Objectives grouped by goal id ('unlinked' when no goal), for grouped <Select>s. */
export function groupObjectivesByGoal(objectives: ObjectiveRow[]) {
  const map = new Map<string, { id: number; title: string }[]>()
  objectives.forEach(o => {
    const k = String(o.goal_id ?? 'unlinked')
    const entry = map.get(k) ?? []
    entry.push({ id: o.id, title: o.title || '' })
    map.set(k, entry)
  })
  return map
}
