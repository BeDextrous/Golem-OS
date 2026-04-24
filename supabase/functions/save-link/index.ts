/**
 * save-link — Golem OS Edge Function
 *
 * Accepts a link from the iOS Share Sheet shortcut and inserts it into the
 * links table using the service_role key, so no expiring user JWT is needed
 * in the shortcut.
 *
 * Required env vars (set via `supabase secrets set`):
 *   GOLEM_SAVE_KEY   — a random secret you generate, used as the Bearer token
 *                      in the iOS shortcut (e.g. run: openssl rand -hex 32)
 *   USER_ID          — the Supabase auth.users UUID for the account that owns
 *                      the links (6e706fba-76c8-4743-9748-6cfe818e4530)
 *
 * Shortcut config:
 *   URL:     https://wllsrdfflaudwhfpxzfe.supabase.co/functions/v1/save-link
 *   Method:  POST
 *   Headers: Authorization: Bearer <GOLEM_SAVE_KEY>
 *            Content-Type: application/json
 *   Body:    { "url": "...", "title": "...", "website": "..." }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOLEM_SAVE_KEY    = Deno.env.get('GOLEM_SAVE_KEY')!;
const USER_ID           = Deno.env.get('USER_ID')!;

Deno.serve(async (req: Request) => {
  // CORS pre-flight (not strictly needed for shortcuts, but harmless)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify the pre-shared key
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token || token !== GOLEM_SAVE_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse body
  let body: { url?: string; title?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url     = (body.url     ?? '').trim();
  const title   = (body.title   ?? '').trim() || null;
  const website = (body.website ?? '').trim() || null;

  if (!url) {
    return new Response(JSON.stringify({ error: 'url is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Insert using service_role key (bypasses RLS; user_id is set explicitly)
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data, error } = await sb
    .from('links')
    .insert({ user_id: USER_ID, url, title, website })
    .select()
    .single();

  if (error) {
    console.error('Insert error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, id: data.id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
});
