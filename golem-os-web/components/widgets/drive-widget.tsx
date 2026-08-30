'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { FolderOpen, Upload, ExternalLink, RefreshCw, Search } from 'lucide-react'
import {
  getAccessToken, googleApiFetch, isConnected, disconnect, loadPicker, type ConnectionKey,
} from '@/lib/google-auth'
import { GoogleNotConfigured, GoogleConnectPrompt, GoogleWidgetError } from './google-widget-states'

const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  webViewLink: string
  size?: string
}

interface FilesListResponse {
  files: DriveFile[]
}

const MIME_ICONS: Record<string, string> = {
  'application/vnd.google-apps.document':     '📄',
  'application/vnd.google-apps.spreadsheet':  '📊',
  'application/vnd.google-apps.presentation': '📽️',
  'application/vnd.google-apps.folder':       '📁',
  'application/pdf':                          '📕',
  'image/':                                   '🖼️',
}

function fileIcon(mimeType: string): string {
  for (const [k, v] of Object.entries(MIME_ICONS)) {
    if (mimeType.startsWith(k)) return v
  }
  return '📄'
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Google Drive widget. `connection` selects which cached Google account token
 * to use (Life vs Dextrous). Pass `folderId` to scope the file list to one
 * Drive folder (e.g. a client's work-product folder) instead of "everything
 * recent in My Drive".
 */
export function DriveWidget({
  connection, folderId, compact = false,
}: {
  connection: ConnectionKey
  folderId?: string
  compact?: boolean
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const apiKey   = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

  const [connected, setConnected]   = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [files, setFiles]           = useState<DriveFile[]>([])
  const [loading, setLoading]       = useState(false)
  const [search, setSearch]         = useState('')
  const [error, setError]           = useState<string | null>(null)
  const lastToken                   = useRef<string | null>(null)

  useEffect(() => {
    setConnected(isConnected(connection, SCOPE))
  }, [connection])

  const fetchFiles = useCallback(async (query?: string, forceAccountPicker = false) => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken({ connection, clientId, scope: SCOPE, forceAccountPicker })
      lastToken.current = token
      setConnected(true)

      const clauses = ['trashed = false']
      if (folderId) clauses.push(`'${folderId}' in parents`)
      if (query) clauses.push(`name contains '${query.replace(/'/g, "\\'")}'`)

      const params = new URLSearchParams({
        pageSize: String(compact ? 6 : 20),
        orderBy: 'modifiedTime desc',
        fields: 'files(id,name,mimeType,modifiedTime,webViewLink,size)',
        q: clauses.join(' and '),
      })
      const data = await googleApiFetch<FilesListResponse>(
        token,
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`
      )
      setFiles(data.files ?? [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [clientId, connection, folderId, compact])

  useEffect(() => {
    if (connected) fetchFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, folderId])

  const handleConnect = useCallback(async (forceAccountPicker = false) => {
    setConnecting(true)
    try { await fetchFiles(undefined, forceAccountPicker) } finally { setConnecting(false) }
  }, [fetchFiles])

  const handleDisconnect = () => {
    disconnect(connection, SCOPE)
    setConnected(false)
    setFiles([])
  }

  const openPicker = useCallback(async () => {
    if (!apiKey || !lastToken.current) return
    await loadPicker()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google
    const view = folderId
      ? new google.picker.DocsView().setParent(folderId)
      : new google.picker.DocsView()
    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(lastToken.current)
      .setDeveloperKey(apiKey)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .setCallback((data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          const file = data.docs[0]
          if (file?.url) window.open(file.url, '_blank', 'noopener')
        }
      })
      .build()
    picker.setVisible(true)
  }, [apiKey, folderId])

  if (!clientId || !apiKey) return <GoogleNotConfigured apiName="Google Drive" />

  if (!connected) {
    return (
      <GoogleConnectPrompt
        connection={connection}
        icon={<FolderOpen size={22} className="text-blue-500" />}
        label="Google Drive"
        connecting={connecting}
        onConnect={() => handleConnect()}
      />
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <FolderOpen size={15} className="text-blue-500" />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            {folderId ? 'Work Product' : 'Google Drive'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={openPicker}
            title="Open file picker"
            className="p-1.5 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <Upload size={13} />
          </button>
          <button
            onClick={() => fetchFiles(search || undefined)}
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

      {/* Search */}
      {!compact && (
        <div className="px-4 py-2 border-b border-stone-100 dark:border-stone-800">
          <form
            onSubmit={e => { e.preventDefault(); fetchFiles(search || undefined) }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={folderId ? 'Search this folder…' : 'Search Drive…'}
                className="w-full pl-7 pr-3 h-7 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-md outline-none focus:ring-1 focus:ring-blue-400 text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
              />
            </div>
            <button
              type="submit"
              className="px-3 h-7 text-xs rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* File list */}
      {error && <GoogleWidgetError message={error} />}

      {loading && files.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-400">Loading files…</div>
      ) : files.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-400">
          {search ? 'No files match.' : folderId ? 'No files in this folder yet.' : 'No recent files.'}
        </div>
      ) : (
        <ul>
          {files.map((file, idx) => (
            <li key={file.id}>
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${
                  idx > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''
                }`}
              >
                <span className="text-base shrink-0" aria-hidden>
                  {fileIcon(file.mimeType)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {relativeTime(file.modifiedTime)}
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
