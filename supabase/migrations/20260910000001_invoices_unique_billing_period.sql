CREATE UNIQUE INDEX IF NOT EXISTS invoices_client_billing_period_unique
  ON public.invoices (client_id, billing_period)
  WHERE billing_period IS NOT NULL;
