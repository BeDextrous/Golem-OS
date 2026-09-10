-- Client Drive folder linkage + lightweight status-bar fields.
-- Powers: Dextrous > Clients > [client] detail page (auto status bar +
-- Drive widget scoped to the client's work-product folder).

alter table public.clients
  add column if not exists drive_folder_url text,
  add column if not exists drive_folder_id  text,
  add column if not exists latest_update    text,
  add column if not exists latest_update_at timestamptz;
