'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { FileText, FolderOpen, Upload, ExternalLink, RefreshCw, Search, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui'

// ── Types ─────────────────────────────────────────────────────────────────────
interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  webViewLink: string
  iconLink?: string
  size?: string
}

// Google API types (loaded via <script> tag)
declare global {
  interface Window {
    gapi: {
      load: (lib: string, cb: () => void) => void
      client: {
        init: (config: object) => Promise<void>
        drive: {
          files: {
            list: (params: object) => Promise<{ result: { files: DriveFile[] } }>
          }
        }
      }
      auth2: {
        getAuthInstance: () => {
          isSignedIn: { get: () => boolean; listen: (cb: (v: boolean) => void) => void }
          signIn: () => Promise<void>
          signOut: () => Promise<void>
          currentUser: { get: () => { getAuthResponse: () => { access_token: string } } }
        }
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: { picker: any }
  }
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

export function DriveWidget() {
  const clientId  = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const apiKey    = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

  const [gapiReady, setGapiReady]   = useState(false)
  const [signedIn, setSignedIn]     = useState(false)
  const [files, setFiles]           = useState<DriveFile[]>([])
  const [loading, setLoading]       = useState(false)
  const [search, setSearch]         = useState('')
  const [error, setError]           = useState<string | null>(null)
  const pickerInited                = useRef(false)

  // ── Load gapi script ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!clientId || !apiKey) return
    if (typeof window === 'undefined') return
    if (window.gapi) { initGapi(); return }

    const script = document.createElement('script')
    script.src = 'https://apis.google.com/js/api.js'
    script.onload = initGapi
    document.head.appendChild(script)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, apiKey])

  const initGapi = () => {
    window.gapi.load('client:auth2', async () => {
      try {
        await window.gapi.client.init({
          apiKey,
          clientId,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          scope: 'https://www.googleapis.com/auth/drive.readonly',
        })
        const authInstance = window.gapi.auth2.getAuthInstance()
        const isIn = authInstance.isSignedIn.get()
        setSignedIn(isIn)
        if (isIn) fetchFiles()
        authInstance.isSignedIn.listen((v: boolean) => {
          setSignedIn(v)
          if (v) fetchFiles()
          else setFiles([])
        })
        setGapiReady(true)
      } catch (e) {
        setError(`Google API error: ${(e as Error).message}`)
      }
    })
  }

  const fetchFiles = useCallback(async (query?: string) => {
    setLoading(true)
    setError(null)
    try {
      const q = query
        ? `name contains '${query.replace(/'/g, "\\'")}' and trashed = false`
        : 'trashed = false'

      const res = await window.gapi.client.drive.files.list({
        pageSize: 20,
        orderBy: 'modifiedTime desc',
        fields: 'files(id,name,mimeType,modifiedTime,webViewLink,iconLink,size)',
        q,
      })
      setFiles(res.result.files ?? [])
    } catch (e) {
      setError(`Could not load files: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const openPicker = useCallback(() => {
    if (pickerInited.current) return
    pickerInited.current = true
    const pickerScript = document.createElement('script')
    pickerScript.src = 'https://apis.google.com/js/picker.js'
    pickerScript.onload = () => {
      pickerInited.current = false
      const token = window.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token
      const picker = new window.google.picker.PickerBuilder()
        .addView(new window.google.picker.DocsView())
        .setOAuthToken(token)
        .setDeveloperKey(apiKey!)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .setCallback((data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const file = data.docs[0]
            if (file?.url) window.open(file.url, '_blank', 'noopener')
          }
        })
        .build()
      picker.setVisible(true)
    }
    document.head.appendChild(pickerScript)
  }, [apiKey])

  // ── No credentials configured ─────────────────────────────────────────────
  if (!clientId || !apiKey) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
        <div className="flex items-start gap-3 text-amber-600 dark:text-amber-400">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Google Drive not configured</p>
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
              . Enable the Google Drive API and create an OAuth 2.0 web client + API key.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Not signed in ─────────────────────────────────────────────────────────
  if (!signedIn) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-3">
          <FolderOpen size={22} className="text-blue-500" />
        </div>
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Connect Google Drive</p>
        <p className="text-xs text-stone-400 mt-1 mb-4">Quick access to your documents</p>
        <Button
          onClick={() => gapiReady && window.gapi.auth2.getAuthInstance().signIn()}
          disabled={!gapiReady}
          size="sm"
          variant="secondary"
        >
          {gapiReady ? 'Sign in with Google' : 'Loading…'}
        </Button>
      </div>
    )
  }

  // ── Signed in ─────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <FolderOpen size={15} className="text-blue-500" />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Google Drive</span>
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
            onClick={() => window.gapi.auth2.getAuthInstance().signOut()}
            className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 px-2 py-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Search */}
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
              placeholder="Search Drive…"
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

      {/* File list */}
      {error && (
        <div className="px-4 py-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20">
          {error}
        </div>
      )}

      {loading && files.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-400">Loading files…</div>
      ) : files.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-400">
          {search ? 'No files match.' : 'No recent files.'}
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
