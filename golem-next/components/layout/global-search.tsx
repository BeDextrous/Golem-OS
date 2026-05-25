'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Result = {
  type: string
  title: string
  subtitle?: string
  href: string
}

const TYPE_COLOR: Record<string, string> = {
  Task:      '#D85A30',
  Goal:      '#D85A30',
  Note:      '#639922',
  Reading:   '#639922',
  Link:      '#378ADD',
  Job:       '#378ADD',
  Knowledge: '#378ADD',
  Finance:   '#8B5CF6',
}

export function GlobalSearch({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelected(0)
      // tiny delay so the element is mounted before focusing
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const sb  = createClient()
    const pat = `%${q}%`

    const [tasks, notes, reading, goals, links, jobs, knowledge, finances] = await Promise.all([
      sb.from('tasks').select('id,name,status,area').ilike('name', pat).limit(4),
      sb.from('notes').select('id,title,pillar').or(`title.ilike.${pat},content.ilike.${pat}`).limit(4),
      sb.from('reading').select('id,book_title,author,status').ilike('book_title', pat).limit(3),
      sb.from('goals').select('id,title,status').ilike('title', pat).limit(3),
      sb.from('links').select('id,title,url,website').or(`title.ilike.${pat},url.ilike.${pat}`).limit(3),
      sb.from('job_applications').select('id,role,company,status').or(`role.ilike.${pat},company.ilike.${pat}`).limit(3),
      sb.from('knowledge_items').select('id,title,tags').or(`title.ilike.${pat},content.ilike.${pat}`).limit(3),
      sb.from('finances').select('id,label,amount,category').ilike('label', pat).limit(3),
    ])

    const out: Result[] = []

    tasks.data?.forEach(t => out.push({
      type: 'Task', title: t.name,
      subtitle: [t.status, t.area].filter(Boolean).join(' · '),
      href: '/work/tasks',
    }))
    notes.data?.forEach(n => out.push({
      type: 'Note', title: n.title ?? 'Untitled',
      subtitle: n.pillar ?? undefined,
      href: '/life/notes',
    }))
    reading.data?.forEach(r => out.push({
      type: 'Reading', title: r.book_title,
      subtitle: [r.author, r.status].filter(Boolean).join(' · '),
      href: '/life/reading',
    }))
    goals.data?.forEach(g => out.push({
      type: 'Goal', title: g.title,
      subtitle: g.status ?? undefined,
      href: '/work/goals',
    }))
    links.data?.forEach(l => {
      let title = l.title ?? l.url
      try { if (!l.title) title = new URL(l.url).hostname.replace('www.', '') } catch {}
      out.push({ type: 'Link', title, subtitle: l.website ?? undefined, href: '/life/links' })
    })
    jobs.data?.forEach(j => out.push({
      type: 'Job',
      title: j.role ? `${j.role} @ ${j.company}` : j.company,
      subtitle: j.status ?? undefined,
      href: '/dextrous/jobs',
    }))
    knowledge.data?.forEach(k => out.push({
      type: 'Knowledge', title: k.title,
      subtitle: k.tags ?? undefined,
      href: '/dextrous/knowledge',
    }))
    finances.data?.forEach(f => out.push({
      type: 'Finance',
      title: f.label ?? '—',
      subtitle: [f.category, f.amount != null ? `$${Math.abs(f.amount).toFixed(2)}` : undefined].filter(Boolean).join(' · '),
      href: '/life/finances',
    }))

    setResults(out)
    setSelected(0)
    setLoading(false)
  }, [])

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 200)
    return () => clearTimeout(t)
  }, [query, doSearch])

  // Keyboard nav
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected(s => Math.min(s + 1, results.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected(s => Math.max(s - 1, 0))
      }
      if (e.key === 'Enter' && results[selected]) {
        router.push(results[selected].href)
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, results, selected, router, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative flex items-start justify-center pt-[18vh] px-4">
        <div className="w-full max-w-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Input row */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-100 dark:border-stone-800">
            <Search size={16} className="text-stone-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search everything…"
              className="flex-1 text-sm bg-transparent outline-none text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
            />
            {query ? (
              <button
                onClick={() => setQuery('')}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
              >
                <X size={14} />
              </button>
            ) : (
              <kbd className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-500 px-1.5 py-0.5 rounded font-mono">
                esc
              </kbd>
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <ul className="max-h-80 overflow-y-auto divide-y divide-stone-50 dark:divide-stone-800">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => { router.push(r.href); onClose() }}
                    onMouseEnter={() => setSelected(i)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors ${
                      i === selected ? 'bg-stone-50 dark:bg-stone-800' : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    <span
                      className="text-xs font-semibold px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        color: TYPE_COLOR[r.type] ?? '#6B6560',
                        backgroundColor: (TYPE_COLOR[r.type] ?? '#6B6560') + '18',
                      }}
                    >
                      {r.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-900 dark:text-stone-100 truncate">{r.title}</p>
                      {r.subtitle && (
                        <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{r.subtitle}</p>
                      )}
                    </div>
                    {i === selected && (
                      <span className="text-xs text-stone-300 dark:text-stone-600 shrink-0">↵</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Empty / hint states */}
          {query.length >= 2 && !loading && results.length === 0 && (
            <p className="px-4 py-6 text-sm text-center text-stone-400 dark:text-stone-500">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}
          {query.length < 2 && (
            <p className="px-4 py-3 text-xs text-stone-400 dark:text-stone-500">
              Search tasks, notes, reading, goals, links, jobs, and knowledge
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
