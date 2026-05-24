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
  pillar      text check (pillar in ('life','dextrous','work')),
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
  pillar         text check (pillar in ('life','dextrous','work')),
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
  pillar        text check (pillar in ('life','dextrous','work')),
  client_id     bigint references public.crm(id) on delete set null,
  project_id    bigint,  -- FK to projects added after projects table
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
  pillar                text check (pillar in ('life','dextrous','work')),
  drafts_uuid           text,
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
  pillar                text check (pillar in ('life','dextrous','work')),
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
  pillar      text check (pillar in ('life','dextrous','work')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists finances_user_idx on public.finances(user_id);
create index if not exists finances_date_idx on public.finances(entry_date);

-- ─── CRM ─────────────────────────────────────────────────────────────────────
create table if not exists public.crm (
  id                 bigserial primary key,
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  role               text,
  company            text,
  email              text,
  linkedin_url       text,
  last_contact_date  date,
  tags               text,
  pillar             text check (pillar in ('life','dextrous','work')),
  interaction_log    text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists crm_user_idx on public.crm(user_id);

-- ─── JOB APPLICATIONS ────────────────────────────────────────────────────────
create table if not exists public.job_applications (
  id              bigserial primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  company         text not null,
  role            text,
  status          text default 'Wishlist'
                  check (status in (
                    'Wishlist','Applied','Phone Screen',
                    'Interview','Offer','Accepted','Rejected'
                  )),
  date_applied    date,
  job_url         text,
  salary_range    text,
  salary_offer    text,
  notes           text,
  contact_id      bigint references public.crm(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists job_applications_user_idx on public.job_applications(user_id);

-- ─── TARGET COMPANIES ────────────────────────────────────────────────────────
create table if not exists public.target_companies (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  industry     text,
  website      text,
  notes        text,
  priority     text check (priority in ('High','Medium','Low')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists target_companies_user_idx on public.target_companies(user_id);

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
  foreach t in array array[
    'goals','objectives','tasks','reading','notes','links','finances','crm',
    'job_applications','target_companies',
    'health_entries','clients','projects','invoices','knowledge_items',
    'user_dashboard_config','user_pages'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ─── ROW-LEVEL SECURITY ──────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'goals','objectives','tasks','reading','notes','links','finances','crm',
    'job_applications','target_companies',
    'health_entries','clients','projects','invoices','knowledge_items',
    'cross_links','integration_cache','user_dashboard_config','user_pages'
  ]
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

-- ─── HEALTH ENTRIES ──────────────────────────────────────────────────────────
create table if not exists public.health_entries (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  entry_date  date not null default current_date,
  category    text not null check (category in ('sleep','exercise','nutrition','weight','mood','notes')),
  value       numeric,
  unit        text,
  label       text,
  notes       text,
  source      text default 'manual' check (source in ('manual','oura','apple_health')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists health_entries_user_date_idx on public.health_entries(user_id, entry_date);

-- ─── CLIENTS ─────────────────────────────────────────────────────────────────
create table if not exists public.clients (
  id              bigserial primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  company         text,
  status          text default 'Active' check (status in ('Prospect','Active','Paused','Closed')),
  contract_value  numeric(14,2),
  currency        text default 'USD',
  start_date      date,
  end_date        date,
  notes           text,
  contact_id      bigint references public.crm(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists clients_user_idx on public.clients(user_id);

-- ─── PROJECTS ────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id            bigserial primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  pillar        text not null check (pillar in ('life','dextrous','work')),
  project_type  text default 'personal' check (project_type in ('client','personal','work')),
  client_id     bigint references public.clients(id) on delete set null,
  status        text default 'Active' check (status in ('Planned','Active','On Hold','Done','Cancelled')),
  start_date    date,
  end_date      date,
  description   text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists projects_user_idx on public.projects(user_id);
create index if not exists projects_pillar_idx on public.projects(pillar);

alter table public.tasks
  add constraint if not exists tasks_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete set null;

-- ─── INVOICES ────────────────────────────────────────────────────────────────
create table if not exists public.invoices (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  client_id    bigint references public.clients(id) on delete set null,
  amount       numeric(14,2) not null,
  currency     text default 'USD',
  status       text default 'Draft' check (status in ('Draft','Sent','Paid','Overdue','Cancelled')),
  issued_date  date default current_date,
  due_date     date,
  paid_date    date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists invoices_user_idx on public.invoices(user_id);
create index if not exists invoices_client_idx on public.invoices(client_id);

-- ─── KNOWLEDGE ITEMS ─────────────────────────────────────────────────────────
create table if not exists public.knowledge_items (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  content     text,
  tags        text,
  source_url  text,
  project_id  bigint references public.projects(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists knowledge_user_idx on public.knowledge_items(user_id);

-- ─── CROSS LINKS ─────────────────────────────────────────────────────────────
create table if not exists public.cross_links (
  id                 bigserial primary key,
  user_id            uuid not null references auth.users(id) on delete cascade,
  source_table       text not null,
  source_id          bigint not null,
  target_table       text not null,
  target_id          bigint not null,
  relationship_label text,
  created_at         timestamptz not null default now()
);
create index if not exists cross_links_user_idx on public.cross_links(user_id);

-- ─── INTEGRATION CACHE ───────────────────────────────────────────────────────
create table if not exists public.integration_cache (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  source     text not null,
  data       jsonb not null default '{}',
  fetched_at timestamptz not null default now(),
  constraint integration_cache_user_source_unique unique (user_id, source)
);
create index if not exists integration_cache_user_idx on public.integration_cache(user_id);

-- ─── USER DASHBOARD CONFIG ───────────────────────────────────────────────────
create table if not exists public.user_dashboard_config (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  dashboard  text not null,
  config     jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  constraint user_dashboard_config_unique unique (user_id, dashboard)
);

-- ─── USER PAGES ──────────────────────────────────────────────────────────────
create table if not exists public.user_pages (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  pillar     text not null check (pillar in ('life','dextrous','work')),
  slug       text not null,
  title      text not null,
  icon       text,
  data_type  text,
  config     jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_pages_user_pillar_slug_unique unique (user_id, pillar, slug)
);

-- ─── GRANTS ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete
  on public.goals, public.objectives, public.tasks, public.reading,
     public.notes, public.links, public.finances, public.crm,
     public.job_applications, public.target_companies,
     public.health_entries, public.clients, public.projects, public.invoices,
     public.knowledge_items, public.cross_links, public.integration_cache,
     public.user_dashboard_config, public.user_pages
  to authenticated;
