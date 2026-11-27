// Places map (cafés & Asian cuisine). Phase 1: placeholder overlay wired to #/places/{id}.
// Phase 6 builds the Leaflet map, tabs, filters, and list ↔ map syncing.

import { store } from './data.js';
import { openOverlay } from './modal.js';
import { el } from './utils.js';
import { icon } from './icons.js';

let current = null;

export function openPlaces(categoryId, { onClose } = {}) {
  if (current) closePlaces();
  const cat = store.places.categories.find(c => c.id === categoryId) ?? store.places.categories[0];
  const count = store.places.places.filter(p => p.category === cat?.id).length;
  current = openOverlay({ label: cat ? `${cat.label} map` : 'Places map', className: 'overlay--placeholder', onClose: () => { current = null; onClose?.(); } });
  current.root.append(el('div', { class: 'placeholder-dialog' },
    el('button', { class: 'icon-btn placeholder-close', type: 'button', 'aria-label': 'Close map', html: icon('close'), onClick: () => current?.close() }),
    el('p', { class: 'micro' }, 'PLACES'),
    el('h2', { class: 'h2' }, `${cat?.emoji ?? ''} ${cat?.label ?? 'Places'}`.trim()),
    el('p', { class: 'muted' }, `${count} spot(s) ready to pin. The interactive map arrives in Phase 6.`)));
}

export function closePlaces(opts = { silent: true }) {
  if (!current) return;
  const c = current;
  current = null;
  c.close(opts);
}

export const isPlacesOpen = () => !!current;
