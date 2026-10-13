'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/server/crypto'
import {
  CONNECTIONS, isApiScope, isConnection, refreshAccessToken, revokeToken, serverFlowEnabled, type Connection,
} from '@/lib/server/google'

export type GoogleStatus = {
  enabled: boolean
  connections: Partial<Record<Connection, { email: string | null; scopes: string[] }>>
}

export type TokenResult =
  | { ok: true; accessToken: string; expiresAt: number }
  | { ok: false; reconnect: boolean; error: string }

// Per-instance cache so three widgets mounting together cause one refresh, not three.
const cache = new Map<string, { token: string; expiresAt: number }>()
const SAFETY_MS = 60_000

export async function getGoogleStatus(): Promise<GoogleStatus> {
  if (!serverFlowEnabled()) return { enabled: false, connections: {} }
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { enabled: true, connections: {} }

  const { data } = await sb.from('google_connections').select('connection, google_email, scopes').eq('user_id', user.id)
  const connections: GoogleStatus['connections'] = {}
  for (const row of data ?? []) {
    if (CONNECTIONS.includes(row.connection)) {
      connections[row.connection as Connection] = { email: row.google_email, scopes: String(row.scopes).split(' ').filter(Boolean) }
    }
  }
  return { enabled: true, connections }
}

/** Mints a short-lived access token from the stored refresh token. The refresh token never leaves the server. */
export async function getGoogleAccessToken(connection: string, scope: string): Promise<TokenResult> {
  if (!serverFlowEnabled()) return { ok: false, reconnect: false, error: 'Server-side Google refresh is not configured' }
  if (!isConnection(connection) || !isApiScope(scope)) return { ok: false, reconnect: false, error: 'Invalid request' }

  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false, reconnect: false, error: 'Not signed in' }

  const key = `${user.id}:${connection}`
  const hit = cache.get(key)
  if (hit && hit.expiresAt - SAFETY_MS > Date.now()) return { ok: true, accessToken: hit.token, expiresAt: hit.expiresAt }

  const { data: row } = await sb
    .from('google_connections').select('refresh_token_enc, scopes').eq('user_id', user.id).eq('connection', connection).maybeSingle()
  if (!row || !String(row.scopes).split(' ').includes(scope)) return { ok: false, reconnect: true, error: 'Not connected' }

  let refreshToken: string
  try {
    refreshToken = decrypt(row.refresh_token_enc)
  } catch {
    return { ok: false, reconnect: true, error: 'Stored connection is unreadable; reconnect' }
  }

  const r = await refreshAccessToken(refreshToken)
  if (!r.ok) {
    if (r.revoked) {
      await sb.from('google_connections').delete().eq('user_id', user.id).eq('connection', connection)
      cache.delete(key)
    }
    return { ok: false, reconnect: r.revoked, error: r.revoked ? 'Google access was revoked; reconnect' : r.error }
  }

  const expiresAt = Date.now() + r.expiresIn * 1000
  cache.set(key, { token: r.accessToken, expiresAt })
  return { ok: true, accessToken: r.accessToken, expiresAt }
}

export async function disconnectGoogle(connection: string): Promise<{ ok: boolean }> {
  if (!isConnection(connection)) return { ok: false }
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false }

  const { data: row } = await sb
    .from('google_connections').select('refresh_token_enc').eq('user_id', user.id).eq('connection', connection).maybeSingle()
  await sb.from('google_connections').delete().eq('user_id', user.id).eq('connection', connection)
  cache.delete(`${user.id}:${connection}`)
  if (row) {
    try { await revokeToken(decrypt(row.refresh_token_enc)) } catch { /* already gone locally */ }
  }
  return { ok: true }
}
