'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, RotateCcw, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const STARTERS = [
  'Review this contract clause:',
  'Draft an NDA for a new client',
  'Help me write a client proposal',
  'What should I include in my freelance agreement?',
  'Review this offer letter',
]

function MessageBubble({ msg, isLast }: { msg: Message; isLast: boolean }) {
  const [copied, setCopied] = useState(false)
  const isUser = msg.role === 'user'

  const copy = () => {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-br-sm'
            : 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-700 rounded-bl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap">{msg.content}</p>
        {!isUser && (
          <button
            onClick={copy}
            className="absolute -top-2 -right-2 p-1 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-400 dark:text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-stone-600 dark:hover:text-stone-300"
            aria-label="Copy"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>
        )}
      </div>
    </div>
  )
}

export function MikeWidget() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const abortRef   = useRef<AbortController | undefined>(undefined)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async (text: string) => {
    const userMsg = text.trim()
    if (!userMsg || streaming) return

    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setStreaming(true)

    // Add empty assistant message to stream into
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/mike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `⚠️ ${err.error ?? 'Something went wrong'}`,
          }
          return updated
        })
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          updated[updated.length - 1] = {
            ...last,
            content: last.content + chunk,
          }
          return updated
        })
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: '⚠️ Network error — please try again.',
        }
        return updated
      })
    } finally {
      setStreaming(false)
      abortRef.current = undefined
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [messages, streaming])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const reset = () => {
    abortRef.current?.abort()
    setMessages([])
    setInput('')
    setStreaming(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="flex flex-col h-full min-h-[600px] bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#378ADD] flex items-center justify-center text-white text-xs font-bold">
            M
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Mike</p>
            <p className="text-xs text-stone-400">Legal &amp; business assistant</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="p-1.5 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          aria-label="New conversation"
          title="New conversation"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-6 py-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#378ADD]/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-[#378ADD]">M</span>
              </div>
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Ask Mike anything</p>
              <p className="text-xs text-stone-400 mt-1">Legal guidance, contracts, business strategy</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-[#378ADD] hover:text-[#378ADD] dark:hover:text-[#378ADD] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} isLast={i === messages.length - 1} />
            ))}
            {streaming && messages[messages.length - 1]?.content === '' && (
              <div className="flex justify-start mb-3">
                <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl rounded-bl-sm px-4 py-3">
                  <span className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Input ── */}
      <div className="px-4 pb-4 pt-2 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Mike… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none px-3 py-2 text-sm bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-lg outline-none focus:ring-2 focus:ring-[#378ADD]/40 focus:border-[#378ADD] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 transition-all max-h-32 overflow-y-auto"
            style={{ minHeight: '38px' }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`
            }}
            disabled={streaming}
          />
          <Button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            size="sm"
            className="shrink-0 bg-[#378ADD] hover:bg-[#2a6ab5] text-white border-none h-[38px] px-3"
          >
            <Send size={14} />
          </Button>
        </div>
        <p className="text-xs text-stone-400 mt-1.5 text-center">
          Mike may make mistakes — verify legal advice with a qualified attorney.
        </p>
      </div>
    </div>
  )
}
