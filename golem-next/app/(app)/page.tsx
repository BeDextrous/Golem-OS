import Link from 'next/link'
import { getTasks, getFinances, getReading, getNotes, getGoals, getObjectives } from '@/lib/queries'
import { ClickableTaskList } from '@/components/dashboard/clickable-task-list'

function Section({ title, href, children }: {
  title: string
  href?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
          {title}
        </p>
        {href && (
          <Link href={href} className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
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
    <div className="px-4 py-3 text-xs text-stone-400 dark:text-stone-500 italic">{label}</div>
  )
}

export default async function HomePage() {
  const [tasks, finances, reading, notes, goals, objectives] = await Promise.all([
    getTasks(), getFinances(), getReading(), getNotes(), getGoals(), getObjectives(),
  ])

  const today    = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const thisMonth = todayStr.slice(0, 7)

  const greeting = (() => {
    const h = today.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  // Tasks: overdue + due today, non-done
  const urgentTasks = tasks
    .filter(t => t.due_date && t.due_date <= todayStr && t.status !== 'Done')
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))

  // This month's finance summary
  const monthEntries = finances.filter(f => f.entry_date?.startsWith(thisMonth))
  const monthTotal   = monthEntries.reduce((s, f) => s + (f.amount ?? 0), 0)
  const fmtMoney     = (n: number) =>
    `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  // Currently reading
  const currentReads = reading.filter(r => r.status === 'Reading')

  // Recent notes
  const recentNotes = notes.slice(0, 5)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{greeting}</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{dateLabel}</p>
      </div>

      {/* Today's tasks — clickable */}
      <Section title={`Today · ${urgentTasks.length} task${urgentTasks.length !== 1 ? 's' : ''}`} href="/work/tasks">
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
            <Link href="/work/tasks" className="text-xs text-stone-400 hover:text-stone-600">
              +{urgentTasks.length - 5} more
            </Link>
          </div>
        )}
      </Section>

      {/* Recent notes */}
      <Section title={`Notes · ${notes.length} total`} href="/life/notes">
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
                <span className="text-xs text-stone-400 dark:text-stone-500 shrink-0 capitalize">
                  {note.pillar}
                </span>
              )}
              {note.updated_at && (
                <span className="text-xs text-stone-300 dark:text-stone-600 shrink-0 hidden sm:inline">
                  {new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </Link>
          ))
        )}
      </Section>

      {/* Bottom row: finances + reading */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section title={`Finances · ${thisMonth}`} href="/life/finances">
          <div className="px-4 py-3">
            <p className="text-2xl font-semibold text-stone-900 dark:text-stone-50 tabular-nums">
              {fmtMoney(monthTotal)}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">{monthEntries.length} entries this month</p>
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
                    <span className="text-xs text-stone-400 tabular-nums">{book.progress_pct}%</span>
                  </div>
                )}
              </div>
            ))
          )}
        </Section>
      </div>
    </div>
  )
}
