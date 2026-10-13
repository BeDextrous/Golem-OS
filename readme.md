# Golem OS

A personal productivity system: tasks, goals, projects, clients, notes, links,
finances, reading, jobs and a Pagemaster legal-docs pipeline, split into four
"pillars" (Life, Dextrous, Work, Pagemaster) plus a cross-pillar Focus view.
Runs at [golems.bedextrous.com](https://golems.bedextrous.com).

## Stack

- **App:** Next.js 16 (App Router, React 19, Server Components), Tailwind 4, TypeScript
- **Data + auth:** Supabase (Postgres, Row-Level Security, Google OAuth)
- **Hosting:** Vercel, deployed from GitHub Actions (`vercel deploy --prebuilt`)
- **AI:** Anthropic API behind `/api/mike`
- **PWA:** installable; the service worker caches static assets only

## Repository layout

```
golem-os-web/   the app (Vercel root directory)
supabase/       schema.sql, timestamped migrations, one-off data scripts
integrations/   Drafts app scripts
tools/          pinscrape (Pinterest scraper)
legacy/         retired Apps Script + static web versions (reference only)
.github/        CI (lint, typecheck, test, build) and the Vercel deploy workflow
DEV_GUIDE.md    full architecture and operations guide, start here
```

## Run locally

```bash
cd golem-os-web
# create .env.local first (variables listed in DEV_GUIDE.md section 5)
npm ci
npm run dev                        # http://localhost:3000
```

Before pushing:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Deploy

Merging to `main` runs CI, then deploys to Vercel. To redeploy without a
change, use Actions, "Deploy to Vercel", Run workflow.

Schema changes need a migration file in `supabase/migrations/` and an explicit
`supabase db push` against the remote project.

## Secrets

- The Supabase **anon key** is public by design; RLS enforces access.
- The **service-role key** lives only in `supabase/migrate/.env` on a developer
  machine. Never committed, never used by the app.
- `NEXT_PUBLIC_*` variables are Config in Vercel, never Sensitive.

See [`DEV_GUIDE.md`](./DEV_GUIDE.md) for everything else.
