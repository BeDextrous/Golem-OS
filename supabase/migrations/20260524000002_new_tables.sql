-- ─── Migration: new Phase 2 tables ───────────────────────────────────────────
-- Creates health_entries, clients, projects, invoices, knowledge_items,
-- cross_links, integration_cache, user_dashboard_config, user_pages.
-- Adds FK tasks→projects now that projects table exists.
-- Adds updated_at triggers and RLS for all new tables.

-- ─── HEALTH ENTRIES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.health_entries (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date  date NOT NULL DEFAULT current_date,
  category    text NOT NULL CHECK (category IN ('sleep','exercise','nutrition','weight','mood','notes')),
  value       numeric,
  unit        text,
  label       text,
  notes       text,
  source      text DEFAULT 'manual' CHECK (source IN ('manual','oura','apple_health')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS health_entries_user_date_idx ON public.health_entries(user_id, entry_date);

-- ─── CLIENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id              bigserial PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  company         text,
  status          text DEFAULT 'Active' CHECK (status IN ('Prospect','Active','Paused','Closed')),
  contract_value  numeric(14,2),
  currency        text DEFAULT 'USD',
  start_date      date,
  end_date        date,
  notes           text,
  contact_id      bigint REFERENCES public.crm(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clients_user_idx ON public.clients(user_id);

-- ─── PROJECTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id            bigserial PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  pillar        text NOT NULL CHECK (pillar IN ('life','dextrous','work')),
  project_type  text DEFAULT 'personal' CHECK (project_type IN ('client','personal','work')),
  client_id     bigint REFERENCES public.clients(id) ON DELETE SET NULL,
  status        text DEFAULT 'Active' CHECK (status IN ('Planned','Active','On Hold','Done','Cancelled')),
  start_date    date,
  end_date      date,
  description   text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_user_idx ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS projects_pillar_idx ON public.projects(pillar);

-- FK from tasks → projects (project_id column added in migration 20260524000001)
ALTER TABLE public.tasks
  ADD CONSTRAINT IF NOT EXISTS tasks_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- ─── INVOICES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id           bigserial PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id    bigint REFERENCES public.clients(id) ON DELETE SET NULL,
  amount       numeric(14,2) NOT NULL,
  currency     text DEFAULT 'USD',
  status       text DEFAULT 'Draft' CHECK (status IN ('Draft','Sent','Paid','Overdue','Cancelled')),
  issued_date  date DEFAULT current_date,
  due_date     date,
  paid_date    date,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_user_idx ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS invoices_client_idx ON public.invoices(client_id);

-- ─── KNOWLEDGE ITEMS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.knowledge_items (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  content     text,
  tags        text,
  source_url  text,
  project_id  bigint REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_user_idx ON public.knowledge_items(user_id);

-- ─── CROSS LINKS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cross_links (
  id                 bigserial PRIMARY KEY,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_table       text NOT NULL,
  source_id          bigint NOT NULL,
  target_table       text NOT NULL,
  target_id          bigint NOT NULL,
  relationship_label text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cross_links_user_idx ON public.cross_links(user_id);

-- ─── INTEGRATION CACHE ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integration_cache (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source     text NOT NULL,
  data       jsonb NOT NULL DEFAULT '{}',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_cache_user_source_unique UNIQUE (user_id, source)
);
CREATE INDEX IF NOT EXISTS integration_cache_user_idx ON public.integration_cache(user_id);

-- ─── USER DASHBOARD CONFIG ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_dashboard_config (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard  text NOT NULL,
  config     jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_dashboard_config_unique UNIQUE (user_id, dashboard)
);

-- ─── USER PAGES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_pages (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pillar     text NOT NULL CHECK (pillar IN ('life','dextrous','work')),
  slug       text NOT NULL,
  title      text NOT NULL,
  icon       text,
  data_type  text,
  config     jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_pages_user_pillar_slug_unique UNIQUE (user_id, pillar, slug)
);

-- ─── updated_at triggers for new tables ──────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'health_entries','clients','projects','invoices',
    'knowledge_items','user_dashboard_config','user_pages'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_set_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- ─── RLS for all new tables ──────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'health_entries','clients','projects','invoices',
    'knowledge_items','cross_links','integration_cache',
    'user_dashboard_config','user_pages'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "owner_select" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "owner_insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "owner_update" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "owner_delete" ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY "owner_select" ON public.%I FOR SELECT USING (auth.uid() = user_id)
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "owner_insert" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "owner_update" ON public.%I FOR UPDATE
        USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "owner_delete" ON public.%I FOR DELETE USING (auth.uid() = user_id)
    $f$, t);
  END LOOP;
END $$;

-- ─── Grants for new tables ────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.health_entries,
     public.clients,
     public.projects,
     public.invoices,
     public.knowledge_items,
     public.cross_links,
     public.integration_cache,
     public.user_dashboard_config,
     public.user_pages
  TO authenticated;

GRANT USAGE, SELECT
  ON SEQUENCE
    public.health_entries_id_seq,
    public.clients_id_seq,
    public.projects_id_seq,
    public.invoices_id_seq,
    public.knowledge_items_id_seq,
    public.cross_links_id_seq,
    public.integration_cache_id_seq,
    public.user_dashboard_config_id_seq,
    public.user_pages_id_seq
  TO authenticated;
