'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Sun, Moon, Search } from 'lucide-react'
import { PILLARS } from '@/types/pillar'
import { createClient } from '@/lib/supabase/client'
import { GlobalSearch } from './global-search'
import { AccountMenu } from './account-menu'
import { MobileNav } from './mobile-nav'

export function GlobalNav({ email = null }: { email?: string | null }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted]       = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Avoid hydration mismatch on theme toggle
  useEffect(() => setMounted(true), [])

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(s => !s)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    // Drop anything the service worker cached for this session
    try {
      if ('caches' in window) await Promise.all((await caches.keys()).map(k => caches.delete(k)))
      sessionStorage.clear()
    } catch { /* non-critical */ }
    router.push('/login')
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-semibold text-stone-900 dark:text-stone-50 shrink-0"
            >
              Golem OS
            </Link>
            <nav aria-label="Primary" className="hidden sm:flex items-center gap-1">
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
              <Link
                href="/focus"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith('/focus')
                    ? 'bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                Focus
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 h-8 text-sm text-muted border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              <Search size={13} />
              <span>Search</span>
              <kbd className="text-xs bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </button>

            {/* Mobile search icon */}
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden w-10 h-10 flex items-center justify-center rounded-lg text-muted hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Search"
            >
              <Search size={16} />
            </button>

            {/* Dark mode toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="w-8 h-8 pointer-coarse:w-11 pointer-coarse:h-11 flex items-center justify-center rounded-lg text-muted hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                aria-label="Toggle theme"
              >
                {resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            )}

            <AccountMenu email={email} onSignOut={handleSignOut} />
          </div>
        </div>
      </header>

      <MobileNav />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
