// Loads every content/*.json file plus data/views.json, cleans them, and exposes lookups.
// Cleaning rules (from CLAUDE.md):
//   • strings starting with "TODO" become null (and are listed once via console.info)
//   • keys starting with "_" are notes for James and are dropped
//   • items missing a *required* field are hidden entirely

import { isTodo, present } from './utils.js';

const FILES = {
  profile: 'content/profile.json',
  albums: 'content/albums.json',
  recap: 'content/recap.json',
  nowPlaying: 'content/now-playing.json',
  interests: 'content/interests.json',
  places: 'content/places.json'
};
const VIEWS_FILE = 'data/views.json';

export const store = {
  loaded: false,
  errors: [],
  todos: [],
  profile: {},
  categories: [],
  albums: [],
  recap: { slides: [] },
  nowPlaying: {},
  interests: [],
  places: { categories: [], tags: [], places: [] },
  views: { updatedAt: null, totalViews: null, videos: {} }
};

const albumsById = new Map();

async function fetchJSON(path, { bust = false } = {}) {
  const url = bust ? `${path}?t=${Date.now()}` : path;
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    store.errors.push(`${path}: ${err.message}`);
    return null;
  }
}

/** Recursively drop "_" keys and turn TODO strings into null, recording where they were. */
function clean(value, path, todos) {
  if (typeof value === 'string') {
    if (isTodo(value)) {
      todos.push(path);
      return null;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v, i) => clean(v, `${path}[${i}]`, todos));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('_')) continue;
      out[k] = clean(v, `${path}.${k}`, todos);
    }
    return out;
  }
  return value;
}

const arr = v => (Array.isArray(v) ? v : []);
const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

function normalizeAlbums(raw) {
  const categories = arr(raw.categories).filter(c => present(c?.id) && present(c?.label));
  const albums = arr(raw.albums)
    .filter(a => present(a?.id) && present(a?.title))
    .map(a => {
      const tracks = arr(a.tracks)
        .filter(t => {
          if (!present(t?.id) || !present(t?.title)) return false;
          if (t.kind === 'video') return present(t.youtubeId);
          return present(t.detail); // highlight tracks need their detail text
        })
        .map(t => ({ ...t, kind: t.kind === 'video' ? 'video' : 'highlight', skills: arr(t.skills).filter(present), albumId: a.id }));
      return { ...a, tracks };
    });
  return { categories, albums };
}

function normalizeProfile(p) {
  p = obj(p);
  const contact = obj(p.contact);
  return {
    ...p,
    stats: arr(p.stats).filter(present),
    bio: arr(p.bio).filter(present),
    quickFacts: arr(p.quickFacts).filter(f => present(f?.label) && present(f?.value)),
    searchKeywords: arr(p.searchKeywords).filter(present),
    greetings: obj(p.greetings),
    popular: arr(p.popular),
    contact: { ...contact, links: arr(contact.links).filter(l => present(l?.url) && present(l?.label)) }
  };
}

function normalizePlaces(raw) {
  raw = obj(raw);
  const places = arr(raw.places)
    .filter(p => present(p?.id) && present(p?.name) && present(p?.category))
    .map(p => ({ ...p, tags: arr(p.tags).filter(present) }));
  return {
    categories: arr(raw.categories).filter(c => present(c?.id) && present(c?.label)),
    tags: arr(raw.tags).filter(present),
    places
  };
}

function normalizeViews(raw) {
  raw = obj(raw);
  return {
    updatedAt: present(raw.updatedAt) ? raw.updatedAt : null,
    totalViews: Number.isFinite(raw.totalViews) ? raw.totalViews : null,
    videos: obj(raw.videos)
  };
}

export async function loadAll() {
  const keys = Object.keys(FILES);
  const [results, rawViews] = await Promise.all([
    Promise.all(keys.map(k => fetchJSON(FILES[k]))),
    fetchJSON(VIEWS_FILE, { bust: true })
  ]);

  const todos = [];
  const raw = {};
  keys.forEach((k, i) => (raw[k] = clean(results[i] ?? {}, FILES[k].replace('content/', ''), todos)));

  store.profile = normalizeProfile(raw.profile);
  Object.assign(store, normalizeAlbums(obj(raw.albums)));
  store.recap = { ...obj(raw.recap), slides: arr(raw.recap?.slides).filter(s => present(s?.layout)) };
  store.nowPlaying = obj(raw.nowPlaying);
  store.interests = arr(raw.interests?.interests).filter(i => {
    if (!present(i?.id) || !present(i?.label)) return false;
    if (i.type === 'map') return present(i.placesCategory);
    return present(i.detail);
  });
  store.places = normalizePlaces(raw.places);
  store.views = normalizeViews(rawViews);

  albumsById.clear();
  store.albums.forEach(a => albumsById.set(a.id, a));

  // Popular rows must point at a track that's actually visible.
  store.profile.popular = store.profile.popular.filter(p => present(p?.title) && getTrack(p.albumId, p.trackId));

  store.todos = todos;
  store.loaded = results.some(Boolean);

  if (todos.length) console.info(`[jamesdshin] ${todos.length} TODO field(s) hidden until filled in:\n  • ${todos.join('\n  • ')}`);
  if (store.errors.length) console.warn(`[jamesdshin] Couldn't load:\n  • ${store.errors.join('\n  • ')}`);
  return store;
}

/** Re-fetch only views.json (used for live refresh). Returns true if anything changed. */
export async function refreshViews() {
  const raw = await fetchJSON(VIEWS_FILE, { bust: true });
  if (!raw) return false;
  const next = normalizeViews(raw);
  const changed = next.updatedAt !== store.views.updatedAt;
  store.views = next;
  return changed;
}

/* ---------- Lookups ---------- */

export const getAlbum = id => albumsById.get(id) ?? null;

export function getTrack(albumId, trackId) {
  return getAlbum(albumId)?.tracks.find(t => t.id === trackId) ?? null;
}

export const allTracks = () => store.albums.flatMap(a => a.tracks);

/** Live view count for a YouTube id, or null. */
export function viewCount(youtubeId) {
  const n = store.views.videos?.[youtubeId]?.viewCount;
  return Number.isFinite(n) ? n : null;
}

/** True when views.json has real data (show the LIVE badge). */
export function hasLiveViews() {
  return present(store.views.updatedAt) && Object.keys(store.views.videos ?? {}).length > 0;
}

/** Sum of viewCount for every video in views.json, or null if there's no data. */
export function youtubeTotal() {
  if (!hasLiveViews()) return null;
  return Object.values(store.views.videos).reduce((sum, v) => sum + (Number.isFinite(v?.viewCount) ? v.viewCount : 0), 0);
}
