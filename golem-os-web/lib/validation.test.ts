import { describe, expect, it } from 'vitest'
import { TABLE_SCHEMAS, financeSchema, firstIssue, isCrudTable, taskSchema, type CrudTable } from './validation'

describe('taskSchema', () => {
  it('accepts a normal task and trims the name', () => {
    const r = taskSchema.safeParse({ name: '  Call Assaf ', status: 'Active', priority: 'High', pillar: 'palette', due_date: '2026-10-14' })
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

// One realistic payload per table, shaped like what the forms send
const VALID: Record<CrudTable, Record<string, unknown>> = {
  tasks: { name: 'Task', status: 'To Do', priority: 'High', pillar: 'palette', due_date: '2026-10-14', project_id: 3 },
  finances: { label: 'Rent', amount: -2000, entry_date: '2026-10-01', category: 'Housing', pillar: 'life' },
  goals: { title: 'Ship Pagemaster', status: 'Active', pillar: 'dextrous', area: 'Product', notes: 'x' },
  objectives: { title: 'Beta', goal_id: 2, current_value: '3', target_value: 10, metric_unit: 'clients', deadline: '2026-12-31' },
  notes: { title: 'Idea', content: 'text', tags: 'a,b', pillar: 'life', updated_at: '2026-10-12T14:00:00.000Z' },
  links: { url: 'https://example.com/a?b=1', title: 'A', website: 'example.com', pillar: 'life', read_at: '2026-10-12T14:00:00.123+00:00' },
  reading: { book_title: 'Dune', author: 'Herbert', status: 'Reading', progress_pct: '42' },
  health_entries: { category: 'sleep', entry_date: '2026-10-12', value: 7.5, unit: 'h', source: 'manual' },
  projects: { name: 'Palette redline', pillar: 'pagemaster', project_type: 'client', status: 'Active', client_id: 4 },
  clients: { name: 'Acme', billing_type: 'flat', contract_value: 5000, status: 'Active', drive_folder_url: 'https://drive.google.com/drive/folders/abc' },
  knowledge_items: { title: 'Clause bank', tags: 'nda', source_url: 'https://example.com', project_id: 1 },
  invoices: { amount: 1200, status: 'Draft', billing_period: '2026-10', client_id: 4, due_date: '2026-11-01' },
  job_applications: { company: 'Acme', role: 'GC', status: 'Applied', remote_type: 'Hybrid', job_url: 'https://jobs.example.com/1' },
  crm: { name: 'Pat', email: 'pat@example.com', linkedin_url: 'https://linkedin.com/in/pat', pillar: 'palette' },
  target_companies: { company_name: 'Acme', priority: 'High', website: 'https://acme.com' },
  dextrous_leads: { name: 'Lee', email: 'lee@example.com', status: 'New' },
  deadlines: { title: 'File answer', due_date: '2026-11-03', status: 'needs_review' },
  legal_documents: { title: 'NDA', drive_file_id: 'abc123', ingestion_source: 'manual', client_id: 4 },
}

describe('every registered table', () => {
  it.each(Object.keys(TABLE_SCHEMAS) as CrudTable[])('%s accepts a realistic payload and rejects user_id', table => {
    const schema = TABLE_SCHEMAS[table]
    const r = schema.safeParse(VALID[table])
    if (!r.success) throw new Error(firstIssue(r.error))
    expect(schema.safeParse({ ...VALID[table], user_id: 'someone-else' }).success).toBe(false)
  })

  it.each(Object.keys(TABLE_SCHEMAS) as CrudTable[])('%s accepts a partial update', table => {
    const first = Object.keys(VALID[table])[0]
    expect(TABLE_SCHEMAS[table].partial().safeParse({ [first]: VALID[table][first] }).success).toBe(true)
  })
})

describe('new-table specifics', () => {
  it('links refuse non-http(s) schemes (no javascript: hrefs)', () => {
    expect(TABLE_SCHEMAS.links.safeParse({ url: 'javascript:alert(1)' }).success).toBe(false)
    expect(TABLE_SCHEMAS.links.safeParse({ url: 'ftp://x.com' }).success).toBe(false)
    expect(TABLE_SCHEMAS.links.safeParse({ url: '' }).success).toBe(false)
  })
  it('other URL fields refuse dangerous schemes too', () => {
    expect(TABLE_SCHEMAS.job_applications.safeParse({ company: 'x', job_url: 'javascript:1' }).success).toBe(false)
    expect(TABLE_SCHEMAS.clients.safeParse({ name: 'x', drive_folder_url: 'data:text/html,1' }).success).toBe(false)
    expect(TABLE_SCHEMAS.crm.safeParse({ name: 'x', linkedin_url: 'vbscript:x' }).success).toBe(false)
  })
  it('scheme-less hosts get https://, other free text is left alone', () => {
    const li = TABLE_SCHEMAS.crm.safeParse({ name: 'x', linkedin_url: 'linkedin.com/in/pat' })
    expect(li.success && li.data.linkedin_url).toBe('https://linkedin.com/in/pat')
    const link = TABLE_SCHEMAS.links.safeParse({ url: 'example.com' })
    expect(link.success && link.data.url).toBe('https://example.com')
    const bareId = TABLE_SCHEMAS.clients.safeParse({ name: 'x', drive_folder_url: '1AbC_dEf-12345' })
    expect(bareId.success && bareId.data.drive_folder_url).toBe('1AbC_dEf-12345')
    const ok = TABLE_SCHEMAS.links.safeParse({ url: 'HTTP://Example.com/a' })
    expect(ok.success).toBe(true)
  })
  it('reading progress is 0-100 and numeric strings are coerced', () => {
    expect(TABLE_SCHEMAS.reading.safeParse({ book_title: 'x', progress_pct: 101 }).success).toBe(false)
    expect(TABLE_SCHEMAS.reading.safeParse({ book_title: 'x', progress_pct: '50' }).success).toBe(true)
  })
  it('Palette Media replaces Work: palette is valid, work is no longer writable', () => {
    expect(TABLE_SCHEMAS.tasks.safeParse({ name: 'x', pillar: 'palette' }).success).toBe(true)
    expect(TABLE_SCHEMAS.goals.safeParse({ title: 'x', pillar: 'palette' }).success).toBe(true)
    expect(TABLE_SCHEMAS.projects.safeParse({ name: 'x', pillar: 'palette' }).success).toBe(true)
    expect(TABLE_SCHEMAS.tasks.safeParse({ name: 'x', pillar: 'work' }).success).toBe(false)
    expect(TABLE_SCHEMAS.projects.safeParse({ name: 'x', pillar: 'work' }).success).toBe(false)
  })
  it('archived_at can be set or cleared on archivable tables', () => {
    expect(TABLE_SCHEMAS.tasks.partial().safeParse({ archived_at: '2026-10-16T12:00:00.000Z' }).success).toBe(true)
    expect(TABLE_SCHEMAS.clients.partial().safeParse({ archived_at: null }).success).toBe(true)
    expect(TABLE_SCHEMAS.notes.safeParse({ archived_at: '2026-10-16T12:00:00.000Z' }).success).toBe(false) // notes are not archivable
  })
  it('project pillar allows pagemaster, task pillar does not', () => {
    expect(TABLE_SCHEMAS.projects.safeParse({ name: 'x', pillar: 'pagemaster' }).success).toBe(true)
    expect(TABLE_SCHEMAS.tasks.safeParse({ name: 'x', pillar: 'pagemaster' }).success).toBe(false)
  })
  it('client billing_type is optional on create but must be valid when given', () => {
    expect(TABLE_SCHEMAS.clients.safeParse({ name: 'x' }).success).toBe(true)
    expect(TABLE_SCHEMAS.clients.safeParse({ name: 'x', billing_type: 'weekly' }).success).toBe(false)
  })
  it('deadline status covers needs_review/open/done/waived only', () => {
    for (const s of ['needs_review', 'open', 'done', 'waived']) expect(TABLE_SCHEMAS.deadlines.partial().safeParse({ status: s }).success).toBe(true)
    expect(TABLE_SCHEMAS.deadlines.partial().safeParse({ status: 'dismissed' }).success).toBe(false)
  })
  it('invoice billing_period must be YYYY-MM', () => {
    expect(TABLE_SCHEMAS.invoices.safeParse({ amount: 1, billing_period: '2026-10-01' }).success).toBe(false)
  })
})
