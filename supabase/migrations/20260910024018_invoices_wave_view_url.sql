-- Add wave_view_url column to invoices table
-- Stores the direct URL to view the invoice in Wave for easy access from the billing UI
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS wave_view_url text;
