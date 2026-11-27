-- =============================================================================
-- jamesdshin.com — add Spotify song details (run once in Supabase → SQL Editor)
-- Adds album, cover art, and Spotify link to saved songs and the featured pick.
-- Safe to run more than once.
-- =============================================================================

alter table public.song_submissions
  add column if not exists spotify_id text check (spotify_id is null or spotify_id ~ '^[A-Za-z0-9]{10,40}$'),
  add column if not exists album      text check (album is null or char_length(album) <= 200),
  add column if not exists cover_url  text check (cover_url is null or cover_url like 'https://i.scdn.co/%'),
  add column if not exists track_url  text check (track_url is null or track_url like 'https://open.spotify.com/%');

alter table public.featured_song
  add column if not exists spotify_id text check (spotify_id is null or spotify_id ~ '^[A-Za-z0-9]{10,40}$'),
  add column if not exists album      text check (album is null or char_length(album) <= 200),
  add column if not exists cover_url  text check (cover_url is null or cover_url like 'https://i.scdn.co/%'),
  add column if not exists track_url  text check (track_url is null or track_url like 'https://open.spotify.com/%');

-- Make the API notice the new columns right away
notify pgrst, 'reload schema';
