import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PILLARS } from '@/types/pillar'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{greeting}</h1>
        <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">{user?.email}</p>
      </div>

      {/* Pillar cards — full widgets coming in Week 4 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.values(PILLARS).map((pillar) => (
          <a
            key={pillar.id}
            href={pillar.routes.root}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 hover:border-stone-300 dark:hover:border-stone-700 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: pillar.color }} />
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-stone-100 transition-colors">
                {pillar.label}
              </span>
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-500">Dashboard coming in Week 4</p>
          </a>
        ))}
      </div>
    </div>
  )
}
