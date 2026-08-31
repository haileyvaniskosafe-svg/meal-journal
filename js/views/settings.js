/* ============================================================
   SETTINGS — profile, goals, and data management.
   ============================================================ */
(function (global) {
  "use strict";
  var Views = (global.Views = global.Views || {});

  var DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
            '<div class="grid cols-2">' +
              UI.field("Water (cups/day)", UI.input("waterGoal", s.waterGoal, { type: "number", min: 1, max: 30, step: 1 })) +
              UI.field("Protein (g/day)", UI.input("proteinGoal", s.proteinGoal || "",
                { type: "number", min: 0, step: 5, placeholder: "off" })) +
            "</div>" +
            UI.field("Activity (minutes/week)", UI.input("activityGoal", s.activityGoal,
              { type: "number", min: 0, step: 10 }), "150 min/week is the common general guideline.") +
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
    var NUM = { waterGoal: 1, activityGoal: 1, proteinGoal: 1, startDow: 1, shotDay: 1, currentDose: 1 };
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
    });
    root.addEventListener("change", function (e) {
      if (e.target.name) commitField(e.target);
    });

    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var act = b.dataset.act;

      if (act === "export") {
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

  Views.settings = { render: render, mount: mount };
})(window);
