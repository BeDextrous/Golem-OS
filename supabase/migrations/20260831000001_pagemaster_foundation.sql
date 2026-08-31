-- supabase/migrations/20260831000001_pagemaster_foundation.sql
-- Pagemaster foundation: pgvector extension, new tables, and 'pagemaster'
-- as a valid pillar value on public.projects.

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Allow projects to belong to the new Pagemaster pillar.
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_pillar_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_pillar_check
  CHECK (pillar IN ('life','dextrous','work','pagemaster'));

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

-- updated_at triggers (function already exists — defined in schema.sql)
DROP TRIGGER IF EXISTS legal_documents_set_updated_at ON public.legal_documents;
CREATE TRIGGER legal_documents_set_updated_at BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS deadlines_set_updated_at ON public.deadlines;
CREATE TRIGGER deadlines_set_updated_at BEFORE UPDATE ON public.deadlines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row-level security
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select" ON public.legal_documents;
DROP POLICY IF EXISTS "owner_insert" ON public.legal_documents;
DROP POLICY IF EXISTS "owner_update" ON public.legal_documents;
DROP POLICY IF EXISTS "owner_delete" ON public.legal_documents;
CREATE POLICY "owner_select" ON public.legal_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert" ON public.legal_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update" ON public.legal_documents FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_delete" ON public.legal_documents FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_select" ON public.knowledge_memory;
DROP POLICY IF EXISTS "owner_insert" ON public.knowledge_memory;
DROP POLICY IF EXISTS "owner_update" ON public.knowledge_memory;
DROP POLICY IF EXISTS "owner_delete" ON public.knowledge_memory;
CREATE POLICY "owner_select" ON public.knowledge_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert" ON public.knowledge_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update" ON public.knowledge_memory FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_delete" ON public.knowledge_memory FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_select" ON public.deadlines;
DROP POLICY IF EXISTS "owner_insert" ON public.deadlines;
DROP POLICY IF EXISTS "owner_update" ON public.deadlines;
DROP POLICY IF EXISTS "owner_delete" ON public.deadlines;
CREATE POLICY "owner_select" ON public.deadlines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert" ON public.deadlines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update" ON public.deadlines FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_delete" ON public.deadlines FOR DELETE USING (auth.uid() = user_id);

-- ingestion_log: read-only for the owner; writes come from the worker's
-- service_role key, which bypasses RLS entirely.
DROP POLICY IF EXISTS "owner_select" ON public.ingestion_log;
CREATE POLICY "owner_select" ON public.ingestion_log FOR SELECT USING (auth.uid() = user_id);

-- ─── Grants for new tables ────────────────────────────────────────────────────
-- Supabase revokes default public-schema privileges on existing projects
-- starting 2026-10-30 (see 20260514000000_grant_data_api_access.sql); without
-- explicit grants these tables would become inaccessible via the Data API.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.legal_documents,
     public.knowledge_memory,
     public.deadlines
  TO authenticated;

GRANT SELECT
  ON public.ingestion_log
  TO authenticated;

GRANT USAGE, SELECT
  ON SEQUENCE
    public.legal_documents_id_seq,
    public.knowledge_memory_id_seq,
    public.deadlines_id_seq,
    public.ingestion_log_id_seq
  TO authenticated;
