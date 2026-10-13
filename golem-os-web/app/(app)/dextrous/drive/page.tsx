import { DriveWidget } from '@/components/widgets/drive-widget'

export default function DrivePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Drive</h1>
        <p className="text-sm text-muted mt-0.5">
          Quick access to Google Drive documents
        </p>
      </div>
      <DriveWidget connection="dextrous" />
    </div>
  )
}
