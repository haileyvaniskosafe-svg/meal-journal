/* ============================================================
   TODAY — the at-a-glance dashboard.
   ============================================================ */
(function (global) {
  "use strict";
  var Views = (global.Views = global.Views || {});

  var D = null;

  function greeting() {
    var h = new Date().getHours();
    if (h < 5) return "Still up";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Winding down";
  }

  /* ---------- shot card ---------- */
  function shotCard() {
    var next = Store.nextShotDate();
    var last = Store.lastShot();
    var s = Store.settings;

    if (!last) {
      return (
        '<div class="card card-accent">' +
          '<div class="card-head">' + UI.ico("potion") + "<h2>Weekly shot</h2></div>" +
          '<p class="muted tiny">No shots logged yet. Log your first one and the tracker starts ' +
            "counting down, rotating sites, and tracking your dose.</p>" +
          '<button class="btn primary block" data-act="log-shot">' + UI.ico("plus") + "Log first shot</button>" +
        "</div>"
      );
    }

    var days = D.diff(D.today(), next);
    var tone, headline, sub;
    if (days > 1)       { tone = "chip";        headline = "in " + days + " days"; sub = D.dowName(next, true); }
    else if (days === 1){ tone = "chip warn";   headline = "Tomorrow";             sub = D.dowName(next, true); }
    else if (days === 0){ tone = "chip good";   headline = "Today";                sub = "Shot day!"; }
    else                { tone = "chip danger"; headline = Math.abs(days) + (Math.abs(days) === 1 ? " day late" : " days late");
                          sub = "Was due " + D.monthDay(next); }

    var streak = Store.shotStreak();
    var site = Store.suggestSite();

    return (
      '<div class="card card-accent">' +
        '<div class="card-head">' + UI.ico("potion") + "<h2>Next shot</h2>" +
          '<span class="' + tone + ' push">' + UI.esc(sub) + "</span>" +
        "</div>" +
        '<div class="stat"><span class="val">' + UI.esc(headline) + "</span>" +
          '<span class="key">' + UI.fmt(s.currentDose, 1) + " mg &middot; " + UI.esc(D.monthDay(next)) + "</span></div>" +
        '<div class="row tight" style="margin:12px 0">' +
          '<span class="chip">' + UI.ico("target") + "Next site: " + UI.esc(Store.siteLabel(site)) + "</span>" +
          (streak > 1 ? '<span class="chip good">' + UI.ico("flame") + streak + " weeks</span>" : "") +
        "</div>" +
        '<button class="btn ' + (days <= 0 ? "primary" : "ghost") + ' block" data-act="log-shot">' +
          UI.ico(days <= 0 ? "check" : "plus") + (days <= 0 ? "Log today's shot" : "Log a shot") + "</button>" +
      "</div>"
    );
  }

  /* ---------- water card ---------- */
  function waterCard() {
    var iso = D.today();
    var cups = Store.water(iso);
    var goal = Store.settings.waterGoal || 8;
    var size = Store.settings.cupSize || 8;
    var unit = Store.settings.volumeUnit || "oz";
    var p = UI.pct(cups, goal);

    // show every cup drunk, even past the goal, so extra intake still reads
    var shown = Math.max(goal, Math.ceil(cups));
    var dots = "";
    for (var i = 0; i < shown; i++) {
      var filled = i < cups;
      var extra = i >= goal;
      dots += '<button class="waterdot' + (filled ? " on" : "") + (extra ? " extra" : "") +
              '" data-act="set-water" data-n="' + (i + 1) + '" ' +
              'aria-label="Set to ' + (i + 1) + ' cups">' + UI.ico("drop") + "</button>";
    }

    var volume = cups * size;
    var goalVolume = goal * size;

    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("drop") + "<h2>Water</h2>" +
          '<button class="chip push" data-act="edit-water" title="Set an exact amount">' +
            UI.fmt(cups, 1) + " / " + goal + "</button></div>" +
        '<div class="waterdots">' + dots + "</div>" +
        UI.bar(p, cups >= goal ? "good" : "") +
        '<div class="row tight" style="margin-top:12px">' +
          '<button class="icon-btn sm" data-act="water" data-d="-1"' + (cups ? "" : " disabled") +
            ' aria-label="Remove a cup">' + UI.ico("minus") + "</button>" +
          '<button class="btn sm primary" data-act="water" data-d="1">' + UI.ico("plus") + "Cup</button>" +
          '<span class="push tiny faint">' + UI.fmt(volume) + " / " + UI.fmt(goalVolume) + " " + UI.esc(unit) + "</span>" +
        "</div>" +
      "</div>"
    );
  }

  /** Type an exact number of cups, and set what a cup means. */
  function openWaterModal() {
    var iso = D.today();
    var s = Store.settings;

    UI.modal({
      title: "Water today",
      icon: "drop",
      submitOnEnter: true,
      body:
        UI.field("Cups today", UI.input("cups", Store.water(iso),
          { type: "number", min: 0, max: 30, step: 1, inputmode: "numeric" })) +
        '<hr class="divider">' +
        '<p class="hint" style="margin-bottom:12px">A &ldquo;cup&rdquo; is whatever you want it to be &mdash; ' +
          "your usual glass, a bottle, a tumbler. These apply every day.</p>" +
        '<div class="grid cols-2">' +
          UI.field("One cup is", UI.input("cupSize", s.cupSize || 8,
            { type: "number", min: 1, max: 200, step: 1, inputmode: "numeric" })) +
          UI.field("Measured in", UI.select("volumeUnit", [
            { value: "oz", label: "fl oz" }, { value: "ml", label: "ml" },
          ], s.volumeUnit || "oz")) +
        "</div>" +
        '<div style="margin-top:14px">' +
          UI.field("Daily goal (cups)", UI.input("waterGoal", s.waterGoal || 8,
            { type: "number", min: 1, max: 30, step: 1, inputmode: "numeric" })) +
        "</div>" +
        '<p class="hint" data-total style="margin-top:12px"></p>',
      foot: '<button class="btn" data-close>Cancel</button>' +
            '<button class="btn primary" data-primary data-save>' + UI.ico("check") + "Save</button>",
      onMount: function (h) {
        function refreshTotal() {
          var v = UI.readForm(h.el);
          var size = parseFloat(v.cupSize) || 0;
          var goal = parseFloat(v.waterGoal) || 0;
          h.$("[data-total]").textContent =
            "That's a goal of " + UI.fmt(size * goal) + " " + v.volumeUnit + " a day.";
        }
        refreshTotal();
        h.el.addEventListener("input", refreshTotal);
        h.el.addEventListener("change", refreshTotal);

        h.$("[data-save]").addEventListener("click", function () {
          var v = UI.readForm(h.el);
          Store.set("settings.cupSize", Math.max(1, parseFloat(v.cupSize) || 8), true);
          Store.set("settings.volumeUnit", v.volumeUnit === "ml" ? "ml" : "oz", true);
          Store.set("settings.waterGoal", Math.max(1, parseFloat(v.waterGoal) || 8), true);
          Store.setWater(iso, parseFloat(v.cups) || 0);
          h.close();
          UI.toast("Saved");
        });
      },
    });
  }

  /* ---------- move card ---------- */
  function moveCard() {
    var mins = Store.weekMinutes();
    var goal = Store.settings.activityGoal || 150;
    var todayMins = Store.activitiesOn(D.today()).reduce(function (t, a) { return t + a.minutes; }, 0);
    var streak = Store.moveStreak();

    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("run") + "<h2>Movement</h2>" +
          (streak > 1 ? '<span class="chip good push">' + UI.ico("flame") + streak + " days</span>" : "") +
        "</div>" +
        '<div class="row" style="gap:16px;flex-wrap:nowrap">' +
          UI.ring(UI.pct(mins, goal), mins, "of " + goal + " min", { size: 96 }) +
          '<div class="stack" style="gap:8px;flex:1;min-width:0">' +
            '<div class="stat"><span class="val">' + todayMins + '<small>min</small></span>' +
              '<span class="key">today</span></div>' +
            '<button class="btn sm primary" data-act="log-move">' + UI.ico("plus") + "Log activity</button>" +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  /* ---------- plate card ---------- */
  function plateCard() {
    var iso = D.today();
    var day = Store.dayMeals(iso);
    var totals = Store.dayTotals(iso);
    var s = Store.settings;

    var slots = Store.SLOTS.map(function (slot) {
      var meta = UI.SLOT_META[slot];
      var items = day[slot];
      var body = items.length
        ? items.map(function (m) {
            return '<button class="meal' + (m.done ? " done" : "") + '" data-act="toggle-meal" ' +
                   'data-slot="' + slot + '" data-id="' + m.id + '">' +
                   '<span class="meal-name">' + UI.esc(m.name) + "</span>" +
                   mealBadge(m) +
                   "</button>";
          }).join("")
        : "";
      return (
        '<div class="slot">' +
          '<span class="slot-lbl">' + UI.ico(meta.icon) + UI.esc(meta.label) + "</span>" +
          body +
          '<button class="meal-add" data-act="add-meal" data-slot="' + slot + '">' +
            UI.ico("plus") + (items.length ? "Add" : "Plan " + meta.label.toLowerCase()) + "</button>" +
        "</div>"
      );
    }).join("");

    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("pumpkin") + "<h2>Today's plate</h2>" +
          '<span class="push">' + totals.done + " / " + totals.count + " eaten</span></div>" +
        '<div class="plate-slots">' + slots + "</div>" +
        (totals.count ? '<div class="row tight" style="margin-top:14px">' + UI.macroChips(totals.macros) + "</div>" : "") +
      "</div>"
    );
  }

  /** First tracked macro a meal actually has a value for. */
  function mealBadge(m) {
    var tracked = Store.trackedMacros();
    for (var i = 0; i < tracked.length; i++) {
      var def = tracked[i], v = m.macros && m.macros[def.key];
      if (v) return '<span class="meal-macro">' + UI.fmt(v, def.decimals) + (def.unit || "") + "</span>";
    }
    return "";
  }

  /* ---------- macro card ---------- */
  function macroCard() {
    var tracked = Store.trackedMacros();
    if (!tracked.length) return "";
    var iso = D.today();
    var totals = Store.macroTotals(iso);
    var logged = Store.dayTotals(iso).count;

    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("target") + "<h2>Macros today</h2>" +
          '<span class="push">' + logged + " item" + (logged === 1 ? "" : "s") + " logged</span></div>" +
        (logged
          ? UI.macroRows(totals)
          : '<p class="muted tiny">Nothing logged yet. Add meals and your macros fill in here.</p>') +
      "</div>"
    );
  }

  /* ---------- weight card ---------- */
  function weightCard() {
    var latest = Store.latestWeight();
    var change = Store.weightChange();
    var u = Store.settings.units;
    var goal = Store.settings.goalWeight;

    var toGoal = "";
    if (latest && goal) {
      var remaining = +(latest.value - goal).toFixed(1);
      toGoal = remaining > 0
        ? '<span class="chip">' + UI.fmt(remaining, 1) + " " + u + " to goal</span>"
        : '<span class="chip good">' + UI.ico("star") + "Goal reached</span>";
    }

    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("scale") + "<h2>Weight</h2>" +
          (latest ? '<span class="push">' + UI.esc(D.relative(latest.date)) + "</span>" : "") + "</div>" +
        (latest
          ? '<div class="stat"><span class="val">' + UI.fmt(latest.value, 1) + "<small>" + u + "</small></span>" +
            (change != null
              ? '<span class="delta ' + (change < 0 ? "down" : "up") + '">' + UI.signed(change, 1) + " " + u + " since start</span>"
              : '<span class="key">first entry logged</span>') + "</div>"
          : '<p class="muted tiny">No weigh-ins yet.</p>') +
        (toGoal ? '<div class="row tight" style="margin-top:10px">' + toGoal + "</div>" : "") +
        '<button class="btn sm ghost block" style="margin-top:12px" data-act="log-weight">' +
          UI.ico("plus") + "Add weigh-in</button>" +
      "</div>"
    );
  }

  /* ---------- view ---------- */
  function render() {
    D = Store.D;
    var name = Store.settings.name;

    return (
      '<div class="page-head">' +
        '<div class="titles">' +
          "<h1>" + UI.esc(greeting()) + (name ? ", " + UI.esc(name) : "") + "</h1>" +
          '<p class="sub">' + UI.esc(D.pretty(D.today())) + "</p>" +
        "</div>" +
        '<div class="actions">' +
          '<button class="btn ghost sm" data-act="log-move">' + UI.ico("run") + "Move</button>" +
          '<button class="btn ghost sm" data-act="log-weight">' + UI.ico("scale") + "Weigh in</button>" +
          '<button class="btn primary sm" data-act="log-shot">' + UI.ico("potion") + "Shot</button>" +
        "</div>" +
      "</div>" +
      '<div class="grid auto">' +
        shotCard() + waterCard() + moveCard() +
      "</div>" +
      '<div class="grid" style="margin-top:16px;align-items:start;grid-template-columns:minmax(0,2fr) minmax(0,1fr)" data-collapse>' +
        plateCard() +
        '<div class="stack">' + macroCard() + weightCard() + "</div>" +
      "</div>"
    );
  }

  function mount(root) {
    root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-act]");
      if (!btn) return;
      var act = btn.dataset.act;
      var iso = Store.D.today();

      if (act === "water")      { Store.bumpWater(iso, +btn.dataset.d); }
      else if (act === "set-water") {
        var n = +btn.dataset.n;
        Store.setWater(iso, Store.water(iso) === n ? n - 1 : n);
      }
      else if (act === "edit-water") { openWaterModal(); }
      else if (act === "log-shot")   { Views.shots.openShotModal(); }
      else if (act === "log-move")   { Views.move.openActivityModal(); }
      else if (act === "log-weight") { Views.progress.openWeightModal(); }
      else if (act === "add-meal")   { Views.meals.openMealModal(iso, btn.dataset.slot); }
      else if (act === "toggle-meal") {
        var slot = btn.dataset.slot, id = btn.dataset.id;
        var item = Store.dayMeals(iso)[slot].find(function (m) { return m.id === id; });
        if (item) Store.updateMeal(iso, slot, id, { done: !item.done });
      }
    });
  }

  Views.today = { render: render, mount: mount };
})(window);
