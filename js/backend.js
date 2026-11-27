// Guestbook backend: visitors' favorite songs + the featured "listener pick".
//
// Live mode (content/backend.json filled in): talks to Supabase with plain fetch (no library).
//   • Visitors can only INSERT songs. They can never read the list.
//   • Only the owner, logged in with their Supabase password, can read/delete songs
//     and change the featured pick. These rules are enforced in the database
//     (Row Level Security, see supabase/setup.sql), not by this file.
//   • The password is never stored in this code; it's checked by Supabase.
//
// Demo mode (backend.json not filled in yet): everything is kept in this browser's
// localStorage so the UI can be tried in Live Server. Nothing leaves the device.

import { store } from './data.js';

const KEYS = {
  session: 'jds-owner-session',
  demoSubs: 'jds-demo-submissions',
  demoFeatured: 'jds-demo-featured'
};

const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } }
};

export class AuthError extends Error {
  constructor(msg = 'Please unlock owner view again.') { super(msg); this.name = 'AuthError'; }
}

const cfg = () => store.backend ?? {};
export const isLive = () => !!(cfg().supabaseUrl && cfg().supabaseAnonKey && cfg().ownerEmail);
// Accepts "https://xyz.supabase.co" with or without a trailing "/rest/v1/" (as copied from the dashboard).
const base = () => cfg().supabaseUrl.trim().replace(/\/+$/, '').replace(/\/(rest|auth)\/v1$/, '');
const anonHeaders = () => ({ apikey: cfg().supabaseAnonKey, 'Content-Type': 'application/json' });
const tidy = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Columns added by supabase/002_song_details.sql. If that migration hasn't been run yet,
// requests that mention them fail, and we quietly fall back to the basic columns.
const BASE_COLS = 'visitor_name,song,artist';
const DETAIL_COLS = 'spotify_id,album,cover_url,track_url';
let detailsSupported = true;
const isMissingColumn = async res => {
  if (res.status !== 400 && res.status !== 404) return false;
  const text = await res.clone().text();
  return /column|schema cache|PGRST204|42703/i.test(text);
};

