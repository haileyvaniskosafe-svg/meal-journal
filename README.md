# 🎃 Cauldron

A cute, theme-able tracker for **meal planning**, **weekly GLP-1 (Zepbound) shots**, and **activity** — shipping with a Halloween theme and a full visual theme editor.

No build step, no install, no account. It's plain HTML, CSS, and JavaScript, and all your data stays in your own browser.

---

## Running it

**Easiest:** double-click `index.html`. That's it.

**Nicer (recommended):** serve the folder so the browser treats it as a real site — this keeps your data stable and lets you add it to your phone's home screen.

```bash
# from this folder, pick whichever you have
python3 -m http.server 8000
npx http-server -p 8000
```

Then open <http://localhost:8000>.

**On your phone:** deploy it (below), open the URL, and install it — see *Installing it as an app*.

### Deploying

There's nothing to build. It's static files, so any host works.

**Vercel** (already wired up for this repo): pushes deploy automatically. `vercel.json`
sets sensible headers and — importantly — tells Vercel *not* to cache the HTML, CSS,
and JS, since those filenames aren't content-hashed. Without that you'd keep seeing an
old version after an update. Images you add under `themes/` are cached for a week.

To deploy by hand instead: `npx vercel --prod` from this folder.

> Without sync turned on, data lives in that browser's storage, which is **per-origin** —
> what you enter on `localhost` won't appear on the deployed site. Turn on sync (below),
> or use **Settings → Export backup**, to move between them.

---

## What's in it

### 🎃 Today
Your daily landing pad: shot countdown, water cups, this week's movement ring, today's four meal slots, and your latest weigh-in — all one tap from logging.

### 🍽️ Meal Plan
A seven-day grid with breakfast / lunch / dinner / snacks. Tap any slot to add a meal. Tap a planned meal to mark it eaten, edit, or delete.

- **Favorites** — save any meal once, then drop it into a day with one tap.
- **Day menu** (the ☰ on each day) — copy yesterday, copy to tomorrow, repeat across the rest of the week, or clear the day.

### 🔎 My foods

A small database of the things *you* actually eat, so logging is a search and a tap
rather than typing macros every time.

Search by name or brand in the meal editor; picking a food fills in its macros, and a
**quantity** box scales them (2 tacos = double). Foods you eat often rise to the top.
Manage the library from the **My foods** card on the Meal Plan page.

Each food stores macros **per serving**, with the serving spelled out (`25 biscuits (~60 g)`),
so the numbers always mean something specific.

> **The "unchecked" flag.** A food shows a ⚠ until someone confirms its macros against
> an actual label. Tick *Checked against the label* in the food editor and it clears.

Drinks can carry a **counts as water** value in fl oz. Logging one tops up the day's
water automatically — a 12 oz can of water is 12 oz of water, and shouldn't need logging
twice.

Updating the starter library (`js/foods-seed.js`) and bumping `FOOD_SEED_REV` pushes
corrections to installs that already hold the old numbers — but only to foods you
haven't edited. Anything you've changed yourself is yours and is never overwritten.

### 💧 Water

Tap a cup to set the count, or use − / +. Cups past your goal still show, so drinking extra
counts rather than disappearing. Tap the count to type an exact number — and to **define what
a cup means**: your usual glass, a 12 oz bottle, a 1 L tumbler, in fl oz or ml. The card then
shows both (`5 / 8 cups` and `60 / 96 oz`).

### 🎯 Macros

Track as many or as few as you want — calories, protein, fiber, carbs, fat, sugar, sodium. Pick them in **Settings → Macros** and only those become fields when you log a meal.

Each macro is either something you're **reaching for** (protein, fiber) or **staying under** (calories, sodium), and the daily card reads accordingly: a target bar turns green at 100%, a limit bar goes amber as you approach and red past it, with *"45g to go"* or *"300 over"* underneath.

### 💉 Shots
Built specifically around a weekly tirzepatide schedule.

- **Countdown** to the next dose, driven by your *last logged shot* — so a week off never desyncs the schedule.
- **Dose tracking** across the standard 2.5 → 15 mg steps, with a timeline that groups shots into dose stints and flags every change.
- **Site rotation** — six sites with days-since-last-use, and the next one in the rotation pre-selected.
- **Side effects** — optional checklist per shot, summarized across your recent shots.
- **Weigh-in** captured inline with the shot.

### 🏃 Move
Log walks, strength, yoga, cycling and more with duration and intensity. Weekly ring against your minutes goal, a per-day bar chart, a breakdown by type, and a daily streak.

### 📈 Progress
Weight trend chart (30d / 90d / 365d / all), change since start, progress toward your goal, the dose timeline, and an eight-week consistency view of activity minutes, shots logged, and meals planned.

### 🎨 Theme
See below — this is the fun part.

### Editing and deleting
Everything you log can be edited later — tap it. Deleting shows a **"Deleted — Undo"** toast for seven seconds, including when you clear a whole day, which brings the entire day back.

---

## Installing it as an app

It's a PWA, so it installs to your home screen and behaves like a native app — its own icon, fullscreen with no browser chrome, and it works with no signal.

