import { getGoals, getObjectives } from '@/lib/queries'
import { GoalsView } from '@/components/views/goals-view'

export default async function GoalsPage() {
  const [goals, objectives] = await Promise.all([getGoals(), getObjectives()])
  return <GoalsView initialGoals={goals} initialObjectives={objectives} />
}