/** Spotify fields for a chosen track (null-safe, validated like the database does). */
function trackDetails(track) {
  if (!track) return {};
  const ok = (v, re) => (typeof v === 'string' && re.test(v) ? v : null);
  return {
    spotify_id: ok(track.id, /^[A-Za-z0-9]{10,40}$/),
    album: tidy(track.album, 200) || null,
    cover_url: ok(track.imageLarge ?? track.image, /^https:\/\/i\.scdn\.co\//),
    track_url: ok(track.url, /^https:\/\/open\.spotify\.com\//)
  };
}
const stripDetails = row => {
  const { spotify_id, album, cover_url, track_url, ...rest } = row;
  return rest;
};

/* ---------- Spotify search (via the spotify-search Edge Function) ---------- */

let searchAvailable = true;

/** Up to 6 tracks for a query, or null if search isn't available (demo mode / not set up). */
export async function searchSongs(q, { signal } = {}) {
  if (!isLive() || !searchAvailable) return null;
  const query = String(q ?? '').trim();
  if (query.length < 2) return [];
  const res = await fetch(`${base()}/functions/v1/spotify-search?q=${encodeURIComponent(query)}`, { signal });
  if (res.status === 404 || res.status === 500 || res.status === 401) { searchAvailable = false; return null; }
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json.tracks) ? json.tracks : [];
}
export const songSearchEnabled = () => isLive() && searchAvailable;

/* ---------- Public (any visitor) ---------- */

export async function submitSong({ name, song, artist, track = null }) {
  const row = {
    visitor_name: tidy(name, 60),
    song: tidy(track?.name ?? song, 120),
    artist: tidy(track?.artists ?? artist, 120) || null,
    ...trackDetails(track)
  };
  if (!row.visitor_name || !row.song) throw new Error('Add your name and a song (artist is optional).');

  if (!isLive()) {
    const subs = ls.get(KEYS.demoSubs) ?? [];
    subs.unshift({ id: crypto.randomUUID?.() ?? String(Date.now()), created_at: new Date().toISOString(), ...row });
    ls.set(KEYS.demoSubs, subs);
    return;
  }
  const post = body => fetch(`${base()}/rest/v1/song_submissions`, {
    method: 'POST',
    headers: { ...anonHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify(body)
  });
  let res = await post(detailsSupported ? row : stripDetails(row));
  if (!res.ok && detailsSupported && await isMissingColumn(res)) {
    detailsSupported = false;
    res = await post(stripDetails(row));
  }
  if (!res.ok) throw new Error('Couldn’t save that right now. Try again in a moment.');
}

/** The featured listener pick, or null. Never throws. */
export async function fetchFeatured() {
  if (!isLive()) return ls.get(KEYS.demoFeatured);
  try {
    const get = cols => fetch(`${base()}/rest/v1/featured_song?select=${cols},note,updated_at&id=eq.1`, { headers: anonHeaders() });
    let res = await get(detailsSupported ? `${BASE_COLS},${DETAIL_COLS}` : BASE_COLS);
    if (!res.ok && detailsSupported && await isMissingColumn(res)) { detailsSupported = false; res = await get(BASE_COLS); }
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/* ---------- Owner session ---------- */

export const ownerSession = () => ls.get(KEYS.session);
export const isOwner = () => {
  const s = ownerSession();
  if (!s) return false;
  return isLive() ? !!s.refresh_token : !!s.demo;
};

function saveSession(j) {
  ls.set(KEYS.session, {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: Date.now() + (j.expires_in ?? 3600) * 1000
  });
}

export function logout() { ls.set(KEYS.session, null); }

export async function login(password) {
  if (!password) throw new Error('Enter your password.');
  if (!isLive()) { ls.set(KEYS.session, { demo: true }); return; }
  const res = await fetch(`${base()}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: anonHeaders(),
    body: JSON.stringify({ email: cfg().ownerEmail, password })
  });
  if (!res.ok) {
    let code = '';
    try { const j = await res.json(); code = j.error_code ?? j.code ?? j.error ?? ''; } catch { /* not JSON */ }
    const reasons = {
      email_provider_disabled: 'Email logins are turned off in Supabase (Authentication → Sign In / Providers → Email → enable).',
      email_not_confirmed: 'Your owner user isn’t confirmed yet (Supabase → Authentication → Users → confirm the user).',
      invalid_credentials: 'That password didn’t work (or the owner email in backend.json doesn’t match your Supabase user).',
      invalid_grant: 'That password didn’t work (or the owner email in backend.json doesn’t match your Supabase user).',
      over_request_rate_limit: 'Too many tries. Wait a minute and try again.'
    };
    throw new Error(reasons[code] ?? `Couldn’t log in (${code || res.status}).`);
  }
  saveSession(await res.json());
}

async function refresh(sess) {
  const res = await fetch(`${base()}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: anonHeaders(),
    body: JSON.stringify({ refresh_token: sess.refresh_token })
  });
  if (!res.ok) { logout(); throw new AuthError(); }
  saveSession(await res.json());
  return ownerSession();
}

async function ownerFetch(path, init = {}) {
  let sess = ownerSession();
  if (!sess?.refresh_token) throw new AuthError();
  if (!sess.access_token || Date.now() > (sess.expires_at ?? 0) - 60_000) sess = await refresh(sess);
  const go = s => fetch(`${base()}${path}`, {
    ...init,
    headers: { ...anonHeaders(), Authorization: `Bearer ${s.access_token}`, ...(init.headers ?? {}) }
  });
  let res = await go(sess);
  if (res.status === 401) { sess = await refresh(sess); res = await go(sess); }
  if (res.status === 401 || res.status === 403) { logout(); throw new AuthError(); }
  if (!res.ok) throw new Error(`Request failed (${res.status}).`);
  return res;
}

/* ---------- Owner actions ---------- */

export async function listSubmissions() {
  if (!isLive()) return ls.get(KEYS.demoSubs) ?? [];
  const path = cols => `/rest/v1/song_submissions?select=id,created_at,${cols}&order=created_at.desc`;
  if (detailsSupported) {
    try { return await (await ownerFetch(path(`${BASE_COLS},${DETAIL_COLS}`))).json(); }
    catch (err) { if (err instanceof AuthError) throw err; detailsSupported = false; }
  }
  return (await ownerFetch(path(BASE_COLS))).json();
}

export async function setFeatured(sub, note) {
  const row = {
    id: 1,
    visitor_name: sub.visitor_name,
    song: sub.song,
    artist: sub.artist ?? null,
    note: tidy(note, 280) || null,
    updated_at: new Date().toISOString(),
    spotify_id: sub.spotify_id ?? null,
    album: sub.album ?? null,
    cover_url: sub.cover_url ?? null,
    track_url: sub.track_url ?? null
  };
  if (!isLive()) { ls.set(KEYS.demoFeatured, row); return row; }
  const save = body => ownerFetch('/rest/v1/featured_song?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body)
  });
  try { await save(detailsSupported ? row : stripDetails(row)); }
  catch (err) {
    if (err instanceof AuthError || !detailsSupported) throw err;
    detailsSupported = false;
    await save(stripDetails(row));
  }
  return row;
}

export async function clearFeatured() {
  if (!isLive()) { ls.set(KEYS.demoFeatured, null); return; }
  await ownerFetch('/rest/v1/featured_song?id=eq.1', { method: 'DELETE' });
}

export async function deleteSubmission(id) {
  if (!isLive()) {
    ls.set(KEYS.demoSubs, (ls.get(KEYS.demoSubs) ?? []).filter(s => s.id !== id));
    return;
  }
  await ownerFetch(`/rest/v1/song_submissions?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/* ---------- Likes (anonymous +1 / -1 events; owner sees totals) ---------- */

const DEMO_LIKES = 'jds-demo-like-events';

/** Record a like/unlike. Fire-and-forget: never throws, never blocks the UI. */
export async function recordLike(orgId, liked) {
  const row = { org_id: String(orgId).slice(0, 40), delta: liked ? 1 : -1 };
  if (!/^[a-z0-9-]{1,40}$/.test(row.org_id)) return;
  if (!isLive()) {
    const ev = ls.get(DEMO_LIKES) ?? [];
    ev.push(row);
    ls.set(DEMO_LIKES, ev.slice(-500));
    return;
  }
  try {
    await fetch(`${base()}/rest/v1/page_likes`, {
      method: 'POST',
      headers: { ...anonHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify(row),
      keepalive: true
    });
  } catch { /* offline or table not set up yet */ }
}

/** Owner only: { orgId: netLikes } or null if the likes table isn't set up yet. */
export async function likeTotals() {
  const sum = rows => rows.reduce((m, r) => ((m[r.org_id] = (m[r.org_id] ?? 0) + r.delta), m), {});
  if (!isLive()) return sum(ls.get(DEMO_LIKES) ?? []);
  try {
    const res = await ownerFetch('/rest/v1/page_likes?select=org_id,delta&limit=10000');
    return sum(await res.json());
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return null;
  }
}
