import { getLinks, getNotes, getTasks } from '@/lib/queries'
import { LinksView } from '@/components/views/links-view'

export default async function LinksPage() {
  const [items, notes, tasks] = await Promise.all([getLinks(), getNotes(), getTasks()])
  return <LinksView initialItems={items} initialNotes={notes} initialTasks={tasks} />
}
