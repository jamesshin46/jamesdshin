// Album page (#/org/{id}) for every experience, club, and education entry.
// Laid out like a LinkedIn profile wearing a streaming-app album page:
//   banner → logo overlapping it → name / tagline / dates
//   ▶ Play + Chapters tracklist (each chapter expands into a deep-dive write-up)
//   Role timeline (lanes on a shared time axis) · About · Skills · Performances (videos)
//   Up next → the next page in playlist order, so the portfolio reads like an album sequence.

import { getOrg, nextOrg, coversFor, viewCount } from './data.js';
import { el, present, reducedMotion, daysUntil, formatCompact } from './utils.js';
import { icon } from './icons.js';
import { setTopbar } from './topbar.js';
import { revealOnScroll } from './ui.js';
import { heartButton } from './likes.js';
import { playChapter, takePendingChapter, nowPlaying, openVideo } from './player.js';
import {
  logoOrb, roleSpan, nowYM, roleDatesLabel, roleMonths, durationLabel, orgDatesLabel, orgTenure, ymIndex,
  isPreRelease, releaseDate
} from './orgs.js';

const KIND_LABEL = { experience: 'Experience', club: 'Club & community', education: 'Education' };
const orgShape = org => (org.kind === 'club' ? 'circle' : 'square');

/* ---------- Banner ---------- */

function orgBanner(org) {
  const b = org.banner ?? {};
  const fallbackBg = `linear-gradient(120deg, color-mix(in srgb, ${org.color || '#4F7CFF'} 35%, #000) 0%, ${org.color || '#4F7CFF'} 100%)`;
  const box = el('div', {
    class: `org-banner pos-${b.position ?? 'center'} fit-${b.fit ?? 'contain'}`,
    style: { '--banner-bg': b.bg ?? fallbackBg }
  });
  const art = el('div', { class: 'org-banner-art', 'aria-hidden': 'true' });

  if (present(b.video)) {
    const v = el('video', { class: 'org-banner-media', muted: true, loop: true, playsinline: true, preload: 'auto', poster: b.poster },
      el('source', { src: b.video, type: 'video/mp4' }));
    v.muted = true;
    if (!reducedMotion()) {
      v.autoplay = true;
      v.play?.().catch(() => {});
    }
    art.append(v);
  } else if (present(b.src)) {
    art.append(el('img', { class: 'org-banner-media', src: b.src, alt: '', decoding: 'async' }));
  } else {
    box.classList.add('is-generated');
    if (present(org.logo?.src)) art.append(el('img', { class: 'org-banner-watermark', src: org.logo.src, alt: '' }));
    art.append(el('span', { class: 'org-shape s1' }), el('span', { class: 'org-shape s2' }), el('span', { class: 'org-shape s3' }));
  }

  box.append(art);
  if (present(b.mark)) box.append(el('img', { class: 'org-banner-mark', src: b.mark, alt: '', 'aria-hidden': 'true' }));
  box.append(el('span', { class: 'org-banner-fade', 'aria-hidden': 'true' }));
  return box;
}

/* ---------- Chapters (the tracklist) ---------- */

function chapterPanel(ch) {
  return el('div', { class: 'ch-panel', id: `ch-panel-${ch.id}`, role: 'region', 'aria-labelledby': `ch-row-${ch.id}`, hidden: true },
    el('div', { class: 'ch-panel-inner' },
      present(ch.metric) && el('p', { class: 'ch-metric' }, ch.metric),
      el('p', { class: 'ch-summary' }, ch.summary),
      ch.story.map(p => el('p', { class: 'ch-story' }, p)),
      ch.skills.length > 0 && el('ul', { class: 'org-skills ch-skills' }, ch.skills.map(s => el('li', {}, s)))));
}

function equalizerIcon() {
  return el('span', { class: 'eq', 'aria-hidden': 'true' }, el('span'), el('span'), el('span'));
}

/* Pre-release: like an unreleased album, the tracklist is greyed out and unplayable,
   with a live countdown to release day. */
