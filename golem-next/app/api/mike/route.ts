import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

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

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let messages: Anthropic.MessageParam[]
  try {
    const body = await req.json()
    messages = body.messages
    if (!Array.isArray(messages) || messages.length === 0) throw new Error()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: 'claude-opus-4-5',
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
