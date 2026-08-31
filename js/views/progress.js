/* ============================================================
   PROGRESS — weight trend, dose timeline, consistency.
   ============================================================ */
(function (global) {
  "use strict";
  var Views = (global.Views = global.Views || {});

  var range = 90; // days shown in the weight chart
  function D() { return Store.D; }

  /* ---------- weigh-in modal ---------- */
  function openWeightModal(existingDate) {
    var latest = Store.latestWeight();
    var u = Store.settings.units;
    var existing = existingDate
      ? Store.state.weights.find(function (w) { return w.date === existingDate; })
      : null;

    UI.modal({
      title: existing ? "Edit weigh-in" : "Add weigh-in",
      icon: "scale",
      submitOnEnter: true,
      body:
        '<div class="grid cols-2">' +
          UI.field("Weight (" + u + ")", UI.input("value", existing ? existing.value : "",
            { type: "number", step: "0.1", min: 0, inputmode: "decimal",
              placeholder: latest ? UI.fmt(latest.value, 1) : "" })) +
          UI.field("Date", UI.input("date", existing ? existing.date : D().today(), { type: "date" })) +
        "</div>" +
        (latest && !existing
          ? '<p class="hint" style="margin-top:12px">Last logged ' + UI.esc(D().relative(latest.date)) +
            " at " + UI.fmt(latest.value, 1) + " " + u + ".</p>"
          : ""),
      foot:
        (existing
          ? '<button class="btn danger spread" data-del>' + UI.ico("trash") + "Delete</button>"
          : '<span class="spread"></span>') +
        '<button class="btn" data-close>Cancel</button>' +
        '<button class="btn primary" data-primary data-save>' + UI.ico("check") + "Save</button>",
      onMount: function (h) {
        h.$("[data-save]").addEventListener("click", function () {
          var v = UI.readForm(h.el);
          if (!parseFloat(v.value)) { h.$('[name="value"]').focus(); return; }
          if (existing && existing.date !== v.date) Store.removeWeight(existing.id);
          Store.addWeight(v.date, v.value);
          if (Store.settings.startWeight == null) Store.set("settings.startWeight", parseFloat(v.value));
          h.close();
          UI.toast("Logged");
        });
        var del = h.$("[data-del]");
        if (del) del.addEventListener("click", function () {
          Store.removeWeight(existing.id);
          h.close();
          UI.toast("Deleted");
        });
      },
    });
  }

  /* ---------- cards ---------- */
  function weightCard() {
    var all = Store.weightsSorted();
    var u = Store.settings.units;

    if (!all.length) {
      return '<div class="card">' + UI.empty("scale", "No weigh-ins yet",
        "Add a few and your trend line shows up here.",
        '<button class="btn primary" data-act="weigh">' + UI.ico("plus") + "Add weigh-in</button>") + "</div>";
    }

    var cutoff = D().add(D().today(), -range);
    var pts = all.filter(function (w) { return range === 0 || w.date >= cutoff; })
                 .map(function (w) { return { x: w.date, y: w.value }; });
    if (pts.length < 2) pts = all.map(function (w) { return { x: w.date, y: w.value }; });

    var latest = all[all.length - 1];
    var start = Store.settings.startWeight != null ? Store.settings.startWeight : all[0].value;
    var change = +(latest.value - start).toFixed(1);
    var goal = Store.settings.goalWeight;

    // 7-day-ago comparison for a short-term trend
    var weekAgo = all.filter(function (w) { return w.date <= D().add(D().today(), -7); }).pop();
    var wChange = weekAgo ? +(latest.value - weekAgo.value).toFixed(1) : null;

    var goalPct = null;
    if (goal != null && start !== goal) {
      goalPct = UI.pct(Math.abs(start - latest.value), Math.abs(start - goal));
    }

    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("scale") + "<h2>Weight trend</h2>" +
          '<div class="seg push" data-range>' +
            [30, 90, 365, 0].map(function (r) {
              return '<button data-r="' + r + '" aria-pressed="' + (r === range) + '">' +
                (r === 0 ? "All" : r + "d") + "</button>";
            }).join("") +
          "</div></div>" +
        '<div class="grid auto-sm" style="margin-bottom:16px">' +
          '<div class="stat"><span class="val">' + UI.fmt(latest.value, 1) + "<small>" + u + "</small></span>" +
            '<span class="key">current</span></div>' +
          '<div class="stat"><span class="val ' + (change < 0 ? "" : "") + '">' + UI.signed(change, 1) +
            "<small>" + u + "</small></span><span class=\"key\">since start</span></div>" +
          (wChange != null
            ? '<div class="stat"><span class="val">' + UI.signed(wChange, 1) + "<small>" + u + "</small></span>" +
              '<span class="key">past week</span></div>'
            : "") +
          (goal != null
            ? '<div class="stat"><span class="val">' + UI.fmt(goal, 1) + "<small>" + u + "</small></span>" +
              '<span class="key">goal</span></div>'
            : "") +
        "</div>" +
        (goalPct != null
          ? '<div style="margin-bottom:16px">' + UI.bar(goalPct, "good") +
            '<p class="tiny faint" style="margin-top:6px">' + goalPct + "% of the way to your goal.</p></div>"
          : "") +
        UI.lineChart(pts, { unit: u, dp: 1 }) +
        '<div class="row" style="margin-top:14px">' +
          '<button class="btn sm primary" data-act="weigh">' + UI.ico("plus") + "Add weigh-in</button>" +
          '<span class="push tiny faint">' + all.length + " entries</span>" +
        "</div>" +
      "</div>"
    );
  }

  function doseCard() {
    var shots = Store.shotsSorted().slice().reverse();
    if (!shots.length) return "";

    // collapse consecutive same-dose shots into stints
    var stints = [];
    shots.forEach(function (s) {
      var last = stints[stints.length - 1];
      if (last && last.dose === s.dose) { last.count++; last.to = s.date; }
      else stints.push({ dose: s.dose, from: s.date, to: s.date, count: 1 });
    });

    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("potion") + "<h2>Dose timeline</h2></div>" +
        '<div class="timeline">' +
          stints.reverse().map(function (st, i) {
            return '<div class="timeline-row' + (i === 0 ? " now" : "") + '">' +
              '<span class="timeline-dot"></span>' +
              '<div class="body"><b>' + UI.fmt(st.dose, 1) + " mg</b>" +
              "<span>" + st.count + " shot" + (st.count === 1 ? "" : "s") + " · " +
              UI.esc(D().monthDay(st.from)) + (st.count > 1 ? " – " + UI.esc(D().monthDay(st.to)) : "") +
              "</span></div></div>";
          }).join("") +
        "</div>" +
      "</div>"
    );
  }

  function consistencyCard() {
    // last 8 weeks: shots logged, activity minutes, meals planned
    var weeks = [];
    var thisWeek = D().weekStart(D().today(), Store.settings.startDow);
    for (var i = 7; i >= 0; i--) {
      var ws = D().add(thisWeek, -7 * i);
      var we = D().add(ws, 6);
      var mins = Store.activitiesBetween(ws, we).reduce(function (t, a) { return t + a.minutes; }, 0);
      var shot = Store.state.shots.some(function (s) { return s.date >= ws && s.date <= we; });
      var meals = 0;
      for (var d = 0; d < 7; d++) meals += Store.dayTotals(D().add(ws, d)).count;
      weeks.push({ ws: ws, label: D().monthDay(ws).replace(/\s/, " "), mins: mins, shot: shot, meals: meals });
    }

    var goal = Store.settings.activityGoal || 150;

    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("chart") + "<h2>Last 8 weeks</h2></div>" +
        UI.barChart(weeks.map(function (w) {
          return { label: w.label.split(" ")[1] || w.label, value: w.mins, highlight: w.ws === thisWeek };
        }), { goal: goal, unit: " min" }) +
        '<p class="tiny faint center" style="margin-top:6px">Activity minutes per week · dashed line is your ' + goal + '-minute goal</p>' +
        '<hr class="divider">' +
        '<div class="weekdots">' +
          weeks.map(function (w) {
            return '<div class="weekdot" title="' + UI.attr(D().monthDay(w.ws) + ": " +
              (w.shot ? "shot logged" : "no shot") + ", " + w.meals + " meals planned") + '">' +
              '<span class="wd ' + (w.shot ? "on" : "") + '">' + UI.ico("syringe") + "</span>" +
              '<span class="wd ' + (w.meals ? "on alt" : "") + '">' + UI.ico("pumpkin") + "</span>" +
              "</div>";
          }).join("") +
        "</div>" +
        '<p class="tiny faint center" style="margin-top:8px">Shot logged · meals planned</p>' +
      "</div>"
    );
  }

  function weighInsCard() {
    var all = Store.weightsSorted().slice().reverse();
    if (all.length < 2) return "";
    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("note") + "<h2>All weigh-ins</h2></div>" +
        '<div class="stack" style="gap:0;max-height:340px;overflow:auto">' +
          all.map(function (w, i) {
            var prev = all[i + 1];
            var delta = prev ? +(w.value - prev.value).toFixed(1) : null;
            return '<div class="rowitem"><div class="body"><b>' + UI.fmt(w.value, 1) + " " +
              Store.settings.units + "</b><span>" + UI.esc(D().monthDay(w.date)) + "</span></div>" +
              (delta != null
                ? '<span class="chip ' + (delta < 0 ? "good" : delta > 0 ? "warn" : "") + '">' +
                  UI.signed(delta, 1) + "</span>"
                : "") +
              '<div class="tools"><button class="icon-btn sm bare" data-act="edit-weight" data-date="' +
                w.date + '" aria-label="Edit">' + UI.ico("edit") + "</button></div></div>";
          }).join("") +
        "</div>" +
      "</div>"
    );
  }

  /* ---------- view ---------- */
  function render() {
    return (
      '<div class="page-head">' +
        '<div class="titles"><h1>Progress</h1>' +
          '<p class="sub">The long view: weight, dose, and consistency.</p></div>' +
        '<div class="actions"><button class="btn primary sm" data-act="weigh">' +
          UI.ico("plus") + "Weigh in</button></div>" +
      "</div>" +
      weightCard() +
      '<div class="grid" data-collapse style="margin-top:16px;align-items:start;grid-template-columns:minmax(0,1fr) minmax(0,1fr)">' +
        doseCard() + consistencyCard() +
      "</div>" +
      '<div style="margin-top:16px">' + weighInsCard() + "</div>"
    );
  }

  function mount(root) {
    root.addEventListener("click", function (e) {
      var r = e.target.closest("[data-range] button");
      if (r) { range = +r.dataset.r; App.refresh(); return; }
      var b = e.target.closest("[data-act]");
      if (!b) return;
      if (b.dataset.act === "weigh") openWeightModal();
      else if (b.dataset.act === "edit-weight") openWeightModal(b.dataset.date);
    });
  }

  Views.progress = { render: render, mount: mount, openWeightModal: openWeightModal };
})(window);
