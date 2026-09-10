-- supabase/migrations/20260727173753_add_workspace_group_to_clients.sql
-- Reconstructed from the live migration ledger (supabase_migrations.schema_migrations)
-- via `supabase db query`; no local file existed for this applied migration.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS workspace_group text;

COMMENT ON COLUMN public.clients.workspace_group IS
  'Optional parent workspace grouping for display under the Work pillar (e.g. ''dextrous''). NULL = standalone workspace directly under Work.';
