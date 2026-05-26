import { getTasks, getGoals, getObjectives } from '@/lib/queries'
import { FocusView } from '@/components/views/focus-view'

export default async function FocusPage() {
  const [tasks, goals, objectives] = await Promise.all([
    getTasks(), getGoals(), getObjectives(),
  ])
  return <FocusView initialTasks={tasks} initialGoals={goals} initialObjectives={objectives} />
}
