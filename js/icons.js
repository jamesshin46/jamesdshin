// Simple 1.5px-stroke line icons (24×24). Play/pause are filled for legibility at small sizes.
const PATHS = {
  home: '<path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.25v-6h-5.5v6H5A1.5 1.5 0 0 1 3.5 19z"/>',
  search: '<circle cx="11" cy="11" r="6.75"/><path d="m20.25 20.25-4.5-4.5"/>',
  library: '<path d="M4.5 3.75v16.5M9 3.75v16.5M13.5 4.5l5.25 15.5"/>',
  recap: '<circle cx="12" cy="12" r="8.25" stroke-dasharray="4.5 2.2"/><path d="M10.25 9v6l4.75-3z" fill="currentColor" stroke="none"/>',
  play: '<path d="M7.5 4.8v14.4a.75.75 0 0 0 1.14.64l11.5-7.2a.75.75 0 0 0 0-1.28L8.64 4.16a.75.75 0 0 0-1.14.64z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6.5" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
  prev: '<path d="M6 5v14"/><path d="M18.5 5.6v12.8a.6.6 0 0 1-.92.5L8.8 12.5a.6.6 0 0 1 0-1l8.78-6.4a.6.6 0 0 1 .92.5z" fill="currentColor"/>',
  next: '<path d="M18 5v14"/><path d="M5.5 5.6v12.8a.6.6 0 0 0 .92.5l8.78-6.4a.6.6 0 0 0 0-1L6.42 5.1a.6.6 0 0 0-.92.5z" fill="currentColor"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  pin: '<path d="M12 21s-6.75-5.6-6.75-11.25a6.75 6.75 0 0 1 13.5 0C18.75 15.4 12 21 12 21z"/><circle cx="12" cy="9.75" r="2.25"/>',
  external: '<path d="M13.5 4.5h6v6M19.5 4.5 11 13M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  chevronLeft: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
  chevronRight: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
  mail: '<rect x="3.25" y="5.25" width="17.5" height="13.5" rx="2"/><path d="m4 6.5 8 6.25 8-6.25"/>',
  linkedin: '<rect x="3.25" y="3.25" width="17.5" height="17.5" rx="3"/><path d="M8 10.5v6M8 7.5v.01M11.75 16.5v-6M11.75 13.25c0-1.6 1.1-2.75 2.5-2.75s2.25 1 2.25 2.6v3.4"/>',
  github: '<path d="M9 19.5c-4 1.25-4-2-5.5-2.5M14.5 21.5v-3.4a3 3 0 0 0-.85-2.3c2.8-.3 5.85-1.4 5.85-6.3a4.9 4.9 0 0 0-1.35-3.4 4.55 4.55 0 0 0-.1-3.4s-1.1-.35-3.5 1.3a12 12 0 0 0-6.3 0C5.85 2.35 4.75 2.7 4.75 2.7a4.55 4.55 0 0 0-.1 3.4A4.9 4.9 0 0 0 3.3 9.5c0 4.9 3.05 6 5.85 6.3a3 3 0 0 0-.85 2.3v3.4"/>',
  doc: '<path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3.5V8h4.5M9 12.5h6M9 16h6"/>',
  copy: '<rect x="8.25" y="8.25" width="12" height="12" rx="2"/><path d="M15.75 8.25V5.25a1.5 1.5 0 0 0-1.5-1.5h-9a1.5 1.5 0 0 0-1.5 1.5v9a1.5 1.5 0 0 0 1.5 1.5h3"/>',
  chevronDown: '<path d="m5.5 9.5 6.5 6.5 6.5-6.5"/>'
};

/** Returns an inline SVG string for a named icon. */
export function icon(name, { size = 24, label } = {}) {
  const body = PATHS[name] ?? '';
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="icon icon-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${body}</svg>`;
}

/** Fills every element with [data-icon] inside root with its SVG. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(node => {
    if (!node.firstElementChild) node.innerHTML = icon(node.dataset.icon);
  });
}
