import Link from 'next/link'
import { PillarHeader } from '@/components/layout/pillar-header'
import { getDeadlines, getClientsWithBilling, getKnowledge } from '@/lib/queries'
import { PagemasterDashboardView } from '@/components/views/pagemaster-dashboard-view'

const LINKS = [
  { href: '/pagemaster/mike', label: 'Mike', desc: 'Legal & business assistant chat' },
  { href: '/pagemaster/knowledge', label: 'Knowledge', desc: 'Extracted legal knowledge and notes' },
  { href: '/pagemaster/deadlines', label: 'Deadlines', desc: 'Upcoming client and matter deadlines' },
  { href: '/pagemaster/billing', label: 'Billing', desc: "This month's billing status" },
  { href: '/pagemaster/clients', label: 'Clients', desc: 'All clients' },
  { href: '/pagemaster/projects', label: 'Projects', desc: 'Legal matters and engagements' },
]

export default async function PagemasterOverviewPage() {
  const [deadlines, billingRows, knowledge] = await Promise.all([
    getDeadlines(),
    getClientsWithBilling(),
    getKnowledge(),
  ])

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <PillarHeader pillar="pagemaster" subtitle="Always-on legal brain — knowledge, deadlines, and client work in one place" />

      <PagemasterDashboardView deadlines={deadlines} billingRows={billingRows} knowledge={knowledge} />

      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="block bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 hover:border-stone-300 dark:hover:border-stone-700 transition-colors"
            >
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-50">{l.label}</p>
              <p className="text-xs text-muted mt-1">{l.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
