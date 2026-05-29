/**
 * notes-drafts-sync — Golem OS Edge Function
 *
 * Bidirectional sync between Golem OS notes and the Drafts app.
 *
 * Auth: Bearer token matched against DRAFTS_PERSONAL_SECRET env var.
 *       (Set via `supabase secrets set DRAFTS_PERSONAL_SECRET=<your-secret>`)
 *
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
 * USER_ID is hardcoded (single-user personal app).
 *
 * ── GET  ?note_id=<id> ───────────────────────────────────────────────────────
 * Returns the note as JSON: { id, title, content, drafts_uuid }
 * Used by the "← Fetch from Golem OS" Drafts action.
 *
 * ── POST { note_id, drafts_uuid } ───────────────────────────────────────────
 * Updates notes.drafts_uuid so "Open in Drafts" links back to the right draft.
 * Used by both Drafts actions on first run to establish the link.
 */

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DRAFTS_SECRET     = Deno.env.get('DRAFTS_PERSONAL_SECRET') ?? '';
const USER_ID           = '6e706fba-76c8-4743-9748-6cfe818e4530';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: JSON_HEADERS,
  });
}

function badRequest(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400, headers: JSON_HEADERS,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const bearer     = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  if (!DRAFTS_SECRET || bearer !== DRAFTS_SECRET) {
    return unauthorized();
  }

  const pgrest = `${SUPABASE_URL}/rest/v1`;
  const headers = {
    'apikey':        SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type':  'application/json',
  };

  // ── GET: fetch note ───────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const noteId = new URL(req.url).searchParams.get('note_id');
    if (!noteId || isNaN(Number(noteId))) {
      return badRequest('note_id query param is required and must be a number');
    }

    const res = await fetch(
      `${pgrest}/notes?id=eq.${noteId}&user_id=eq.${USER_ID}&select=id,title,content,drafts_uuid&limit=1`,
      { headers },
    );

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `DB error: ${err}` }), {
        status: 502, headers: JSON_HEADERS,
      });
    }

    const rows: unknown[] = await res.json();
    if (!rows.length) {
      return new Response(JSON.stringify({ error: `Note ${noteId} not found` }), {
        status: 404, headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify(rows[0]), { status: 200, headers: JSON_HEADERS });
  }

  // ── POST: link drafts_uuid back to note ───────────────────────────────────
  if (req.method === 'POST') {
    let body: { note_id?: number; drafts_uuid?: string };
    try {
      body = await req.json();
    } catch {
      return badRequest('Invalid JSON');
    }

    const { note_id, drafts_uuid } = body;
    if (!note_id || typeof note_id !== 'number') return badRequest('note_id is required');
    if (!drafts_uuid || typeof drafts_uuid !== 'string') return badRequest('drafts_uuid is required');

    const res = await fetch(
      `${pgrest}/notes?id=eq.${note_id}&user_id=eq.${USER_ID}`,
      {
        method:  'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body:    JSON.stringify({ drafts_uuid }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `DB error: ${err}` }), {
        status: 502, headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405, headers: JSON_HEADERS,
  });
});
