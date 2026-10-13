import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Page not found</h1>
      <Link href="/" className="text-sm text-stone-600 dark:text-stone-400 underline">Back to dashboard</Link>
    </div>
  )
}
