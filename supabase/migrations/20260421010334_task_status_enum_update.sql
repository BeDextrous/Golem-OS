-- Task status enum update: In Progress/Blocked/Paused → To Do/On Hold.
--
-- Frontend now offers ("To Do", "Active", "On Hold", "Done"). Existing rows
-- carrying legacy labels are normalized first, then the CHECK constraint is
-- swapped so Postgres accepts the new values.
--
-- Safe to run on a fresh DB — the UPDATEs are no-ops if no legacy values
-- exist, and the constraint swap is idempotent because the `add constraint`
-- uses a distinct name from whatever previously existed.

begin;

-- 1) Normalize any lingering legacy values BEFORE the new constraint takes effect,
--    otherwise the old CHECK would refuse the updates.
update public.tasks set status = 'To Do'   where status = 'In Progress';
update public.tasks set status = 'On Hold' where status in ('Blocked', 'Paused');

-- 2) Drop the auto-generated CHECK constraint from the column and add a
--    named, narrower replacement.
alter table public.tasks
  drop constraint if exists tasks_status_check;

alter table public.tasks
  add constraint tasks_status_check
  check (status in ('To Do', 'Active', 'On Hold', 'Done'));

commit;
