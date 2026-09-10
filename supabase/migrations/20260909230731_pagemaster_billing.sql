ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'none';
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_billing_type_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_billing_type_check
  CHECK (billing_type IN ('hourly','flat','none'));
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS billing_period text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS wave_invoice_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS wave_synced_at timestamptz;
