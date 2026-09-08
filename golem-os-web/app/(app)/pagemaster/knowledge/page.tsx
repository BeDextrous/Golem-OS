import { getKnowledge, getClients, getProjects } from '@/lib/queries'
import { PagemasterKnowledgeView } from '@/components/views/pagemaster-knowledge-view'
import { PagemasterAddDocument } from '@/components/views/pagemaster-add-document'

export default async function PagemasterKnowledgePage() {
  const [items, clients, projects] = await Promise.all([getKnowledge(), getClients(), getProjects()])
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Knowledge</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Read-only view of Dextrous knowledge items — edit them from Dextrous → Knowledge.
          </p>
        </div>
        <PagemasterAddDocument clients={clients} projects={projects} />
      </div>
      <PagemasterKnowledgeView items={items} />
    </div>
  )
}
