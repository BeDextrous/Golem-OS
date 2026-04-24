/**
 * save-link — Golem OS Edge Function
 *
 * Accepts a link from the iOS Share Sheet shortcut and inserts it into the
 * links table. Uses native fetch (no external imports) for fast cold starts.
 *
 * Env vars (set via `supabase secrets set`):
 *   GOLEM_SAVE_KEY  — pre-shared secret used as the Bearer token in the shortcut
 *
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
 * USER_ID is hardcoded below (single-user personal app).
 */

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOLEM_SAVE_KEY   = Deno.env.get('GOLEM_SAVE_KEY') ?? '';
const USER_ID          = '6e706fba-76c8-4743-9748-6cfe818e4530';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Auth check — accept key from Authorization header OR ?key= query param
  const auth    = req.headers.get('Authorization') ?? '';
  const bearer  = auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth.trim();
  const qpKey   = new URL(req.url).searchParams.get('key') ?? '';
  const token   = bearer || qpKey;
  if (!GOLEM_SAVE_KEY || token !== GOLEM_SAVE_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse body
  let body: { url?: string; title?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const url     = (body.url     ?? '').trim();
  const title   = (body.title   ?? '').trim() || null;
  const website = (body.website ?? '').trim() || null;

  if (!url) {
    return new Response(JSON.stringify({ error: 'url is required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Insert via PostgREST using native fetch — no supabase-js import needed
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/links`, {
    method: 'POST',
    headers: {
      'apikey':        SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    },
    body: JSON.stringify({ user_id: USER_ID, url, title, website }),
  });

  const result = await resp.json();

  if (!resp.ok) {
    console.error('Insert failed:', resp.status, result);
    return new Response(JSON.stringify({ error: result }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, id: result[0]?.id }), {
    status: 201, headers: { 'Content-Type': 'application/json' },
  });
});
