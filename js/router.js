// Hash router: #/  #/album/{id}  #/search?q=  #/recap  #/places/{categoryId}

const listeners = new Set();

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#\/?/, '');
  const [pathPart, query = ''] = raw.split('?');
  const segs = pathPart.split('/').filter(Boolean).map(s => {
    try { return decodeURIComponent(s); } catch { return s; }
  });
  const params = new URLSearchParams(query);

  switch (segs[0]) {
    case undefined: return { name: 'home', key: 'home' };
    case 'album': return segs[1] ? { name: 'album', id: segs[1], key: `album/${segs[1]}` } : { name: 'home', key: 'home' };
    case 'search': return { name: 'search', q: params.get('q') ?? '', key: 'search' };
    case 'recap': return { name: 'recap', modal: true, key: 'recap' };
    case 'places': return { name: 'places', category: segs[1] ?? null, modal: true, key: 'places' };
    default: return { name: 'notfound', key: `notfound/${segs.join('/')}` };
  }
}

/** Navigate to a path like "album/knesis" or "search?q=dance". */
export function navigate(path = '', { replace = false } = {}) {
  const hash = `#/${path.replace(/^#?\/?/, '')}`;
  if (replace) {
    history.replaceState(history.state, '', hash);
    emit();
  } else if (location.hash === hash) {
    emit();
  } else {
    location.hash = hash;
  }
}

export function onRoute(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  const route = parseHash();
  listeners.forEach(fn => fn(route));
}

export function startRouter() {
  window.addEventListener('hashchange', emit);
  emit();
}
