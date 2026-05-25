// ─────────────────────────────────────────────────────────────────────────────
// Golem OS — Drafts Sync Action
// ─────────────────────────────────────────────────────────────────────────────
//
// SETUP (one-time):
// 1. In your Supabase dashboard → Edge Functions → notes-drafts-sync
//    → go to the Secrets tab and add:
//        Key:   DRAFTS_PERSONAL_SECRET
//        Value: (any long random string you choose, e.g. a UUID)
// 2. In the Drafts app, create a new Action:
//    - Add a "Script" step and paste this entire file
//    - Name it "→ Golem OS"  (or any name you like)
//    - Optionally assign a keyboard shortcut / widget
// 3. The first time you run the action, Drafts will prompt for credentials.
//    - Username: leave blank (or type anything)
//    - Password: paste your DRAFTS_PERSONAL_SECRET value
//    Drafts stores this securely and won't ask again.
//
// HOW IT WORKS:
// • First line of the draft becomes the note title (Markdown # stripped).
// • Remaining lines become the note content.
// • If the draft already has a "golem-note-{ID}" tag, it updates that note.
// • Otherwise it creates a new Golem OS note and tags the draft automatically.
// • The draft's UUID is saved to Golem so "Open in Drafts" works bidirectionally.
//
// PILLAR: new notes default to "life". Edit on the Golem note page to change.
// ─────────────────────────────────────────────────────────────────────────────

const EDGE_FN_URL =
  'https://wllsrdfflaudwhfpxzfe.supabase.co/functions/v1/notes-drafts-sync'

// ── Auth ─────────────────────────────────────────────────────────────────────
const credential = Credential.createWithUsernamePassword(
  'GolemOS-DraftsSync',
  'Golem OS Sync'
)
if (!credential.authorize()) {
  context.fail('Authorization cancelled — enter your DRAFTS_PERSONAL_SECRET as the password.')
  // Stop execution
  throw new Error('auth cancelled')
}
const personalSecret = credential.password

// ── Parse draft ───────────────────────────────────────────────────────────────
const lines = draft.content.trim().split('\n')
let title   = (lines[0] ?? '').replace(/^#{1,2}\s*/, '').trim()
let content = lines.slice(1).join('\n').trimStart()

// ── Find linked note ID from tags ─────────────────────────────────────────────
const noteTag = draft.tags.find(t => t.startsWith('golem-note-'))
const noteId  = noteTag ? parseInt(noteTag.replace('golem-note-', ''), 10) : null

// ── Build payload ─────────────────────────────────────────────────────────────
const payload = {
  title:       title   || null,
  content:     content || null,
  drafts_uuid: draft.uuid,
}
if (noteId) payload.note_id = noteId

// ── HTTP request ──────────────────────────────────────────────────────────────
const http = HTTP.create()
const response = http.request({
  url:    EDGE_FN_URL,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${personalSecret}`,
    'Content-Type':  'application/json',
  },
  data: payload,
})

// ── Handle response ───────────────────────────────────────────────────────────
if (response.success) {
  if (!noteId) {
    // New note — tag this draft so future syncs update rather than duplicate
    let created = {}
    try { created = JSON.parse(response.responseText) } catch {}
    if (created.id) {
      draft.addTag(`golem-note-${created.id}`)
      if (!draft.hasTag('golem')) draft.addTag('golem')
      draft.update()
    }
  }
  app.displaySuccessMessage(noteId ? 'Note updated in Golem OS ✓' : 'Note created in Golem OS ✓')
} else {
  const detail = response.responseText || `HTTP ${response.statusCode}`
  context.fail(`Golem sync failed: ${detail}`)
}
