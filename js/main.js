// Entry point: load content, render the app shell, and route between views.

import { loadAll, store } from './data.js';
import { startRouter, onRoute, navigate } from './router.js';
import { el, clear, present } from './utils.js';
import { hydrateIcons } from './icons.js';
import { orgLogo, orgDatesLabel } from './orgs.js';
import { initPlayer } from './player.js';
import { initTopbar, setTopbar } from './topbar.js';
import { renderArtistPage, refreshGreeting } from './render-artist.js';
import { initOwnerGesture, renderOwnerView } from './owner.js';
import { renderOrgView } from './org-view.js';
import { renderLikedView } from './liked-view.js';
import { likes, onLikesChange } from './likes.js';
import { icon } from './icons.js';
import { maybeShowWelcome } from './welcome.js';
import { isOwner } from './backend.js';
import { parseHash } from './router.js';
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

  // Your Library: every experience / club / education page, grouped, with logos.
  const list = clear(document.getElementById('library-list'));
  // Pinned "Liked" playlist, like Liked Songs.
  const likedSub = el('span', { class: 'library-sub' });
  const paintLiked = () => { const n = likes().length; likedSub.textContent = `Playlist · ${n} ${n === 1 ? 'item' : 'items'}`; };
  paintLiked();
  onLikesChange(paintLiked);
  list.append(el('li', {},
    el('a', { class: 'library-item', href: '#/liked', dataset: { nav: 'liked' }, title: 'Liked' },
      el('span', { class: 'library-art liked-tile', html: icon('heartFilled', { size: 20 }) }),
      el('span', { class: 'library-text' }, el('span', { class: 'library-name' }, 'Liked'), likedSub))));
  [['Experience', store.experience], ['Clubs', store.clubs], ['Education', store.education]].forEach(([label, orgs]) => {
    if (!orgs.length) return;
    list.append(el('li', { class: 'library-group micro' }, label));
    orgs.forEach(org => {
      const sub = [org.roles[0]?.title, orgDatesLabel(org)].filter(present).join(' · ');
      list.append(el('li', {},
        el('a', { class: 'library-item', href: `#/org/${encodeURIComponent(org.id)}`, dataset: { org: org.id }, title: org.name },
          el('span', { class: `library-art${org.kind === 'club' ? ' is-round' : ''}` }, orgLogo(org)),
          el('span', { class: 'library-text' },
            el('span', { class: 'library-name' }, org.name),
            present(sub) && el('span', { class: 'library-sub' }, sub)))));
    });
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
  document.querySelectorAll('.library-item[data-org]').forEach(n => {
    if (route.name === 'org' && n.dataset.org === route.id) n.setAttribute('aria-current', 'page');
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
  setTopbar({});
  if (route.name === 'search') { setTopbar({ threshold: -1 }); renderSearchView(view, route.q); }
  else if (route.name === 'owner') { setTopbar({ threshold: -1 }); renderOwnerView(view); }
  else if (route.name === 'org') renderOrgView(view, route.id);
  else if (route.name === 'liked') renderLikedView(view);
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
  initTopbar();
  initPlayer();
  initOwnerGesture();
  onRoute(handleRoute);
  startRouter();

  // First visit: welcome popup (not on top of Recap/map deep links, and not for the owner).
  setTimeout(() => {
    if (parseHash().modal || isOwner()) return;
    maybeShowWelcome({ onDone: refreshGreeting });
  }, 700);
}

boot();
