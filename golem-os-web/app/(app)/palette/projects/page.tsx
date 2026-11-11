import { getProjects } from '@/lib/queries'
import { ProjectsView } from '@/components/views/projects-view'

// Palette Media is the employer, so there is no client picker.
export default async function PaletteProjectsPage() {
  const projects = await getProjects({ pillar: 'palette' })
  return <ProjectsView initialProjects={projects} clients={[]} defaultPillar="palette" />
}
