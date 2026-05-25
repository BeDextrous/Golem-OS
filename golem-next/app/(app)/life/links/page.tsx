import { getLinks } from '@/lib/queries'
import { LinksView } from '@/components/views/links-view'

export default async function LinksPage() {
  const items = await getLinks()
  return <LinksView initialItems={items} />
}
