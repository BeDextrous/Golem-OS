import { getTasks, getGoals, getObjectives } from '@/lib/queries'
import { TasksView } from '@/components/views/tasks-view'

export default async function DextrousTasksPage() {
  const [tasks, goals, objectives] = await Promise.all([getTasks(), getGoals(), getObjectives()])
  const dexTasks = tasks.filter(t => t.pillar === 'dextrous')
  return <TasksView initialTasks={dexTasks} goals={goals} objectives={objectives} defaultPillar="dextrous" />
}
