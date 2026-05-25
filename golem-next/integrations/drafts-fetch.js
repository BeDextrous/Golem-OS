// ─────────────────────────────────────────────────────────────────────────────
// Golem OS — "← Fetch from Golem OS" Drafts Action
// ─────────────────────────────────────────────────────────────────────────────
//
// SETUP: same credentials as "→ Save to Golem OS" — no extra setup needed.
//
// WHAT IT DOES:
// Fetches the latest content of the linked Golem OS note and directly
// overwrites this draft's content. No copy/paste required.
//
// Also automatically links this draft's UUID to the Golem note on first run,
// so "Open in Drafts" in the Golem editor will open exactly this draft.
//
// USAGE:
// 1. Open a draft that has a "golem-note-{ID}" tag.
//    (Tags are added automatically by "→ Save to Golem OS" or by
//     clicking "Send to Drafts" in the Golem note editor.)
// 2. Run this action — the draft content is replaced with the Golem version.
// 3. Assign a keyboard shortcut (e.g. ⌘⇧G) for fast access.
//
// Works identically on Mac and iOS Drafts.
// ─────────────────────────────────────────────────────────────────────────────

const EDGE_FN_URL =
  'https://wllsrdfflaudwhfpxzfe.supabase.co/functions/v1/notes-drafts-sync'

// ── Auth (shared credential with the Save action) ─────────────────────────────
const credential = Credential.createWithUsernamePassword(
  'GolemOS-DraftsSync',
  'Golem OS Sync'
)
if (!credential.authorize()) {
  context.fail('Authorization cancelled — enter your DRAFTS_PERSONAL_SECRET as the password.')
  throw new Error('auth cancelled')
}
const personalSecret = credential.password

// ── Find linked note ID ───────────────────────────────────────────────────────
const noteTag = draft.tags.find(t => t.startsWith('golem-note-'))
if (!noteTag) {
  context.fail(
    'No "golem-note-{ID}" tag on this draft.\n' +
    'Run "→ Save to Golem OS" first, or click "Send to Drafts" in the Golem note editor.'
  )
  throw new Error('no tag')
}
const noteId = noteTag.replace('golem-note-', '')

// ── Fetch latest from Golem ───────────────────────────────────────────────────
const http = HTTP.create()
const fetchResponse = http.request({
  url:     `${EDGE_FN_URL}?note_id=${noteId}`,
  method:  'GET',
  headers: { 'Authorization': `Bearer ${personalSecret}` },
})

if (!fetchResponse.success) {
  const detail = fetchResponse.responseText || `HTTP ${fetchResponse.statusCode}`
  context.fail(`Fetch failed: ${detail}`)
  throw new Error('fetch failed')
}

let note = {}
try {
  note = JSON.parse(fetchResponse.responseText)
} catch {
  context.fail('Unexpected response format from Golem OS')
  throw new Error('bad json')
}

if (!note.id) {
  context.fail(`Note #${noteId} not found in Golem OS`)
  throw new Error('not found')
}

// ── Build updated content ─────────────────────────────────────────────────────
// Title on the first line (no Markdown prefix — Drafts will auto-style it),
// blank line separator, then body content.
const parts = []
if (note.title)   parts.push(note.title)
if (note.content) { if (parts.length) parts.push(''); parts.push(note.content) }

const newContent = parts.join('\n').trim()
if (!newContent) {
  app.displayInfoMessage('Golem note is empty — draft not changed.')
} else {
  // ── Directly update the draft ─────────────────────────────────────────────
  draft.content = newContent
  draft.update()
}

// ── Auto-link this draft's UUID back to Golem (first-time setup) ─────────────
// This lets "Open in Drafts" in the Golem editor open exactly this draft.
if (!note.drafts_uuid || note.drafts_uuid !== draft.uuid) {
  http.request({
    url:     EDGE_FN_URL,
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${personalSecret}`,
      'Content-Type':  'application/json',
    },
    data: { note_id: parseInt(noteId, 10), drafts_uuid: draft.uuid },
  })
  // Ensure the golem tag is present
  if (!draft.hasTag('golem')) { draft.addTag('golem'); draft.update() }
}

app.displaySuccessMessage(`Draft updated from Golem OS ✓`)
