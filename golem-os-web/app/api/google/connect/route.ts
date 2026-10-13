import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildAuthUrl, isConnection, pkcePair, safeNext, serverFlowEnabled } from '@/lib/server/google'
import { OAUTH_COOKIE, cookieOptions, sealCookie } from '@/lib/server/google-oauth-cookie'

function back(url: URL, next: string, status: string) {
  const target = new URL(next, url.origin)
  target.searchParams.set('google', status)
  return NextResponse.redirect(target)
}

/** Starts the Google consent flow (auth code + PKCE, offline access). */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const connection = url.searchParams.get('connection')
  const next = safeNext(url.searchParams.get('next'))

  if (!serverFlowEnabled() || !isConnection(connection)) return back(url, next, 'unavailable')

  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', url.origin))

  // On reconnect, hint the account that was linked before
  const { data: existing } = await sb
    .from('google_connections').select('google_email').eq('user_id', user.id).eq('connection', connection).maybeSingle()

  const { verifier, challenge } = pkcePair()
  const state = randomBytes(16).toString('hex')

  const res = NextResponse.redirect(buildAuthUrl({
    redirectUri: `${url.origin}/api/google/callback`,
    state,
    challenge,
    selectAccount: url.searchParams.get('select') === '1',
    loginHint: existing?.google_email ?? undefined,
  }))
  res.cookies.set(OAUTH_COOKIE, sealCookie({ state, verifier, connection, next, uid: user.id }), cookieOptions)
  return res
}