function preRelease(org) {
  const release = releaseDate(org);
  const dateLabel = release?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) ?? 'soon';
  const shortDate = release?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) ?? '';
  const units = [['days', 'Days'], ['hours', 'Hours'], ['minutes', 'Min'], ['seconds', 'Sec']];
  const cells = Object.fromEntries(units.map(([k]) => [k, el('span', { class: 'cd-num num' }, '00')]));
  const countdown = el('div', { class: 'countdown', role: 'timer', 'aria-label': `Releases ${dateLabel}` },
    units.map(([k, label]) => el('div', { class: 'cd-cell' }, cells[k], el('span', { class: 'cd-label micro' }, label))));

  const tick = () => {
    if (!countdown.isConnected && timer) { clearInterval(timer); return; }
    const ms = Math.max(0, (release?.getTime() ?? 0) - Date.now());
    const parts = {
      days: Math.floor(ms / 86_400_000),
      hours: Math.floor(ms / 3_600_000) % 24,
      minutes: Math.floor(ms / 60_000) % 60,
      seconds: Math.floor(ms / 1000) % 60
    };
    for (const [k] of units) cells[k].textContent = String(parts[k]).padStart(2, '0');
    if (ms === 0 && timer) { clearInterval(timer); window.dispatchEvent(new HashChangeEvent('hashchange')); }
  };
  let timer = null;
  tick();
  timer = setInterval(tick, 1000);

  // Locked rows: real chapter titles if James added them, otherwise untitled placeholders.
  const rows = org.chapters.length
    ? org.chapters.map(c => ({ title: c.title, subtitle: c.subtitle }))
    : Array.from({ length: org.preReleaseTracks ?? 3 }, () => ({ title: 'Untitled', subtitle: org.name }));

  return el('section', { class: 'tracklist is-prerelease', 'aria-label': 'Chapters (not released yet)' },
    el('div', { class: 'prerelease-card' },
      el('div', { class: 'prerelease-top' },
        el('button', { class: 'play-xl is-locked', type: 'button', disabled: true, 'aria-label': `Locked until ${dateLabel}` },
          el('span', { class: 'play-xl-circle', html: icon('lock') }),
          el('span', { class: 'play-xl-label' }, el('span', { class: 'micro' }, 'Pre-release'), el('span', {}, `Out ${dateLabel}`))),
        el('p', { class: 'prerelease-copy' }, 'This album hasn’t dropped yet. Chapters unlock on release day.')),
      countdown),
    el('h2', { class: 'org-card-title' }, 'Chapters'),
    el('ol', { class: 'ch-list is-locked' }, rows.map((r, i) => el('li', { class: 'ch-item is-locked' },
      el('div', { class: 'ch-row', 'aria-disabled': 'true' },
        el('span', { class: 'ch-index' }, el('span', { class: 'ch-num num' }, String(i + 1))),
        el('span', { class: 'ch-text' },
          el('span', { class: 'ch-title' }, r.title),
          present(r.subtitle) && el('span', { class: 'ch-sub' }, r.subtitle)),
        el('span', { class: 'ch-plays' }, shortDate),
        el('span', { class: 'ch-chevron', html: icon('lock', { size: 16 }) }))))));
}