**iPhone / iPad** — open the site in **Safari** (this doesn't work from Chrome on iOS), tap the Share button, then **Add to Home Screen**.

**Android** — Chrome shows an *Install app* prompt, or use the ⋮ menu → **Install app**.

**Desktop** — Chrome and Edge show an install icon in the address bar.

Once installed:

- **Works offline.** Log meals, shots and activity on a plane; it syncs when you're back.
- **Updates itself.** Deploys land on next launch — no reinstalling.
- **The status bar matches your theme**, so Pastel Boo and Haunted Hollow look right to the edges.

There are no App Store or Play Store listings. Those would mean $99/year for Apple, a Mac with Xcode, and app review for every update — a lot of ceremony for a personal tracker, and the installed PWA is near-indistinguishable in daily use. The groundwork is here if that ever changes: wrapping this in Capacitor is the path.

---

## The theme system

Every color, corner radius, font, ambient animation, and even the app's own name lives in a theme. Themes are plain JSON, so they're easy to edit, export, and share.

### Built-in themes

| Theme | Mood | Feel |
|---|---|---|
| **Haunted Hollow** | Dark | Pumpkin orange on deep plum, floating bats, cobweb corners |
| **Witching Hour** | Dark | Near-black with poison green and a bobbing ghost |
| **Harvest Cottage** | Light | Warm cream and burnt orange, drifting leaves |
| **Pastel Boo** | Light | Soft lilac and candy pink — spooky, but cute |
| **Midnight Noir** | Dark | Quiet greyscale with one amber spark, no animation |

Tap the 🎨 button in the top bar to cycle through them instantly.

### Editing a theme

**Theme → Customize** opens the editor. Every change previews live across the whole app as you make it.

You can change:

- **Brand colors** — primary, accent, and the text colors that sit on them
- **Surfaces** — page background through to card and border colors
- **Text** — primary, secondary, muted
- **Status colors** — good, warning, danger, info
- **Shape & type** — corner radius sliders and heading/body font
- **App name and tagline** — the wordmark in the top bar
- **Ambient decoration** — bats, leaves, ghosts, sparkles, or none
- **Icon asset pack** — swap the built-in drawings for your own images

Editing a built-in theme automatically creates *your* copy, so the originals are always intact. **Export** writes a `.theme.json` file you can back up or share; **Import** loads one back.

> Every ambient animation respects `prefers-reduced-motion`, and the decorations can be turned off entirely per-theme or globally in Settings.

### Using your own icons

The 54 built-in icons are hand-drawn SVGs that inherit theme colors automatically. If you'd rather use your own icon pack, see **[`themes/README.md`](themes/README.md)** — you drop image files into a folder and point the theme at them. No code changes.

---

## Your data

By default everything is stored in your browser's `localStorage` on this device. Nothing is uploaded, there's no account, and no analytics.

The flip side: **clearing your browser's site data erases it.** So either turn on sync, or export regularly:

- **Settings → Export backup** downloads everything as one JSON file.
- **Settings → Import backup** merges a backup back in.

Roughly 250 KB per year of daily use, against a ~5 MB browser budget — about twenty years' headroom.

### Syncing across devices (optional)

Connect a free Supabase project and your phone and laptop stay in step, with a real off-device backup. **[supabase/SETUP.md](supabase/SETUP.md)** is the five-minute walkthrough; [`supabase/schema.sql`](supabase/schema.sql) is the one query you run.

How it behaves:

- **Automatic** — pushes a couple of seconds after a change, pulls when you return to the tab.
- **Offline-safe** — everything still saves locally and syncs when you reconnect.
- **Merges rather than overwrites** — each meal, shot, activity and weigh-in syncs on its own, so logging breakfast on your phone and a walk on your laptop keeps both. If the *same* record is edited in two places, the later edit wins.
- **Deletes travel too.**

Privacy: the table has row-level security so it only ever returns your own rows, and anonymous access is denied outright — which is what makes it safe to ship the public anon key in the page. It is **not** end-to-end encrypted, though: Supabase can read your rows. If that's not acceptable, leave sync off and use Export backup.

---

## Keyboard shortcuts

| Key | Goes to |
|---|---|
| `1`–`7` | Today, Meal Plan, Shots, Move, Progress, Theme, Settings |
| `Esc` | Close the open dialog |
| `Enter` | Save, in most dialogs |

---

## Project layout

```
index.html            app shell, nav, script order
css/
  tokens.css          the theme contract — every CSS variable a theme can set
  layout.css          app shell, nav, responsive scaffolding
  components.css      cards, buttons, forms, modals, charts
  decor.css           ambient bats / leaves / ghosts / sparkles
js/
  icons.js            54 hand-drawn SVG icons + asset-pack overrides
  store.js            all persistence, date maths, and data operations
  themes.js           theme definitions and the skinning engine
  sync.js             optional Supabase sync (auth + merge engine)
  ui.js               modals, toasts, rings, charts, form helpers
  views/              one file per screen
  app.js              hash router and boot
supabase/
  SETUP.md            how to turn sync on
  schema.sql          the table and its security rules
manifest.json         PWA metadata (name, icons, colors)
sw.js                 service worker - offline support
icons/                home-screen icons, incl. maskable
themes/
  README.md           how to plug in your own icon pack
  halloween/assets/   drop your Halloween images here
```

No dependencies, no bundler. Fonts load from Google Fonts but are **non-blocking**, so the app still opens instantly (with fallback fonts) offline.

---

## Credits

Most icons are [Phosphor Icons](https://phosphoricons.com) (MIT) — embedded rather than
loaded from a CDN, so the app stays dependency-free and works offline. Full licence in
[`licenses/phosphor-icons-LICENSE`](licenses/phosphor-icons-LICENSE).

A handful of Halloween shapes — pumpkin, bat, cauldron, spider, web, tombstone, corn,
candy — exist in no icon set, so those are hand-drawn to match Phosphor's weight.

## A note on the health tracking

This is a personal log, not a medical device and not medical advice. Dose changes, side effects, and weight goals are conversations for you and your prescriber. The app never suggests a dose — it only records what you tell it.
