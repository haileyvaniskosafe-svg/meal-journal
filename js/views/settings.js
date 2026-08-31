/* ============================================================
   SETTINGS — profile, goals, and data management.
   ============================================================ */
(function (global) {
  "use strict";
  var Views = (global.Views = global.Views || {});

  var DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  /* ---------- sync ---------- */
  var STATUS_TONE = { ok: "good", syncing: "", error: "danger", offline: "warn", "signed-out": "warn", off: "" };
  var STATUS_TEXT = {
    ok: "Synced", syncing: "Syncing…", error: "Sync problem",
    offline: "Offline", "signed-out": "Signed out", off: "Not set up",
  };

  function syncCard() {
    var configured = Sync.isConfigured();
    var signedIn = Sync.isSignedIn();
    var st = Sync.status;
    var cfg = Store.state.sync;

    var pill = '<span class="chip ' + (STATUS_TONE[st] || "") + ' push">' +
      UI.ico(st === "ok" ? "check" : st === "error" ? "alert" : "refresh") +
      UI.esc(STATUS_TEXT[st] || st) + "</span>";

    var body;
    if (!configured) {
      body =
        '<p class="muted tiny">Right now your data lives only in this browser. Connect a free ' +
          "Supabase project to sync between your phone and laptop — and to have a real backup " +
          "off this device.</p>" +
        '<p class="hint" style="margin:10px 0 14px">Both values below are safe to paste here: the ' +
          "anon key is designed to be public, and the database only ever returns your own rows. " +
          "See <code>supabase/SETUP.md</code> for the five-minute walkthrough.</p>" +
        '<div class="stack" style="gap:14px">' +
          UI.field("Project URL", UI.input("syncUrl", cfg.url, { placeholder: "https://xxxxxxxx.supabase.co" })) +
          UI.field("Anon public key", UI.input("syncKey", cfg.anonKey, { placeholder: "eyJhbGciOi…" })) +
          '<button class="btn primary" data-act="sync-save">' + UI.ico("check") + "Connect</button>" +
        "</div>";
    } else if (!signedIn) {
      body =
        '<p class="muted tiny">Sign in and this device joins your sync. We\'ll email you a link — ' +
          "no password to remember.</p>" +
        (Sync.lastError ? '<p class="tiny" style="color:var(--danger);margin-top:8px">' +
          UI.esc(Sync.lastError) + "</p>" : "") +
        '<div class="stack" style="gap:14px;margin-top:14px">' +
          UI.field("Email", UI.input("syncEmail", cfg.email, { type: "text", placeholder: "you@example.com" })) +
          '<button class="btn primary" data-act="sync-signin">' + UI.ico("upload") + "Email me a sign-in link</button>" +
          '<button class="btn quiet sm" data-act="sync-forget">Use a different project</button>' +
        "</div>";
    } else {
      var last = Sync.lastSyncAt
        ? new Date(Sync.lastSyncAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
        : "not yet";
      body =
        '<p class="muted tiny">Signed in as <b>' + UI.esc(Sync.email) + "</b>. Changes sync " +
          "automatically — a few seconds after you make them, and whenever you come back to the tab.</p>" +
        (Sync.lastError ? '<p class="tiny" style="color:var(--danger);margin-top:8px">' +
          UI.esc(Sync.lastError) + "</p>" : "") +
        '<div class="row tight" style="margin-top:14px">' +
          '<span class="chip">Last synced ' + UI.esc(last) + "</span>" +
        "</div>" +
        '<div class="row tight" style="margin-top:14px">' +
          '<button class="btn primary sm" data-act="sync-now">' + UI.ico("refresh") + "Sync now</button>" +
          '<button class="btn ghost sm" data-act="sync-signout">Sign out</button>' +
        "</div>";
    }

    return (
      '<div class="card" style="margin-top:16px">' +
        '<div class="card-head">' + UI.ico("refresh") + "<h2>Sync across devices</h2>" + pill + "</div>" +
        body +
      "</div>"
    );
  }

  function render() {
    var s = Store.settings;
    var counts = {
      meals: Object.keys(Store.state.meals).reduce(function (t, k) { return t + Store.dayTotals(k).count; }, 0),
      shots: Store.state.shots.length,
      moves: Store.state.activities.length,
      weights: Store.state.weights.length,
      themes: Object.keys(Store.state.customThemes).length,
    };

    return (
      '<div class="page-head"><div class="titles"><h1>Settings</h1>' +
        '<p class="sub">Everything is stored on this device only.</p></div></div>' +

      '<div class="grid" data-collapse style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">' +

        '<div class="card">' +
          '<div class="card-head">' + UI.ico("body") + "<h2>You</h2></div>" +
          '<div class="stack" style="gap:14px">' +
            UI.field("Name", UI.input("name", s.name, { placeholder: "Shown in your greeting" })) +
            '<div class="grid cols-2">' +
              UI.field("Units", UI.select("units", [
                { value: "lb", label: "Pounds (lb)" }, { value: "kg", label: "Kilograms (kg)" },
              ], s.units)) +
              UI.field("Week starts", UI.select("startDow",
                DOW.map(function (d, i) { return { value: i, label: d }; }), s.startDow)) +
            "</div>" +
            '<div class="grid cols-2">' +
              UI.field("Starting weight", UI.input("startWeight", s.startWeight == null ? "" : s.startWeight,
                { type: "number", step: "0.1", min: 0, placeholder: "optional" }), "Used as the baseline for “since start”.") +
              UI.field("Goal weight", UI.input("goalWeight", s.goalWeight == null ? "" : s.goalWeight,
                { type: "number", step: "0.1", min: 0, placeholder: "optional" })) +
            "</div>" +
          "</div>" +
        "</div>" +

        '<div class="card">' +
          '<div class="card-head">' + UI.ico("target") + "<h2>Daily goals</h2></div>" +
          '<div class="stack" style="gap:14px">' +
            UI.field("Water (cups/day)", UI.input("waterGoal", s.waterGoal, { type: "number", min: 1, max: 30, step: 1 })) +
            UI.field("Activity (minutes/week)", UI.input("activityGoal", s.activityGoal,
              { type: "number", min: 0, step: 10 }), "150 min/week is the common general guideline.") +
          "</div>" +
        "</div>" +

        '<div class="card">' +
          '<div class="card-head">' + UI.ico("chart") + "<h2>Macros</h2></div>" +
          '<p class="hint" style="margin-bottom:14px">Tick the ones you want to track. They become ' +
            "fields when you log a meal, and a daily progress card on Today.</p>" +
          '<div class="stack" style="gap:9px">' +
            Store.MACROS.map(function (m) {
              var on = (s.trackedMacros || []).indexOf(m.key) >= 0;
              return '<div class="macrogoal">' +
                '<label class="check"><input type="checkbox" data-macro-on="' + m.key + '"' +
                  (on ? " checked" : "") + "> " + UI.esc(m.label) +
                  '<span class="faint tiny" style="margin-left:auto">' +
                    (m.type === "target" ? "reach" : "stay under") + "</span></label>" +
                '<input type="number" min="0" step="' + m.step + '" data-macro-goal="' + m.key +
                  '" value="' + UI.attr(Store.macroGoal(m.key)) + '" aria-label="' +
                  UI.attr(m.label + " goal") + '"' + (on ? "" : " disabled") + ">" +
                '<span class="unit">' + UI.esc(m.unit || "kcal") + "</span>" +
              "</div>";
            }).join("") +
          "</div>" +
        "</div>" +

        '<div class="card">' +
          '<div class="card-head">' + UI.ico("potion") + "<h2>Shots</h2></div>" +
          '<div class="stack" style="gap:14px">' +
            '<div class="grid cols-2">' +
              UI.field("Usual shot day", UI.select("shotDay",
                DOW.map(function (d, i) { return { value: i, label: d }; }), s.shotDay)) +
              UI.field("Current dose (mg)", UI.select("currentDose",
                Views.shots.DOSES.map(function (d) { return { value: d, label: d + " mg" }; }), s.currentDose)) +
            "</div>" +
            '<p class="hint">The countdown always follows your last logged shot, so a week off ' +
              "won't throw the schedule out of sync.</p>" +
          "</div>" +
        "</div>" +

        '<div class="card">' +
          '<div class="card-head">' + UI.ico("sparkle") + "<h2>Appearance</h2></div>" +
          '<div class="stack" style="gap:14px">' +
            UI.field("Ambient decoration", UI.select("decor",
              [{ value: "", label: "Follow the theme" }].concat(
                Themes.DECOR_KINDS.map(function (d) { return { value: d, label: d }; })),
              s.decor || ""), "Overrides the floating extras for every theme.") +
            '<a class="btn ghost block" href="#/theme">' + UI.ico("palette") + "Open the theme editor</a>" +
          "</div>" +
        "</div>" +

      "</div>" +

      syncCard() +

      '<div class="card" style="margin-top:16px">' +
        '<div class="card-head">' + UI.ico("download") + "<h2>Your data</h2></div>" +
        '<div class="row tight" style="margin-bottom:14px">' +
          '<span class="chip">' + counts.meals + " meals</span>" +
          '<span class="chip">' + counts.shots + " shots</span>" +
          '<span class="chip">' + counts.moves + " activities</span>" +
          '<span class="chip">' + counts.weights + " weigh-ins</span>" +
          (counts.themes ? '<span class="chip accent">' + counts.themes + " custom themes</span>" : "") +
        "</div>" +
        '<p class="muted tiny">Everything lives in this browser\'s local storage — nothing is uploaded ' +
          "anywhere. That also means clearing site data wipes it, so export a backup now and then.</p>" +
        '<div class="row tight" style="margin-top:14px">' +
          '<button class="btn primary" data-act="export">' + UI.ico("download") + "Export backup</button>" +
          '<button class="btn ghost" data-act="import">' + UI.ico("upload") + "Import backup</button>" +
          '<button class="btn danger push" data-act="reset">' + UI.ico("trash") + "Erase everything</button>" +
        "</div>" +
      "</div>" +

      '<p class="tiny faint center" style="margin-top:20px;max-width:56ch;margin-inline:auto">' +
        "A personal tracker, not a medical device. Dose changes, side effects, and weight goals " +
        "are conversations for you and your prescriber.</p>"
    );
  }

  function mount(root) {
    var NUM = { waterGoal: 1, activityGoal: 1, startDow: 1, shotDay: 1, currentDose: 1 };
    var NULLABLE = { startWeight: 1, goalWeight: 1 };

    function commitField(el) {
      var k = el.name;
      if (!k) return;
      var v = el.value;
      if (NULLABLE[k]) v = v === "" ? null : parseFloat(v);
      else if (NUM[k]) v = parseFloat(v) || 0;
      else if (k === "decor") v = v || null;

      // Save without a re-render: re-rendering mid-edit would steal focus from
      // the field the user is tabbing through.
      Store.set("settings." + k, v, true);

      if (k === "decor") Themes.apply(Themes.get(Store.settings.themeId));
    }

    // Save on every keystroke as well as on change. Text and number inputs only
    // fire `change` on blur, so a value typed and never blurred would otherwise
    // be lost. Saves are silent (no re-render), so this costs nothing.
    root.addEventListener("input", function (e) {
      if (e.target.name) commitField(e.target);

      var goalKey = e.target.dataset.macroGoal;
      if (goalKey) {
        var goals = Object.assign({}, Store.settings.macroGoals);
        goals[goalKey] = parseFloat(e.target.value) || 0;
        Store.set("settings.macroGoals", goals, true);
      }
    });
    root.addEventListener("change", function (e) {
      if (e.target.name) commitField(e.target);

      var onKey = e.target.dataset.macroOn;
      if (onKey) {
        var picked = (Store.settings.trackedMacros || []).slice();
        var i = picked.indexOf(onKey);
        if (e.target.checked && i < 0) picked.push(onKey);
        if (!e.target.checked && i >= 0) picked.splice(i, 1);
        // keep them in the canonical order so the UI reads consistently
        picked = Store.MACROS.map(function (m) { return m.key; })
          .filter(function (k) { return picked.indexOf(k) >= 0; });
        Store.set("settings.trackedMacros", picked, true);
        var goalInput = root.querySelector('[data-macro-goal="' + onKey + '"]');
        if (goalInput) goalInput.disabled = !e.target.checked;
      }
    });

    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var act = b.dataset.act;

      if (act === "sync-save") {
        var url = (root.querySelector('[name="syncUrl"]').value || "").trim().replace(/\/+$/, "");
        var key = (root.querySelector('[name="syncKey"]').value || "").trim();
        if (!/^https:\/\/.+/.test(url)) { UI.toast("That URL should start with https://", "alert"); return; }
        if (key.length < 20) { UI.toast("That anon key looks too short", "alert"); return; }
        Store.set("sync.url", url, true);
        Store.set("sync.anonKey", key, true);
        Sync.configChanged();
        App.refresh();
        UI.toast("Connected — now sign in", "check");
      }
      else if (act === "sync-signin") {
        var email = (root.querySelector('[name="syncEmail"]').value || "").trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { UI.toast("Enter a valid email", "alert"); return; }
        b.disabled = true;
        Sync.signIn(email).then(function () {
          Store.set("sync.email", email, true);
          UI.modal({
            title: "Check your email",
            icon: "check",
            body: '<p class="muted">We sent a sign-in link to <b>' + UI.esc(email) + "</b>. " +
                  "Open it on this device and you'll land back here, signed in.</p>" +
                  '<p class="hint" style="margin-top:12px">Do the same on your other devices to ' +
                  "link them to the same data.</p>",
            foot: '<button class="btn primary" data-close>Got it</button>',
          });
        }).catch(function (err) {
          UI.toast(err.message || "Could not send the link", "alert");
        }).then(function () { b.disabled = false; });
      }
      else if (act === "sync-now") {
        Sync.sync({ toast: true }).catch(function () { /* toast already shown */ });
      }
      else if (act === "sync-signout") {
        UI.confirm({
          title: "Sign out of sync?",
          message: "Your data stays on this device. It just stops syncing until you sign in again.",
          confirmLabel: "Sign out",
        }).then(function (okd) {
          if (!okd) return;
          Sync.signOut();
          App.refresh();
          UI.toast("Signed out");
        });
      }
      else if (act === "sync-forget") {
        Store.set("sync.url", "", true);
        Store.set("sync.anonKey", "", true);
        Sync.configChanged();
        App.refresh();
      }
      else if (act === "export") {
        var stamp = Store.D.today();
        UI.download("cauldron-backup-" + stamp + ".json", Store.exportJSON());
        UI.toast("Backup downloaded", "download");
      }
      else if (act === "import") {
        UI.pickFile(".json").then(function (f) {
          return UI.confirm({
            title: "Import " + f.name + "?",
            message: "Shots, activities, weigh-ins and favorites from the file are added to " +
                     "what's already here. Settings and planned meals for the same day are " +
                     "taken from the file.",
            confirmLabel: "Merge it in", cancelLabel: "Cancel",
          }).then(function (ok) {
            if (!ok) return;
            Store.importJSON(f.text, "merge");
            Themes.apply(Themes.get(Store.settings.themeId));
            App.refresh();
            UI.toast("Backup merged in", "check");
          });
        }).catch(function (err) {
          UI.toast(err.message || "Import failed", "alert");
        });
      }
      else if (act === "reset") {
        UI.confirm({
          title: "Erase everything?",
          message: "Every meal, shot, activity, weigh-in, and custom theme on this device will be " +
                   "deleted. Export a backup first if you might want any of it back.",
          confirmLabel: "Erase it all", danger: true,
        }).then(function (ok) {
          if (!ok) return;
          Store.reset();
          Themes.apply(Themes.get("halloween"));
          location.hash = "#/today";
          App.refresh();
          UI.toast("Everything erased");
        });
      }
    });
  }

  Views.settings = {
    render: render,
    mount: function (root) {
      mount(root);
      // status pill and the whole card change as sync progresses
      Sync.onChange(function () {
        if (App.route === "settings") App.refresh();
      });
    },
  };
})(window);
