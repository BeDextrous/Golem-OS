import { getReading } from '@/lib/queries'
import { ReadingView } from '@/components/views/reading-view'

export default async function ReadingPage() {
  const items = await getReading()
  return <ReadingView initialItems={items} />
}
