# Golem OS — Developer Guide

This is the working reference for how Golem OS is built, deployed, and
maintained. It is the canonical description of the system; if something in
here disagrees with another README, trust this file and update the other one.

## 1. What Golem OS is today

Golem OS is a single-page productivity dashboard (tasks, goals, objectives,
reading list, notes, links, finances, CRM) running at
**app.bedextrous.com**. The app itself is a static bundle of HTML + vanilla
JavaScript served from Vercel. All persistent data lives in a Supabase
project; the browser talks to Supabase directly using the public `anon` key,
with Row-Level Security pinning every row to the signed-in user. Auth is
Google OAuth via Supabase, and the dashboard calendar widget reads the next
seven days from Google Calendar using the provider token issued at sign-in.

There is no backend of your own — no Node server, no build step. The trade
for that simplicity is that the browser holds the whole app and Supabase
enforces all authorization.

A legacy Google Apps Script implementation (`Code.gs`, the root `Index.html`,
`appsscript.json`, `deploy.sh`, `.clasp.json`) still lives at the repo root.
It is retired. The live app is the `web/` folder. The Apps Script files are
kept around for a little while so the two systems can run in parallel during
the cutover; they can be deleted once you're confident nothing depends on
them.

## 2. High-level data flow

```
┌───────────────┐     static HTML/JS      ┌──────────────┐
│  Browser      │ ──────────────────────► │   Vercel     │
│ app.bedextrous│ ◄────────────────────── │ (CDN + TLS)  │
│    .com       │                         └──────────────┘
│               │                                ▲
│               │          git push              │ auto-deploy on
│               │      ┌───────────────┐         │ push to main
│               │      │   GitHub      │ ────────┘
│               │      │ BeDextrous/   │
│               │      │ Golem-OS      │
│               │      └───────────────┘
│               │
│               │     PostgREST + RLS     ┌──────────────┐
│               │ ──────────────────────► │  Supabase    │
│               │ ◄────────────────────── │  wllsrdfflau │
│               │      Google OAuth       │  dwhfpxzfe   │
└───────────────┘      Calendar API       └──────────────┘
```

The repo is the source of truth. Any change — UI, schema, policy — lands as a
commit, is pushed to `origin/main`, and is picked up by both Vercel (for
code) and Supabase (for schema migrations, via a manual `supabase db push`).

## 3. Role of Claude (Cowork mode)

Claude runs inside a sandboxed Linux environment that has read/write access
to the `golem-os` folder on your Mac but **no outbound network access** to
`github.com`, `*.supabase.co`, `*.supabase.com`, or certain npm packages.
The proxy returns HTTP 403 on those hosts. DNS for external names is
unreachable. That boundary is the single most important thing to understand
about the workflow.

Because of this, Claude's job ends at the local repo:

- Claude can edit code and schema files, stage them, and make commits
  locally, using `git -c user.name=Max -c user.email=max@bedextrous.com` so
  the commits carry your identity without mutating global git config.
- Claude can write migration SQL into `supabase/migrations/` but cannot
  apply it to the remote database.
- Claude cannot run `git push`, `supabase login`, `supabase link`, or
  `supabase db push`.

Everything that reaches out to a real network — GitHub, Supabase, npm —
has to run from your Mac. Claude will hand you the exact command to paste.

## 4. Local files

The repository lives at `~/golem-os` on your Mac and is mounted into the
Cowork sandbox at the same-looking path. What each folder is for:

