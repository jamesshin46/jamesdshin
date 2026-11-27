# 03 — Feature specs

All copy comes from `content/*.json`. Field names referenced below match those files.

---

## 1. Time-based greeting
Small line above the artist header (micro/h3 style, `--text-muted`), based on the **visitor's**
local time (`new Date().getHours()`), using `profile.json → greetings`:

| Hours | Key |
|---|---|
| 5:00–11:59 | `morning` |
| 12:00–16:59 | `afternoon` |
| 17:00–21:59 | `evening` |
| 22:00–4:59 | `lateNight` |

Each key has a `title` and a `subtitle`; render as "**Good evening** · subtitle".
Re-check every 10 minutes so it changes if someone leaves the tab open.

---

## 2. Artist page (home)

Top to bottom:

### 2a. Header
- Circular headshot (`profile.headshot`, fallback: initials "JS" on accent gradient).
- Micro label: `profile.label` (e.g. "PORTFOLIO").
- Name in `--fs-hero`: `profile.name`.
- Tagline: `profile.tagline`.
- **Headline stat with LIVE badge:** "**{total} YouTube views** across my dance covers" where
  `{total}` = sum of `viewCount` for every video in `data/views.json` (count-up animation). Next to
  it, the LIVE badge with "Updated X min ago" from `views.json → updatedAt`. If `views.json` has no
  data yet, fall back to `profile.headlineStatFallback` and hide the LIVE badge.
- Secondary stat line from `profile.stats` (e.g. "2.5M+ social views · 20K+ followers · 10 instruments").
- **Action row:**
  1. Big round accent **▶ Play Recap** button (opens Recap, feature 6).
  2. Outlined **Résumé** button → `profile.resumeUrl` (opens in new tab). Hide if TODO.
  3. Outlined **Contact** button → scrolls to Contact.
  4. Icon buttons: LinkedIn, GitHub, Email.

