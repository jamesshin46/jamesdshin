// Loads every content/*.json file plus data/views.json, cleans them, and exposes lookups.
// Cleaning rules (from CLAUDE.md):
//   • strings starting with "TODO" become null (and are listed once via console.info)
//   • keys starting with "_" are notes for James and are dropped
//   • items missing a *required* field are hidden entirely

import { isTodo, present } from './utils.js';

const FILES = {
  profile: 'content/profile.json',
  recap: 'content/recap.json',
  nowPlaying: 'content/now-playing.json',
  interests: 'content/interests.json',
  places: 'content/places.json',
  experience: 'content/experience.json',
  clubs: 'content/clubs.json',
  education: 'content/education.json',
  covers: 'content/covers.json',
  backend: 'content/backend.json'
};
const VIEWS_FILE = 'data/views.json';

export const store = {
  loaded: false,
  errors: [],
  todos: [],
  profile: {},
  recap: { slides: [] },
  nowPlaying: {},
  interests: [],
  places: { categories: [], tags: [], places: [] },
  experience: [],
  clubs: [],
  education: [],
  covers: [],
  backend: {},
  views: { updatedAt: null, totalViews: null, videos: {} }
};

const orgsById = new Map();

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

const validOrg = o => present(o?.id) && present(o?.name);

/**
 * Experience items, clubs, and education share one shape ("orgs"): each is an "album" page
 * with a tracklist of chapters (deep-dive stories).
 */
function normalizeOrg(o, kind) {
  const media = v => (v && typeof v === 'object' ? v : present(v) ? { src: v } : {});
  const chapters = arr(o.chapters)
    .filter(c => present(c?.id) && present(c?.title) && present(c?.summary))
    .map(c => ({
      ...c,
      orgId: o.id,
      story: (Array.isArray(c.story) ? c.story : [c.story]).filter(present),
      skills: arr(c.skills).filter(present)
    }));
  return {
    ...o,
    kind,
    logo: media(o.logo),
    banner: media(o.banner),
    roles: arr(o.roles).filter(r => present(r?.title)),
    skills: arr(o.skills).filter(present),
    chapters
  };
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
  store.recap = { ...obj(raw.recap), slides: arr(raw.recap?.slides).filter(s => present(s?.layout)) };
  store.nowPlaying = obj(raw.nowPlaying);
  store.interests = arr(raw.interests?.interests).filter(i => {
    if (!present(i?.id) || !present(i?.label)) return false;
    if (i.type === 'map') return present(i.placesCategory);
    return present(i.detail);
  });
  store.places = normalizePlaces(raw.places);
  store.experience = arr(raw.experience?.items).filter(validOrg).map(o => normalizeOrg(o, 'experience'));
  store.clubs = arr(raw.clubs?.clubs).filter(validOrg).map(o => normalizeOrg(o, 'club'));
  store.education = arr(raw.education?.items).filter(validOrg).map(o => normalizeOrg(o, 'education'));
  orgsById.clear();
  allOrgs().forEach(o => orgsById.set(o.id, o));
  store.covers = arr(raw.covers?.covers).filter(c => present(c?.id) && present(c?.title) && present(c?.youtubeId));
  store.backend = obj(raw.backend);
  store.views = normalizeViews(rawViews);

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

export const getOrg = id => orgsById.get(id) ?? null;

/** Every page in "playlist" order: experience → clubs → education. */
export const allOrgs = () => [...store.experience, ...store.clubs, ...store.education];

/** The page after this one in playlist order (wraps around). */
export function nextOrg(id) {
  const list = allOrgs();
  const i = list.findIndex(o => o.id === id);
  return list.length > 1 && i >= 0 ? list[(i + 1) % list.length] : null;
}

export function getChapter(orgId, chapterId) {
  return getOrg(orgId)?.chapters.find(c => c.id === chapterId) ?? null;
}

export const coversFor = orgId => store.covers.filter(c => c.orgId === orgId);
