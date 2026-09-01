/* ============================================================
   PROGRESS — weight trend, dose timeline, macro history.
   ============================================================ */
(function (global) {
  "use strict";
  var Views = (global.Views = global.Views || {});

  var range = 90;        // days shown in the weight chart
  var macroRange = 14;   // days shown in the macro history chart
  var macroKey = null;   // which macro is charted (null = first tracked)
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
          var token = Store.removeWeight(existing.id);
          h.close();
          UI.undoToast("Deleted weigh-in from " + D().monthDay(existing.date), token);
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

  /* ---------- macro history ---------- */

  /** The macro currently charted, kept valid if settings change under us. */
  function activeMacro() {
    var tracked = Store.trackedMacros();
    if (!tracked.length) return null;
    var found = macroKey && tracked.filter(function (m) { return m.key === macroKey; })[0];
    return found || tracked[0];
  }

  function macroHistoryCard() {
    var tracked = Store.trackedMacros();
    var def = activeMacro();

    if (!def) {
      return '<div class="card">' + UI.empty("chart", "No macros tracked",
        "Pick the macros you care about in Settings and your history shows up here.") + "</div>";
    }
    macroKey = def.key;

    var sum = Store.macroSummary(def.key, macroRange);
    var isLimit = def.type === "limit";

    var chart;
    if (!sum) {
      chart = UI.empty("chart", "Nothing logged yet",
        "Log a few meals and " + def.label.toLowerCase() + " history fills in here.");
    } else {
      // 30 days of labels won't fit, so thin the axis but keep every hover title
      var step = macroRange > 21 ? 5 : macroRange > 10 ? 2 : 1;
      var bars = sum.series.map(function (d, i) {
        var last = i === sum.series.length - 1;
        return {
          label: D().monthDay(d.iso),
          short: (last || i % step === 0) ? D().parse(d.iso).getDate() : "",
          value: d.value,
          muted: !d.logged,
          highlight: last,
          over: isLimit && sum.goal > 0 && d.value > sum.goal,
        };
      });

      chart =
        // three across at every width: the numbers shrink, the row never stacks
        '<div class="grid" style="margin-bottom:16px;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))">' +
          '<div class="stat"><span class="val">' + UI.fmt(sum.avg, def.decimals) +
            (def.unit ? "<small>" + def.unit + "</small>" : "") +
            '</span><span class="key">daily average</span></div>' +
          '<div class="stat"><span class="val">' + UI.fmt(sum.goal, def.decimals) +
            (def.unit ? "<small>" + def.unit + "</small>" : "") +
            '</span><span class="key">' + (isLimit ? "limit" : "goal") + "</span></div>" +
          '<div class="stat"><span class="val">' + sum.onTarget + '<small>/' + sum.loggedDays +
            '</small></span><span class="key">' + (isLimit ? "days under" : "days met") + "</span></div>" +
        "</div>" +
        UI.barChart(bars, { goal: sum.goal, unit: def.unit ? " " + def.unit : "" }) +
        '<p class="tiny faint center" style="margin-top:6px">' +
          UI.esc(def.label) + " per day · dashed line is your " + UI.fmt(sum.goal, def.decimals) +
          UI.esc(def.unit ? " " + def.unit : "") + " " + (isLimit ? "limit" : "goal") +
          " · logged " + sum.loggedDays + " of " + sum.totalDays + " days</p>";
    }

    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("chart") + "<h2>Macro history</h2>" +
          '<div class="seg push" data-mrange>' +
            [7, 14, 30].map(function (r) {
              return '<button data-mr="' + r + '" aria-pressed="' + (r === macroRange) + '">' +
                r + "d</button>";
            }).join("") +
          "</div></div>" +
        '<div class="row tight" style="margin-bottom:14px" data-macros>' +
          tracked.map(function (m) {
            return '<button class="chip' + (m.key === def.key ? " on" : "") + '" data-mkey="' +
              m.key + '" aria-pressed="' + (m.key === def.key) + '">' + UI.esc(m.label) + "</button>";
          }).join("") +
        "</div>" +
        chart +
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
          '<p class="sub">The long view: weight, dose, and macros.</p></div>' +
        '<div class="actions"><button class="btn primary sm" data-act="weigh">' +
          UI.ico("plus") + "Weigh in</button></div>" +
      "</div>" +
      weightCard() +
      '<div style="margin-top:16px">' + macroHistoryCard() + "</div>" +
      '<div class="grid" data-collapse style="margin-top:16px;align-items:start;grid-template-columns:minmax(0,1fr) minmax(0,1fr)">' +
        doseCard() + weighInsCard() +
      "</div>"
    );
  }

  function mount(root) {
    root.addEventListener("click", function (e) {
      var r = e.target.closest("[data-range] button");
      if (r) { range = +r.dataset.r; App.refresh(); return; }
      var mr = e.target.closest("[data-mrange] button");
      if (mr) { macroRange = +mr.dataset.mr; App.refresh(); return; }
      var mk = e.target.closest("[data-macros] [data-mkey]");
      if (mk) { macroKey = mk.dataset.mkey; App.refresh(); return; }
      var b = e.target.closest("[data-act]");
      if (!b) return;
      if (b.dataset.act === "weigh") openWeightModal();
      else if (b.dataset.act === "edit-weight") openWeightModal(b.dataset.date);
    });
  }

  Views.progress = { render: render, mount: mount, openWeightModal: openWeightModal };
})(window);
