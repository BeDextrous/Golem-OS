# Golem OS — Developer Guide

This is the working reference for how Golem OS is built, deployed, and
maintained. It is the canonical description of the system; if something in
here disagrees with another README, trust this file and update the other one.

## 1. What Golem OS is today

Golem OS is a full-stack Next.js 16 productivity app (tasks, goals,
objectives, projects, clients, notes, links, finances, CRM, jobs pipeline)
running at **golems.bedextrous.com**. The app is server-rendered via Vercel
(using Next.js App Router with React Server Components). All persistent data
lives in a Supabase project; server components call Supabase directly using
the service-role-equivalent SSR client, while client components use the
public anon client. Auth is Google OAuth via Supabase, with Row-Level
Security pinning every row to the signed-in user.

The app is a Progressive Web App (PWA): it registers a service worker
(`public/sw.js`) for offline support and can be installed as a desktop app
via `"display": "standalone"` in the manifest.

It contains two AI-powered widgets inside the Dextrous pillar:
- **Mike** — a streaming legal/business assistant backed by the Anthropic API
  (`claude-opus-4-5` with prompt caching on the system prompt)
- **Drive** — a Google Drive widget using OAuth2 + the Drive v3 API and the
  Google Picker

The old static site (`web/`) and the legacy Google Apps Script files at the
repo root are retired. The live app is `golem-os-web/`.

## 2. High-level data flow

```
┌───────────────┐   Next.js SSR / RSC     ┌──────────────────────┐
│  Browser      │ ◄──────────────────────►│  Vercel (Edge + Node)│
│  golems.      │                         │  project: golems     │
│  bedextrous   │                         └──────────────────────┘
│  .com         │                                    ▲
│               │         git push to main           │ auto-deploy
│               │     ┌──────────────────┐           │
│               │     │  GitHub          │───────────┘
│               │     │  BeDextrous/     │
│               │     │  Golem-OS        │
│               │     └──────────────────┘
│               │
│               │   PostgREST + RLS       ┌──────────────────────┐
│               │ ◄──────────────────────►│  Supabase            │
│               │   Google OAuth          │  wllsrdfflaudwhfpxzfe│
│               │                         └──────────────────────┘
│               │
│               │   Anthropic API (stream)┌──────────────────────┐
│               │ ◄──────────────────────►│  /api/mike route     │
│               │                         │  (server-side only)  │
│               │                         └──────────────────────┘
│               │
│               │   Google Drive API      ┌──────────────────────┐
│               │ ◄──────────────────────►│  Google Drive v3 +   │
│               │   (client-side OAuth2)  │  Picker API          │
└───────────────┘                         └──────────────────────┘
```

The repo is the source of truth. Any change — UI, schema, policy — lands as a
commit, is pushed to `origin/main`, and is picked up by Vercel automatically.
Schema changes additionally require `supabase db push` from your Mac.

## 3. Role of Claude

Claude has direct access to the repo and can:
- Edit any file in `golem-os-web/` and commit
- Run `git push` to deploy to production
- Run `npx tsc --noEmit` to type-check before pushing
- Read the Next.js 16 docs at `node_modules/next/dist/docs/` before writing
  any Next.js code (breaking changes vs prior versions — always check)

Claude cannot:
- Apply schema migrations to the remote database (`supabase db push` requires
  your Mac with CLI credentials)
- Access live Supabase data outside of what MCP tools expose

## 4. Local files

```
golem-os/
├── golem-os-web/                ← THE live app (Next.js 16, deployed to Vercel)
│   ├── app/                     App Router pages + layouts + API routes
│   │   ├── (app)/               Authenticated pages (dashboard, pillars)
│   │   │   ├── page.tsx         Main dashboard
│   │   │   ├── life/            Life pillar (tasks, health, notes, etc.)
│   │   │   ├── dextrous/        Dextrous pillar (clients, projects, mike, drive)
│   │   │   ├── work/            Work pillar
│   │   │   └── focus/           Cross-pillar task/goal/objective view
│   │   ├── (auth)/              Login page
│   │   ├── api/mike/            Streaming Anthropic API route (server-side)
│   │   ├── layout.tsx           Root layout (PWA meta, theme-color)
│   │   ├── manifest.ts          PWA manifest (display: standalone)
│   │   └── providers.tsx        Client providers (theme, toaster)
│   ├── components/
│   │   ├── ui/                  Button, etc.
│   │   ├── layout/              GlobalNav, PillarNav
│   │   ├── dashboard/           ClickableTaskList, etc.
│   │   ├── views/               Full-page view components (tasks, notes, focus…)
│   │   └── widgets/             MikeWidget, DriveWidget
│   ├── lib/
│   │   ├── queries.ts           Supabase server-side queries
│   │   ├── supabase/            client.ts + server.ts SSR helpers
│   │   └── utils.ts             cn() and misc
│   ├── types/
│   │   ├── entities.ts          Derived row types from supabase.ts
│   │   ├── pillar.ts            PILLARS config (subnav, colours)
│   │   └── supabase.ts          Generated Supabase types
│   ├── public/
│   │   ├── sw.js                Service worker (stale-while-revalidate)
│   │   ├── icon-192.png         PWA icon
│   │   └── icon-512.png         PWA icon
│   ├── instrumentation-client.ts  Service worker registration (Next.js 16 hook)
│   ├── next.config.ts           Headers for sw.js, turbopack root
│   ├── .env.local               Secrets (gitignored)
│   └── package.json
│
├── supabase/
│   ├── schema.sql               Canonical schema; idempotent, safe to re-run
│   ├── migrations/              Timestamped SQL applied via `supabase db push`
│   └── migrate/                 One-shot Node data-fix scripts
│
├── web/                         ← RETIRED static app (do not edit)
├── DEV_GUIDE.md                 This file
├── readme.md                    Project-level overview
└── .gitignore
```

