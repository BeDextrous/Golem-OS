import { getNoteById } from '@/lib/queries'
import { NoteEditor } from '@/components/views/note-editor'
import { notFound } from 'next/navigation'

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const note = await getNoteById(Number(id))
  if (!note) notFound()
  return <NoteEditor note={note} />
}
