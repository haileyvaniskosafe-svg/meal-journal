/* ============================================================
   ICONS — hand-authored 24x24 stroke icons.
   Everything is currentColor, so icons inherit theme colors.

   THEME ASSET PACKS:
   A theme may declare `iconOverrides: { pumpkin: "themes/x/assets/pumpkin.png" }`.
   Any name present there renders as a background-image instead of the
   built-in SVG, so a downloaded icon pack can replace these one by one
   without touching this file. See themes/README.md.
   ============================================================ */
(function (global) {
  "use strict";

  var P = {
    /* --- ui --- */
    menu:      '<path d="M4 7h16M4 12h16M4 17h16"/>',
    plus:      '<path d="M12 5v14M5 12h14"/>',
    check:     '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
    x:         '<path d="M6 6l12 12M18 6 6 18"/>',
    edit:      '<path d="M12.5 5.5 18.5 11.5M4 20l1-5 11-11a2.1 2.1 0 0 1 3 3L8 19z"/>',
    trash:     '<path d="M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l1 13.5h9l1-13.5M10 10v7M14 10v7"/>',
    copy:      '<path d="M9 9h9.5a1.5 1.5 0 0 1 1.5 1.5V20a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 20v-9.5A1.5 1.5 0 0 1 9 9zM4.5 15A1.5 1.5 0 0 1 3 13.5V4A1.5 1.5 0 0 1 4.5 2.5H14A1.5 1.5 0 0 1 15.5 4v1"/>',
    download:  '<path d="M12 3.5v12M7 10.8l5 5 5-5M4 20.5h16"/>',
    upload:    '<path d="M12 16.5v-12M7 9.2l5-5 5 5M4 20.5h16"/>',
    left:      '<path d="M15 5 8 12l7 7"/>',
    right:     '<path d="M9 5l7 7-7 7"/>',
    down:      '<path d="M5 9l7 7 7-7"/>',
    up:        '<path d="M5 15l7-7 7 7"/>',
    gear:      '<circle cx="12" cy="12" r="3.2"/><path d="M19.2 14.8a1.6 1.6 0 0 0 .32 1.77l.06.05a1.9 1.9 0 1 1-2.7 2.7l-.05-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.96 1.47V20.6a1.9 1.9 0 1 1-3.8 0v-.09a1.6 1.6 0 0 0-1.03-1.47 1.6 1.6 0 0 0-1.77.32l-.05.06a1.9 1.9 0 1 1-2.7-2.7l.06-.05a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.96H3.4a1.9 1.9 0 1 1 0-3.8h.09A1.6 1.6 0 0 0 4.96 8.9a1.6 1.6 0 0 0-.32-1.77l-.06-.05a1.9 1.9 0 1 1 2.7-2.7l.05.06a1.6 1.6 0 0 0 1.77.32h.07a1.6 1.6 0 0 0 .96-1.47V3.4a1.9 1.9 0 1 1 3.8 0v.09a1.6 1.6 0 0 0 .96 1.47 1.6 1.6 0 0 0 1.77-.32l.05-.06a1.9 1.9 0 1 1 2.7 2.7l-.06.05a1.6 1.6 0 0 0-.32 1.77v.07a1.6 1.6 0 0 0 1.47.96h.17a1.9 1.9 0 1 1 0 3.8h-.09a1.6 1.6 0 0 0-1.47.96z"/>',
    search:    '<circle cx="10.8" cy="10.8" r="6.8"/><path d="M15.8 15.8 20.5 20.5"/>',
    info:      '<circle cx="12" cy="12" r="9"/><path d="M12 11.2v5.4M12 7.8h.01"/>',
    alert:     '<path d="M12 3.6 21.4 20H2.6zM12 10v4.2M12 17.2h.01"/>',
    refresh:   '<path d="M20.2 12a8.2 8.2 0 1 1-2.66-6.04M20.5 3.6V9.2h-5.6"/>',
    eye:       '<path d="M2.5 12S6 5.6 12 5.6 21.5 12 21.5 12 18 18.4 12 18.4 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.9"/>',
    lightning: '<path d="M13.2 2 4.6 13.6h6.1L10 22l8.9-11.7h-6.2z"/>',
    clock:     '<circle cx="12" cy="12" r="9"/><path d="M12 6.9v5.3l3.3 2"/>',
    calendar:  '<path d="M4.6 5.6h14.8A1.6 1.6 0 0 1 21 7.2v12.2a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 19.4V7.2a1.6 1.6 0 0 1 1.6-1.6zM3 10.2h18M8 3.4v4.2M16 3.4v4.2"/>',
    note:      '<path d="M8.4 4.6H6.6A1.6 1.6 0 0 0 5 6.2v13.6A1.6 1.6 0 0 0 6.6 21.4h10.8A1.6 1.6 0 0 0 19 19.8V6.2a1.6 1.6 0 0 0-1.6-1.6h-1.8M8.9 2.6h6.2a.9.9 0 0 1 .9.9v2a.9.9 0 0 1-.9.9H8.9a.9.9 0 0 1-.9-.9v-2a.9.9 0 0 1 .9-.9z"/>',
    book:      '<path d="M4.2 5A1.8 1.8 0 0 1 6 3.2h13.2v17.6H6A1.8 1.8 0 0 1 4.2 19zM4.2 17.4A1.8 1.8 0 0 1 6 15.6h13.2"/>',
    chart:     '<path d="M4 20.2V11M9.3 20.2V4.6M14.7 20.2v-6.6M20 20.2V8M2.8 21h18.4"/>',
    target:    '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
    palette:   '<path d="M12 21.4a9.4 9.4 0 1 1 0-18.8c5.2 0 9.4 3.6 9.4 8 0 2.5-2 4.2-4.5 4.2h-2a2.5 2.5 0 0 0-2.5 2.5c0 .6.2 1 .5 1.4.3.4.5.8.5 1.2 0 .9-.6 1.5-1.4 1.5z"/><circle cx="7.6" cy="11.2" r="1.1" fill="currentColor" stroke="none"/><circle cx="10.2" cy="7.2" r="1.1" fill="currentColor" stroke="none"/><circle cx="14.6" cy="7.2" r="1.1" fill="currentColor" stroke="none"/><circle cx="17.2" cy="11" r="1.1" fill="currentColor" stroke="none"/>',
    sparkle:   '<path d="M11 2.8 12.7 8l5.2 1.7-5.2 1.7L11 16.6 9.3 11.4 4.1 9.7 9.3 8z"/><path d="M18.4 15.4l.75 2.25 2.25.75-2.25.75-.75 2.25-.75-2.25-2.25-.75 2.25-.75z"/>',
    heart:     '<path d="M12 20.4 4.7 13.1a4.6 4.6 0 0 1 6.5-6.5l.8.8.8-.8a4.6 4.6 0 1 1 6.5 6.5z"/>',
    star:      '<path d="m12 3.3 2.72 5.5 6.08.89-4.4 4.28 1.04 6.05L12 17.15l-5.44 2.87 1.04-6.05-4.4-4.28 6.08-.89z"/>',

    /* --- halloween & fall --- */
    pumpkin:   '<path d="M12 5.4c-4.5 0-7.9 3.4-7.9 7.9s3.4 7.9 7.9 7.9 7.9-3.4 7.9-7.9-3.4-7.9-7.9-7.9z"/><path d="M9.2 6c-1.4 1.7-2 4.4-2 7.3s.6 5.6 2 7.3M14.8 6c1.4 1.7 2 4.4 2 7.3s-.6 5.6-2 7.3"/><path d="M12 5.4V3.7c0-.9.7-1.6 1.6-1.6"/>',
    ghost:     '<path d="M5.1 20.9V12a6.9 6.9 0 0 1 13.8 0v8.9l-2.3-1.8-2.3 1.8-2.3-1.8-2.3 1.8-2.3-1.8z"/><circle cx="9.7" cy="11.2" r="1" fill="currentColor" stroke="none"/><circle cx="14.3" cy="11.2" r="1" fill="currentColor" stroke="none"/><path d="M11 14.6c.6.5 1.4.5 2 0"/>',
    bat:       '<path d="M10.8 11.2C9.5 9 7 7.8 4.4 8.1c.7 1.1.5 2.5-.5 3.4 1.6.1 2.6 1 2.9 2.5 1-1.2 2.5-1.9 4.1-1.9M13.2 11.2C14.5 9 17 7.8 19.6 8.1c-.7 1.1-.5 2.5.5 3.4-1.6.1-2.6 1-2.9 2.5-1-1.2-2.5-1.9-4.1-1.9"/><path d="M12 11.9c-.7 0-1.3.6-1.3 1.3 0 1 .7 2 1.3 2.7.6-.7 1.3-1.7 1.3-2.7 0-.7-.6-1.3-1.3-1.3z"/><path d="M10.9 11.9 10.4 9.6M13.1 11.9l.5-2.3"/>',
    cauldron:  '<path d="M3.4 9.4h17.2M19.7 9.4c0 4.3-3.4 7.7-7.7 7.7s-7.7-3.4-7.7-7.7"/><path d="M8.4 16.6 7 19.6M15.6 16.6 17 19.6"/><circle cx="9.5" cy="6.2" r="1"/><circle cx="12.4" cy="4.4" r="1.3"/><circle cx="14.9" cy="6.6" r=".8"/>',
    potion:    '<path d="M9.2 2.8h5.6M10.2 2.8v5.5l-4.5 9.2A2.5 2.5 0 0 0 8 21.2h8a2.5 2.5 0 0 0 2.3-3.7l-4.5-9.2V2.8"/><path d="M6.6 15.4h10.8"/><circle cx="10.6" cy="17.8" r=".8" fill="currentColor" stroke="none"/><circle cx="13.6" cy="18.8" r=".55" fill="currentColor" stroke="none"/>',
    syringe:   '<path d="M12 2.2v3.1M9.2 5.3h5.6M10.2 5.3v11.2h3.6V5.3M10.2 8.4h2M10.2 10.9h2M10.2 13.4h2M12 16.5v5.3"/>',
    candy:     '<circle cx="12" cy="12" r="3.6"/><path d="M8.6 10.5 4.8 8.6v6.8l3.8-1.9M15.4 10.5l3.8-1.9v6.8l-3.8-1.9"/>',
    candycorn: '<path d="M12 2.8 15.4 21H8.6z"/><path d="M9.7 9.2h4.6M9.1 15.2h5.8"/>',
    cat:       '<path d="M12 7.4c-3.6 0-6.5 2.6-6.5 5.9S8.4 19.2 12 19.2s6.5-2.6 6.5-5.9S15.6 7.4 12 7.4z"/><path d="M6.7 9.3 5.5 4.8l3.9 2.3M17.3 9.3l1.2-4.5-3.9 2.3"/><path d="M9.8 12.8v1.1M14.2 12.8v1.1M11 16.2c.6.4 1.4.4 2 0"/><path d="M3.9 13.6h2.2M17.9 13.6h2.2"/>',
    spider:    '<circle cx="12" cy="13.4" r="3"/><circle cx="12" cy="9.4" r="1.6"/><path d="M12 7.8V2.4"/><path d="M9.3 12 6 9.8M9.1 14.2 5.4 14.7M9.7 16.3 6.7 18.8M14.7 12 18 9.8M14.9 14.2l3.7.5M14.3 16.3l3 2.5"/>',
    web:       '<path d="M12 2.6v18.8M2.6 12h18.8M5.2 5.2l13.6 13.6M18.8 5.2 5.2 18.8"/><path d="M12 6.4 8 12l4 5.6 4-5.6zM12 2.9 4.6 12 12 21.1 19.4 12z"/>',
    tomb:      '<path d="M6 21V9.4a6 6 0 0 1 12 0V21M3.6 21h16.8M9.6 11.6h4.8M12 11.6v5"/>',
    leaf:      '<path d="M3.8 20.2C3.8 11.6 9.9 4.9 20.2 3.8c1 9.8-4.2 16.4-16.4 16.4z"/><path d="m3.8 20.2 9.7-9.7M9.5 14.8l-.4-4.2M13.2 11.1l4.2-.5"/>',
    drop:      '<path d="M12 3.2s6.1 6.5 6.1 10.4a6.1 6.1 0 0 1-12.2 0C5.9 9.7 12 3.2 12 3.2z"/><path d="M9.3 14.2a2.7 2.7 0 0 0 2.7 2.7"/>',
    flame:     '<path d="M12 21.8c3.9 0 6.6-2.6 6.6-6.1 0-4.7-4.7-6.7-4.1-11.6-2.7 1.2-4.1 3.7-4.1 5.9 0 1.4-.8 2.1-1.6 2.1-1.1 0-1.8-.9-1.8-2.3-1.3 2.1-1.7 3.8-1.7 6 0 3.5 2.8 6 6.7 6z"/>',
    moon:      '<path d="M20.6 14.4A8.6 8.6 0 1 1 9.6 3.4a6.7 6.7 0 0 0 11 11z"/><path d="M17.4 3.2l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z"/>',
    corn:      '<path d="M12 2.6c3.2 2 4.8 5.2 4.8 9.4S15.2 19.6 12 21.4C8.8 19.6 7.2 16.2 7.2 12S8.8 4.6 12 2.6z"/><path d="M12 3.4v17.6M9.3 6.4c1.6.9 3.8.9 5.4 0M8.4 10.4c2.2 1.1 5 1.1 7.2 0M8.4 14.4c2.2 1.1 5 1.1 7.2 0M9.3 18c1.6.9 3.8.9 5.4 0"/>',

    /* --- food & body --- */
    bowl:      '<path d="M3.4 11.2h17.2a8.6 8.6 0 0 1-17.2 0z"/><path d="M7 19.8h10"/><path d="M9 7.6c0-1 1-1.4 1-2.4M12 7c0-1.2 1.2-1.6 1.2-2.8M15 7.6c0-1 1-1.4 1-2.4"/>',
    mug:       '<path d="M4.6 8.2h11v6.9a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4z"/><path d="M15.6 10.2h1.8a2.6 2.6 0 0 1 0 5.2h-1.8"/><path d="M7.6 5.4c0-.9.9-1.2.9-2.1M11 5.4c0-.9.9-1.2.9-2.1"/>',
    apple:     '<path d="M12 7.6c-1-1.4-2.6-2-4.1-1.6C5.9 6.6 4.9 8.6 4.9 11.2c0 4 2.7 8 4.9 8 .9 0 1.4-.5 2.2-.5s1.3.5 2.2.5c2.2 0 4.9-4 4.9-8 0-2.6-1-4.6-3-5.2-1.5-.4-3.1.2-4.1 1.6z"/><path d="M12 7.6V5.2c0-1.3 1-2.4 2.4-2.5"/>',
    utensils:  '<path d="M7.6 3.2v6.2a2.1 2.1 0 0 1-4.2 0V3.2M5.5 11.5v9.3M17.6 3.2c1.5 2 2 4.6 1.5 7.6-.2 1.2-.8 1.5-1.5 1.5v8.5"/>',
    scale:     '<path d="M4.6 6.6h14.8A1.6 1.6 0 0 1 21 8.2v7.6a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 15.8V8.2a1.6 1.6 0 0 1 1.6-1.6z"/><path d="M9.2 10.4h5.6v3.2H9.2zM6.4 9.2v5.6M17.6 9.2v5.6"/>',
    run:       '<circle cx="14" cy="4.6" r="2"/><path d="M14.9 8.2 11 10.5l-.6 3.8 2.7 2.3.4 4.6M12.5 14 8.5 15.3l-2.3 3.8M14.9 8.2l3.4 1.3 1.4 3.1"/>',
    body:      '<path d="M12 5.4a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z"/><path d="M12 6.6c-2.4 0-4 1.4-4 3.6v4.2h1.6l.6 8h3.6l.6-8H16v-4.2c0-2.2-1.6-3.6-4-3.6z"/>',
  };

  var Icons = {
    /** Raw SVG markup for a named icon (empty string when unknown). */
    svg: function (name, cls) {
      var body = P[name];
      if (!body) return "";
      return '<svg viewBox="0 0 24 24" class="' + (cls || "") + '" aria-hidden="true">' + body + "</svg>";
    },

    /** Inline <span class="ico"> markup, ready to drop into a template. */
    tag: function (name, extraClass) {
      return '<span class="ico ' + (extraClass || "") + '" data-icon="' + name + '"></span>';
    },

    names: function () { return Object.keys(P); },
    has: function (name) { return Object.prototype.hasOwnProperty.call(P, name); },

    /** Register or replace an icon at runtime (used by theme packs). */
    register: function (name, markup) { P[name] = markup; },

    /**
     * Fill every [data-icon] under `root` that has not been rendered yet.
     * If the active theme maps the name to an image file, use that instead.
     */
    hydrate: function (root) {
      var scope = root || document;
      var overrides = (global.Themes && global.Themes.iconOverrides()) || {};
      var nodes = scope.querySelectorAll("[data-icon]");
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        var requested = el.getAttribute("data-icon");
        // a theme may alias one semantic slot onto a different glyph
        var name = (global.Themes && global.Themes.resolveIcon(requested)) || requested;
        if (el.getAttribute("data-icon-done") === name) continue;

        if (overrides[name]) {
          el.classList.add("img");
          el.style.backgroundImage = 'url("' + overrides[name] + '")';
          el.innerHTML = "";
        } else {
          el.classList.remove("img");
          el.style.backgroundImage = "";
          el.innerHTML = Icons.svg(name);
        }
        el.setAttribute("data-icon-done", name);
      }
    },

    /** Force re-hydration (after a theme switch changes overrides). */
    invalidate: function (root) {
      var scope = root || document;
      var nodes = scope.querySelectorAll("[data-icon-done]");
      for (var i = 0; i < nodes.length; i++) nodes[i].removeAttribute("data-icon-done");
      Icons.hydrate(scope);
    },
  };

  global.Icons = Icons;
})(window);
