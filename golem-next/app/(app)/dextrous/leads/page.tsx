import { getLeads } from '@/lib/queries'
import { LeadsView } from '@/components/views/leads-view'

export default async function LeadsPage() {
  const leads = await getLeads()
  return <LeadsView initialLeads={leads} />
}
