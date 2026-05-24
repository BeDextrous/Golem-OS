-- Grant Data API access to all public schema tables for the authenticated role.
-- Required as of Supabase's May 30 2026 change: new projects no longer expose
-- public schema tables to PostgREST/supabase-js without an explicit GRANT.
-- Existing projects are affected from October 30 2026.
-- All tables use RLS policies (auth.uid() = user_id), so only authenticated
-- role needs access — anon is intentionally excluded.

grant select, insert, update, delete
  on public.goals,
     public.objectives,
     public.tasks,
     public.reading,
     public.notes,
     public.links,
     public.finances,
     public.crm,
     public.job_applications,
     public.target_companies
  to authenticated;
