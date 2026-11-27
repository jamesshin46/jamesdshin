// Artist page (home): hero banner with cutout portrait, listener pick, action bar, Experience
// timeline, Clubs, Education, Dance covers, Fans also like, About (record sleeve), Contact, footer.
// Each experience / club / education entry opens its own album page (js/org-view.js).

import { store, youtubeTotal, viewCount, hasLiveViews } from './data.js';
import { el, present, greetingKey, reducedMotion, toast, initials, listenUrl, daysUntil, formatNumber } from './utils.js';
import { icon, verifiedBadge } from './icons.js';
import { navigate } from './router.js';
import { openOverlay } from './modal.js';
import { liveBadge, countUp, revealOnScroll } from './ui.js';
import { youtubeUrl, youtubeEmbed } from './player.js';
import { setTopbar } from './topbar.js';
import { fetchFeatured } from './backend.js';
import { logoOrb, orgDatesLabel } from './orgs.js';
import { heartButton } from './likes.js';
import { visitor } from './welcome.js';

const PALETTE = ['#E0457B', '#C98A3D', '#2FB6C9', '#8A6BFF', '#E2563B', '#3D8BFF', '#2E9E6E', '#7B4FD6'];
let greetTimer = null;

export function renderArtistPage(view) {
  const p = store.profile;
  const heroEl = hero(p);

  view.append(
    heroEl,
    el('div', { class: 'artist-body' },
      listenerPick(),
      actionBar(p),
      experience(),
      clubs(),
      education(),
      fansAlsoLike(),
      about(p),
      contact(p),
      footer(p)));

  setTopbar({
    title: p.name,
    onPlay: () => navigate('recap'),
    playLabel: 'Play Recap',
    threshold: () => heroEl.offsetHeight - 120
  });
  heroMotion(heroEl);
  startGreetingClock();
  revealOnScroll(view.querySelectorAll('.tl-item'));
}

/* ---------- Greeting ---------- */

function fillGreeting(node) {
  const g = store.profile.greetings?.[greetingKey()];
  node.replaceChildren();
  node.hidden = !present(g?.title);
  if (node.hidden) return;
  const name = visitor()?.name;
  node.append(el('strong', {}, present(name) ? `${g.title}, ${name}` : g.title), present(g.subtitle) ? ` · ${g.subtitle}` : '');
}

/** Re-render the greeting (e.g. after a visitor tells us their name). */
export function refreshGreeting() {
  const n = document.getElementById('greeting');
  if (n) fillGreeting(n);
}

function startGreetingClock() {
  clearInterval(greetTimer);
  greetTimer = setInterval(() => {
    const n = document.getElementById('greeting');
    if (n) fillGreeting(n);
    else clearInterval(greetTimer);
  }, 10 * 60 * 1000);
}

/* ---------- Hero ---------- */

/** A row of equalizer bars that bounce behind the portrait, like a track that's playing. */
function equalizer(count = 32) {
  const bars = [];
  for (let i = 0; i < count; i++) {
    // Taller in the middle, randomized speed/phase so it never looks like a loop.
    const center = 1 - Math.abs(i - (count - 1) / 2) / (count / 2);
    const peak = (0.35 + center * 0.65) * (0.7 + Math.random() * 0.3);
    bars.push(el('span', { class: 'eq-col' }, el('span', {
      class: 'eq-bar',
      style: {
        '--peak': peak.toFixed(2),
        '--dur': `${(0.9 + Math.random() * 0.9).toFixed(2)}s`,
        '--delay': `${(-Math.random() * 2).toFixed(2)}s`
      }
    })));
  }
  return el('div', { class: 'hero-eq', 'aria-hidden': 'true' }, bars);
}

