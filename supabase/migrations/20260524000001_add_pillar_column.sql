-- ─── Migration: add pillar column to existing tables ─────────────────────────
-- Adds nullable pillar column to all content tables.
-- Rows are assigned pillar values by the one-shot tag-pillars.mjs script.
-- Also adds client_id and project_id FKs to tasks (nullable; tasks→projects FK
-- is added after the projects table is created in migration 20260524000002).

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS pillar text
    CHECK (pillar IN ('life','dextrous','work'));

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS pillar text
    CHECK (pillar IN ('life','dextrous','work'));

ALTER TABLE public.objectives
  ADD COLUMN IF NOT EXISTS pillar text
    CHECK (pillar IN ('life','dextrous','work'));

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS pillar text
    CHECK (pillar IN ('life','dextrous','work'));

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS drafts_uuid text;

ALTER TABLE public.links
  ADD COLUMN IF NOT EXISTS pillar text
    CHECK (pillar IN ('life','dextrous','work'));

ALTER TABLE public.finances
  ADD COLUMN IF NOT EXISTS pillar text
    CHECK (pillar IN ('life','dextrous','work'));

ALTER TABLE public.crm
  ADD COLUMN IF NOT EXISTS pillar text
    CHECK (pillar IN ('life','dextrous','work'));

-- client_id + project_id on tasks (project FK added in migration 20260524000002)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS client_id bigint
    REFERENCES public.crm(id) ON DELETE SET NULL;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS project_id bigint;

-- Grant new columns to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objectives TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm TO authenticated;
