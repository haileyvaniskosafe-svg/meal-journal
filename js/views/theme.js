/* ============================================================
   THEME — pick a theme, or edit every token live.
   Edits apply to :root as you type, so the whole app previews
   in real time. Save creates a custom theme you own.
   ============================================================ */
(function (global) {
  "use strict";
  var Views = (global.Views = global.Views || {});

  var draft = null;      // theme being edited, or null
  var dirty = false;

  /* icon slots worth remapping to an image asset pack */
  var ASSET_SLOTS = [
    "pumpkin", "potion", "bat", "moon", "cauldron", "ghost",
    "mug", "bowl", "utensils", "apple", "drop", "run",
    "scale", "flame", "star", "palette",
  ];

  /* ---------- color helpers ---------- */
  function normHex(v) {
    if (!v) return "#000000";
    v = String(v).trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(v)) {
      return "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    }
    // resolve any other CSS color (named, rgb(), color-mix…) through the browser
    try {
      var probe = document.createElement("span");
      probe.style.color = v;
      probe.style.display = "none";
      document.body.appendChild(probe);
      var rgb = getComputedStyle(probe).color;
      probe.remove();
      var m = rgb.match(/(\d+(?:\.\d+)?)/g);
      if (m && m.length >= 3) {
        return "#" + m.slice(0, 3).map(function (n) {
          return ("0" + Math.round(+n).toString(16)).slice(-2);
        }).join("");
      }
    } catch (e) { /* fall through */ }
    return "#000000";
  }

  function px(v) { return parseInt(String(v), 10) || 0; }

  /* ---------- editing lifecycle ---------- */
  function startEdit(id) {
    var src = Themes.get(id);
    draft = Themes.isBuiltin(id)
      ? Themes.draftFrom(id, src.name + " (mine)")
      : Themes.clone(src);
    dirty = false;
    Themes.apply(draft);
    App.refresh();
  }

  function stopEdit(revert) {
    draft = null;
    dirty = false;
    if (revert) Themes.apply(Themes.get(Store.settings.themeId));
    App.refresh();
  }

  function setToken(key, value) {
    if (!draft) return;
    draft.tokens[key] = value;
    document.documentElement.style.setProperty(key, value);
    dirty = true;
    updateSaveBar();
  }

  function updateSaveBar() {
    var bar = document.querySelector("[data-savebar]");
    if (bar) bar.classList.toggle("dirty", dirty);
    var lbl = document.querySelector("[data-dirtylabel]");
    if (lbl) lbl.textContent = dirty ? "Unsaved changes" : "No changes yet";
  }

  function saveDraft() {
    if (!draft) return;
    Themes.saveCustom(draft);
    Store.set("settings.themeId", draft.id);
    Themes.apply(draft);
    dirty = false;
    var saved = draft.name;
    draft = null;
    App.refresh();
    UI.toast('Saved "' + saved + '"', "check");
  }

  /* ---------- gallery ---------- */
  function themeCard(t) {
    var on = Store.settings.themeId === t.id && !draft;
    var k = t.tokens;
    return (
      '<button class="themecard" data-act="use" data-id="' + t.id + '" aria-pressed="' + on + '">' +
        '<div class="themeswatch" style="background:' + UI.attr(k["--bg"]) +
          ";background-image:" + UI.attr(k["--bg-image"] || "none") + '">' +
          '<i style="background:' + UI.attr(k["--primary"]) + '"></i>' +
          '<i style="background:' + UI.attr(k["--accent"]) + '"></i>' +
          '<i style="background:' + UI.attr(k["--surface"]) + '"></i>' +
          '<i style="background:' + UI.attr(k["--good"]) + '"></i>' +
        "</div>" +
        '<div class="themecard-body">' +
          "<b>" + UI.esc(t.name) + "</b>" +
          "<span>" + UI.esc(t.blurb || "") + "</span>" +
          '<div class="themecard-tags">' +
            '<span class="chip">' + UI.esc(t.mood === "light" ? "Light" : "Dark") + "</span>" +
            (t.decor && t.decor !== "none" ? '<span class="chip">' + UI.esc(t.decor) + "</span>" : "") +
            (t.custom ? '<span class="chip accent">yours</span>' : "") +
            (on ? '<span class="chip on">' + UI.ico("check") + "active</span>" : "") +
          "</div>" +
        "</div>" +
      "</button>"
    );
  }

  function gallery() {
    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("palette") + "<h2>Themes</h2>" +
          '<div class="row tight push">' +
            '<button class="btn sm ghost" data-act="import-theme">' + UI.ico("upload") + "Import</button>" +
            '<button class="btn sm primary" data-act="edit" data-id="' + UI.attr(Store.settings.themeId) + '">' +
              UI.ico("edit") + "Customize</button>" +
          "</div></div>" +
        '<div class="themegrid">' + Themes.list().map(themeCard).join("") + "</div>" +
      "</div>"
    );
  }

  /* ---------- editor ---------- */
  function fieldRow(f) {
    var val = draft.tokens[f.key] != null
      ? draft.tokens[f.key]
      : Themes.tokenValue(draft, f.key);

    if (f.type === "color") {
      var hex = normHex(val);
      return (
        '<div class="swatchrow">' +
          '<input type="color" value="' + hex + '" data-token="' + f.key + '" aria-label="' + UI.attr(f.label) + '">' +
          "<label>" + UI.esc(f.label) + "</label>" +
          '<input class="code" type="text" value="' + UI.attr(val) + '" data-token-text="' + f.key +
            '" spellcheck="false" aria-label="' + UI.attr(f.label) + ' value">' +
        "</div>"
      );
    }
    if (f.type === "range") {
      return (
        '<div class="field">' +
          "<label>" + UI.esc(f.label) + ' <span class="faint" data-rangeval="' + f.key + '">' + px(val) + (f.unit || "") + "</span></label>" +
          '<input type="range" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '" value="' + px(val) +
            '" data-token-range="' + f.key + '" data-unit="' + (f.unit || "") + '">' +
        "</div>"
      );
    }
    if (f.type === "font") {
      var match = Themes.FONTS.filter(function (x) { return val && val.indexOf(x.stack.split(",")[0]) === 0; })[0];
      return UI.field(f.label,
        '<select data-token-font="' + f.key + '">' +
          Themes.FONTS.map(function (x) {
            return '<option value="' + UI.attr(x.stack) + '"' +
              (match && match.id === x.id ? " selected" : "") + ">" + UI.esc(x.label) + "</option>";
          }).join("") +
        "</select>");
    }
    return "";
  }

  function editorPanel() {
    var groups = Themes.EDITABLE.map(function (g) {
      return (
        "<details" + (g.group === "Brand colors" ? " open" : "") + ">" +
          "<summary>" + UI.esc(g.group) + "</summary>" +
          (g.hint ? '<p class="tiny faint" style="margin:0 0 10px">' + UI.esc(g.hint) + "</p>" : "") +
          '<div class="stack" style="gap:10px;margin-bottom:8px">' +
            g.fields.map(fieldRow).join("") +
          "</div>" +
        "</details>"
      );
    }).join("");

    var decorOptions = Themes.DECOR_KINDS.map(function (d) {
      return '<button type="button" class="chip' + ((draft.decor || "none") === d ? " on" : "") +
        '" data-decor-pick="' + d + '">' + UI.esc(d) + "</button>";
    }).join("");

    return (
      '<div class="card card-accent" data-editor>' +
        '<div class="card-head">' + UI.ico("edit") + "<h2>Editing: " + UI.esc(draft.name) + "</h2>" +
          '<span class="push tiny faint" data-dirtylabel>' + (dirty ? "Unsaved changes" : "No changes yet") + "</span>" +
        "</div>" +

        '<div class="grid cols-2" data-collapse style="margin-bottom:16px">' +
          UI.field("Theme name", UI.input("themename", draft.name)) +
          UI.field("Mood", UI.select("mood", [
            { value: "dark", label: "Dark" }, { value: "light", label: "Light" },
          ], draft.mood)) +
        "</div>" +

        '<div class="grid cols-2" data-collapse style="margin-bottom:16px">' +
          UI.field("App name", UI.input("brandname", (draft.brand && draft.brand.name) || "Cauldron")) +
          UI.field("Tagline", UI.input("brandtag", (draft.brand && draft.brand.tag) || "")) +
        "</div>" +

        '<div class="field" style="margin-bottom:16px"><label>Ambient decoration</label>' +
          '<div class="row tight">' + decorOptions + "</div>" +
          '<span class="hint">Floating bats, drifting leaves, bobbing ghosts, twinkles, or nothing at all.</span>' +
        "</div>" +

        groups +

        "<details><summary>Icon asset pack</summary>" +
          '<p class="tiny faint" style="margin:0 0 12px">Point any slot at your own image ' +
            "(PNG or SVG) to replace the built-in drawing. Relative paths like " +
            "<code>themes/halloween/assets/pumpkin.png</code> work once the file is in the project folder. " +
            "Leave blank to keep the built-in icon.</p>" +
          '<div class="grid cols-2" data-collapse style="gap:10px">' +
            ASSET_SLOTS.map(function (name) {
              var v = (draft.iconOverrides && draft.iconOverrides[name]) || "";
              return '<div class="field"><label>' + UI.ico(name) + " " + UI.esc(name) + "</label>" +
                '<input type="text" value="' + UI.attr(v) + '" data-asset="' + name +
                '" placeholder="themes/…/' + name + '.png" spellcheck="false"></div>';
            }).join("") +
          "</div>" +
        "</details>" +

        '<div class="savebar' + (dirty ? " dirty" : "") + '" data-savebar>' +
          '<button class="btn quiet" data-act="cancel-edit">' + UI.ico("x") + "Discard</button>" +
          '<button class="btn ghost" data-act="export-theme">' + UI.ico("download") + "Export</button>" +
          (draft.custom && Themes.get(draft.id) && !Themes.isBuiltin(draft.id)
            ? '<button class="btn danger" data-act="delete-theme">' + UI.ico("trash") + "Delete</button>" : "") +
          '<button class="btn primary push" data-act="save-theme">' + UI.ico("check") + "Save theme</button>" +
        "</div>" +
      "</div>"
    );
  }

  /* ---------- view ---------- */
  function render() {
    var active = draft || Themes.get(Store.settings.themeId);
    return (
      '<div class="page-head">' +
        '<div class="titles"><h1>Theme</h1>' +
          '<p class="sub">' + (draft
            ? "Changes preview live across the whole app."
            : "Pick a look, or customize every color yourself.") + "</p></div>" +
      "</div>" +
      (draft ? editorPanel() : "") +
      '<div style="margin-top:' + (draft ? "16px" : "0") + '">' + gallery() + "</div>" +
      (draft ? "" :
        '<div class="card" style="margin-top:16px">' +
          '<div class="card-head">' + UI.ico("sparkle") + "<h2>Make it yours</h2></div>" +
          '<p class="muted tiny">Every theme is plain JSON — colors, corner radius, fonts, ambient ' +
            "decoration, even the app's name and icon set. Hit <b>Customize</b> to edit the one you're " +
            "using; your version saves alongside the built-ins, and <b>Export</b> writes a file you can " +
            "back up or share.</p>" +
        "</div>")
    );
  }

  function mount(root) {
    /* clicks */
    root.addEventListener("click", function (e) {
      // NB: <html> carries data-decor, so this must be a distinctly-named
      // attribute or closest() matches the root element on every click.
      var d = e.target.closest("[data-decor-pick]");
      if (d && draft) {
        draft.decor = d.dataset.decorPick;
        dirty = true;
        document.documentElement.setAttribute("data-decor", draft.decor);
        Themes.renderDecor(draft.decor);
        root.querySelectorAll("[data-decor-pick]").forEach(function (x) {
          x.classList.toggle("on", x.dataset.decorPick === draft.decor);
        });
        updateSaveBar();
        return;
      }

      var b = e.target.closest("[data-act]");
      if (!b) return;
      var act = b.dataset.act;

      if (act === "use") {
        if (draft) return; // ignore while editing
        Themes.setActive(b.dataset.id);
        App.refresh();
        UI.toast(Themes.get(b.dataset.id).name, "palette");
      }
      else if (act === "edit") startEdit(b.dataset.id);
      else if (act === "cancel-edit") {
        if (!dirty) return stopEdit(true);
        UI.confirm({
          title: "Discard changes?",
          message: "Your edits to this theme won't be saved.",
          confirmLabel: "Discard", danger: true,
        }).then(function (ok) { if (ok) stopEdit(true); });
      }
      else if (act === "save-theme") saveDraft();
      else if (act === "delete-theme") {
        UI.confirm({
          title: "Delete this theme?",
          message: '"' + draft.name + '" will be removed for good.',
          confirmLabel: "Delete", danger: true,
        }).then(function (ok) {
          if (!ok) return;
          Themes.deleteCustom(draft.id);
          stopEdit(true);
          UI.toast("Theme deleted");
        });
      }
      else if (act === "export-theme") {
        var t = draft || Themes.get(Store.settings.themeId);
        UI.download(t.id + ".theme.json", Themes.exportTheme(t));
        UI.toast("Theme exported", "download");
      }
      else if (act === "import-theme") {
        UI.pickFile(".json").then(function (f) {
          var t = Themes.importTheme(f.text);
          Themes.setActive(t.id);
          App.refresh();
          UI.toast('Imported "' + t.name + '"', "check");
        }).catch(function (err) {
          UI.toast(err.message || "Import failed", "alert");
        });
      }
    });

    /* live token editing */
    root.addEventListener("input", function (e) {
      if (!draft) return;
      var el = e.target;

      if (el.dataset.token) {
        setToken(el.dataset.token, el.value);
        var twin = root.querySelector('[data-token-text="' + el.dataset.token + '"]');
        if (twin) twin.value = el.value;
      }
      else if (el.dataset.tokenText) {
        setToken(el.dataset.tokenText, el.value);
        var sw = root.querySelector('[data-token="' + el.dataset.tokenText + '"]');
        if (sw) sw.value = normHex(el.value);
      }
      else if (el.dataset.tokenRange) {
        var v = el.value + (el.dataset.unit || "");
        setToken(el.dataset.tokenRange, v);
        var lbl = root.querySelector('[data-rangeval="' + el.dataset.tokenRange + '"]');
        if (lbl) lbl.textContent = v;
      }
      else if (el.dataset.tokenFont) {
        setToken(el.dataset.tokenFont, el.value);
      }
      else if (el.dataset.asset) {
        draft.iconOverrides = draft.iconOverrides || {};
        if (el.value.trim()) draft.iconOverrides[el.dataset.asset] = el.value.trim();
        else delete draft.iconOverrides[el.dataset.asset];
        dirty = true;
        updateSaveBar();
        Icons.invalidate(document);
      }
      else if (el.name === "themename") { draft.name = el.value; dirty = true; updateSaveBar(); }
      else if (el.name === "brandname") {
        draft.brand = draft.brand || {};
        draft.brand.name = el.value;
        document.getElementById("brandName").textContent = el.value || "Cauldron";
        dirty = true; updateSaveBar();
      }
      else if (el.name === "brandtag") {
        draft.brand = draft.brand || {};
        draft.brand.tag = el.value;
        document.getElementById("brandTag").textContent = el.value;
        dirty = true; updateSaveBar();
      }
    });

    root.addEventListener("change", function (e) {
      if (!draft) return;
      if (e.target.name === "mood") {
        draft.mood = e.target.value;
        document.documentElement.style.colorScheme = draft.mood;
        document.documentElement.setAttribute("data-mood", draft.mood);
        dirty = true; updateSaveBar();
      }
    });
  }

  Views.theme = {
    render: render,
    mount: mount,
    isEditing: function () { return !!draft; },
    /** Called by the router when navigating away mid-edit. */
    abandon: function () { if (draft) { draft = null; dirty = false; Themes.apply(Themes.get(Store.settings.themeId)); } },
  };
})(window);