function tracklist(org) {
  if (isPreRelease(org)) return preRelease(org);
  const head = el('div', { class: 'tracklist-head' },
    org.chapters.length > 0 && el('button', {
      class: 'play-xl', type: 'button',
      onClick: () => playChapter(org.id, org.chapters[0].id)
    }, el('span', { class: 'play-xl-circle', html: icon('play') }), el('span', { class: 'play-xl-label' }, el('span', { class: 'micro' }, `${org.chapters.length} chapter${org.chapters.length === 1 ? '' : 's'}`), el('span', {}, 'Play'))),
    el('h2', { class: 'org-card-title' }, 'Chapters'));

  if (!org.chapters.length) {
    return el('section', { class: 'tracklist', 'aria-label': 'Chapters' },
      el('div', { class: 'tracklist-head' }, el('h2', { class: 'org-card-title' }, 'Chapters')),
      el('div', { class: 'ch-empty' },
        el('span', { class: 'ch-empty-disc', 'aria-hidden': 'true' }),
        el('div', {},
          el('p', { class: 'ch-empty-title' }, 'Chapters coming soon'),
          el('p', { class: 'muted' }, 'More detail on this one is on the way.'))));
  }

  const rows = org.chapters.map((ch, i) => {
    const row = el('button', {
      class: 'ch-row', type: 'button', id: `ch-row-${ch.id}`,
      'aria-expanded': 'false', 'aria-controls': `ch-panel-${ch.id}`, dataset: { ch: ch.id }
    },
      el('span', { class: 'ch-index' },
        el('span', { class: 'ch-num num' }, String(i + 1)),
        el('span', { class: 'ch-play', html: icon('play', { size: 14 }) }),
        equalizerIcon()),
      el('span', { class: 'ch-text' },
        el('span', { class: 'ch-title' }, ch.title),
        present(ch.subtitle) && el('span', { class: 'ch-sub' }, ch.subtitle)),
      el('span', { class: 'ch-plays num' }, ch.metric ?? ''),
      el('span', { class: 'ch-chevron', html: icon('chevronDown', { size: 18 }) }));
    return el('li', { class: 'ch-item', dataset: { ch: ch.id } }, row, chapterPanel(ch));
  });

  const list = el('ol', { class: 'ch-list' }, rows);
  list.addEventListener('click', e => {
    const row = e.target.closest('.ch-row');
    if (!row) return;
    const open = row.getAttribute('aria-expanded') === 'true';
    if (open) setOpen(list, row.dataset.ch, false);
    else playChapter(org.id, row.dataset.ch, { scroll: false });
  });

  return el('section', { class: 'tracklist', 'aria-label': 'Chapters' }, head, list);
}

function setOpen(list, chapterId, open, { scroll = false } = {}) {
  list.querySelectorAll('.ch-item').forEach(item => {
    const isTarget = item.dataset.ch === chapterId;
    const row = item.querySelector('.ch-row');
    const panel = item.querySelector('.ch-panel');
    const on = isTarget && open;
    row.setAttribute('aria-expanded', String(on));
    panel.hidden = !on;
    item.classList.toggle('is-open', on);
  });
  if (open && scroll) {
    const item = list.querySelector(`.ch-item[data-ch="${CSS.escape(chapterId)}"]`);
    item?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
  }
}

function markPlaying(list, chapterId) {
  list.querySelectorAll('.ch-item').forEach(item => item.classList.toggle('is-playing', item.dataset.ch === chapterId));
}

/* ---------- Role timeline: lanes on a shared time axis ---------- */

/* Only overall dates known: one bar for the whole span + the role progression as steps. */
function roleProgression(org) {
  const sp = roleSpan(org.span);
  const steps = [...org.roles].reverse(); // roles are stored newest first; show oldest → newest
  const meta = [orgDatesLabel(org), orgTenure(org)].filter(Boolean).join(' · ');
  return el('section', { class: 'org-card org-roles', 'aria-labelledby': 'org-roles-h' },
    el('div', { class: 'org-card-head' },
      el('h2', { class: 'org-card-title', id: 'org-roles-h' }, steps.length > 1 ? 'Role timeline' : 'Role')),
    el('div', { class: 'lane is-current' },
      el('div', { class: 'lane-info' },
        el('span', { class: 'lane-title' }, 'Overall', sp.present && el('span', { class: 'lane-now micro' }, 'Now')),
        present(meta) && el('span', { class: 'lane-dates' }, meta)),
      el('div', { class: 'lane-track' },
        el('span', { class: `lane-seg${sp.present ? ' is-current' : ''}`, style: { left: '0%', width: '100%' } },
          sp.present && el('span', { class: 'lane-playhead' })))),
    el('ol', { class: 'role-steps' }, steps.map((r, i) => el('li', { class: i === steps.length - 1 ? 'is-current' : '' },
      el('span', { class: 'role-step-dot', 'aria-hidden': 'true' }),
      el('span', { class: 'role-step-title' }, r.title),
      i === steps.length - 1 && sp.present && el('span', { class: 'lane-now micro' }, 'Now')))));
}

