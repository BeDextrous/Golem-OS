# Golem OS — web app (Supabase port)

Self-contained single-page app that replaces the Google Apps Script version.

## Stack

- Static HTML + vanilla JS (no build step)
- `@supabase/supabase-js` from esm.sh CDN
- Supabase Postgres + Auth (Google OAuth)
- Google Calendar API (read-only) via the OAuth provider token

## Files

- `index.html` — the whole app (UI + data layer)
- `config.js` — project URL + anon key (both public-safe; commit them)

## First-time setup

1. Paste your Supabase **anon** key into `config.js` (replace the placeholder).
   - Get it from <https://supabase.com/dashboard/project/wllsrdfflaudwhfpxzfe/settings/api>
   - Anon keys are public-safe: RLS policies in `../supabase/schema.sql` restrict every row to its owner.
2. Confirm Phase 2 (OAuth) is complete — see `../supabase/google-oauth-setup.md`.
3. Serve the folder locally (any static server works):
   ```bash
   cd web
   python3 -m http.server 5173
   # then open http://localhost:5173
   ```
   (Port 5173 matches what's allow-listed in Supabase + Google Cloud.)

## Deploying to Vercel

1. Push the repo to GitHub (already there).
2. Vercel → Add New → Project → import the repo.
3. **Root Directory**: `web`
4. **Framework Preset**: Other
5. **Build Command**: leave blank
6. **Output Directory**: leave blank (the folder itself is the output)
7. Deploy. You'll get a `*.vercel.app` URL — test it.
8. Project Settings → Domains → add `app.bedextrous.com`.
9. Vercel will give you a CNAME target. In Squarespace DNS settings, add a CNAME record:
    - Host: `app`
    - Data: `<cname-target>.vercel-dns.com`
10. Wait a few minutes for DNS + SSL to finalize.
11. Add `https://app.bedextrous.com` to:
    - Supabase → Auth → URL Configuration → Redirect URLs
    - Google Cloud Console → OAuth client → Authorized JavaScript origins

## Calendar widget

The dashboard calendar pulls the next 7 days from the user's primary Google Calendar. It requires the `calendar.readonly` OAuth scope, which is requested at sign-in. If you see "Calendar access requires re-signing in," sign out and back in — the consent prompt will ask for calendar access.

## Known limitations

- **Single user**: tables are schema'd for multi-tenant but only one user (you) is expected. Every row is scoped to `auth.uid()`.
- **No realtime sync yet**: if you edit in two tabs, you need to hit the refresh icon. Easy to add later via Supabase realtime subscriptions.
