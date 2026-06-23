import { getFinances } from '@/lib/queries'
import { FinancesView } from '@/components/views/finances-view'

export default async function DextrousFinancesPage() {
  const all = await getFinances()
  // Show dextrous-pillar finances (business income/expenses)
  const items = all.filter(f => f.pillar === 'dextrous')
  return <FinancesView initialItems={items} defaultPillar="dextrous" />
}
