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
| Scope | All four projects |
| Local code root | `~/Projects/` |
| New repo owner | `BeDextrous` GitHub org, **private** |
| Tooling | `gh` CLI (authed as `maxsgoodman-dev`, has `repo` scope + `BeDextrous` access) |

## Target structure

### Code — `~/Projects/` (local, never Drive-synced)

```
~/Projects/
  golem-os/          → github.com/BeDextrous/Golem-OS   (existing remote, relocated)
  bedextrous-site/   → github.com/BeDextrous/bedextrous-site   (NEW private repo, extracted from golem-os)
  inkspotter/        → github.com/BeDextrous/inkspotter         (NEW private repo)
```

### Assets — Google Drive, by brand

```
GoogleDrive-max@bedextrous.com/My Drive/Projects/
  golem-os/        ← output/ (incl. moodboard), Resume PDF, progress-archive.*
  bedextrous-site/ ← design source, moodboards, content drafts
  inkspotter/      ← non-code assets

GoogleDrive-max@casaboca.com/My Drive/
  CasaBoca-os/     ← entire folder as-is (Edelman legal .docx/.pptx + .gs scripts)
```

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

**golem-os → bedextrous Drive `My Drive/Projects/golem-os/`:**
- `output/` (6.2M; includes `output/moodboard` — the canonical Moebius/Ed Mell visual reference)
- `Resume - Max Goodman.pdf`
- `progress-archive.md`, `progress-archive.ipynb`
- ⚠️ `tools/` (161M) — inspect before deciding. Large for a tools dir; may contain vendored
  binaries that belong in Drive (or should be gitignored), not committed code. Decide at execution.

**bedextrous-site → bedextrous Drive:** design/source assets identified after extraction
(code stays in the repo's `public/`).

**inkspotter → bedextrous Drive:** non-code assets identified during migration.

**CasaBoca-os → casaboca Drive:** whole folder moves as-is (legal docs + `.gs` scripts).
Not a code repo; no GitHub remote.

## Migration order (safety-first)

1. **Clean golem-os git state** — commit or stash current uncommitted changes + untracked
   dirs (`bedextrous-site/`, `leads/`, `leads-view.tsx`, migration, `.superpowers/`).
   Nothing moves until the working tree is in a known state.
2. **Extract `bedextrous-site/`** from golem-os → `~/Projects/bedextrous-site`: move dir,
   `git init`, add `.gitignore` (node_modules, .next, .env*), create
   `BeDextrous/bedextrous-site` private remote, initial commit + push.
3. **Relocate golem-os** `~/golem-os` → `~/Projects/golem-os` (plain `mv`; local move of a
   git repo is safe). Verify remote + a build still work from the new path.
4. **inkspotter** `~/inkspotter` → `~/Projects/inkspotter`: `git init`, `.gitignore`,
   create `BeDextrous/inkspotter` private remote, initial commit + push.
5. **Move asset move-lists** into the brand Drive folders, per project, after sign-off.
   For tracked items, `git rm` + commit the removal.
6. **CasaBoca-os** → casaboca Drive, whole folder.
7. **Verify** — each repo builds; each Drive folder visible on web; nothing app-critical
   left behind.

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
