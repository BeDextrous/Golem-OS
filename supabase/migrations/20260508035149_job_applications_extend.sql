-- Applied directly to remote on 2026-05-08. Pulled via supabase_migrations table.
-- Extends job_applications with tracking fields for the career dashboard.

ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS location          TEXT,
  ADD COLUMN IF NOT EXISTS remote_type       TEXT CHECK (remote_type IN ('Remote', 'Hybrid', 'Onsite')),
  ADD COLUMN IF NOT EXISTS source            TEXT,
  ADD COLUMN IF NOT EXISTS next_action       TEXT,
  ADD COLUMN IF NOT EXISTS next_action_date  DATE;

COMMENT ON COLUMN job_applications.location         IS 'City/region of the role';
COMMENT ON COLUMN job_applications.remote_type      IS 'Remote | Hybrid | Onsite';
COMMENT ON COLUMN job_applications.source           IS 'How the role was found: Indeed, LinkedIn, Referral, Direct, etc.';
COMMENT ON COLUMN job_applications.next_action      IS 'What needs to happen next (e.g. Send cover letter, Follow up)';
COMMENT ON COLUMN job_applications.next_action_date IS 'Date by which the next action should happen';
