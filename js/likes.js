// "Liked": visitors can heart any experience, club, or school. Likes are saved in this
// browser (like a personal Liked Songs playlist) and collected on the #/liked page.

import { el, toast, reducedMotion } from './utils.js';
import { icon } from './icons.js';
import { getOrg } from './data.js';
import { recordLike } from './backend.js';

const KEY = 'jds-liked';
const EVENT = 'jds:likes';

/** [{ id, at }] newest first, only for pages that still exist. */
export function likes() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { /* ignore */ }
  return Array.isArray(list) ? list.filter(l => l && getOrg(l.id)) : [];
}
export const isLiked = id => likes().some(l => l.id === id);

function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function toggleLike(id) {
  const list = likes();
  const on = !list.some(l => l.id === id);
  save(on ? [{ id, at: Date.now() }, ...list] : list.filter(l => l.id !== id));
  recordLike(id, on); // anonymous tally for the owner view
  toast(on ? 'Added to Liked' : 'Removed from Liked');
  return on;
}

/** Call fn whenever likes change (any heart, any page). Returns an unsubscribe function. */
export function onLikesChange(fn) {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

/** A heart toggle button for one page. Stays in sync with every other heart for that page. */
export function heartButton(id, { size = 22, className = '' } = {}) {
  const org = getOrg(id);
  const btn = el('button', { class: `heart-btn ${className}`.trim(), type: 'button' });
  const paint = () => {
    const on = isLiked(id);
    btn.classList.toggle('is-liked', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? `Remove ${org?.name ?? ''} from Liked` : `Add ${org?.name ?? ''} to Liked`);
    btn.title = on ? 'Remove from Liked' : 'Add to Liked';
    btn.innerHTML = icon(on ? 'heartFilled' : 'heart', { size });
  };
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    const on = toggleLike(id);
    if (on && !reducedMotion()) {
      btn.classList.remove('pop');
      void btn.offsetWidth; // restart the animation
      btn.classList.add('pop');
    }
  });
  paint();
  const off = onLikesChange(() => { if (!btn.isConnected) { off(); return; } paint(); });
  return btn;
}
