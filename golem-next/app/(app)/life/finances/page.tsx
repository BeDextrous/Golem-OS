import { getLifeFinances } from '@/lib/queries'
import { FinancesView } from '@/components/views/finances-view'

export default async function LifeFinancesPage() {
  const items = await getLifeFinances()
  return <FinancesView initialItems={items} defaultPillar="life" />
}
