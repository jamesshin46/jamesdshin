# assets/

Put your images and files here. Everything is optional — the site shows designed fallbacks if a file is missing.

| File | What | Tips |
|---|---|---|
| `headshot.jpg` | Your photo for the artist header | Square, at least 600×600, under 300 KB. A clean, well-lit photo. |
| `about.jpg` | Wide photo for the About ("artist bio") card | Landscape, ~1600×900, under 300 KB. A performance or candid shot works great. |
| `James_Shin_Resume.pdf` | Résumé download | **Remove your phone number and home address first** — this file is public. |
| `og-image.png` | Preview image when your link is shared (LinkedIn, iMessage) | 1200×630. Can be a screenshot of the finished homepage. |
| `covers/{albumId}.jpg` | Optional album cover art, e.g. `covers/knesis.jpg` | Square, 800×800, under 250 KB. Then set `"cover": "assets/covers/knesis.jpg"` in `content/albums.json`. |

Compress images for free at squoosh.app before adding them.

Album IDs: `paulweiss`, `strategyand`, `xingfutang`, `methix`, `knesis`, `f4mx`, `acu`, `bap`, `nyu`.

## Naming convention
Lowercase, underscores, `{org}_{what}.{ext}`, e.g. `knesis_logo.png`, `knesis_logo_banner.png`.
(Lowercase matters: GitHub Pages treats `KNESIS.png` and `knesis.png` as different files.)

| File | Used for |
|---|---|
| `headshot.jpg`, `headshot_cutout.avif`, `about_photo.jpg`, `hero_banner_bg.jpg` | Hero portrait, cutout, About sleeve, hero background |
| `paulweiss_logo.png` | Paul, Weiss (banner is generated) |
| `strategyand_logo.jpg`, `strategyand_logo_banner.svg` | Strategy& |
| `xingfutang_logo.png`, `xingfutang_mascot_banner.png` | Xing Fu Tang |
| `methix_logo.jpg`, `methix_logo_banner.png` | Methix |
| `nyucsb_logo.png`, `nyucsb_logo_banner.png` | NYU Stern Center for Sustainable Business |
| `nyustern_logo.jpg`, `nyustern_logo_banner.png` | NYU Stern (album page) |
| `knesis_logo.png`, `knesis_logo_banner.png` | KNESIS |
| `acu_logo.png`, `acu_banner_video.mp4`, `acu_banner_poster.jpg` | Asian Cultural Union (poster = still frame for reduced motion) |
| `bap_logo.webp` | Beta Alpha Psi (banner is generated) |
| `netimpact_logo.jpg`, `netimpact_logo_banner.webp` | Net Impact |

To add a logo/banner for a club or job: drop the file here with this naming, then set `logo.src`
/ `banner.src` for that entry in `content/experience.json` or `content/clubs.json`.

