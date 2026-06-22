# Cloud Project Reorg — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all four projects into a clean hybrid layout — code in `~/Projects/` backed by GitHub, assets/docs synced to Google Drive by brand — without corrupting any git repo or losing data.

**Architecture:** Code never lives in a Drive-synced folder (avoids `.git` corruption + `node_modules`/`venv` churn). Cross-device + backup for code = git remotes; for assets = Drive sync. Assets fit the existing Drive folder scheme (`GOLEMS/`, `Dextrous Assets/`).

**Tech Stack:** git, GitHub (`gh` CLI, authed `maxsgoodman-dev`, `BeDextrous` org access), Google Drive for Desktop mounts under `~/Library/CloudStorage/`.

**Spec:** `docs/superpowers/specs/2026-06-22-cloud-project-reorg-design.md`

**Safety rules (apply to every task):**
- Never `rm` a source until its destination is confirmed present.
- Use absolute paths; quote Drive paths (they contain spaces).
- Reference paths:
  - `BEDX_DRIVE = ~/Library/CloudStorage/GoogleDrive-max@bedextrous.com/My Drive`
  - `CASA_DRIVE = ~/Library/CloudStorage/GoogleDrive-max@casaboca.com/My Drive`
- **Task 6 (relocate golem-os) is last** — it moves this session's working directory and renames the Claude project dir; run it only after a checkpoint, and reopen Claude Code from the new path afterward.

---

### Task 1: inkspotter — back up, relocate+flatten, transfer to BeDextrous

**Files:**
- Move: `~/inkspotter/inkspotter/` → `~/Projects/inkspotter/`
- Modify: `~/Projects/inkspotter/.gitignore` (ensure `venv/` ignored)

- [ ] **Step 1: Confirm venv is gitignored (not tracked)**

```bash
cd ~/inkspotter/inkspotter && grep -nE 'venv' .gitignore; git ls-files venv | head
```
Expected: `.gitignore` lists `venv/`; `git ls-files venv` prints nothing (not tracked). If `venv/` is missing from `.gitignore`, add it: `printf 'venv/\n' >> .gitignore`.

- [ ] **Step 2: Back up current WIP to the existing remote first**

```bash
cd ~/inkspotter/inkspotter && git add -A && git commit -m "chore: WIP snapshot before reorg" && git push origin main
```
Expected: push succeeds to `github.com/maxsgoodman-dev/inkspotter`. (Backup exists before we touch anything.)

- [ ] **Step 3: Relocate + flatten into ~/Projects**

```bash
mkdir -p ~/Projects && mv ~/inkspotter/inkspotter ~/Projects/inkspotter && rmdir ~/inkspotter
ls -d ~/Projects/inkspotter/.git && echo OK
```
Expected: `~/Projects/inkspotter/.git` exists; old `~/inkspotter` wrapper removed.

- [ ] **Step 4: Transfer repo to BeDextrous org**

```bash
gh api -X POST repos/maxsgoodman-dev/inkspotter/transfer -f new_owner=BeDextrous
```
Expected: JSON response with `"full_name": "BeDextrous/inkspotter"`. (If it 202-accepts asynchronously, wait a few seconds.)

- [ ] **Step 5: Point local remote at the new owner and verify**

```bash
cd ~/Projects/inkspotter && git remote set-url origin https://github.com/BeDextrous/inkspotter.git && git fetch origin && git remote -v
```
Expected: origin now `BeDextrous/inkspotter`; fetch succeeds.

- [ ] **Step 6: Checkpoint** — repo lives at `~/Projects/inkspotter`, owned by BeDextrous, venv untouched/ignored. Pause for review.

---

### Task 2: CasaBoca-os → casaboca Drive

**Files:**
- Move: `~/CasaBoca-os/` → `$CASA_DRIVE/CasaBoca-os/`

