import { createServerSupabaseClient } from '@/lib/supabase/server'
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

export async function getTasks(): Promise<TaskRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('tasks').select('*').order('created_at', { ascending: false })
  return data ?? []
}

export async function getGoals(): Promise<GoalRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('goals').select('*').order('created_at', { ascending: false })
  return data ?? []
}

export async function getObjectives(): Promise<ObjectiveRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('objectives').select('*').order('id', { ascending: true })
  return data ?? []
}

export async function getReading(): Promise<ReadingRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('reading').select('*').order('created_at', { ascending: false })
  return data ?? []
}

export async function getFinances(): Promise<FinanceRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('finances').select('*').order('entry_date', { ascending: false })
  return data ?? []
}

export async function getCRM(): Promise<CRMRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('crm').select('*').order('name', { ascending: true })
  return data ?? []
}

export async function getJobApps(): Promise<JobAppRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('job_applications').select('*').order('created_at', { ascending: false })
  return data ?? []
}

export async function getTargetCompanies(): Promise<TargetCoRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('target_companies').select('*').order('priority', { ascending: true })
  return data ?? []
}

export async function getNotes(): Promise<NoteRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('notes').select('*').order('updated_at', { ascending: false })
  return data ?? []
}

export async function getLinks(): Promise<LinkRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('links').select('*').order('created_at', { ascending: false })
  return data ?? []
}

export async function getProjects(): Promise<ProjectRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('projects').select('*').order('created_at', { ascending: false })
  return data ?? []
}

export async function getClients(): Promise<ClientRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('clients').select('*').order('name', { ascending: true })
  return data ?? []
}

export async function getKnowledge(): Promise<KnowledgeRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('knowledge_items').select('*').order('updated_at', { ascending: false })
  return data ?? []
}

// The Pagemaster worker (worker/extraction.py) writes extracted per-document
// knowledge into knowledge_memory, not knowledge_items (that table is the
// separate, manually-maintained Dextrous notes tab). This is the query that
// actually surfaces what the worker extracts.
export async function getKnowledgeMemory(): Promise<KnowledgeMemoryItem[]> {
  const sb = await createServerSupabaseClient()
  const [{ data: items }, { data: clients }, { data: docs }] = await Promise.all([
    sb
      .from('knowledge_memory')
      .select('id, content, client_id, legal_document_id, created_at')
      .order('created_at', { ascending: false }),
    sb.from('clients').select('id, name'),
    sb.from('legal_documents').select('id, title'),
  ])
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
  const { data } = await sb.from('finances').select('*')
    .or('pillar.eq.life,pillar.is.null')
    .order('entry_date', { ascending: false })
  return data ?? []
}

export async function getNoteById(id: number): Promise<NoteRow | null> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('notes').select('*').eq('id', id).single()
  return data ?? null
}

export async function getHealthEntries(): Promise<HealthRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('health_entries').select('*').order('entry_date', { ascending: false })
  return data ?? []
}

export async function getInvoices(): Promise<InvoiceRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('invoices').select('*').order('issued_date', { ascending: false })
  return data ?? []
}

export async function getLeads(): Promise<LeadRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('dextrous_leads').select('*').order('created_at', { ascending: false })
  return data ?? []
}

export async function getClientById(id: number): Promise<ClientRow | null> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('clients').select('*').eq('id', id).single()
  return data ?? null
}

export async function getProjectsByClient(clientId: number): Promise<ProjectRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('projects').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
  return data ?? []
}

export async function getTasksByProjectIds(projectIds: number[]): Promise<TaskRow[]> {
  if (projectIds.length === 0) return []
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('tasks').select('*').in('project_id', projectIds)
  return data ?? []
}

export async function getInvoicesByClient(clientId: number): Promise<InvoiceRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('invoices').select('*').eq('client_id', clientId).order('due_date', { ascending: true })
  return data ?? []
}

export async function getDeadlines(): Promise<DeadlineWithClient[]> {
  const sb = await createServerSupabaseClient()
  const [{ data }, { data: clients }] = await Promise.all([
    sb.from('deadlines').select('*').order('due_date', { ascending: true }),
    sb.from('clients').select('id, name'),
  ])
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
  const { data: clients } = await sb
    .from('clients')
    .select('*')
    .neq('billing_type', 'none')
    .order('name', { ascending: true })
  const clientList = clients ?? []
  if (clientList.length === 0) return []

  const period = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
  const clientIds = clientList.map(c => c.id)
  const { data: invoices } = await sb
    .from('invoices')
    .select('*')
    .eq('billing_period', period)
    .in('client_id', clientIds)
  const invoiceByClientId = new Map((invoices ?? []).map(i => [i.client_id, i]))

  return clientList.map(client => ({
    client,
    currentInvoice: invoiceByClientId.get(client.id) ?? null,
  }))
}
