import { getKnowledge } from '@/lib/queries'
import { PagemasterKnowledgeView } from '@/components/views/pagemaster-knowledge-view'

export default async function PagemasterKnowledgePage() {
  const items = await getKnowledge()
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Knowledge</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Read-only view of Dextrous knowledge items — edit them from Dextrous → Knowledge.
        </p>
      </div>
      <PagemasterKnowledgeView items={items} />
    </div>
  )
}
