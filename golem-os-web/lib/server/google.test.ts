import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GOOGLE_SCOPES, buildAuthUrl, exchangeCode, isApiScope, isConnection, pkcePair, refreshAccessToken, safeNext, serverFlowEnabled,
} from './google'
import { openCookie, sealCookie } from './google-oauth-cookie'

const ENV = { GOOGLE_CLIENT_ID: 'cid', GOOGLE_CLIENT_SECRET: 'csecret', GOOGLE_TOKEN_KEY: Buffer.alloc(32, 7).toString('base64') }

beforeEach(() => { Object.assign(process.env, ENV) })
afterEach(() => {
  for (const k of Object.keys(ENV)) delete process.env[k]
  delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('serverFlowEnabled', () => {
  it('needs client id, secret and token key', () => {
    expect(serverFlowEnabled()).toBe(true)
    delete process.env.GOOGLE_CLIENT_SECRET
    expect(serverFlowEnabled()).toBe(false)
  })
  it('falls back to the public client id', () => {
    delete process.env.GOOGLE_CLIENT_ID
    expect(serverFlowEnabled()).toBe(false)
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'public-cid'
    expect(serverFlowEnabled()).toBe(true)
  })
})

describe('validators', () => {
  it('safeNext only allows same-origin paths', () => {
    expect(safeNext('/life/tasks?x=1')).toBe('/life/tasks?x=1')
    for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', '@evil.com', '', null, undefined]) expect(safeNext(bad)).toBe('/')
  })
  it('connection and scope allow-lists', () => {
    expect(isConnection('life')).toBe(true)
    expect(isConnection('work')).toBe(false)
    expect(isApiScope(GOOGLE_SCOPES.calendar)).toBe(true)
    expect(isApiScope('https://www.googleapis.com/auth/drive')).toBe(false) // full drive is not allowed
  })
})

describe('PKCE and auth URL', () => {
  it('challenge is the base64url sha256 of the verifier', () => {
    const { verifier, challenge } = pkcePair()
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'))
    expect(verifier.length).toBeGreaterThanOrEqual(43)
  })

  it('asks for offline access, consent, PKCE and all three API scopes', () => {
    const u = new URL(buildAuthUrl({ redirectUri: 'https://x.test/api/google/callback', state: 's1', challenge: 'ch' }))
    const p = u.searchParams
    expect(u.origin + u.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(p.get('access_type')).toBe('offline')
    expect(p.get('prompt')).toBe('consent')
    expect(p.get('code_challenge_method')).toBe('S256')
    expect(p.get('state')).toBe('s1')
    expect(p.get('redirect_uri')).toBe('https://x.test/api/google/callback')
    for (const s of Object.values(GOOGLE_SCOPES)) expect(p.get('scope')).toContain(s)
    expect(p.get('scope')).toContain('email')
    expect(p.get('client_secret')).toBeNull()
  })

  it('supports account switching and a login hint', () => {
    const p = new URL(buildAuthUrl({ redirectUri: 'r', state: 's', challenge: 'c', selectAccount: true, loginHint: 'a@b.com' })).searchParams
    expect(p.get('prompt')).toBe('consent select_account')
    expect(p.get('login_hint')).toBe('a@b.com')
  })
})

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

describe('token endpoint', () => {
  it('refreshes an access token', async () => {
    const f = mockFetch(200, { access_token: 'ya29.x', expires_in: 3599, scope: 'a b' })
    const r = await refreshAccessToken('rt')
    expect(r).toEqual({ ok: true, accessToken: 'ya29.x', expiresIn: 3599, scope: 'a b' })
    const body = (f.mock.calls[0][1]!.body as URLSearchParams)
    expect(body.get('grant_type')).toBe('refresh_token')
    expect(body.get('refresh_token')).toBe('rt')
    expect(body.get('client_secret')).toBe('csecret')
  })

  it('flags a revoked/expired refresh token (invalid_grant)', async () => {
    mockFetch(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' })
    expect(await refreshAccessToken('rt')).toMatchObject({ ok: false, revoked: true })
  })

  it('treats other failures as retryable, not revoked', async () => {
    mockFetch(500, { error: 'backend_error' })
    expect(await refreshAccessToken('rt')).toMatchObject({ ok: false, revoked: false })
  })

  it('exchanges the code with the PKCE verifier', async () => {
    const f = mockFetch(200, { access_token: 'a', refresh_token: 'r', scope: 's' })
    const r = await exchangeCode({ code: 'c', redirectUri: 'https://x/cb', verifier: 'v' })
    expect(r.ok && r.refresh_token).toBe('r')
    const b = f.mock.calls[0][1]!.body as URLSearchParams
    expect(b.get('code_verifier')).toBe('v')
    expect(b.get('grant_type')).toBe('authorization_code')
  })
})

describe('oauth state cookie', () => {
  const payload = { state: 's', verifier: 'v', connection: 'life' as const, next: '/life', uid: 'u1' }

  it('round-trips', () => {
    expect(openCookie(sealCookie(payload))).toMatchObject(payload)
  })
  it('rejects tampering, garbage and missing values', () => {
    const sealed = sealCookie(payload)
    expect(openCookie(sealed.slice(0, -2) + 'AA')).toBeNull()
    expect(openCookie('nope')).toBeNull()
    expect(openCookie(undefined)).toBeNull()
  })
  it('expires after 10 minutes', () => {
    vi.useFakeTimers()
    const sealed = sealCookie(payload)
    vi.setSystemTime(Date.now() + 11 * 60 * 1000)
    expect(openCookie(sealed)).toBeNull()
  })
})
