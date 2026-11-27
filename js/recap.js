// Recap story. Phase 1: placeholder overlay wired to #/recap. Phase 4 builds the full experience.

import { store } from './data.js';
import { openOverlay } from './modal.js';
import { el } from './utils.js';
import { icon } from './icons.js';

let current = null;

export function openRecap({ onClose } = {}) {
  if (current) return;
  current = openOverlay({ label: 'Recap', className: 'overlay--placeholder', onClose: () => { current = null; onClose?.(); } });
  current.root.append(el('div', { class: 'placeholder-dialog' },
    el('button', { class: 'icon-btn placeholder-close', type: 'button', 'aria-label': 'Close recap', html: icon('close'), onClick: () => current?.close() }),
    el('p', { class: 'micro' }, 'RECAP'),
    el('h2', { class: 'h2' }, `${store.recap.slides.length} slides loaded`),
    el('p', { class: 'muted' }, 'The full story experience arrives in Phase 4. Press Esc to close.')));
}

export function closeRecap(opts = { silent: true }) {
  if (!current) return;
  const c = current;
  current = null;
  c.close(opts);
}

export const isRecapOpen = () => !!current;