### 2b. Popular
Heading "Popular". A numbered list of `profile.popular` (5 rows), styled as track rows:
`#`, small artwork (the linked album's cover), `title`, `subtitle`, and the `metric` in the plays
column (e.g. "$10M", "100K+ views"). Clicking a row opens the track it references
(`albumId` + `trackId`) — see feature 4.

### 2c. Discography
Heading "Discography". Filter chips from `albums.json → categories` (All, Work, Performance,
Leadership, Education). Grid of album cards (feature 3). Albums with `"status": "upcoming"` show a
small "UPCOMING" pill and a countdown subtitle ("Drops Jan 2027").

### 2d. Fans also like
Heading "Fans also like". Horizontal shelf of circular chips from `interests.json`. Each has an
emoji or image, a label, and a small caption. Behavior by `type`:
- `"map"` → opens the Places map modal filtered to that `placesCategory` (feature 8).
- `"info"` → opens a small popover/card with `detail` text.

### 2e. About ("Artist bio")
Card styled like an artist "About" panel: a large image (`profile.aboutImage`, optional), the
`profile.bio` paragraphs, and quick facts (`profile.quickFacts`: school, location, languages).

### 2f. Contact ("Follow")
Short line `profile.contact.headline`, then buttons for each item in `profile.contact.links`
(Email, LinkedIn, GitHub). Email button copies the address to clipboard and shows a toast
"Email copied", and also has a mailto link.

### Footer
`profile.footer` text + "Built by James Shin · Hand-coded, no framework" + the disclaimer
"Streaming-app inspired design. Not affiliated with any streaming service, platform, or label."

---

## 3. Albums
Data: `albums.json → albums[]`. Each album: `id`, `title`, `subtitle`, `year`, `category`, `type`
(label shown like "EP", "Album", "Single", "Live Album"), `color`, `cover` (image path or null),
`description`, `role`, `dates`, `location`, `status` (optional), `tracks[]`.

**Album detail view** (opens in the main area, URL hash `#/album/{id}` so it's linkable and the
browser back button works):
- Header with the album's gradient (`color`), cover art (240px), micro label `type`, big title,
  line: "James Shin · {role} · {dates} · {n} tracks".
- `description` paragraph.
- Big accent ▶ button = play track 1.
- Tracklist (track rows, see design system).
- "More by James Shin" shelf of other albums at the bottom.

---

## 4. Tracks & playing
Track fields: `id`, `title`, `subtitle`, `kind` (`"video"` or `"highlight"`), `metric` (display
string, optional), `youtubeId` (video only), `detail` (highlight only, 1–3 sentences),
`skills` (array, optional), `date` (optional).

**Plays column:**
- `kind: "video"` → live `viewCount` from `data/views.json` formatted like "123,456". Fallback to
  `metric` or "—".
- `kind: "highlight"` → `metric` string (e.g. "$10M impact", "30+ sites").

**Pressing play:**
- `video` → open a centered modal (dark scrim, 16:9 player, close button, Esc closes, focus trapped)
  with a `youtube-nocookie.com/embed/{youtubeId}?autoplay=1&rel=0` iframe, created only on open and
  destroyed on close. Below the video: title, album, view count + LIVE badge, "Watch on YouTube ↗" link.
  Thumbnails: `https://i.ytimg.com/vi/{youtubeId}/hqdefault.jpg`.
- `highlight` → open a side drawer (desktop) / bottom sheet (mobile) with the title, album, metric
  as a big number, `detail`, and `skills` as chips.
- In both cases: the **now-playing bar** switches to this track, and its row becomes "active".

---

## 5. Now-playing bar
Fixed bottom bar, always visible.
- **Default state** (nothing played yet): from `now-playing.json → default`: small artwork, title,
  subtitle (e.g. "Now playing: Senior year @ NYU Stern"), and on the right an "UP NEXT" micro label with
  `upNext.title` / `upNext.subtitle` (e.g. "Paul, Weiss · Jan 2027").
- **After the visitor plays a track:** artwork, track title, album title, a fake progress bar that
  slowly fills (purely decorative, 30s loop; static under reduced motion), and controls:
  ⏮ previous track / ▶⏸ (re-opens the modal or drawer) / ⏭ next track within the same album.
- On mobile, tapping the bar expands it into a full-screen "Now Playing" view with large artwork,
  title, metric/views, and the prev/next controls.
- Remember the last played track in `sessionStorage` (wrap in try/catch).

---

## 6. Recap (year-in-review story)
Triggered by the **▶ Play Recap** button on the artist page (and the Recap tab on mobile). Also
reachable via `#/recap`.

- Full-screen overlay, one slide at a time, story-style **segmented progress bars** at the top.
- Slides come from `recap.json → slides[]`. Each slide has a `layout`, `bg` (gradient colors),
  `eyebrow`, `headline`, `body`, and optional `stat`, `list`, `liveStat`.
  - `layout: "intro"` — big centered title.
  - `layout: "stat"` — huge number (count-up) with headline/eyebrow around it.
  - `layout: "list"` — numbered top-5 list (like "top artists"), items animate in one by one.
  - `layout: "grid"` — 2×2 or 3×2 tiles of small stats.
  - `layout: "outro"` — final slide with buttons: "Explore the discography" (closes recap and
    scrolls to Discography), "Download résumé", "Replay".
  - If `liveStat: "youtubeTotal"`, the stat is the live total from `views.json` (fallback to `stat`).
- Navigation: auto-advance every `recap.json → secondsPerSlide` (default 6s); tap/click right 2/3 =
  next, left 1/3 = previous; ← → keys; press-and-hold (or Space) pauses; Esc or ✕ closes.
- Each slide gets bold, distinct gradient backgrounds and big Space Grotesk type — this is the most
  "designed" part of the site. Use playful but tasteful geometric shapes (circles, blobs) that
  drift slowly in the background.
- Reduced motion: no auto-advance, no drifting shapes, numbers shown directly.

---

## 7. Search
- Sidebar "Search" item (desktop), Search tab (mobile), and keyboard shortcut **/** focus a search
  input at the top of the main area.
- Searches instantly (debounce 100ms, case-insensitive, accent-insensitive) across:
  album titles/descriptions/roles, track titles/subtitles/details/skills, interests, places
  (name, neighborhood, notes, tags), and `profile.searchKeywords`.
- Results grouped: **Top result** (big card), **Tracks**, **Albums**, **Places**, **Interests**.
  Clicking a result does the natural thing (open album, play track, open map focused on place, etc.).
- Empty query → show "Browse all" category tiles (Work, Performance, Leadership, Education,
  Cafés, Asian Cuisine) as colorful tiles.
- No results → friendly message: `No results for "xyz". Try "Python", "dance", or "coffee".`
- Highlight matched text in results.

---

## 8. Places map (Cafés & Asian Cuisine)
Opened from "Fans also like" chips, search results, and the Browse tiles.

- Large modal (desktop: 90vw × 85vh; mobile: full screen). Left: list panel; right: map. On mobile:
  map on top, list as a draggable bottom sheet (or simple stacked layout).
- **Map library:** Leaflet 1.9 via CDN (unpkg or cdnjs, with SRI integrity hash). Dark basemap tiles
  from CARTO (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`) with the required
  attribution "© OpenStreetMap contributors © CARTO". Do NOT use the Google Maps JavaScript API (it
  requires an API key with billing).
- Data: `places.json → categories[]` and `places[]`. Tabs at the top switch category (Cafés / Asian
  Cuisine). Optional tag filter chips (e.g. "Study spot", "Matcha", "Late night").
- Custom markers: round accent pins with an emoji (☕ / 🍜). Selected pin grows.
- Clicking a list card flies the map to the pin and opens its popup; clicking a pin highlights the card.
- Popup/card content: name, neighborhood, James's `rating` (render as "James's pick" or 1–5 small
  dots — not stars), `note` (his personal note), `order` ("Order: ..."), tags, and an
  **"Open in Google Maps ↗"** link built as
  `https://www.google.com/maps/search/?api=1&query={encodeURIComponent(name + ' ' + address)}`.
- On open, fit the map bounds to all visible pins.
- Places missing `lat`/`lng` are listed but not pinned (and logged via console.info).
- Esc closes; focus returns to the element that opened it.

---

## 9. Routing
Hash-based so it works on GitHub Pages with no server config:
`#/` (home), `#/album/{id}`, `#/search?q=...`, `#/recap`, `#/places/{categoryId}`.
Back/forward buttons must work. Scroll to top on route change (except modals).

---

## 10. SEO & sharing
- `<title>James Shin · Product · Strategy · Media</title>`
- Meta description from `profile.metaDescription`.
- Open Graph + Twitter card tags; `og:image` = `assets/og-image.png` (1200×630) if it exists.
- Favicon: simple "JS" monogram SVG in accent color (create `assets/favicon.svg`).
- `<noscript>` fallback with name, tagline, email, and LinkedIn.

---

## 11. Guestbook, owner view & listener pick (added by James)
- **Welcome popup** (`js/welcome.js`): first visit only (remembered in localStorage `jds-visitor`).
  Asks for name, favorite song, optional artist; skippable. Copy lives in `profile.json → welcome`.
  The visitor's name personalizes the greeting ("Good evening, Alex").
- **Storage** (`js/backend.js`): Supabase via plain `fetch` (no library). Config in
  `content/backend.json`; schema + Row Level Security in `supabase/setup.sql`. Visitors can only
  insert; only the owner can read/delete. Until configured, runs in demo mode (localStorage).
- **Owner view** (`js/owner.js`, route `#/owner`): press Home 10× in a row → password prompt
  (checked by Supabase Auth, never in code) → "Favorite songs" nav item appears. Lists every
  submission; Feature / look up / delete.
- **Listener pick**: the featured song shows between the hero and the action bar for everyone.

## 12. Experience, clubs & profile pages (added by James)
- **Experience** (`content/experience.json`) replaces Popular: logo node, company, role, dates,
  one phrase; upcoming roles show a "Starts in N days" pill.
- **Clubs & communities** (`content/clubs.json`) replaces Artist pick: circular logo shelf.
- Logos sit in an "orb" with a slowly rotating ring in the org's color and a light sweep on hover.
- Clicking either opens a **profile page** (`#/org/{id}`, `js/org-view.js`, `css/org.css`) laid out
  like a LinkedIn profile: banner (image, video, or generated from color + logo), logo overlapping
  the banner, name/tagline/meta (location · dates · tenure), then a **role timeline** (one lane per
  role on a shared time axis, current role with a pulsing playhead), Highlights, About, Skills,
  and a "More experience / More clubs" shelf.
- Role dates are `YYYY-MM` (end may be `present`); durations are computed LinkedIn-style.

## 13. Albums = experiences (supersedes §2b Popular, §2c Discography, §3 Albums)
- `content/albums.json` was retired. Every experience, club, and education entry is an "album"
  page (`#/org/{id}`; old `#/album/{id}` links redirect). Its **chapters** are the tracks: each row
  expands into a deep dive (metric, summary, `story` paragraphs James writes, skills). Playing a
  chapter updates the now-playing bar; ⏮/⏭ step through every chapter in playlist order
  (experience → clubs → education). Each page ends with an **Up next** card to the next page.
- Dance covers live in `content/covers.json` (home "Dance covers" row + a club's "Performances").
  `scripts/fetch-views.mjs` reads YouTube IDs from there.
- Sidebar "Your Library" lists all pages grouped (Experience / Clubs / Education) with logos.
- Footer: only `profile.footer` (James removed the "Built by…" line and the disclaimer).

## 14. Spotify song search in the welcome popup
- Song field is a combobox: typing searches Spotify through the `spotify-search` Supabase Edge
  Function (`supabase/functions/spotify-search/index.ts`; secrets hold the Spotify client ID/secret).
  Picking a track saves `spotify_id`, `album`, `cover_url`, `track_url` (columns from
  `supabase/002_song_details.sql`). Falls back to free typing if search is unavailable.

## 15. Pre-release albums, Choreography reel, hero visualizer
- An `"status": "upcoming"` page with a future `start` date is a **pre-release album**: Play is
  locked, the tracklist is greyed out and unplayable, and a live days/hours/min/sec countdown runs
  to release day; its chapters are skipped by the player until then.
- Dance covers are shown from **Fans also like → Choreography** (`"type": "videos"` in
  interests.json): a film-strip reel ranked by live views, with a count-up number and a meter
  scaled to the most-viewed cover. Videos open on YouTube (no embedded player; many covers
  block playback on other sites).
- Hero hover: the equalizer reacts to the cursor like a visualizer and a soft spotlight follows
  the mouse (no pointer parallax). Scroll parallax remains. All off under reduced motion.


## 16. Liked
- Heart on every experience / club / school (album page header, home timeline rows, club circles). Likes are saved per browser (localStorage `jds-liked`) and listed on `#/liked`, a playlist page pinned at the top of Your Library (and a Liked tab on mobile). Play starts the first liked album.

- Likes are also sent anonymously (+1 / −1) to Supabase table `page_likes` (`supabase/003_likes.sql`); owner view shows a "Most liked" chart.
- Roles ending in the future but already started count as current ("Now", playhead at today, rest of bar dimmed); durations count time so far.
- Education entries can list `localClubs` (clubs that exist only there, e.g. Yonsei), shown only on that school's page.
