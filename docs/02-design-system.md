# 02 — Design system

Define everything below as CSS custom properties in `:root` so James can retheme by editing a few lines.

## Color (dark theme only)
```css
:root {
  --bg:            #0B0B0F;  /* page background */
  --bg-elevated:   #15151C;  /* sidebar, cards */
  --bg-hover:      #1E1E28;  /* hovered cards/rows */
  --bg-highlight:  #262633;  /* active row, inputs */
  --border:        #2A2A36;
  --text:          #F5F5F7;  /* primary text */
  --text-muted:    #A1A1AE;  /* secondary text */
  --text-subtle:   #6E6E7C;  /* tertiary, timestamps */
  --accent:        #4F7CFF;  /* electric blue — James's signature color. Change here to retheme. */
  --accent-hover:  #6B92FF;
  --accent-contrast: #FFFFFF;
  --live:          #FF4D5E;  /* LIVE dot only */
  --success:       #3DDC97;
}
```
- The **header gradient** fades from a tinted accent (`color-mix(in srgb, var(--accent) 45%, var(--bg))`)
  at the top into `--bg`. Each album detail view uses that album's own `color` (from `albums.json`)
  for its header gradient instead.
- Never use green as a primary accent (avoid looking like a specific streaming brand).

## Typography (Google Fonts)
- Display / headings: **Space Grotesk** (600, 700)
- Body / UI: **Inter** (400, 500, 600)
- Numbers that count/update: Inter with `font-variant-numeric: tabular-nums;` so digits don't jitter.

| Token | Size (desktop / mobile) | Use |
|---|---|---|
| `--fs-hero` | clamp(48px, 9vw, 96px), weight 700, letter-spacing -0.03em | Artist name |
| `--fs-h2` | 24px / 20px, weight 700 | Section titles ("Popular", "Discography") |
| `--fs-h3` | 16px, weight 600 | Card titles, track titles |
| `--fs-body` | 15px | Body |
| `--fs-small` | 13px | Meta text, track subtitles |
| `--fs-micro` | 11px, uppercase, letter-spacing 0.08em | Labels like "ALBUM", "LIVE", "UP NEXT" |

## Layout
- **Desktop (≥1024px):** three regions — left **sidebar** (240px: wordmark, Home, Search, "Your Library"
  list of albums), **main** scrolling content (max content width 1200px), fixed **now-playing bar**
  at the bottom (72px tall) spanning full width.
- **Tablet (768–1023px):** sidebar collapses to an icon rail (72px).
- **Mobile (<768px):** no sidebar. Bottom tab bar (Home, Search, Recap, Contact) sits below a slim
  now-playing bar (56px). Album grid becomes a 2-column grid; horizontal shelves scroll with snap.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64. Card radius 12px; artwork radius 8px; circles for
  "Fans also like" and the headshot.

## Components
- **Album card:** square artwork (image, or a generated cover — see below), title, subtitle
  (year · type). On hover: lift 4px, show a round accent **play button** that slides up in the
  bottom-right of the artwork.
- **Generated cover (fallback when no image):** a square with a linear gradient using the album's
  `color` → darker shade, the album title set large in Space Grotesk at bottom-left, and a subtle
  grain/noise overlay (CSS or a tiny inline SVG). These should look like intentional, designed covers.
- **Track row:** `#` (turns into a ▶ icon on hover), thumbnail (40px), title + subtitle, plays column
  (right-aligned, tabular numbers), optional duration/date. Active (currently playing) row shows
  the title in `--accent` with a small animated equalizer icon instead of the number.
- **Pill / chip:** 32px tall, radius 999px, `--bg-highlight` background; active = `--text` bg with
  `--bg` text. Used for discography filters.
- **Buttons:** Primary = accent fill, round play-style; Secondary = outlined pill.
- **LIVE badge:** red pulsing dot + "LIVE" micro label + "Updated 14 min ago" in `--text-subtle`.

## Motion
- Standard easing `cubic-bezier(0.2, 0.8, 0.2, 1)`, durations 150ms (hover), 250ms (panels), 400ms (page-level).
- Count-up animation for numbers when they scroll into view (~1.2s).
- Equalizer bars on the active track (3 bars, staggered).
- Under `prefers-reduced-motion: reduce`: no count-up (show final value), no equalizer animation,
  no Recap auto-advance, no parallax.

## Iconography
Simple 1.5px-stroke line icons drawn as inline SVG (home, search, play, pause, close, map pin,
external link, chevrons, mail, linkedin "in", github, document). No icon fonts.
