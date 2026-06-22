# Cloud Project Reorg — Design

**Date:** 2026-06-22
**Owner:** Max Goodman (max@bedextrous.com)
**Status:** Design — awaiting final review before implementation plan

## Goal

Reorganize all local apps/projects into a clean, predictable structure that supports:

1. **Working across devices** — pick up the same project on another machine without manual copying.
2. **Backup / safety** — nothing is lost if the machine dies.
3. **One tidy home** — projects live in one predictable place, viewable from any device/location.

## Decision: Hybrid (code local + git remotes, assets in Drive by brand)

Code projects do **not** live inside Google Drive synced folders. Putting active repos in
Drive corrupts `.git` (file-by-file sync of `.git` during operations) and thrashes the sync
engine with `node_modules`/`.next` (50k–100k+ regenerable tiny files). Instead:

- **Code** → local `~/Projects/`, each a git repo with a GitHub remote. Cross-device =
  `git clone`/`pull`; backup = GitHub history; web viewing = github.com.
- **Assets / documents** → Google Drive, separated **by brand** (entity). Cross-device +
  web viewing via Drive sync and drive.google.com.

This sidesteps Drive churn entirely: only non-code artifacts (no `node_modules`) ever sync.

### Locked decisions

| Decision | Value |
|---|---|
| Approach | Hybrid (code local, assets in Drive) |
| Drive split | By brand: bedextrous Drive for bedextrous; casaboca Drive for CasaBoca |
| Drive layout | **Fit existing folders** (`GOLEMS/`, `Dextrous Assets/`) — no new `Projects/` tree |
| Scope | All four projects |
| Local code root | `~/Projects/` |
| Repo owner | `BeDextrous` GitHub org, **private** (incl. transferring inkspotter from personal) |
| Tooling | `gh` CLI (authed as `maxsgoodman-dev`, has `repo` scope + `BeDextrous` access) |

### Reality discovered (overrides earlier assumptions)

- **inkspotter** is already a git repo at the nested path `~/inkspotter/inkspotter/`, with an
  existing remote `github.com/maxsgoodman-dev/inkspotter` (personal). Decision: **transfer to
  `BeDextrous` org**, relocate + flatten to `~/Projects/inkspotter/`, gitignore its `venv` (419M).
- **bedextrous-site** is untracked inside golem-os (576M incl. `node_modules`) → new private
  `BeDextrous/bedextrous-site` repo.
- **`tools/pinscrape`** is a small Python scraper (built the moodboard); the 161M is its `.venv`
  (regenerable, ignored by its own `.gitignore`). It **stays in the golem-os repo as code** —
  it is NOT a Drive move.
- **bedextrous Drive `My Drive/` already has an organizing scheme**: `GOLEMS/` (golem-os docs as
  gdocs), `Dextrous Assets/` (brand assets), `Pinterest/` (moodboard taxonomy). Assets fit into
  these rather than a new tree.

## Target structure

### Code — `~/Projects/` (local, never Drive-synced)

```
~/Projects/
  golem-os/          → github.com/BeDextrous/Golem-OS         (existing remote, relocated)
  bedextrous-site/   → github.com/BeDextrous/bedextrous-site  (NEW private repo, extracted from golem-os)
  inkspotter/        → github.com/BeDextrous/inkspotter        (EXISTING repo, transferred from personal + flattened)
```

### Assets — Google Drive, fitting existing folders

```
GoogleDrive-max@bedextrous.com/My Drive/
  GOLEMS/                  ← progress-archive.md, progress-archive.ipynb (golem-os docs live here)
  Dextrous Assets/
    moodboard/             ← golem-os/output/moodboard (canonical Moebius/Ed Mell reference)
  Resume - Max Goodman.pdf ← stray personal file from repo root (relocate; user may move)

GoogleDrive-max@casaboca.com/My Drive/
  CasaBoca-os/             ← entire folder as-is (Edelman legal .docx/.pptx + .gs scripts)
```

