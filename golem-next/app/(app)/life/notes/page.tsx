import { getNotes } from '@/lib/queries'
import { NotesView } from '@/components/views/notes-view'

export default async function NotesPage() {
  const items = await getNotes()
  return <NotesView initialItems={items} />
}
