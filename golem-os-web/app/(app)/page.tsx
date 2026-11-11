import Link from 'next/link'
import {
  getTasks, getFinances, getReading, getRecentNotes, getGoals, getObjectives,
  getDeadlines, getClientsWithBilling,
} from '@/lib/queries'
import { needsAttention } from '@/lib/pagemaster/billing-status'
import { CalendarWidget } from '@/components/widgets/calendar-widget'
import { GlanceTiles, PillarCards, type PillarSummary } from '@/components/dashboard/home-glance'
import { ClickableTaskList } from '@/components/dashboard/clickable-task-list'
import { todayStr as getTodayStr, thisMonthStr, hourInAppTz } from '@/lib/utils'

function Section({ title, href, children }: {
  title: string
  href?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">
          {title}
        </p>
        {href && (
          <Link href={href} className="text-xs text-muted hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
            View all →
          </Link>
        )}
      </div>
      <div>{children}</div>
    </div>
  )
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="px-4 py-3 text-xs text-muted italic">{label}</div>
  )
}

export default async function HomePage() {
  const today     = new Date()
  const todayStr  = getTodayStr(today)
  const thisMonth = thisMonthStr(today)

  const [openTasks, finances, currentReads, { notes: recentNotes, total: notesTotal }, goals, objectives, deadlines, billingRows] = await Promise.all([
    getTasks({ openOnly: true }),
    getFinances({ month: thisMonth }),
    getReading({ status: 'Reading' }),
    getRecentNotes(5),
    getGoals(), getObjectives(),
    getDeadlines(), getClientsWithBilling(),
  ])

  const greeting = (() => {
    const h = hourInAppTz(today)
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York',
  })

  // Cross-pillar task rollup
  const urgentTasks = openTasks
    .filter(t => t.due_date && t.due_date <= todayStr)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
  const overdueCount  = urgentTasks.filter(t => (t.due_date ?? '') < todayStr).length
  const dueTodayCount = urgentTasks.length - overdueCount

  const taskStats = (pillar: string) => {
    const mine = openTasks.filter(t => t.pillar === pillar)
    return [
      { label: 'Open tasks', value: mine.length },
      { label: 'Overdue', value: mine.filter(t => t.due_date && t.due_date < todayStr).length, warn: true },
    ]
  }
  const summaries: PillarSummary[] = [
    { pillar: 'life', stats: [...taskStats('life'), { label: 'Reading now', value: currentReads.length }] },
    { pillar: 'dextrous', stats: taskStats('dextrous') },
    { pillar: 'palette', stats: taskStats('palette') },
    {
      pillar: 'pagemaster',
      stats: [
        { label: 'Deadlines to review', value: deadlines.filter(d => d.status === 'needs_review').length, warn: true },
        { label: 'Billing needs action', value: billingRows.filter(needsAttention).length, warn: true },
      ],
    },
  ]

  // This month's finance summary
  const monthEntries = finances
  const monthTotal   = monthEntries.reduce((s, f) => s + (f.amount ?? 0), 0)
  const fmtMoney     = (n: number) =>
    `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`



  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{greeting}</h1>
        <p className="text-sm text-muted mt-0.5">{dateLabel}</p>
      </div>

      <GlanceTiles overdue={overdueCount} dueToday={dueTodayCount} open={openTasks.length} />

      <PillarCards summaries={summaries} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      <div className="lg:col-span-3 space-y-6">
      {/* Today's tasks — clickable */}
      <Section title={`Today · ${urgentTasks.length} task${urgentTasks.length !== 1 ? 's' : ''}`} href="/focus">
        {urgentTasks.length === 0 ? (
          <EmptyRow label="No tasks due — enjoy the day." />
        ) : (
          <ClickableTaskList
            initialTasks={urgentTasks.slice(0, 5)}
            goals={goals}
            objectives={objectives}
            dueBefore={todayStr}
          />
        )}
        {urgentTasks.length > 5 && (
          <div className="px-4 py-2 border-t border-stone-100 dark:border-stone-800">
            <Link href="/focus" className="text-xs text-muted hover:text-stone-600">
              +{urgentTasks.length - 5} more
            </Link>
          </div>
        )}
      </Section>

      {/* Recent notes */}
      <Section title={`Notes · ${notesTotal} total`} href="/life/notes">
        {recentNotes.length === 0 ? (
          <EmptyRow label="No notes yet." />
        ) : (
          recentNotes.map((note, idx) => (
            <Link
              key={note.id}
              href={`/life/notes/${note.id}`}
              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${
                idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
              }`}
            >
              <p className="text-sm text-stone-800 dark:text-stone-200 flex-1 truncate">
                {note.title ?? 'Untitled'}
              </p>
              {note.pillar && (
                <span className="text-xs text-muted shrink-0 capitalize">
                  {note.pillar}
                </span>
              )}
              {note.updated_at && (
                <span className="text-xs text-muted shrink-0 hidden sm:inline">
                  {new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </Link>
          ))
        )}
      </Section>

      </div>

      {/* Right column: calendar, finances, reading */}
      <div className="lg:col-span-2 space-y-6">
        <CalendarWidget connection="dextrous" compact />
        <div className="space-y-6">
        <Section title={`Finances · ${thisMonth}`} href="/life/finances">
          <div className="px-4 py-3">
            <p className="text-2xl font-semibold text-stone-900 dark:text-stone-50 tabular-nums">
              {fmtMoney(monthTotal)}
            </p>
            <p className="text-xs text-muted mt-0.5">{monthEntries.length} entries this month</p>
          </div>
          {monthEntries.slice(0, 3).map((f, idx) => (
            <div
              key={f.id}
              className={`flex items-center justify-between px-4 py-1.5 border-t border-stone-100 dark:border-stone-800 ${
                idx > 0 ? '' : ''
              }`}
            >
              <p className="text-xs text-stone-600 dark:text-stone-400 truncate flex-1">{f.label ?? '—'}</p>
              <p className={`text-xs tabular-nums shrink-0 ml-2 ${(f.amount ?? 0) < 0 ? 'text-red-500' : 'text-stone-600 dark:text-stone-400'}`}>
                {fmtMoney(f.amount ?? 0)}
              </p>
            </div>
          ))}
        </Section>

        <Section title={`Reading · ${currentReads.length} active`} href="/life/reading">
          {currentReads.length === 0 ? (
            <EmptyRow label="Nothing in progress." />
          ) : (
            currentReads.slice(0, 4).map((book, idx) => (
              <div
                key={book.id}
                className={`px-4 py-2.5 ${idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''}`}
              >
                <p className="text-sm text-stone-800 dark:text-stone-200 truncate">{book.book_title}</p>
                {book.progress_pct != null && book.progress_pct > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${book.progress_pct}%`, backgroundColor: '#7FA98A' }}
                      />
                    </div>
                    <span className="text-xs text-muted tabular-nums">{book.progress_pct}%</span>
                  </div>
                )}
              </div>
            ))
          )}
        </Section>
        </div>
      </div>
      </div>
    </div>
  )
}
