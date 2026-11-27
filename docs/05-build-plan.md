# 05 — Build plan & acceptance checklist

Build in phases. After each phase, summarize what changed and what James should check in Live Server.

## Phase 1 — Skeleton & data
- `index.html` shell, CSS variables from the design system, fonts, sidebar / main / now-playing
  layout, responsive breakpoints, mobile tab bar.
- `js/data.js` loads all `content/*.json` + `data/views.json` (tolerant of missing files/fields).
- Hash router with placeholder views.

## Phase 2 — Artist page
- Greeting, header (with live total + LIVE badge + fallback), action row, Popular, Discography
  grid with filters and generated covers, Fans also like shelf, About, Contact, footer.

## Phase 3 — Albums, tracks, player, now-playing bar
- Album detail view + routing, track rows with live plays, YouTube modal, highlight drawer,
  now-playing bar (default state, playing state, prev/next, mobile expanded view).

## Phase 4 — Recap
- Full story experience with all layouts, navigation, live stat slide, outro actions.

## Phase 5 — Search
- Index, grouped results, highlighting, browse tiles, keyboard shortcut.

## Phase 6 — Places map
- Leaflet modal, category tabs, tag filters, list ↔ map syncing, Google Maps links.

## Phase 7 — Polish & QA
- Motion, reduced motion, focus states, meta/OG tags, favicon, noscript, performance pass, run checklist.

---

## Acceptance checklist
- [ ] Works opened via Live Server AND at `https://jamesshin46.github.io/jamesdshin/` (relative paths only).
- [ ] No console errors. TODO content is hidden and listed once via `console.info`.
- [ ] Greeting changes correctly for morning / afternoon / evening / late night.
- [ ] Header shows the live YouTube total with LIVE badge when `views.json` has data; clean fallback when it doesn't.
- [ ] All 9 albums render; filters work; upcoming album shows "UPCOMING".
- [ ] Every track plays: videos open the modal with the right video; highlights open the drawer.
- [ ] Now-playing bar updates on play; prev/next works; default state shows current + up next.
- [ ] Recap opens from the button and `#/recap`; tap, keys, hold-to-pause, Esc all work; outro buttons work.
- [ ] Search finds "Python", "dance", "KATSEYE", "coffee", "Strategy&", "$10M"; `/` focuses search.
- [ ] Cafés and Asian Cuisine open the map with pins, notes, and working Google Maps links.
- [ ] Back/forward browser buttons work for albums, search, recap, places.
- [ ] Keyboard-only navigation works everywhere; modals trap focus and restore it on close.
- [ ] `prefers-reduced-motion` disables animations and auto-advance.
- [ ] Looks intentional at 375px, 768px, 1440px.
- [ ] No phone number or home address anywhere in the repo.
- [ ] No Spotify name/logo/green/fonts; the feature is called "Recap".
- [ ] Lighthouse: Performance ≥ 90, Accessibility ≥ 95 on desktop.
