# Golem OS — one-shot data migration

Moves rows from the Google Sheet tabs into Supabase tables, preserving hierarchy.

## Prereqs

- Node 18+ installed.
- Supabase schema already applied (see `../schema.sql`).
- A user exists in `auth.users`. Either sign into the ported app once, or add a
  user manually in Supabase dashboard → Authentication → Users.

## 1. Export the Sheet as CSVs

In the Google Sheet backing the current Apps Script app:

1. For **each** tab — `Tasks`, `Goals`, `Objectives`, `Reading`, `Notes`,
   `Links`, `Finances`, `CRM` — do:
   - File → Download → **Comma Separated Values (.csv)**.
2. Save them into `./imports/` with the filenames:
   - `Tasks.csv`, `Goals.csv`, `Objectives.csv`, `Reading.csv`,
     `Notes.csv`, `Links.csv`, `Finances.csv`, `CRM.csv`
   - (Filename must match tab name, case-sensitive.)

Missing a tab is fine — the script just skips it.

## 2. Configure credentials

```bash
cp .env.example .env
# Then edit .env and paste real values:
#   SUPABASE_SERVICE_ROLE_KEY — from dashboard → Settings → API
#   USER_ID                   — from dashboard → Authentication → Users
```

## 3. Install + run

```bash
npm install
npm run import
```

You'll see output like:

```
▶ goals        15 rows imported
▶ objectives   42 rows imported  (41 linked to goals, 1 unlinked)
▶ tasks        128 rows imported (120 linked to objectives, 8 unlinked)
▶ reading      7 rows imported
▶ notes        23 rows imported  (18 with parents, 5 unlinked)
▶ links        11 rows imported
▶ finances     204 rows imported
▶ crm          9 rows imported
✅ Import complete.
```

## What it does

- Imports base tables first (`goals`, `reading`, `finances`, `crm`).
- Builds an ID map (old sheet ID → new Supabase ID) for each table.
- Uses the map to resolve foreign keys in dependent tables:
  - `objectives.goal_id`  ← Sheet's `GoalID`
  - `tasks.objective_id`  ← Sheet's `Objective` (legacy free-text titles resolved
    by looking up Objective.Title; falls back to null)
  - `notes.parent_*_id`   ← Sheet's `ParentID` (new `"View:ID"` format is parsed;
    legacy numeric values are searched across all three target tables; free-text
    titles are matched against titles)
  - `links.parent_*_id`   ← same handling as notes
- Writes nothing if `.env` is missing or incomplete.
- Is **idempotent-safe-ish**: re-running will create duplicates, so if you need
  to restart, first truncate in Supabase SQL editor:

  ```sql
  truncate table
    public.notes, public.links, public.tasks, public.objectives,
    public.goals, public.reading, public.finances, public.crm
    restart identity cascade;
  ```

## After a successful run

- Commit the import script and README, but **not** `.env` or `imports/*.csv`
  (they're gitignored below).
- Leave the Sheet alone for now — we'll run the old and new systems in parallel
  for a week before retiring Apps Script.
