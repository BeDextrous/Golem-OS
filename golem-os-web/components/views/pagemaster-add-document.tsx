'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select } from '@/components/ui'
import type { ClientRow, ProjectRow } from '@/types/entities'

export function PagemasterAddDocument({ clients, projects }: { clients: ClientRow[]; projects: ProjectRow[] }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [driveUrl, setDriveUrl] = useState('')
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [saving, setSaving] = useState(false)

  const extractFileId = (url: string): string | null => {
    const match = url.match(/[-\w]{25,}/)
    return match ? match[0] : null
  }

  const reset = () => {
    setTitle('')
    setDriveUrl('')
    setClientId('')
    setProjectId('')
    setOpen(false)
  }

  const save = async () => {
    const fileId = extractFileId(driveUrl)
    if (!title.trim() || !fileId) {
      toast.error('Title and a valid Drive file link are required')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('legal_documents').insert({
        user_id: user.id,
        client_id: clientId ? Number(clientId) : null,
        project_id: projectId ? Number(projectId) : null,
        drive_file_id: fileId,
        drive_file_url: driveUrl,
        title: title.trim(),
        // extraction_status defaults to 'pending' at the DB level — no need to set it here
        ingestion_source: 'manual',
      })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Document queued for extraction')
      reset()
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        Add document
      </Button>
    )
  }

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 space-y-3">
      <Input placeholder="Document title" value={title} onChange={e => setTitle(e.target.value)} />
      <Input placeholder="Google Drive file link" value={driveUrl} onChange={e => setDriveUrl(e.target.value)} />
      <Select value={clientId} onChange={e => setClientId(e.target.value)}>
        <option value="">No client</option>
        {clients.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>
      <Select value={projectId} onChange={e => setProjectId(e.target.value)}>
        <option value="">No project</option>
        {projects.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button onClick={reset} size="sm" className="bg-stone-200 text-stone-700 hover:bg-stone-300">
          Cancel
        </Button>
      </div>
    </div>
  )
}