## 5. Environment variables

Stored in `golem-os-web/.env.local` (gitignored). Required for full
functionality:

| Variable | Purpose | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | Supabase dashboard |
| `NEXT_PUBLIC_APP_URL` | App base URL (localhost or production) | Manual |
| `ANTHROPIC_API_KEY` | Powers the Mike widget | console.anthropic.com |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google Drive OAuth client | console.cloud.google.com |
| `NEXT_PUBLIC_GOOGLE_API_KEY` | Google Drive + Picker API key | console.cloud.google.com |

For production, all variables except `NEXT_PUBLIC_APP_URL` (set to
`https://golems.bedextrous.com`) are configured in Vercel → Project Settings
→ Environment Variables.

## 6. GitHub

Remote: <https://github.com/BeDextrous/Golem-OS>, branch `main`.

Commits go straight to `main`. Vercel auto-deploys on every push. There is
no PR workflow, no CI, and no branch protection.

If the push is rejected because the remote moved forward:

```bash
git pull --rebase origin main && git push
```

Keep commit messages descriptive (`feat(golem-os-web): …`, `fix: …`,
`chore(supabase): …`) — the git log is the only changelog.

## 7. Supabase

Project ref: **`wllsrdfflaudwhfpxzfe`**
Dashboard: <https://supabase.com/dashboard/project/wllsrdfflaudwhfpxzfe>
Postgres 17.

### Keys

The **anon key** is safe to ship to the browser (RLS enforces per-user
isolation). It lives in `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

The **service_role key** bypasses RLS. It must never be committed or shipped
to the browser. It lives only in `supabase/migrate/.env` for one-shot data
scripts.

### Schema change workflow

Claude writes a new file at `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
and updates `supabase/schema.sql`. Then:

```bash
git push                 # deploys code to Vercel
supabase db push         # applies pending migrations to Supabase
```

Push the migration before the code if the code depends on the new schema.

### First time on a new machine

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref wllsrdfflaudwhfpxzfe
```

## 8. Vercel

**Project name:** `golems`
**Root directory:** `golem-os-web/`  _(renamed from `golem-next/` 2026-06-22 — update this in Vercel → Project Settings → Build & Deployment → Root Directory, or deploys will fail)_
**Framework:** Next.js
**Branch:** `main`

Deploys trigger automatically on push. A typical push is live in 1–2 minutes.
No staging environment. Preview deploys exist for non-main branches.

### Custom domain

`golems.bedextrous.com` is a CNAME to Vercel's servers, configured in
Squarespace DNS. If the domain ever needs reconfiguring, update it in:
1. Vercel → Project Settings → Domains
2. Supabase → Auth → URL Configuration → Redirect URLs
3. Google Cloud Console → OAuth client → Authorized JavaScript origins

### Google Cloud Console project

Project: `Golem` (enabled APIs: Google Drive API, Google Picker API)
OAuth 2.0 client: `Golem Local` (web application)
Authorized origins: `http://localhost:3000`, `https://golems.bedextrous.com`

## 9. Running locally

```bash
cd golem-os-web
npm install          # first time
npm run dev          # starts on http://localhost:3000
```

TypeScript check before pushing:

```bash
cd golem-os-web
npx tsc --noEmit
```

**Important:** This is Next.js 16.2.6 — a version with breaking changes vs
prior Next.js. Always read `node_modules/next/dist/docs/` before writing
framework-specific code. Key differences:
- `proxy.ts` replaces `middleware.ts`
- `instrumentation-client.ts` for client-side init (not `_app.tsx`)
- `app/manifest.ts` for PWA manifest (not `public/manifest.json`)
- React 19: `useRef<T>()` requires an initial value argument

## 10. PWA / Desktop app

The app is installable as a desktop app:
- **Chrome:** address bar install icon → "Install Golem OS"
- **iOS:** Share → Add to Home Screen

Service worker (`public/sw.js`) caches the 5 main routes at install time and
uses stale-while-revalidate for all GET requests. API routes are excluded from
caching. The SW is registered via `instrumentation-client.ts` before React
hydration.

## 11. Mike (AI legal assistant)

Mike is a streaming chat widget at `/pagemaster/mike`, backed by:
- **API route:** `app/api/mike/route.ts` — server-side only, uses Anthropic SDK
  with `claude-opus-4-5` and prompt caching on the system prompt
- **Widget:** `components/widgets/mike-widget.tsx` — streaming UI with copy
  per message, conversation reset, and starter prompts

Requires `ANTHROPIC_API_KEY` in `.env.local` (and in Vercel env vars for
production).

## 12. Google Drive widget

Drive widget at `/dextrous/drive`. Client-side OAuth2 via `gapi`:
- Sign in with Google → shows recent files, search, file picker
- Uses `window.gapi` (loaded dynamically from `apis.google.com`)
- File picker loaded on demand from `apis.google.com/js/picker.js`

Requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_GOOGLE_API_KEY`.

## 13. When something seems off

1. `git log` — everything that changes the system is a commit
2. Vercel deploy log — build errors show here
3. Supabase dashboard logs — RLS failures and constraint violations
4. `npx tsc --noEmit` in `golem-os-web/` — catches type errors before they hit
   production
5. Browser console on the live site — runtime errors that didn't surface in TS
