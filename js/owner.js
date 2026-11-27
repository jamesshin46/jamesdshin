// Hidden owner mode.
//   • Secret gesture: press Home 10 times in a row (each press within 1.5s of the last).
//   • A password prompt appears; the password is checked by Supabase (never stored in this code).
//   • Once unlocked, a "Favorite songs" item appears next to Home and Search (route #/owner),
//     listing every visitor's name + song, with buttons to feature a song or delete an entry.

import { el, clear, present, toast, timeAgo, listenUrl } from './utils.js';
import { icon } from './icons.js';
import { openOverlay } from './modal.js';
import { navigate } from './router.js';
import * as api from './backend.js';
import { allOrgs } from './data.js';
import { logoOrb } from './orgs.js';

const TAPS_NEEDED = 10;
const MAX_GAP_MS = 1500;

/** Show/hide the owner-only nav items. */
export function syncOwnerNav() {
  const on = api.isOwner();
  document.querySelectorAll('[data-owner-only]').forEach(n => (n.hidden = !on));
}

export function initOwnerGesture() {
  let count = 0;
  let last = 0;
  document.querySelectorAll('[data-nav="home"]').forEach(node => node.addEventListener('click', () => {
    const now = performance.now();
    count = now - last <= MAX_GAP_MS ? count + 1 : 1;
    last = now;
    if (count < TAPS_NEEDED) return;
    count = 0;
    if (api.isOwner()) navigate('owner');
    else openLogin();
  }));
  syncOwnerNav();
}

export function openLogin() {
  const o = openOverlay({ label: 'Owner view', className: 'overlay--card' });
  const pw = el('input', { class: 'w-input', type: 'password', autocomplete: 'current-password', placeholder: 'Password', 'aria-label': 'Password', autofocus: true });
  const error = el('p', { class: 'w-error', role: 'alert' });
  const btn = el('button', { class: 'w-submit', type: 'submit' }, 'Unlock');

  const form = el('form', { class: 'owner-login', novalidate: true },
    el('span', { class: 'owner-lock', html: icon('lock') }),
    el('p', { class: 'micro' }, 'Owner view'),
    el('h2', { class: 'h2' }, 'Enter your password'),
    !api.isLive() && el('p', { class: 'owner-demo' }, 'Demo mode: no database is connected yet, so any password unlocks and data stays in this browser.'),
    pw, error, btn);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    error.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Checking…';
    try {
      await api.login(pw.value);
      o.close({ silent: true });
      syncOwnerNav();
      toast('Owner view unlocked');
      navigate('owner');
    } catch (err) {
      error.textContent = err.message;
      btn.disabled = false;
      btn.textContent = 'Unlock';
      pw.select();
    }
  });

  o.root.append(el('div', { class: 'info-card owner-card' },
    el('button', { class: 'icon-btn info-close', type: 'button', 'aria-label': 'Close', html: icon('close'), onClick: () => o.close() }),
    form));
}

/* ---------- #/owner page ---------- */

function openFeatureDialog(sub, onSaved) {
  const o = openOverlay({ label: 'Feature this song', className: 'overlay--card' });
  const note = el('textarea', { class: 'w-input w-textarea', maxlength: '280', rows: '3', placeholder: 'Why you like it (optional, shown on your page)', autofocus: true });
  const error = el('p', { class: 'w-error', role: 'alert' });
  const btn = el('button', { class: 'w-submit', type: 'submit' }, 'Feature on my page');
  const form = el('form', { class: 'owner-login', novalidate: true },
    el('p', { class: 'micro' }, 'Listener pick'),
    present(sub.cover_url) && el('img', { class: 'owner-feature-cover', src: sub.cover_url, alt: '' }),
    el('h2', { class: 'h2' }, sub.song),
    el('p', { class: 'muted' }, [sub.artist, `from ${sub.visitor_name}`].filter(present).join(' · ')),
    note, error, btn);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    btn.disabled = true;
    try {
      await api.setFeatured(sub, note.value);
      o.close({ silent: true });
      toast('Featured on your home page');
      onSaved();
    } catch (err) {
      if (err instanceof api.AuthError) { o.close({ silent: true }); onSaved(err); return; }
      error.textContent = err.message;
      btn.disabled = false;
    }
  });
  o.root.append(el('div', { class: 'info-card owner-card' },
    el('button', { class: 'icon-btn info-close', type: 'button', 'aria-label': 'Close', html: icon('close'), onClick: () => o.close() }),
    form));
}

