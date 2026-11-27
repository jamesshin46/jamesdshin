// Album artwork: a real image when `cover` is set, otherwise a designed generated cover.

import { el, initials } from './utils.js';

function generatedCover(album) {
  return el('div', {
    class: 'art art--gen',
    style: { '--c': album?.color || 'var(--accent)' },
    'aria-hidden': 'true'
  },
  el('span', { class: 'art-mono' }, initials(album?.title)),
  el('span', { class: 'art-title' }, album?.title ?? ''));
}

/** Returns an artwork node for an album. Falls back to a generated cover if the image fails. */
export function coverArt(album, { className = '' } = {}) {
  let node;
  if (album?.cover) {
    node = el('img', { class: 'art art--img', src: album.cover, alt: '', loading: 'lazy', decoding: 'async' });
    node.addEventListener('error', () => {
      const gen = generatedCover(album);
      if (className) gen.classList.add(...className.split(' '));
      node.replaceWith(gen);
    }, { once: true });
  } else {
    node = generatedCover(album);
  }
  if (className) node.classList.add(...className.split(' '));
  return node;
}
