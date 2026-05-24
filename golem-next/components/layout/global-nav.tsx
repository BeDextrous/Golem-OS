'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { PILLARS } from '@/types/pillar'
import { createClient } from '@/lib/supabase/client'

export function GlobalNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-semibold text-stone-900 dark:text-stone-50 shrink-0"
          >
            Golem OS
          </Link>
          <nav className="flex items-center gap-1">
            {Object.values(PILLARS).map((pillar) => {
              const isActive = pathname.startsWith(pillar.routes.root)
              return (
                <Link
                  key={pillar.id}
                  href={pillar.routes.root}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? pillar.activePill
                      : `text-stone-600 dark:text-stone-400 ${pillar.hoverPill}`
                  }`}
                >
                  {pillar.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="hidden sm:flex items-center gap-2 px-3 h-8 text-sm text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            onClick={() => { /* ⌘K — Phase 4 */ }}
          >
            <span>Search</span>
            <kbd className="text-xs bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>
          <button
            onClick={handleSignOut}
            className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center justify-center hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
            title="Sign out"
          >
            M
          </button>
        </div>
      </div>
    </header>
  )
}
