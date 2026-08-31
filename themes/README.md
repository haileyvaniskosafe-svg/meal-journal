# Using your own icons & building themes

The app ships with 54 hand-drawn SVG icons. They're vector, so they stay sharp at any size and **recolor themselves** to match whatever theme is active — which is why they're the default.

But if you have an icon pack you love (Halloween clip art, a cute PNG set, hand-drawn stickers), any theme can point individual icons at your own image files.

---

## Adding an icon pack

### 1. Drop your files in

Put your images anywhere in this project. The tidy place is inside your theme's folder:

```
themes/
  halloween/
    assets/
      pumpkin.png
      ghost.png
      bat.svg
      ...
```

PNG, SVG, WebP, and JPG all work. **SVG is best** (sharpest, smallest); PNG is the usual choice for detailed art.

### 2. Point the theme at them

Go to **Theme → Customize → Icon asset pack**. You'll see a field for each icon slot. Type the path relative to `index.html`:

```
themes/halloween/assets/pumpkin.png
```

The icon updates live as you type. Leave a field blank to keep the built-in drawing. Hit **Save theme** when you're happy.

You can mix freely — use your own art for the six icons you care about and keep the built-ins for the rest.

### 3. Sizing your art

Icons render into small squares (12–30px on screen, so export at 2× for retina):

- Export at **64×64** or **128×128**
- **Square** canvas, with the art centered
- **Transparent background**
- Some padding inside the canvas so it doesn't look cramped next to the built-ins

> Image icons can't recolor themselves the way the built-in SVGs do. If you switch to a light theme, dark artwork still reads fine — but very light artwork may disappear. Worth checking your pack against both a light and a dark theme.

### Slots you can override

`pumpkin` `potion` `bat` `moon` `cauldron` `ghost` `mug` `bowl` `utensils` `apple` `drop` `run` `scale` `flame` `star` `palette`

These are the ones that carry the personality (navigation, meal slots, stat cards). The remaining icons — arrows, checkmarks, the gear, and so on — stay as built-in SVGs so the interface keeps working predictably.

### About large icon packs

A 300 MB folder of art is far more than a web app needs. Pick the handful you actually want, resize them to 128×128, and keep just those in the project — a full pack will make the site slow to load and awkward to sync. A folder of 16 icons at 128×128 is well under a megabyte.

---

## Theme file format

**Theme → Export** writes a file like this. You can hand-edit it and import it back.

```jsonc
{
  "id": "custom-abc123",
  "name": "My Halloween",
  "blurb": "One line shown on the theme card.",
  "mood": "dark",                    // "dark" or "light" — sets form controls & scrollbars
  "custom": true,
  "brand": {
    "name": "Cauldron",              // wordmark in the top bar
    "tag": "meals · shots · movement"
  },
  "decor": "bats",                   // bats | leaves | ghosts | sparkles | none
  "decorColor": "#0f0716",           // color of the floating shapes

  "iconAlias": {                     // swap one built-in glyph for another
    "pumpkin": "leaf"
  },
  "iconOverrides": {                 // or use your own image files
    "pumpkin": "themes/halloween/assets/pumpkin.png"
  },

  "tokens": {
    "--bg": "#17111f",
    "--bg-2": "#1f1729",
    "--bg-image": "radial-gradient(1200px 600px at 15% -10%, #3a2050 0%, transparent 60%)",
    "--surface": "#241a31",
    "--surface-2": "#2e2140",
    "--surface-3": "#3a2a4f",
    "--border": "#43315c",
    "--border-soft": "#372748",

    "--text": "#f6eeff",
    "--text-dim": "#b9a5cf",
    "--text-faint": "#8b78a3",

    "--primary": "#ff8a3d",
    "--primary-2": "#ff6b1a",
    "--primary-ink": "#2a1405",
    "--accent": "#a970ff",
    "--accent-ink": "#1b0f2e",

    "--good": "#79e04f",
    "--warn": "#ffcc4d",
    "--danger": "#ff5d73",
    "--info": "#62d8ff",

    "--radius": "14px",
    "--radius-lg": "22px",
    "--font-display": "\"Baloo 2\", ui-rounded, system-ui, sans-serif",
    "--font-body": "\"Nunito\", system-ui, sans-serif",
    "--decor-opacity": ".5"
  }
}
```

Any token you leave out falls back to the default in `css/tokens.css`, so a theme can be as small as a handful of colors.

### Tips for a theme that reads well

- **Keep `--primary-ink` readable on `--primary`.** It's the text color on filled buttons — pair a light ink with a saturated primary, or a dark ink with a pastel one.
- **Give the four surfaces real separation.** `--bg` → `--surface` → `--surface-2` → `--surface-3` is the depth stack; if they're too close, cards flatten out.
- **Set `mood` honestly.** It drives `color-scheme`, which controls native date pickers, dropdowns, and scrollbars.
- **`--decor-opacity: 0`** turns the ambient layer off while keeping the decor setting.

### Adding a permanent built-in theme

Themes made in the editor are saved with your data. To bake one into the app itself, add it to the `BUILTIN` object in `js/themes.js` — the exported JSON drops in almost as-is.

---

## Fonts

Six font stacks are offered in the editor: Baloo 2, Fredoka, Quicksand, Griffy, Nunito, and system. They're loaded from Google Fonts in `index.html`.

To use a different font, add it to the `<link>` in `index.html` and add an entry to the `FONTS` array in `js/themes.js`. Always keep a real fallback in the stack (`..., system-ui, sans-serif`) so the app still looks right offline.
