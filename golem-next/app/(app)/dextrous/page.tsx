import Link from 'next/link'
import { getJobApps, getTargetCompanies, getCRM, getGoals } from '@/lib/queries'

function StatCard({
  title,
  href,
  stats,
  items,
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
            <li key={i} className="text-xs text-stone-600 dark:text-stone-400 truncate">
              · {item}
            </li>
          ))}
        </ul>
      )}
    </Link>
  )
}

export default async function DextrousOverviewPage() {
  const [apps, targets, contacts, goals] = await Promise.all([
    getJobApps(), getTargetCompanies(), getCRM(), getGoals(),
  ])

  const ACTIVE_STATUSES = ['Applied', 'Phone Screen', 'Interview', 'Offer']
  const activeApps = apps.filter(a => ACTIVE_STATUSES.includes(a.status ?? ''))
  const dexGoals   = goals.filter(g => g.pillar === 'dextrous' && g.status === 'Active')

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Dextrous</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Clients, projects, knowledge, and career
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Jobs"
          href="/dextrous/jobs"
          stats={[
            { label: 'active pipeline', value: activeApps.length },
            { label: 'total', value: apps.length },
          ]}
          items={activeApps.slice(0, 3).map(a => `${a.role ?? 'Role'} @ ${a.company}`)}
        />
        <StatCard
          title="Contacts"
          href="/dextrous/jobs"
          stats={[
            { label: 'contacts', value: contacts.length },
            { label: 'targets', value: targets.length },
          ]}
          items={contacts.slice(0, 3).map(c => `${c.name}${c.company ? ` · ${c.company}` : ''}`)}
        />
        <StatCard
          title="Goals"
          href="/work/goals"
          stats={[{ label: 'active', value: dexGoals.length }]}
          items={dexGoals.slice(0, 3).map(g => g.title)}
        />
      </div>
    </div>
  )
}
