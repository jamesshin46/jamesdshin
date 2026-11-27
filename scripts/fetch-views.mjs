// Fetches live YouTube stats for every video in content/albums.json
// and writes data/views.json. Runs hourly via .github/workflows/update-views.yml.
// Requires env var YT_API_KEY. No dependencies (Node 20+ built-in fetch).

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const ALBUMS_PATH = 'content/albums.json';
const OUT_PATH = 'data/views.json';
const API = 'https://www.googleapis.com/youtube/v3/videos';

const key = process.env.YT_API_KEY;
if (!key) {
  console.error('Missing YT_API_KEY environment variable.');
  process.exit(1);
}

const albums = JSON.parse(await readFile(ALBUMS_PATH, 'utf8')).albums ?? [];
const ids = [...new Set(
  albums.flatMap(a => a.tracks ?? [])
        .map(t => t.youtubeId)
        .filter(id => typeof id === 'string' && id && !id.startsWith('TODO'))
)];

if (ids.length === 0) {
  console.log('No YouTube IDs found in albums.json; nothing to do.');
  process.exit(0);
}

const videos = {};
for (let i = 0; i < ids.length; i += 50) {
  const batch = ids.slice(i, i + 50);
  const url = `${API}?part=snippet,statistics&id=${batch.join(',')}&key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`YouTube API error ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const json = await res.json();
  for (const item of json.items ?? []) {
    const s = item.statistics ?? {};
    const sn = item.snippet ?? {};
    videos[item.id] = {
      title: sn.title ?? null,
      channel: sn.channelTitle ?? null,
      publishedAt: sn.publishedAt ?? null,
      viewCount: s.viewCount != null ? Number(s.viewCount) : null,
      likeCount: s.likeCount != null ? Number(s.likeCount) : null,
      thumbnail: sn.thumbnails?.high?.url ?? `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`
    };
  }
}

const missing = ids.filter(id => !videos[id]);
if (missing.length) console.warn(`Not returned by API (private/deleted?): ${missing.join(', ')}`);

const totalViews = Object.values(videos).reduce((sum, v) => sum + (v.viewCount ?? 0), 0);
const out = { updatedAt: new Date().toISOString(), totalViews, videos };

await mkdir('data', { recursive: true });
await writeFile(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${OUT_PATH}: ${Object.keys(videos).length} videos, ${totalViews.toLocaleString('en-US')} total views.`);
