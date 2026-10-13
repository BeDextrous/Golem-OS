import { createHash, randomBytes } from 'node:crypto'

export const CONNECTIONS = ['life', 'dextrous'] as const
export type Connection = (typeof CONNECTIONS)[number]
export const isConnection = (v: unknown): v is Connection => CONNECTIONS.includes(v as Connection)

/** Scopes the widgets use. One consent covers all three; `openid email` lets us show which account is linked. */
export const GOOGLE_SCOPES = {
  calendar: 'https://www.googleapis.com/auth/calendar.readonly',
  gmail: 'https://www.googleapis.com/auth/gmail.readonly',
  drive: 'https://www.googleapis.com/auth/drive.readonly',
} as const
const ALLOWED_API_SCOPES: string[] = Object.values(GOOGLE_SCOPES)
export const isApiScope = (v: unknown): v is string => typeof v === 'string' && ALLOWED_API_SCOPES.includes(v)
const CONSENT_SCOPES = ['openid', 'email', ...ALLOWED_API_SCOPES]

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

export function googleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    tokenKey: process.env.GOOGLE_TOKEN_KEY,
  }
}

/** Server-side refresh is only active when all three are configured; otherwise widgets keep the browser flow. */
export function serverFlowEnabled(): boolean {
  const c = googleConfig()
  return Boolean(c.clientId && c.clientSecret && c.tokenKey)
}

/** Same-origin paths only (rejects '//host', '/\host', absolute URLs). */
export function safeNext(raw: string | null | undefined): string {
  return raw && /^\/(?![/\\])/.test(raw) ? raw : '/'
}

export function pkcePair() {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function buildAuthUrl(opts: {
  redirectUri: string
  state: string
  challenge: string
  selectAccount?: boolean
  loginHint?: string
}): string {
  const { clientId } = googleConfig()
  if (!clientId) throw new Error('Google client id is not configured')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: CONSENT_SCOPES.join(' '),
    access_type: 'offline',            // issues a refresh token
    prompt: opts.selectAccount ? 'consent select_account' : 'consent', // consent guarantees the refresh token is returned
    include_granted_scopes: 'true',
    state: opts.state,
    code_challenge: opts.challenge,
    code_challenge_method: 'S256',
  })
  if (opts.loginHint) params.set('login_hint', opts.loginHint)
  return `${AUTH_URL}?${params.toString()}`
}

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  error?: string
  error_description?: string
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse & { ok: boolean }> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => ({}))) as TokenResponse
  return { ...json, ok: res.ok && !json.error }
}

export async function exchangeCode(opts: { code: string; redirectUri: string; verifier: string }) {
  const { clientId, clientSecret } = googleConfig()
  return tokenRequest({
    grant_type: 'authorization_code',
    code: opts.code,
    redirect_uri: opts.redirectUri,
    code_verifier: opts.verifier,
    client_id: clientId ?? '',
    client_secret: clientSecret ?? '',
  })
}

export type RefreshResult =
  | { ok: true; accessToken: string; expiresIn: number; scope: string }
  | { ok: false; revoked: boolean; error: string }

/** `revoked` means the refresh token is dead (user removed access, token expired): reconnecting is the only fix. */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
  const { clientId, clientSecret } = googleConfig()
  const r = await tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId ?? '',
    client_secret: clientSecret ?? '',
  })
  if (r.ok && r.access_token) {
    return { ok: true, accessToken: r.access_token, expiresIn: r.expires_in ?? 3600, scope: r.scope ?? '' }
  }
  return { ok: false, revoked: r.error === 'invalid_grant', error: r.error_description ?? r.error ?? 'Token refresh failed' }
}

export async function fetchEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
    if (!res.ok) return null
    return ((await res.json()) as { email?: string }).email ?? null
  } catch {
    return null
  }
}

/** Best-effort: tell Google to invalidate the token. Local deletion is what matters. */
export async function revokeToken(token: string): Promise<void> {
  try {
    await fetch(REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
      cache: 'no-store',
    })
  } catch { /* ignore */ }
}