function hero(p) {
  const total = youtubeTotal();
  const words = Array.isArray(p.heroMarquee) ? p.heroMarquee.filter(present) : [];

  const figure = el('div', { class: 'hero-figure' }, el('div', { class: 'hero-glow', 'aria-hidden': 'true' }));
  const portrait = present(p.cutout) ? p.cutout : p.headshot;
  if (present(portrait)) {
    const img = el('img', {
      class: `hero-cutout${portrait === p.cutout ? '' : ' is-fallback'}`,
      src: portrait, alt: `Portrait of ${p.name ?? ''}`.trim(), decoding: 'async', fetchpriority: 'high'
    });
    img.addEventListener('error', () => {
      if (present(p.headshot) && !img.classList.contains('is-fallback')) {
        img.classList.add('is-fallback');
        img.src = p.headshot;
      } else img.remove();
    });
    figure.append(img);
  }

  const stat = el('p', { class: 'hero-stat' });
  if (total != null) {
    stat.append(
      el('span', {}, countUp(el('strong', { class: 'num' }), total), ' YouTube views across my dance covers'),
      liveBadge(store.views.updatedAt));
  } else if (present(p.headlineStatFallback)) {
    stat.append(p.headlineStatFallback);
  }

  const badgeText = present(p.verifiedLabel) ? p.verifiedLabel : p.label;

  return el('header', { class: 'artist-hero' },
    el('div', { class: 'hero-bg', 'aria-hidden': 'true' },
      present(p.bannerImage) && el('img', { src: p.bannerImage, alt: '', decoding: 'async' })),
    words.length > 0 && el('div', { class: 'hero-marquee', 'aria-hidden': 'true' },
      el('div', { class: 'marquee-track' }, [0, 1].map(() => el('span', {}, words.map(w => `${w} ✦ `).join(''))))),
    el('div', { class: 'hero-spot', 'aria-hidden': 'true' }),
    equalizer(),
    figure,
    el('div', { class: 'hero-content' },
      fillAndReturn(el('p', { class: 'greeting', id: 'greeting' })),
      present(badgeText) && el('p', { class: 'verified' }, el('span', { class: 'verified-badge', html: verifiedBadge() }), badgeText),
      el('h1', { class: 'artist-name' }, p.name ?? ''),
      present(p.tagline) && el('p', { class: 'hero-tagline' }, p.tagline),
      stat));
}

function fillAndReturn(node) {
  fillGreeting(node);
  return node;
}

/**
 * Hero motion:
 *  • scroll — banner layers drift at different speeds as the page scrolls
 *  • cursor — the equalizer reacts like a visualizer (bars near the mouse jump up)
 *             and a soft stage spotlight follows the mouse
 */
function heroMotion(hero) {
  if (reducedMotion()) return;
  const main = document.getElementById('main');
  const ctrl = new AbortController();
  const cols = [...hero.querySelectorAll('.eq-col')];
  let raf = 0;
  let pointer = null; // { x, y } in px relative to the hero

  const apply = () => {
    raf = 0;
    if (!hero.isConnected) { ctrl.abort(); return; }
    const s = Math.min(1, Math.max(0, main.scrollTop / (hero.offsetHeight || 1)));
    hero.style.setProperty('--scroll', s.toFixed(3));

    const r = hero.getBoundingClientRect();
    if (pointer) {
      hero.style.setProperty('--mx', `${pointer.x}px`);
      hero.style.setProperty('--my', `${pointer.y}px`);
    }
    // Visualizer: boost falls off with horizontal distance from the cursor
    cols.forEach(col => {
      let boost = 0;
      if (pointer) {
        const c = col.getBoundingClientRect();
        const dx = Math.abs(c.left + c.width / 2 - (r.left + pointer.x));
        boost = Math.max(0, 1 - dx / 140);
        boost *= boost; // smoother peak
      }
      col.style.setProperty('--boost', boost.toFixed(3));
    });
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(apply); };

  main.addEventListener('scroll', queue, { passive: true, signal: ctrl.signal });
  if (matchMedia('(pointer: fine)').matches) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      hero.classList.add('is-hovering');
      queue();
    }, { signal: ctrl.signal });
    hero.addEventListener('pointerleave', () => {
      pointer = null;
      hero.classList.remove('is-hovering');
      queue();
    }, { signal: ctrl.signal });
  }
}

/* ---------- Action bar ---------- */

