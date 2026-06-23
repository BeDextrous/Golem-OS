import { getTasks, getGoals, getObjectives } from '@/lib/queries'
import { TasksView } from '@/components/views/tasks-view'

export default async function LifeTasksPage() {
  const [tasks, goals, objectives] = await Promise.all([getTasks(), getGoals(), getObjectives()])
  const lifeTasks = tasks.filter(t => t.pillar === 'life')
  return <TasksView initialTasks={lifeTasks} goals={goals} objectives={objectives} defaultPillar="life" />
}
