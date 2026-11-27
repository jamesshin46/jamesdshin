// Entry point: load content, render the app shell, and route between views.

import { loadAll, store } from './data.js';
import { startRouter, onRoute, navigate } from './router.js';
import { el, clear, present } from './utils.js';
import { hydrateIcons } from './icons.js';
import { coverArt } from './covers.js';
import { initPlayer } from './player.js';
import { renderArtistPage } from './render-artist.js';
import { renderAlbumView } from './album-view.js';
import { renderSearchView, updateSearchView } from './search.js';
import { openRecap, closeRecap } from './recap.js';
import { openPlaces, closePlaces } from './places-map.js';

const view = document.getElementById('view');
const main = document.getElementById('main');

let currentPageKey = null;   // key of the page view currently rendered under any modal
let modalFromPage = false;   // did the visitor open the current modal from a page in this session?
let pendingScroll = null;    // section id to scroll to after the next home render

/* ---------- Shell ---------- */

function renderShell() {
  const brand = document.getElementById('brand-name');
  if (brand) brand.textContent = store.profile.name ?? '';

  const list = clear(document.getElementById('library-list'));
  store.albums.forEach(album => {
    const sub = [album.type, album.year].filter(present).join(' · ');
    list.append(el('li', {},
      el('a', { class: 'library-item', href: `#/album/${encodeURIComponent(album.id)}`, dataset: { album: album.id }, title: album.title },
        el('span', { class: 'library-art' }, coverArt(album)),
        el('span', { class: 'library-text' },
          el('span', { class: 'library-name' }, album.title),
          present(sub) && el('span', { class: 'library-sub' }, sub)))));
  });

  document.getElementById('skip-link')?.addEventListener('click', () => main.focus());
  document.getElementById('tab-contact')?.addEventListener('click', goToContact);
  hydrateIcons();
}

function setActiveNav(route) {
  document.querySelectorAll('[data-nav]').forEach(n => {
    if (n.dataset.nav === route.name) n.setAttribute('aria-current', 'page');
    else n.removeAttribute('aria-current');
  });
  document.querySelectorAll('.library-item').forEach(n => {
    if (route.name === 'album' && n.dataset.album === route.id) n.setAttribute('aria-current', 'page');
    else n.removeAttribute('aria-current');
  });
}

function goToContact() {
  if (currentPageKey === 'home' && !document.documentElement.classList.contains('has-overlay')) {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    pendingScroll = 'contact';
    navigate('');
  }
}

/* ---------- Routing ---------- */

function renderPage(route) {
  clear(view);
  view.dataset.view = route.name;
  if (route.name === 'album') renderAlbumView(view, route.id);
  else if (route.name === 'search') renderSearchView(view, route.q);
  else renderArtistPage(view);
  currentPageKey = route.key;
}

function leaveModal() {
  if (modalFromPage) history.back();
  else navigate('', { replace: true });
}

function handleRoute(route) {
  if (route.name === 'notfound') {
    navigate('', { replace: true });
    return;
  }

  if (route.modal) {
    modalFromPage = currentPageKey !== null;
    if (!currentPageKey) renderPage({ name: 'home', key: 'home' });
    if (route.name === 'recap') {
      closePlaces();
      openRecap({ onClose: leaveModal });
    } else {
      closeRecap();
      openPlaces(route.category, { onClose: leaveModal });
    }
    setActiveNav(route);
    return;
  }

  // Page route: close any modal silently (e.g. visitor pressed Back).
  closeRecap();
  closePlaces();

  if (route.key === currentPageKey) {
    if (route.name === 'search') updateSearchView(route.q);
  } else {
    renderPage(route);
    main.scrollTo({ top: 0 });
  }
  setActiveNav(route);

  if (pendingScroll && route.name === 'home') {
    const id = pendingScroll;
    pendingScroll = null;
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }
}

/* ---------- Boot ---------- */

async function boot() {
  await loadAll();

  if (!store.loaded) {
    view.append(el('section', { class: 'placeholder' },
      el('h1', { class: 'h2' }, 'Couldn’t load the site content'),
      el('p', { class: 'muted' }, 'If you opened index.html directly from your files, open it with VS Code Live Server instead (right-click index.html → Open with Live Server).')));
    return;
  }

  renderShell();
  initPlayer();
  onRoute(handleRoute);
  startRouter();
}

boot();
