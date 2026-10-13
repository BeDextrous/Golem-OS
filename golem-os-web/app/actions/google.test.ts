import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { encrypt } from '@/lib/server/crypto'

const KEY = Buffer.alloc(32, 9).toString('base64')

const db = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  rows: [] as Record<string, unknown>[],
  deleted: 0,
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: db.user } }) },
    from: () => {
      let op = 'select'
      const chain: Record<string, unknown> = {
        select: () => chain,
        delete: () => { op = 'delete'; return chain },
        eq: () => chain,
        maybeSingle: async () => ({ data: db.rows[0] ?? null }),
        then: (res: (v: unknown) => void) => {
          if (op === 'delete') { db.deleted++; db.rows = []; return res({ error: null }) }
          return res({ data: db.rows })
        },
      }
      return chain
    },
  }),
}))

import { disconnectGoogle, getGoogleAccessToken, getGoogleStatus } from './google'
import { GOOGLE_SCOPES } from '@/lib/server/google'

const row = (over: Record<string, unknown> = {}) => ({
  connection: 'dextrous', google_email: 'max@bedextrous.com',
  scopes: Object.values(GOOGLE_SCOPES).join(' '), refresh_token_enc: encrypt('refresh-1', KEY), ...over,
})

function mockGoogle(handler: (url: string, body: URLSearchParams) => { status: number; json: unknown }) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const r = handler(String(input), (init?.body as URLSearchParams) ?? new URLSearchParams())
    return new Response(JSON.stringify(r.json), { status: r.status })
  })
}

let n = 0
beforeEach(() => {
  Object.assign(process.env, { GOOGLE_CLIENT_ID: 'cid', GOOGLE_CLIENT_SECRET: 'sec', GOOGLE_TOKEN_KEY: KEY })
  db.user = { id: `u-${++n}` } // fresh user per test: the in-memory token cache is keyed by user
  db.rows = [row()]
  db.deleted = 0
})
afterEach(() => {
  for (const k of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_TOKEN_KEY']) delete process.env[k]
  vi.restoreAllMocks()
})

describe('getGoogleStatus', () => {
  it('reports disabled when server flow is not configured', async () => {
    delete process.env.GOOGLE_CLIENT_SECRET
    expect(await getGoogleStatus()).toEqual({ enabled: false, connections: {} })
  })
  it('lists connections with email and scopes, never tokens', async () => {
    const s = await getGoogleStatus()
    expect(s.enabled).toBe(true)
    expect(s.connections.dextrous?.email).toBe('max@bedextrous.com')
    expect(s.connections.dextrous?.scopes).toContain(GOOGLE_SCOPES.gmail)
    expect(JSON.stringify(s)).not.toContain('refresh')
  })
  it('is empty when signed out', async () => {
    db.user = null
    expect((await getGoogleStatus()).connections).toEqual({})
  })
})

describe('getGoogleAccessToken', () => {
  it('refuses unknown connections and scopes without touching Google', async () => {
    const f = mockGoogle(() => ({ status: 200, json: {} }))
    expect((await getGoogleAccessToken('work', GOOGLE_SCOPES.gmail)).ok).toBe(false)
    expect((await getGoogleAccessToken('life', 'https://www.googleapis.com/auth/drive')).ok).toBe(false)
    expect(f).not.toHaveBeenCalled()
  })

  it('requires a session', async () => {
    db.user = null
    expect(await getGoogleAccessToken('dextrous', GOOGLE_SCOPES.gmail)).toMatchObject({ ok: false, reconnect: false })
  })

  it('asks to reconnect when nothing is stored or the scope was not granted', async () => {
    db.rows = []
    expect(await getGoogleAccessToken('dextrous', GOOGLE_SCOPES.gmail)).toMatchObject({ ok: false, reconnect: true })
    db.rows = [row({ scopes: GOOGLE_SCOPES.calendar })]
    expect(await getGoogleAccessToken('dextrous', GOOGLE_SCOPES.gmail)).toMatchObject({ ok: false, reconnect: true })
  })

  it('mints an access token from the decrypted refresh token, then serves it from cache', async () => {
    const f = mockGoogle((_, body) => {
      expect(body.get('refresh_token')).toBe('refresh-1') // decrypted server-side
      return { status: 200, json: { access_token: 'ya29.fresh', expires_in: 3599 } }
    })
    const a = await getGoogleAccessToken('dextrous', GOOGLE_SCOPES.calendar)
    expect(a).toMatchObject({ ok: true, accessToken: 'ya29.fresh' })
    const b = await getGoogleAccessToken('dextrous', GOOGLE_SCOPES.gmail)
    expect(b).toMatchObject({ ok: true, accessToken: 'ya29.fresh' })
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('deletes the stored connection when Google says it was revoked', async () => {
    mockGoogle(() => ({ status: 400, json: { error: 'invalid_grant' } }))
    const r = await getGoogleAccessToken('dextrous', GOOGLE_SCOPES.calendar)
    expect(r).toMatchObject({ ok: false, reconnect: true })
    expect(db.deleted).toBe(1)
  })

  it('keeps the connection on transient Google errors', async () => {
    mockGoogle(() => ({ status: 503, json: { error: 'backend_error' } }))
    const r = await getGoogleAccessToken('dextrous', GOOGLE_SCOPES.calendar)
    expect(r).toMatchObject({ ok: false, reconnect: false })
    expect(db.deleted).toBe(0)
  })

  it('asks to reconnect (without deleting) when the token cannot be decrypted, e.g. key rotated', async () => {
    db.rows = [row({ refresh_token_enc: encrypt('x', Buffer.alloc(32, 1).toString('base64')) })]
    const r = await getGoogleAccessToken('dextrous', GOOGLE_SCOPES.calendar)
    expect(r).toMatchObject({ ok: false, reconnect: true })
    expect(db.deleted).toBe(0)
  })
})

describe('disconnectGoogle', () => {
  it('deletes the row and revokes the token at Google', async () => {
    const f = mockGoogle(() => ({ status: 200, json: {} }))
    expect(await disconnectGoogle('dextrous')).toEqual({ ok: true })
    expect(db.deleted).toBe(1)
    expect(String(f.mock.calls[0][0])).toContain('/revoke')
    expect((f.mock.calls[0][1]!.body as URLSearchParams).get('token')).toBe('refresh-1')
  })
  it('rejects bad connections and signed-out callers', async () => {
    expect(await disconnectGoogle('nope')).toEqual({ ok: false })
    db.user = null
    expect(await disconnectGoogle('life')).toEqual({ ok: false })
  })
})
