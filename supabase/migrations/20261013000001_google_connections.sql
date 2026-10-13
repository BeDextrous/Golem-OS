-- Server-side Google OAuth connections (one per user per connection key).
-- The refresh token is stored AES-256-GCM encrypted by the app (GOOGLE_TOKEN_KEY);
-- the database never sees the plaintext, and the key lives only in server env.
-- Owner-only RLS, same pattern as every other table; authenticated role only.

create table if not exists public.google_connections (
  id                bigserial primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  connection        text not null check (connection in ('life', 'dextrous')),
  google_email      text,
  scopes            text not null default '',
  refresh_token_enc text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, connection)
);
create index if not exists google_connections_user_idx on public.google_connections(user_id);

alter table public.google_connections enable row level security;

create policy "owner_select" on public.google_connections
  for select using (auth.uid() = user_id);
create policy "owner_insert" on public.google_connections
  for insert with check (auth.uid() = user_id);
create policy "owner_update" on public.google_connections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_delete" on public.google_connections
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.google_connections to authenticated;
grant usage, select on sequence public.google_connections_id_seq to authenticated;
