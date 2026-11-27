// Shared overlay/dialog behavior: Esc to close, focus trap, focus restore, background inert.

import { el, reducedMotion } from './utils.js';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
const stack = [];

function setBackgroundInert(on) {
  const app = document.getElementById('app');
  if (app) app.inert = on;
  document.documentElement.classList.toggle('has-overlay', on);
}

/**
 * Opens an overlay. Returns { root, close }.
 *   label      — accessible name for the dialog
 *   className  — extra classes for styling variants
 *   onClose    — called when the user closes it (Esc, ✕, scrim). Not called for close({ silent: true }).
 *   scrimClose — click on the backdrop closes (default true)
 */
export function openOverlay({ label, className = '', onClose, scrimClose = true } = {}) {
  const opener = document.activeElement;
  const root = el('div', { class: `overlay ${className}`.trim(), role: 'dialog', 'aria-modal': 'true', 'aria-label': label });
  let closed = false;

  const api = {
    root,
    close({ silent = false } = {}) {
      if (closed) return;
      closed = true;
      const i = stack.indexOf(api);
      if (i >= 0) stack.splice(i, 1);
      root.removeEventListener('keydown', onKey);
      root.classList.remove('is-open');
      const finish = () => root.remove();
      if (reducedMotion()) finish();
      else setTimeout(finish, 250);
      if (!stack.length) setBackgroundInert(false);
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
      if (!silent) onClose?.();
    },
    focusFirst() {
      const target = root.querySelector('[autofocus]') ?? root.querySelector(FOCUSABLE) ?? root;
      if (target === root) root.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  };

  function onKey(e) {
    if (stack[stack.length - 1] !== api) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      api.close();
    } else if (e.key === 'Tab') {
      const items = [...root.querySelectorAll(FOCUSABLE)].filter(n => n.offsetParent !== null || n === document.activeElement);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  root.addEventListener('keydown', onKey);
  if (scrimClose) root.addEventListener('click', e => { if (e.target === root) api.close(); });

  document.body.append(root);
  stack.push(api);
  setBackgroundInert(true);
  requestAnimationFrame(() => {
    root.classList.add('is-open');
    api.focusFirst();
  });
  return api;
}
