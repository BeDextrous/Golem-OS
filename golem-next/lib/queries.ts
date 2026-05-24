import { createServerSupabaseClient } from '@/lib/supabase/server'
import type {
  TaskRow, GoalRow, ObjectiveRow,
  ReadingRow, FinanceRow, CRMRow,
  JobAppRow, TargetCoRow,
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
