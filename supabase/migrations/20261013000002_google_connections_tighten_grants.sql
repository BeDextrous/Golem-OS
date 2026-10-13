-- Supabase's default privileges on the public schema also grant `anon` full access and give
-- `authenticated` TRUNCATE/REFERENCES/TRIGGER. RLS already hides every row from `anon`, but this
-- table holds encrypted refresh tokens, so grant only what the app needs: the signed-in role,
-- row-level CRUD (still filtered by the owner policies).
revoke all on public.google_connections from anon;
revoke truncate, references, trigger on public.google_connections from authenticated;
revoke all on sequence public.google_connections_id_seq from anon;
