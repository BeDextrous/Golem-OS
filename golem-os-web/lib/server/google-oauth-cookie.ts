import { decrypt, encrypt } from './crypto'
import type { Connection } from './google'

export const OAUTH_COOKIE = 'golem_google_oauth'
const MAX_AGE_SECONDS = 600

export type OAuthCookie = { state: string; verifier: string; connection: Connection; next: string; uid: string; iat: number }

/** Encrypted + authenticated, so it can't be read or forged client-side (it holds the PKCE verifier). */
export const sealCookie = (c: Omit<OAuthCookie, 'iat'>) => encrypt(JSON.stringify({ ...c, iat: Date.now() }))

export function openCookie(value: string | undefined): OAuthCookie | null {
  if (!value) return null
  try {
    const c = JSON.parse(decrypt(value)) as OAuthCookie
    return Date.now() - c.iat <= MAX_AGE_SECONDS * 1000 ? c : null
  } catch {
    return null
  }
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/google',
  maxAge: MAX_AGE_SECONDS,
}
