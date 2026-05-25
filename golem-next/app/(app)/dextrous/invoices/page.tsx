import { getInvoices, getClients } from '@/lib/queries'
import { InvoicesView } from '@/components/views/invoices-view'

export default async function InvoicesPage() {
  const [invoices, clients] = await Promise.all([getInvoices(), getClients()])
  return <InvoicesView initialInvoices={invoices} clients={clients} />
}
