import { getTasks, getGoals, getObjectives, getProjects, getClients } from '@/lib/queries'
import { TasksView } from '@/components/views/tasks-view'

export default async function TasksPage() {
  const [tasks, goals, objectives, projects, clients] = await Promise.all([
    getTasks(), getGoals(), getObjectives(), getProjects(), getClients(),
  ])
  const workTasks = tasks.filter(t => t.pillar === 'work')
  return (
    <TasksView
      initialTasks={workTasks}
      goals={goals}
      objectives={objectives}
      projects={projects.filter(p => p.pillar === 'work')}
      clients={clients}
      defaultPillar="work"
    />
  )
}
