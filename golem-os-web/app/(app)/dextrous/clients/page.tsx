import { getClients } from '@/lib/queries'
import { ClientsView } from '@/components/views/clients-view'

export default async function ClientsPage() {
  const clients = await getClients()
  return <ClientsView initialClients={clients} />
}
