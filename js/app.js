/* ============================================================
   APP — hash router, nav wiring, boot.
   ============================================================ */
(function (global) {
  "use strict";

  var ROUTES = ["today", "meals", "shots", "move", "progress", "theme", "settings"];
  var current = null;
  var panes = {};     // one isolated container per view
  var viewEl = null;

  function routeFromHash() {
    var h = (location.hash || "").replace(/^#\/?/, "").split("?")[0];
    return ROUTES.indexOf(h) >= 0 ? h : "today";
  }

  /**
   * Each view gets its own container. Views attach delegated listeners to
   * that container once, so two views can both use data-act="edit" without
   * one firing the other's handler.
   */
  function paneFor(name) {
    if (panes[name]) return panes[name];
    var pane = document.createElement("div");
    pane.className = "pane";
    pane.setAttribute("data-pane", name);
    viewEl.appendChild(pane);
    panes[name] = pane;
    Views[name].mount(pane);
    return pane;
  }

  function render() {
    var name = routeFromHash();

    // leaving the theme editor mid-edit reverts the live preview
    if (current === "theme" && name !== "theme" && Views.theme.isEditing()) {
      Views.theme.abandon();
    }

    var view = Views[name];
    if (!view) return;

    var changing = current !== name;
    current = name;

    var pane = paneFor(name);
    Object.keys(panes).forEach(function (k) { panes[k].hidden = k !== name; });

    pane.innerHTML = view.render();
    Icons.hydrate(pane);

    // reflect the route in both navs
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      if (a.dataset.nav === name) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    if (changing) {
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
      closeNav();
    }
  }

  /** Re-render the current view in place. */
  function refresh() { render(); }

  /* ---------- mobile nav ---------- */
  function closeNav() {
    var nav = document.getElementById("sidenav");
    var btn = document.getElementById("navToggle");
    if (nav) nav.classList.remove("open");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }
  function toggleNav() {
    var nav = document.getElementById("sidenav");
    var btn = document.getElementById("navToggle");
    var open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  }

  /* ---------- boot ---------- */
  function boot() {
    viewEl = document.getElementById("view");

    Store.load();
    Themes.init();
    Icons.hydrate(document);

    // A magic link returns as #access_token=... — consume it before the
    // hash router tries to read it as a route.
    Sync.init();

    if (!location.hash) location.replace("#/today");
    render();

    window.addEventListener("hashchange", render);

    // any data change re-renders the current view
    Store.subscribe(function () { render(); });

    document.getElementById("navToggle").addEventListener("click", toggleNav);

    // cycle themes from the topbar
    document.getElementById("quickThemeBtn").addEventListener("click", function () {
      if (current === "theme" && Views.theme.isEditing()) {
        UI.toast("Finish editing first", "alert");
        return;
      }
      var list = Themes.list();
      var i = list.findIndex(function (t) { return t.id === Store.settings.themeId; });
      var next = list[(i + 1) % list.length];
      Themes.setActive(next.id);
      render();
      UI.toast(next.name, "palette");
    });

    // close the drawer when tapping the page behind it
    document.addEventListener("click", function (e) {
      var nav = document.getElementById("sidenav");
      if (!nav.classList.contains("open")) return;
      if (nav.contains(e.target) || e.target.closest("#navToggle")) return;
      closeNav();
    });

    // keyboard shortcuts: 1-7 jump between sections
    document.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (!document.getElementById("modalRoot").hidden) return;
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= ROUTES.length) location.hash = "#/" + ROUTES[n - 1];
    });

    // a session that spans midnight should roll over to the new day
    var day = Store.D.today();
    setInterval(function () {
      var now = Store.D.today();
      if (now !== day) { day = now; render(); }
    }, 60000);
  }

  global.App = { refresh: refresh, boot: boot, get route() { return current; } };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
