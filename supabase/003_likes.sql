-- =============================================================================
-- jamesdshin.com — likes (run once in Supabase → SQL Editor)
-- Every time a visitor hearts or un-hearts an experience / club / school, one anonymous row
-- is added (+1 or -1). Visitors can only add rows; only the owner can read them.
-- Safe to run more than once. Requires setup.sql (for is_site_owner()).
-- =============================================================================

create table if not exists public.page_likes (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  org_id     text not null check (org_id ~ '^[a-z0-9-]{1,40}$'),
  delta      smallint not null check (delta in (1, -1))
);

alter table public.page_likes enable row level security;

drop policy if exists "anyone can record a like" on public.page_likes;
drop policy if exists "owner can read likes"     on public.page_likes;
drop policy if exists "owner can clear likes"    on public.page_likes;

create policy "anyone can record a like" on public.page_likes
  for insert to anon, authenticated with check (true);

create policy "owner can read likes" on public.page_likes
  for select to authenticated using (public.is_site_owner());

create policy "owner can clear likes" on public.page_likes
  for delete to authenticated using (public.is_site_owner());

revoke all on public.page_likes from anon, authenticated;
grant insert on public.page_likes to anon, authenticated;
grant select, delete on public.page_likes to authenticated;

notify pgrst, 'reload schema';
