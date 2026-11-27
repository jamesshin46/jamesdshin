// Supabase Edge Function: spotify-search
// The website calls  GET {SUPABASE_URL}/functions/v1/spotify-search?q=song name
// and gets back up to 6 tracks (title, artists, album, cover art, Spotify link).
//
// Why a server function? Spotify's search needs a client SECRET. It lives here as a Supabase
// secret (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET) and never reaches the browser.
// Setup steps: supabase/README.md → "Spotify song search".

const CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET') ?? '';

// Sites allowed to call this function from a browser.
const ALLOWED_ORIGINS = [
  'https://jamesdshin.com',
  'https://www.jamesdshin.com',
  'https://jamesshin46.github.io',
  'http://localhost',   // any port (VS Code Live Server)
  'http://127.0.0.1'    // any port
];

let cached = { token: '', expiresAt: 0 };

async function getToken(): Promise<string> {
  if (cached.token && Date.now() < cached.expiresAt - 60_000) return cached.token;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error(`Spotify token request failed (${res.status})`);
  const json = await res.json();
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

function corsHeaders(origin: string): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.some(a => origin === a || origin.startsWith(`${a}:`));
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    Vary: 'Origin'
  };
}

type SpotifyImage = { url: string; width: number; height: number };

Deno.serve(async (req: Request) => {
  const headers = { ...corsHeaders(req.headers.get('origin') ?? ''), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers });
  if (!CLIENT_ID || !CLIENT_SECRET) return new Response(JSON.stringify({ error: 'not_configured' }), { status: 500, headers });

  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 100);
  if (q.length < 2) return new Response(JSON.stringify({ tracks: [] }), { headers });

  try {
    const url = `https://api.spotify.com/v1/search?type=track&limit=6&market=US&q=${encodeURIComponent(q)}`;
    let res = await fetch(url, { headers: { Authorization: `Bearer ${await getToken()}` } });
    if (res.status === 401) {
      cached = { token: '', expiresAt: 0 };
      res = await fetch(url, { headers: { Authorization: `Bearer ${await getToken()}` } });
    }
    if (!res.ok) return new Response(JSON.stringify({ error: 'spotify', status: res.status }), { status: 502, headers });

    const json = await res.json();
    // deno-lint-ignore no-explicit-any
    const tracks = (json.tracks?.items ?? []).map((t: any) => {
      const images: SpotifyImage[] = [...(t.album?.images ?? [])].sort((a, b) => a.width - b.width);
      return {
        id: t.id,
        name: t.name,
        artists: (t.artists ?? []).map((a: { name: string }) => a.name).join(', '),
        album: t.album?.name ?? '',
        image: images.find(i => i.width >= 64)?.url ?? images[0]?.url ?? null,     // small, for the dropdown
        imageLarge: images.find(i => i.width >= 300)?.url ?? images.at(-1)?.url ?? null, // for the page
        url: t.external_urls?.spotify ?? null
      };
    });
    return new Response(JSON.stringify({ tracks }), { headers: { ...headers, 'Cache-Control': 'public, max-age=300' } });
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'server' }), { status: 500, headers });
  }
});
