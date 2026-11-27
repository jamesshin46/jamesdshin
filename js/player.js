// Now-playing bar (and, in Phase 3, the YouTube modal + highlight drawer).

import { store, getAlbum } from './data.js';
import { el, clear, present } from './utils.js';
import { coverArt } from './covers.js';

function meta(label, title, subtitle, cls = '') {
  return el('div', { class: `np-meta ${cls}`.trim() },
    present(label) && el('span', { class: 'micro np-label' }, label),
    present(title) && el('span', { class: 'np-title' }, title),
    present(subtitle) && el('span', { class: 'np-sub' }, subtitle));
}

/** Default state: what James is doing right now + what's up next. */
export function renderNowPlayingDefault() {
  const bar = document.getElementById('now-playing');
  if (!bar) return;
  clear(bar);

  const { default: cur = {}, upNext = {} } = store.nowPlaying;
  const curAlbum = getAlbum(cur.albumId);
  const nextAlbum = getAlbum(upNext.albumId);

  const artwork = present(cur.artwork)
    ? el('img', { class: 'art art--img', src: cur.artwork, alt: '', loading: 'lazy' })
    : coverArt(curAlbum ?? { title: cur.title, color: 'var(--accent)' });

  const left = el('a', { class: 'np-current', href: curAlbum ? `#/album/${curAlbum.id}` : '#/' },
    el('div', { class: 'np-art' }, artwork),
    meta(cur.label ?? 'NOW PLAYING', cur.title, cur.subtitle));

  const right = (present(upNext.title))
    ? el('a', { class: 'np-next', href: nextAlbum ? `#/album/${nextAlbum.id}` : '#/' },
        meta(upNext.label ?? 'UP NEXT', upNext.title, upNext.subtitle, 'np-meta--right'),
        nextAlbum && el('div', { class: 'np-art np-art--sm' }, coverArt(nextAlbum)))
    : null;

  bar.append(left, el('div', { class: 'np-center' }), right ?? el('div'));
}

export function initPlayer() {
  renderNowPlayingDefault();
}
