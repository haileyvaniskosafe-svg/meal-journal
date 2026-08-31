/* ============================================================
   MOVE — activity tracker.
   ============================================================ */
(function (global) {
  "use strict";
  var Views = (global.Views = global.Views || {});

  var INTENSITY = [
    { value: "easy",     label: "Easy — could chat the whole time" },
    { value: "moderate", label: "Moderate — breathing harder" },
    { value: "hard",     label: "Hard — tough to talk" },
  ];

  var TYPE_ICON = {
    Walk: "run", Run: "run", Strength: "body", Yoga: "heart", Cycle: "lightning",
    Swim: "drop", Dance: "sparkle", Hike: "leaf", Pilates: "body", Other: "star",
  };

  var weekStart = null;
  function D() { return Store.D; }
  function currentWeek() {
    if (!weekStart) weekStart = D().weekStart(D().today(), Store.settings.startDow);
    return weekStart;
  }
  function days() {
    var s = currentWeek(), out = [];
    for (var i = 0; i < 7; i++) out.push(D().add(s, i));
    return out;
  }

  /* ---------- log modal ---------- */
  function openActivityModal(existingId) {
    var existing = existingId
      ? Store.state.activities.find(function (a) { return a.id === existingId; })
      : null;

    var typeHTML = Store.ACTIVITY_TYPES.map(function (t) {
      var on = existing ? existing.type === t : t === "Walk";
      return '<button type="button" class="chip' + (on ? " on" : "") + '" data-type="' + UI.attr(t) + '">' +
        UI.ico(TYPE_ICON[t] || "star") + UI.esc(t) + "</button>";
    }).join("");

    UI.modal({
      title: existing ? "Edit activity" : "Log activity",
      icon: "run",
      submitOnEnter: true,
      body:
        '<div class="field"><label>What did you do?</label>' +
          '<div class="row tight">' + typeHTML + "</div>" +
          '<input type="hidden" name="type" value="' + UI.attr(existing ? existing.type : "Walk") + '">' +
        "</div>" +
        '<div class="grid cols-2" style="margin-top:16px">' +
          UI.field("Minutes", UI.input("minutes", existing ? existing.minutes : "",
            { type: "number", min: 0, step: 5, inputmode: "numeric", placeholder: "30" })) +
          UI.field("Date", UI.input("date", existing ? existing.date : D().today(), { type: "date" })) +
        "</div>" +
        '<div style="margin-top:16px">' +
          UI.field("How did it feel?", UI.select("intensity", INTENSITY, existing ? existing.intensity : "moderate")) +
        "</div>" +
        '<div style="margin-top:16px">' +
          UI.field("Notes", UI.textarea("notes", existing ? existing.notes : "", "Route, weights, how you felt…")) +
        "</div>",
      foot:
        (existing
          ? '<button class="btn danger spread" data-del>' + UI.ico("trash") + "Delete</button>"
          : '<span class="spread"></span>') +
        '<button class="btn" data-close>Cancel</button>' +
        '<button class="btn primary" data-primary data-save>' + UI.ico("check") + "Save</button>",
      onMount: function (h) {
        h.$$("[data-type]").forEach(function (b) {
          b.addEventListener("click", function () {
            h.$$("[data-type]").forEach(function (x) { x.classList.remove("on"); });
            b.classList.add("on");
            h.$('[name="type"]').value = b.dataset.type;
          });
        });

        h.$("[data-save]").addEventListener("click", function () {
          var v = UI.readForm(h.el);
          if (!parseFloat(v.minutes)) { h.$('[name="minutes"]').focus(); return; }
          if (existing) Store.updateActivity(existing.id, v);
          else Store.addActivity(v);
          h.close();
          UI.toast(existing ? "Updated" : "Nice work");
        });

        var del = h.$("[data-del]");
        if (del) del.addEventListener("click", function () {
          Store.removeActivity(existing.id);
          h.close();
          UI.toast("Deleted");
        });
      },
    });
  }

  /* ---------- cards ---------- */
  function weekCard() {
    var list = days();
    var goal = Store.settings.activityGoal || 150;
    var total = list.reduce(function (t, d) {
      return t + Store.activitiesOn(d).reduce(function (x, a) { return x + a.minutes; }, 0);
    }, 0);

    var bars = list.map(function (d) {
      return {
        label: D().dowName(d).slice(0, 2),
        value: Store.activitiesOn(d).reduce(function (t, a) { return t + a.minutes; }, 0),
        highlight: d === D().today(),
      };
    });

    var activeDays = bars.filter(function (b) { return b.value > 0; }).length;

    return (
      '<div class="card card-accent">' +
        '<div class="grid" data-collapse style="grid-template-columns:auto minmax(0,1fr);gap:20px;align-items:center">' +
          "<div>" +
            UI.ring(UI.pct(total, goal), total, "of " + goal + " min") +
          "</div>" +
          '<div class="stack" style="gap:10px">' +
            '<div class="row tight">' +
              '<span class="chip' + (total >= goal ? " good" : "") + '">' +
                (total >= goal ? UI.ico("star") + "Weekly goal met" : UI.fmt(goal - total) + " min to go") + "</span>" +
              '<span class="chip">' + activeDays + " / 7 active days</span>" +
              (Store.moveStreak() > 1 ? '<span class="chip good">' + UI.ico("flame") + Store.moveStreak() + " day streak</span>" : "") +
            "</div>" +
            UI.barChart(bars, { unit: " min" }) +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function breakdownCard() {
    var list = Store.activitiesBetween(currentWeek(), D().add(currentWeek(), 6));
    if (!list.length) return "";
    var by = {};
    list.forEach(function (a) { by[a.type] = (by[a.type] || 0) + a.minutes; });
    var keys = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; });
    var max = by[keys[0]];

    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("chart") + "<h2>This week by type</h2></div>" +
        '<div class="stack" style="gap:10px">' +
          keys.map(function (k) {
            return '<div><div class="row tight" style="justify-content:space-between;margin-bottom:4px">' +
              '<span class="tiny" style="font-weight:700">' + UI.ico(TYPE_ICON[k] || "star") + " " + UI.esc(k) + "</span>" +
              '<span class="tiny faint">' + by[k] + " min</span></div>" +
              UI.bar(UI.pct(by[k], max)) + "</div>";
          }).join("") +
        "</div>" +
      "</div>"
    );
  }

  function historyCard() {
    var list = Store.state.activities.slice().sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });

    if (!list.length) {
      return '<div class="card">' + UI.empty("run", "Nothing logged yet",
        "Every walk counts. Log your first one and the weekly ring starts filling.",
        '<button class="btn primary" data-act="log">' + UI.ico("plus") + "Log activity</button>") + "</div>";
    }

    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("calendar") + "<h2>Recent</h2>" +
          '<span class="push">' + list.length + " logged</span></div>" +
        list.slice(0, 25).map(function (a) {
          return '<div class="rowitem">' + UI.ico(TYPE_ICON[a.type] || "star") +
            '<div class="body"><b>' + UI.esc(a.type) + " · " + a.minutes + " min</b>" +
            "<span>" + UI.esc(D().relative(a.date)) + " · " + UI.esc(a.intensity) +
            (a.notes ? " · " + UI.esc(a.notes) : "") + "</span></div>" +
            '<div class="tools"><button class="icon-btn sm bare" data-act="edit" data-id="' + a.id +
              '" aria-label="Edit">' + UI.ico("edit") + "</button></div></div>";
        }).join("") +
      "</div>"
    );
  }

  /* ---------- view ---------- */
  function render() {
    var start = currentWeek(), end = D().add(start, 6);
    var isThisWeek = start === D().weekStart(D().today(), Store.settings.startDow);

    return (
      '<div class="page-head">' +
        '<div class="titles"><h1>Move</h1>' +
          '<p class="sub">' + UI.esc(D().monthDay(start)) + " – " + UI.esc(D().monthDay(end)) +
            (isThisWeek ? " · this week" : "") + "</p></div>" +
        '<div class="actions">' +
          '<button class="icon-btn" data-act="prev" aria-label="Previous week">' + UI.ico("left") + "</button>" +
          '<button class="btn ghost sm" data-act="thisweek"' + (isThisWeek ? " disabled" : "") + ">This week</button>" +
          '<button class="icon-btn" data-act="next" aria-label="Next week">' + UI.ico("right") + "</button>" +
          '<button class="btn primary sm" data-act="log">' + UI.ico("plus") + "Log</button>" +
        "</div>" +
      "</div>" +
      weekCard() +
      '<div class="grid" data-collapse style="margin-top:16px;align-items:start;grid-template-columns:minmax(0,1fr) minmax(0,2fr)">' +
        breakdownCard() + historyCard() +
      "</div>"
    );
  }

  function mount(root) {
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var act = b.dataset.act;
      if (act === "log") openActivityModal();
      else if (act === "edit") openActivityModal(b.dataset.id);
      else if (act === "prev") { weekStart = D().add(currentWeek(), -7); App.refresh(); }
      else if (act === "next") { weekStart = D().add(currentWeek(), 7); App.refresh(); }
      else if (act === "thisweek") { weekStart = D().weekStart(D().today(), Store.settings.startDow); App.refresh(); }
    });
  }

  Views.move = { render: render, mount: mount, openActivityModal: openActivityModal, TYPE_ICON: TYPE_ICON };
})(window);
