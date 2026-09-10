-- supabase/migrations/20260901000001_pagemaster_knowledge_engine.sql
-- Sub-project 2: Drive-folder mapping for projects, an extraction work
-- queue on legal_documents, the memory-doc file pointer on clients, and
-- widening deadlines.status to include 'needs_review'.

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS drive_folder_id text;

ALTER TABLE public.legal_documents ADD COLUMN IF NOT EXISTS extraction_status text
  NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending','done','failed'));
CREATE INDEX IF NOT EXISTS legal_documents_extraction_status_idx
  ON public.legal_documents(extraction_status) WHERE extraction_status = 'pending';

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS memory_doc_file_id text;

ALTER TABLE public.deadlines DROP CONSTRAINT IF EXISTS deadlines_status_check;
ALTER TABLE public.deadlines ADD CONSTRAINT deadlines_status_check
  CHECK (status IN ('needs_review','open','done','waived'));

-- knowledge_memory is empty (nothing has populated it yet — confirmed via
-- sub-project 1's own testing), so this type change is safe with no data
-- migration needed. 768 dims matches Gemini's text-embedding-004.
ALTER TABLE public.knowledge_memory ALTER COLUMN embedding TYPE extensions.vector(768);
