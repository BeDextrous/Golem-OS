-- Palette Media replaces the Work pillar, and everything in Work (including all Casa Boca items) is archived.
--
-- 1. archived_at on the tables whose rows are being archived. Archived rows are hidden by the app's
--    queries but stay in the database; restore with:  update <table> set archived_at = null where ...
-- 2. 'palette' becomes a valid pillar. 'work' stays valid in the CHECK constraints ONLY so the archived
--    rows keep their original pillar; the app no longer writes it.
-- 3. Archive the data.
--
-- Backward compatible with the currently deployed code (nullable columns, wider constraints), though the
-- old Work pages will show empty once step 3 runs. Apply this BEFORE deploying the code that filters on
-- archived_at.

begin;

-- 1) archived_at ---------------------------------------------------------------------------------------------
alter table public.tasks      add column if not exists archived_at timestamptz;
alter table public.goals      add column if not exists archived_at timestamptz;
alter table public.objectives add column if not exists archived_at timestamptz;
alter table public.clients    add column if not exists archived_at timestamptz;
alter table public.invoices   add column if not exists archived_at timestamptz;

-- 2) 'palette' pillar -----------------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['crm','finances','goals','links','notes','objectives','tasks','user_pages'] loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_pillar_check');
    execute format(
      'alter table public.%I add constraint %I check (pillar in (''life'',''dextrous'',''work'',''palette''))',
      t, t || '_pillar_check');
  end loop;
end $$;

alter table public.projects drop constraint if exists projects_pillar_check;
alter table public.projects add constraint projects_pillar_check
  check (pillar in ('life','dextrous','work','pagemaster','palette'));

-- 3) archive: all Work-pillar items + all Casa Boca items ---------------------------------------------------
update public.tasks      set archived_at = now() where pillar = 'work' and archived_at is null;
update public.goals      set archived_at = now() where pillar = 'work' and archived_at is null;
update public.objectives set archived_at = now()
  where archived_at is null
    and (pillar = 'work' or goal_id in (select id from public.goals where pillar = 'work'));

-- Casa Boca client: closed, and billing switched off so no further invoices are auto-drafted
update public.clients
   set archived_at = now(), status = 'Closed', billing_type = 'none'
 where name = 'Casa Boca' and archived_at is null;

update public.invoices set archived_at = now()
 where archived_at is null
   and client_id in (select id from public.clients where name = 'Casa Boca');

commit;
