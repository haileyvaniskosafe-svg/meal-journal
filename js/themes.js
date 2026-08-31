/* ============================================================
   THEMES — the skinning engine.

   A theme is plain JSON. Applying one writes CSS custom properties
   onto :root, so every component re-skins with no re-render.

   theme = {
     id, name, blurb, mood: "dark"|"light",
     brand: { name, tag },
     decor: "bats"|"leaves"|"ghosts"|"sparkles"|"none",
     decorColor: "#hex",
     tokens: { "--primary": "#ff8a3d", ... },
     iconAlias: { pumpkin: "leaf" },          // swap built-in glyphs
     iconOverrides: { pumpkin: "path.png" }   // use image files instead
   }

   Custom themes are stored alongside the user's data and can be
   exported/imported as a single .json file.
   ============================================================ */
(function (global) {
  "use strict";

  /* ---------- font stacks offered in the editor ---------- */
  var FONTS = [
    { id: "baloo",    label: "Baloo 2 — chunky + friendly", stack: '"Baloo 2", ui-rounded, system-ui, sans-serif' },
    { id: "fredoka",  label: "Fredoka — round + modern",    stack: '"Fredoka", ui-rounded, system-ui, sans-serif' },
    { id: "quicksand",label: "Quicksand — soft + airy",     stack: '"Quicksand", ui-rounded, system-ui, sans-serif' },
    { id: "griffy",   label: "Griffy — witchy + whimsical", stack: '"Griffy", "Baloo 2", cursive, system-ui' },
    { id: "nunito",   label: "Nunito — clean + readable",   stack: '"Nunito", system-ui, sans-serif' },
    { id: "system",   label: "System — fastest",            stack: 'ui-rounded, system-ui, -apple-system, "Segoe UI", sans-serif' },
  ];

  /* ---------- what the theme editor exposes ---------- */
  var EDITABLE = [
    {
      group: "Brand colors",
      hint: "The two colors that carry the whole mood.",
      fields: [
        { key: "--primary",     label: "Primary",       type: "color" },
        { key: "--primary-2",   label: "Primary deep",  type: "color" },
        { key: "--primary-ink", label: "Text on primary", type: "color" },
        { key: "--accent",      label: "Accent",        type: "color" },
        { key: "--accent-ink",  label: "Text on accent", type: "color" },
      ],
    },
    {
      group: "Surfaces",
      hint: "Page background through to card backgrounds.",
      fields: [
        { key: "--bg",          label: "Page",        type: "color" },
        { key: "--bg-2",        label: "Page deep",   type: "color" },
        { key: "--surface",     label: "Card",        type: "color" },
        { key: "--surface-2",   label: "Card inset",  type: "color" },
        { key: "--surface-3",   label: "Card raised", type: "color" },
        { key: "--border",      label: "Border",      type: "color" },
        { key: "--border-soft", label: "Border soft", type: "color" },
      ],
    },
    {
      group: "Text",
      fields: [
        { key: "--text",       label: "Primary",   type: "color" },
        { key: "--text-dim",   label: "Secondary", type: "color" },
        { key: "--text-faint", label: "Muted",     type: "color" },
      ],
    },
    {
      group: "Status",
      fields: [
        { key: "--good",   label: "Good",    type: "color" },
        { key: "--warn",   label: "Warning", type: "color" },
        { key: "--danger", label: "Danger",  type: "color" },
        { key: "--info",   label: "Info",    type: "color" },
      ],
    },
    {
      group: "Shape & type",
      fields: [
        { key: "--radius",    label: "Corner radius",  type: "range", min: 0, max: 26, step: 1, unit: "px" },
        { key: "--radius-lg", label: "Card radius",    type: "range", min: 0, max: 34, step: 1, unit: "px" },
        { key: "--font-display", label: "Heading font", type: "font" },
        { key: "--font-body",    label: "Body font",    type: "font" },
      ],
    },
  ];

  /* ---------- built-in themes ---------- */
  var BUILTIN = {

    halloween: {
      id: "halloween",
      name: "Haunted Hollow",
      blurb: "Pumpkin orange on deep plum, with bats.",
      mood: "dark",
      brand: { name: "Cauldron", tag: "meals · shots · movement" },
      decor: "bats",
      decorColor: "#0f0716",
      tokens: {
        "--bg": "#17111f",
        "--bg-2": "#1f1729",
        "--bg-image":
          "radial-gradient(1200px 600px at 15% -10%, #3a2050 0%, transparent 60%)," +
          "radial-gradient(900px 500px at 110% 10%, #2a1840 0%, transparent 55%)",
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
        "--good-ink": "#10250a",
        "--warn": "#ffcc4d",
        "--danger": "#ff5d73",
        "--info": "#62d8ff",
        "--radius": "14px",
        "--radius-lg": "22px",
        "--font-display": '"Baloo 2", ui-rounded, system-ui, sans-serif',
        "--font-body": '"Nunito", system-ui, sans-serif',
        "--decor-opacity": ".5",
      },
    },

    witching: {
      id: "witching",
      name: "Witching Hour",
      blurb: "Near-black with poison green and a floating ghost.",
      mood: "dark",
      brand: { name: "Cauldron", tag: "brew · track · thrive" },
      decor: "ghosts",
      decorColor: "#d9ffe4",
      iconAlias: { pumpkin: "cauldron", bat: "spider", moon: "moon" },
      tokens: {
        "--bg": "#0b0f0d",
        "--bg-2": "#111713",
        "--bg-image":
          "radial-gradient(900px 520px at 80% -8%, #16321f 0%, transparent 62%)," +
          "radial-gradient(700px 480px at -10% 30%, #1b1030 0%, transparent 58%)",
        "--surface": "#151d18",
        "--surface-2": "#1c261f",
        "--surface-3": "#26332a",
        "--border": "#31463a",
        "--border-soft": "#25352b",
        "--text": "#eafff0",
        "--text-dim": "#9dc0aa",
        "--text-faint": "#6e8a79",
        "--primary": "#8bff6b",
        "--primary-2": "#4fe23c",
        "--primary-ink": "#082209",
        "--accent": "#c07bff",
        "--accent-ink": "#1a0b2b",
        "--good": "#6bffb0",
        "--good-ink": "#052117",
        "--warn": "#ffd84d",
        "--danger": "#ff6b8a",
        "--info": "#6bd5ff",
        "--radius": "10px",
        "--radius-lg": "16px",
        "--font-display": '"Griffy", "Baloo 2", cursive, system-ui',
        "--font-body": '"Nunito", system-ui, sans-serif',
        "--decor-opacity": ".4",
      },
    },

    harvest: {
      id: "harvest",
      name: "Harvest Cottage",
      blurb: "Warm cream and burnt orange, with drifting leaves.",
      mood: "light",
      brand: { name: "Harvest", tag: "cozy daily tracking" },
      decor: "leaves",
      decorColor: "#c2622a",
      iconAlias: { pumpkin: "leaf", bat: "run", moon: "mug", potion: "syringe" },
      tokens: {
        "--bg": "#fdf6ec",
        "--bg-2": "#f6ead9",
        "--bg-image":
          "radial-gradient(900px 520px at 10% -10%, #ffe6c6 0%, transparent 60%)," +
          "radial-gradient(800px 480px at 105% 8%, #ffdfd0 0%, transparent 58%)",
        "--surface": "#fffaf3",
        "--surface-2": "#f7ecdd",
        "--surface-3": "#eeddc7",
        "--border": "#dcc4a6",
        "--border-soft": "#ecdcc7",
        "--text": "#3c2a1c",
        "--text-dim": "#7a6350",
        "--text-faint": "#a08b76",
        "--primary": "#d2601a",
        "--primary-2": "#b34d12",
        "--primary-ink": "#fff6ee",
        "--accent": "#7a8b45",
        "--accent-ink": "#fbfff0",
        "--good": "#4f8a3d",
        "--good-ink": "#f2fff0",
        "--warn": "#c98a10",
        "--danger": "#c2413f",
        "--info": "#3d7f96",
        "--radius": "16px",
        "--radius-lg": "24px",
        "--font-display": '"Fredoka", ui-rounded, system-ui, sans-serif',
        "--font-body": '"Nunito", system-ui, sans-serif',
        "--decor-opacity": ".45",
        "--shadow": "0 2px 4px rgba(120,80,40,.08), 0 10px 28px rgba(120,80,40,.12)",
        "--shadow-sm": "0 1px 2px rgba(120,80,40,.08), 0 3px 10px rgba(120,80,40,.08)",
      },
    },

    pastelboo: {
      id: "pastelboo",
      name: "Pastel Boo",
      blurb: "Soft lilac and candy pink. Spooky, but make it cute.",
      mood: "light",
      brand: { name: "Boo", tag: "gentle daily tracking" },
      decor: "ghosts",
      decorColor: "#b9a4e8",
      iconAlias: { pumpkin: "candy", bat: "heart", moon: "sparkle", potion: "potion" },
      tokens: {
        "--bg": "#fbf7ff",
        "--bg-2": "#f4ecff",
        "--bg-image":
          "radial-gradient(900px 520px at 12% -10%, #efe2ff 0%, transparent 62%)," +
          "radial-gradient(820px 480px at 104% 6%, #ffe4f2 0%, transparent 58%)",
        "--surface": "#ffffff",
        "--surface-2": "#f6f0ff",
        "--surface-3": "#ebe0fb",
        "--border": "#d9c9f2",
        "--border-soft": "#eae0f8",
        "--text": "#3a2d4f",
        "--text-dim": "#7c6d95",
        "--text-faint": "#a397b8",
        "--primary": "#ff7fb4",
        "--primary-2": "#f2609c",
        "--primary-ink": "#54132f",
        "--accent": "#9a7ff0",
        "--accent-ink": "#1f1440",
        "--good": "#59c39a",
        "--good-ink": "#06291d",
        "--warn": "#e8a83c",
        "--danger": "#f2637a",
        "--info": "#63b8e8",
        "--radius": "18px",
        "--radius-lg": "26px",
        "--font-display": '"Quicksand", ui-rounded, system-ui, sans-serif',
        "--font-body": '"Nunito", system-ui, sans-serif',
        "--decor-opacity": ".5",
        "--shadow": "0 2px 4px rgba(120,90,170,.08), 0 10px 28px rgba(120,90,170,.14)",
        "--shadow-sm": "0 1px 2px rgba(120,90,170,.07), 0 3px 10px rgba(120,90,170,.09)",
      },
    },

    noir: {
      id: "noir",
      name: "Midnight Noir",
      blurb: "Quiet greyscale with one amber spark. No distractions.",
      mood: "dark",
      brand: { name: "Cauldron", tag: "meals · shots · movement" },
      decor: "none",
      decorColor: "#ffffff",
      tokens: {
        "--bg": "#0e0e10",
        "--bg-2": "#151517",
        "--bg-image": "none",
        "--surface": "#171719",
        "--surface-2": "#1e1e21",
        "--surface-3": "#28282c",
        "--border": "#34343a",
        "--border-soft": "#26262a",
        "--text": "#f2f2f4",
        "--text-dim": "#a6a6ae",
        "--text-faint": "#77777f",
        "--primary": "#ffb340",
        "--primary-2": "#f09a1e",
        "--primary-ink": "#231604",
        "--accent": "#7f8fa6",
        "--accent-ink": "#0d1116",
        "--good": "#5fd18a",
        "--good-ink": "#062015",
        "--warn": "#e8c04a",
        "--danger": "#f2666f",
        "--info": "#63b3e8",
        "--radius": "8px",
        "--radius-lg": "12px",
        "--font-display": '"Nunito", system-ui, sans-serif',
        "--font-body": '"Nunito", system-ui, sans-serif',
        "--decor-opacity": "0",
      },
    },
  };

  /* ---------- decor sprites ---------- */
  var SPRITES = {
    bat: '<svg viewBox="0 0 64 40"><g fill="currentColor">' +
         '<path class="wing-l" d="M30 20C24 10 14 5 3 7c3 5 2 11-2 15 7 0 12 4 14 11 4-6 9-10 15-11z"/>' +
         '<path class="wing-r" d="M34 20C40 10 50 5 61 7c-3 5-2 11 2 15-7 0-12 4-14 11-4-6-9-10-15-11z"/>' +
         '<path d="M32 16c-3 0-5 2-5 5 0 4 3 8 5 11 2-3 5-7 5-11 0-3-2-5-5-5z"/>' +
         '<path d="M28.5 16.5 27 10l4 4h2l4-4-1.5 6.5z"/></g></svg>',
    leaf: '<svg viewBox="0 0 32 32"><path fill="currentColor" d="M4 28C4 15 12 5 28 3c1 15-7 25-24 25z"/>' +
          '<path fill="none" stroke="rgba(0,0,0,.22)" stroke-width="1.6" d="M4 28 21 11"/></svg>',
    ghost: '<svg viewBox="0 0 40 48"><path fill="currentColor" d="M5 46V20a15 15 0 0 1 30 0v26l-5-4-5 4-5-4-5 4z"/>' +
           '<g fill="rgba(0,0,0,.45)"><circle cx="14" cy="19" r="2.6"/><circle cx="26" cy="19" r="2.6"/>' +
           '<ellipse cx="20" cy="26.5" rx="3" ry="2.2"/></g></svg>',
    sparkle: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z"/></svg>',
  };

  var DECOR_PLANS = {
    bats:     { sprite: "bat",     count: 7,  size: [34, 74],  build: buildBat },
    leaves:   { sprite: "leaf",    count: 14, size: [14, 30],  build: buildLeaf },
    ghosts:   { sprite: "ghost",   count: 5,  size: [30, 68],  build: buildGhost },
    sparkles: { sprite: "sparkle", count: 18, size: [7, 18],   build: buildSparkle },
  };

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function buildBat(el, i, n) {
    el.style.setProperty("--y", rnd(8, 78).toFixed(1) + "vh");
    el.style.setProperty("--s", rnd(0.55, 1).toFixed(2));
    el.style.setProperty("--t", rnd(22, 44).toFixed(1) + "s");
    el.style.setProperty("--d", (-rnd(0, 40)).toFixed(1) + "s");
  }
  function buildLeaf(el) {
    el.style.setProperty("--x", rnd(-2, 98).toFixed(1) + "vw");
    el.style.setProperty("--sway", rnd(-14, 14).toFixed(1) + "vw");
    el.style.setProperty("--t", rnd(13, 30).toFixed(1) + "s");
    el.style.setProperty("--d", (-rnd(0, 30)).toFixed(1) + "s");
  }
  function buildGhost(el) {
    el.style.setProperty("--x", rnd(4, 90).toFixed(1) + "vw");
    el.style.setProperty("--y", rnd(12, 78).toFixed(1) + "vh");
    el.style.setProperty("--s", rnd(0.6, 1.15).toFixed(2));
    el.style.setProperty("--t", rnd(7, 14).toFixed(1) + "s");
    el.style.setProperty("--d", (-rnd(0, 10)).toFixed(1) + "s");
  }
  function buildSparkle(el) {
    el.style.setProperty("--x", rnd(2, 96).toFixed(1) + "vw");
    el.style.setProperty("--y", rnd(6, 92).toFixed(1) + "vh");
    el.style.setProperty("--t", rnd(3, 7).toFixed(1) + "s");
    el.style.setProperty("--d", (-rnd(0, 7)).toFixed(1) + "s");
  }

  /* ---------- engine ---------- */
  var active = BUILTIN.halloween;

  function customs() {
    return (global.Store && Store.state.customThemes) || {};
  }

  function list() {
    var out = [];
    Object.keys(BUILTIN).forEach(function (k) { out.push(BUILTIN[k]); });
    var c = customs();
    Object.keys(c).forEach(function (k) { out.push(c[k]); });
    return out;
  }

  function get(id) {
    return BUILTIN[id] || customs()[id] || BUILTIN.halloween;
  }

  function isBuiltin(id) { return !!BUILTIN[id]; }

  /** Deep-ish clone so edits never mutate a built-in definition. */
  function clone(t) { return JSON.parse(JSON.stringify(t)); }

  function apply(theme, opts) {
    active = theme;
    var root = document.documentElement;

    // 1. tokens
    var tokens = theme.tokens || {};
    Object.keys(tokens).forEach(function (k) { root.style.setProperty(k, tokens[k]); });

    // 2. flags
    root.setAttribute("data-theme", theme.id);
    root.setAttribute("data-mood", theme.mood || "dark");
    root.style.colorScheme = theme.mood === "light" ? "light" : "dark";

    var decor = (global.Store && Store.settings.decor) || theme.decor || "none";
    root.setAttribute("data-decor", decor);
    root.style.setProperty("--decor-color", theme.decorColor || tokens["--accent"] || "#fff");

    // 3. ambient layer
    renderDecor(decor);

    // 4. brand wordmark
    var b = theme.brand || {};
    var nameEl = document.getElementById("brandName");
    var tagEl = document.getElementById("brandTag");
    if (nameEl) nameEl.textContent = b.name || "Cauldron";
    if (tagEl) tagEl.textContent = b.tag || "meals · shots · movement";
    document.title = (b.name || "Cauldron") + " — meals, shots & movement";

    // 5. icons may have been aliased or overridden
    if (global.Icons && !(opts && opts.skipIcons)) Icons.invalidate(document);
  }

  function renderDecor(kind) {
    var layer = document.getElementById("decorLayer");
    if (!layer) return;
    layer.innerHTML = "";
    var plan = DECOR_PLANS[kind];
    if (!plan) return;

    var frag = document.createDocumentFragment();
    for (var i = 0; i < plan.count; i++) {
      var el = document.createElement("div");
      el.className = "decor-item " + plan.sprite;
      var px = rnd(plan.size[0], plan.size[1]);
      el.style.width = px.toFixed(0) + "px";
      el.style.height = "auto";
      el.innerHTML = SPRITES[plan.sprite];
      plan.build(el, i, plan.count);
      frag.appendChild(el);
    }
    layer.appendChild(frag);
  }

  function setActive(id) {
    var t = get(id);
    if (global.Store) Store.set("settings.themeId", t.id);
    apply(t);
    return t;
  }

  /* ---------- editing ---------- */

  /** A blank editable copy of any theme, ready to save as custom. */
  function draftFrom(id, newName) {
    var src = clone(get(id));
    src.id = "custom-" + (global.Store ? Store.uid() : Date.now().toString(36));
    src.name = newName || (src.name + " (copy)");
    src.custom = true;
    src.basedOn = id;
    return src;
  }

  function saveCustom(theme) {
    if (!global.Store) return;
    theme.custom = true;
    if (!theme.id || BUILTIN[theme.id]) theme.id = "custom-" + Store.uid();
    Store.state.customThemes[theme.id] = clone(theme);
    Store.commit();
    return theme;
  }

  function deleteCustom(id) {
    if (!global.Store || BUILTIN[id]) return false;
    delete Store.state.customThemes[id];
    if (Store.settings.themeId === id) Store.set("settings.themeId", "halloween");
    Store.commit();
    setActive(Store.settings.themeId);
    return true;
  }

  function exportTheme(theme) { return JSON.stringify(theme, null, 2); }

  function importTheme(text) {
    var t = JSON.parse(text);
    if (!t || !t.tokens) throw new Error("That file isn't a theme (no tokens).");
    t.id = "custom-" + (global.Store ? Store.uid() : Date.now().toString(36));
    t.custom = true;
    t.name = t.name || "Imported theme";
    t.mood = t.mood === "light" ? "light" : "dark";
    return saveCustom(t);
  }

  /** Effective value of a token for the active/edited theme. */
  function tokenValue(theme, key) {
    if (theme.tokens && theme.tokens[key] != null) return theme.tokens[key];
    return getComputedStyle(document.documentElement).getPropertyValue(key).trim();
  }

  /* ---------- icon integration ---------- */
  function iconOverrides() { return (active && active.iconOverrides) || {}; }
  function resolveIcon(name) {
    var alias = active && active.iconAlias;
    return (alias && alias[name]) || name;
  }

  function init() {
    var id = (global.Store && Store.settings.themeId) || "halloween";
    apply(get(id), { skipIcons: true });
  }

  global.Themes = {
    FONTS: FONTS,
    EDITABLE: EDITABLE,
    BUILTIN: BUILTIN,
    DECOR_KINDS: ["bats", "leaves", "ghosts", "sparkles", "none"],

    init: init,
    list: list,
    get: get,
    get active() { return active; },
    isBuiltin: isBuiltin,
    apply: apply,
    setActive: setActive,
    renderDecor: renderDecor,
    clone: clone,
    draftFrom: draftFrom,
    saveCustom: saveCustom,
    deleteCustom: deleteCustom,
    exportTheme: exportTheme,
    importTheme: importTheme,
    tokenValue: tokenValue,
    iconOverrides: iconOverrides,
    resolveIcon: resolveIcon,
  };
})(window);
