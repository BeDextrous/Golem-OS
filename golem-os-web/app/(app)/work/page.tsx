import Link from 'next/link'
import { getTasks, getGoals, getObjectives, getProjects, getClients } from '@/lib/queries'
import { ClickableTaskList } from '@/components/dashboard/clickable-task-list'

function StatCard({
  title, href, stats, items,
}: {
  title: string
  href: string
  stats: { label: string; value: string | number }[]
  items: string[]
}) {
  return (
    <Link
      href={href}
      className="block bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 hover:border-stone-300 dark:hover:border-stone-700 transition-colors"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-3">
        {title}
      </p>
      <div className="flex gap-4 mb-3">
        {stats.map(s => (
          <div key={s.label}>
            <p className="text-2xl font-semibold text-stone-900 dark:text-stone-50 tabular-nums">{s.value}</p>
            <p className="text-xs text-stone-400 dark:text-stone-500">{s.label}</p>
          </div>
        ))}
      </div>
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-stone-600 dark:text-stone-400 truncate">· {item}</li>
          ))}
        </ul>
      )}
    </Link>
  )
}

export default async function WorkOverviewPage() {
  const [tasks, goals, objectives, projects, clients] = await Promise.all([
    getTasks(), getGoals(), getObjectives(), getProjects(), getClients(),
  ])

  const workTasks      = tasks.filter(t => t.pillar === 'work')
  const activeTasks    = workTasks.filter(t => t.status === 'Active')
  const todayStr       = new Date().toISOString().slice(0, 10)
  const overdueTasks   = workTasks.filter(t => t.due_date && t.due_date < todayStr && t.status !== 'Done')
  const workGoals      = goals.filter(g => g.pillar === 'work' && g.status === 'Active')
  const allActiveGoals = goals.filter(g => g.status === 'Active')
  const workProjects   = projects.filter(p => p.pillar === 'work' && p.status === 'Active')
  const activeClients  = clients.filter(c => c.status === 'Active')
  const dexClients     = activeClients.filter(c => c.workspace_group === 'dextrous')
  const standaloneClients = activeClients.filter(c => !c.workspace_group)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Work</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Projects, tasks, and goals</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Tasks"
          href="/work/tasks"
          stats={[
            { label: 'active', value: activeTasks.length },
            { label: 'overdue', value: overdueTasks.length },
          ]}
          items={activeTasks.slice(0, 3).map(t => t.name)}
        />
        <StatCard
          title="Goals"
          href="/work/goals"
          stats={[
            { label: 'active', value: allActiveGoals.length },
            { label: 'objectives', value: objectives.length },
          ]}
          items={workGoals.slice(0, 3).map(g => g.title)}
        />
        <StatCard
          title="Projects"
          href="/work/projects"
          stats={[
            { label: 'active', value: workProjects.length },
            { label: 'total', value: projects.filter(p => p.pillar === 'work').length },
          ]}
          items={workProjects.slice(0, 3).map(p => p.name)}
        />
        <StatCard
          title="Clients"
          href="/work/clients"
          stats={[
            { label: 'active', value: activeClients.length },
            { label: 'dextrous', value: dexClients.length },
          ]}
          items={[...dexClients, ...standaloneClients].slice(0, 3).map(c => c.name)}
        />
      </div>

      {/* Inline clickable task list */}
      {workTasks.filter(t => t.status !== 'Done').length > 0 && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
              Active Tasks
            </p>
            <Link href="/work/tasks" className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
              View all →
            </Link>
          </div>
          <ClickableTaskList
            initialTasks={workTasks.filter(t => t.status !== 'Done').slice(0, 8)}
            goals={goals}
            objectives={objectives}
          />
        </div>
      )}
    </div>
  )
}
