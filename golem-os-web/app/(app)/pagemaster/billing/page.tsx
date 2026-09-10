import { getClientsWithBilling } from '@/lib/queries'
import { PagemasterBillingView } from '@/components/views/pagemaster-billing-view'

export default async function PagemasterBillingPage() {
  const rows = await getClientsWithBilling()
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Billing</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          This month&apos;s billing status for every client with billing configured
        </p>
      </div>
      <PagemasterBillingView rows={rows} />
    </div>
  )
}
