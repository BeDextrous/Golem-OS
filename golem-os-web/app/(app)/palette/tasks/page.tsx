import { getTasks, getGoals, getObjectives, getProjects } from '@/lib/queries'
import { TasksView } from '@/components/views/tasks-view'

export default async function PaletteTasksPage() {
  const [tasks, goals, objectives, projects] = await Promise.all([
    getTasks({ pillar: 'palette' }), getGoals({ pillar: 'palette' }), getObjectives({ pillar: 'palette' }),
    getProjects({ pillar: 'palette' }),
  ])
  return (
    <TasksView
      initialTasks={tasks}
      goals={goals}
      objectives={objectives}
      projects={projects}
      defaultPillar="palette"
    />
  )
}
