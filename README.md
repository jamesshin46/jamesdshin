# jamesdshin.com — Site Kit

Everything Claude Code needs to build your streaming-app-inspired portfolio: the plan, the design,
the feature specs, all your content, and the live YouTube view counter.

```
CLAUDE.md                     ← Claude Code reads this automatically. The master instructions.
docs/                         ← Product brief, design system, feature specs, live views, build plan
content/                      ← ALL your site's words and data. Edit these to update the site.
  profile.json                  name, tagline, stats, bio, contact, greetings, "Popular" list
  albums.json                   every album + track (work, dance covers, leadership, school)
  recap.json                    the Recap story slides
  now-playing.json              the bottom "Now playing" bar
  interests.json                "Fans also like" chips
  places.json                   your café + Asian food map (needs your spots!)
data/views.json               ← live YouTube counts (auto-updated hourly once set up)
scripts/fetch-views.mjs       ← fetches YouTube counts
.github/workflows/update-views.yml  ← runs the script every hour on GitHub
assets/                       ← your photos + résumé PDF go here (see assets/README.md)
```

---

## Step 1 — Put the kit into your repo folder
1. Open the `jamesdshin` folder you cloned with GitHub Desktop (the one linked to GitHub).
2. Copy **everything inside** this kit into it, so `CLAUDE.md` sits next to your current `index.html`.
3. ⚠️ The `.github` folder is hidden by default. On Mac press **Cmd + Shift + .** in Finder to show
   hidden files; on Windows, View → Show → Hidden items. Make sure `.github/` gets copied too.
4. If there's a `CNAME` file in your repo, leave it alone.

## Step 2 — Fill in the blanks (10–20 min, can also do later)
Anything starting with `TODO` is hidden on the live site until you fill it in.
- `content/profile.json` → your **LinkedIn URL**.
- `content/places.json` → your **cafés and Asian restaurants** with personal notes (delete the two TEMPLATE entries).
- `content/interests.json` → your 10 instruments, tea, pool, introspection lines.
- `content/albums.json` → F4MX dates, SplitLease description, and check the Strategy& "M&Q" note.
- `assets/` → headshot, about photo, and résumé PDF (**without** phone number and address).

## Step 3 — Build with Claude Code
1. Open the repo folder in VS Code and start Claude Code.
2. Paste this prompt:

   > Read CLAUDE.md and every file in docs/ and content/. Then build my portfolio site following
   > docs/05-build-plan.md, starting with Phase 1. After each phase, tell me what to check in Live
   > Server and wait for my go-ahead.

3. After each phase, right-click `index.html` → **Open with Live Server** and look around. Give
   feedback in plain English ("make the header bigger", "the recap slides feel slow").

## Step 4 — Publish
In GitHub Desktop: write a summary → **Commit to main** → **Push origin**. Your site updates at
jamesdshin.com in about a minute.

## Step 5 — Turn on live YouTube view counts (15 min, one time)
**Get a free YouTube API key**
1. Go to console.cloud.google.com and sign in → create a new project (e.g. "jamesdshin-site").
2. **APIs & Services → Library** → search **YouTube Data API v3** → **Enable**.
3. **APIs & Services → Credentials → Create credentials → API key**. Copy it.
4. Click the key → **API restrictions → Restrict key → YouTube Data API v3** → Save.
   (Never paste this key into any file in your repo.)

**Give it to GitHub (privately)**
5. Your repo on github.com → **Settings → Secrets and variables → Actions → New repository secret**.
   Name: `YT_API_KEY` · Secret: paste the key → Add secret.
6. **Settings → Actions → General → Workflow permissions** → select **Read and write permissions** → Save.

**Run it**
7. **Actions** tab → "Update YouTube view counts" → **Run workflow**. In ~30 seconds `data/views.json`
   fills with real numbers, and the LIVE badge appears on your site. From then on it updates every hour.
8. In GitHub Desktop, click **Fetch/Pull origin** before you next edit, so you have the latest
   `views.json` (the bot commits it hourly).

Note: GitHub may pause scheduled workflows on repos with no activity for 60 days. If counts ever stop
updating, open the Actions tab and re-enable the workflow.

## Updating the site later
- New dance cover? Add a track with `"kind": "video"` and its `youtubeId` to the right album in
  `content/albums.json`. Its live views appear within the hour.
- New job? Add an album. New café? Add a place. Life update? Edit `content/now-playing.json`.
- Commit + push. Done.

## Adding a new video — example
```json
{
  "id": "kn-new-cover",
  "title": "ARTIST — Song",
  "subtitle": "Kpop in Public NYC · Dance Cover by KNESIS",
  "kind": "video",
  "youtubeId": "abc123XYZ"
}
```
The `youtubeId` is the part after `youtu.be/` (before any `?`).
