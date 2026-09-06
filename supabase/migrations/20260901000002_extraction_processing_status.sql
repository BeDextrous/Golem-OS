-- supabase/migrations/20260901000002_extraction_processing_status.sql
ALTER TABLE public.legal_documents DROP CONSTRAINT IF EXISTS legal_documents_extraction_status_check;
ALTER TABLE public.legal_documents ADD CONSTRAINT legal_documents_extraction_status_check
  CHECK (extraction_status IN ('pending','processing','done','failed'));
