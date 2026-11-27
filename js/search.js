// Search view. Phase 1: the input + URL syncing. Phase 5 adds the index, results, and browse tiles.

import { navigate } from './router.js';
import { el, debounce } from './utils.js';
import { icon as svg } from './icons.js';

export function renderSearchView(view, q = '') {
  const input = el('input', {
    class: 'search-input', type: 'search', id: 'search-input', value: q,
    placeholder: 'What do you want to find?', 'aria-label': 'Search the portfolio', autocomplete: 'off'
  });
  const sync = debounce(() => {
    const v = input.value.trim();
    navigate(v ? `search?q=${encodeURIComponent(v)}` : 'search', { replace: true });
  }, 100);
  input.addEventListener('input', sync);

  view.append(
    el('div', { class: 'search-bar' }, el('span', { class: 'search-icon', html: svg('search') }), input),
    el('section', { class: 'placeholder' },
      el('p', { class: 'muted' }, 'Results and "Browse all" tiles arrive in Phase 5.')));

  requestAnimationFrame(() => input.focus({ preventScroll: true }));
}

/** Keep an existing input in sync without re-rendering (called on replace-navigations). */
export function updateSearchView(q) {
  const input = document.getElementById('search-input');
  if (input && input.value.trim() !== q) input.value = q;
}
