/* ============================================================
   MEALS — weekly meal planner with a reusable favorites library.
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

  /* ---------- meal editor ---------- */
  function openMealModal(iso, slot, existingId) {
    var meta = UI.SLOT_META[slot];
    var existing = existingId
      ? Store.dayMeals(iso)[slot].find(function (m) { return m.id === existingId; })
      : null;

    var favs = Store.state.favorites.filter(function (f) { return f.slot === slot; })
      .concat(Store.state.favorites.filter(function (f) { return f.slot !== slot; }))
      .slice(0, 12);

    var favHTML = favs.length
      ? '<div class="field" style="margin-bottom:16px"><label>Quick pick</label><div class="row tight">' +
          favs.map(function (f) {
            return '<button type="button" class="chip" data-fav="' + f.id + '">' +
              UI.ico(UI.SLOT_META[f.slot].icon) + UI.esc(f.name) + "</button>";
          }).join("") +
        "</div></div>"
      : "";

    var m = UI.modal({
      title: (existing ? "Edit " : "Add to ") + D().dowName(iso, true) + " · " + meta.label,
      icon: meta.icon,
      submitOnEnter: true,
      body:
        favHTML +
        UI.field("What are you eating?", UI.input("name", existing ? existing.name : "", { placeholder: "e.g. Pumpkin chili" })) +
        '<div class="grid cols-2" style="margin-top:14px">' +
          UI.field("Protein (g)", UI.input("protein", existing && existing.protein ? existing.protein : "",
            { type: "number", min: 0, step: 1, inputmode: "numeric", placeholder: "optional" })) +
          UI.field("Calories", UI.input("cal", existing && existing.cal ? existing.cal : "",
            { type: "number", min: 0, step: 1, inputmode: "numeric", placeholder: "optional" })) +
        "</div>" +
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
        '<button class="btn ghost" data-save-fav>' + UI.ico("star") + "Save as favorite</button>" +
        '<button class="btn primary" data-primary data-save>' + UI.ico("check") + "Save</button>",
      onMount: function (h) {
        h.$$("[data-fav]").forEach(function (b) {
          b.addEventListener("click", function () {
            var f = Store.state.favorites.find(function (x) { return x.id === b.dataset.fav; });
            if (!f) return;
            h.$('[name="name"]').value = f.name;
            if (f.protein) h.$('[name="protein"]').value = f.protein;
            if (f.cal) h.$('[name="cal"]').value = f.cal;
            if (f.note) h.$('[name="note"]').value = f.note;
          });
        });

        h.$("[data-save]").addEventListener("click", function () {
          var v = UI.readForm(h.el);
          if (!v.name.trim()) { h.$('[name="name"]').focus(); return; }
          if (existing) Store.updateMeal(iso, slot, existing.id, v);
          else Store.addMeal(iso, slot, v);
          h.close();
          UI.toast(existing ? "Updated" : "Added to " + meta.label.toLowerCase());
        });

        h.$("[data-save-fav]").addEventListener("click", function () {
          var v = UI.readForm(h.el);
          if (!v.name.trim()) { h.$('[name="name"]').focus(); return; }
          Store.addFavorite({ name: v.name, slot: slot, protein: v.protein, cal: v.cal, note: v.note });
          UI.toast("Saved to favorites", "star");
        });

        var del = h.$("[data-del]");
        if (del) del.addEventListener("click", function () {
          Store.removeMeal(iso, slot, existing.id);
          h.close();
          UI.toast("Removed");
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
          (totals.protein ? '<span class="chip">' + UI.fmt(totals.protein) + "g protein</span>" : "") +
          (totals.cal ? '<span class="chip">' + UI.fmt(totals.cal) + " cal</span>" : "") +
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
            Store.clearDay(iso);
            UI.toast("Day cleared");
          }
          h.close();
        });
      },
    });
  }

  /* ---------- favorites ---------- */
  function favoritesCard() {
    var favs = Store.state.favorites;
    return (
      '<div class="card">' +
        '<div class="card-head">' + UI.ico("star") + "<h2>Favorites</h2>" +
          '<button class="btn sm ghost push" data-act="add-fav">' + UI.ico("plus") + "New</button></div>" +
        (favs.length
          ? '<p class="tiny faint" style="margin-bottom:10px">Tap a favorite to drop it into today.</p>' +
            '<div class="row tight">' + favs.map(function (f) {
              return '<span class="chip"><button class="linkish" data-act="use-fav" data-id="' + f.id + '">' +
                UI.ico(UI.SLOT_META[f.slot].icon) + UI.esc(f.name) +
                (f.protein ? " · " + UI.fmt(f.protein) + "p" : "") + "</button>" +
                '<button class="chip-x" data-act="del-fav" data-id="' + f.id + '" aria-label="Delete ' +
                UI.attr(f.name) + '">' + UI.ico("x") + "</button></span>";
            }).join("") + "</div>"
          : '<p class="muted tiny">Meals you save as favorites show up here for one-tap planning.</p>') +
      "</div>"
    );
  }

  function openFavModal() {
    UI.modal({
      title: "New favorite",
      icon: "star",
      submitOnEnter: true,
      body:
        UI.field("Name", UI.input("name", "", { placeholder: "e.g. Greek yogurt + berries" })) +
        '<div style="margin-top:14px">' +
          UI.field("Usual slot", UI.select("slot", Store.SLOTS.map(function (s) {
            return { value: s, label: UI.SLOT_META[s].label };
          }), "breakfast")) +
        "</div>" +
        '<div class="grid cols-2" style="margin-top:14px">' +
          UI.field("Protein (g)", UI.input("protein", "", { type: "number", min: 0, step: 1, placeholder: "optional" })) +
          UI.field("Calories", UI.input("cal", "", { type: "number", min: 0, step: 1, placeholder: "optional" })) +
        "</div>",
      foot: '<button class="btn" data-close>Cancel</button>' +
            '<button class="btn primary" data-primary data-save>' + UI.ico("check") + "Save</button>",
      onMount: function (h) {
        h.$("[data-save]").addEventListener("click", function () {
          var v = UI.readForm(h.el);
          if (!v.name.trim()) { h.$('[name="name"]').focus(); return; }
          Store.addFavorite(v);
          h.close();
          UI.toast("Favorite saved", "star");
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
               (m.protein ? '<span class="meal-macro">' + UI.fmt(m.protein) + "p</span>" : "") +
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
        (totals.protein ? '<div class="daycol-foot">' + UI.fmt(totals.protein) + "g protein</div>" : "") +
      "</div>"
    );
  }

  function render() {
    var start = currentWeek(), end = D().add(start, 6);
    var isThisWeek = start === D().weekStart(D().today(), Store.settings.startDow);
    var list = days();

    var weekProtein = list.reduce(function (t, d) { return t + Store.dayTotals(d).protein; }, 0);
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
            (weekProtein ? '<span class="chip">' + UI.fmt(weekProtein) + "g protein this week</span>" : "") +
          "</div>"
        : "") +
      '<div class="weekgrid">' + list.map(dayColumn).join("") + "</div>" +
      '<div style="margin-top:16px">' + favoritesCard() + "</div>"
    );
  }

  function mount(root) {
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
      else if (act === "add-fav")   { openFavModal(); }
      else if (act === "del-fav")   { Store.removeFavorite(b.dataset.id); UI.toast("Removed"); }
      else if (act === "use-fav") {
        var f = Store.state.favorites.find(function (x) { return x.id === b.dataset.id; });
        if (f) {
          Store.addMeal(D().today(), f.slot, f);
          UI.toast("Added to today's " + UI.SLOT_META[f.slot].label.toLowerCase());
        }
      }
    });
  }

  Views.meals = {
    render: render,
    mount: mount,
    openMealModal: openMealModal,
    /** Let other views jump the planner to a given week. */
    gotoWeek: function (iso) { weekStart = D().weekStart(iso, Store.settings.startDow); },
  };
})(window);
