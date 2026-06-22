'use client'
import { useState, useMemo } from 'react'
import { Plus, ChevronRight, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { GoalRow, ObjectiveRow } from '@/types/entities'

const GOAL_STATUSES = ['Active', 'Paused', 'Done', 'Archived']
const PILLAR_OPTS = [
  { value: 'life', label: 'Life' },
  { value: 'dextrous', label: 'Dextrous' },
  { value: 'work', label: 'Work' },
]
const PILLAR_COLORS: Record<string, string> = {
  life: '#7FA98A', dextrous: '#DA6B51', work: '#5B5F8D',
}

type GoalForm = Partial<Omit<GoalRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
type ObjForm  = Partial<Omit<ObjectiveRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export function GoalsView({
  initialGoals,
  initialObjectives,
}: {
  initialGoals: GoalRow[]
  initialObjectives: ObjectiveRow[]
}) {
  const [goals, setGoals]           = useState(initialGoals)
  const [objectives, setObjectives] = useState(initialObjectives)
  const [expanded, setExpanded]     = useState<Set<number>>(new Set())
  const [pillarFilter, setPillarFilter] = useState<string | null>(null)

  // Goal drawer
  const [goalOpen, setGoalOpen]   = useState(false)
  const [editGoal, setEditGoal]   = useState<GoalRow | null>(null)
  const [goalForm, setGoalForm]   = useState<GoalForm>({})

  // Objective drawer
  const [objOpen, setObjOpen]     = useState(false)
  const [editObj, setEditObj]     = useState<ObjectiveRow | null>(null)
  const [objForm, setObjForm]     = useState<ObjForm>({})
  const [objGoalId, setObjGoalId] = useState<number | null>(null)

  const updG = <K extends keyof GoalForm>(k: K, v: GoalForm[K]) =>
    setGoalForm(f => ({ ...f, [k]: v ?? undefined }))
  const updO = <K extends keyof ObjForm>(k: K, v: ObjForm[K]) =>
    setObjForm(f => ({ ...f, [k]: v ?? undefined }))

  const openNewGoal = () => {
    setEditGoal(null)
    setGoalForm({ status: 'Active', pillar: pillarFilter ?? undefined })
    setGoalOpen(true)
  }
  const openEditGoal = (g: GoalRow) => {
    setEditGoal(g)
    setGoalForm({
      title: g.title,
      status: g.status ?? undefined,
      area: g.area ?? undefined,
      pillar: g.pillar ?? undefined,
      notes: g.notes ?? undefined,
    })
    setGoalOpen(true)
  }
  const openNewObj = (goalId: number) => {
    setEditObj(null)
    setObjGoalId(goalId)
    setObjForm({ goal_id: goalId })
    setObjOpen(true)
  }
  const openEditObj = (o: ObjectiveRow) => {
    setEditObj(o)
    setObjGoalId(o.goal_id)
    setObjForm({
      title: o.title,
      goal_id: o.goal_id ?? undefined,
      current_value: o.current_value ?? undefined,
      target_value: o.target_value ?? undefined,
      metric_unit: o.metric_unit ?? undefined,
      deadline: o.deadline ?? undefined,
      pillar: o.pillar ?? undefined,
    })
    setObjOpen(true)
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

  const handleSaveObj = async () => {
    if (!objForm.title?.trim()) { toast.error('Title is required'); return }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const payload = { ...objForm, title: objForm.title!, goal_id: objGoalId }
    if (editObj) {
      const { error } = await sb.from('objectives').update(payload).eq('id', editObj.id)
      if (error) throw error
      setObjectives(prev => prev.map(o => o.id === editObj.id ? { ...o, ...payload } : o))
      toast.success('Updated')
    } else {
      const { data, error } = await sb.from('objectives').insert({ ...payload, user_id: user.id }).select().single()
      if (error) throw error
      if (data) setObjectives(prev => [...prev, data])
      toast.success('Objective added')
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

  const toggleExpand = (id: number) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const filteredGoals = useMemo(() =>
    pillarFilter ? goals.filter(g => g.pillar === pillarFilter) : goals,
    [goals, pillarFilter]
  )

  const byStatus = useMemo(() => {
    const order = ['Active', 'Paused', 'Done', 'Archived']
    const map = new Map<string, GoalRow[]>()
    filteredGoals.forEach(g => {
      const s = g.status ?? 'Active'
      const arr = map.get(s) ?? []
      arr.push(g)
      map.set(s, arr)
    })
    return order.filter(s => map.has(s)).map(s => [s, map.get(s)!] as const)
  }, [filteredGoals])

  const objsForGoal = (id: number) => objectives.filter(o => o.goal_id === id)

  const fmtProgress = (o: ObjectiveRow) => {
    if (o.current_value == null && o.target_value == null) return null
    const unit = o.metric_unit ? ` ${o.metric_unit}` : ''
    return `${o.current_value ?? 0}${unit} / ${o.target_value ?? 0}${unit}`
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Goals</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {goals.length} goals · {objectives.length} objectives
          </p>
        </div>
        <Button onClick={openNewGoal} size="sm">
          <Plus size={14} /> New Goal
        </Button>
      </div>

      {/* Pillar filter */}
      <div className="flex gap-1">
        {([null, 'life', 'dextrous', 'work'] as const).map(p => (
          <button
            key={p ?? 'all'}
            onClick={() => setPillarFilter(p)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              pillarFilter === p
                ? 'text-white border-transparent'
                : 'bg-white dark:bg-stone-900 text-stone-500 border-stone-200 dark:border-stone-700 hover:border-stone-400'
            }`}
            style={pillarFilter === p
              ? p ? { backgroundColor: PILLAR_COLORS[p], borderColor: PILLAR_COLORS[p] }
                  : { backgroundColor: '#292524', borderColor: '#292524' }
              : undefined}
          >
            {p ? PILLAR_OPTS.find(x => x.value === p)!.label : 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {byStatus.map(([status, statusGoals]) => (
          <section key={status}>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
              {status}
            </p>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
              {statusGoals.map((goal, idx) => {
                const isOpen = expanded.has(goal.id)
                const goalObjs = objsForGoal(goal.id)
                const pillarColor = goal.pillar ? PILLAR_COLORS[goal.pillar] : undefined
                return (
                  <div
                    key={goal.id}
                    className={idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''}
                  >
                    {/* Goal row */}
                    <div className="flex items-center gap-2 px-4 py-3">
                      <button
                        onClick={() => toggleExpand(goal.id)}
                        className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 flex-shrink-0 p-0.5"
                        aria-label={isOpen ? 'Collapse' : 'Expand'}
                      >
                        {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </button>
                      <button
                        onClick={() => openEditGoal(goal)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                          {goal.title}
                        </p>
                        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                          {goal.area && <span>{goal.area}</span>}
                          {goal.area && goal.pillar && <span className="mx-1">·</span>}
                          {goal.pillar && (
                            <span style={{ color: pillarColor }}>
                              {PILLAR_OPTS.find(p => p.value === goal.pillar)?.label ?? goal.pillar}
                            </span>
                          )}
                          {goalObjs.length > 0 && (
                            <span className="ml-2 text-stone-300 dark:text-stone-600">
                              {goalObjs.length} obj{goalObjs.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                      </button>
                    </div>

                    {/* Objectives panel */}
                    {isOpen && (
                      <div className="border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40">
                        {goalObjs.length > 0 ? goalObjs.map((obj, oi) => {
                          const pct = obj.target_value
                            ? Math.min(100, ((obj.current_value ?? 0) / obj.target_value) * 100)
                            : null
                          return (
                            <button
                              key={obj.id}
                              onClick={() => openEditObj(obj)}
                              className={`w-full text-left px-10 py-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
                                oi > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm text-stone-700 dark:text-stone-300">{obj.title}</p>
                                {fmtProgress(obj) && (
                                  <span className="text-xs text-stone-400 shrink-0">{fmtProgress(obj)}</span>
                                )}
                              </div>
                              {pct !== null && (
                                <div className="mt-1.5 h-1 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-stone-500 dark:bg-stone-400 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              )}
                              {obj.deadline && (
                                <p className="text-xs text-stone-400 mt-1">Due {obj.deadline}</p>
                              )}
                            </button>
                          )
                        }) : (
                          <p className="px-10 py-2.5 text-xs text-stone-400 italic">No objectives yet.</p>
                        )}
                        <div className="px-10 py-2 border-t border-stone-100 dark:border-stone-800">
                          <button
                            onClick={() => openNewObj(goal.id)}
                            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                          >
                            <Plus size={12} /> Add objective
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {filteredGoals.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">No goals yet.</p>
        </div>
      )}

      {/* Goal drawer */}
      <ItemDrawer
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        title={editGoal ? 'Edit Goal' : 'New Goal'}
        onSave={handleSaveGoal}
        onDelete={editGoal ? handleDeleteGoal : undefined}
      >
        <Input
          label="Title"
          value={goalForm.title ?? ''}
          onChange={e => updG('title', e.target.value)}
          placeholder="Goal title"
        />
        <Select
          label="Status"
          value={goalForm.status ?? ''}
          onChange={e => updG('status', e.target.value || undefined)}
          placeholder="— None —"
          options={GOAL_STATUSES.map(s => ({ value: s, label: s }))}
        />
        <Select
          label="Pillar"
          value={goalForm.pillar ?? ''}
          onChange={e => updG('pillar', e.target.value || undefined)}
          placeholder="— None —"
          options={PILLAR_OPTS}
        />
        <Input
          label="Area"
          value={goalForm.area ?? ''}
          onChange={e => updG('area', e.target.value || undefined)}
          placeholder="e.g. Health, Career, Finance"
        />
        <Textarea
          label="Notes"
          value={goalForm.notes ?? ''}
          onChange={e => updG('notes', e.target.value || undefined)}
          placeholder="Context, motivation, next steps..."
          rows={4}
        />
      </ItemDrawer>

      {/* Objective drawer */}
      <ItemDrawer
        open={objOpen}
        onClose={() => setObjOpen(false)}
        title={editObj ? 'Edit Objective' : 'New Objective'}
        onSave={handleSaveObj}
        onDelete={editObj ? handleDeleteObj : undefined}
      >
        <Input
          label="Title"
          value={objForm.title ?? ''}
          onChange={e => updO('title', e.target.value)}
          placeholder="Objective title"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Current"
            type="number"
            step="any"
            value={objForm.current_value ?? ''}
            onChange={e => updO('current_value', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
          <Input
            label="Target"
            type="number"
            step="any"
            value={objForm.target_value ?? ''}
            onChange={e => updO('target_value', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="100"
          />
        </div>
        <Input
          label="Unit"
          value={objForm.metric_unit ?? ''}
          onChange={e => updO('metric_unit', e.target.value || undefined)}
          placeholder="e.g. km, books, sessions"
        />
        <Input
          label="Deadline"
          type="date"
          value={objForm.deadline ?? ''}
          onChange={e => updO('deadline', e.target.value || undefined)}
        />
      </ItemDrawer>
    </div>
  )
}
