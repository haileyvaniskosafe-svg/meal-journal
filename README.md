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

**On your phone:** deploy it (below), open the URL, and use *Add to Home Screen* — it behaves like an app from there.

### Deploying

There's nothing to build. It's static files, so any host works.

**Vercel** (already wired up for this repo): pushes deploy automatically. `vercel.json`
sets sensible headers and — importantly — tells Vercel *not* to cache the HTML, CSS,
and JS, since those filenames aren't content-hashed. Without that you'd keep seeing an
old version after an update. Images you add under `themes/` are cached for a week.

To deploy by hand instead: `npx vercel --prod` from this folder.

> Your data lives in the browser's storage, which is **per-origin**. Data you enter on
> `localhost` won't appear on the deployed site, and vice versa. Pick one and stick to
> it — or use **Settings → Export backup** and import it on the other.

---

## What's in it

### 🎃 Today
Your daily landing pad: shot countdown, water cups, this week's movement ring, today's four meal slots, and your latest weigh-in — all one tap from logging.

### 🍽️ Meal Plan
A seven-day grid with breakfast / lunch / dinner / snacks. Tap any slot to add a meal with optional protein and calories. Tap a planned meal to mark it eaten, edit, or delete.

- **Favorites** — save any meal once, then drop it into a day with one tap.
- **Day menu** (the ☰ on each day) — copy yesterday, copy to tomorrow, repeat across the rest of the week, or clear the day.

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

Everything is stored in your browser's `localStorage` on this device. Nothing is uploaded anywhere, there's no account, and no analytics.

The flip side: **clearing your browser's site data erases it.** So:

- **Settings → Export backup** downloads everything as one JSON file.
- **Settings → Import backup** merges a backup back in (keeps what you have, adds what's missing).

Worth exporting every so often, and definitely before switching devices or browsers.

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
  ui.js               modals, toasts, rings, charts, form helpers
  views/              one file per screen
  app.js              hash router and boot
themes/
  README.md           how to plug in your own icon pack
  halloween/assets/   drop your Halloween images here
```

No dependencies, no bundler. Fonts load from Google Fonts but are **non-blocking**, so the app still opens instantly (with fallback fonts) offline.

---

## A note on the health tracking

This is a personal log, not a medical device and not medical advice. Dose changes, side effects, and weight goals are conversations for you and your prescriber. The app never suggests a dose — it only records what you tell it.
