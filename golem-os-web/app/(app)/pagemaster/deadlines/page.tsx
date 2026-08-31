import { getDeadlines } from '@/lib/queries'

export default async function PagemasterDeadlinesPage() {
  const deadlines = await getDeadlines()
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Deadlines</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Client and matter deadlines
        </p>
      </div>
      {deadlines.length === 0 ? (
        <p className="text-sm text-stone-400 dark:text-stone-500">
          No deadlines tracked yet.
        </p>
      ) : (
        <div className="space-y-2">
          {deadlines.map(d => (
            <div
              key={d.id}
              className="flex items-center justify-between bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg px-4 py-3"
            >
              <span className="text-sm text-stone-900 dark:text-stone-50">{d.title}</span>
              <span className="text-xs text-stone-400 dark:text-stone-500">{d.due_date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