bedextrous-site and inkspotter: no asset moves required at migration time (code-required
assets stay in each repo's `public/`). Revisit if working/source assets surface.

## The rule: what stays in the repo vs moves to Drive

- **Stays in repo:** anything the app/build references — `golem-next/`, `bedextrous-site/`
  code, `supabase/`, `web/`, `data/`, `integrations/`, config files, `*.md` dev docs,
  Apps Script (`Code.gs`, `appsscript.json`, `.clasp.json`), `Index.html`, `deploy.sh`,
  `vercel.json`. `node_modules` stays local and untouched (never synced).
- **Moves to Drive:** standalone artifacts that are not code — PDFs, exports, archives,
  design/moodboard files.
- **Tracked artifacts moved to Drive** must be removed from the repo with `git rm` and the
  removal committed (so they're not duplicated in both git history-tip and Drive).
- **No symlinks** between repo and Drive — they break across devices. Keep app-required
  assets in the repo's own `public/`; only working/source/archival assets go to Drive.

### Per-project move-lists (final sign-off per project at execution time)

**golem-os → bedextrous Drive (fitting existing folders):**
- `output/moodboard` (5.6M, untracked) → `Dextrous Assets/moodboard/` — plain move.
- `progress-archive.md`, `progress-archive.ipynb` (git-tracked) → `GOLEMS/` — `git rm` + move.
- `Resume - Max Goodman.pdf` (git-tracked) → `My Drive/` root — `git rm` + move.
- `tools/pinscrape` — **stays in repo** (code; `.venv`/`output` ignored by its own `.gitignore`).
- `data/time_epoch.json` (untracked, runtime scratch) → **gitignore, stays local**, no Drive.

**bedextrous-site / inkspotter → bedextrous Drive:** no asset moves at migration time
(code-required assets stay in each repo's `public/`).

**CasaBoca-os → casaboca Drive:** whole folder moves as-is (legal docs + `.gs` scripts).
Not a code repo; no GitHub remote.

## Migration order (safety-first)

golem-os is relocated **last** because it is this session's working directory; moving it
mid-session breaks subsequent relative tooling.

1. **inkspotter** — commit/stash its 17 dirty changes; relocate+flatten
   `~/inkspotter/inkspotter` → `~/Projects/inkspotter`; transfer repo
   `maxsgoodman-dev/inkspotter` → `BeDextrous/inkspotter`; update local remote; confirm
   `venv` gitignored.
2. **CasaBoca-os** → casaboca Drive, whole folder (verify copy before removing source).
3. **Extract `bedextrous-site/`** from golem-os → `~/Projects/bedextrous-site`: move dir,
   `git init`, `.gitignore` (node_modules, .next, .env*), create `BeDextrous/bedextrous-site`
   private remote, initial commit + push.
4. **Clean golem-os git state** — add `.gitignore` entries (`.superpowers/`, `/data/`,
   `**/.venv/`); commit the leads feature WIP + `tools/pinscrape` code.
5. **Move golem-os assets to Drive** — `output/moodboard` → `Dextrous Assets/`;
   `git rm` + move `progress-archive.*` → `GOLEMS/` and `Resume*.pdf` → `My Drive/`;
   commit the removals. Verify copies synced before removing sources.
6. **Relocate golem-os** `~/golem-os` → `~/Projects/golem-os` (plain `mv`); rename the Claude
   project dir `~/.claude/projects/-Users-maxgoodman-golem-os` →
   `-Users-maxgoodman-Projects-golem-os` so history + memory follow.
7. **Update memories** — `dextrous_design_aesthetic.md` (moodboard now in Drive),
   `pinscrape_tool.md` (new repo path).
8. **Verify** — each repo builds; Drive folders visible on web; nothing app-critical left behind.
   Reopen Claude Code from `~/Projects/golem-os` after the move.

## Risks & mitigations

- **Data loss during moves** — no `rm` of originals until the destination is confirmed in
  place; use `mv` (atomic on same volume) and verify before committing git removals.
- **golem-os uncommitted work** — committed/stashed in step 1 before any restructuring.
- **Cross-volume moves to Drive** — moving into `~/Library/CloudStorage/...` is a copy+delete;
  verify the copy landed and synced before removing the source.
- **`tools/` surprise size** — inspected before a decision, not blindly moved.

## Out of scope

- The `maxsgoodman@gmail.com` Drive account (no projects mapped to it).
- Restructuring code *inside* any repo beyond extracting `bedextrous-site`.
- Setting up a second device — this design enables it (clone + Drive sign-in) but doesn't do it.
