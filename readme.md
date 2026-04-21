# Golem OS

A personal productivity dashboard — tasks, goals, objectives, reading list,
notes, links, finances, and CRM — running at
[app.bedextrous.com](https://app.bedextrous.com).

Single-page static web app backed by Supabase. No build step, no server of
your own. The browser talks to Postgres directly over PostgREST, and
Row-Level Security keeps every row pinned to its owner.

## Stack

- **Frontend:** vanilla HTML + JavaScript, served as a static bundle
- **Hosting:** Vercel (auto-deploy on push to `main`)
- **Database + auth:** Supabase (Postgres 17, Google OAuth)
- **Integrations:** Google Calendar (read-only, 7-day lookahead on the dashboard)

## Architecture

```
Browser ── static assets ──► Vercel ◄── git push ── GitHub
   │                                                   │
   │                                                   ├── supabase/migrations/*.sql
   │                                                   │     applied via `supabase db push`
   └── PostgREST + Google OAuth ──► Supabase ◄─────────┘
```

GitHub is the source of truth. Every code change goes through a commit; every
schema change goes through a timestamped migration file in
`supabase/migrations/`.

## Repository layout

```
web/                live app deployed to Vercel (index.html + config.js)
supabase/
  schema.sql        canonical schema (idempotent)
  migrations/       timestamped SQL, applied by `supabase db push`
  migrate/          one-shot Node scripts for data moves/fixes
  config.toml       Supabase CLI project scaffold
vercel.json         static-site config (cleanUrls, no build)
DEV_GUIDE.md        full developer guide — read this
```

Files at the repo root prefixed with `Code.gs`, `Index.html`, `appsscript.json`,
`deploy.sh`, `.clasp.json`, and `progress-archive.*` are legacy Google Apps
Script artifacts from the pre-Supabase version and will be removed.

## Getting started (local)

Clone, then serve the `web/` folder on port 5173 (allow-listed in Supabase and
Google OAuth):

```bash
git clone git@github.com:BeDextrous/Golem-OS.git
cd Golem-OS/web
python3 -m http.server 5173
# → http://localhost:5173
```

The only config needed is `web/config.js`, which holds the public Supabase URL
and anon key. These are safe to commit — RLS enforces access control. See
`web/README.md` for first-time-setup specifics and `supabase/google-oauth-setup.md`
for the OAuth provider configuration.

## Deploy workflow

Code changes deploy on push:

```bash
git push
# Vercel picks up origin/main automatically
```

Schema changes require a migration file and an explicit push to Supabase:

```bash
git push                 # ship the migration file
supabase db push         # apply it to the remote database
```

One-off data fixes (non-DDL) live as Node scripts under `supabase/migrate/`
and run locally with the `service_role` key from `supabase/migrate/.env`
(gitignored).

First-time machine setup for Supabase CLI:

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref wllsrdfflaudwhfpxzfe
```

## Secrets

Two Supabase keys, two different homes:

- **Anon key** — public, in `web/config.js`, shipped to the browser. Safe
  because of RLS.
- **Service-role key** — bypasses RLS, lives only in `supabase/migrate/.env`
  on the developer machine. Never committed, never shipped.

`.gitignore` excludes `.env`, migration CSVs, and Supabase CLI state
(`supabase/.branches/`, `supabase/.temp/`).

## Further reading

See [`DEV_GUIDE.md`](./DEV_GUIDE.md) for the full architecture, Claude/Cowork
workflow, Supabase CLI details, RLS conventions, Vercel + custom-domain
setup, and the legacy-status-value migration story.