export function renderOwnerView(view) {
  if (!api.isOwner()) { navigate('', { replace: true }); return; }

  const count = el('p', { class: 'muted owner-count' }, '');
  const pickSlot = el('div', { class: 'owner-pick-slot' });
  const likesSlot = el('div', { class: 'owner-likes-slot' });
  const listSlot = el('div', { class: 'owner-list-slot' }, el('p', { class: 'muted' }, 'Loading…'));

  view.append(el('section', { class: 'owner' },
    el('div', { class: 'owner-head' },
      el('div', {},
        el('p', { class: 'micro owner-eyebrow' }, api.isLive() ? 'Owner view · only you can see this' : 'Owner view · demo mode'),
        el('h1', { class: 'owner-title' }, 'Favorite songs'),
        count),
      el('button', {
        class: 'pill-btn', type: 'button',
        onClick: () => { api.logout(); syncOwnerNav(); toast('Owner view locked'); navigate(''); }
      }, el('span', { html: icon('lock', { size: 18 }) }), 'Lock')),
    pickSlot,
    likesSlot,
    el('h2', { class: 'owner-section-title' }, 'Visitors’ songs'),
    listSlot));

  const handleError = err => {
    if (err instanceof api.AuthError) {
      syncOwnerNav();
      clear(listSlot).append(el('div', { class: 'owner-empty' },
        el('p', {}, err.message),
        el('button', { class: 'pill-btn', type: 'button', onClick: openLogin }, 'Unlock again')));
      return;
    }
    clear(listSlot).append(el('p', { class: 'w-error' }, err.message || 'Something went wrong.'));
  };

  async function load(maybeErr) {
    if (maybeErr) return handleError(maybeErr);
    try {
      const [subs, featured, totals] = await Promise.all([api.listSubmissions(), api.fetchFeatured(), api.likeTotals()]);
      if (!view.isConnected) return;
      count.textContent = `${subs.length} ${subs.length === 1 ? 'visitor has' : 'visitors have'} shared a song`;
      renderPick(featured);
      renderLikes(totals);
      renderList(subs, featured);
    } catch (err) {
      handleError(err);
    }
  }

  function renderPick(f) {
    clear(pickSlot);
    if (!f?.song) {
      pickSlot.append(el('p', { class: 'owner-hint' }, 'No listener pick yet. Press “Feature” on a song below to show it on your home page.'));
      return;
    }
    pickSlot.append(el('div', { class: 'owner-current' },
      present(f.cover_url) && el('img', { class: 'owner-current-cover', src: f.cover_url, alt: '' }),
      el('div', { class: 'owner-current-text' },
        el('p', { class: 'micro' }, 'Currently featured on your page'),
        el('p', { class: 'owner-current-song' }, f.song, present(f.artist) && el('span', { class: 'muted' }, ` · ${f.artist}`)),
        el('p', { class: 'muted' }, `Recommended by ${f.visitor_name}`, present(f.note) ? ` · “${f.note}”` : '')),
      el('button', {
        class: 'pill-btn', type: 'button',
        onClick: async () => {
          try { await api.clearFeatured(); toast('Listener pick removed'); load(); }
          catch (err) { handleError(err); }
        }
      }, 'Remove')));
  }

  function renderLikes(totals) {
    clear(likesSlot);
    const head = el('h2', { class: 'owner-section-title' }, 'Most liked');
    if (totals == null) {
      likesSlot.append(head, el('p', { class: 'owner-hint' }, 'Run supabase/003_likes.sql in Supabase to start counting likes.'));
      return;
    }
    const rows = allOrgs().map(o => ({ o, n: Math.max(0, totals[o.id] ?? 0) })).sort((a, b) => b.n - a.n);
    const max = Math.max(1, ...rows.map(r => r.n));
    const total = rows.reduce((s, r) => s + r.n, 0);
    likesSlot.append(head,
      el('p', { class: 'owner-hint' }, total ? `${total} ${total === 1 ? 'like' : 'likes'} across your pages` : 'No likes yet. They’ll show up here as visitors tap the heart.'),
      el('ol', { class: 'owner-likes' }, rows.map(({ o, n }) => el('li', { class: 'owner-like-row', style: { '--c': o.color || 'var(--accent)', '--fill': (n / max).toFixed(3) } },
        logoOrb(o, { shape: o.kind === 'club' ? 'circle' : 'square', size: 'mini' }),
        el('a', { class: 'owner-like-name', href: `#/org/${encodeURIComponent(o.id)}` }, o.name),
        el('span', { class: 'owner-like-bar', 'aria-hidden': 'true' }, el('span')),
        el('span', { class: 'owner-like-count num' }, `♥ ${n}`)))));
  }

  function renderList(subs, featured) {
    clear(listSlot);
    if (!subs.length) {
      listSlot.append(el('div', { class: 'owner-empty' }, el('p', {}, 'No songs yet. They’ll show up here as visitors answer the welcome popup.')));
      return;
    }
    listSlot.append(el('ol', { class: 'owner-list' }, subs.map((s, i) => {
      const isPick = featured && featured.song === s.song && featured.visitor_name === s.visitor_name;
      return el('li', { class: `owner-row${isPick ? ' is-pick' : ''}` },
        el('span', { class: 'owner-num num' }, String(i + 1)),
        el('span', { class: 'owner-who' },
          el('strong', {}, s.visitor_name),
          el('span', { class: 'owner-when' }, timeAgo(s.created_at) ?? '')),
        el('span', { class: 'owner-song' },
          present(s.cover_url) ? el('img', { class: 'owner-cover', src: s.cover_url, alt: '', loading: 'lazy' }) : el('span', { class: 'owner-cover is-empty', html: icon('queue', { size: 18 }) }),
          el('span', { class: 'owner-song-text' },
            el('span', { class: 'owner-song-title' }, s.song),
            el('span', { class: 'owner-song-artist' }, [s.artist, s.album].filter(present).join(' · ')))),
        el('span', { class: 'owner-actions' },
          isPick
            ? el('span', { class: 'owner-badge micro' }, 'Featured')
            : el('button', { class: 'pill-btn pill-btn--sm', type: 'button', onClick: () => openFeatureDialog(s, load) }, 'Feature'),
          el('a', { class: 'icon-btn', href: present(s.track_url) ? s.track_url : listenUrl(s.song, s.artist), target: '_blank', rel: 'noopener', 'aria-label': present(s.track_url) ? `Open ${s.song} on Spotify` : `Look up ${s.song} on YouTube`, title: present(s.track_url) ? 'Open on Spotify' : 'Look it up', html: icon('external', { size: 18 }) }),
          el('button', {
            class: 'icon-btn', type: 'button', 'aria-label': `Delete ${s.visitor_name}'s song`, title: 'Delete', html: icon('trash', { size: 18 }),
            onClick: async () => {
              if (!confirm(`Delete "${s.song}" from ${s.visitor_name}?`)) return;
              try { await api.deleteSubmission(s.id); toast('Deleted'); load(); }
              catch (err) { handleError(err); }
            }
          })));
    })));
  }

  load();
}
