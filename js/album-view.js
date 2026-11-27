// Album detail view. Phase 1: header placeholder. Phase 3 adds the tracklist, play, and "More by".

import { getAlbum } from './data.js';
import { el } from './utils.js';
import { coverArt } from './covers.js';

export function renderAlbumView(view, id) {
  const album = getAlbum(id);
  if (!album) {
    view.append(el('section', { class: 'placeholder' },
      el('h1', { class: 'h2' }, 'Album not found'),
      el('p', { class: 'muted' }, el('a', { href: '#/' }, 'Back to home'))));
    return;
  }

  view.append(el('section', { class: 'placeholder album-placeholder', style: { '--c': album.color || 'var(--accent)' } },
    el('div', { class: 'album-placeholder-art' }, coverArt(album)),
    el('div', {},
      el('p', { class: 'micro' }, album.type ?? 'Album'),
      el('h1', { class: 'placeholder-title' }, album.title),
      el('p', { class: 'muted' }, `${album.tracks.length} tracks · full tracklist arrives in Phase 3.`))));
}
