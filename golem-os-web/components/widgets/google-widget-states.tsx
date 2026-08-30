'use client'
import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { CONNECTION_LABEL, type ConnectionKey } from '@/lib/google-auth'

/** Shown when NEXT_PUBLIC_GOOGLE_CLIENT_ID / NEXT_PUBLIC_GOOGLE_API_KEY are missing. */
export function GoogleNotConfigured({ apiName }: { apiName: string }) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
      <div className="flex items-start gap-3 text-amber-600 dark:text-amber-400">
        <AlertCircle size={18} className="shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">{apiName} not configured</p>
          <p className="text-xs mt-1 text-stone-500 dark:text-stone-400 leading-relaxed">
            Add these to your <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded">.env.local</code>:
          </p>
          <pre className="mt-2 text-xs bg-stone-100 dark:bg-stone-800 rounded-lg p-3 font-mono text-stone-700 dark:text-stone-300">
{`NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-oauth-client-id>
NEXT_PUBLIC_GOOGLE_API_KEY=<your-api-key>`}
          </pre>
          <p className="text-xs mt-2 text-stone-400">
            Create credentials at{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-stone-600"
            >
              console.cloud.google.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

/** Shown when there's no valid cached token yet for this connection + scope. */
export function GoogleConnectPrompt({
  connection,
  icon,
  label,
  connecting,
  onConnect,
}: {
  connection: ConnectionKey
  icon: ReactNode
  label: string
  connecting: boolean
  onConnect: () => void
}) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Connect {label}</p>
      <p className="text-xs text-stone-400 mt-1 mb-4">{CONNECTION_LABEL[connection]}</p>
      <Button onClick={onConnect} disabled={connecting} size="sm" variant="secondary">
        {connecting ? 'Connecting…' : 'Sign in with Google'}
      </Button>
    </div>
  )
}

export function GoogleWidgetError({ message }: { message: string }) {
  return (
    <div className="px-4 py-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20">
      {message}
    </div>
  )
}
