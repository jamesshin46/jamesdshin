# Guestbook setup (Supabase)

The welcome popup saves each visitor's name + favorite song to a free Supabase database.
Visitors can only **add** songs; only you (logged in) can **read** them or pick the featured
"listener pick". Until steps 1–4 are done, the site runs in **demo mode** (saved only in your
own browser), so nothing breaks in the meantime.

✅ Steps 1, 2 and 4 are done for your project. If owner login fails, re-check step 3.

## 1. Create the project
1. **supabase.com** → sign up → **New project**. Name `jamesdshin`, region **East US**, set a
   database password (you won't need it for the website) → **Create new project**.

## 2. Create the tables and privacy rules
1. Copy all of `supabase/setup.sql`. Supabase → **SQL Editor** → **New query** → paste.
2. Replace `YOUR_OWN_EMAIL` (one place, near the top) with your owner email, keeping the quotes.
   It must match **exactly** the user you create in step 3 and `ownerEmail` in
   `content/backend.json` (`@stern.nyu.edu` and `@nyu.edu` are different emails).
3. **Run** → "Success. No rows returned."

## 3. Owner login (and lock out everyone else)
In Supabase → **Authentication → Sign In / Providers**. There are two different switches:

| Setting | Where | Set it to |
|---|---|---|
| **Allow new users to sign up** | "User Signups" section at the top | **OFF** (nobody else can make an account) |
| **Email** provider | "Auth Providers" list → **Email** | **ON / Enabled** (otherwise *you* can't log in) |

⚠️ If owner view says "Email logins are turned off", the **Email provider** is disabled. Enable it.

Then **Authentication → Users → Add user → Create new user**: your owner email + password,
check **Auto Confirm User** → **Create user**. The password lives only in Supabase, never in code.

## 4. Connect the website
**Project Settings → API**: copy the **Project URL** and the **anon / publishable** key into
`content/backend.json` with your `ownerEmail`. (Never the `service_role` / secret key.)

## 5. Spotify song search (about 15 minutes)
This lets visitors pick the exact song (cover art, title, artist) from a dropdown.

**a) Add the song-detail columns.** SQL Editor → New query → paste all of
`supabase/002_song_details.sql` → **Run**.

**b) Make a Spotify app.**
1. Go to **developer.spotify.com/dashboard** → log in with your Spotify account → accept the
   terms → **Create app**.
2. App name: `jamesdshin song search` · Description: `Song search for my portfolio` ·
   Redirect URI: `https://jamesdshin.com` (required, unused) · check **Web API** → **Save**.
3. Open the app → **Settings** → copy the **Client ID**, then **View client secret** and copy it.

**c) Store the Spotify keys in Supabase (privately).**
Supabase → **Edge Functions** → **Secrets** (or Project Settings → Edge Functions → Secrets) →
add two secrets:
- `SPOTIFY_CLIENT_ID` = your Client ID
- `SPOTIFY_CLIENT_SECRET` = your Client secret

**d) Deploy the search function.**
1. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Name it exactly `spotify-search`.
3. Delete the sample code, paste all of `supabase/functions/spotify-search/index.ts` → **Deploy**.
4. Open the function → **Details** (or Settings) → turn **OFF "Verify JWT"** /
   "Enforce JWT verification" → Save. (The site calls it without a login; the function only
   searches songs and keeps the Spotify secret on the server.)

**e) Test.** Open `https://YOUR-PROJECT.supabase.co/functions/v1/spotify-search?q=supernatural`
in your browser. You should see JSON with a `tracks` list. Then on your site, delete
`jds-visitor` in DevTools → Application → Local Storage, refresh, and type a song.

If search isn't set up (or fails), the popup quietly falls back to typing the song by hand.

## 6. Like tracking (2 minutes)
SQL Editor → New query → paste all of `supabase/003_likes.sql` → **Run**. Every heart and
un-heart is then counted anonymously, and owner view shows a **Most liked** chart. Visitors
can't read the counts.

## Using it
- **Owner view:** press **Home** 10 times quickly, enter your password → **Favorite songs**
  appears next to Home and Search. **Lock** hides it again.
- **Feature a song:** press **Feature** on a row (optional note) → it shows on your home page
  with the cover art, "Recommended by {name}", and a Play on Spotify link.
- **Raw data:** Supabase → **Table Editor** → `song_submissions`.