function linkIcon(type) {
  return { email: 'mail', linkedin: 'linkedin', github: 'github' }[type] ?? 'external';
}

function actionBar(p) {
  const resume = present(p.resumeUrl)
    ? el('a', { class: 'pill-btn', href: p.resumeUrl, target: '_blank', rel: 'noopener', hidden: true },
        el('span', { html: icon('doc', { size: 18 }) }), 'Résumé')
    : null;
  // Only show the résumé button once we know the PDF is actually there.
  if (resume) fetch(p.resumeUrl, { method: 'HEAD' }).then(r => { if (r.ok) resume.hidden = false; }).catch(() => {});

  const contactBtn = el('button', { class: 'pill-btn', type: 'button', onClick: () => document.getElementById('contact')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' }) },
    el('span', { html: icon('mail', { size: 18 }) }), 'Contact');

  const icons = p.contact.links.map(l => el('a', {
    class: 'icon-btn', href: l.url, 'aria-label': l.label, title: l.label,
    ...(l.type === 'email' ? {} : { target: '_blank', rel: 'noopener' }),
    html: icon(linkIcon(l.type))
  }));

  return el('div', { class: 'artist-intro' },
    el('div', { class: 'action-bar' },
      el('button', { class: 'play-xl', type: 'button', onClick: () => navigate('recap') },
        el('span', { class: 'play-xl-circle', html: icon('play') }),
        el('span', { class: 'play-xl-label' }, el('span', { class: 'micro' }, 'New'), el('span', {}, 'Play Recap'))),
      resume, contactBtn,
      el('div', { class: 'action-icons' }, icons)),
    p.stats.length > 0 && el('p', { class: 'artist-stats' }, p.stats.join(' · ')));
}

/* ---------- Listener pick (a visitor's song James chose to feature) ---------- */

function listenerPick() {
  const slot = el('section', { class: 'listener-pick', 'aria-labelledby': 'lp-h', hidden: true });
  fetchFeatured().then(f => {
    if (!f || !present(f.song) || !slot.isConnected) return;
    const onSpotify = present(f.track_url);
    slot.append(
      el('div', { class: `lp-art${present(f.cover_url) ? ' has-cover' : ''}`, 'aria-hidden': 'true' },
        el('span', { class: 'lp-disc' }, el('span', { class: 'lp-disc-label' })),
        present(f.cover_url) && el('img', { class: 'lp-cover', src: f.cover_url, alt: '', loading: 'lazy' })),
      el('div', { class: 'lp-text' },
        el('p', { class: 'micro lp-eyebrow' }, 'Listener pick'),
        el('h2', { class: 'lp-song', id: 'lp-h' }, f.song),
        el('p', { class: 'lp-meta' },
          present(f.artist) && el('span', { class: 'lp-artist' }, f.artist),
          present(f.album) && el('span', {}, f.album),
          present(f.visitor_name) && el('span', {}, `Recommended by ${f.visitor_name}`)),
        present(f.note) && el('p', { class: 'lp-note' }, `“${f.note}”`)),
      el('a', { class: 'pill-btn pill-btn--solid lp-listen', href: onSpotify ? f.track_url : listenUrl(f.song, f.artist), target: '_blank', rel: 'noopener' },
        el('span', { html: icon('play', { size: 16 }) }), onSpotify ? 'Play on Spotify' : 'Listen'));
    slot.hidden = false;
  });
  return slot;
}

/* ---------- Experience timeline ---------- */

function experience() {
  return timelineSection(store.experience, 'Experience', 'exp-h');
}

function education() {
  return timelineSection(store.education, 'Education', 'edu-h');
}

function timelineSection(items, title, hid) {
  if (!items.length) return null;
  return el('section', { class: 'experience', 'aria-labelledby': hid },
    el('h2', { class: 'h2', id: hid }, title),
    el('ol', { class: 'timeline' }, items.map(org => {
      const upcoming = org.status === 'upcoming';
      const days = daysUntil(org.start);
      const dates = orgDatesLabel(org);
      return el('li', { class: `tl-item${upcoming ? ' is-upcoming' : ''}` },
        el('a', { class: 'tl-link', href: `#/org/${encodeURIComponent(org.id)}` },
          el('span', { class: 'tl-node' }, logoOrb(org, { shape: 'square', size: 'node' })),
          el('span', { class: 'tl-body' },
            el('span', { class: 'tl-top' },
              el('span', { class: 'tl-company' }, org.name),
              upcoming && el('span', { class: 'tl-pill micro' }, days != null && days > 0 ? `Starts in ${days} days` : 'Up next')),
            present(org.roles[0]?.title) && el('span', { class: 'tl-role' }, org.roles[0].title),
            present(dates) && el('span', { class: 'tl-dates' }, dates),
            present(org.phrase) && el('span', { class: 'tl-phrase' }, org.phrase)),
          el('span', { class: 'tl-go', html: icon('chevronRight', { size: 20 }) })),
        heartButton(org.id, { size: 20, className: 'tl-heart' }));
    })));
}

/* ---------- Clubs ---------- */

function clubs() {
  if (!store.clubs.length) return null;
  return el('section', { class: 'clubs', 'aria-labelledby': 'clubs-h' },
    el('h2', { class: 'h2', id: 'clubs-h' }, 'Clubs & communities'),
    el('ul', { class: 'shelf' }, store.clubs.map(c => el('li', {},
      el('a', { class: 'fan-card club-card', href: `#/org/${encodeURIComponent(c.id)}` },
        logoOrb(c, { shape: 'circle', size: 'shelf' }),
        el('span', { class: 'fan-label' }, c.name),
        el('span', { class: 'fan-caption' }, c.blurb ?? c.tagline ?? 'Club')),
      heartButton(c.id, { size: 20, className: 'card-heart' })))));
}

/* ---------- Fans also like ---------- */

/**
 * Choreography → a "theater": a big in-site player next to a ranked chart of the dance covers.
 * Each row shows its channel and (once the hourly YouTube updater is running) its live view
 * count with a meter scaled to the most-viewed cover. Clicking a row plays it right here.
 */
function openCoversReel(it, color) {
  const o = openOverlay({ label: it.label, className: 'overlay--card overlay--theater' });
  const live = hasLiveViews();
  const covers = store.covers
    .map(c => ({ ...c, views: viewCount(c.youtubeId) }))
    .sort((a, b) => (b.views ?? -1) - (a.views ?? -1));
  if (!covers.length) return;
  const max = Math.max(1, ...covers.map(c => c.views ?? 0));
  const total = covers.reduce((sum, c) => sum + (c.views ?? 0), 0);
  const channels = new Set(covers.map(c => c.channel ?? c.crew).filter(present)).size;

  // Player: starts as a poster of the top cover; becomes a YouTube embed on play.
  const stage = el('div', { class: 'theater-stage' });
  const nowTitle = el('p', { class: 'theater-title' });
  const nowSub = el('p', { class: 'theater-sub' });
  const ytLink = el('a', { class: 'pill-btn pill-btn--sm', target: '_blank', rel: 'noopener' }, 'Open on YouTube', el('span', { html: icon('external', { size: 14 }) }));
  let current = null;

  const showMeta = c => {
    nowTitle.textContent = c.title;
    nowSub.textContent = [c.channel ?? c.crew, c.views != null ? `${formatNumber(c.views)} views` : null].filter(present).join(' · ');
    ytLink.href = youtubeUrl(c);
  };
  const poster = c => {
    stage.replaceChildren(el('button', { class: 'theater-poster', type: 'button', 'aria-label': `Play ${c.title}`, onClick: () => play(c) },
      el('img', { src: `https://i.ytimg.com/vi/${encodeURIComponent(c.youtubeId)}/hqdefault.jpg`, alt: '' }),
      el('span', { class: 'theater-play', html: icon('play', { size: 30 }) })));
    showMeta(c);
  };
  const play = c => {
    current = c;
    stage.replaceChildren(youtubeEmbed(c));
    showMeta(c);
    list.querySelectorAll('.cover-card').forEach(r => r.classList.toggle('is-playing', r.dataset.id === c.id));
    stage.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  };

  // Horizontal row of covers: rank, thumbnail, live views (count-up) and a meter vs. the top cover.
  const list = el('ol', { class: 'cover-row' }, covers.map((c, i) => {
    const counter = el('strong', { class: 'cover-views num' }, '0');
    if (c.views != null) countUp(counter, c.views);
    return el('li', {},
      el('button', { class: 'cover-card', type: 'button', dataset: { id: c.id }, style: { '--fill': c.views != null ? (c.views / max).toFixed(3) : 0, '--i': i }, onClick: () => play(c), 'aria-label': `Play ${c.title}` },
        el('span', { class: 'cover-thumb' },
          el('img', { src: `https://i.ytimg.com/vi/${encodeURIComponent(c.youtubeId)}/hqdefault.jpg`, alt: '', loading: 'lazy' }),
          el('span', { class: 'cover-rank num' }, `#${i + 1}`),
          el('span', { class: 'cover-play', html: icon('play', { size: 18 }) }),
          el('span', { class: 'cover-eq', 'aria-hidden': 'true' }, el('span'), el('span'), el('span'))),
        c.views != null
          ? el('span', { class: 'cover-stat' }, counter, el('span', { class: 'cover-views-label' }, 'views'))
          : el('span', { class: 'cover-stat is-pending' }, 'Views update hourly'),
        c.views != null && el('span', { class: 'cover-meter', 'aria-hidden': 'true' }, el('span')),
        el('span', { class: 'cover-title' }, c.title),
        el('span', { class: 'cover-sub' }, c.channel ?? c.crew ?? '')));
  }));

  const totalNode = el('strong', { class: 'num' }, '0');
  o.root.append(el('div', { class: 'info-card theater-card', style: { '--c': color } },
    el('button', { class: 'icon-btn info-close', type: 'button', 'aria-label': 'Close', html: icon('close'), onClick: () => o.close() }),
    el('div', { class: 'reel-head' },
      el('span', { class: 'info-emoji', 'aria-hidden': 'true' }, it.emoji ?? '💃'),
      el('div', {},
        present(it.caption) && el('p', { class: 'micro' }, it.caption),
        el('h2', { class: 'h2' }, it.label),
        el('p', { class: 'reel-total' },
          live
            ? [countUp(totalNode, total), ` views across ${covers.length} covers on multiple K-pop cover group channels `, liveBadge(store.views.updatedAt)]
            : `${covers.length} covers across ${channels > 1 ? 'multiple' : 'my'} K-pop cover group channels`))),
    present(it.detail) && el('p', { class: 'info-detail' }, it.detail),
    el('div', { class: 'theater' },
      stage,
      el('div', { class: 'theater-meta' }, el('div', {}, nowTitle, nowSub), ytLink),
      el('p', { class: 'micro cover-row-head' }, live ? 'Ranked by views' : 'All covers'),
      list)));
  poster(covers[0]);
}

function openInterest(it, color) {
  const o = openOverlay({ label: it.label, className: 'overlay--card' });
  o.root.append(el('div', { class: 'info-card', style: { '--c': color } },
    el('button', { class: 'icon-btn info-close', type: 'button', 'aria-label': 'Close', html: icon('close'), onClick: () => o.close() }),
    el('span', { class: 'info-emoji', 'aria-hidden': 'true' }, it.emoji ?? '✦'),
    present(it.caption) && el('p', { class: 'micro' }, it.caption),
    el('h2', { class: 'h2' }, it.label),
    el('p', { class: 'info-detail' }, it.detail)));
}

function fansAlsoLike() {
  if (!store.interests.length) return null;
  return el('section', { class: 'fans', 'aria-labelledby': 'fans-h' },
    el('h2', { class: 'h2', id: 'fans-h' }, 'Fans also like'),
    el('ul', { class: 'shelf' }, store.interests.map((it, i) => {
      const color = PALETTE[i % PALETTE.length];
      const isMap = it.type === 'map';
      return el('li', {}, el('button', {
        class: 'fan-card', type: 'button',
        onClick: () => (isMap ? navigate(`places/${encodeURIComponent(it.placesCategory)}`)
          : it.type === 'videos' ? openCoversReel(it, color)
          : openInterest(it, color))
      },
        el('span', { class: 'fan-circle', style: { '--c': color } },
          present(it.image)
            ? el('img', { src: it.image, alt: '', loading: 'lazy' })
            : el('span', { class: 'fan-emoji', 'aria-hidden': 'true' }, it.emoji ?? '✦'),
          isMap && el('span', { class: 'fan-pin', html: icon('pin', { size: 16 }) }),
          it.type === 'videos' && el('span', { class: 'fan-pin', html: icon('play', { size: 14 }) })),
        el('span', { class: 'fan-label' }, it.label),
        el('span', { class: 'fan-caption' }, present(it.caption) ? it.caption : (isMap ? 'Map' : 'Interest'))));
    })));
}

/* ---------- About: photo as a record sleeve with a spinning vinyl ---------- */

function recordSleeve(p) {
  const img = present(p.aboutImage) ? p.aboutImage : p.headshot;
  return el('figure', { class: 'sleeve-wrap' },
    el('div', { class: 'sleeve' },
      el('div', { class: 'vinyl-slot', 'aria-hidden': 'true' },
        el('div', { class: 'vinyl' }, el('span', { class: 'vinyl-label' }, initials(p.name)))),
      el('div', { class: 'sleeve-cover' },
        present(img)
          ? el('img', { src: img, alt: `Photo of ${p.name ?? ''}`.trim(), loading: 'lazy' })
          : el('span', { class: 'sleeve-empty' }, initials(p.name)))));
}

function about(p) {
  return el('section', { class: 'about', id: 'about', 'aria-labelledby': 'about-h' },
    el('h2', { class: 'h2', id: 'about-h' }, 'About'),
    el('div', { class: 'about-card' },
      recordSleeve(p),
      el('div', { class: 'about-text' },
        present(p.aboutHeadline) && el('p', { class: 'about-headline' }, p.aboutHeadline),
        p.bio.map(t => el('p', { class: 'about-bio' }, t)),
        p.quickFacts.length > 0 && el('dl', { class: 'facts' },
          p.quickFacts.map(f => el('div', { class: 'fact' }, el('dt', { class: 'micro' }, f.label), el('dd', {}, f.value)))))));
}

/* ---------- Contact + footer ---------- */

function contactButton(l) {
  if (l.type === 'email') {
    const addr = present(l.value) ? l.value : l.url.replace(/^mailto:/, '');
    return el('div', { class: 'email-split' },
      el('button', {
        class: 'pill-btn pill-btn--solid', type: 'button', 'aria-label': `Copy email address ${addr}`,
        onClick: async () => {
          try { await navigator.clipboard.writeText(addr); toast('Email copied'); }
          catch { location.href = l.url; }
        }
      }, el('span', { html: icon('copy', { size: 18 }) }), addr),
      el('a', { class: 'icon-btn icon-btn--outline', href: l.url, 'aria-label': 'Open in your mail app', title: 'Open in your mail app', html: icon('mail', { size: 18 }) }));
  }
  return el('a', { class: 'pill-btn', href: l.url, target: '_blank', rel: 'noopener' },
    el('span', { html: icon(linkIcon(l.type), { size: 18 }) }), l.label);
}

function contact(p) {
  const c = p.contact;
  if (!c.links.length && !present(c.headline)) return null;
  return el('section', { class: 'contact', id: 'contact', 'aria-labelledby': 'contact-h' },
    el('p', { class: 'micro' }, 'Follow'),
    el('h2', { class: 'contact-headline', id: 'contact-h' }, present(c.headline) ? c.headline : 'Contact'),
    el('div', { class: 'contact-links' }, c.links.map(contactButton)));
}

function footer(p) {
  return el('footer', { class: 'site-footer' },
    present(p.footer) && el('p', {}, p.footer));
}
