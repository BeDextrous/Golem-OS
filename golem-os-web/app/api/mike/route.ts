import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const client = new Anthropic()

const MIKE_SYSTEM = `You are Mike, a sharp legal and business assistant integrated into Golem OS — a personal life operating system.

Your role:
- Provide clear, practical legal and business guidance
- Help draft contracts, NDAs, client agreements, and professional correspondence
- Review business documents and flag risk areas in plain language
- Advise on freelance/consulting business strategy, pricing, and client relationships
- Support with job negotiation, offer letters, and employment terms

Your style:
- Direct and confident — skip unnecessary hedging
- Plain English first, legal precision when it matters
- Structured responses with bullet points or numbered lists when helpful
- Flag genuine risks clearly; don't catastrophise minor issues
- Always note when something requires a licensed attorney in the user's jurisdiction

You have context that the user runs Dextrous — a consultancy/freelance practice. You may reference their clients and projects when relevant.`

const MODEL = process.env.MIKE_MODEL ?? 'claude-opus-4-5'
const MAX_MESSAGES = 40
const MAX_CHARS_PER_MESSAGE = 8000
const RATE_LIMIT = 20          // requests
const RATE_WINDOW_MS = 60_000  // per minute, per user (best-effort: per server instance)

const hits = new Map<string, number[]>()

function rateLimited(userId: string) {
  const now = Date.now()
  const recent = (hits.get(userId) ?? []).filter(t => now - t < RATE_WINDOW_MS)
  recent.push(now)
  hits.set(userId, recent)
  return recent.length > RATE_LIMIT
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function parseMessages(input: unknown): Anthropic.MessageParam[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_MESSAGES) return null
  const out: Anthropic.MessageParam[] = []
  for (const m of input) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return null
    if (typeof m.content !== 'string' || m.content.length > MAX_CHARS_PER_MESSAGE) return null
    out.push({ role: m.role, content: m.content })
  }
  // Conversation must start with and end on a user turn
  if (out[0].role !== 'user' || out[out.length - 1].role !== 'user') return null
  return out
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Not authenticated' }, 401)

  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500)
  }

  if (rateLimited(user.id)) return json({ error: 'Too many requests, slow down a bit' }, 429)

  let messages: Anthropic.MessageParam[] | null = null
  try {
    messages = parseMessages((await req.json()).messages)
  } catch { /* falls through to 400 */ }
  if (!messages) return json({ error: 'Invalid request body' }, 400)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: 2048,
          system: [
            {
              type: 'text',
              text: MIKE_SYSTEM,
              // Prompt caching: system prompt is large & static — cache it
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages,
          stream: true,
        })

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream error'
        controller.enqueue(encoder.encode(`\n\n_Error: ${msg}_`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
    },
  })
}
