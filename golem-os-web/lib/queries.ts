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

export async function getDeadlines(): Promise<DeadlineRow[]> {
  const sb = await createServerSupabaseClient()
  const { data } = await sb.from('deadlines').select('*').order('due_date', { ascending: true })
  return data ?? []
}