- [ ] **Step 1: Copy folder into casaboca Drive (copy first, don't move yet)**

```bash
cp -R ~/CasaBoca-os "$HOME/Library/CloudStorage/GoogleDrive-max@casaboca.com/My Drive/CasaBoca-os"
```
Expected: no error.

- [ ] **Step 2: Verify the copy matches the source**

```bash
diff -rq ~/CasaBoca-os "$HOME/Library/CloudStorage/GoogleDrive-max@casaboca.com/My Drive/CasaBoca-os"
```
Expected: no output (identical). If only `.DS_Store` differs, that's fine.

- [ ] **Step 3: Remove the source after confirmed copy**

```bash
rm -rf ~/CasaBoca-os && ls -d "$HOME/Library/CloudStorage/GoogleDrive-max@casaboca.com/My Drive/CasaBoca-os" && echo MOVED
```
Expected: prints `MOVED`; `~/CasaBoca-os` gone.

- [ ] **Step 4: Checkpoint** — CasaBoca legal docs now in casaboca Drive. Pause for review.

---

### Task 3: Extract bedextrous-site → new BeDextrous repo

**Files:**
- Move: `~/golem-os/bedextrous-site/` → `~/Projects/bedextrous-site/`
- Create: `~/Projects/bedextrous-site/.gitignore`

- [ ] **Step 1: Move the project out of golem-os**

```bash
mv ~/golem-os/bedextrous-site ~/Projects/bedextrous-site && ls ~/Projects/bedextrous-site/package.json && echo OK
```
Expected: `package.json` present; `bedextrous-site/` no longer inside golem-os.

- [ ] **Step 2: Create .gitignore (exclude node_modules / build / secrets)**

```bash
cat > ~/Projects/bedextrous-site/.gitignore <<'EOF'
# dependencies
node_modules/
# next.js
.next/
out/
# env
.env
.env.local
.env*.local
# misc
.DS_Store
*.log
EOF
echo OK
```
Expected: `OK`.

- [ ] **Step 3: Initialize repo and make the first commit**

```bash
cd ~/Projects/bedextrous-site && git init -b main && git add -A && git status --short | head && git commit -m "chore: initial commit (extracted from golem-os)"
```
Expected: commit created; `git status --short` did NOT list `node_modules/` (confirms ignore works).

- [ ] **Step 4: Create the private remote and push**

```bash
cd ~/Projects/bedextrous-site && gh repo create BeDextrous/bedextrous-site --private --source=. --remote=origin --push
```
Expected: repo created at `github.com/BeDextrous/bedextrous-site`; push succeeds.

- [ ] **Step 5: Verify it builds from the new location**

```bash
cd ~/Projects/bedextrous-site && npm install && npm run build
```
Expected: install + build succeed. (If build needs env vars, note them; a successful `npm install` + typecheck is acceptable if build requires secrets.)

- [ ] **Step 6: Checkpoint** — bedextrous-site is its own repo under BeDextrous. Pause for review.

---

### Task 4: Clean golem-os git state (gitignore + commit WIP)

**Files:**
- Modify: `~/golem-os/.gitignore`
- Commit: leads feature WIP + `tools/pinscrape`

- [ ] **Step 1: Add gitignore entries for scratch/venv/runtime**

```bash
cd ~/golem-os && cat >> .gitignore <<'EOF'

# Superpowers internals
.superpowers/
# Python venvs (e.g. tools/pinscrape/.venv)
**/.venv/
# Runtime scratch
/data/
EOF
git check-ignore .superpowers data/time_epoch.json tools/pinscrape/.venv && echo "all ignored"
```
Expected: prints the three paths then `all ignored`.

- [ ] **Step 2: Stage the legitimate code (leads feature + pinscrape tool)**

```bash
cd ~/golem-os && git add -A && git status --short
```
Expected: staged = modified `golem-next/{lib/queries.ts,types/entities.ts,types/pillar.ts,types/supabase.ts}`, new `golem-next/app/(app)/dextrous/leads/`, `golem-next/components/views/leads-view.tsx`, `supabase/migrations/20260622000001_dextrous_leads.sql`, `tools/pinscrape/{scrape.py,pinscrape,README.md,.gitignore}`, `.gitignore`. NOT listed: `.superpowers/`, `data/`, `tools/pinscrape/.venv`, `output/`, `bedextrous-site/` (already moved).

- [ ] **Step 3: Commit**

```bash
cd ~/golem-os && git commit -m "feat(leads): dextrous leads view + migration; add pinscrape tool; ignore venv/scratch

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: commit succeeds.

- [ ] **Step 4: Checkpoint** — working tree clean except `output/`, `Resume*.pdf`, `progress-archive.*` (handled next). Pause for review.

---

### Task 5: Move golem-os assets to bedextrous Drive

**Files:**
- Move (untracked): `~/golem-os/output/moodboard` → `$BEDX_DRIVE/Dextrous Assets/moodboard`
- Git rm + move (tracked): `progress-archive.md`, `progress-archive.ipynb` → `$BEDX_DRIVE/GOLEMS/`; `Resume - Max Goodman.pdf` → `$BEDX_DRIVE/`

- [ ] **Step 1: Copy moodboard into Dextrous Assets, verify, then remove source**

```bash
cp -R ~/golem-os/output/moodboard "$HOME/Library/CloudStorage/GoogleDrive-max@bedextrous.com/My Drive/Dextrous Assets/moodboard"
diff -rq ~/golem-os/output/moodboard "$HOME/Library/CloudStorage/GoogleDrive-max@bedextrous.com/My Drive/Dextrous Assets/moodboard"
```
Expected: `diff` prints nothing (or only `.DS_Store`). Then:
```bash
rm -rf ~/golem-os/output && echo "moodboard moved"
```
Expected: `moodboard moved` (the only thing in `output/` was `moodboard`).

- [ ] **Step 2: Copy tracked docs to Drive, verify**

```bash
cp ~/golem-os/progress-archive.md ~/golem-os/progress-archive.ipynb "$HOME/Library/CloudStorage/GoogleDrive-max@bedextrous.com/My Drive/GOLEMS/"
cp "$HOME/golem-os/Resume - Max Goodman.pdf" "$HOME/Library/CloudStorage/GoogleDrive-max@bedextrous.com/My Drive/"
ls "$HOME/Library/CloudStorage/GoogleDrive-max@bedextrous.com/My Drive/GOLEMS/progress-archive.md" "$HOME/Library/CloudStorage/GoogleDrive-max@bedextrous.com/My Drive/Resume - Max Goodman.pdf" && echo COPIED
```
Expected: `COPIED`.

- [ ] **Step 3: git rm the tracked files and commit the removal**

```bash
cd ~/golem-os && git rm "progress-archive.md" "progress-archive.ipynb" "Resume - Max Goodman.pdf"
git commit -m "chore: move archives + resume to Drive (GOLEMS / My Drive)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git status --short
```
Expected: files removed from repo; `git status` clean.

- [ ] **Step 4: Push golem-os so the cleaned state is backed up**

```bash
cd ~/golem-os && git push origin main
```
Expected: push succeeds to `BeDextrous/Golem-OS`.

- [ ] **Step 5: Checkpoint** — golem-os assets in Drive, repo clean + pushed. Pause for review.

---

### Task 6: Relocate golem-os + carry over Claude project dir (LAST — session-disruptive)

**Files:**
- Move: `~/golem-os/` → `~/Projects/golem-os/`
- Rename: `~/.claude/projects/-Users-maxgoodman-golem-os` → `-Users-maxgoodman-Projects-golem-os`

- [ ] **Step 1: Relocate the repo**

```bash
mv ~/golem-os ~/Projects/golem-os && cd ~/Projects/golem-os && git remote -v && git status --short && echo OK
```
Expected: remote intact, clean tree, `OK`.

- [ ] **Step 2: Carry over Claude Code project history + memory to the new path key**

```bash
mv ~/.claude/projects/-Users-maxgoodman-golem-os ~/.claude/projects/-Users-maxgoodman-Projects-golem-os
ls ~/.claude/projects/-Users-maxgoodman-Projects-golem-os/memory/MEMORY.md && echo OK
```
Expected: `OK`. (Best run when no active Claude Code session is using the old golem-os path — see Step 4.)

- [ ] **Step 3: Verify the app still builds from the new path**

```bash
cd ~/Projects/golem-os/golem-next && npm install && npm run build
```
Expected: install + build succeed.

- [ ] **Step 4: Reopen Claude Code from the new location**

After this task, quit this Claude Code session and relaunch from `~/Projects/golem-os`. The renamed project dir means your history + memory follow to the new path. (If the rename in Step 2 can't happen while this session is live, do it as the very last action after quitting.)

---

### Task 7: Update memories for moved paths

**Files:**
- Modify: `~/.claude/projects/-Users-maxgoodman-Projects-golem-os/memory/dextrous_design_aesthetic.md`
- Modify: `~/.claude/projects/-Users-maxgoodman-Projects-golem-os/memory/pinscrape_tool.md`

- [ ] **Step 1: Update the moodboard location memory**

Edit `dextrous_design_aesthetic.md`: change the canonical moodboard path to
`~/Library/CloudStorage/GoogleDrive-max@bedextrous.com/My Drive/Dextrous Assets/moodboard`.

- [ ] **Step 2: Update the pinscrape tool memory**

Edit `pinscrape_tool.md`: update any project path reference from `~/golem-os/tools/pinscrape`
to `~/Projects/golem-os/tools/pinscrape`.

- [ ] **Step 3: Verify**

```bash
grep -l "Dextrous Assets/moodboard" ~/.claude/projects/-Users-maxgoodman-Projects-golem-os/memory/dextrous_design_aesthetic.md && echo OK
```
Expected: `OK`.

---

### Task 8: Final verification

- [ ] **Step 1: All repos in place under ~/Projects**

```bash
for r in golem-os bedextrous-site inkspotter; do echo "== $r =="; git -C ~/Projects/$r remote -v | head -1; git -C ~/Projects/$r status --short | head; done
```
Expected: three repos, correct remotes (`BeDextrous/Golem-OS`, `BeDextrous/bedextrous-site`, `BeDextrous/inkspotter`), clean-ish trees.

- [ ] **Step 2: Assets visible in Drive**

```bash
ls "$HOME/Library/CloudStorage/GoogleDrive-max@bedextrous.com/My Drive/Dextrous Assets/moodboard" | head
ls "$HOME/Library/CloudStorage/GoogleDrive-max@bedextrous.com/My Drive/GOLEMS/progress-archive.md"
ls "$HOME/Library/CloudStorage/GoogleDrive-max@casaboca.com/My Drive/CasaBoca-os" | head
```
Expected: moodboard files, the archive, and CasaBoca docs all present.

- [ ] **Step 3: No leftover project dirs in home**

```bash
ls -d ~/golem-os ~/inkspotter ~/CasaBoca-os 2>&1 | head
```
Expected: all three report "No such file or directory" (everything relocated).

- [ ] **Step 4: Confirm Drive web view** — open drive.google.com as max@bedextrous.com and max@casaboca.com; confirm moodboard / GOLEMS / CasaBoca-os are syncing (uploads may finish in background).

---

## Notes / known follow-ups
- bedextrous-site `npm run build` may need env vars; a clean `npm install` + typecheck is acceptable verification if build requires secrets.
- inkspotter repo transfer requires org permission on BeDextrous (you have it). If the API call needs the repo to be unblocked from transfer, do it via GitHub web settings instead.
- This session's working directory becomes invalid after Task 6; relaunch Claude Code from `~/Projects/golem-os`.
