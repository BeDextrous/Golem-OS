import Link from 'next/link'
import { PillarHeader } from '@/components/layout/pillar-header'
import { getTasks, getGoals, getObjectives, getProjects } from '@/lib/queries'
import { todayStr as getTodayStr } from '@/lib/utils'
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
      <p className="text-xs font-bold uppercase tracking-widest text-muted mb-3">
        {title}
      </p>
      <div className="flex gap-4 mb-3">
        {stats.map(s => (
          <div key={s.label}>
            <p className="text-2xl font-semibold text-stone-900 dark:text-stone-50 tabular-nums">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
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

export default async function PaletteOverviewPage() {
  const [openTasks, goals, objectives, projects] = await Promise.all([
    getTasks({ pillar: 'palette', openOnly: true }),
    getGoals({ pillar: 'palette' }),
    getObjectives({ pillar: 'palette' }),
    getProjects({ pillar: 'palette' }),
  ])

  const todayStr       = getTodayStr()
  const activeTasks    = openTasks.filter(t => t.status === 'Active')
  const overdueTasks   = openTasks.filter(t => t.due_date && t.due_date < todayStr)
  const activeGoals    = goals.filter(g => g.status === 'Active')
  const activeProjects = projects.filter(p => p.status === 'Active')

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <PillarHeader pillar="palette" subtitle="Day job: tasks, goals, and projects" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Tasks"
          href="/palette/tasks"
          stats={[
            { label: 'open', value: openTasks.length },
            { label: 'overdue', value: overdueTasks.length },
          ]}
          items={(activeTasks.length ? activeTasks : openTasks).slice(0, 3).map(t => t.name)}
        />
        <StatCard
          title="Goals"
          href="/palette/goals"
          stats={[
            { label: 'active', value: activeGoals.length },
            { label: 'objectives', value: objectives.length },
          ]}
          items={activeGoals.slice(0, 3).map(g => g.title)}
        />
        <StatCard
          title="Projects"
          href="/palette/projects"
          stats={[
            { label: 'active', value: activeProjects.length },
            { label: 'total', value: projects.length },
          ]}
          items={activeProjects.slice(0, 3).map(p => p.name)}
        />
      </div>

      {openTasks.length > 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">Open Tasks</p>
            <Link href="/palette/tasks" className="text-xs text-muted hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
              View all →
            </Link>
          </div>
          <ClickableTaskList initialTasks={openTasks.slice(0, 8)} goals={goals} objectives={objectives} />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-stone-300 dark:border-stone-700 p-8 text-center">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Palette Media is empty</p>
          <p className="text-xs text-muted mt-1">
            Start with a <Link href="/palette/tasks" className="underline">task</Link>,{' '}
            <Link href="/palette/goals" className="underline">goal</Link> or{' '}
            <Link href="/palette/projects" className="underline">project</Link>.
          </p>
        </div>
      )}
    </div>
  )
}
