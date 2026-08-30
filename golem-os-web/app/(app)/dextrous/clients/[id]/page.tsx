import { notFound } from 'next/navigation'
import {
  getClientById, getProjectsByClient, getTasksByProjectIds, getInvoicesByClient,
} from '@/lib/queries'
import { ClientDetailView } from '@/components/views/client-detail-view'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const clientId = Number(id)
  const client = await getClientById(clientId)
  if (!client) notFound()

  const projects = await getProjectsByClient(clientId)
  const [tasks, invoices] = await Promise.all([
    getTasksByProjectIds(projects.map(p => p.id)),
    getInvoicesByClient(clientId),
  ])

  return <ClientDetailView client={client} projects={projects} tasks={tasks} invoices={invoices} />
}
