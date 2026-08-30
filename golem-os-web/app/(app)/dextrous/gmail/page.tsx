import { GmailWidget } from '@/components/widgets/gmail-widget'

export default function DextrousGmailPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Gmail</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Recent inbox activity on the Dextrous inbox
        </p>
      </div>
      <GmailWidget connection="dextrous" />
    </div>
  )
}
