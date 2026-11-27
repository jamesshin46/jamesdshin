// Sticky top bar inside the main panel: back/forward arrows, and — once the visitor scrolls past
// a page's header — a solid background with a mini play button and the page title.

import { el, clear, present } from './utils.js';
import { icon } from './icons.js';

let getThreshold = () => 200;
const $ = id => document.getElementById(id);

function update() {
  const bar = $('topbar');
  const main = $('main');
  if (!bar || !main) return;
  const solid = main.scrollTop > getThreshold();
  bar.classList.toggle('is-solid', solid);
  const title = $('topbar-title');
  if (title) title.inert = !solid;
}

export function initTopbar() {
  $('nav-back')?.addEventListener('click', () => history.back());
  $('nav-fwd')?.addEventListener('click', () => history.forward());
  let raf = 0;
  $('main')?.addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); });
  }, { passive: true });
}

/**
 * Configure the bar for the current view.
 *   title, onPlay, playLabel — shown when solid
 *   color     — tint for the solid background
 *   threshold — px scrolled before it turns solid (number or function); -1 = always solid
 */
export function setTopbar({ title = '', onPlay = null, playLabel = 'Play', color = null, threshold = 200 } = {}) {
  getThreshold = typeof threshold === 'function' ? threshold : () => threshold;
  const bar = $('topbar');
  if (!bar) return;
  bar.style.setProperty('--topbar-c', color ?? 'var(--accent)');
  const t = clear($('topbar-title'));
  if (onPlay) t.append(el('button', { class: 'play-sm', type: 'button', 'aria-label': playLabel, title: playLabel, html: icon('play'), onClick: onPlay }));
  if (present(title)) t.append(el('span', { class: 'topbar-name' }, title));
  update();
}
