// First-visit welcome popup: asks for the visitor's name and favorite song.
// The song field searches Spotify (through the spotify-search Edge Function) and shows a
// dropdown with album art, title, and artist; picking one saves the exact track.
// If search isn't available (demo mode / not set up yet), it falls back to plain typing.
// Remembers (in this browser only) that it was answered or skipped, so it shows once.

import { store } from './data.js';
import { el, present, debounce } from './utils.js';
import { openOverlay } from './modal.js';
import { submitSong, searchSongs, songSearchEnabled } from './backend.js';

const KEY = 'jds-visitor';

/** { status: 'submitted'|'skipped', name?, at } or null if this browser hasn't seen the popup. */
export function visitor() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
}
function saveVisitor(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ }
}

function field(label, input, { optional = false, hint = null, id } = {}) {
  return el('div', { class: 'w-field' },
    el('label', { class: 'w-label', for: id }, label, optional && el('span', { class: 'w-optional' }, ' · optional')),
    input,
    hint);
}

function miniEq() {
  return el('span', { class: 'w-eq', 'aria-hidden': 'true' }, [0, 1, 2, 3, 4].map(i => el('span', { style: { '--i': i } })));
}

/* ---------- Song search combobox ---------- */

function songPicker({ onChange }) {
  const listId = 'w-song-results';
  const input = el('input', {
    class: 'w-input', id: 'w-song', type: 'text', name: 'song', maxlength: '120', autocomplete: 'off',
    placeholder: 'Search for a song', required: true,
    role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': listId
  });
  const list = el('ul', { class: 'w-results', id: listId, role: 'listbox', 'aria-label': 'Song results', hidden: true });
  const status = el('p', { class: 'w-search-status', 'aria-live': 'polite' });
  const chosen = el('div', { class: 'w-chosen', hidden: true });
  const wrap = el('div', { class: 'w-combo' }, input, list);

  let results = [];
  let active = -1;
  let selected = null;
  let ctrl = null;

  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
  const highlight = i => {
    active = i;
    list.querySelectorAll('[role="option"]').forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
    if (i >= 0) {
      input.setAttribute('aria-activedescendant', `w-opt-${i}`);
      list.children[i]?.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  };

  const choose = track => {
    selected = track;
    close();
    wrap.hidden = true;
    status.textContent = '';
    chosen.replaceChildren(
      present(track.image) ? el('img', { class: 'w-chosen-art', src: track.image, alt: '' }) : el('span', { class: 'w-chosen-art' }),
      el('span', { class: 'w-chosen-text' },
        el('span', { class: 'w-chosen-title' }, track.name),
        el('span', { class: 'w-chosen-sub' }, [track.artists, track.album].filter(present).join(' · '))),
      el('button', {
        class: 'w-chosen-change', type: 'button', onClick: () => {
          selected = null;
          chosen.hidden = true;
          wrap.hidden = false;
          onChange(null);
          input.focus();
          input.select();
        }
      }, 'Change'));
    chosen.hidden = false;
    onChange(track);
    chosen.querySelector('.w-chosen-change')?.focus();
  };

  const render = () => {
    list.replaceChildren(...results.map((t, i) => el('li', {
      class: 'w-option', id: `w-opt-${i}`, role: 'option', 'aria-selected': 'false',
      onMousedown: e => e.preventDefault(),            // keep focus in the input
      onClick: () => choose(t)
    },
      present(t.image) ? el('img', { class: 'w-option-art', src: t.image, alt: '', loading: 'lazy' }) : el('span', { class: 'w-option-art' }),
      el('span', { class: 'w-option-text' },
        el('span', { class: 'w-option-title' }, t.name),
        el('span', { class: 'w-option-sub' }, [t.artists, t.album].filter(present).join(' · '))))));
    if (results.length) {
      list.append(el('li', { class: 'w-results-foot', role: 'presentation' }, 'Results from Spotify'));
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      highlight(-1);
    } else close();
  };

  const search = debounce(async () => {
    const q = input.value.trim();
    ctrl?.abort();
    if (q.length < 2) { results = []; render(); status.textContent = ''; return; }
    ctrl = new AbortController();
    status.textContent = 'Searching…';
    status.classList.remove('sr-only');
    try {
      const found = await searchSongs(q, { signal: ctrl.signal });
      if (found === null) { status.textContent = ''; results = []; render(); return; } // search unavailable → plain typing
      results = found;
      status.textContent = found.length ? `${found.length} results. Use arrow keys to choose.` : 'No matches. You can still add it as typed.';
      status.classList.toggle('sr-only', found.length > 0);
      render();
    } catch (err) {
      if (err.name !== 'AbortError') status.textContent = '';
    }
  }, 250);

  input.addEventListener('input', () => {
    if (selected) { selected = null; onChange(null); }
    if (songSearchEnabled()) search();
  });
  input.addEventListener('keydown', e => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); highlight(Math.min(results.length - 1, active + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(Math.max(-1, active - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(results[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  });
  input.addEventListener('blur', () => setTimeout(close, 120));

  return { node: el('div', {}, wrap, chosen, status), input, get selected() { return selected; } };
}

/* ---------- Popup ---------- */

/** Show the popup if this browser hasn't answered or skipped it yet. */
export function maybeShowWelcome({ onDone } = {}) {
  if (visitor()) return false;
  if (document.documentElement.classList.contains('has-overlay')) return false;
  openWelcome({ onDone });
  return true;
}

export function openWelcome({ onDone } = {}) {
  const w = store.profile.welcome ?? {};
  const submitLabel = present(w.submitLabel) ? w.submitLabel : 'Add to the queue';

  const o = openOverlay({
    label: 'Welcome',
    className: 'overlay--welcome',
    scrimClose: false,
    onClose: () => {
      if (!visitor()) saveVisitor({ status: 'skipped', at: Date.now() });
      onDone?.();
    }
  });

  const name = el('input', { class: 'w-input', id: 'w-name', type: 'text', name: 'name', maxlength: '60', autocomplete: 'given-name', placeholder: 'Your first name', required: true, autofocus: true });
  const artist = el('input', { class: 'w-input', id: 'w-artist', type: 'text', name: 'artist', maxlength: '120', autocomplete: 'off', placeholder: 'Who sings it?' });
  const artistField = field('Artist', artist, { optional: true, id: 'w-artist' });
  const picker = songPicker({ onChange: track => { artistField.hidden = !!track; } });
  // Honeypot: real people never see or fill this; simple bots do.
  const trap = el('input', { class: 'w-trap', type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
  const error = el('p', { class: 'w-error', role: 'alert' });
  const submit = el('button', { class: 'w-submit', type: 'submit' }, submitLabel);

  const form = el('form', { class: 'w-form', novalidate: true },
    field('Your name', name, { id: 'w-name' }),
    field('Favorite song right now', picker.node, { id: 'w-song' }),
    artistField,
    trap,
    present(w.privacy) && el('p', { class: 'w-privacy' }, w.privacy),
    error,
    el('div', { class: 'w-actions' },
      submit,
      el('button', { class: 'w-skip', type: 'button', onClick: () => o.close() }, present(w.skipLabel) ? w.skipLabel : 'Skip for now')));

  const card = el('div', { class: 'welcome-card' },
    el('div', { class: 'w-hero', 'aria-hidden': 'true' },
      el('span', { class: 'w-vinyl' }, el('span', { class: 'w-vinyl-label' })),
      miniEq()),
    el('div', { class: 'w-body' },
      el('p', { class: 'micro w-eyebrow' }, present(w.eyebrow) ? w.eyebrow : 'Welcome in'),
      el('h2', { class: 'w-title' }, present(w.title) ? w.title : 'Before you press play…'),
      present(w.body) && el('p', { class: 'w-text' }, w.body),
      form));

  function thanks(who, track) {
    const title = (present(w.thanksTitle) ? w.thanksTitle : 'Added to the queue, {name}!').replace('{name}', who || 'friend');
    card.querySelector('.w-body').replaceChildren(
      el('p', { class: 'micro w-eyebrow' }, 'Now playing'),
      el('h2', { class: 'w-title' }, title),
      track && el('div', { class: 'w-chosen w-chosen--done' },
        present(track.image) && el('img', { class: 'w-chosen-art', src: track.image, alt: '' }),
        el('span', { class: 'w-chosen-text' },
          el('span', { class: 'w-chosen-title' }, track.name),
          el('span', { class: 'w-chosen-sub' }, track.artists))),
      present(w.thanksBody) && el('p', { class: 'w-text' }, w.thanksBody),
      el('div', { class: 'w-actions' },
        el('button', { class: 'w-submit', type: 'button', autofocus: true, onClick: () => o.close() }, 'Start listening')));
    card.querySelector('.w-actions .w-submit')?.focus();
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    error.textContent = '';
    if (trap.value) { saveVisitor({ status: 'skipped', at: Date.now() }); o.close(); return; }
    const track = picker.selected;
    const songText = track ? track.name : picker.input.value.trim();
    if (!name.value.trim() || !songText) {
      error.textContent = 'Add your name and a song.';
      (name.value.trim() ? picker.input : name).focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Adding…';
    try {
      await submitSong({ name: name.value, song: songText, artist: artist.value, track });
      const who = name.value.trim().slice(0, 60);
      saveVisitor({ status: 'submitted', name: who, at: Date.now() });
      thanks(who, track);
    } catch (err) {
      error.textContent = err.message || 'Something went wrong. Try again?';
      submit.disabled = false;
      submit.textContent = submitLabel;
    }
  });

  o.root.append(card);
}
