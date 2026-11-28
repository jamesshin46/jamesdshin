# 04 — Live YouTube view counts

## How it works
1. `scripts/fetch-views.mjs` reads every `youtubeId` in `content/albums.json`, calls the official
   **YouTube Data API v3** `videos.list` endpoint (`part=snippet,statistics`, up to 50 IDs per call,
   1 quota unit per call), and writes `data/views.json`.
2. `.github/workflows/update-views.yml` runs that script **every hour** (and on demand) in GitHub
   Actions, then commits `data/views.json` if it changed. GitHub Pages redeploys automatically.
3. The website fetches `data/views.json` (with a cache-busting query string `?t={Date.now()}`) and
   shows the numbers with a "LIVE · Updated X min ago" badge.

Why not call YouTube directly from the browser every second? It would expose the API key, burn the
daily quota (10,000 units/day by default) within hours, and YouTube's public counts don't update
every second anyway. Hourly is honest and free.

## `data/views.json` format
```json
{
  "updatedAt": "2026-11-27T05:00:00Z",
  "totalViews": 123456,
  "videos": {
    "q-Gh2Pv8jp4": {
      "title": "…",
      "channel": "KNESIS",
      "publishedAt": "2025-…",
      "viewCount": 12345,
      "likeCount": 678,
      "thumbnail": "https://i.ytimg.com/vi/q-Gh2Pv8jp4/hqdefault.jpg"
    }
  }
}
```
The site must work if `updatedAt` is null or `videos` is empty (fallback numbers, no LIVE badge).

## One-time setup (James does this — see docs/06-setup-guide.md for click-by-click steps)
1. Create a Google Cloud project, enable **YouTube Data API v3**, create an **API key**, and restrict
   it to "YouTube Data API v3" only.
2. In the GitHub repo: Settings → Secrets and variables → Actions → New repository secret →
   name `YT_API_KEY`, value = the key.
3. Settings → Actions → General → Workflow permissions → "Read and write permissions".
4. Actions tab → "Update YouTube view counts" → Run workflow (first run).

## Notes for the builder (Claude Code)
- The script and workflow are already written. Only change them if they don't work; keep them
  dependency-free (Node 20 built-in `fetch`).
- Format numbers with `Intl.NumberFormat('en-US')`. For the headline total use full digits
  (e.g. "1,234,567") so it feels live; for compact places use `notation: 'compact'` ("1.2M").
- "Updated X min ago": compute from `updatedAt`; show "just now" under 1 minute, "X min ago",
  "X hr ago", or the date if more than 2 days old.
- Optional polish: after the count-up finishes, if `updatedAt` is recent, re-fetch `views.json`
  every 5 minutes while the tab is visible and animate any change.
