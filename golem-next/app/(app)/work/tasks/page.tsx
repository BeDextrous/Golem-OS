import { getTasks, getGoals, getObjectives } from '@/lib/queries'
import { TasksView } from '@/components/views/tasks-view'

export default async function TasksPage() {
  const [tasks, goals, objectives] = await Promise.all([getTasks(), getGoals(), getObjectives()])
  return <TasksView initialTasks={tasks} goals={goals} objectives={objectives} />
}
