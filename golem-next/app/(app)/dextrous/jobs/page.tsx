import { getJobApps, getCRM, getTargetCompanies } from '@/lib/queries'
import { JobsView } from '@/components/views/jobs-view'

export default async function JobsPage() {
  const [apps, contacts, targets] = await Promise.all([
    getJobApps(), getCRM(), getTargetCompanies(),
  ])
  return <JobsView initialApps={apps} initialContacts={contacts} initialTargets={targets} />
}