```
golem-os/
├── web/                       ← THE live app (deployed to Vercel)
│   ├── index.html             single-page app, all UI + data logic
│   ├── config.js              public Supabase URL + anon key (safe to commit)
│   └── README.md              first-time setup + known limitations
│
├── supabase/
│   ├── config.toml            supabase CLI project scaffold (major_version=17)
│   ├── schema.sql             canonical schema; idempotent, safe to re-run
│   ├── google-oauth-setup.md  one-time OAuth provider setup notes
│   ├── migrations/            timestamped SQL files applied via `supabase db push`
│   │   └── YYYYMMDDHHMMSS_*.sql
│   └── migrate/               one-shot Node scripts for data moves/fixes
│       ├── import.mjs             initial Sheet → Supabase import
│       ├── migrate-status.mjs     example: in-place data normalization
│       ├── package.json           local deps: @supabase/supabase-js, dotenv
│       ├── .env                   service_role key + USER_ID (gitignored)
│       ├── .env.example           template you copy to .env
│       └── imports/*.csv          gitignored; user data for the initial import
│
├── vercel.json                cleanUrls / trailingSlash config (no build steps)
├── readme.md                  project-level overview (still mentions Apps Script)
├── DEV_GUIDE.md               this file
├── .gitignore                 excludes .env, CSVs, supabase/.branches/, .temp/
├── .mcp.json                  dev-time MCP server config (Supabase MCP endpoint)
│
│   ── legacy / retired ──
├── Code.gs                    old Apps Script backend
├── Index.html                 old Apps Script UI
├── appsscript.json            Apps Script manifest
├── deploy.sh                  clasp push helper
├── .clasp.json                clasp project binding
└── progress-archive.{md,ipynb}  dev notebook from the Apps Script era
```

A few rules that make this layout easier to work with. Secrets never go in
`web/` — it's shipped to the browser verbatim; that's why only the `anon`
key is in `web/config.js`, and why `supabase/migrate/.env` holds the
service-role key (which must never leave your machine). Migration filenames
must be timestamped (`YYYYMMDDHHMMSS_`) because `supabase db push` applies
them in filename order. The `supabase/.temp/` and `supabase/.branches/`
folders are CLI state and are gitignored.

## 5. GitHub

Remote: <https://github.com/BeDextrous/Golem-OS>, branch `main`. This repo
is private and only you push to it.

Claude commits locally; you push. A typical session ends with a prompt like:

```bash
git push
```

