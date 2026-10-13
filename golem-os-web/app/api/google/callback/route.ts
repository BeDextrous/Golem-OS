import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/server/crypto'
import { exchangeCode, fetchEmail, serverFlowEnabled } from '@/lib/server/google'
import { OAUTH_COOKIE, cookieOptions, openCookie } from '@/lib/server/google-oauth-cookie'

/** Finishes the Google consent flow and stores the encrypted refresh token. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const cookie = openCookie(request.cookies.get(OAUTH_COOKIE)?.value)
  const next = cookie?.next ?? '/'

  const done = (status: string) => {
    const target = new URL(next, url.origin)
    target.searchParams.set('google', status)
    const res = NextResponse.redirect(target)
    res.cookies.set(OAUTH_COOKIE, '', { ...cookieOptions, maxAge: 0 })
    return res
  }

  if (!serverFlowEnabled()) return done('unavailable')
  if (url.searchParams.get('error')) return done('denied')

  const code = url.searchParams.get('code')
  // Reject anything not started by this browser for this user: CSRF / replay protection
  if (!cookie || !code || url.searchParams.get('state') !== cookie.state) return done('error')

  const sb = await createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user || user.id !== cookie.uid) return done('error')

  const tokens = await exchangeCode({ code, redirectUri: `${url.origin}/api/google/callback`, verifier: cookie.verifier })
  if (!tokens.ok || !tokens.access_token || !tokens.refresh_token) return done('error')

  const email = await fetchEmail(tokens.access_token)
  const { error } = await sb.from('google_connections').upsert(
    {
      user_id: user.id,
      connection: cookie.connection,
      google_email: email,
      scopes: tokens.scope ?? '',
      refresh_token_enc: encrypt(tokens.refresh_token),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,connection' }
  )
  return done(error ? 'error' : 'connected')
}
