'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import { firstIssue, isCrudTable, TABLE_SCHEMAS, type CrudTable } from '@/lib/validation'

type RowOf<T extends CrudTable> = Database['public']['Tables'][T]['Row']

export type ActionResult<T = Record<string, unknown>> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })

/**
 * Server Functions are public POST endpoints, so each call re-checks the
 * session and validates input. RLS still enforces row ownership underneath.
 */
async function context(table: string) {
  if (!isCrudTable(table)) return { ok: false, error: `Unknown table "${table}"` } as const
  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in' } as const
  return { ok: true, sb, user, schema: TABLE_SCHEMAS[table] } as const
}

const validId = (id: unknown): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0

export async function createRow<T extends CrudTable>(table: T, input: unknown): Promise<ActionResult<RowOf<T>>> {
  const ctx = await context(table)
  if (!ctx.ok) return fail(ctx.error)

  const parsed = ctx.schema.safeParse(input)
  if (!parsed.success) return fail(firstIssue(parsed.error))

  // user_id always comes from the session, never from the client
  const { data, error } = await ctx.sb
    .from(table)
    .insert({ ...parsed.data, user_id: ctx.user.id })
    .select()
    .single()
  if (error) return fail(error.message)
  return { ok: true, data: data as RowOf<T> }
}

export async function updateRow<T extends CrudTable>(table: T, id: number, input: unknown): Promise<ActionResult<RowOf<T>>> {
  const ctx = await context(table)
  if (!ctx.ok) return fail(ctx.error)
  if (!validId(id)) return fail('Invalid id')

  const parsed = ctx.schema.partial().safeParse(input)
  if (!parsed.success) return fail(firstIssue(parsed.error))
  if (Object.keys(parsed.data).length === 0) return fail('Nothing to update')

  const { data, error } = await ctx.sb
    .from(table)
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', ctx.user.id)
    .select()
    .single()
  if (error) return fail(error.message)
  return { ok: true, data: data as RowOf<T> }
}

export async function deleteRow(table: CrudTable, id: number): Promise<ActionResult<{ id: number }>> {
  const ctx = await context(table)
  if (!ctx.ok) return fail(ctx.error)
  if (!validId(id)) return fail('Invalid id')

  const { error } = await ctx.sb.from(table).delete().eq('id', id).eq('user_id', ctx.user.id)
  if (error) return fail(error.message)
  return { ok: true, data: { id } }
}

/** Apply the same partial update to several rows (bulk edit). */
export async function updateMany(table: CrudTable, ids: number[], input: unknown): Promise<ActionResult<{ ids: number[] }>> {
  const ctx = await context(table)
  if (!ctx.ok) return fail(ctx.error)
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500 || !ids.every(validId)) return fail('Invalid ids')

  const parsed = ctx.schema.partial().safeParse(input)
  if (!parsed.success) return fail(firstIssue(parsed.error))
  if (Object.keys(parsed.data).length === 0) return fail('Nothing to update')

  const { error } = await ctx.sb.from(table).update(parsed.data).in('id', ids).eq('user_id', ctx.user.id)
  if (error) return fail(error.message)
  return { ok: true, data: { ids } }
}
