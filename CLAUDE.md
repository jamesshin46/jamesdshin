# CLAUDE.md — Build instructions for jamesdshin.com

You are building James Shin's personal portfolio website. Everything you need is in this repo.
Read these files **in this order** before writing any code:

1. `docs/01-product-brief.md` — what the site is, who it's for, the concept
2. `docs/02-design-system.md` — colors, type, spacing, components, motion
3. `docs/03-features.md` — exact behavior of every feature
4. `docs/04-live-views.md` — how YouTube view counts stay up to date
5. `docs/05-build-plan.md` — the order to build in, and the acceptance checklist
6. `content/*.json` — ALL site copy and data. Never hard-code content in HTML/JS.

## Hard rules

- **Tech stack:** plain HTML + CSS + vanilla JavaScript (ES modules). No frameworks, no build step,
  no npm dependencies for the site itself. The only allowed external libraries are loaded from a CDN:
  Leaflet (maps) and Google Fonts. The site must work by simply opening it with VS Code Live Server
  and when served by GitHub Pages.
- **Hosting:** GitHub Pages, repo `jamesshin46/jamesdshin`, custom domain `jamesdshin.com`.
  Use **relative paths only** (`./css/style.css`, `content/albums.json`) — never root-absolute
  paths like `/css/style.css` — so it works at both `https://jamesshin46.github.io/jamesdshin/`
  and `https://jamesdshin.com/`.
- **Do not delete or modify** the `CNAME` file in the repo root if one exists.
- **Content lives in `content/*.json`.** The JS fetches these files at runtime and renders everything.
  James will edit these JSON files himself to update the site, so keep the rendering code tolerant
  of missing/optional fields (skip gracefully, never crash).
- **Placeholders:** any string value that **starts with `"TODO"`** is treated as empty and never
  rendered. If a *required* field is empty (e.g. a link's `url`, a place's `name`, a highlight
  track's `detail`), hide that whole item. Optional fields that are empty are simply skipped.
  Log one `console.info` listing everything still TODO. Never show the word "TODO" to visitors.
- **Keys starting with `_`** (like `_note`, `_help`) are notes for James — never render them.
- **Not a Spotify clone.** The site is *inspired by* a music-streaming app's layout. Do NOT use
  Spotify's name, logo, wordmark, signature green (#1DB954), or their font. Do not use the word
  "Wrapped" in the UI — the feature is called **"Recap"**. Do not use YouTube, Instagram, or any
  label/agency logos except small generic platform icons on links (draw simple ones in SVG or use
  text labels). Exception (added by James): logos and banners of James's own employers and clubs,
  supplied by him in `assets/`, are used on the Experience / Clubs sections and profile pages.
  Exception 2: the welcome popup's song search uses Spotify's API (via a Supabase Edge Function)
  and shows a small "Results from Spotify" credit and "Play on Spotify" links, as Spotify's
  developer terms require attribution. Still no Spotify logo, green, or font.
- **Privacy:** never add James's phone number or home address anywhere — not in HTML, JSON, meta
  tags, or the résumé PDF link text.
- **Accessibility:** semantic HTML, keyboard navigable, visible focus rings, `alt` text on images,
  `aria-label`s on icon buttons, color contrast ≥ 4.5:1 for body text, and full
  `prefers-reduced-motion` support (disable auto-advance, spins, count-up animations).
- **Responsive:** must look intentional at 375px (phone), 768px (tablet), and 1440px (desktop).
- **Performance:** no images over ~300 KB, lazy-load YouTube iframes (only create the iframe when
  the user presses play), `loading="lazy"` on images.

## File structure to produce

```
index.html
css/style.css              (can split into multiple files if it grows large)
js/main.js                 (entry; imports modules below)
js/data.js                 (fetch + cache content JSON and data/views.json)
js/render-artist.js        (home: hero, listener pick, experience/clubs/education, covers, about, contact)
js/org-view.js             (album page for each experience/club/education: chapters, role timeline, up next)
js/orgs.js                 (org logos + date math)
js/player.js               (chapter playback, YouTube modal, now-playing bar)
js/welcome.js, owner.js, backend.js (guestbook popup, hidden owner view, Supabase)
js/recap.js                (Recap story experience)
js/search.js
js/places-map.js           (Leaflet map modal for cafés & Asian cuisine)
js/utils.js                (formatNumber, timeAgo, greeting, etc.)
content/                   (experience/clubs/education.json = album pages with chapters; covers.json = dance videos)
data/views.json            (already provided as a seed; overwritten hourly by the GitHub Action)
scripts/fetch-views.mjs    (already provided)
.github/workflows/update-views.yml (already provided)
assets/                    (images James adds; see assets/README.md)
```

The repo may already contain an old placeholder `index.html`, `style.css`, `script.js` — replace
them. Delete the old root-level `style.css` / `script.js` once the new `css/` and `js/` exist.

## Working style

- Build in the phases in `docs/05-build-plan.md`. After each phase, tell James what to look at in
  Live Server and wait for feedback before moving on, unless he says to keep going.
- When something in the docs is ambiguous, choose the simpler option and note it in your reply.
- After the final phase, run through the acceptance checklist in `docs/05-build-plan.md` and report
  which items pass.