function roleTimeline(org) {
  const roles = org.roles;
  if (!roles.length) return null;
  if (org.span && roleSpan(org.span).start && !roles.some(r => roleSpan(r).start)) return roleProgression(org);

  const lanes = roles.map(r => ({ r, ...roleSpan(r) }));
  const dated = lanes.filter(l => l.start);

  let min = null, max = null;
  if (dated.length) {
    min = Math.min(...dated.map(l => ymIndex(l.start)));
    max = Math.max(...dated.map(l => ymIndex(l.end ?? l.start)));
  }
  const span = min == null ? 1 : Math.max(1, max - min + 1);
  const pct = i => ((i - min) / span) * 100;

  const ticks = [];
  if (min != null) {
    for (let i = min + 1; i <= max; i++) {
      const at = pct(i);
      if (i % 12 === 0 && at > 12 && at < 85) ticks.push({ at, label: String(i / 12) });
    }
  }

  const now = ymIndex(nowYM());
  const rows = lanes.map((l, i) => {
    const meta = [roleDatesLabel(l.r), durationLabel(roleMonths(l.r))].filter(Boolean).join(' · ');
    let bar;
    if (l.start) {
      const s = ymIndex(l.start);
      const e = ymIndex(l.end ?? l.start);
      // Playhead sits at today; for roles ending in the future the rest of the bar is "upcoming".
      const at = Math.min(1, Math.max(0, (now - s + 1) / (e - s + 1)));
      bar = el('span', {
        class: `lane-seg${l.current ? ' is-current' : ''}${l.upcoming ? ' is-upcoming' : ''}`,
        style: { left: `${pct(s)}%`, width: `${((e - s + 1) / span) * 100}%`, '--d': `${i * 120}ms`, '--now': `${(at * 100).toFixed(1)}%` }
      }, l.current && el('span', { class: 'lane-playhead' }));
    } else {
      bar = el('span', { class: 'lane-seg is-undated' });
    }
    return el('li', { class: `lane${l.current ? ' is-current' : ''}` },
      el('div', { class: 'lane-info' },
        el('span', { class: 'lane-title' }, l.r.title, l.current && el('span', { class: 'lane-now micro' }, 'Now')),
        present(l.r.team) && el('span', { class: 'lane-team' }, l.r.team),
        present(meta) && el('span', { class: 'lane-dates' }, meta)),
      el('div', { class: 'lane-track' },
        ticks.map(t => el('span', { class: 'lane-tick', style: { left: `${t.at}%` } })),
        bar));
  });

  const label = orgDatesLabel(org);
  const range = min != null
    ? el('div', { class: 'lane-axis' },
        el('span', {}, label?.split(' – ')[0] ?? ''),
        el('span', {}, lanes.some(l => l.present) ? 'Now' : (label?.split(' – ')[1] ?? '')))
    : null;

  const upcomingDays = org.status === 'upcoming' ? daysUntil(org.start) : null;

  return el('section', { class: 'org-card org-roles', 'aria-labelledby': 'org-roles-h' },
    el('div', { class: 'org-card-head' },
      el('h2', { class: 'org-card-title', id: 'org-roles-h' }, roles.length > 1 ? 'Role timeline' : 'Role'),
      upcomingDays != null && upcomingDays > 0 && el('span', { class: 'tl-pill micro' }, `Starts in ${upcomingDays} days`)),
    el('ol', { class: 'lanes' }, rows),
    range && el('div', { class: 'lanes-axis-row' }, el('span'), range));
}

/* ---------- Side cards ---------- */

function aboutCard(org) {
  const facts = [
    present(org.location) && ['Location', org.location],
    ['Type', KIND_LABEL[org.kind] ?? 'Experience'],
    orgTenure(org) && ['Time there', orgTenure(org)],
    present(org.website) && ['Website', el('a', { href: org.website, target: '_blank', rel: 'noopener' }, org.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))]
  ].filter(Boolean);
  return el('section', { class: 'org-card', 'aria-labelledby': 'org-about-h' },
    el('h2', { class: 'org-card-title', id: 'org-about-h' }, `About ${org.name}`),
    present(org.about) && el('p', { class: 'org-about' }, org.about),
    el('dl', { class: 'org-facts' }, facts.map(([k, v]) => el('div', {}, el('dt', { class: 'micro' }, k), el('dd', {}, v)))));
}

