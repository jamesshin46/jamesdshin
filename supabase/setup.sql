-- =============================================================================
-- jamesdshin.com — guestbook database (paste into Supabase → SQL Editor → Run)
--
-- BEFORE RUNNING: replace YOUR_OWNER_EMAIL below (one place) with the email you
-- will use for your owner login. It must match content/backend.json → ownerEmail.
--
-- Who can do what (enforced by the database, not the website):
--   • Anyone:     add a song (cannot read anyone's songs, including their own)
--   • Anyone:     read the single featured "listener pick"
--   • Owner only: read and delete songs, set/clear the featured pick
-- =============================================================================

-- 1) Who is the owner? (the logged-in user's email must match)
create or replace function public.is_site_owner()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'email') = 'YOUR_OWN_EMAIL', false);
$$;

-- 2) Visitors' favorite songs (private)
create table if not exists public.song_submissions (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  visitor_name text not null check (char_length(btrim(visitor_name)) between 1 and 60),
  song         text not null check (char_length(btrim(song)) between 1 and 120),
  artist       text check (artist is null or char_length(artist) <= 120)
);

alter table public.song_submissions enable row level security;

drop policy if exists "anyone can add a song"  on public.song_submissions;
drop policy if exists "owner can read songs"   on public.song_submissions;
drop policy if exists "owner can delete songs" on public.song_submissions;

create policy "anyone can add a song" on public.song_submissions
  for insert to anon, authenticated with check (true);

create policy "owner can read songs" on public.song_submissions
  for select to authenticated using (public.is_site_owner());

create policy "owner can delete songs" on public.song_submissions
  for delete to authenticated using (public.is_site_owner());

revoke all on public.song_submissions from anon, authenticated;
grant insert on public.song_submissions to anon, authenticated;
grant select, delete on public.song_submissions to authenticated;

-- 3) The one featured "listener pick" shown on the home page (public to read)
create table if not exists public.featured_song (
  id           int primary key default 1 check (id = 1),
  visitor_name text not null check (char_length(visitor_name) <= 60),
  song         text not null check (char_length(song) <= 120),
  artist       text check (artist is null or char_length(artist) <= 120),
  note         text check (note is null or char_length(note) <= 280),
  updated_at   timestamptz not null default now()
);

alter table public.featured_song enable row level security;

drop policy if exists "everyone can see the pick" on public.featured_song;
drop policy if exists "owner can add the pick"    on public.featured_song;
drop policy if exists "owner can change the pick" on public.featured_song;
drop policy if exists "owner can remove the pick" on public.featured_song;

create policy "everyone can see the pick" on public.featured_song
  for select to anon, authenticated using (true);

create policy "owner can add the pick" on public.featured_song
  for insert to authenticated with check (public.is_site_owner());

create policy "owner can change the pick" on public.featured_song
  for update to authenticated using (public.is_site_owner()) with check (public.is_site_owner());

create policy "owner can remove the pick" on public.featured_song
  for delete to authenticated using (public.is_site_owner());

revoke all on public.featured_song from anon, authenticated;
grant select on public.featured_song to anon, authenticated;
grant insert, update, delete on public.featured_song to authenticated;
