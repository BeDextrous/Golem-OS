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
--
-- Order of operations (important for a fresh database):
--   1. Extensions
--   2. All CREATE TABLE statements (Phase 1, then Phase 2)
--   3. FK constraint added after both phases exist
--   4. updated_at function + trigger loop
--   5. RLS policies loop
--   6. Grants
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "vector" with schema extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 1 TABLES
-- ─────────────────────────────────────────────────────────────────────────────

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
  project_id    bigint,  -- FK to projects added after projects table (see below)
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
  id               bigserial primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  company          text not null,
  role             text,
  status           text default 'Wishlist'
                   check (status in (
                     'Wishlist','Applied','Phone Screen',
                     'Interview','Offer','Accepted','Rejected'
                   )),
  date_applied     date,
  job_url          text,
  salary_range     text,
  salary_offer     text,
  notes            text,
  contact_id       bigint references public.crm(id) on delete set null,
  location         text,
  remote_type      text check (remote_type in ('Remote','Hybrid','Onsite')),
  source           text,
  next_action      text,
  next_action_date date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
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

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 2 TABLES
-- ─────────────────────────────────────────────────────────────────────────────

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
  drive_folder_url text,
  drive_folder_id   text,
  latest_update     text,
  latest_update_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists clients_user_idx on public.clients(user_id);

-- ─── PROJECTS ────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id            bigserial primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  pillar        text not null check (pillar in ('life','dextrous','work','pagemaster')),
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

-- ─── LEGAL DOCUMENTS ─────────────────────────────────────────────────────────
-- Drive-ingested (or manually added) legal work product, filed against the
-- existing clients/projects tables.
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id                bigserial PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id         bigint REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id        bigint REFERENCES public.projects(id) ON DELETE SET NULL,
  drive_file_id     text NOT NULL,
  drive_file_url    text,
  title             text NOT NULL,
  ingestion_source  text NOT NULL CHECK (ingestion_source IN ('drive_watch','manual','cowork')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS legal_documents_user_idx ON public.legal_documents(user_id);
CREATE INDEX IF NOT EXISTS legal_documents_client_idx ON public.legal_documents(client_id);
CREATE INDEX IF NOT EXISTS legal_documents_project_idx ON public.legal_documents(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS legal_documents_drive_file_idx ON public.legal_documents(drive_file_id);

-- ─── KNOWLEDGE MEMORY ────────────────────────────────────────────────────────
-- Extracted knowledge + embeddings. Embedding dimension (1536) is
-- provisional — sub-project 2 picks the actual embedding model and may
-- need `ALTER COLUMN embedding TYPE extensions.vector(N)` if it differs.
CREATE TABLE IF NOT EXISTS public.knowledge_memory (
  id                  bigserial PRIMARY KEY,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_document_id   bigint REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  client_id           bigint REFERENCES public.clients(id) ON DELETE SET NULL,
  content             text NOT NULL,
  embedding           extensions.vector(1536),
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_memory_user_idx ON public.knowledge_memory(user_id);
CREATE INDEX IF NOT EXISTS knowledge_memory_client_idx ON public.knowledge_memory(client_id);
CREATE INDEX IF NOT EXISTS knowledge_memory_document_idx ON public.knowledge_memory(legal_document_id);

-- ─── DEADLINES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deadlines (
  id                   bigserial PRIMARY KEY,
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id            bigint REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id           bigint REFERENCES public.projects(id) ON DELETE SET NULL,
  title                text NOT NULL,
  due_date             date NOT NULL,
  source_document_id   bigint REFERENCES public.legal_documents(id) ON DELETE SET NULL,
  status               text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','waived')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deadlines_user_idx ON public.deadlines(user_id);
CREATE INDEX IF NOT EXISTS deadlines_due_idx ON public.deadlines(due_date);
CREATE INDEX IF NOT EXISTS deadlines_client_idx ON public.deadlines(client_id);
CREATE INDEX IF NOT EXISTS deadlines_project_idx ON public.deadlines(project_id);
CREATE INDEX IF NOT EXISTS deadlines_source_document_idx ON public.deadlines(source_document_id);

-- ─── INGESTION LOG ───────────────────────────────────────────────────────────
-- Audit trail of ingestion activity. Written by the worker's service-role
-- key (bypasses RLS); users only need read access.
CREATE TABLE IF NOT EXISTS public.ingestion_log (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source      text NOT NULL,
  status      text NOT NULL DEFAULT 'ok',
  detail      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ingestion_log_user_idx ON public.ingestion_log(user_id);
CREATE INDEX IF NOT EXISTS ingestion_log_created_idx ON public.ingestion_log(created_at DESC);

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

-- ─────────────────────────────────────────────────────────────────────────────
-- FOREIGN KEY: tasks → projects (projects must exist first)
-- ─────────────────────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_project_id_fkey') then
    alter table public.tasks
      add constraint tasks_project_id_fkey
      foreign key (project_id) references public.projects(id) on delete set null;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at TRIGGER FUNCTION + LOOP
-- All tables exist by this point, so the loop is safe on a fresh database.
-- ─────────────────────────────────────────────────────────────────────────────
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
    'user_dashboard_config','user_pages','legal_documents','deadlines'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY
-- All tables exist by this point, so the loop is safe on a fresh database.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'goals','objectives','tasks','reading','notes','links','finances','crm',
    'job_applications','target_companies',
    'health_entries','clients','projects','invoices','knowledge_items',
    'cross_links','integration_cache','user_dashboard_config','user_pages',
    'legal_documents','knowledge_memory','deadlines'
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

-- ─── INGESTION LOG RLS ───────────────────────────────────────────────────────
-- Read-only for the owner; writes come from the worker's service_role key,
-- which bypasses RLS entirely (not in the generic loop above — it deliberately
-- gets no insert/update/delete policies for the authenticated role).
ALTER TABLE public.ingestion_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select" ON public.ingestion_log;
CREATE POLICY "owner_select" ON public.ingestion_log FOR SELECT USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTS
-- ─────────────────────────────────────────────────────────────────────────────
grant select, insert, update, delete
  on public.goals, public.objectives, public.tasks, public.reading,
     public.notes, public.links, public.finances, public.crm,
     public.job_applications, public.target_companies,
     public.health_entries, public.clients, public.projects, public.invoices,
     public.knowledge_items, public.cross_links, public.integration_cache,
     public.user_dashboard_config, public.user_pages,
     public.legal_documents, public.knowledge_memory, public.deadlines
  to authenticated;

-- ingestion_log: select-only grant, matching its select-only RLS policy
-- (writes come from the worker's service_role key, which bypasses RLS).
grant select
  on public.ingestion_log
  to authenticated;

-- Explicit sequence grants required on a fresh Supabase project (post
-- 2026-05-30, new projects get zero default privileges), so inserts into
-- the bigserial-keyed new tables can advance their sequences.
grant usage, select
  on sequence
    public.legal_documents_id_seq,
    public.knowledge_memory_id_seq,
    public.deadlines_id_seq,
    public.ingestion_log_id_seq
  to authenticated;
