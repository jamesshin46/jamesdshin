// Small shared helpers: DOM building, formatting, time, motion preferences.

/** True for strings that are placeholders James hasn't filled in yet. */
export const isTodo = v => typeof v === 'string' && v.trim().toUpperCase().startsWith('TODO');

/** True if a (cleaned) value is present and non-empty. */
export const present = v =>
  v != null && !(typeof v === 'string' && v.trim() === '') && !(Array.isArray(v) && v.length === 0);

export const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/* ---------- DOM ---------- */

/**
 * el('a', { class: 'x', href: '#', onClick: fn, style: { '--c': '#f00' } }, 'text', childNode)
 * Children are appended as text (never parsed as HTML) unless they are Nodes.
 * Use the `html` prop only for trusted markup such as icons.
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sv == null) continue;
        if (sk.startsWith('--')) node.style.setProperty(sk, sv);
        else node.style[sk] = sv;
      }
    } else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : String(c));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/* ---------- Numbers & text ---------- */

const nfFull = new Intl.NumberFormat('en-US');
const nfCompact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export const formatNumber = n => (Number.isFinite(n) ? nfFull.format(n) : '—');
export const formatCompact = n => (Number.isFinite(n) ? nfCompact.format(n) : '—');

/** Lowercase + strip accents, for accent-insensitive search. */
export const normalizeText = s =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Initials for monogram fallbacks ("Asian Cultural Union" → "AC"). */
export function initials(text, max = 2) {
  const words = String(text ?? '').replace(/[^\p{L}\p{N}\s&]/gu, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, max).toUpperCase();
  return words.slice(0, max).map(w => w[0]).join('').toUpperCase();
}

/* ---------- Time ---------- */

/** "just now" · "14 min ago" · "3 hr ago" · "Nov 2, 2026" (if > 2 days old). Null if invalid. */
export function timeAgo(iso, now = Date.now()) {
  const t = Date.parse(iso ?? '');
  if (!Number.isFinite(t)) return null;
  const sec = Math.max(0, (now - t) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr} hr ago`;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Greeting key for the visitor's local hour. */
export function greetingKey(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'lateNight';
}

/* ---------- Misc ---------- */

export function debounce(fn, ms = 100) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}

export function safeSession(key, value) {
  try {
    if (value === undefined) return JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    return null;
  }
  return null;
}

export function toast(message, ms = 2200) {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const t = el('div', { class: 'toast' }, message);
  region.append(t);
  requestAnimationFrame(() => t.classList.add('is-visible'));
  setTimeout(() => {
    t.classList.remove('is-visible');
    setTimeout(() => t.remove(), 300);
  }, ms);
}
