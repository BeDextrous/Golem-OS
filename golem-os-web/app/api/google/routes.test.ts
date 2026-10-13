import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { decrypt } from '@/lib/server/crypto'
import { OAUTH_COOKIE, openCookie, sealCookie } from '@/lib/server/google-oauth-cookie'

const KEY = Buffer.alloc(32, 5).toString('base64')
const ORIGIN = 'https://golems.test'

const db = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  upserts: [] as { values: Record<string, unknown>; options: unknown }[],
  existingEmail: null as string | null,
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: db.user } }) },
    from: () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: db.existingEmail ? { google_email: db.existingEmail } : null }),
        upsert: async (values: Record<string, unknown>, options: unknown) => { db.upserts.push({ values, options }); return { error: null } },
      }
      return chain
    },
  }),
}))

import { GET as connect } from './connect/route'
import { GET as callback } from './callback/route'

const req = (path: string, cookie?: string) =>
  new NextRequest(`${ORIGIN}${path}`, { headers: cookie ? { cookie: `${OAUTH_COOKIE}=${cookie}` } : {} })

const sealed = (over: Record<string, unknown> = {}) =>
  sealCookie({ state: 'st', verifier: 'ver', connection: 'dextrous', next: '/dextrous', uid: 'u1', ...over } as Parameters<typeof sealCookie>[0])

beforeEach(() => {
  Object.assign(process.env, { GOOGLE_CLIENT_ID: 'cid', GOOGLE_CLIENT_SECRET: 'sec', GOOGLE_TOKEN_KEY: KEY })
  db.user = { id: 'u1' }
  db.upserts = []
  db.existingEmail = null
})
afterEach(() => {
  for (const k of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_TOKEN_KEY']) delete process.env[k]
  vi.restoreAllMocks()
})

describe('GET /api/google/connect', () => {
  it('redirects to Google with PKCE + state and sets an encrypted, httpOnly state cookie', async () => {
    const res = await connect(req('/api/google/connect?connection=dextrous&next=/dextrous/calendar'))
    const loc = new URL(res.headers.get('location')!)
    expect(loc.origin).toBe('https://accounts.google.com')
    expect(loc.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/api/google/callback`)
    expect(loc.searchParams.get('code_challenge_method')).toBe('S256')

    const set = res.headers.get('set-cookie')!
    expect(set).toMatch(/HttpOnly/i)
    expect(set).toMatch(/SameSite=lax/i)
    const value = decodeURIComponent(set.split(';')[0].split('=').slice(1).join('='))
    const c = openCookie(value)!
    expect(c).toMatchObject({ connection: 'dextrous', next: '/dextrous/calendar', uid: 'u1', state: loc.searchParams.get('state') })
    expect(set).not.toContain(c.verifier) // verifier only exists inside the encrypted cookie
  })

  it('sends signed-out users to login', async () => {
    db.user = null
    const res = await connect(req('/api/google/connect?connection=life'))
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
  })

  it('bounces back with google=unavailable for bad connections or when not configured', async () => {
    const bad = await connect(req('/api/google/connect?connection=work&next=/life'))
    expect(bad.headers.get('location')).toBe(`${ORIGIN}/life?google=unavailable`)
    delete process.env.GOOGLE_CLIENT_SECRET
    const off = await connect(req('/api/google/connect?connection=life'))
    expect(off.headers.get('location')).toBe(`${ORIGIN}/?google=unavailable`)
  })

  it('never redirects to an off-site next', async () => {
    delete process.env.GOOGLE_CLIENT_SECRET
    const res = await connect(req('/api/google/connect?connection=life&next=//evil.com'))
    expect(res.headers.get('location')).toBe(`${ORIGIN}/?google=unavailable`)
  })

  it('passes the previously linked email as a login hint', async () => {
    db.existingEmail = 'max@bedextrous.com'
    const res = await connect(req('/api/google/connect?connection=dextrous'))
    expect(new URL(res.headers.get('location')!).searchParams.get('login_hint')).toBe('max@bedextrous.com')
  })
})

describe('GET /api/google/callback', () => {
  function googleReturns(tokens: Record<string, unknown>, email = 'max@bedextrous.com') {
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input)
      if (url.includes('openidconnect')) return new Response(JSON.stringify({ email }))
      return new Response(JSON.stringify(tokens))
    })
  }

  it('stores only the ENCRYPTED refresh token and redirects back with google=connected', async () => {
    googleReturns({ access_token: 'ya29', refresh_token: '1//secret-refresh', scope: 'calendar gmail' })
    const res = await callback(req('/api/google/callback?code=abc&state=st', sealed()))
    expect(res.headers.get('location')).toBe(`${ORIGIN}/dextrous?google=connected`)
    expect(db.upserts).toHaveLength(1)
    const v = db.upserts[0].values
    expect(v).toMatchObject({ user_id: 'u1', connection: 'dextrous', google_email: 'max@bedextrous.com', scopes: 'calendar gmail' })
    expect(JSON.stringify(v)).not.toContain('1//secret-refresh')
    expect(decrypt(v.refresh_token_enc as string)).toBe('1//secret-refresh')
    expect(db.upserts[0].options).toEqual({ onConflict: 'user_id,connection' })
    expect(res.headers.get('set-cookie')).toMatch(/Max-Age=0/i) // state cookie cleared
  })

  it('rejects a wrong state (CSRF) and writes nothing', async () => {
    const f = googleReturns({ access_token: 'a', refresh_token: 'r' })
    const res = await callback(req('/api/google/callback?code=abc&state=OTHER', sealed()))
    expect(res.headers.get('location')).toBe(`${ORIGIN}/dextrous?google=error`)
    expect(db.upserts).toHaveLength(0)
    expect(f).not.toHaveBeenCalled()
  })

  it('rejects a missing, forged or expired state cookie', async () => {
    googleReturns({ access_token: 'a', refresh_token: 'r' })
    for (const cookie of [undefined, 'forged']) {
      const res = await callback(req('/api/google/callback?code=abc&state=st', cookie))
      expect(res.headers.get('location')).toBe(`${ORIGIN}/?google=error`)
    }
    expect(db.upserts).toHaveLength(0)
  })

  it('rejects a flow started by a different user', async () => {
    googleReturns({ access_token: 'a', refresh_token: 'r' })
    db.user = { id: 'someone-else' }
    const res = await callback(req('/api/google/callback?code=abc&state=st', sealed()))
    expect(res.headers.get('location')).toBe(`${ORIGIN}/dextrous?google=error`)
    expect(db.upserts).toHaveLength(0)
  })

  it('reports denial and missing refresh tokens without storing anything', async () => {
    const denied = await callback(req('/api/google/callback?error=access_denied&state=st', sealed()))
    expect(denied.headers.get('location')).toBe(`${ORIGIN}/dextrous?google=denied`)
    googleReturns({ access_token: 'a' }) // no refresh_token
    const noRefresh = await callback(req('/api/google/callback?code=abc&state=st', sealed()))
    expect(noRefresh.headers.get('location')).toBe(`${ORIGIN}/dextrous?google=error`)
    expect(db.upserts).toHaveLength(0)
  })
})
