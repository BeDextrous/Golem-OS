'use client'
import { useState, useEffect, useCallback } from 'react'
import { Mail, RefreshCw, ExternalLink } from 'lucide-react'
import {
  getAccessToken, googleApiFetch, isConnected, disconnect, type ConnectionKey,
} from '@/lib/google-auth'
import { GoogleNotConfigured, GoogleConnectPrompt, GoogleWidgetError } from './google-widget-states'

const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

interface MessageListResponse {
  messages?: { id: string; threadId: string }[]
}

interface MessageHeader { name: string; value: string }

interface MessageMeta {
  id: string
  threadId: string
  snippet: string
  labelIds?: string[]
  payload?: { headers?: MessageHeader[] }
}

interface Row {
  id: string
  threadId: string
  from: string
  subject: string
  snippet: string
  unread: boolean
}

function header(msg: MessageMeta, name: string): string {
  return msg.payload?.headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

// "Jane Doe <jane@example.com>" -> "Jane Doe"
function fromName(raw: string): string {
  const match = raw.match(/^"?([^"<]+)"?\s*<.*>$/)
  return (match ? match[1] : raw).trim() || raw
}

export function GmailWidget({
  connection, compact = false,
}: {
  connection: ConnectionKey
  compact?: boolean
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  const [connected, setConnected]   = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [rows, setRows]             = useState<Row[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    setConnected(isConnected(connection, SCOPE))
  }, [connection])

  const fetchMessages = useCallback(async (forceAccountPicker = false) => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken({ connection, clientId, scope: SCOPE, forceAccountPicker })
      setConnected(true)

      const listParams = new URLSearchParams({
        maxResults: String(compact ? 5 : 15),
        labelIds: 'INBOX',
      })
      const list = await googleApiFetch<MessageListResponse>(
        token,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?${listParams.toString()}`
      )
      const ids = list.messages ?? []
      const metaParams = new URLSearchParams({ format: 'metadata' })
      metaParams.append('metadataHeaders', 'From')
      metaParams.append('metadataHeaders', 'Subject')

      const metas = await Promise.all(
        ids.map(({ id }) =>
          googleApiFetch<MessageMeta>(
            token,
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?${metaParams.toString()}`
          )
        )
      )
      setRows(metas.map(m => ({
        id: m.id,
        threadId: m.threadId,
        from: fromName(header(m, 'From')),
        subject: header(m, 'Subject') || '(no subject)',
        snippet: m.snippet,
        unread: (m.labelIds ?? []).includes('UNREAD'),
      })))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [clientId, connection, compact])

  useEffect(() => {
    if (connected) fetchMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  const handleConnect = useCallback(async (forceAccountPicker = false) => {
    setConnecting(true)
    try { await fetchMessages(forceAccountPicker) } finally { setConnecting(false) }
  }, [fetchMessages])

  const handleDisconnect = () => {
    disconnect(connection, SCOPE)
    setConnected(false)
    setRows([])
  }

  if (!clientId) return <GoogleNotConfigured apiName="Gmail" />

  if (!connected) {
    return (
      <GoogleConnectPrompt
        connection={connection}
        icon={<Mail size={22} className="text-blue-500" />}
        label="Gmail"
        connecting={connecting}
        onConnect={() => handleConnect()}
      />
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-blue-500" />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Gmail</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fetchMessages()}
            title="Refresh"
            className="p-1.5 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleDisconnect}
            className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 px-2 py-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {error && <GoogleWidgetError message={error} />}

      {loading && rows.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-400">Loading inbox…</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-400">Inbox zero.</div>
      ) : (
        <ul>
          {rows.map((row, idx) => (
            <li key={row.id}>
              <a
                href={`https://mail.google.com/mail/u/0/#inbox/${row.threadId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${
                  idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
                }`}
              >
                {row.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${row.unread ? 'font-semibold text-stone-900 dark:text-stone-100' : 'font-medium text-stone-800 dark:text-stone-200'}`}>
                    {row.from}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                    {row.subject}
                  </p>
                </div>
                <ExternalLink
                  size={12}
                  className="text-stone-300 dark:text-stone-600 group-hover:text-stone-400 dark:group-hover:text-stone-400 transition-colors shrink-0"
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