function skillsCard(org) {
  if (!org.skills.length) return null;
  return el('section', { class: 'org-card', 'aria-labelledby': 'org-skills-h' },
    el('h2', { class: 'org-card-title', id: 'org-skills-h' }, 'Skills'),
    el('ul', { class: 'org-skills' }, org.skills.map(s => el('li', {}, s))));
}

/* ---------- Performances (videos linked to this page) ---------- */

export function videoCard(cover) {
  const views = viewCount(cover.youtubeId);
  return el('li', {},
    el('button', { class: 'video-tile', type: 'button', onClick: () => openVideo(cover), 'aria-label': `Play ${cover.title}` },
      el('span', { class: 'video-thumb' },
        el('img', { src: `https://i.ytimg.com/vi/${encodeURIComponent(cover.youtubeId)}/hqdefault.jpg`, alt: '', loading: 'lazy' }),
        el('span', { class: 'video-play', html: icon('play', { size: 18 }) }),
        views != null && el('span', { class: 'video-views-pill num' }, `${formatCompact(views)} views`)),
      el('span', { class: 'video-tile-title' }, cover.title),
      el('span', { class: 'video-tile-sub' }, cover.channel ?? cover.crew ?? '')));
}

function performances(org) {
  const covers = coversFor(org.id);
  if (!covers.length) return null;
  return el('section', { class: 'org-perf', 'aria-labelledby': 'org-perf-h' },
    el('h2', { class: 'org-card-title', id: 'org-perf-h' }, 'Performances'),
    el('ul', { class: 'video-row' }, covers.map(videoCard)));
}

/* ---------- Clubs that only exist at this school (e.g. Yonsei) ---------- */

function localClubs(org) {
  const clubs = (Array.isArray(org.localClubs) ? org.localClubs : []).filter(c => present(c?.name));
  if (!clubs.length) return null;
  return el('section', { class: 'local-clubs', 'aria-labelledby': 'local-clubs-h' },
    el('h2', { class: 'org-card-title', id: 'local-clubs-h' }, `Clubs at ${org.name.replace(/ University$/, '')}`),
    el('ul', { class: 'local-club-list' }, clubs.map(c => {
      const pseudo = { name: c.name, color: c.color, logo: { src: c.logo, fit: 'cover' } };
      return el('li', { class: 'local-club', style: { '--c': c.color || 'var(--accent)' } },
        logoOrb(pseudo, { shape: 'circle', size: 'local' }),
        el('div', { class: 'local-club-text' },
          el('p', { class: 'local-club-name' }, present(c.nameKo) && el('span', { class: 'local-club-ko', lang: 'ko' }, c.nameKo), c.name),
          present(c.kind) && el('p', { class: 'local-club-kind' }, c.kind),
          present(c.role) && el('p', { class: 'local-club-role' }, el('span', { class: 'micro' }, 'My role'), c.role),
          present(c.about) && el('p', { class: 'local-club-about' }, c.about),
          present(c.link) && el('a', { class: 'local-club-link', href: c.link, target: '_blank', rel: 'noopener' }, 'Watch on YouTube', el('span', { html: icon('external', { size: 14 }) }))));
    })));
}

/* ---------- Up next ---------- */

