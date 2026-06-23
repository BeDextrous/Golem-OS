import { getProjects, getClients } from '@/lib/queries'
import { ProjectsView } from '@/components/views/projects-view'

export default async function WorkProjectsPage() {
  const [projects, clients] = await Promise.all([getProjects(), getClients()])
  return <ProjectsView initialProjects={projects} clients={clients} defaultPillar="work" />
}
