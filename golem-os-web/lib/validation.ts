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

const optionalTimestamp = z.preprocess(blankToNull, z.iso.datetime({ offset: true }).nullish())

const optionalNumber = z.preprocess(
  v => (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : blankToNull(v)),
  z.number().finite().min(-1e12).max(1e12).nullish()
)

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i
const LOOKS_LIKE_HOST = /^[\w-]+(\.[\w-]+)+([/?#]|$)/

/** Free-text link: explicit non-http(s) schemes (javascript:, data:, ...) are refused; "site.com/x" becomes https://site.com/x. */
const urlText = z.string({ error: 'URL is required' }).trim().max(2000, 'URL is too long')
  .refine(v => !HAS_SCHEME.test(v) || /^https?:\/\//i.test(v), 'Use an http(s) link')
  .transform(v => (!HAS_SCHEME.test(v) && LOOKS_LIKE_HOST.test(v) ? `https://${v}` : v))

const optionalUrl = z.preprocess(blankToNull, urlText.nullish())

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`)

const longText = z.preprocess(blankToNull, z.string().max(200_000, 'Too long').nullish())

const enumOf = <T extends readonly [string, ...string[]]>(values: T) => optionalEnum(values)

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

const PILLARS_4 = ['life', 'dextrous', 'work', 'pagemaster'] as const

export const goalSchema = z.strictObject({
  title: requiredText('Title', 300),
  area: optionalText(100),
  notes: longText,
  pillar: enumOf(PILLARS),
  status: enumOf(['Active', 'Paused', 'Done', 'Archived']),
})

export const objectiveSchema = z.strictObject({
  title: requiredText('Title', 300),
  goal_id: optionalId,
  pillar: enumOf(PILLARS),
  metric_unit: optionalText(50),
  current_value: optionalNumber,
  target_value: optionalNumber,
  deadline: optionalDate,
})

export const noteSchema = z.strictObject({
  title: optionalText(500),
  content: longText,
  tags: optionalText(500),
  pillar: enumOf(PILLARS),
  parent_goal_id: optionalId,
  parent_objective_id: optionalId,
  parent_task_id: optionalId,
  updated_at: optionalTimestamp,
})

export const linkSchema = z.strictObject({
  url: z.preprocess(blankToNull, urlText),
  title: optionalText(500),
  website: optionalText(200),
  pillar: enumOf(PILLARS),
  date_added: optionalDate,
  read_at: optionalTimestamp,
  parent_goal_id: optionalId,
  parent_note_id: optionalId,
  parent_objective_id: optionalId,
  parent_task_id: optionalId,
})

export const readingSchema = z.strictObject({
  book_title: requiredText('Title', 300),
  author: optionalText(200),
  status: enumOf(['Want to Read', 'Reading', 'Paused', 'Read']),
  progress_pct: z.preprocess(
    v => (typeof v === 'string' && v.trim() !== '' ? Number(v) : blankToNull(v)),
    z.number().int().min(0).max(100).nullish()
  ),
})

export const healthSchema = z.strictObject({
  category: z.enum(['sleep', 'exercise', 'nutrition', 'weight', 'mood', 'notes']),
  entry_date: optionalDate,
  label: optionalText(200),
  notes: longText,
  source: enumOf(['manual', 'oura', 'apple_health']),
  unit: optionalText(50),
  value: optionalNumber,
})

export const projectSchema = z.strictObject({
  name: requiredText('Name', 300),
  pillar: z.enum(PILLARS_4),
  project_type: enumOf(['client', 'personal', 'work']),
  status: enumOf(['Planned', 'Active', 'On Hold', 'Done', 'Cancelled']),
  client_id: optionalId,
  description: longText,
  notes: longText,
  drive_folder_id: optionalText(200),
  start_date: optionalDate,
  end_date: optionalDate,
})

export const clientSchema = z.strictObject({
  name: requiredText('Name', 300),
  company: optionalText(300),
  status: enumOf(['Prospect', 'Active', 'Paused', 'Closed']),
  billing_type: z.enum(['hourly', 'flat', 'none']).optional(),
  contract_value: optionalNumber,
  hourly_rate: optionalNumber,
  currency: optionalText(10),
  contact_id: optionalId,
  drive_folder_id: optionalText(200),
  drive_folder_url: optionalUrl,
  memory_doc_file_id: optionalText(200),
  latest_update: longText,
  latest_update_at: optionalTimestamp,
  notes: longText,
  start_date: optionalDate,
  end_date: optionalDate,
  workspace_group: optionalText(100),
})

export const knowledgeSchema = z.strictObject({
  title: requiredText('Title', 500),
  content: longText,
  tags: optionalText(500),
  source_url: optionalUrl,
  project_id: optionalId,
})

export const invoiceSchema = z.strictObject({
  amount: z.preprocess(
    v => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v),
    z.number({ error: 'Amount must be a number' }).finite().min(-1e11).max(1e11)
  ),
  billing_period: z.preprocess(blankToNull, z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM').nullish()),
  client_id: optionalId,
  currency: optionalText(10),
  status: enumOf(['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled']),
  issued_date: optionalDate,
  due_date: optionalDate,
  paid_date: optionalDate,
  notes: longText,
  wave_invoice_id: optionalText(200),
  wave_synced_at: optionalTimestamp,
  wave_view_url: optionalUrl,
})

export const jobApplicationSchema = z.strictObject({
  company: requiredText('Company', 300),
  role: optionalText(300),
  status: enumOf(['Wishlist', 'Applied', 'Phone Screen', 'Interview', 'Offer', 'Accepted', 'Rejected']),
  date_applied: optionalDate,
  job_url: optionalUrl,
  location: optionalText(200),
  remote_type: enumOf(['Remote', 'Hybrid', 'Onsite']),
  salary_range: optionalText(100),
  salary_offer: optionalText(100),
  source: optionalText(100),
  next_action: optionalText(500),
  next_action_date: optionalDate,
  contact_id: optionalId,
  notes: longText,
})

export const crmSchema = z.strictObject({
  name: requiredText('Name', 300),
  company: optionalText(300),
  role: optionalText(300),
  email: optionalText(320),
  linkedin_url: optionalUrl,
  last_contact_date: optionalDate,
  interaction_log: longText,
  pillar: enumOf(PILLARS),
  tags: optionalText(500),
})

export const targetCompanySchema = z.strictObject({
  company_name: requiredText('Company', 300),
  industry: optionalText(200),
  website: optionalUrl,
  priority: enumOf(['High', 'Medium', 'Low']),
  notes: longText,
})

export const leadSchema = z.strictObject({
  name: requiredText('Name', 300),
  email: requiredText('Email', 320),
  message: longText,
  source: enumOf(['contact_form', 'booking']),
  status: enumOf(['New', 'Contacted', 'Qualified', 'Archived']),
})

export const deadlineSchema = z.strictObject({
  title: requiredText('Title', 500),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date'),
  status: z.enum(['needs_review', 'open', 'done', 'waived']),
  client_id: optionalId,
  project_id: optionalId,
  source_document_id: optionalId,
})

export const legalDocumentSchema = z.strictObject({
  title: requiredText('Title', 500),
  drive_file_id: requiredText('Drive file', 200),
  drive_file_url: optionalUrl,
  ingestion_source: z.enum(['drive_watch', 'manual', 'cowork']),
  extraction_status: z.enum(['pending', 'processing', 'done', 'failed']).optional(),
  client_id: optionalId,
  project_id: optionalId,
})

/** Tables the generic CRUD actions may write. Anything not listed is refused. */
export const TABLE_SCHEMAS = {
  tasks: taskSchema,
  finances: financeSchema,
  goals: goalSchema,
  objectives: objectiveSchema,
  notes: noteSchema,
  links: linkSchema,
  reading: readingSchema,
  health_entries: healthSchema,
  projects: projectSchema,
  clients: clientSchema,
  knowledge_items: knowledgeSchema,
  invoices: invoiceSchema,
  job_applications: jobApplicationSchema,
  crm: crmSchema,
  target_companies: targetCompanySchema,
  dextrous_leads: leadSchema,
  deadlines: deadlineSchema,
  legal_documents: legalDocumentSchema,
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
