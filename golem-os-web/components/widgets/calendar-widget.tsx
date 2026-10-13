'use client'
import { useState, useEffect, useCallback } from 'react'
import { CalendarDays, RefreshCw, ExternalLink } from 'lucide-react'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import {
  getAccessToken, googleApiFetch, resolveConnected, disconnect, GoogleReconnectError, type ConnectionKey,
} from '@/lib/google-auth'
import { GoogleNotConfigured, GoogleConnectPrompt, GoogleWidgetError } from './google-widget-states'

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

interface GEvent {
  id: string
  summary?: string
  htmlLink: string
  location?: string
  start: { date?: string; dateTime?: string }
}

interface EventsResponse {
  items: GEvent[]
}

function eventWhen(ev: GEvent): string {
  const iso = ev.start.dateTime ?? ev.start.date
  if (!iso) return ''
  const d = parseISO(iso)
  const allDay = !ev.start.dateTime
  const day = isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : format(d, 'EEE MMM d')
  if (allDay) return `${day} · all day`
  return `${day} · ${format(d, 'h:mma').toLowerCase()}`
}

export function CalendarWidget({
  connection, compact = false,
}: {
  connection: ConnectionKey
  compact?: boolean
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  const [connected, setConnected]   = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [events, setEvents]         = useState<GEvent[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const fetchEvents = useCallback(async (forceAccountPicker = false) => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken({ connection, clientId, scope: SCOPE, forceAccountPicker })
      setConnected(true)
      const params = new URLSearchParams({
        timeMin: new Date().toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: String(compact ? 5 : 15),
      })
      const data = await googleApiFetch<EventsResponse>(
        token,
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`
      )
      setEvents(data.items ?? [])
    } catch (e) {
      if (e instanceof GoogleReconnectError) { setConnected(false); return }
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [clientId, connection, compact])

  // Resolve the connection on mount and load straight away if it is already connected.
  // (Connecting by click loads inside fetchEvents itself; state is only set in async callbacks.)
  useEffect(() => {
    let alive = true
    resolveConnected(connection, SCOPE).then(c => {
      if (!alive) return
      setConnected(c)
      if (c) fetchEvents()
    })
    return () => { alive = false }
  }, [connection, fetchEvents])

  const handleConnect = useCallback(async (forceAccountPicker = false) => {
    setConnecting(true)
    try { await fetchEvents(forceAccountPicker) } finally { setConnecting(false) }
  }, [fetchEvents])

  const handleDisconnect = () => {
    disconnect(connection, SCOPE)
    setConnected(false)
    setEvents([])
  }

  if (!clientId) return <GoogleNotConfigured apiName="Google Calendar" />

  if (!connected) {
    return (
      <GoogleConnectPrompt
        connection={connection}
        icon={<CalendarDays size={22} className="text-blue-500" />}
        label="Google Calendar"
        connecting={connecting}
        onConnect={() => handleConnect()}
      />
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-blue-500" />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Calendar</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fetchEvents()}
            title="Refresh"
            className="p-1.5 rounded-md text-muted hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleDisconnect}
            className="text-xs text-muted hover:text-stone-600 dark:hover:text-stone-300 px-2 py-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {error && <GoogleWidgetError message={error} />}

      {loading && events.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted">Loading events…</div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted">Nothing on the calendar.</div>
      ) : (
        <ul>
          {events.map((ev, idx) => (
            <li key={ev.id}>
              <a
                href={ev.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${
                  idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                    {ev.summary || '(No title)'}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {eventWhen(ev)}{ev.location ? ` · ${ev.location}` : ''}
                  </p>
                </div>
                <ExternalLink
                  size={12}
                  className="text-muted group-hover:text-stone-400 dark:group-hover:text-stone-400 transition-colors shrink-0"
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
