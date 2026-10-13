-- Recorded from the live database (applied 2026-09-11 outside the repo); content copied verbatim
-- from supabase_migrations.schema_migrations so local history matches remote.
--
-- rls_auto_enable() is an event-trigger handler (RETURNS event_trigger); it is invoked
-- automatically by the DDL event trigger and does not need to be callable directly.
-- It was PUBLIC-executable by default, which exposed it as a PostgREST RPC endpoint
-- callable by anon/authenticated. Revoke direct EXECUTE from API-facing roles.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
