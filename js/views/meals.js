/* ============================================================
   MEALS — weekly meal planner, backed by a searchable food database.
   ============================================================ */
(function (global) {
  "use strict";
  var Views = (global.Views = global.Views || {});

  var weekStart = null; // ISO date of the currently shown week

  function D() { return Store.D; }

  function currentWeek() {
    if (!weekStart) weekStart = D().weekStart(D().today(), Store.settings.startDow);
    return weekStart;
  }

  function days() {
    var start = currentWeek(), out = [];
    for (var i = 0; i < 7; i++) out.push(D().add(start, i));
    return out;
  }

  /* ---------- macro inputs ---------- */
  /** One number input per macro the user tracks, keyed macro_<key>. */
  function macroFields(macros) {
    var tracked = Store.trackedMacros();
    if (!tracked.length) {
      return '<p class="hint" style="margin-top:14px">Turn on macros in Settings to log ' +
             "calories, protein, fiber and the rest here.</p>";
    }
    return '<div class="grid cols-2" style="margin-top:14px">' +
      tracked.map(function (m) {
        var v = (macros && macros[m.key] != null) ? macros[m.key] : "";
        return UI.field(m.label + (m.unit ? " (" + m.unit + ")" : ""),
          UI.input("macro_" + m.key, v,
            { type: "number", min: 0, step: m.step, inputmode: "decimal", placeholder: "optional" }));
      }).join("") +
      "</div>";
  }

  /** Pull macro_<key> fields back out of a read form. */
  function readMacros(form) {
    var out = {};
    Store.MACROS.forEach(function (m) {
      var v = form["macro_" + m.key];
      if (v !== undefined && v !== "") out[m.key] = parseFloat(v) || 0;
    });
    return out;
  }

  /** The small number shown on a planned meal — first tracked macro it has. */
  function mealBadge(m) {
    var tracked = Store.trackedMacros();
    for (var i = 0; i < tracked.length; i++) {
      var def = tracked[i];
      var v = m.macros && m.macros[def.key];
      if (v) return '<span class="meal-macro">' + UI.fmt(v, def.decimals) + (def.unit || "") + "</span>";
    }
    return "";
  }

  /** Day-column footer: the day's totals for up to two tracked macros. */
  function dayFoot(totals) {
    return Store.trackedMacros().slice(0, 2).map(function (m) {
      var v = totals.macros[m.key];
      return v ? UI.fmt(v, m.decimals) + (m.unit || "") : "";
    }).filter(Boolean).join(" · ");
  }

  /* ---------- meal editor ---------- */
  function openMealModal(iso, slot, existingId) {
    var meta = UI.SLOT_META[slot];
    var existing = existingId
      ? Store.dayMeals(iso)[slot].find(function (m) { return m.id === existingId; })
      : null;

    var picked = null;   // the food this entry came from, if any

    var searchBlock =
      '<div class="foodsearch" data-foodsearch>' +
        '<div class="foodsearch-input">' + UI.ico("search") +
          '<input type="search" data-food-q placeholder="Search your foods…" ' +
            'autocomplete="off" aria-label="Search foods">' +
        "</div>" +
        '<div class="foodsearch-results" data-food-results></div>' +
      "</div>";

    var m = UI.modal({
      title: (existing ? "Edit " : "Add to ") + D().dowName(iso, true) + " · " + meta.label,
      icon: meta.icon,
      submitOnEnter: true,
      body:
        searchBlock +
        '<div class="grid" style="grid-template-columns:minmax(0,3fr) minmax(0,1fr);gap:12px">' +
          UI.field("What are you eating?", UI.input("name", existing ? existing.name : "",
            { placeholder: "e.g. Pumpkin chili" })) +
          UI.field("Qty", UI.input("qty", 1,
            { type: "number", min: 0, step: "0.5", inputmode: "decimal" })) +
        "</div>" +
        '<p class="hint" data-serving style="margin-top:8px;display:none"></p>' +
        macroFields(existing && existing.macros) +
        '<div style="margin-top:14px">' +
          UI.field("Notes", UI.textarea("note", existing ? existing.note : "", "Prep notes, portion, how it sat with you…")) +
        "</div>" +
        (existing
          ? '<label class="check" style="margin-top:14px"><input type="checkbox" name="done"' +
            (existing.done ? " checked" : "") + "> Already eaten</label>"
          : ""),
      foot:
        (existing
          ? '<button class="btn danger spread" data-del>' + UI.ico("trash") + "Delete</button>"
          : '<span class="spread"></span>') +
        '<button class="btn ghost" data-save-fav>' + UI.ico("plus") + "Save to my foods</button>" +
        '<button class="btn primary" data-primary data-save>' + UI.ico("check") + "Save</button>",
      onMount: function (h) {
        var qEl = h.$("[data-food-q]");
        var resultsEl = h.$("[data-food-results]");
        var qtyEl = h.$('[name="qty"]');
        var servingEl = h.$("[data-serving]");

        /** Write a macro set into the visible fields. */
        function writeMacros(macros) {
          Store.MACROS.forEach(function (m) {
            var input = h.$('[name="macro_' + m.key + '"]');
            if (input) input.value = (macros && macros[m.key]) || "";
          });
        }

        function applyQty() {
          if (!picked) return;
          writeMacros(Store.scaleMacros(picked.macros, qtyEl.value));
          var n = parseFloat(qtyEl.value) || 1;
          servingEl.textContent = (n === 1 ? "" : n + " × ") + picked.serving +
            (picked.brand ? " · " + picked.brand : "");
          servingEl.style.display = "";
        }

        function renderResults() {
          // With nothing typed, show only a few most-used so the form below
          // stays visible; widen once there's an actual query.
          var q = qEl.value.trim();
          var list = Store.searchFoods(q, q ? 6 : 3);
          if (!list.length) {
            resultsEl.innerHTML = qEl.value.trim()
              ? '<p class="tiny faint" style="padding:8px 4px">No match. Type the name above and fill ' +
                "in the macros — then save it to your foods.</p>"
              : "";
            return;
          }
          resultsEl.innerHTML = list.map(function (f) {
            return '<button type="button" class="foodrow" data-pick="' + f.id + '">' +
              '<span class="foodrow-main"><b>' + UI.esc(f.name) + "</b>" +
                '<span>' + UI.esc([f.brand, f.serving].filter(Boolean).join(" · ")) + "</span></span>" +
              '<span class="foodrow-macros">' + UI.fmt(f.macros.cal || 0) + " cal" +
                (f.macros.protein ? " · " + UI.fmt(f.macros.protein) + "g P" : "") + "</span>" +
              (f.verified ? "" : '<span class="foodrow-flag" title="Not checked against the label">' +
                UI.ico("alert") + "</span>") +
            "</button>";
          }).join("");
          Icons.hydrate(resultsEl);
        }

        qEl.addEventListener("input", renderResults);
        renderResults();

        resultsEl.addEventListener("click", function (e) {
          var btn = e.target.closest("[data-pick]");
          if (!btn) return;
          var f = Store.getFood(btn.dataset.pick);
          if (!f) return;
          picked = f;
          h.$('[name="name"]').value = f.name;
          qtyEl.value = 1;
          applyQty();
          if (f.note && !h.$('[name="note"]').value) h.$('[name="note"]').value = f.note;
          qEl.value = "";
          renderResults();
          h.$('[name="name"]').focus();
        });

        qtyEl.addEventListener("input", applyQty);

        h.$("[data-save]").addEventListener("click", function () {
          var v = UI.readForm(h.el);
          if (!v.name.trim()) { h.$('[name="name"]').focus(); return; }
          v.macros = readMacros(v);
          var cupsAdded = 0;
          if (picked) {
            Store.noteFoodUsed(picked.id);
            // A drink that is actually water counts toward the day's water too.
            if (picked.waterOz && !existing) {
              cupsAdded = Store.addWaterOz(iso, picked.waterOz * (parseFloat(qtyEl.value) || 1));
            }
          }
          if (existing) Store.updateMeal(iso, slot, existing.id, v);
          else Store.addMeal(iso, slot, v);
          h.close();
          UI.toast(
            existing ? "Updated"
              : cupsAdded ? "Added · +" + UI.fmt(cupsAdded, 1) + (cupsAdded === 1 ? " cup" : " cups") + " water"
              : "Added to " + meta.label.toLowerCase()
          );
        });

        h.$("[data-save-fav]").addEventListener("click", function () {
          var v = UI.readForm(h.el);
          if (!v.name.trim()) { h.$('[name="name"]').focus(); return; }
          Store.addFood({
            name: v.name, serving: "1 serving",
            macros: readMacros(v), note: v.note, verified: true,
          });
          UI.toast("Added to your foods", "check");
        });

        var del = h.$("[data-del]");
        if (del) del.addEventListener("click", function () {
          var token = Store.removeMeal(iso, slot, existing.id);
          h.close();
          UI.undoToast("Deleted " + existing.name, token);
        });
      },
    });
    return m;
  }

  /* ---------- per-day actions ---------- */
  function openDayMenu(iso) {
    var yesterday = D().add(iso, -1);
    var totals = Store.dayTotals(iso);

    UI.modal({
      title: D().pretty(iso),
      icon: "calendar",
      body:
        '<div class="row tight" style="margin-bottom:16px">' +
          '<span class="chip">' + totals.count + " item" + (totals.count === 1 ? "" : "s") + "</span>" +
          UI.macroChips(totals.macros) +
        "</div>" +
        '<div class="stack" style="gap:8px">' +
          '<button class="btn ghost block" data-act="copy-prev">' + UI.ico("copy") +
            "Copy from " + UI.esc(D().dowName(yesterday, true)) + "</button>" +
          '<button class="btn ghost block" data-act="copy-next">' + UI.ico("right") +
            "Copy to " + UI.esc(D().dowName(D().add(iso, 1), true)) + "</button>" +
          '<button class="btn ghost block" data-act="copy-week">' + UI.ico("calendar") +
            "Repeat across the rest of this week</button>" +
          (totals.count ? '<button class="btn danger block" data-act="clear">' + UI.ico("trash") + "Clear this day</button>" : "") +
        "</div>",
      foot: '<button class="btn" data-close>Done</button>',
      onMount: function (h) {
        h.el.addEventListener("click", function (e) {
          var b = e.target.closest("[data-act]");
          if (!b) return;
          var act = b.dataset.act, n = 0;
          if (act === "copy-prev") {
            n = Store.copyDay(yesterday, iso);
            UI.toast(n ? "Copied " + n + " item" + (n === 1 ? "" : "s") : "Nothing to copy");
          } else if (act === "copy-next") {
            n = Store.copyDay(iso, D().add(iso, 1));
            UI.toast(n ? "Copied to " + D().dowName(D().add(iso, 1), true) : "Nothing to copy");
          } else if (act === "copy-week") {
            var rest = days().filter(function (d) { return d > iso; });
            rest.forEach(function (d) { Store.clearDay(d); n += Store.copyDay(iso, d); });
            UI.toast(n ? "Repeated across " + rest.length + " days" : "Nothing to copy");
          } else if (act === "clear") {
            var token = Store.clearDay(iso);
            UI.undoToast("Cleared " + D().dowName(iso, true), token);
          }
          h.close();
        });
      },
    });
  }

  /* ---------- food library ---------- */
  var libQuery = "";

  function foodsCard() {
    var all = Store.state.foods;
    var list = Store.searchFoods(libQuery, 24);
    var unverified = all.filter(function (f) { return !f.verified; }).length;

    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("book") + "<h2>My foods</h2>" +
          '<div class="row tight push">' +
            (unverified ? '<span class="chip warn">' + UI.ico("alert") + unverified + " unchecked</span>" : "") +
            '<button class="btn sm primary" data-act="add-food">' + UI.ico("plus") + "New food</button>" +
          "</div></div>" +

        (all.length
          ? '<div class="foodsearch-input" style="margin-bottom:12px">' + UI.ico("search") +
              '<input type="search" data-lib-q value="' + UI.attr(libQuery) +
              '" placeholder="Search ' + all.length + ' foods…" autocomplete="off" aria-label="Search foods">' +
            "</div>" +
            (list.length
              ? '<div class="foodlist">' + list.map(function (f) {
                  return '<button class="foodrow" data-act="edit-food" data-id="' + f.id + '">' +
                    '<span class="foodrow-main"><b>' + UI.esc(f.name) + "</b>" +
                      '<span>' + UI.esc([f.brand, f.serving].filter(Boolean).join(" · ")) +
                      (f.useCount ? " · eaten " + f.useCount + "×" : "") + "</span></span>" +
                    '<span class="foodrow-macros">' + UI.fmt(f.macros.cal || 0) + " cal" +
                      (f.macros.protein ? " · " + UI.fmt(f.macros.protein) + "g P" : "") + "</span>" +
                    (f.verified ? "" : '<span class="foodrow-flag" title="Not checked against the label">' +
                      UI.ico("alert") + "</span>") +
                  "</button>";
                }).join("") + "</div>"
              : '<p class="tiny faint" style="padding:6px 2px">Nothing matches that.</p>')
          : '<p class="muted tiny">Nothing here yet. Add the things you eat often and they become ' +
            "one-tap when you log a meal.</p>") +

        (unverified
          ? '<p class="hint" style="margin-top:12px">' + UI.ico("alert") +
            " Flagged items were estimated, not read off the label. Open one, check the numbers " +
            "against the packet, and tick <b>Checked against the label</b>.</p>"
          : "") +
      "</div>"
    );
  }

  function openFoodModal(existingId) {
    var existing = existingId ? Store.getFood(existingId) : null;

    UI.modal({
      title: existing ? "Edit food" : "New food",
      icon: "book",
      submitOnEnter: true,
      body:
        '<div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:12px">' +
          UI.field("Name", UI.input("name", existing ? existing.name : "",
            { placeholder: "e.g. Frosted Mini-Wheats" })) +
          UI.field("Brand", UI.input("brand", existing ? existing.brand : "",
            { placeholder: "optional" })) +
        "</div>" +
        '<div style="margin-top:14px">' +
          UI.field("One serving is", UI.input("serving", existing ? existing.serving : "",
            { placeholder: "e.g. 25 biscuits (~60 g)" }),
            "Macros below are for exactly this much.") +
        "</div>" +
        macroFields(existing && existing.macros) +
        '<div style="margin-top:14px">' +
          UI.field("Counts as water (fl oz)", UI.input("waterOz",
            existing && existing.waterOz ? existing.waterOz : "",
            { type: "number", min: 0, step: "0.5", inputmode: "decimal", placeholder: "0" }),
            "For drinks that are actually water. Logging one tops up your water for the day.") +
        "</div>" +
        '<label class="check" style="margin-top:14px"><input type="checkbox" name="verified"' +
          (existing && existing.verified ? " checked" : "") + "> Checked against the label</label>" +
        '<label class="check" style="margin-top:8px"><input type="checkbox" name="fav"' +
          (existing && existing.fav ? " checked" : "") + "> Favourite</label>" +
        '<div style="margin-top:14px">' +
          UI.field("Notes", UI.textarea("note", existing ? existing.note : "", "Optional")) +
        "</div>",
      foot:
        (existing
          ? '<button class="btn danger spread" data-del>' + UI.ico("trash") + "Delete</button>"
          : '<span class="spread"></span>') +
        '<button class="btn" data-close>Cancel</button>' +
        '<button class="btn primary" data-primary data-save>' + UI.ico("check") + "Save</button>",
      onMount: function (h) {
        h.$("[data-save]").addEventListener("click", function () {
          var v = UI.readForm(h.el);
          if (!v.name.trim()) { h.$('[name="name"]').focus(); return; }
          v.macros = readMacros(v);
          if (existing) Store.updateFood(existing.id, v);
          else Store.addFood(v);
          h.close();
          UI.toast(existing ? "Updated" : "Added to your foods", "check");
        });
        var del = h.$("[data-del]");
        if (del) del.addEventListener("click", function () {
          var token = Store.removeFood(existing.id);
          h.close();
          UI.undoToast("Deleted " + existing.name, token);
        });
      },
    });
  }

  /* ---------- render ---------- */
  function dayColumn(iso) {
    var day = Store.dayMeals(iso);
    var totals = Store.dayTotals(iso);
    var isToday = iso === D().today();

    var slots = Store.SLOTS.map(function (slot) {
      var meta = UI.SLOT_META[slot];
      var items = day[slot].map(function (m) {
        return '<button class="meal' + (m.done ? " done" : "") + '" data-act="edit-meal" ' +
               'data-iso="' + iso + '" data-slot="' + slot + '" data-id="' + m.id + '" ' +
               'title="' + UI.attr(m.note || m.name) + '">' +
               '<span class="meal-name">' + UI.esc(m.name) + "</span>" +
               mealBadge(m) +
               "</button>";
      }).join("");
      return (
        '<div class="slot">' +
          '<span class="slot-lbl">' + UI.ico(meta.icon) + UI.esc(meta.label) + "</span>" +
          items +
          '<button class="meal-add" data-act="add-meal" data-iso="' + iso + '" data-slot="' + slot + '">' +
            UI.ico("plus") + "</button>" +
        "</div>"
      );
    }).join("");

    return (
      '<div class="daycol' + (isToday ? " is-today" : "") + '">' +
        '<div class="daycol-head">' +
          "<b>" + UI.esc(D().dowName(iso)) + "</b>" +
          "<span>" + UI.esc(D().parse(iso).getDate()) + "</span>" +
          '<button class="icon-btn sm bare push" data-act="day-menu" data-iso="' + iso + '" ' +
            'aria-label="Options for ' + UI.attr(D().pretty(iso)) + '">' + UI.ico("menu") + "</button>" +
        "</div>" +
        slots +
        (dayFoot(totals) ? '<div class="daycol-foot">' + dayFoot(totals) + "</div>" : "") +
      "</div>"
    );
  }

  function render() {
    var start = currentWeek(), end = D().add(start, 6);
    var isThisWeek = start === D().weekStart(D().today(), Store.settings.startDow);
    var list = days();

    var weekMacros = {};
    Store.MACROS.forEach(function (m) { weekMacros[m.key] = 0; });
    list.forEach(function (d) {
      var t = Store.dayTotals(d).macros;
      Store.MACROS.forEach(function (m) { weekMacros[m.key] += t[m.key]; });
    });
    var weekItems = list.reduce(function (t, d) { return t + Store.dayTotals(d).count; }, 0);

    return (
      '<div class="page-head">' +
        '<div class="titles"><h1>Meal Plan</h1>' +
          '<p class="sub">' + UI.esc(D().monthDay(start)) + " – " + UI.esc(D().monthDay(end)) +
            (isThisWeek ? " · this week" : "") + "</p></div>" +
        '<div class="actions">' +
          '<button class="icon-btn" data-act="prev" aria-label="Previous week">' + UI.ico("left") + "</button>" +
          '<button class="btn ghost sm" data-act="today"' + (isThisWeek ? " disabled" : "") + ">This week</button>" +
          '<button class="icon-btn" data-act="next" aria-label="Next week">' + UI.ico("right") + "</button>" +
        "</div>" +
      "</div>" +
      (weekItems
        ? '<div class="row tight" style="margin-bottom:14px">' +
            '<span class="chip">' + weekItems + " meals planned</span>" +
            UI.macroChips(weekMacros) +
          "</div>"
        : "") +
      '<div class="weekgrid">' + list.map(dayColumn).join("") + "</div>" +
      '<div style="margin-top:16px">' + foodsCard() + "</div>"
    );
  }

  function mount(root) {
    root.addEventListener("input", function (e) {
      if (!e.target.matches("[data-lib-q]")) return;
      // Re-render only the list, so the search box keeps focus and cursor.
      libQuery = e.target.value;
      var card = e.target.closest(".card");
      var listEl = card.querySelector(".foodlist");
      var results = Store.searchFoods(libQuery, 24);
      if (!listEl) return;
      listEl.innerHTML = results.map(function (f) {
        return '<button class="foodrow" data-act="edit-food" data-id="' + f.id + '">' +
          '<span class="foodrow-main"><b>' + UI.esc(f.name) + "</b>" +
            '<span>' + UI.esc([f.brand, f.serving].filter(Boolean).join(" · ")) +
            (f.useCount ? " · eaten " + f.useCount + "×" : "") + "</span></span>" +
          '<span class="foodrow-macros">' + UI.fmt(f.macros.cal || 0) + " cal" +
            (f.macros.protein ? " · " + UI.fmt(f.macros.protein) + "g P" : "") + "</span>" +
          (f.verified ? "" : '<span class="foodrow-flag">' + UI.ico("alert") + "</span>") +
        "</button>";
      }).join("") || '<p class="tiny faint" style="padding:6px 2px">Nothing matches that.</p>';
      Icons.hydrate(listEl);
    });

    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var act = b.dataset.act;

      if (act === "prev")  { weekStart = D().add(currentWeek(), -7); App.refresh(); }
      else if (act === "next")  { weekStart = D().add(currentWeek(), 7); App.refresh(); }
      else if (act === "today") { weekStart = D().weekStart(D().today(), Store.settings.startDow); App.refresh(); }
      else if (act === "add-meal")  { openMealModal(b.dataset.iso, b.dataset.slot); }
      else if (act === "edit-meal") { openMealModal(b.dataset.iso, b.dataset.slot, b.dataset.id); }
      else if (act === "day-menu")  { openDayMenu(b.dataset.iso); }
      else if (act === "add-food")  { openFoodModal(); }
      else if (act === "edit-food") { openFoodModal(b.dataset.id); }
    });
  }

  Views.meals = {
    render: render,
    mount: mount,
    openMealModal: openMealModal,
    openFoodModal: openFoodModal,
    /** Let other views jump the planner to a given week. */
    gotoWeek: function (iso) { weekStart = D().weekStart(iso, Store.settings.startDow); },
  };
})(window);
