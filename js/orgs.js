// Shared helpers for "orgs" (experience items + clubs): logos with an animated ring,
// and LinkedIn-style date math ("Feb 2024 – Present · 1 yr 10 mos").

import { el, present, initials } from './utils.js';

/* ---------- Dates ---------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseYM(s) {
  const m = /^(\d{4})-(\d{2})/.exec(String(s ?? ''));
  return m ? { y: +m[1], m: +m[2] } : null;
}
export const nowYM = () => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1 }; };
export const ymIndex = ym => ym.y * 12 + (ym.m - 1);
export const fmtYM = ym => `${MONTHS[ym.m - 1]} ${ym.y}`;
const isPresent = s => typeof s === 'string' && s.trim().toLowerCase() === 'present';

/** { start, end, present, upcoming } for one role; end is "now" for present roles. */
export function roleSpan(r) {
  const start = parseYM(r.start);
  const present = isPresent(r.end);
  const end = present ? nowYM() : parseYM(r.end);
  const now = ymIndex(nowYM());
  const upcoming = !!start && ymIndex(start) > now;
  // "current": ongoing today, whether it says "present" or ends in the future (e.g. May 2027)
  const current = !!start && !upcoming && (present || (!!end && ymIndex(end) >= now));
  return { start, end, present, current, upcoming };
}

export function roleDatesLabel(r) {
  const { start, end, present, upcoming } = roleSpan(r);
  if (!start) return null;
  if (upcoming) return `Starts ${fmtYM(start)}`;
  if (present) return `${fmtYM(start)} – Present`;
  if (!end || ymIndex(end) === ymIndex(start)) return fmtYM(start);
  return start.y === end.y ? `${MONTHS[start.m - 1]} – ${fmtYM(end)}` : `${fmtYM(start)} – ${fmtYM(end)}`;
}

export function durationLabel(months) {
  if (!(months > 0)) return null;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y} yr${y > 1 ? 's' : ''}`, m && `${m} mo${m > 1 ? 's' : ''}`].filter(Boolean).join(' ');
}

/** Inclusive months, LinkedIn-style (Jun–Aug = 3 mos). */
export function roleMonths(r) {
  const { start, end, upcoming } = roleSpan(r);
  if (!start || !end || upcoming) return null;
  const n = Math.min(ymIndex(end), ymIndex(nowYM())) - ymIndex(start) + 1; // time so far
  return n > 0 ? n : null;
}

/** Overall range across all dated roles. */
export function orgRange(org) {
  let spans = org.roles.map(roleSpan).filter(s => s.start);
  // Clubs where only the overall dates are known: "span": { "start": "2024-02", "end": "present" }
  if (!spans.length && org.span) {
    const sp = roleSpan(org.span);
    if (sp.start) spans = [sp];
  }
  if (!spans.length) return null;
  const min = spans.reduce((a, s) => (ymIndex(s.start) < ymIndex(a) ? s.start : a), spans[0].start);
  const ends = spans.map(s => s.end ?? s.start);
  const max = ends.reduce((a, e) => (ymIndex(e) > ymIndex(a) ? e : a), ends[0]);
  return { min, max, present: spans.some(s => s.present), current: spans.some(s => s.current), upcoming: spans.every(s => s.upcoming) };
}

export function orgDatesLabel(org) {
  const r = orgRange(org);
  if (!r) return null;
  if (r.upcoming) return `Starts ${fmtYM(r.min)}`;
  return roleDatesLabel({ start: `${r.min.y}-${String(r.min.m).padStart(2, '0')}`, end: r.present ? 'present' : `${r.max.y}-${String(r.max.m).padStart(2, '0')}` });
}

export function orgTenure(org) {
  const r = orgRange(org);
  if (!r || r.upcoming) return null;
  return durationLabel(Math.min(ymIndex(r.max), ymIndex(nowYM())) - ymIndex(r.min) + 1);
}

/* ---------- Logos ---------- */

/** The logo itself on its tile (image, or a colored monogram fallback). */
export function orgLogo(org) {
  const L = org.logo ?? {};
  const face = el('span', {
    class: `logo-face ${L.fit === 'cover' ? 'fit-cover' : 'fit-contain'}`,
    style: { '--logo-bg': L.bg ?? '#fff', '--logo-pad': L.pad ?? null }
  });
  const mono = () => {
    face.classList.add('is-mono');
    face.replaceChildren(el('span', { class: 'logo-mono' }, initials(org.name)));
  };
  if (present(L.src)) {
    const img = el('img', { src: L.src, alt: '', loading: 'lazy', decoding: 'async' });
    img.addEventListener('error', mono, { once: true });
    face.append(img);
  } else mono();
  return face;
}

/**
 * Logo wrapped in an "orb": a slowly rotating ring in the org's color that speeds up and
 * gets a light sweep on hover. shape: 'circle' | 'square'.
 */
export function logoOrb(org, { shape = 'circle', size = '' } = {}) {
  return el('span', {
    class: `logo-orb logo-orb--${shape}${size ? ` logo-orb--${size}` : ''}`,
    style: { '--c': org.color || 'var(--accent)' }
  }, orgLogo(org));
}

/* ---------- Pre-release (upcoming albums) ---------- */

/** Release moment for an upcoming org (`start: "YYYY-MM-DD"`, local midnight), or null. */
export function releaseDate(org) {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(String(org?.start ?? ''));
  return m ? new Date(+m[1], +m[2] - 1, +(m[3] ?? 1)) : null;
}

/** True while an "upcoming" album hasn't been released yet. */
export function isPreRelease(org) {
  if (org?.status !== 'upcoming') return false;
  const d = releaseDate(org);
  return !d || d.getTime() > Date.now();
}
