// Artist page (home). Phase 1: placeholder that proves the data layer works.
// Phase 2 replaces this with the greeting, header, Popular, Discography, Fans also like, About, Contact.

import { store, allTracks, hasLiveViews, youtubeTotal } from './data.js';
import { el, formatNumber } from './utils.js';

export function renderArtistPage(view) {
  const tracks = allTracks();
  const videos = tracks.filter(t => t.kind === 'video').length;
  const total = youtubeTotal();

  const rows = [
    ['Albums', store.albums.length],
    ['Tracks', `${tracks.length} (${videos} videos)`],
    ['Popular', store.profile.popular.length],
    ['Recap slides', store.recap.slides.length],
    ['Interests', store.interests.length],
    ['Places', store.places.places.length],
    ['YouTube views', hasLiveViews() ? formatNumber(total) : 'no data yet (fallback mode)'],
    ['Hidden TODO fields', store.todos.length]
  ];

  view.append(
    el('section', { class: 'placeholder hero-gradient' },
      el('p', { class: 'micro' }, store.profile.label ?? 'PORTFOLIO'),
      el('h1', { class: 'placeholder-title' }, store.profile.name ?? ''),
      el('p', { class: 'muted' }, 'Phase 1 skeleton — the artist page arrives in Phase 2.'),
      el('dl', { class: 'placeholder-stats' },
        rows.map(([k, v]) => el('div', {}, el('dt', {}, k), el('dd', {}, String(v)))))),
    el('section', { class: 'placeholder', id: 'discography' },
      el('h2', { class: 'h2' }, 'Discography'),
      el('p', { class: 'muted' }, 'Pick any album in the sidebar to test album routes.')),
    el('section', { class: 'placeholder', id: 'contact' },
      el('h2', { class: 'h2' }, 'Contact'),
      el('p', { class: 'muted' }, store.profile.contact?.headline ?? ''))
  );
}
