-- ─────────────────────────────────────────────────────────────────────────────
-- Career Dashboard
--   • Adds job_applications table (pipeline tracker)
--   • Adds target_companies table (company watchlist)
--   • Extends crm with email, linkedin_url, last_contact_date, tags
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── JOB APPLICATIONS ────────────────────────────────────────────────────────
create table if not exists public.job_applications (
  id              bigserial primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  company         text not null,
  role            text,
  status          text default 'Wishlist'
                  check (status in (
                    'Wishlist','Applied','Phone Screen',
                    'Interview','Offer','Accepted','Rejected'
                  )),
  date_applied    date,
  job_url         text,
  salary_range    text,
  salary_offer    text,
  notes           text,
  contact_id      bigint references public.crm(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists job_applications_user_idx on public.job_applications(user_id);

-- ─── TARGET COMPANIES ────────────────────────────────────────────────────────
create table if not exists public.target_companies (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  industry     text,
  website      text,
  notes        text,
  priority     text check (priority in ('High','Medium','Low')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists target_companies_user_idx on public.target_companies(user_id);

-- ─── EXTEND CRM ──────────────────────────────────────────────────────────────
alter table public.crm
  add column if not exists email            text,
  add column if not exists linkedin_url     text,
  add column if not exists last_contact_date date,
  add column if not exists tags             text;

-- ─── UPDATED_AT TRIGGERS ─────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['job_applications','target_companies']
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ─── ROW-LEVEL SECURITY ──────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['job_applications','target_companies']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner_select" on public.%I', t);
    execute format('drop policy if exists "owner_insert" on public.%I', t);
    execute format('drop policy if exists "owner_update" on public.%I', t);
    execute format('drop policy if exists "owner_delete" on public.%I', t);

    execute format($f$
      create policy "owner_select" on public.%I
        for select using (auth.uid() = user_id)
    $f$, t);
    execute format($f$
      create policy "owner_insert" on public.%I
        for insert with check (auth.uid() = user_id)
    $f$, t);
    execute format($f$
      create policy "owner_update" on public.%I
        for update using (auth.uid() = user_id)
                  with check (auth.uid() = user_id)
    $f$, t);
    execute format($f$
      create policy "owner_delete" on public.%I
        for delete using (auth.uid() = user_id)
    $f$, t);
  end loop;
end $$;
