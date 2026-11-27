// Now-playing bar + "playing" chapters and videos.
//
// Every experience / club / education page is an album; its chapters are the tracks.
// Playing a chapter opens its deep dive on that page and puts it in the bottom bar, where
// ⏮ / ⏭ step through all chapters in playlist order (experience → clubs → education).
// Dance covers play inside the site (YouTube embed), with a link out to YouTube.

import { store, getOrg, getChapter, allOrgs, viewCount } from './data.js';
import { el, clear, present, safeSession, reducedMotion, formatNumber } from './utils.js';
import { icon } from './icons.js';
import { navigate, parseHash } from './router.js';
import { orgLogo, isPreRelease } from './orgs.js';
import { openOverlay } from './modal.js';

const SESSION_KEY = 'jds-now-playing';
let current = null;        // { orgId, chapterId }
let pendingChapter = null; // chapter to open once its page has rendered

/* ---------- Playlist helpers ---------- */

function playlist() {
  // Pre-release albums are locked, so their chapters are skipped.
  return allOrgs().filter(o => !isPreRelease(o)).flatMap(o => o.chapters.map(c => ({ orgId: o.id, chapterId: c.id })));
}
function neighbor(dir) {
  const list = playlist();
  if (!current || !list.length) return list[0] ?? null;
  const i = list.findIndex(x => x.orgId === current.orgId && x.chapterId === current.chapterId);
  return list[(i + dir + list.length) % list.length];
}

/* ---------- Public API ---------- */

export const nowPlaying = () => current;

/** Play (open) a chapter: on its page if we're there, otherwise navigate there first. */
export function playChapter(orgId, chapterId, { scroll = true } = {}) {
  if (!getChapter(orgId, chapterId) || isPreRelease(getOrg(orgId))) return;
  current = { orgId, chapterId };
  safeSession(SESSION_KEY, current);
  renderBar();
  const route = parseHash();
  if (route.name === 'org' && route.id === orgId) {
    window.dispatchEvent(new CustomEvent('jds:chapter', { detail: { orgId, chapterId, scroll } }));
  } else {
    pendingChapter = { orgId, chapterId };
    navigate(`org/${encodeURIComponent(orgId)}`);
  }
}

/** Called by the org page after it renders: returns a chapter to open, if one was requested. */
export function takePendingChapter(orgId) {
  if (pendingChapter?.orgId !== orgId) return null;
  const p = pendingChapter;
  pendingChapter = null;
  return p.chapterId;
}

export const playNext = () => { const n = neighbor(1); if (n) playChapter(n.orgId, n.chapterId); };
export const playPrev = () => { const n = neighbor(-1); if (n) playChapter(n.orgId, n.chapterId); };

/* ---------- Dance covers ---------- */

/** YouTube watch link for a cover. */
export const youtubeUrl = cover => `https://www.youtube.com/watch?v=${encodeURIComponent(cover.youtubeId)}`;

/** True when YouTube can identify this page (http/https). Opening the file directly can't embed. */
const canEmbed = () => /^https?:$/.test(location.protocol);

function embedFallback(cover, reason) {
  return el('div', { class: 'yt-fallback', style: { '--thumb': `url("https://i.ytimg.com/vi/${encodeURIComponent(cover.youtubeId)}/hqdefault.jpg")` } },
    el('p', { class: 'yt-fallback-text' }, reason),
    el('a', { class: 'pill-btn pill-btn--solid', href: youtubeUrl(cover), target: '_blank', rel: 'noopener' },
      el('span', { html: icon('play', { size: 16 }) }), 'Watch on YouTube'));
}

/**
 * A YouTube player. YouTube refuses embeds that don't identify the page they're on
 * ("Video unavailable" / error 153), so we send the referrer and our origin, and listen for
 * the player's error event: if it still refuses, we swap in a "Watch on YouTube" card.
 */
export function youtubeEmbed(cover, { autoplay = true } = {}) {
  if (!canEmbed()) {
    return embedFallback(cover, 'Videos play here on the live site. Opened from a file, YouTube blocks them.');
  }
  const params = new URLSearchParams({
    rel: '0', playsinline: '1', modestbranding: '1', autoplay: autoplay ? '1' : '0',
    enablejsapi: '1', origin: location.origin
  });
  const frame = el('iframe', {
    class: 'yt-frame',
    src: `https://www.youtube.com/embed/${encodeURIComponent(cover.youtubeId)}?${params}`,
    title: cover.title,
    referrerpolicy: 'strict-origin-when-cross-origin',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
    allowfullscreen: true
  });
  const wrap = el('div', { class: 'yt-wrap' }, frame);

  // Listen for the player's onError (e.g. 101/150 = owner disallows embedding, 153 = no referrer).
  const onMessage = e => {
    if (!wrap.isConnected) { window.removeEventListener('message', onMessage); return; }
    if (e.source !== frame.contentWindow || !/youtube\.com$/.test(new URL(e.origin).hostname)) return;
    let data = e.data;
    try { if (typeof data === 'string') data = JSON.parse(data); } catch { return; }
    if (data?.event === 'onError') {
      window.removeEventListener('message', onMessage);
      wrap.replaceChildren(embedFallback(cover, 'This one can only be played on YouTube.'));
    }
  };
  window.addEventListener('message', onMessage);
  frame.addEventListener('load', () => {
    frame.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: cover.youtubeId, channel: 'widget' }), 'https://www.youtube.com');
  });
  return wrap;
}

