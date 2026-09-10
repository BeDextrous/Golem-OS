-- Contact-form submissions from the bedextrous.com marketing site.
-- Inserted server-side via service_role from the bedextrous-site Next.js app
-- (no anon insert policy — the public site never holds the service key).
-- Visible only to Max in the Golem OS dashboard (Dextrous wing).

CREATE TABLE IF NOT EXISTS public.dextrous_leads (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text NOT NULL,
  message     text,
  source      text DEFAULT 'contact_form' CHECK (source IN ('contact_form', 'booking')),
  status      text DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Qualified', 'Archived')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dextrous_leads_user_idx ON public.dextrous_leads(user_id);
CREATE INDEX IF NOT EXISTS dextrous_leads_created_idx ON public.dextrous_leads(created_at DESC);

ALTER TABLE public.dextrous_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select" ON public.dextrous_leads;
DROP POLICY IF EXISTS "owner_update" ON public.dextrous_leads;
DROP POLICY IF EXISTS "owner_delete" ON public.dextrous_leads;

CREATE POLICY "owner_select" ON public.dextrous_leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_update" ON public.dextrous_leads FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_delete" ON public.dextrous_leads FOR DELETE USING (auth.uid() = user_id);

-- Intentionally no INSERT policy for anon/authenticated roles: rows are
-- created exclusively by the bedextrous-site API route using the
-- service_role key, which bypasses RLS.
