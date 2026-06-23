import { getHealthEntries } from '@/lib/queries'
import { HealthView } from '@/components/views/health-view'

export default async function HealthPage() {
  const items = await getHealthEntries()
  return <HealthView initialItems={items} />
}