function upNext(org) {
  const n = nextOrg(org.id);
  if (!n) return null;
  return el('section', { class: 'up-next', 'aria-label': 'Up next' },
    el('a', { class: 'up-next-card', href: `#/org/${encodeURIComponent(n.id)}`, style: { '--c': n.color || 'var(--accent)', '--banner-bg': n.banner?.bg ?? 'var(--bg-highlight)' } },
      el('span', { class: 'up-next-banner', 'aria-hidden': 'true' },
        present(n.banner?.src) && el('img', { src: n.banner.src, alt: '', loading: 'lazy' }),
        present(n.banner?.poster) && el('img', { src: n.banner.poster, alt: '', loading: 'lazy' })),
      el('span', { class: 'up-next-body' },
        logoOrb(n, { shape: orgShape(n), size: 'node' }),
        el('span', { class: 'up-next-text' },
          el('span', { class: 'micro up-next-label' }, 'Up next'),
          el('span', { class: 'up-next-name' }, n.name),
          el('span', { class: 'up-next-sub' }, [n.roles[0]?.title, orgDatesLabel(n)].filter(present).join(' · '))),
        el('span', { class: 'up-next-go', html: icon('next', { size: 22 }) }))));
}

/* ---------- Page ---------- */

export function renderOrgView(view, id) {
  const org = getOrg(id);
  if (!org) {
    view.append(el('section', { class: 'placeholder' },
      el('h1', { class: 'h2' }, 'Not found'),
      el('p', { class: 'muted' }, el('a', { href: '#/' }, 'Back to home'))));
    return;
  }

  const banner = orgBanner(org);
  const meta = [org.location, orgDatesLabel(org), orgTenure(org)].filter(present);
  const tl = tracklist(org);

  const head = el('header', { class: 'org-head' },
    el('div', { class: 'org-logo-wrap' }, logoOrb(org, { shape: orgShape(org), size: 'xl' })),
    el('div', { class: 'org-id' },
      el('p', { class: 'micro org-kind' }, KIND_LABEL[org.kind] ?? 'Experience'),
      el('h1', { class: 'org-name' }, org.name),
      present(org.tagline) && el('p', { class: 'org-tagline' }, org.tagline),
      meta.length > 0 && el('p', { class: 'org-meta' }, meta.map(m => el('span', {}, m)))),
    el('div', { class: 'org-actions' }, heartButton(org.id, { size: 30, className: 'heart-btn--lg' })));

  view.append(el('article', { class: 'org', style: { '--c': org.color || 'var(--accent)' } },
    banner,
    el('div', { class: 'org-sheet' },
      head,
      el('div', { class: 'org-grid' },
        el('div', { class: 'org-col' }, tl, performances(org), localClubs(org)),
        el('div', { class: 'org-col org-col--side' }, roleTimeline(org), aboutCard(org), skillsCard(org))),
      upNext(org))));

  setTopbar({
    title: org.name,
    color: org.color,
    threshold: () => banner.offsetHeight - 40,
    onPlay: org.chapters.length && !isPreRelease(org) ? () => playChapter(org.id, org.chapters[0].id) : null,
    playLabel: `Play ${org.name}`
  });
  revealOnScroll(view.querySelectorAll('.org-card'));
  bannerParallax(banner);

  // Keep the tracklist in sync with the player (bar buttons, other pages, etc.)
  const list = tl.querySelector('.ch-list');
  if (list) {
    const onChapter = e => {
      if (!list.isConnected) { window.removeEventListener('jds:chapter', onChapter); return; }
      if (e.detail.orgId !== org.id) return;
      setOpen(list, e.detail.chapterId, true, { scroll: e.detail.scroll });
      markPlaying(list, e.detail.chapterId);
    };
    window.addEventListener('jds:chapter', onChapter);

    const pending = takePendingChapter(org.id);
    const np = nowPlaying();
    if (np?.orgId === org.id) markPlaying(list, np.chapterId);
    if (pending) requestAnimationFrame(() => { setOpen(list, pending, true, { scroll: true }); markPlaying(list, pending); });
  }
}

function bannerParallax(banner) {
  if (reducedMotion()) return;
  const main = document.getElementById('main');
  let raf = 0;
  const onScroll = () => {
    if (!banner.isConnected) { main.removeEventListener('scroll', onScroll); return; }
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      banner.style.setProperty('--scroll', Math.min(1, main.scrollTop / (banner.offsetHeight || 1)).toFixed(3));
    });
  };
  main.addEventListener('scroll', onScroll, { passive: true });
}
