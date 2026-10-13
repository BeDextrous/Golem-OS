'use client'
import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

const MESSAGES: Record<string, { text: string; ok: boolean }> = {
  connected: { text: 'Google account connected', ok: true },
  denied: { text: 'Google sign-in was cancelled', ok: false },
  error: { text: "Couldn't connect Google. Please try again.", ok: false },
  unavailable: { text: "Server-side Google connect isn't set up yet", ok: false },
}

/** Shows the result of the Google connect redirect (?google=...) once, then cleans the URL. */
export function GoogleNotice() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const status = params.get('google')

  useEffect(() => {
    if (!status) return
    const m = MESSAGES[status]
    if (m) (m.ok ? toast.success : toast.error)(m.text)
    const next = new URLSearchParams(params.toString())
    next.delete('google')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }, [status, params, pathname, router])

  return null
}
