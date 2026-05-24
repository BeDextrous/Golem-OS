export type Pillar = 'life' | 'dextrous' | 'work'
export type TaskStatus = 'To Do' | 'Active' | 'On Hold' | 'Done'
export type Priority = 'High' | 'Medium' | 'Low'

export type Task = {
  id: number
  user_id: string
  name: string
  status: TaskStatus
  priority: Priority | null
  due_date: string | null
  pillar: Pillar | null
  area: string | null
  objective_id: number | null
  client_id: number | null
  project_id: number | null
  created_at: string
  updated_at: string
}

export type Goal = {
  id: number
  user_id: string
  title: string
  area: string | null
  status: 'Active' | 'Paused' | 'Done'
  pillar: Pillar | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Project = {
  id: number
  user_id: string
  name: string
  pillar: Pillar
  project_type: 'client' | 'personal' | 'work'
  client_id: number | null
  status: 'Planned' | 'Active' | 'On Hold' | 'Done' | 'Cancelled'
  start_date: string | null
  end_date: string | null
  description: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Client = {
  id: number
  user_id: string
  name: string
  company: string | null
  status: 'Prospect' | 'Active' | 'Paused' | 'Closed'
  contract_value: number | null
  currency: string
  start_date: string | null
  end_date: string | null
  notes: string | null
  contact_id: number | null
  created_at: string
  updated_at: string
}

export type Invoice = {
  id: number
  user_id: string
  client_id: number | null
  amount: number
  currency: string
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled'
  issued_date: string
  due_date: string | null
  paid_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type HealthEntry = {
  id: number
  user_id: string
  entry_date: string
  category: 'sleep' | 'exercise' | 'nutrition' | 'weight' | 'mood' | 'notes'
  value: number | null
  unit: string | null
  label: string | null
  notes: string | null
  source: 'manual' | 'oura' | 'apple_health'
  created_at: string
  updated_at: string
}

export type KnowledgeItem = {
  id: number
  user_id: string
  title: string
  content: string | null
  tags: string | null
  source_url: string | null
  project_id: number | null
  created_at: string
  updated_at: string
}

export type Note = {
  id: number
  user_id: string
  title: string | null
  content: string | null
  tags: string | null
  pillar: Pillar | null
  parent_goal_id: number | null
  parent_objective_id: number | null
  parent_task_id: number | null
  drafts_uuid: string | null
  created_at: string
  updated_at: string
}

export type CRMContact = {
  id: number
  user_id: string
  name: string
  role: string | null
  company: string | null
  email: string | null
  linkedin_url: string | null
  last_contact_date: string | null
  tags: string | null
  pillar: Pillar | null
  interaction_log: string | null
  created_at: string
  updated_at: string
}
