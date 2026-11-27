// Reusable UI pieces shared across views: LIVE badge, count-up numbers, scroll reveal.

import { el, formatNumber, timeAgo, reducedMotion } from './utils.js';

/** Red pulsing dot + LIVE + "Updated X ago". */
export function liveBadge(updatedAt) {
  const ago = timeAgo(updatedAt);
  return el('span', { class: 'live-badge' },
    el('span', { class: 'live-dot', 'aria-hidden': 'true' }),
    el('span', { class: 'micro live-label' }, 'LIVE'),
    ago && el('span', { class: 'live-ago' }, `Updated ${ago}`));
}

/** Animates a number from 0 when it scrolls into view (instant under reduced motion). */
export function countUp(node, value, { format = formatNumber, duration = 1200 } = {}) {
  if (!Number.isFinite(value)) return node;
  if (reducedMotion() || !('IntersectionObserver' in window)) {
    node.textContent = format(value);
    return node;
  }
  node.textContent = format(0);
  const io = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    io.disconnect();
    const start = performance.now();
    const step = now => {
      const k = Math.min(1, (now - start) / duration);
      node.textContent = format(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  io.observe(node);
  return node;
}

/** Adds .is-in to each node as it scrolls into view (all at once under reduced motion). */
export function revealOnScroll(nodes) {
  const list = [...nodes];
  if (reducedMotion() || !('IntersectionObserver' in window)) {
    list.forEach(n => n.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { root: document.getElementById('main'), threshold: 0.15 });
  list.forEach((n, i) => {
    n.style.setProperty('--i', i);
    n.classList.add('will-reveal');
    io.observe(n);
  });
}
