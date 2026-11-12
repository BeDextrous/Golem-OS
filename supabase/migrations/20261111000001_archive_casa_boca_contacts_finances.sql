-- Finish archiving Casa Boca (previously SuperDigital / Mothership HQ): its CRM contacts and the income
-- entries recorded for its invoices. Archived rows are hidden by the app but stay in the database;
-- restore with:  update <table> set archived_at = null where ...

begin;

alter table public.crm      add column if not exists archived_at timestamptz;
alter table public.finances add column if not exists archived_at timestamptz;

update public.crm
   set archived_at = now()
 where archived_at is null
   and company in ('SuperDigital, LLC', 'Mothership HQ LLC', 'Superdigital LLC');

update public.finances
   set archived_at = now()
 where archived_at is null
   and label ~* '^(superdigital|mothership)';

commit;
