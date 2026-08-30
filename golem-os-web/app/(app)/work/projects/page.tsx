import { getProjects } from '@/lib/queries'
import { ProjectsView } from '@/components/views/projects-view'

// Clients live under Dextrous only — Work projects don't get a client picker.
export default async function WorkProjectsPage() {
  const projects = await getProjects()
  return <ProjectsView initialProjects={projects} clients={[]} defaultPillar="work" />
}
