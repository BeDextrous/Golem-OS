import { getClients } from '@/lib/queries'
import { WorkClientsView } from '@/components/views/work-clients-view'

export default async function WorkClientsPage() {
  const clients = await getClients()
  return <WorkClientsView initialClients={clients} />
}
