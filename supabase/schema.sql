-- ─────────────────────────────────────────────────────────────────────────────
-- Golem OS — Supabase schema
-- Run this in the Supabase SQL editor for project wllsrdfflaudwhfpxzfe.
--
-- Design notes:
--   * All user-facing data is keyed to auth.users via user_id (future-proof for
--     multi-user; currently one user). RLS restricts every row to its owner.
--   * IDs are bigserial so legacy numeric IDs can be preserved on import.
--   * Hierarchy is enforced with real FKs instead of stringly-typed IDs:
--       objectives.goal_id     → goals.id
--       tasks.objective_id     → objectives.id
--     notes.parent_* and links.parent_* use three nullable FKs + a check
--     constraint (cleaner than a polymorphic string pair).
--   * Status / Priority are TEXT with CHECK constraints rather than enums —
--     easier to evolve without ALTER TYPE dances.
--   * UI labels ("Task Name", "Due Date", etc.) live in the frontend mapping.
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions
create extension if not exists "pgcrypto";

-- ─── GOALS ───────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  area        text,
  status      text default 'Active' check (status in ('Active','Paused','Done')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals(user_id);

-- ─── OBJECTIVES ──────────────────────────────────────────────────────────────
create table if not exists public.objectives (
  id             bigserial primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  goal_id        bigint references public.goals(id) on delete set null,
  title          text not null,
  target_value   numeric,
  current_value  numeric,
  metric_unit    text,
  deadline       date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists objectives_user_idx on public.objectives(user_id);
create index if not exists objectives_goal_idx on public.objectives(goal_id);

-- ─── TASKS ───────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id            bigserial primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  objective_id  bigint references public.objectives(id) on delete set null,
  name          text not null,
  status        text default 'Active'
                check (status in ('To Do','Active','On Hold','Done')),
  due_date      date,
  area          text,
  priority      text check (priority in ('High','Medium','Low')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists tasks_user_idx on public.tasks(user_id);
create index if not exists tasks_objective_idx on public.tasks(objective_id);

-- ─── READING ─────────────────────────────────────────────────────────────────
create table if not exists public.reading (
  id            bigserial primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  book_title    text not null,
  author        text,
  status        text default 'Want to Read'
                check (status in ('Want to Read','Reading','Paused','Read')),
  progress_pct  int check (progress_pct between 0 and 100),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists reading_user_idx on public.reading(user_id);

-- ─── NOTES ───────────────────────────────────────────────────────────────────
-- Parent can be exactly one of goal / objective / task, or none.
create table if not exists public.notes (
  id                    bigserial primary key,
  user_id               uuid not null references auth.users(id) on delete cascade,
  title                 text,
  content               text,
  tags                  text,
  parent_goal_id        bigint references public.goals(id)      on delete set null,
  parent_objective_id   bigint references public.objectives(id) on delete set null,
  parent_task_id        bigint references public.tasks(id)      on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint notes_single_parent check (
    (case when parent_goal_id      is not null then 1 else 0 end) +
    (case when parent_objective_id is not null then 1 else 0 end) +
    (case when parent_task_id      is not null then 1 else 0 end) <= 1
  )
);
create index if not exists notes_user_idx on public.notes(user_id);

-- ─── LINKS ───────────────────────────────────────────────────────────────────
create table if not exists public.links (
  id                    bigserial primary key,
  user_id               uuid not null references auth.users(id) on delete cascade,
  title                 text,
  url                   text not null,
  website               text,
  date_added            date default current_date,
  parent_goal_id        bigint references public.goals(id)      on delete set null,
  parent_objective_id   bigint references public.objectives(id) on delete set null,
  parent_task_id        bigint references public.tasks(id)      on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint links_single_parent check (
    (case when parent_goal_id      is not null then 1 else 0 end) +
    (case when parent_objective_id is not null then 1 else 0 end) +
    (case when parent_task_id      is not null then 1 else 0 end) <= 1
  )
);
create index if not exists links_user_idx on public.links(user_id);

-- ─── FINANCES ────────────────────────────────────────────────────────────────
create table if not exists public.finances (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  entry_date  date not null default current_date,
  label       text,
  category    text,
  amount      numeric(14,2) not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists finances_user_idx on public.finances(user_id);
create index if not exists finances_date_idx on public.finances(entry_date);

-- ─── CRM ─────────────────────────────────────────────────────────────────────
create table if not exists public.crm (
  id               bigserial primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  role             text,
  company          text,
  interaction_log  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists crm_user_idx on public.crm(user_id);

-- ─── updated_at triggers ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['goals','objectives','tasks','reading','notes','links','finances','crm']
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ─── ROW-LEVEL SECURITY ──────────────────────────────────────────────────────
-- Every table: only the owning user can see / write their rows.
do $$
declare t text;
begin
  foreach t in array array['goals','objectives','tasks','reading','notes','links','finances','crm']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner_select" on public.%I', t);
    execute format('drop policy if exists "owner_insert" on public.%I', t);
    execute format('drop policy if exists "owner_update" on public.%I', t);
    execute format('drop policy if exists "owner_delete" on public.%I', t);

    execute format($f$
      create policy "owner_select" on public.%I
        for select using (auth.uid() = user_id)
    $f$, t);
    execute format($f$
      create policy "owner_insert" on public.%I
        for insert with check (auth.uid() = user_id)
    $f$, t);
    execute format($f$
      create policy "owner_update" on public.%I
        for update using (auth.uid() = user_id)
                  with check (auth.uid() = user_id)
    $f$, t);
    execute format($f$
      create policy "owner_delete" on public.%I
        for delete using (auth.uid() = user_id)
    $f$, t);
  end loop;
end $$;
