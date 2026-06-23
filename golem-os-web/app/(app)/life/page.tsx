import Link from 'next/link'
import { getReading, getFinances, getNotes, getLinks, getGoals, getTasks, getObjectives } from '@/lib/queries'
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

export default async function LifeOverviewPage() {
  const [reading, finances, notes, links, goals, tasks, objectives] = await Promise.all([
    getReading(), getFinances(), getNotes(), getLinks(), getGoals(), getTasks(), getObjectives(),
  ])

  const thisMonth     = new Date().toISOString().slice(0, 7)
  const monthFinances = finances.filter(f => f.entry_date?.startsWith(thisMonth))
  const monthTotal    = monthFinances.reduce((s, f) => s + (f.amount ?? 0), 0)
  const fmt = (n: number) =>
    `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  const activeReading = reading.filter(r => r.status === 'Reading')
  const lifeGoals     = goals.filter(g => g.pillar === 'life' && g.status === 'Active')
  const lifeNotes     = notes.filter(n => n.pillar === 'life')
  const lifeLinks     = links.filter(l => l.pillar === 'life')
  const lifeTasks     = tasks.filter(t => t.pillar === 'life' && t.status !== 'Done')

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Life</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Health, finances, home, and relationships
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Tasks"
          href="/life/tasks"
          stats={[
            { label: 'active', value: lifeTasks.filter(t => t.status === 'Active').length },
            { label: 'total', value: lifeTasks.length },
          ]}
          items={lifeTasks.slice(0, 3).map(t => t.name)}
        />
        <StatCard
          title="Finances"
          href="/life/finances"
          stats={[
            { label: 'this month', value: fmt(monthTotal) },
            { label: 'entries', value: monthFinances.length },
          ]}
          items={monthFinances.slice(0, 3).map(f => `${f.label ?? '—'} ${fmt(f.amount ?? 0)}`)}
        />
        <StatCard
          title="Reading"
          href="/life/reading"
          stats={[
            { label: 'reading now', value: activeReading.length },
            { label: 'total', value: reading.length },
          ]}
          items={activeReading.slice(0, 3).map(r => r.book_title)}
        />
        <StatCard
          title="Goals"
          href="/work/goals"
          stats={[
            { label: 'active', value: lifeGoals.length },
            { label: 'total', value: goals.filter(g => g.pillar === 'life').length },
          ]}
          items={lifeGoals.slice(0, 3).map(g => g.title)}
        />
        <StatCard
          title="Notes"
          href="/life/notes"
          stats={[{ label: 'notes', value: lifeNotes.length }]}
          items={lifeNotes.slice(0, 3).map(n => n.title ?? 'Untitled')}
        />
        <StatCard
          title="Links"
          href="/life/links"
          stats={[{ label: 'saved links', value: lifeLinks.length }]}
          items={lifeLinks.slice(0, 3).map(l => l.title ?? l.url)}
        />
      </div>

      {/* Inline clickable task list */}
      {lifeTasks.length > 0 && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
              Active Tasks
            </p>
            <Link href="/life/tasks" className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
              View all →
            </Link>
          </div>
          <ClickableTaskList
            initialTasks={lifeTasks.slice(0, 8)}
            goals={goals}
            objectives={objectives}
          />
        </div>
      )}
    </div>
  )
}
