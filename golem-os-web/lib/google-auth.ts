'use client'

// Google Identity Services (GIS) token-client wrapper.
//
// Golem OS talks to two separate Google accounts: `dextrous` (max@bedextrous.com,
// used by the Dextrous pillar's Drive/Calendar/Gmail widgets) and `life`
// (Max's personal Gmail, used by the Life pillar's widgets). Both share the
// same OAuth client ID (one Google Cloud project can mint tokens for any
// Google account — the account is chosen at sign-in, not baked into the
// client ID), but each connection's token is cached independently so
// signing in to one never silently authenticates the other.
//
// This replaces the legacy `gapi.auth2` (Google Sign-In JS) approach used by
// the original Drive widget — that library has been deprecated by Google for
// years; GIS's token client is the current supported pattern for
// client-side-only apps like this one.

export type ConnectionKey = 'life' | 'dextrous'

export const CONNECTION_LABEL: Record<ConnectionKey, string> = {
  life: 'Personal Google account',
  dextrous: 'Dextrous Google account',
}

interface StoredToken {
  accessToken: string
  expiresAt: number // epoch ms
  scope: string
}

interface TokenResponse {
  access_token: string
  expires_in: number
  scope: string
  error?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            prompt?: string
            callback: (resp: TokenResponse) => void
            error_callback?: (err: { type: string; message?: string }) => void
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void }
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      picker: any
    }
  }
}

let gisScriptPromise: Promise<void> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') { reject(new Error('no document')); return }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') { resolve(); return }
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)))
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => { script.dataset.loaded = 'true'; resolve() }
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

/** Loads the Google Identity Services script (idempotent, cached). */
export function loadGis(): Promise<void> {
  if (!gisScriptPromise) gisScriptPromise = loadScript('https://accounts.google.com/gsi/client')
  return gisScriptPromise
}

/** Loads the legacy Picker library (unrelated to auth — still the current API for file pickers). */
export function loadPicker(): Promise<void> {
  return loadScript('https://apis.google.com/js/api.js').then(
    () =>
      new Promise<void>((resolve) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).gapi.load('picker', () => resolve())
      })
  )
}

function storageKey(connection: ConnectionKey, scope: string) {
  return `golem_google_token_${connection}_${scope.replace(/[^a-z0-9]/gi, '_')}`
}

function readCachedToken(connection: ConnectionKey, scope: string): StoredToken | null {
  try {
    const raw = sessionStorage.getItem(storageKey(connection, scope))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredToken
    if (parsed.expiresAt - 30_000 < Date.now()) return null // 30s safety margin
    return parsed
  } catch {
    return null
  }
}

function writeCachedToken(connection: ConnectionKey, scope: string, token: StoredToken) {
  try { sessionStorage.setItem(storageKey(connection, scope), JSON.stringify(token)) } catch { /* ignore */ }
}

function clearCachedToken(connection: ConnectionKey, scope: string) {
  try { sessionStorage.removeItem(storageKey(connection, scope)) } catch { /* ignore */ }
}

/**
 * Returns a cached access token for (connection, scope) if still valid,
 * otherwise runs the GIS token flow. Pass `forceAccountPicker` for an
 * explicit "Connect" / "Switch account" click so the user can choose which
 * of their Google accounts to use for this connection.
 */
export async function getAccessToken(opts: {
  connection: ConnectionKey
  clientId: string
  scope: string
  forceAccountPicker?: boolean
}): Promise<string> {
  const { connection, clientId, scope, forceAccountPicker } = opts
  const cached = readCachedToken(connection, scope)
  if (cached && !forceAccountPicker) return cached.accessToken

  await loadGis()

  return new Promise((resolve, reject) => {
    if (!window.google) { reject(new Error('Google Identity Services failed to load')); return }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || 'No access token returned'))
          return
        }
        writeCachedToken(connection, scope, {
          accessToken: resp.access_token,
          expiresAt: Date.now() + resp.expires_in * 1000,
          scope: resp.scope,
        })
        resolve(resp.access_token)
      },
      error_callback: (err) => reject(new Error(err.message || err.type)),
    })
    client.requestAccessToken(forceAccountPicker ? { prompt: 'select_account' } : {})
  })
}

export function isConnected(connection: ConnectionKey, scope: string): boolean {
  return readCachedToken(connection, scope) != null
}

export function disconnect(connection: ConnectionKey, scope: string) {
  clearCachedToken(connection, scope)
}

/** Thin fetch wrapper for Google REST APIs — throws with the API's own error message on failure. */
export async function googleApiFetch<T>(token: string, url: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body?.error?.message ?? message
    } catch { /* ignore parse failure */ }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}
