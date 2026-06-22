'use client'
import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { ProjectRow, ClientRow } from '@/types/entities'

const STATUSES = ['Planning', 'Active', 'On Hold', 'Done', 'Archived']
const PILLAR_OPTS = [
  { value: 'life', label: 'Life' },
  { value: 'dextrous', label: 'Dextrous' },
  { value: 'work', label: 'Work' },
]
const PILLAR_COLORS: Record<string, string> = {
  life: '#7FA98A', dextrous: '#DA6B51', work: '#5B5F8D',
}
const STATUS_COLOR: Record<string, string> = {
  'Active':   '#7FA98A',
  'Planning': '#DA6B51',
  'On Hold':  '#5B5F8D',
  'Done':     '#A8A39A',
  'Archived': '#A8A39A',
}

type Form = Partial<Omit<ProjectRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export function ProjectsView({
  initialProjects,
  clients,
  defaultPillar,
}: {
  initialProjects: ProjectRow[]
  clients: ClientRow[]
  defaultPillar?: string
}) {
  const [items, setItems]           = useState(initialProjects)
  const [pillarFilter, setPillarFilter] = useState<string | null>(defaultPillar ?? null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editItem, setEditItem]     = useState<ProjectRow | null>(null)
  const [form, setForm]             = useState<Form>({})

  const upd = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm(f => ({ ...f, [k]: v ?? undefined }))

  const openNew = () => {
    setEditItem(null)
    setForm({ status: 'Planning', pillar: pillarFilter ?? 'work' })
    setDrawerOpen(true)
  }
  const openEdit = (item: ProjectRow) => {
    setEditItem(item)
    setForm({
      name:         item.name,
      description:  item.description  ?? undefined,
      pillar:       item.pillar,
      status:       item.status       ?? undefined,
      project_type: item.project_type ?? undefined,
      start_date:   item.start_date   ?? undefined,
      end_date:     item.end_date     ?? undefined,
      notes:        item.notes        ?? undefined,
      client_id:    item.client_id    ?? undefined,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Name is required'); return }
    if (!form.pillar)       { toast.error('Pillar is required'); return }
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const payload = { ...form, name: form.name!, pillar: form.pillar! }
    if (editItem) {
      const { error } = await sb.from('projects').update(payload).eq('id', editItem.id)
      if (error) throw error
      setItems(prev => prev.map(p => p.id === editItem.id ? { ...p, ...payload } : p))
      toast.success('Updated')
    } else {
      const { data, error } = await sb.from('projects').insert({ ...payload, user_id: user.id }).select().single()
      if (error) throw error
      if (data) setItems(prev => [data, ...prev])
      toast.success('Project added')
    }
    setDrawerOpen(false)
  }

  const handleDelete = async () => {
    if (!editItem) return
    const sb = createClient()
    const { error } = await sb.from('projects').delete().eq('id', editItem.id)
    if (error) throw error
    setItems(prev => prev.filter(p => p.id !== editItem.id))
    setDrawerOpen(false)
    toast.success('Deleted')
  }

  const filtered = useMemo(() =>
    pillarFilter ? items.filter(p => p.pillar === pillarFilter) : items,
    [items, pillarFilter]
  )

  const byStatus = useMemo(() => {
    const order = ['Active', 'Planning', 'On Hold', 'Done', 'Archived']
    const map = new Map<string, ProjectRow[]>()
    filtered.forEach(p => {
      const s = p.status ?? 'Planning'
      const arr = map.get(s) ?? []
      arr.push(p)
      map.set(s, arr)
    })
    return order.filter(s => map.has(s)).map(s => [s, map.get(s)!] as const)
  }, [filtered])

  const clientName = (id: number | null) =>
    id ? (clients.find(c => c.id === id)?.name ?? `#${id}`) : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Projects</h1>
          <p className="text-xs text-stone-400 mt-0.5">{items.length} projects</p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus size={14} /> New Project
        </Button>
      </div>

      {/* Pillar filter — only show when not locked to one pillar */}
      {!defaultPillar && (
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
                ? p
                  ? { backgroundColor: PILLAR_COLORS[p], borderColor: PILLAR_COLORS[p] }
                  : { backgroundColor: '#292524', borderColor: '#292524' }
                : undefined}
            >
              {p ? PILLAR_OPTS.find(x => x.value === p)!.label : 'All'}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {byStatus.map(([status, projects]) => (
          <section key={status}>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
              {status}
            </p>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
              {projects.map((project, idx) => (
                <button
                  key={project.id}
                  onClick={() => openEdit(project)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${
                    idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
                  }`}
                >
                  {/* Status dot */}
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: STATUS_COLOR[project.status ?? 'Planning'] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                      {project.name}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                      {project.project_type && <span>{project.project_type}</span>}
                      {project.project_type && (project.pillar || clientName(project.client_id)) && <span className="mx-1">·</span>}
                      {project.pillar && (
                        <span style={{ color: PILLAR_COLORS[project.pillar] }}>
                          {PILLAR_OPTS.find(p => p.value === project.pillar)?.label ?? project.pillar}
                        </span>
                      )}
                      {clientName(project.client_id) && (
                        <span className="ml-1 text-stone-300 dark:text-stone-600">
                          · {clientName(project.client_id)}
                        </span>
                      )}
                    </p>
                    {project.description && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
                        {project.description}
                      </p>
                    )}
                  </div>
                  {(project.start_date || project.end_date) && (
                    <div className="text-xs text-stone-400 dark:text-stone-500 shrink-0 text-right">
                      {project.end_date && <p>Due {project.end_date}</p>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <p className="text-sm">No projects yet.</p>
        </div>
      )}

      <ItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editItem ? 'Edit Project' : 'New Project'}
        onSave={handleSave}
        onDelete={editItem ? handleDelete : undefined}
      >
        <Input
          label="Name"
          value={form.name ?? ''}
          onChange={e => upd('name', e.target.value)}
          placeholder="Project name"
        />
        <Input
          label="Description"
          value={form.description ?? ''}
          onChange={e => upd('description', e.target.value || undefined)}
          placeholder="One-line summary"
        />
        <Select
          label="Status"
          value={form.status ?? ''}
          onChange={e => upd('status', e.target.value || undefined)}
          placeholder="— None —"
          options={STATUSES.map(s => ({ value: s, label: s }))}
        />
        <Select
          label="Pillar"
          value={form.pillar ?? ''}
          onChange={e => upd('pillar', e.target.value || undefined)}
          placeholder="— Select —"
          options={PILLAR_OPTS}
        />
        <Input
          label="Type"
          value={form.project_type ?? ''}
          onChange={e => upd('project_type', e.target.value || undefined)}
          placeholder="e.g. Client Work, Internal, Open Source"
        />
        {clients.length > 0 && (
          <Select
            label="Client"
            value={form.client_id?.toString() ?? ''}
            onChange={e => upd('client_id', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="— None —"
            options={clients.map(c => ({ value: c.id.toString(), label: c.name }))}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={form.start_date ?? ''}
            onChange={e => upd('start_date', e.target.value || undefined)}
          />
          <Input
            label="End Date"
            type="date"
            value={form.end_date ?? ''}
            onChange={e => upd('end_date', e.target.value || undefined)}
          />
        </div>
        <Textarea
          label="Notes"
          value={form.notes ?? ''}
          onChange={e => upd('notes', e.target.value || undefined)}
          placeholder="Project notes…"
          rows={3}
        />
      </ItemDrawer>
    </div>
  )
}
