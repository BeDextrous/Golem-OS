import { getKnowledge, getProjects } from '@/lib/queries'
import { KnowledgeView } from '@/components/views/knowledge-view'

export default async function KnowledgePage() {
  const [items, projects] = await Promise.all([getKnowledge(), getProjects()])
  return <KnowledgeView initialItems={items} projects={projects} />
}
