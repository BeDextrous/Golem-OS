import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import {
  getClients, getProjects, getTasks, getGoals, getObjectives,
} from '@/lib/queries'
import { ProjectsView } from '@/components/views/projects-view'
import { TasksView } from '@/components/views/tasks-view'

const STATUS_COLOR: Record<string, string> = {
  'Active':      '#7FA98A',
  'Prospective': '#DA6B51',
  'Past':        '#A8A39A',
  'Archived':    '#A8A39A',
}

export default async function ClientWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const clientId = Number(id)

  const [clients, projects, tasks, goals, objectives] = await Promise.all([
    getClients(), getProjects(), getTasks(), getGoals(), getObjectives(),
  ])

  const client = clients.find(c => c.id === clientId)
  if (!client) notFound()

  const clientProjects = projects.filter(p => p.client_id === clientId)
  const clientProjectIds = new Set(clientProjects.map(p => p.id))
  const clientTasks = tasks.filter(t => t.project_id != null && clientProjectIds.has(t.project_id))

  return (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-3">
        <Link
          href="/work/clients"
          className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
        >
          <ChevronLeft size={14} /> Clients
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: STATUS_COLOR[client.status ?? 'Active'] }}
          />
          <div>
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">{client.name}</h1>
            <p className="text-xs text-stone-400 mt-0.5">
              {client.workspace_group === 'dextrous' ? 'Dextrous client' : 'Work'}
              {client.company && ` · ${client.company}`}
              {client.status && ` · ${client.status}`}
            </p>
          </div>
        </div>
        {client.notes && (
          <p className="text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap">{client.notes}</p>
        )}
      </div>

      <ProjectsView
        initialProjects={clientProjects}
        clients={[client]}
        defaultPillar="work"
        defaultClientId={client.id}
      />

      <TasksView
        initialTasks={clientTasks}
        goals={goals}
        objectives={objectives}
        projects={clientProjects}
        clients={[client]}
        defaultPillar="work"
      />
    </div>
  )
}
