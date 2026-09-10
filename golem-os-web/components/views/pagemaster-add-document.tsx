'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Select } from '@/components/ui'
import { ItemDrawer } from '@/components/data/item-drawer'
import type { ClientRow, ProjectRow } from '@/types/entities'

export function PagemasterAddDocument({ clients, projects }: { clients: ClientRow[]; projects: ProjectRow[] }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [driveUrl, setDriveUrl] = useState('')
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')

  const extractFileId = (url: string): string | null => {
    const match = url.match(/[-\w]{25,}/)
    return match ? match[0] : null
  }

  const reset = () => {
    setTitle('')
    setDriveUrl('')
    setClientId('')
    setProjectId('')
  }

  const save = async () => {
    const fileId = extractFileId(driveUrl)
    if (!title.trim() || !fileId) {
      toast.error('Title and a valid Drive file link are required')
      return
    }
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
    setOpen(false)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        Add document
      </Button>
      <ItemDrawer open={open} onClose={() => setOpen(false)} title="Add Document" onSave={save}>
        <Input
          label="Title"
          placeholder="Document title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <Input
          label="Drive Link"
          placeholder="Google Drive file link"
          value={driveUrl}
          onChange={e => setDriveUrl(e.target.value)}
        />
        <Select
          label="Client"
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          placeholder="No client"
          options={clients.map(c => ({ value: String(c.id), label: c.name }))}
        />
        <Select
          label="Project"
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          placeholder="No project"
          options={projects.map(p => ({ value: String(p.id), label: p.name }))}
        />
      </ItemDrawer>
    </>
  )
}
