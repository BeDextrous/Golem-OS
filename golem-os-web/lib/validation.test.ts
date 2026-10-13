import { describe, expect, it } from 'vitest'
import { financeSchema, firstIssue, isCrudTable, taskSchema } from './validation'

describe('taskSchema', () => {
  it('accepts a normal task and trims the name', () => {
    const r = taskSchema.safeParse({ name: '  Call Assaf ', status: 'Active', priority: 'High', pillar: 'work', due_date: '2026-10-14' })
    expect(r.success && r.data.name).toBe('Call Assaf')
  })

  it('requires a name', () => {
    const r = taskSchema.safeParse({ name: '   ' })
    expect(r.success).toBe(false)
    if (!r.success) expect(firstIssue(r.error)).toBe('Name is required')
  })

  it('turns blank select values into null instead of failing', () => {
    const r = taskSchema.safeParse({ name: 'x', status: '', priority: '', area: '', pillar: '', objective_id: '' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toMatchObject({ status: null, priority: null, area: null, pillar: null, objective_id: null })
  })

  it.each([
    [{ name: 'x', status: 'Paused' }],
    [{ name: 'x', priority: 'Urgent' }],
    [{ name: 'x', pillar: 'pagemaster' }],
    [{ name: 'x', due_date: '10/14/2026' }],
    [{ name: 'x', objective_id: -3 }],
    [{ name: 'x', objective_id: 1.5 }],
  ])('rejects %j', input => {
    expect(taskSchema.safeParse(input).success).toBe(false)
  })

  it('rejects unknown keys so user_id / id cannot be smuggled in', () => {
    expect(taskSchema.safeParse({ name: 'x', user_id: 'someone-else' }).success).toBe(false)
    expect(taskSchema.safeParse({ name: 'x', id: 5 }).success).toBe(false)
  })

  it('allows partial updates', () => {
    const r = taskSchema.partial().safeParse({ status: 'Done' })
    expect(r.success && r.data).toEqual({ status: 'Done' })
  })

  it('caps name length', () => {
    expect(taskSchema.safeParse({ name: 'a'.repeat(501) }).success).toBe(false)
  })
})

describe('financeSchema', () => {
  const ok = { label: 'Coffee', amount: -4.5, entry_date: '2026-10-12' }

  it('accepts a valid entry', () => {
    expect(financeSchema.safeParse(ok).success).toBe(true)
  })
  it('requires a label and a numeric amount', () => {
    expect(financeSchema.safeParse({ ...ok, label: '' }).success).toBe(false)
    expect(financeSchema.safeParse({ ...ok, amount: '4' }).success).toBe(false)
    expect(financeSchema.safeParse({ ...ok, amount: NaN }).success).toBe(false)
    expect(financeSchema.safeParse({ ...ok, amount: Infinity }).success).toBe(false)
  })
  it('rejects absurd amounts and bad dates', () => {
    expect(financeSchema.safeParse({ ...ok, amount: 1e12 }).success).toBe(false)
    expect(financeSchema.safeParse({ ...ok, entry_date: 'today' }).success).toBe(false)
  })
})

describe('isCrudTable', () => {
  it('allows only registered tables', () => {
    expect(isCrudTable('tasks')).toBe(true)
    expect(isCrudTable('finances')).toBe(true)
    expect(isCrudTable('users')).toBe(false)
    expect(isCrudTable('constructor')).toBe(false)
    expect(isCrudTable('__proto__')).toBe(false)
  })
})
