/* ============================================================
   STORE — all persistence lives here.
   Single versioned JSON blob in localStorage, plus a tiny
   pub/sub so views re-render when data changes.
   ============================================================ */
(function (global) {
  "use strict";

  var KEY = "cauldron.v1";
  var SCHEMA = 1;

  /* ---------- date helpers ---------- */
  var D = {
    iso: function (d) {
      d = d || new Date();
      return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
    },
    parse: function (iso) {
      var p = String(iso).split("-");
      return new Date(+p[0], +p[1] - 1, +p[2]);
    },
    today: function () { return D.iso(new Date()); },
    add: function (iso, days) {
      var d = D.parse(iso);
      d.setDate(d.getDate() + days);
      return D.iso(d);
    },
    /** Whole days from a -> b (b minus a). DST-safe via UTC noon. */
    diff: function (a, b) {
      var pa = D.parse(a), pb = D.parse(b);
      var ua = Date.UTC(pa.getFullYear(), pa.getMonth(), pa.getDate());
      var ub = Date.UTC(pb.getFullYear(), pb.getMonth(), pb.getDate());
      return Math.round((ub - ua) / 86400000);
    },
    weekStart: function (iso, startDow) {
      var d = D.parse(iso);
      var s = (typeof startDow === "number") ? startDow : 0;
      var shift = (d.getDay() - s + 7) % 7;
      d.setDate(d.getDate() - shift);
      return D.iso(d);
    },
    dow: function (iso) { return D.parse(iso).getDay(); },
    dowName: function (iso, long) {
      return D.parse(iso).toLocaleDateString(undefined, { weekday: long ? "long" : "short" });
    },
    monthDay: function (iso) {
      return D.parse(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    },
    pretty: function (iso) {
      return D.parse(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    },
    relative: function (iso) {
      var n = D.diff(D.today(), iso);
      if (n === 0) return "Today";
      if (n === 1) return "Tomorrow";
      if (n === -1) return "Yesterday";
      if (n > 1 && n < 7) return "in " + n + " days";
      if (n < -1 && n > -7) return Math.abs(n) + " days ago";
      return D.monthDay(iso);
    },
  };

  /* ---------- defaults ---------- */
  var SLOTS = ["breakfast", "lunch", "dinner", "snack"];

  function defaults() {
    return {
      schema: SCHEMA,
      settings: {
        name: "",
        themeId: "halloween",
        startDow: 0,            // 0 = Sunday
        units: "lb",            // lb | kg
        waterGoal: 8,           // cups/day
        activityGoal: 150,      // minutes/week
        proteinGoal: 0,         // g/day, 0 = hidden
        shotDay: 0,             // 0-6, preferred injection weekday
        currentDose: 2.5,       // mg
        startWeight: null,
        goalWeight: null,
        decor: null,            // null = follow theme
        showEffects: true,
      },
      meals: {},        // { "2026-10-31": { breakfast:[item], ... } }
      favorites: [],    // reusable meal ideas
      shots: [],        // injection log
      activities: [],   // movement log
      water: {},        // { iso: cups }
      weights: [],      // { id, date, value }
      customThemes: {}, // { id: themeObject }
    };
  }

  /* ---------- state ---------- */
  var state = defaults();
  var subs = [];
  var saveTimer = null;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function deepMerge(base, patch) {
    if (!patch || typeof patch !== "object") return base;
    Object.keys(patch).forEach(function (k) {
      var v = patch[k];
      if (v && typeof v === "object" && !Array.isArray(v) &&
          base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) {
        deepMerge(base[k], v);
      } else if (v !== undefined) {
        base[k] = v;
      }
    });
    return base;
  }

  function load() {
    var fresh = defaults();
    try {
      var raw = global.localStorage && global.localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        state = migrate(deepMerge(fresh, parsed));
        return;
      }
    } catch (e) {
      console.warn("Cauldron: could not read saved data, starting fresh.", e);
    }
    state = fresh;
  }

  function migrate(s) {
    // Future schema bumps land here. v1 is the baseline.
    s.schema = SCHEMA;
    return s;
  }

  function persist() {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Cauldron: save failed (storage full or blocked).", e);
      if (global.UI && UI.toast) UI.toast("Couldn't save — storage is blocked or full.", "alert");
    }
  }

  function emit() {
    for (var i = 0; i < subs.length; i++) {
      try { subs[i](state); } catch (e) { console.error(e); }
    }
  }

  /** Commit a change: persist (debounced) and notify subscribers. */
  function commit(silent) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 120);
    if (!silent) emit();
  }

  /* ---------- meals ---------- */
  function dayMeals(iso) {
    if (!state.meals[iso]) {
      state.meals[iso] = { breakfast: [], lunch: [], dinner: [], snack: [] };
    }
    var d = state.meals[iso];
    SLOTS.forEach(function (s) { if (!Array.isArray(d[s])) d[s] = []; });
    return d;
  }

  function addMeal(iso, slot, item) {
    var day = dayMeals(iso);
    var entry = {
      id: uid(),
      name: (item.name || "").trim() || "Untitled",
      note: item.note || "",
      protein: num(item.protein),
      cal: num(item.cal),
      done: !!item.done,
    };
    day[slot].push(entry);
    commit();
    return entry;
  }

  function updateMeal(iso, slot, id, patch) {
    var list = dayMeals(iso)[slot];
    var it = list.find(function (m) { return m.id === id; });
    if (!it) return null;
    if (patch.name !== undefined) it.name = String(patch.name).trim() || it.name;
    if (patch.note !== undefined) it.note = patch.note;
    if (patch.protein !== undefined) it.protein = num(patch.protein);
    if (patch.cal !== undefined) it.cal = num(patch.cal);
    if (patch.done !== undefined) it.done = !!patch.done;
    commit();
    return it;
  }

  function removeMeal(iso, slot, id) {
    var day = dayMeals(iso);
    day[slot] = day[slot].filter(function (m) { return m.id !== id; });
    commit();
  }

  function moveMeal(fromIso, fromSlot, id, toIso, toSlot) {
    var list = dayMeals(fromIso)[fromSlot];
    var i = list.findIndex(function (m) { return m.id === id; });
    if (i < 0) return;
    var item = list.splice(i, 1)[0];
    dayMeals(toIso)[toSlot].push(item);
    commit();
  }

  function copyDay(fromIso, toIso) {
    var src = dayMeals(fromIso), dst = dayMeals(toIso), n = 0;
    SLOTS.forEach(function (s) {
      src[s].forEach(function (m) {
        dst[s].push({ id: uid(), name: m.name, note: m.note, protein: m.protein, cal: m.cal, done: false });
        n++;
      });
    });
    commit();
    return n;
  }

  function clearDay(iso) {
    state.meals[iso] = { breakfast: [], lunch: [], dinner: [], snack: [] };
    commit();
  }

  function dayTotals(iso) {
    var d = dayMeals(iso), protein = 0, cal = 0, count = 0, done = 0;
    SLOTS.forEach(function (s) {
      d[s].forEach(function (m) {
        protein += m.protein || 0;
        cal += m.cal || 0;
        count++;
        if (m.done) done++;
      });
    });
    return { protein: protein, cal: cal, count: count, done: done };
  }

  /* ---------- favorites ---------- */
  function addFavorite(fav) {
    var f = {
      id: uid(),
      name: (fav.name || "").trim() || "Untitled",
      slot: SLOTS.indexOf(fav.slot) >= 0 ? fav.slot : "dinner",
      protein: num(fav.protein),
      cal: num(fav.cal),
      note: fav.note || "",
    };
    state.favorites.push(f);
    commit();
    return f;
  }
  function removeFavorite(id) {
    state.favorites = state.favorites.filter(function (f) { return f.id !== id; });
    commit();
  }

  /* ---------- shots ---------- */
  var SITES = [
    { id: "abd-l", label: "Belly (left)" },
    { id: "abd-r", label: "Belly (right)" },
    { id: "thigh-l", label: "Thigh (left)" },
    { id: "thigh-r", label: "Thigh (right)" },
    { id: "arm-l", label: "Arm (left)" },
    { id: "arm-r", label: "Arm (right)" },
  ];

  function shotsSorted() {
    return state.shots.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }
  function lastShot() { return shotsSorted()[0] || null; }

  function addShot(s) {
    var entry = {
      id: uid(),
      date: s.date || D.today(),
      dose: num(s.dose) || state.settings.currentDose,
      site: s.site || suggestSite(),
      effects: Array.isArray(s.effects) ? s.effects.slice() : [],
      notes: s.notes || "",
      weight: s.weight === "" || s.weight == null ? null : num(s.weight),
    };
    state.shots.push(entry);
    if (entry.dose) state.settings.currentDose = entry.dose;
    if (entry.weight != null) addWeight(entry.date, entry.weight, true);
    commit();
    return entry;
  }

  function updateShot(id, patch) {
    var s = state.shots.find(function (x) { return x.id === id; });
    if (!s) return null;
    ["date", "site", "notes"].forEach(function (k) { if (patch[k] !== undefined) s[k] = patch[k]; });
    if (patch.dose !== undefined) s.dose = num(patch.dose);
    if (patch.effects !== undefined) s.effects = patch.effects.slice();
    if (patch.weight !== undefined) {
      s.weight = patch.weight === "" || patch.weight == null ? null : num(patch.weight);
      if (s.weight != null) addWeight(s.date, s.weight, true);
    }
    commit();
    return s;
  }

  function removeShot(id) {
    state.shots = state.shots.filter(function (s) { return s.id !== id; });
    commit();
  }

  /** Next site in the rotation, so the same spot isn't used twice running. */
  function suggestSite() {
    var last = lastShot();
    if (!last) return SITES[0].id;
    var i = SITES.findIndex(function (s) { return s.id === last.site; });
    return SITES[(i + 1) % SITES.length].id;
  }

  function siteLabel(id) {
    var s = SITES.find(function (x) { return x.id === id; });
    return s ? s.label : "—";
  }

  /** ISO date the next weekly shot is due, or null with no history. */
  function nextShotDate() {
    var last = lastShot();
    if (!last) return null;
    return D.add(last.date, 7);
  }

  /** Consecutive weeks with a shot logged within +/- 2 days of schedule. */
  function shotStreak() {
    var list = shotsSorted();
    if (!list.length) return 0;
    var streak = 1;
    for (var i = 0; i < list.length - 1; i++) {
      var gap = D.diff(list[i + 1].date, list[i].date);
      if (gap >= 5 && gap <= 9) streak++;
      else break;
    }
    return streak;
  }

  var EFFECTS = ["Nausea", "Fatigue", "Constipation", "Diarrhea", "Headache",
                 "Heartburn", "Burping", "Site soreness", "Low appetite", "Dizziness"];

  /* ---------- activity ---------- */
  var ACTIVITY_TYPES = ["Walk", "Run", "Strength", "Yoga", "Cycle", "Swim", "Dance", "Hike", "Pilates", "Other"];

  function addActivity(a) {
    var entry = {
      id: uid(),
      date: a.date || D.today(),
      type: a.type || "Walk",
      minutes: Math.max(0, Math.round(num(a.minutes))),
      intensity: a.intensity || "moderate",
      notes: a.notes || "",
    };
    state.activities.push(entry);
    commit();
    return entry;
  }
  function updateActivity(id, patch) {
    var a = state.activities.find(function (x) { return x.id === id; });
    if (!a) return null;
    ["date", "type", "intensity", "notes"].forEach(function (k) { if (patch[k] !== undefined) a[k] = patch[k]; });
    if (patch.minutes !== undefined) a.minutes = Math.max(0, Math.round(num(patch.minutes)));
    commit();
    return a;
  }
  function removeActivity(id) {
    state.activities = state.activities.filter(function (a) { return a.id !== id; });
    commit();
  }
  function activitiesOn(iso) {
    return state.activities.filter(function (a) { return a.date === iso; });
  }
  function activitiesBetween(fromIso, toIso) {
    return state.activities.filter(function (a) { return a.date >= fromIso && a.date <= toIso; });
  }
  function weekMinutes(anyIso) {
    var start = D.weekStart(anyIso || D.today(), state.settings.startDow);
    var end = D.add(start, 6);
    return activitiesBetween(start, end).reduce(function (t, a) { return t + a.minutes; }, 0);
  }
  /** Consecutive days ending today (or yesterday) with any activity logged. */
  function moveStreak() {
    var day = D.today(), n = 0;
    if (!activitiesOn(day).length) {
      day = D.add(day, -1);
      if (!activitiesOn(day).length) return 0;
    }
    while (activitiesOn(day).length) { n++; day = D.add(day, -1); }
    return n;
  }

  /* ---------- water ---------- */
  function water(iso) { return state.water[iso || D.today()] || 0; }
  function setWater(iso, cups) {
    var v = Math.max(0, Math.min(30, Math.round(num(cups))));
    if (v === 0) delete state.water[iso];
    else state.water[iso] = v;
    commit();
    return v;
  }
  function bumpWater(iso, delta) { return setWater(iso, water(iso) + delta); }

  /* ---------- weight ---------- */
  function addWeight(iso, value, silent) {
    var v = num(value);
    if (!v) return null;
    var existing = state.weights.find(function (w) { return w.date === iso; });
    if (existing) { existing.value = v; }
    else { state.weights.push({ id: uid(), date: iso, value: v }); }
    if (!silent) commit();
    return v;
  }
  function removeWeight(id) {
    state.weights = state.weights.filter(function (w) { return w.id !== id; });
    commit();
  }
  function weightsSorted() {
    return state.weights.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function latestWeight() {
    var w = weightsSorted();
    return w.length ? w[w.length - 1] : null;
  }
  function weightChange() {
    var w = weightsSorted();
    if (w.length < 2) return null;
    var start = state.settings.startWeight != null ? state.settings.startWeight : w[0].value;
    return +(w[w.length - 1].value - start).toFixed(1);
  }

  /* ---------- import / export ---------- */
  function exportJSON() { return JSON.stringify(state, null, 2); }

  function importJSON(text, mode) {
    var incoming = JSON.parse(text);
    if (!incoming || typeof incoming !== "object") throw new Error("Not a Cauldron backup.");
    if (mode === "merge") {
      var merged = deepMerge(JSON.parse(JSON.stringify(state)), incoming);
      // arrays are replaced wholesale by deepMerge; re-union the log arrays by id
      merged.shots = unionById(state.shots, incoming.shots);
      merged.activities = unionById(state.activities, incoming.activities);
      merged.weights = unionById(state.weights, incoming.weights);
      merged.favorites = unionById(state.favorites, incoming.favorites);
      state = migrate(merged);
    } else {
      state = migrate(deepMerge(defaults(), incoming));
    }
    commit();
    return true;
  }

  function unionById(a, b) {
    var out = (a || []).slice(), seen = {};
    out.forEach(function (x) { seen[x.id] = true; });
    (b || []).forEach(function (x) { if (x && !seen[x.id]) { out.push(x); seen[x.id] = true; } });
    return out;
  }

  function reset() {
    state = defaults();
    commit();
  }

  /* ---------- util ---------- */
  function num(v) {
    var n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }

  /* ---------- public ---------- */
  var Store = {
    D: D,
    SLOTS: SLOTS,
    SITES: SITES,
    EFFECTS: EFFECTS,
    ACTIVITY_TYPES: ACTIVITY_TYPES,

    get state() { return state; },
    get settings() { return state.settings; },

    load: load,
    commit: commit,
    uid: uid,
    subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (s) { return s !== fn; }); }; },

    /** set("settings.units", "kg"). Pass silent=true to save without re-rendering. */
    set: function (path, value, silent) {
      var parts = path.split("."), o = state;
      for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
      o[parts[parts.length - 1]] = value;
      commit(silent);
    },

    dayMeals: dayMeals, addMeal: addMeal, updateMeal: updateMeal, removeMeal: removeMeal,
    moveMeal: moveMeal, copyDay: copyDay, clearDay: clearDay, dayTotals: dayTotals,
    addFavorite: addFavorite, removeFavorite: removeFavorite,

    shotsSorted: shotsSorted, lastShot: lastShot, addShot: addShot, updateShot: updateShot,
    removeShot: removeShot, suggestSite: suggestSite, siteLabel: siteLabel,
    nextShotDate: nextShotDate, shotStreak: shotStreak,

    addActivity: addActivity, updateActivity: updateActivity, removeActivity: removeActivity,
    activitiesOn: activitiesOn, activitiesBetween: activitiesBetween,
    weekMinutes: weekMinutes, moveStreak: moveStreak,

    water: water, setWater: setWater, bumpWater: bumpWater,

    addWeight: addWeight, removeWeight: removeWeight, weightsSorted: weightsSorted,
    latestWeight: latestWeight, weightChange: weightChange,

    exportJSON: exportJSON, importJSON: importJSON, reset: reset,
  };

  global.Store = Store;
})(window);
