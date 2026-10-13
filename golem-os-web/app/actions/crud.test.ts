import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  user: { id: 'user-1' } as { id: string } | null,
  calls: [] as { op: string; table: string; payload?: unknown; filters: [string, unknown][] }[],
  result: { data: { id: 1 }, error: null } as { data: unknown; error: { message: string } | null },
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      const call = { op: '', table, payload: undefined as unknown, filters: [] as [string, unknown][] }
      state.calls.push(call)
      const chain: Record<string, unknown> = {
        insert: (p: unknown) => { call.op = 'insert'; call.payload = p; return chain },
        update: (p: unknown) => { call.op = 'update'; call.payload = p; return chain },
        delete: () => { call.op = 'delete'; return chain },
        eq: (k: string, v: unknown) => { call.filters.push([k, v]); return chain },
        select: () => chain,
        single: async () => state.result,
        then: (res: (v: unknown) => void) => res(state.result), // awaiting delete().eq().eq()
      }
      return chain
    },
  }),
}))

import { createRow, deleteRow, updateRow } from './crud'

beforeEach(() => {
  state.user = { id: 'user-1' }
  state.calls = []
  state.result = { data: { id: 1 }, error: null }
})

describe('createRow', () => {
  it('rejects when signed out and never touches the database', async () => {
    state.user = null
    expect(await createRow('tasks', { name: 'x' })).toEqual({ ok: false, error: 'Not signed in' })
    expect(state.calls).toHaveLength(0)
  })

  it('refuses unregistered tables', async () => {
    const r = await createRow('auth.users', { name: 'x' })
    expect(r.ok).toBe(false)
    expect(state.calls).toHaveLength(0)
  })

  it('returns the validation message and does not write', async () => {
    const r = await createRow('tasks', { name: '' })
    expect(r).toEqual({ ok: false, error: 'Name is required' })
    expect(state.calls).toHaveLength(0)
  })

  it('stamps user_id from the session', async () => {
    const r = await createRow('tasks', { name: 'Ship it', status: 'Active' })
    expect(r.ok).toBe(true)
    expect(state.calls[0].payload).toMatchObject({ name: 'Ship it', user_id: 'user-1' })
  })

  it('rejects a client-supplied user_id', async () => {
    const r = await createRow('tasks', { name: 'x', user_id: 'victim' })
    expect(r.ok).toBe(false)
    expect(state.calls).toHaveLength(0)
  })

  it('surfaces database errors as a result, not an exception', async () => {
    state.result = { data: null, error: { message: 'boom' } }
    expect(await createRow('finances', { label: 'x', amount: 1, entry_date: '2026-10-12' })).toEqual({ ok: false, error: 'boom' })
  })
})

describe('updateRow', () => {
  it('scopes the update to the id and the signed-in user', async () => {
    const r = await updateRow('tasks', 7, { status: 'Done' })
    expect(r.ok).toBe(true)
    expect(state.calls[0].filters).toEqual([['id', 7], ['user_id', 'user-1']])
    expect(state.calls[0].payload).toEqual({ status: 'Done' })
  })

  it('rejects bad ids and empty updates', async () => {
    expect((await updateRow('tasks', 0, { status: 'Done' })).ok).toBe(false)
    expect((await updateRow('tasks', 1.5, { status: 'Done' })).ok).toBe(false)
    expect(await updateRow('tasks', 1, {})).toEqual({ ok: false, error: 'Nothing to update' })
    expect(state.calls).toHaveLength(0)
  })

  it('rejects an invalid status', async () => {
    expect((await updateRow('tasks', 1, { status: 'Paused' })).ok).toBe(false)
    expect(state.calls).toHaveLength(0)
  })
})

describe('deleteRow', () => {
  it('scopes the delete to the id and the signed-in user', async () => {
    const r = await deleteRow('tasks', 9)
    expect(r).toEqual({ ok: true, data: { id: 9 } })
    expect(state.calls[0]).toMatchObject({ op: 'delete', filters: [['id', 9], ['user_id', 'user-1']] })
  })

  it('requires a session', async () => {
    state.user = null
    expect((await deleteRow('tasks', 9)).ok).toBe(false)
    expect(state.calls).toHaveLength(0)
  })
})
