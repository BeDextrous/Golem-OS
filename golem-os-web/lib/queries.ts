import { createServerSupabaseClient } from '@/lib/supabase/server'
import { thisMonthStr } from '@/lib/utils'
import type {
  TaskRow, GoalRow, ObjectiveRow,
  ReadingRow, FinanceRow, CRMRow,
  JobAppRow, TargetCoRow,
  NoteRow, LinkRow,
  ProjectRow, ClientRow, KnowledgeRow,
  HealthRow, InvoiceRow, LeadRow,
  DeadlineRow,
} from '@/types/entities'

export type DeadlineWithClient = DeadlineRow & { client_name: string | null }

export type KnowledgeMemoryItem = {
  id: number
  content: string
  client_id: number | null
  legal_document_id: number | null
  created_at: string
  client_name: string | null
  document_title: string | null
}

export async function getTasks(opts: { pillar?: string; openOnly?: boolean; dueBy?: string } = {}): Promise<TaskRow[]> {
  const sb = await createServerSupabaseClient()
  let query = sb.from('tasks').select('*').is('archived_at', null)
  if (opts.pillar) query = query.eq('pillar', opts.pillar)
  // Not Done, but keep rows with no status (matches the old client-side `status !== 'Done'`)
  if (opts.openOnly || opts.dueBy) query = query.or('status.is.null,status.neq.Done')
  if (opts.dueBy) query = query.lte('due_date', opts.dueBy).order('due_date', { ascending: true })
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getGoals(opts: { pillar?: string } = {}): Promise<GoalRow[]> {
  const sb = await createServerSupabaseClient()
  let query = sb.from('goals').select('*').is('archived_at', null)
  if (opts.pillar) query = query.eq('pillar', opts.pillar)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getObjectives(opts: { pillar?: string } = {}): Promise<ObjectiveRow[]> {
  const sb = await createServerSupabaseClient()
  let query = sb.from('objectives').select('*').is('archived_at', null)
  if (opts.pillar) query = query.eq('pillar', opts.pillar)
  const { data, error } = await query.order('id', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getReading(opts: { status?: string } = {}): Promise<ReadingRow[]> {
  const sb = await createServerSupabaseClient()
  let query = sb.from('reading').select('*')
  if (opts.status) query = query.eq('status', opts.status)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** First day of the month after `ym` ('YYYY-MM'), for half-open month ranges that work in every month. */
function nextMonthStart(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
}

export async function getFinances(opts: { month?: string } = {}): Promise<FinanceRow[]> {
  const sb = await createServerSupabaseClient()
  let query = sb.from('finances').select('*')
  if (opts.month) query = query.gte('entry_date', `${opts.month}-01`).lt('entry_date', nextMonthStart(opts.month))
  const { data, error } = await query.order('entry_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getCRM(): Promise<CRMRow[]> {
  const sb = await createServerSupabaseClient()
  const { data, error } = await sb.from('crm').select('*').order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getJobApps(): Promise<JobAppRow[]> {
  const sb = await createServerSupabaseClient()
  const { data, error } = await sb.from('job_applications').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getTargetCompanies(): Promise<TargetCoRow[]> {
  const sb = await createServerSupabaseClient()
  const { data, error } = await sb.from('target_companies').select('*').order('priority', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Most recent notes plus the total count, without loading every note. */
export async function getRecentNotes(limit: number): Promise<{ notes: NoteRow[]; total: number }> {
  const sb = await createServerSupabaseClient()
  const { data, error, count } = await sb
    .from('notes')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return { notes: data ?? [], total: count ?? 0 }
}

export async function getNotes(): Promise<NoteRow[]> {
  const sb = await createServerSupabaseClient()
  const { data, error } = await sb.from('notes').select('*').order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getLinks(): Promise<LinkRow[]> {
  const sb = await createServerSupabaseClient()
  const { data, error } = await sb.from('links').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getProjects(opts: { pillar?: string } = {}): Promise<ProjectRow[]> {
  const sb = await createServerSupabaseClient()
  let query = sb.from('projects').select('*')
  if (opts.pillar) query = query.eq('pillar', opts.pillar)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getClients(opts: { status?: string } = {}): Promise<ClientRow[]> {
  const sb = await createServerSupabaseClient()
  let query = sb.from('clients').select('*').is('archived_at', null)
  if (opts.status) query = query.eq('status', opts.status)
  const { data, error } = await query.order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getKnowledge(): Promise<KnowledgeRow[]> {
  const sb = await createServerSupabaseClient()
  const { data, error } = await sb.from('knowledge_items').select('*').order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// The Pagemaster worker (worker/extraction.py) writes extracted per-document
// knowledge into knowledge_memory, not knowledge_items (that table is the
// separate, manually-maintained Dextrous notes tab). This is the query that
// actually surfaces what the worker extracts.
export async function getKnowledgeMemory(): Promise<KnowledgeMemoryItem[]> {
  const sb = await createServerSupabaseClient()
  const [{ data: items, error: e1 }, { data: clients, error: e2 }, { data: docs, error: e3 }] = await Promise.all([
    sb
      .from('knowledge_memory')
      .select('id, content, client_id, legal_document_id, created_at')
      .order('created_at', { ascending: false }),
    sb.from('clients').select('id, name'),
    sb.from('legal_documents').select('id, title'),
  ])
  if (e1 || e2 || e3) throw (e1 ?? e2 ?? e3)
  const clientNameById = new Map((clients ?? []).map(c => [c.id, c.name]))
  const titleById = new Map((docs ?? []).map(d => [d.id, d.title]))

  return (items ?? []).map(item => ({
    ...item,
    client_name: item.client_id != null ? clientNameById.get(item.client_id) ?? null : null,
    document_title: item.legal_document_id != null ? titleById.get(item.legal_document_id) ?? null : null,
  }))
}

export async function getLifeFinances(): Promise<FinanceRow[]> {
  const sb = await createServerSupabaseClient()
  const { data, error } = await sb.from('finances').select('*')
    .or('pillar.eq.life,pillar.is.null')
    .order('entry_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getNoteById(id: number): Promise<NoteRow | null> {
  const sb = await createServerSupabaseClient()
  const { data, error } = await sb.from('notes').select('*').eq('id', id).single()
  if (error && error.code !== 'PGRST116') throw error
  return data ?? null
}

export async function getHealthEntries(): Promise<HealthRow[]> {
  const sb = await createServerSupabaseClient()
  const { data, error } = await sb.from('health_entries').select('*').order('entry_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getInvoices(): Promise<InvoiceRow[]> {
  const sb = await createServerSupabaseClient()
  const { data, error } = await sb.from('invoices').select('*').is('archived_at', null).order('issued_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getLeads(): Promise<LeadRow[]> {
  const sb = await createServerSupabaseClient()
  const { data, error } = await sb.from('dextrous_leads').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getClientById(id: number): Promise<ClientRow | null> {
  const sb = await createServerSupabaseClient()
  const { data, error } = await sb.from('clients').select('*').eq('id', id).single()
  if (error && error.code !== 'PGRST116') throw error
  return data ?? null
}

export async function getProjectsByClient(clientId: number): Promise<ProjectRow[]> {
  const sb = await createServerSupabaseClient()
  const { data, error } = await sb.from('projects').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getTasksByProjectIds(projectIds: number[]): Promise<TaskRow[]> {
  if (projectIds.length === 0) return []
  const sb = await createServerSupabaseClient()
  const { data, error } = await sb.from('tasks').select('*').is('archived_at', null).in('project_id', projectIds)
  if (error) throw error
  return data ?? []
}

export async function getInvoicesByClient(clientId: number): Promise<InvoiceRow[]> {
  const sb = await createServerSupabaseClient()
  const { data, error } = await sb.from('invoices').select('*').is('archived_at', null).eq('client_id', clientId).order('due_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getDeadlines(): Promise<DeadlineWithClient[]> {
  const sb = await createServerSupabaseClient()
  const [{ data, error: e1 }, { data: clients, error: e2 }] = await Promise.all([
    sb.from('deadlines').select('*').order('due_date', { ascending: true }),
    sb.from('clients').select('id, name'),
  ])
  if (e1 || e2) throw (e1 ?? e2)
  const clientNameById = new Map((clients ?? []).map(c => [c.id, c.name]))
  return (data ?? []).map(d => ({
    ...d,
    client_name: d.client_id != null ? clientNameById.get(d.client_id) ?? null : null,
  }))
}

export async function getClientsWithBilling(): Promise<
  { client: ClientRow; currentInvoice: InvoiceRow | null }[]
> {
  const sb = await createServerSupabaseClient()
  const { data: clients, error: clientsError } = await sb
    .from('clients')
    .select('*')
    .is('archived_at', null)
    .neq('billing_type', 'none')
    .order('name', { ascending: true })
  if (clientsError) throw clientsError
  const clientList = clients ?? []
  if (clientList.length === 0) return []

  const period = thisMonthStr() // 'YYYY-MM'
  const clientIds = clientList.map(c => c.id)
  const { data: invoices, error: invoicesError } = await sb
    .from('invoices')
    .select('*')
    .is('archived_at', null)
    .eq('billing_period', period)
    .in('client_id', clientIds)
  if (invoicesError) throw invoicesError
  const invoiceByClientId = new Map((invoices ?? []).map(i => [i.client_id, i]))

  return clientList.map(client => ({
    client,
    currentInvoice: invoiceByClientId.get(client.id) ?? null,
  }))
}
