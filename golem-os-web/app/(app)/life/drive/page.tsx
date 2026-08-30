import { DriveWidget } from '@/components/widgets/drive-widget'

export default function LifeDrivePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Drive</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Quick access to your personal Google Drive documents
        </p>
      </div>
      <DriveWidget connection="life" />
    </div>
  )
}
