/* ============================================================
   SHOTS — weekly GLP-1 (Zepbound / tirzepatide) injection log.
   Tracks dose, site rotation, side effects, and weigh-ins.
   ============================================================ */
(function (global) {
  "use strict";
  var Views = (global.Views = global.Views || {});

  var DOSES = [2.5, 5, 7.5, 10, 12.5, 15];

  function D() { return Store.D; }

  /** Days since a given site was last used, or null if never. */
  function siteAge(siteId) {
    var used = Store.shotsSorted().find(function (s) { return s.site === siteId; });
    return used ? D().diff(used.date, D().today()) : null;
  }

  /* ---------- log / edit modal ---------- */
  function openShotModal(existingId) {
    var existing = existingId
      ? Store.state.shots.find(function (s) { return s.id === existingId; })
      : null;

    var defaultSite = existing ? existing.site : Store.suggestSite();
    var latestW = Store.latestWeight();

    var siteHTML = Store.SITES.map(function (s) {
      var age = siteAge(s.id);
      return '<button type="button" class="site" data-site="' + s.id + '" ' +
        'aria-pressed="' + (s.id === defaultSite) + '">' +
        '<span class="dot"></span><span>' + UI.esc(s.label) + "</span>" +
        '<span class="ago">' + (age === null ? "unused" : age === 0 ? "today" : age + "d ago") + "</span>" +
        "</button>";
    }).join("");

    var doseHTML = DOSES.map(function (d) {
      var on = existing ? existing.dose === d : Store.settings.currentDose === d;
      return '<button type="button" class="chip' + (on ? " on" : "") + '" data-dose="' + d + '">' + d + " mg</button>";
    }).join("");

    var effectsHTML = Store.EFFECTS.map(function (eff) {
      var on = existing && existing.effects.indexOf(eff) >= 0;
      return '<label class="check"><input type="checkbox" name="effects" data-multi="1" value="' +
        UI.attr(eff) + '"' + (on ? " checked" : "") + "> " + UI.esc(eff) + "</label>";
    }).join("");

    UI.modal({
      title: existing ? "Edit shot" : "Log a shot",
      icon: "syringe",
      wide: true,
      body:
        '<div class="grid cols-2">' +
          UI.field("Date", UI.input("date", existing ? existing.date : D().today(), { type: "date" })) +
          UI.field("Weight today (" + Store.settings.units + ")",
            UI.input("weight", existing && existing.weight != null ? existing.weight : "",
              { type: "number", step: "0.1", min: 0, inputmode: "decimal",
                placeholder: latestW ? "last: " + UI.fmt(latestW.value, 1) : "optional" })) +
        "</div>" +

        '<div class="field" style="margin-top:16px"><label>Dose</label>' +
          '<div class="row tight" data-dosewrap>' + doseHTML + "</div>" +
          '<input type="hidden" name="dose" value="' + (existing ? existing.dose : Store.settings.currentDose) + '">' +
        "</div>" +

        '<div class="field" style="margin-top:16px"><label>Injection site</label>' +
          '<div class="sitemap" data-sitewrap>' + siteHTML + "</div>" +
          '<input type="hidden" name="site" value="' + UI.attr(defaultSite) + '">' +
          '<span class="hint">Rotating sites each week helps avoid soreness and lumps.</span>' +
        "</div>" +

        '<details style="margin-top:16px"' + (existing && existing.effects.length ? " open" : "") + ">" +
          "<summary>How are you feeling? (optional)</summary>" +
          '<div class="grid auto-sm" style="margin-top:12px">' + effectsHTML + "</div>" +
        "</details>" +

        '<div style="margin-top:16px">' +
          UI.field("Notes", UI.textarea("notes", existing ? existing.notes : "",
            "Anything worth remembering about this week…")) +
        "</div>",
      foot:
        (existing
          ? '<button class="btn danger spread" data-del>' + UI.ico("trash") + "Delete</button>"
          : '<span class="spread"></span>') +
        '<button class="btn" data-close>Cancel</button>' +
        '<button class="btn primary" data-primary data-save>' + UI.ico("check") +
          (existing ? "Save changes" : "Log it") + "</button>",
      onMount: function (h) {
        // dose chips
        h.$$("[data-dose]").forEach(function (b) {
          b.addEventListener("click", function () {
            h.$$("[data-dose]").forEach(function (x) { x.classList.remove("on"); });
            b.classList.add("on");
            h.$('[name="dose"]').value = b.dataset.dose;
          });
        });
        // site buttons
        h.$$("[data-site]").forEach(function (b) {
          b.addEventListener("click", function () {
            h.$$("[data-site]").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
            b.setAttribute("aria-pressed", "true");
            h.$('[name="site"]').value = b.dataset.site;
          });
        });

        h.$("[data-save]").addEventListener("click", function () {
          var v = UI.readForm(h.el);
          v.effects = v.effects || [];
          if (existing) Store.updateShot(existing.id, v);
          else Store.addShot(v);
          h.close();
          UI.toast(existing ? "Shot updated" : "Shot logged");
        });

        var del = h.$("[data-del]");
        if (del) del.addEventListener("click", function () {
          UI.confirm({
            title: "Delete this shot?",
            message: "The log entry from " + D().monthDay(existing.date) + " will be removed. Weigh-ins stay.",
            confirmLabel: "Delete", danger: true,
          }).then(function (ok) {
            if (!ok) return;
            var token = Store.removeShot(existing.id);
            h.close();
            UI.undoToast("Deleted shot from " + D().monthDay(existing.date), token);
          });
        });
      },
    });
  }

  /* ---------- cards ---------- */
  function heroCard() {
    var last = Store.lastShot();
    if (!last) {
      return UI.empty("potion", "No shots logged yet",
        "Log your first injection and this page starts tracking your countdown, dose history, and site rotation.",
        '<button class="btn primary" data-act="log">' + UI.ico("plus") + "Log first shot</button>");
    }

    var next = Store.nextShotDate();
    var days = D().diff(D().today(), next);
    var tone = days < 0 ? "danger" : days === 0 ? "good" : days === 1 ? "warn" : "";
    var headline = days > 1 ? days + " days" : days === 1 ? "Tomorrow" : days === 0 ? "Today" :
      Math.abs(days) + (Math.abs(days) === 1 ? " day late" : " days late");

    var onDose = Store.shotsSorted().filter(function (s) { return s.dose === last.dose; }).length;

    return (
      '<div class="card card-accent">' +
        '<div class="grid cols-2" data-collapse style="align-items:center">' +
          "<div>" +
            '<div class="card-head">' + UI.ico("potion") + "<h2>Next shot</h2></div>" +
            '<div class="stat"><span class="val">' + UI.esc(headline) + "</span>" +
              '<span class="key">' + UI.esc(D().dowName(next, true)) + ", " + UI.esc(D().monthDay(next)) + "</span></div>" +
            '<div class="row tight" style="margin:14px 0">' +
              (tone ? '<span class="chip ' + tone + '">' + (days < 0 ? "Overdue" : days === 0 ? "Shot day" : "Tomorrow") + "</span>" : "") +
              '<span class="chip">' + UI.ico("target") + "Next: " + UI.esc(Store.siteLabel(Store.suggestSite())) + "</span>" +
            "</div>" +
            '<button class="btn primary" data-act="log">' + UI.ico("syringe") + "Log a shot</button>" +
          "</div>" +
          '<div class="grid cols-2" style="gap:12px">' +
            statTile("Current dose", UI.fmt(last.dose, 1), "mg") +
            statTile("Weeks at dose", onDose, "") +
            statTile("Total shots", Store.state.shots.length, "") +
            statTile("Streak", Store.shotStreak(), "wks") +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function statTile(key, val, unit) {
    return '<div class="card flat pad-sm"><div class="stat">' +
      '<span class="val">' + UI.esc(val) + (unit ? "<small>" + UI.esc(unit) + "</small>" : "") + "</span>" +
      '<span class="key">' + UI.esc(key) + "</span></div></div>";
  }

  function rotationCard() {
    if (!Store.state.shots.length) return "";
    var next = Store.suggestSite();
    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("target") + "<h2>Site rotation</h2></div>" +
        '<div class="sitemap">' +
          Store.SITES.map(function (s) {
            var age = siteAge(s.id);
            return '<div class="site" aria-pressed="' + (s.id === next) + '">' +
              '<span class="dot"></span><span>' + UI.esc(s.label) + "</span>" +
              '<span class="ago">' + (age === null ? "unused" : age === 0 ? "today" : age + "d") + "</span></div>";
          }).join("") +
        "</div>" +
        '<p class="hint" style="margin-top:10px">Highlighted is next in the rotation.</p>' +
      "</div>"
    );
  }

  function effectsCard() {
    var recent = Store.shotsSorted().slice(0, 8);
    var counts = {};
    recent.forEach(function (s) {
      (s.effects || []).forEach(function (e) { counts[e] = (counts[e] || 0) + 1; });
    });
    var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    if (!keys.length) return "";

    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("note") + "<h2>Side effects</h2>" +
          '<span class="push">last ' + recent.length + " shots</span></div>" +
        '<div class="stack" style="gap:9px">' +
          keys.slice(0, 6).map(function (k) {
            return '<div><div class="row tight" style="justify-content:space-between;margin-bottom:4px">' +
              '<span class="tiny" style="font-weight:700">' + UI.esc(k) + "</span>" +
              '<span class="tiny faint">' + counts[k] + "/" + recent.length + "</span></div>" +
              UI.bar(UI.pct(counts[k], recent.length)) + "</div>";
          }).join("") +
        "</div>" +
      "</div>"
    );
  }

  function historyCard() {
    var list = Store.shotsSorted();
    if (!list.length) return "";

    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("calendar") + "<h2>History</h2>" +
          '<span class="push">' + list.length + " logged</span></div>" +
        list.slice(0, 30).map(function (s, i) {
          var prev = list[i + 1];
          var gap = prev ? D().diff(prev.date, s.date) : null;
          var doseChange = prev && prev.dose !== s.dose;
          return (
            '<div class="rowitem">' + UI.ico("syringe") +
              '<div class="body">' +
                "<b>" + UI.esc(D().monthDay(s.date)) + " · " + UI.fmt(s.dose, 1) + " mg" +
                  (doseChange ? ' <span class="chip accent" style="margin-left:4px">' +
                    (s.dose > prev.dose ? "dose up" : "dose down") + "</span>" : "") + "</b>" +
                "<span>" + UI.esc(Store.siteLabel(s.site)) +
                  (gap ? " · " + gap + " days after" : "") +
                  (s.weight != null ? " · " + UI.fmt(s.weight, 1) + " " + Store.settings.units : "") +
                  ((s.effects || []).length ? " · " + UI.esc(s.effects.join(", ")) : "") +
                "</span>" +
              "</div>" +
              '<div class="tools">' +
                '<button class="icon-btn sm bare" data-act="edit" data-id="' + s.id + '" aria-label="Edit">' +
                  UI.ico("edit") + "</button>" +
              "</div>" +
            "</div>"
          );
        }).join("") +
        (list.length > 30 ? '<p class="tiny faint center" style="margin-top:12px">Showing the 30 most recent.</p>' : "") +
      "</div>"
    );
  }

  /* ---------- view ---------- */
  function render() {
    return (
      '<div class="page-head">' +
        '<div class="titles"><h1>Shots</h1>' +
          '<p class="sub">Weekly injections, dose history, and site rotation.</p></div>' +
        '<div class="actions"><button class="btn primary" data-act="log">' +
          UI.ico("plus") + "Log a shot</button></div>" +
      "</div>" +
      heroCard() +
      '<div class="grid" data-collapse style="margin-top:16px;align-items:start;grid-template-columns:minmax(0,1fr) minmax(0,1fr)">' +
        rotationCard() + effectsCard() +
      "</div>" +
      '<div style="margin-top:16px">' + historyCard() + "</div>" +
      '<p class="tiny faint center" style="margin-top:20px;max-width:56ch;margin-inline:auto">' +
        "This is a personal log, not medical advice. Dose changes and side effects are worth " +
        "talking through with your prescriber.</p>"
    );
  }

  function mount(root) {
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      if (b.dataset.act === "log") openShotModal();
      else if (b.dataset.act === "edit") openShotModal(b.dataset.id);
    });
  }

  Views.shots = { render: render, mount: mount, openShotModal: openShotModal, DOSES: DOSES };
})(window);
