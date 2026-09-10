import { getDeadlines } from '@/lib/queries'
import { PagemasterDeadlinesView } from '@/components/views/pagemaster-deadlines-view'

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
      <PagemasterDeadlinesView initialDeadlines={deadlines} />
    </div>
  )
}