If the push is rejected because the remote moved forward (happens if Vercel
or a previous session added a commit you don't have), fix it with:

```bash
git pull --rebase origin main && git push
```

There is no PR workflow, no CI, and no branch protection. Commits go
straight to `main`, and `main` is what Vercel deploys. Keep commit messages
descriptive (`feat(web): …`, `chore(supabase): …`, `fix: …`) because the
git log is the only change log the project has.

## 6. Supabase

Project ref: **`wllsrdfflaudwhfpxzfe`**. Dashboard:
<https://supabase.com/dashboard/project/wllsrdfflaudwhfpxzfe>. Postgres 17.

### Keys and where they live

The **anon key** is public-safe and sits in `web/config.js`. Anyone who
loads the site sees it; that's fine because every table has an RLS policy
restricting reads and writes to `auth.uid() = user_id`. Rotate the anon key
only if you rotate RLS too.

The **service_role key** bypasses RLS. It lives *only* in
`supabase/migrate/.env` on your Mac and is used by one-shot Node scripts
that need to write as the system. It must never be committed, never shipped
to the browser, and never pasted into a session. The `.gitignore` enforces
the first part; the second two are on you.

### The CLI, and why login matters

Two separate auth layers live behind `supabase db push`:

1. **Management API access token** — controls what projects your CLI can
   administer. `supabase login` (GitHub OAuth is fine) sets this.
2. **Postgres password** — the actual database password for the project.
   `supabase link --project-ref wllsrdfflaudwhfpxzfe` prompts for it on
   first run and caches it under `supabase/.temp/` (gitignored).

You only do both once per machine. After that, migration pushes are a
single command.

First time on a new machine:

```bash
brew install supabase/tap/supabase          # CLI — npm install is proxy-blocked
supabase login                               # GitHub OAuth works
supabase link --project-ref wllsrdfflaudwhfpxzfe
```

### Schema change workflow (DDL)

When Claude wants to change the schema, it writes a new file at
`supabase/migrations/YYYYMMDDHHMMSS_description.sql` and also updates the
canonical `supabase/schema.sql` so the two stay in sync. Then Claude
commits. Your part:

```bash
git push                 # ships code + migration file to GitHub
supabase db push         # applies pending migrations to the remote DB
```

Order matters only when the code depends on the new schema — push the
migration first in that case, because Vercel deploys the code the moment
`git push` lands.

Rolling back a migration is not automated. If something's broken, either
write a forward migration that reverses the change, or restore from the
Supabase daily backup via the dashboard.

### One-shot data fixes (no DDL)

For in-place data normalization that doesn't change the schema, write a
small Node script under `supabase/migrate/` that uses the service_role key
and scopes updates to `USER_ID`. `migrate-status.mjs` is the pattern: it
loads `.env`, counts affected rows, runs the update, and verifies the
result. Run it from your Mac:

```bash
cd supabase/migrate
npm install              # first time only
node migrate-status.mjs  # or: npm run migrate-status
```

These scripts must also run from your Mac because the sandbox can't reach
`*.supabase.co`. Keep them in the repo as an audit trail of what was
changed, but treat them as one-shot — they generally aren't idempotent.

### Row-Level Security, in practice

Every table has `enable row level security` and policies of the form
`using (auth.uid() = user_id) with check (auth.uid() = user_id)`. The
browser can only see rows it owns, which is why pushing the anon key to the
frontend is safe. If you ever add a new table, **add RLS at the same time
in the same migration** — a table without policies is either invisible to
the client or wide-open, depending on defaults, and both are bad.

## 7. Vercel

Vercel serves `web/` as a static site. There is no build step; the folder
itself is the deployed artifact.

Project settings: root directory `web`, framework preset Other, build
command blank, output directory blank. `vercel.json` at the repo root sets
`cleanUrls: true` and `trailingSlash: false`; that's all the Vercel config
there is.

Deploys are triggered automatically on every push to `origin/main`. A typical
`git push` is live in under a minute. There is no staging environment.
Preview deploys do get generated for branches, but since the workflow pushes
straight to `main`, you rarely see them.

Custom domain: `app.bedextrous.com` is a CNAME to Vercel in the Squarespace
DNS. If that ever needs reconfiguring, the target is whatever Vercel shows
under Project Settings → Domains. The same domain is listed in Supabase
(Auth → URL Configuration → Redirect URLs) and in Google Cloud Console
(OAuth client → Authorized JavaScript origins). Changing the domain means
updating all three.

## 8. Other things worth knowing

**Google OAuth and the calendar widget.** Sign-in is Google via Supabase's
OAuth provider. The scope list includes `calendar.readonly`, which is how
the dashboard calendar pulls events. If someone signed in before the scope
was added, the provider token won't include calendar access — they see a
"Calendar access requires re-signing in" banner and need to sign out and
back in to re-consent. The setup details are in
`supabase/google-oauth-setup.md`.

**Legacy status values.** The Tasks table moved from
`Active/In Progress/Blocked/Paused/Done` to `To Do/Active/On Hold/Done`.
There's display-side migration logic in `web/index.html` (`STATUS_MIGRATION`,
`migrateStatus`, `migrateState`) that rewrites old values on read, so the
frontend keeps working against stale exports or backups. The DB itself was
normalized by migration `20260421010334_task_status_enum_update.sql`, which
updates rows and then replaces the `tasks_status_check` constraint. The
display-side fallback stays in place as a belt-and-braces measure.

**Running locally.** The app is fully static. `cd web && python3 -m
http.server 5173` serves it; port 5173 is the one allow-listed in both
Supabase redirect URLs and the Google OAuth client, so stick to it.

**MCP.** `.mcp.json` points at the Supabase MCP endpoint for the project.
This only matters inside Cowork when Claude is asked to read live data
through MCP; it has no effect on the deployed app.

**When something seems off.** First check the git log (everything that
changes the system is a commit). Then check the Supabase dashboard logs for
400/500s — RLS failures and CHECK-constraint violations both surface there.
Vercel's deploy log is the third place to look, but it rarely fails because
there's no build step.

## 9. Summary of who does what

A normal change, end to end: Claude edits files in `web/` and/or writes SQL
into `supabase/migrations/`, updates `supabase/schema.sql` if the schema
changed, commits with a descriptive message, and tells you the commands to
run. You run `git push` (which triggers Vercel) and, if there was a
migration, `supabase db push` (which applies it to the database). If the
change was a one-shot data fix, you run the Node script from
`supabase/migrate/` instead of a migration push.

That's the whole loop.
