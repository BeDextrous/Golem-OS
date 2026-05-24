import { getFinances } from '@/lib/queries'
import { FinancesView } from '@/components/views/finances-view'

export default async function FinancesPage() {
  const items = await getFinances()
  return <FinancesView initialItems={items} />
}
