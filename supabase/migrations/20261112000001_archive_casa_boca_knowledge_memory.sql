-- Archive Pagemaster knowledge_memory rows that reference Casa Boca. Hidden by the app, kept in the table.
-- Restore with:  update public.knowledge_memory set archived_at = null where ...

begin;

alter table public.knowledge_memory add column if not exists archived_at timestamptz;

update public.knowledge_memory
   set archived_at = now()
 where archived_at is null
   and (content ilike '%casaboca%' or content ilike '%casa boca%');

commit;
