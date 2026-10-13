'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4" role="alert">
      <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Something went wrong</h1>
      <p className="text-sm text-stone-600 dark:text-stone-400">
        This page couldn&apos;t load its data. Your data is untouched.
      </p>
      {error.digest && <p className="text-xs text-stone-500 font-mono">ref {error.digest}</p>}
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
