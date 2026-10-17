import { getGoals, getObjectives } from '@/lib/queries'
import { GoalsView } from '@/components/views/goals-view'

export default async function PaletteGoalsPage() {
  const [goals, objectives] = await Promise.all([getGoals({ pillar: 'palette' }), getObjectives({ pillar: 'palette' })])
  return <GoalsView initialGoals={goals} initialObjectives={objectives} defaultPillar="palette" />
}