/** Watch a cover in a pop-up player (used by club "Performances"). */
export function openVideo(cover) {
  const views = viewCount(cover.youtubeId);
  const o = openOverlay({ label: cover.title, className: 'overlay--video' });
  o.root.append(el('div', { class: 'video-card' },
    el('button', { class: 'icon-btn video-close', type: 'button', 'aria-label': 'Close video', html: icon('close'), onClick: () => o.close() }),
    el('div', { class: 'video-frame' }, youtubeEmbed(cover)),
    el('div', { class: 'video-meta' },
      el('div', {},
        el('p', { class: 'video-title' }, cover.title),
        el('p', { class: 'video-sub' }, [cover.channel ?? cover.crew, views != null ? `${formatNumber(views)} views` : null].filter(present).join(' · '))),
      el('a', { class: 'pill-btn pill-btn--sm', href: youtubeUrl(cover), target: '_blank', rel: 'noopener' },
        'Open on YouTube', el('span', { html: icon('external', { size: 14 }) })))));
}

/* ---------- Bottom bar ---------- */

function meta(label, title, subtitle, cls = '') {
  return el('div', { class: `np-meta ${cls}`.trim() },
    present(label) && el('span', { class: 'micro np-label' }, label),
    present(title) && el('span', { class: 'np-title' }, title),
    present(subtitle) && el('span', { class: 'np-sub' }, subtitle));
}

function art(org) {
  return el('div', { class: 'np-art', style: { '--c': org?.color || 'var(--accent)' } },
    org ? orgLogo(org) : el('span', { class: 'logo-face is-mono' }));
}

function renderDefault(bar) {
  const { default: cur = {}, upNext = {} } = store.nowPlaying;
  const curOrg = getOrg(cur.orgId);
  const nextOrg = getOrg(upNext.orgId);
  bar.append(
    el('a', { class: 'np-current', href: curOrg ? `#/org/${curOrg.id}` : '#/' },
      art(curOrg), meta(cur.label ?? 'NOW PLAYING', cur.title, cur.subtitle)),
    el('div', { class: 'np-center' }),
    present(upNext.title)
      ? el('a', { class: 'np-next', href: nextOrg ? `#/org/${nextOrg.id}` : '#/' },
          meta(upNext.label ?? 'UP NEXT', upNext.title, upNext.subtitle, 'np-meta--right'),
          nextOrg && el('div', { class: 'np-art np-art--sm' }, orgLogo(nextOrg)))
      : el('div'));
}

function renderPlaying(bar) {
  const org = getOrg(current.orgId);
  const ch = getChapter(current.orgId, current.chapterId);
  const next = neighbor(1);
  const nextCh = next && getChapter(next.orgId, next.chapterId);
  const nextOrg = next && getOrg(next.orgId);

  bar.classList.add('is-playing');
  bar.append(
    el('button', { class: 'np-current', type: 'button', title: 'Open this chapter', onClick: () => playChapter(org.id, ch.id) },
      art(org), meta(null, ch.title, org.name)),
    el('div', { class: 'np-center' },
      el('div', { class: 'np-controls' },
        el('button', { class: 'np-btn', type: 'button', 'aria-label': 'Previous chapter', html: icon('prev', { size: 20 }), onClick: playPrev }),
        el('button', { class: 'np-btn np-btn--main', type: 'button', 'aria-label': 'Open this chapter', html: icon('play', { size: 18 }), onClick: () => playChapter(org.id, ch.id) }),
        el('button', { class: 'np-btn', type: 'button', 'aria-label': 'Next chapter', html: icon('next', { size: 20 }), onClick: playNext })),
      el('div', { class: `np-progress${reducedMotion() ? ' is-static' : ''}`, 'aria-hidden': 'true' }, el('span'))),
    nextCh
      ? el('button', { class: 'np-next', type: 'button', onClick: playNext },
          meta('UP NEXT', nextCh.title, nextOrg?.name, 'np-meta--right'),
          nextOrg && el('div', { class: 'np-art np-art--sm' }, orgLogo(nextOrg)))
      : el('div'));
}

function renderBar() {
  const bar = document.getElementById('now-playing');
  if (!bar) return;
  clear(bar);
  bar.classList.remove('is-playing');
  const valid = current && getChapter(current.orgId, current.chapterId);
  if (valid) renderPlaying(bar);
  else renderDefault(bar);
}

export function initPlayer() {
  const saved = safeSession(SESSION_KEY);
  if (saved && getChapter(saved.orgId, saved.chapterId)) current = saved;
  renderBar();
}
