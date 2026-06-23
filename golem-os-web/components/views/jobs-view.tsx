'use client'
import { useState, useEffect, useMemo } from 'react'
import { Plus, ExternalLink, Briefcase, User, Building2, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { StatusFilter, initStatuses, saveStatuses } from '@/components/data/status-filter'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { JobAppRow, CRMRow, TargetCoRow } from '@/types/entities'

// ─── Constants ───────────────────────────────────────────────────────────────

const APP_STATUSES = ['Wishlist', 'Applied', 'Phone Screen', 'Interview', 'Offer', 'Accepted', 'Rejected']
const APP_FILTER_KEY = 'golem:filter:job_applications'

const APP_STATUS_COLOR: Record<string, string> = {
  Wishlist:      '#6B6560',
  Applied:       '#DA6B51',
  'Phone Screen':'#7FA98A',
  Interview:     '#7FA98A',
  Offer:         '#5B5F8D',
  Accepted:      '#7FA98A',
  Rejected:      '#A8A39A',
}

type Tab = 'Applications' | 'Contacts' | 'Target Cos' | 'Resources'
type AppViewMode = 'tiles' | 'deck'

// ─── Job Application helpers ─────────────────────────────────────────────────

function parseJobUrl(raw: string): { role: string; company: string } {
  const out = { role: '', company: '' }
  try {
    const u = new URL(raw.trim())
    const host = u.hostname.toLowerCase()
    const path = u.pathname
    const titleCase = (slug: string) =>
      slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    if (host.includes('linkedin.com')) {
      const m = path.match(/\/jobs\/view\/([^/?#]+)/)
      if (m) {
        const slug = m[1].replace(/-\d+$/, '')
        const atIdx = slug.indexOf('-at-')
        if (atIdx > 0) {
          out.role = titleCase(slug.slice(0, atIdx))
          out.company = titleCase(slug.slice(atIdx + 4))
        } else {
          out.role = titleCase(slug)
        }
      }
    } else if (host.includes('lever.co') || host.includes('greenhouse.io') || host.includes('ashbyhq.com')) {
      const parts = path.split('/').filter(Boolean)
      if (parts[0]) out.company = titleCase(parts[0])
    } else if (host.includes('myworkdayjobs.com')) {
      out.company = titleCase(host.split('.')[0])
    }
  } catch { /* ignore */ }
  return out
}

// ─── Sub-forms ───────────────────────────────────────────────────────────────

type AppForm = Partial<Omit<JobAppRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
type CRMForm = Partial<Omit<CRMRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
type TargetForm = Partial<Omit<TargetCoRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

function AppForm({ form, upd, contacts }: {
  form: AppForm
  upd: (k: keyof AppForm, v: AppForm[keyof AppForm]) => void
  contacts: CRMRow[]
}) {
  const handleUrlChange = (url: string) => {
    upd('job_url', url)
    if (url.startsWith('http')) {
      const { role, company } = parseJobUrl(url)
      if (role && !form.role) upd('role', role)
      if (company && !form.company) upd('company', company)
    }
  }

  return (
    <>
      <Input label="Job URL" value={form.job_url ?? ''}
        onChange={e => handleUrlChange(e.target.value)} placeholder="https://..." />
      <Input label="Role" value={form.role ?? ''}
        onChange={e => upd('role', e.target.value)} placeholder="Senior Engineer" />
      <Input label="Company" value={form.company ?? ''}
        onChange={e => upd('company', e.target.value)} placeholder="Acme Corp" />
      <Select label="Status" value={form.status ?? ''}
        onChange={e => upd('status', e.target.value)}
        placeholder="— None —"
        options={APP_STATUSES.map(s => ({ value: s, label: s }))} />
      <Input label="Date Applied" type="date" value={form.date_applied ?? ''}
        onChange={e => upd('date_applied', e.target.value || null)} />
      <Input label="Salary Range" value={form.salary_range ?? ''}
        onChange={e => upd('salary_range', e.target.value)} placeholder="$120k–$150k" />
      <Input label="Location" value={form.location ?? ''}
        onChange={e => upd('location', e.target.value)} placeholder="City, ST" />
      <Select label="Remote Type" value={form.remote_type ?? ''}
        onChange={e => upd('remote_type', e.target.value)}
        placeholder="— None —"
        options={['Remote', 'Hybrid', 'Onsite'].map(s => ({ value: s, label: s }))} />
      <Input label="Source" value={form.source ?? ''}
        onChange={e => upd('source', e.target.value)} placeholder="LinkedIn, Referral…" />
      <Input label="Next Action" value={form.next_action ?? ''}
        onChange={e => upd('next_action', e.target.value)} placeholder="Follow up" />
      <Input label="Next Action Date" type="date" value={form.next_action_date ?? ''}
        onChange={e => upd('next_action_date', e.target.value || null)} />
      <Select label="Contact" value={form.contact_id ? String(form.contact_id) : ''}
        onChange={e => upd('contact_id', e.target.value ? Number(e.target.value) : null)}
        placeholder="— None —"
        options={contacts.map(c => ({ value: String(c.id), label: c.name }))} />
      <Textarea label="Notes" value={form.notes ?? ''}
        onChange={e => upd('notes', e.target.value)} rows={4} placeholder="Notes…" />
    </>
  )
}

function ContactForm({ form, upd }: {
  form: CRMForm
  upd: (k: keyof CRMForm, v: CRMForm[keyof CRMForm]) => void
}) {
  return (
    <>
      <Input label="Name" value={form.name ?? ''}
        onChange={e => upd('name', e.target.value)} placeholder="Full name" />
      <Input label="Role" value={form.role ?? ''}
        onChange={e => upd('role', e.target.value)} placeholder="Title" />
      <Input label="Company" value={form.company ?? ''}
        onChange={e => upd('company', e.target.value)} placeholder="Company" />
      <Input label="Email" type="email" value={form.email ?? ''}
        onChange={e => upd('email', e.target.value)} placeholder="email@company.com" />
      <Input label="LinkedIn" value={form.linkedin_url ?? ''}
        onChange={e => upd('linkedin_url', e.target.value)} placeholder="linkedin.com/in/..." />
      <Input label="Last Contact" type="date" value={form.last_contact_date ?? ''}
        onChange={e => upd('last_contact_date', e.target.value || null)} />
      <Input label="Tags" value={form.tags ?? ''}
        onChange={e => upd('tags', e.target.value)} placeholder="recruiter, hiring-manager…" />
      <Textarea label="Interaction Log" value={form.interaction_log ?? ''}
        onChange={e => upd('interaction_log', e.target.value)} rows={5} />
    </>
  )
}

function TargetForm({ form, upd }: {
  form: TargetForm
  upd: (k: keyof TargetForm, v: TargetForm[keyof TargetForm]) => void
}) {
  return (
    <>
      <Input label="Company" value={form.company_name ?? ''}
        onChange={e => upd('company_name', e.target.value)} placeholder="Company name" />
      <Input label="Industry" value={form.industry ?? ''}
        onChange={e => upd('industry', e.target.value)} placeholder="SaaS, FinTech…" />
      <Input label="Website" value={form.website ?? ''}
        onChange={e => upd('website', e.target.value)} placeholder="https://..." />
      <Select label="Priority" value={form.priority ?? ''}
        onChange={e => upd('priority', e.target.value)}
        placeholder="— None —"
        options={['High', 'Medium', 'Low'].map(p => ({ value: p, label: p }))} />
      <Textarea label="Notes" value={form.notes ?? ''}
        onChange={e => upd('notes', e.target.value)} rows={3} />
    </>
  )
}

// ─── Card components ─────────────────────────────────────────────────────────

function AppCard({ app, onClick }: { app: JobAppRow; onClick: () => void }) {
  const color = app.status ? (APP_STATUS_COLOR[app.status] ?? '#6B6560') : '#6B6560'
  return (
    <button
      onClick={onClick}
      className="text-left bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 hover:border-stone-300 dark:hover:border-stone-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Briefcase size={14} className="shrink-0 mt-0.5" style={{ color }} />
        {app.status && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
            style={{ backgroundColor: color + '22', color }}>
            {app.status}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-stone-900 dark:text-stone-100 line-clamp-1 leading-snug">
        {app.role || 'Role TBD'}
      </p>
      <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">{app.company}</p>
      {app.date_applied && (
        <p className="text-xs text-stone-400 mt-1">{app.date_applied}</p>
      )}
    </button>
  )
}

function AppDeckRow({ app, onClick, border }: { app: JobAppRow; onClick: () => void; border: boolean }) {
  const color = app.status ? (APP_STATUS_COLOR[app.status] ?? '#6B6560') : '#6B6560'
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors',
        border && 'border-t border-stone-100 dark:border-stone-800'
      )}
    >
      {app.status && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: color + '22', color }}>
          {app.status}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
          {app.role || 'Role TBD'}
        </p>
        <p className="text-xs text-stone-400 truncate">{app.company}</p>
      </div>
      {app.date_applied && (
        <span className="text-xs text-stone-400 tabular-nums shrink-0">{app.date_applied}</span>
      )}
      {app.notes && <FileText size={12} className="text-stone-300 shrink-0" />}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  initialApps: JobAppRow[]
  initialContacts: CRMRow[]
  initialTargets: TargetCoRow[]
}

export function JobsView({ initialApps, initialContacts, initialTargets }: Props) {
  const [apps, setApps] = useState(initialApps)
  const [contacts, setContacts] = useState(initialContacts)
  const [targets, setTargets] = useState(initialTargets)

  const [tab, setTab] = useState<Tab>('Applications')
  const [appView, setAppView] = useState<AppViewMode>('tiles')
  const [activeStatuses, setActiveStatuses] = useState<string[]>([])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerType, setDrawerType] = useState<'app' | 'contact' | 'target'>('app')
  const [editId, setEditId] = useState<number | null>(null)
  const [appForm, setAppForm] = useState<AppForm>({})
  const [crmForm, setCrmForm] = useState<CRMForm>({})
  const [targetForm, setTargetForm] = useState<TargetForm>({})

  useEffect(() => {
    setActiveStatuses(initStatuses(APP_FILTER_KEY, APP_STATUSES, ['Accepted', 'Rejected']))
  }, [])

  // Generic field updaters
  const updApp = <K extends keyof AppForm>(k: K, v: AppForm[K]) =>
    setAppForm(f => ({ ...f, [k]: v ?? null }))
  const updCrm = <K extends keyof CRMForm>(k: K, v: CRMForm[K]) =>
    setCrmForm(f => ({ ...f, [k]: v ?? null }))
  const updTarget = <K extends keyof TargetForm>(k: K, v: TargetForm[K]) =>
    setTargetForm(f => ({ ...f, [k]: v ?? null }))

  // ── Openers ──────────────────────────────────────────────────────────────
  const openNewApp = () => {
    setDrawerType('app'); setEditId(null)
    setAppForm({ status: 'Wishlist' }); setDrawerOpen(true)
  }
  const openEditApp = (app: JobAppRow) => {
    setDrawerType('app'); setEditId(app.id)
    setAppForm({
      company: app.company, role: app.role, status: app.status,
      date_applied: app.date_applied, job_url: app.job_url,
      salary_range: app.salary_range, location: app.location,
      remote_type: app.remote_type, source: app.source,
      next_action: app.next_action, next_action_date: app.next_action_date,
      notes: app.notes, contact_id: app.contact_id,
    })
    setDrawerOpen(true)
  }
  const openNewContact = () => {
    setDrawerType('contact'); setEditId(null)
    setCrmForm({}); setDrawerOpen(true)
  }
  const openEditContact = (c: CRMRow) => {
    setDrawerType('contact'); setEditId(c.id)
    setCrmForm({
      name: c.name, role: c.role, company: c.company, email: c.email,
      linkedin_url: c.linkedin_url, last_contact_date: c.last_contact_date,
      tags: c.tags, interaction_log: c.interaction_log,
    })
    setDrawerOpen(true)
  }
  const openNewTarget = () => {
    setDrawerType('target'); setEditId(null)
    setTargetForm({}); setDrawerOpen(true)
  }
  const openEditTarget = (t: TargetCoRow) => {
    setDrawerType('target'); setEditId(t.id)
    setTargetForm({
      company_name: t.company_name, industry: t.industry,
      website: t.website, priority: t.priority, notes: t.notes,
    })
    setDrawerOpen(true)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    if (drawerType === 'app') {
      if (!appForm.company?.trim()) { toast.error('Company is required'); return }
      if (editId) {
        const { error } = await sb.from('job_applications').update(appForm).eq('id', editId)
        if (error) throw error
        setApps(prev => prev.map(a => a.id === editId ? { ...a, ...appForm } : a))
        toast.success('Application updated')
      } else {
        const { data, error } = await sb.from('job_applications')
          .insert({ ...appForm, company: appForm.company!, user_id: user.id })
          .select().single()
        if (error) throw error
        if (data) setApps(prev => [data, ...prev])
        toast.success('Application added')
      }
    } else if (drawerType === 'contact') {
      if (!crmForm.name?.trim()) { toast.error('Name is required'); return }
      if (editId) {
        const { error } = await sb.from('crm').update(crmForm).eq('id', editId)
        if (error) throw error
        setContacts(prev => prev.map(c => c.id === editId ? { ...c, ...crmForm } : c))
        toast.success('Contact updated')
      } else {
        const { data, error } = await sb.from('crm')
          .insert({ ...crmForm, name: crmForm.name!, user_id: user.id })
          .select().single()
        if (error) throw error
        if (data) setContacts(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success('Contact added')
      }
    } else {
      if (!targetForm.company_name?.trim()) { toast.error('Company is required'); return }
      if (editId) {
        const { error } = await sb.from('target_companies').update(targetForm).eq('id', editId)
        if (error) throw error
        setTargets(prev => prev.map(t => t.id === editId ? { ...t, ...targetForm } : t))
        toast.success('Updated')
      } else {
        const { data, error } = await sb.from('target_companies')
          .insert({ ...targetForm, company_name: targetForm.company_name!, user_id: user.id })
          .select().single()
        if (error) throw error
        if (data) setTargets(prev => [...prev, data])
        toast.success('Added')
      }
    }
    setDrawerOpen(false)
  }

  const handleDelete = async () => {
    if (!editId) return
    const sb = createClient()
    if (drawerType === 'app') {
      const { error } = await sb.from('job_applications').delete().eq('id', editId)
      if (error) throw error
      setApps(prev => prev.filter(a => a.id !== editId))
    } else if (drawerType === 'contact') {
      const { error } = await sb.from('crm').delete().eq('id', editId)
      if (error) throw error
      setContacts(prev => prev.filter(c => c.id !== editId))
    } else {
      const { error } = await sb.from('target_companies').delete().eq('id', editId)
      if (error) throw error
      setTargets(prev => prev.filter(t => t.id !== editId))
    }
    setDrawerOpen(false)
    toast.success('Deleted')
  }

  // ── Filtered apps ─────────────────────────────────────────────────────────
  const filteredApps = useMemo(() =>
    apps.filter(a => !a.status || activeStatuses.includes(a.status)),
    [apps, activeStatuses]
  )

  const activeAppCount = apps.filter(a => !['Accepted', 'Rejected'].includes(a.status ?? '')).length

  // ── Tab content ───────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'Applications', label: 'Applications', count: activeAppCount },
    { key: 'Contacts',     label: 'Contacts',     count: contacts.length },
    { key: 'Target Cos',   label: 'Target Cos',   count: targets.length },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Tab bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors',
              tab === t.key
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 text-xs opacity-60">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Applications tab */}
      {tab === 'Applications' && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <StatusFilter
              statuses={APP_STATUSES}
              active={activeStatuses}
              onChange={(next) => { setActiveStatuses(next); saveStatuses(APP_FILTER_KEY, next) }}
              colorMap={APP_STATUS_COLOR}
            />
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex gap-1">
                {(['tiles', 'deck'] as AppViewMode[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setAppView(v)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                      appView === v
                        ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100'
                        : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-400'
                    )}
                  >
                    {v === 'tiles' ? 'Tiles' : 'List'}
                  </button>
                ))}
              </div>
              <Button onClick={openNewApp} size="sm">
                <Plus size={14} /> Add
              </Button>
            </div>
          </div>

          {filteredApps.length === 0 && (
            <div className="text-center py-16 text-stone-400 dark:text-stone-500">
              <p className="text-sm">No applications match the current filter.</p>
            </div>
          )}

          {appView === 'tiles' && (
            <div className="space-y-5">
              {APP_STATUSES.filter(s => activeStatuses.includes(s)).map(status => {
                const statusApps = filteredApps.filter(a =>
                  (a.status ?? '').toLowerCase() === status.toLowerCase()
                )
                if (!statusApps.length) return null
                return (
                  <section key={status}>
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">{status}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {statusApps.map(app => (
                        <AppCard key={app.id} app={app} onClick={() => openEditApp(app)} />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}

          {appView === 'deck' && (
            <div className="space-y-4">
              {APP_STATUSES.filter(s => activeStatuses.includes(s)).map(status => {
                const statusApps = filteredApps.filter(a =>
                  (a.status ?? '').toLowerCase() === status.toLowerCase()
                )
                if (!statusApps.length) return null
                return (
                  <section key={status}>
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">{status}</p>
                    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
                      {statusApps.map((app, i) => (
                        <AppDeckRow key={app.id} app={app} onClick={() => openEditApp(app)} border={i > 0} />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Contacts tab */}
      {tab === 'Contacts' && (
        <>
          <div className="flex justify-end">
            <Button onClick={openNewContact} size="sm">
              <Plus size={14} /> Add Contact
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {contacts.map(c => (
              <button
                key={c.id}
                onClick={() => openEditContact(c)}
                className="text-left bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 hover:border-stone-300 dark:hover:border-stone-700 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <User size={14} className="text-stone-400 shrink-0" />
                </div>
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{c.name}</p>
                {(c.role || c.company) && (
                  <p className="text-xs text-stone-500 mt-0.5 truncate">
                    {[c.role, c.company].filter(Boolean).join(' · ')}
                  </p>
                )}
                {c.last_contact_date && (
                  <p className="text-xs text-stone-400 mt-1">Last: {c.last_contact_date}</p>
                )}
              </button>
            ))}
          </div>
          {contacts.length === 0 && (
            <div className="text-center py-16 text-stone-400">
              <p className="text-sm">No contacts yet.</p>
            </div>
          )}
        </>
      )}

      {/* Target Companies tab */}
      {tab === 'Target Cos' && (
        <>
          <div className="flex justify-end">
            <Button onClick={openNewTarget} size="sm">
              <Plus size={14} /> Add Company
            </Button>
          </div>
          {['High', 'Medium', 'Low', undefined].map(priority => {
            const group = priority
              ? targets.filter(t => t.priority === priority)
              : targets.filter(t => !t.priority)
            if (!group.length) return null
            return (
              <section key={priority ?? 'none'}>
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">
                  {priority ? `${priority} Priority` : 'Other'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.map(t => (
                    <button
                      key={t.id}
                      onClick={() => openEditTarget(t)}
                      className="text-left bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 hover:border-stone-300 dark:hover:border-stone-700 transition-colors"
                    >
                      <Building2 size={14} className="text-stone-400 mb-2" />
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{t.company_name}</p>
                      {t.industry && <p className="text-xs text-stone-400 mt-0.5">{t.industry}</p>}
                      {t.website && (
                        <a
                          href={t.website} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 mt-1"
                        >
                          <ExternalLink size={10} /> Website
                        </a>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
          {targets.length === 0 && (
            <div className="text-center py-16 text-stone-400">
              <p className="text-sm">No target companies yet.</p>
            </div>
          )}
        </>
      )}

      {/* Item Drawer */}
      <ItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          drawerType === 'app'
            ? editId ? 'Edit Application' : 'New Application'
            : drawerType === 'contact'
            ? editId ? 'Edit Contact' : 'New Contact'
            : editId ? 'Edit Company' : 'New Company'
        }
        onSave={handleSave}
        onDelete={editId ? handleDelete : undefined}
      >
        {drawerType === 'app' && (
          <AppForm form={appForm} upd={updApp} contacts={contacts} />
        )}
        {drawerType === 'contact' && (
          <ContactForm form={crmForm} upd={updCrm} />
        )}
        {drawerType === 'target' && (
          <TargetForm form={targetForm} upd={updTarget} />
        )}
      </ItemDrawer>
    </div>
  )
}
