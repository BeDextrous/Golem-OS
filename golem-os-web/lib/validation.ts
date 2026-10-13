import { z } from 'zod'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/task-constants'

// Mirrors the CHECK constraints in supabase/schema.sql; the database stays the backstop.
const PILLARS = ['life', 'dextrous', 'work'] as const

/** Selects send '' for "None"; treat blank as null so it reads as "no value". */
const blankToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v)

const optionalText = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max, `Keep it under ${max} characters`).nullish())

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(blankToNull, z.enum(values).nullish())

const optionalId = z.preprocess(blankToNull, z.number().int().positive().nullish())

const optionalDate = z.preprocess(
  blankToNull,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date').nullish()
)

export const taskSchema = z.strictObject({
  name: z.string().trim().min(1, 'Name is required').max(500, 'Name is too long'),
  status: optionalEnum(TASK_STATUSES as unknown as readonly [string, ...string[]]),
  priority: optionalEnum(TASK_PRIORITIES as unknown as readonly [string, ...string[]]),
  area: optionalText(100),
  due_date: optionalDate,
  objective_id: optionalId,
  project_id: optionalId,
  client_id: optionalId,
  pillar: optionalEnum(PILLARS),
})

export const financeSchema = z.strictObject({
  label: z.string().trim().min(1, 'Label is required').max(200, 'Label is too long'),
  category: optionalText(100),
  amount: z.number({ error: 'Amount must be a number' }).finite().min(-1e11).max(1e11),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date'),
  pillar: optionalEnum(PILLARS),
})

/** Tables the generic CRUD actions may write. Anything not listed is refused. */
export const TABLE_SCHEMAS = {
  tasks: taskSchema,
  finances: financeSchema,
} as const

export type CrudTable = keyof typeof TABLE_SCHEMAS

export const isCrudTable = (t: string): t is CrudTable =>
  Object.prototype.hasOwnProperty.call(TABLE_SCHEMAS, t)

/** First human-readable validation message from a Zod error. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0]
  const field = issue.path.length ? `${String(issue.path[0])}: ` : ''
  return issue.path.length && issue.message.startsWith('Invalid') ? `${field}${issue.message}` : issue.message
}
