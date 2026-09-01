/* ============================================================
   STORE — all persistence lives here.
   A single versioned JSON blob in localStorage, plus a tiny
   pub/sub so views re-render when data changes.

   Every record carries `updatedAt` and every delete leaves a
   tombstone. Local use doesn't need either, but cloud sync does:
   they're what let two devices merge instead of clobbering.
   ============================================================ */
(function (global) {
  "use strict";

  var KEY = "cauldron.v1";
  var SCHEMA = 3;

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
    /** Whole days from a -> b (b minus a). DST-safe via UTC. */
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

  /* ---------- macros ----------
     `type` decides how a day reads:
       target — you're aiming to reach it (protein, fiber)
       limit  — you're aiming to stay under it (calories, sodium)
     That distinction is why the rings can say "on track" honestly. */
  var MACROS = [
    { key: "cal",     label: "Calories", unit: "",   type: "limit",  goal: 1500, step: 10, decimals: 0 },
    { key: "protein", label: "Protein",  unit: "g",  type: "target", goal: 100,  step: 1,  decimals: 0 },
    { key: "fiber",   label: "Fiber",    unit: "g",  type: "target", goal: 25,   step: 1,  decimals: 0 },
    { key: "carbs",   label: "Carbs",    unit: "g",  type: "limit",  goal: 150,  step: 1,  decimals: 0 },
    { key: "fat",     label: "Fat",      unit: "g",  type: "limit",  goal: 60,   step: 1,  decimals: 0 },
    { key: "sugar",   label: "Sugar",    unit: "g",  type: "limit",  goal: 40,   step: 1,  decimals: 0 },
    { key: "sodium",  label: "Sodium",   unit: "mg", type: "limit",  goal: 2300, step: 50, decimals: 0 },
  ];
  var MACRO_BY_KEY = {};
  MACROS.forEach(function (m) { MACRO_BY_KEY[m.key] = m; });

  var SLOTS = ["breakfast", "lunch", "dinner", "snack"];

  /* ---------- defaults ---------- */
  function defaults() {
    return {
      schema: SCHEMA,
      settings: {
        name: "",
        themeId: "halloween",
        startDow: 0,
        units: "lb",
        waterGoal: 8,          // cups per day
        cupSize: 8,            // how big one "cup" is, in volumeUnit
        volumeUnit: "oz",      // oz | ml
        activityGoal: 150,
        shotDay: 0,
        currentDose: 2.5,
        startWeight: null,
        goalWeight: null,
        decor: null,
        trackedMacros: ["cal", "protein", "fiber"],
        macroGoals: { cal: 1500, protein: 100, fiber: 25, carbs: 150, fat: 60, sugar: 40, sodium: 2300 },
      },
      meals: {},
      foods: [],            // the searchable food database
      seededFoods: false,   // starter library loaded once, then it's yours
      favorites: [],        // legacy; folded into foods at schema 3
      shots: [],
      activities: [],
      water: {},
      waterAt: {},          // { iso: updatedAt } so water syncs per-day, not all-or-nothing
      weights: [],
      customThemes: {},
      settingsAt: 0,    // settings sync as one record, so they need one timestamp
      tombstones: [],   // { kind, id, at } — deletes, so sync can propagate them
      sync: { url: "", anonKey: "", lastPulledAt: 0, lastPushedAt: 0, email: "" },
    };
  }

  /* ---------- state ---------- */
  var state = defaults();
  var subs = [];
  var saveTimer = null;

  /**
   * Monotonic clock for record stamps.
   *
   * Two records written in the same millisecond used to get identical
   * `updatedAt` values. Sync pushes everything newer than a cursor, and
   * the cursor is the highest stamp it just sent — so any record sharing
   * that exact millisecond fell outside `> cursor` and was never pushed
   * again. Guaranteeing strictly increasing stamps closes that gap.
   */
  var lastNow = 0;
  function now() {
    var t = Date.now();
    if (t <= lastNow) t = lastNow + 1;
    lastNow = t;
    return t;
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function num(v) {
    var n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }
  /** Stamp a record as changed so sync can order it against other devices. */
  function touch(rec) { rec.updatedAt = now(); return rec; }

  function tomb(kind, id) {
    state.tombstones = state.tombstones.filter(function (t) {
      return !(t.kind === kind && t.id === id);
    });
    state.tombstones.push({ kind: kind, id: id, at: now() });
  }
  function untomb(kind, id) {
    state.tombstones = state.tombstones.filter(function (t) {
      return !(t.kind === kind && t.id === id);
    });
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
        state = migrate(deepMerge(fresh, JSON.parse(raw)));
        return;
      }
    } catch (e) {
      console.warn("Cauldron: could not read saved data, starting fresh.", e);
    }
    state = fresh;
  }

  /** v1 stored protein/cal directly on a meal; v2 keeps a macros object. */
  function migrate(s) {
    var from = s.schema || 1;

    if (from < 2) {
      Object.keys(s.meals || {}).forEach(function (iso) {
        SLOTS.forEach(function (slot) {
          (s.meals[iso][slot] || []).forEach(function (m) {
            m.macros = m.macros || {};
            if (m.protein) m.macros.protein = num(m.protein);
            if (m.cal) m.macros.cal = num(m.cal);
            delete m.protein; delete m.cal;
          });
        });
      });
      (s.favorites || []).forEach(function (f) {
        f.macros = f.macros || {};
        if (f.protein) f.macros.protein = num(f.protein);
        if (f.cal) f.macros.cal = num(f.cal);
        delete f.protein; delete f.cal;
      });
      // the old single protein goal becomes one of the macro goals
      if (s.settings && s.settings.proteinGoal) {
        s.settings.macroGoals = s.settings.macroGoals || {};
        s.settings.macroGoals.protein = num(s.settings.proteinGoal);
        if (s.settings.trackedMacros.indexOf("protein") < 0) s.settings.trackedMacros.push("protein");
      }
      if (s.settings) delete s.settings.proteinGoal;
    }

    if (from < 3) {
      // Favorites were a weaker version of the same idea. Fold them in.
      s.foods = s.foods || [];
      (s.favorites || []).forEach(function (f) {
        s.foods.push({
          id: f.id, name: f.name, brand: "", serving: "1 serving",
          macros: f.macros || {}, note: f.note || "",
          fav: true, verified: false, slot: f.slot,
          useCount: 0, lastUsed: null, updatedAt: f.updatedAt || now(),
        });
      });
      s.favorites = [];
    }

    // Backfill the sync bookkeeping every record needs.
    var t = now();
    Object.keys(s.meals || {}).forEach(function (iso) {
      SLOTS.forEach(function (slot) {
        (s.meals[iso][slot] || []).forEach(function (m) {
          if (!m.updatedAt) m.updatedAt = t;
          m.date = iso; m.slot = slot;          // self-describing, so sync can rebuild
          m.macros = m.macros || {};
        });
      });
    });
    ["favorites", "foods", "shots", "activities", "weights"].forEach(function (k) {
      (s[k] || []).forEach(function (r) { if (!r.updatedAt) r.updatedAt = t; });
    });
    if (!Array.isArray(s.tombstones)) s.tombstones = [];
    if (!Array.isArray(s.foods)) s.foods = [];
    if (!s.waterAt || typeof s.waterAt !== "object") s.waterAt = {};
    Object.keys(s.water || {}).forEach(function (iso) { if (!s.waterAt[iso]) s.waterAt[iso] = t; });
    if (!s.settingsAt) s.settingsAt = t;

    s.schema = SCHEMA;
    return s;
  }

  function persist() {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Cauldron: save failed (storage full or blocked).", e);
      if (global.UI && global.UI.toast) global.UI.toast("Couldn't save — storage is blocked or full.", "alert");
    }
  }

  function emit() {
    for (var i = 0; i < subs.length; i++) {
      try { subs[i](state); } catch (e) { console.error(e); }
    }
  }

  function commit(silent) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 120);
    if (!silent) emit();
    if (global.Sync && global.Sync.onLocalChange) global.Sync.onLocalChange();
  }

  /* ---------- macros ---------- */
  function trackedMacros() {
    var picked = state.settings.trackedMacros || [];
    return MACROS.filter(function (m) { return picked.indexOf(m.key) >= 0; });
  }
  function macroGoal(key) {
    var g = state.settings.macroGoals || {};
    return g[key] != null ? g[key] : (MACRO_BY_KEY[key] ? MACRO_BY_KEY[key].goal : 0);
  }
  function macroDef(key) { return MACRO_BY_KEY[key]; }

  /** Sum every tracked macro for one day. */
  function macroTotals(iso) {
    var day = dayMeals(iso), out = {};
    MACROS.forEach(function (m) { out[m.key] = 0; });
    SLOTS.forEach(function (slot) {
      day[slot].forEach(function (item) {
        var mac = item.macros || {};
        MACROS.forEach(function (m) { out[m.key] += num(mac[m.key]); });
      });
    });
    return out;
  }

  /** Mean daily intake of each macro across days that have any meals logged. */
  function macroAverages(fromIso, toIso) {
    var sums = {}, days = 0;
    MACROS.forEach(function (m) { sums[m.key] = 0; });
    for (var iso = fromIso; iso <= toIso; iso = D.add(iso, 1)) {
      if (!state.meals[iso]) continue;
      var t = dayTotals(iso);
      if (!t.count) continue;
      days++;
      MACROS.forEach(function (m) { sums[m.key] += t.macros[m.key]; });
    }
    if (!days) return null;
    var out = { days: days };
    MACROS.forEach(function (m) { out[m.key] = sums[m.key] / days; });
    return out;
  }

  /**
   * How a day reads against a goal.
   * target: 100% is success, over is fine. limit: over is the failure case.
   */
  function macroStatus(key, value) {
    var def = MACRO_BY_KEY[key], goal = macroGoal(key);
    if (!goal) return { pct: 0, tone: "", label: "" };
    var pct = Math.round((value / goal) * 100);
    if (!def || def.type === "target") {
      return { pct: Math.min(100, pct), rawPct: pct, over: false,
               tone: pct >= 100 ? "good" : "", label: pct >= 100 ? "met" : Math.round(goal - value) + " to go" };
    }
    var over = value > goal;
    return { pct: Math.min(100, pct), rawPct: pct, over: over,
             tone: over ? "danger" : pct >= 85 ? "warn" : "good",
             label: over ? Math.round(value - goal) + " over" : Math.round(goal - value) + " left" };
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

  function cleanMacros(src) {
    var out = {};
    MACROS.forEach(function (m) {
      var v = src && src[m.key];
      if (v !== undefined && v !== null && v !== "" && num(v) !== 0) out[m.key] = num(v);
    });
    return out;
  }

  function addMeal(iso, slot, item) {
    var entry = touch({
      id: uid(),
      date: iso,
      slot: slot,
      name: (item.name || "").trim() || "Untitled",
      note: item.note || "",
      macros: cleanMacros(item.macros || item),
      done: !!item.done,
    });
    dayMeals(iso)[slot].push(entry);
    commit();
    return entry;
  }

  function findMeal(iso, slot, id) {
    return dayMeals(iso)[slot].find(function (m) { return m.id === id; }) || null;
  }

  function updateMeal(iso, slot, id, patch) {
    var it = findMeal(iso, slot, id);
    if (!it) return null;
    if (patch.name !== undefined) it.name = String(patch.name).trim() || it.name;
    if (patch.note !== undefined) it.note = patch.note;
    if (patch.done !== undefined) it.done = !!patch.done;
    if (patch.macros !== undefined) it.macros = cleanMacros(patch.macros);
    touch(it);
    commit();
    return it;
  }

  /** Returns an undo token so the caller can offer "Undo". */
  function removeMeal(iso, slot, id) {
    var list = dayMeals(iso)[slot];
    var i = list.findIndex(function (m) { return m.id === id; });
    if (i < 0) return null;
    var item = list.splice(i, 1)[0];
    tomb("meal", id);
    commit();
    return { kind: "meal", iso: iso, slot: slot, index: i, record: item };
  }

  function moveMeal(fromIso, fromSlot, id, toIso, toSlot) {
    var list = dayMeals(fromIso)[fromSlot];
    var i = list.findIndex(function (m) { return m.id === id; });
    if (i < 0) return;
    var item = list.splice(i, 1)[0];
    item.date = toIso; item.slot = toSlot;
    touch(item);
    dayMeals(toIso)[toSlot].push(item);
    commit();
  }

  function copyDay(fromIso, toIso) {
    var src = dayMeals(fromIso), dst = dayMeals(toIso), n = 0;
    SLOTS.forEach(function (s) {
      src[s].forEach(function (m) {
        dst[s].push(touch({
          id: uid(), date: toIso, slot: s, name: m.name, note: m.note,
          macros: Object.assign({}, m.macros), done: false,
        }));
        n++;
      });
    });
    commit();
    return n;
  }

  /** Returns an undo token holding the whole day. */
  function clearDay(iso) {
    var snapshot = JSON.parse(JSON.stringify(dayMeals(iso)));
    SLOTS.forEach(function (s) {
      snapshot[s].forEach(function (m) { tomb("meal", m.id); });
    });
    state.meals[iso] = { breakfast: [], lunch: [], dinner: [], snack: [] };
    commit();
    return { kind: "day", iso: iso, record: snapshot };
  }

  function dayTotals(iso) {
    var d = dayMeals(iso), count = 0, done = 0;
    SLOTS.forEach(function (s) {
      d[s].forEach(function (m) { count++; if (m.done) done++; });
    });
    return { count: count, done: done, macros: macroTotals(iso) };
  }

  /* ---------- foods ----------
     A small, personal database: the things actually eaten, with the
     macros for one serving. Kept local so search stays instant. */

  function cleanFood(src, existing) {
    var f = existing || {};
    return {
      id: f.id || uid(),
      name: (src.name !== undefined ? String(src.name) : f.name || "").trim() || "Untitled",
      brand: (src.brand !== undefined ? String(src.brand) : f.brand || "").trim(),
      serving: (src.serving !== undefined ? String(src.serving) : f.serving || "").trim() || "1 serving",
      macros: src.macros !== undefined ? cleanMacros(src.macros) : (f.macros || {}),
      note: src.note !== undefined ? src.note : (f.note || ""),
      fav: src.fav !== undefined ? !!src.fav : !!f.fav,
      verified: src.verified !== undefined ? !!src.verified : !!f.verified,
      useCount: f.useCount || 0,
      lastUsed: f.lastUsed || null,
      updatedAt: now(),
    };
  }

  function addFood(src) {
    var f = cleanFood(src);
    state.foods.push(f);
    commit();
    return f;
  }

  function updateFood(id, patch) {
    var i = state.foods.findIndex(function (f) { return f.id === id; });
    if (i < 0) return null;
    state.foods[i] = cleanFood(patch, state.foods[i]);
    commit();
    return state.foods[i];
  }

  function removeFood(id) {
    var i = state.foods.findIndex(function (f) { return f.id === id; });
    if (i < 0) return null;
    var rec = state.foods.splice(i, 1)[0];
    tomb("food", id);
    commit();
    return { kind: "food", index: i, record: rec };
  }

  function getFood(id) {
    return state.foods.find(function (f) { return f.id === id; }) || null;
  }

  /** Bump usage so the things eaten often float to the top of search. */
  function noteFoodUsed(id) {
    var f = getFood(id);
    if (!f) return;
    f.useCount = (f.useCount || 0) + 1;
    f.lastUsed = D.today();
    f.updatedAt = now();
    commit(true);
  }

  /**
   * Substring search over name and brand.
   * Ranking, in order: name starts with the query, then brand match,
   * then how often it's eaten, then favourites, then alphabetical.
   * With no query, returns the most-used first — which is what you
   * want when the search box is still empty.
   */
  function searchFoods(query, limit) {
    var q = String(query || "").trim().toLowerCase();
    var list = state.foods.slice();

    if (q) {
      list = list.filter(function (f) {
        return (f.name + " " + f.brand).toLowerCase().indexOf(q) >= 0;
      });
    }

    list.sort(function (a, b) {
      if (q) {
        var an = a.name.toLowerCase().indexOf(q) === 0 ? 0 : 1;
        var bn = b.name.toLowerCase().indexOf(q) === 0 ? 0 : 1;
        if (an !== bn) return an - bn;
      }
      if ((b.useCount || 0) !== (a.useCount || 0)) return (b.useCount || 0) - (a.useCount || 0);
      if (!!b.fav !== !!a.fav) return b.fav ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    return limit ? list.slice(0, limit) : list;
  }

  /** Scale a food's macros for a quantity, e.g. 2 tacos. */
  function scaleMacros(macros, qty) {
    var n = parseFloat(qty);
    if (!isFinite(n) || n <= 0) n = 1;
    var out = {};
    Object.keys(macros || {}).forEach(function (k) {
      out[k] = Math.round(macros[k] * n * 100) / 100;
    });
    return out;
  }

  /** Load the starter library once. Never overwrites existing entries. */
  function seedFoods(seed) {
    if (state.seededFoods || !seed || !seed.length) return 0;
    var have = {};
    state.foods.forEach(function (f) { have[(f.brand + "|" + f.name).toLowerCase()] = true; });
    var added = 0;
    seed.forEach(function (item) {
      if (have[((item.brand || "") + "|" + item.name).toLowerCase()]) return;
      state.foods.push(cleanFood(item));
      added++;
    });
    state.seededFoods = true;
    commit(true);
    return added;
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
  var EFFECTS = ["Nausea", "Fatigue", "Constipation", "Diarrhea", "Headache",
                 "Heartburn", "Burping", "Site soreness", "Low appetite", "Dizziness"];

  function shotsSorted() {
    return state.shots.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }
  function lastShot() { return shotsSorted()[0] || null; }

  function addShot(s) {
    var entry = touch({
      id: uid(),
      date: s.date || D.today(),
      dose: num(s.dose) || state.settings.currentDose,
      site: s.site || suggestSite(),
      effects: Array.isArray(s.effects) ? s.effects.slice() : [],
      notes: s.notes || "",
      weight: s.weight === "" || s.weight == null ? null : num(s.weight),
    });
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
    touch(s);
    commit();
    return s;
  }

  function removeShot(id) {
    var i = state.shots.findIndex(function (s) { return s.id === id; });
    if (i < 0) return null;
    var rec = state.shots.splice(i, 1)[0];
    tomb("shot", id);
    commit();
    return { kind: "shot", index: i, record: rec };
  }

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
  function nextShotDate() {
    var last = lastShot();
    return last ? D.add(last.date, 7) : null;
  }
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

  /* ---------- activity ---------- */
  var ACTIVITY_TYPES = ["Walk", "Run", "Strength", "Yoga", "Cycle", "Swim", "Dance", "Hike", "Pilates", "Other"];

  function addActivity(a) {
    var entry = touch({
      id: uid(),
      date: a.date || D.today(),
      type: a.type || "Walk",
      minutes: Math.max(0, Math.round(num(a.minutes))),
      intensity: a.intensity || "moderate",
      notes: a.notes || "",
    });
    state.activities.push(entry);
    commit();
    return entry;
  }
  function updateActivity(id, patch) {
    var a = state.activities.find(function (x) { return x.id === id; });
    if (!a) return null;
    ["date", "type", "intensity", "notes"].forEach(function (k) { if (patch[k] !== undefined) a[k] = patch[k]; });
    if (patch.minutes !== undefined) a.minutes = Math.max(0, Math.round(num(patch.minutes)));
    touch(a);
    commit();
    return a;
  }
  function removeActivity(id) {
    var i = state.activities.findIndex(function (a) { return a.id === id; });
    if (i < 0) return null;
    var rec = state.activities.splice(i, 1)[0];
    tomb("activity", id);
    commit();
    return { kind: "activity", index: i, record: rec };
  }
  function activitiesOn(iso) {
    return state.activities.filter(function (a) { return a.date === iso; });
  }
  function activitiesBetween(fromIso, toIso) {
    return state.activities.filter(function (a) { return a.date >= fromIso && a.date <= toIso; });
  }
  function weekMinutes(anyIso) {
    var start = D.weekStart(anyIso || D.today(), state.settings.startDow);
    return activitiesBetween(start, D.add(start, 6)).reduce(function (t, a) { return t + a.minutes; }, 0);
  }
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
    state.waterAt = state.waterAt || {};
    state.waterAt[iso] = now();
    commit();
    return v;
  }
  function bumpWater(iso, delta) { return setWater(iso, water(iso) + delta); }

  /* ---------- weight ---------- */
  function addWeight(iso, value, silent) {
    var v = num(value);
    if (!v) return null;
    var existing = state.weights.find(function (w) { return w.date === iso; });
    if (existing) { existing.value = v; touch(existing); }
    else { state.weights.push(touch({ id: uid(), date: iso, value: v })); }
    untomb("weight", iso);
    if (!silent) commit();
    return v;
  }
  function removeWeight(id) {
    var i = state.weights.findIndex(function (w) { return w.id === id; });
    if (i < 0) return null;
    var rec = state.weights.splice(i, 1)[0];
    tomb("weight", id);
    commit();
    return { kind: "weight", index: i, record: rec };
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

  /* ---------- undo ---------- */
  /** Put back whatever a remove* call returned. */
  function undo(token) {
    if (!token) return false;
    if (token.kind === "meal") {
      var list = dayMeals(token.iso)[token.slot];
      list.splice(Math.min(token.index, list.length), 0, touch(token.record));
      untomb("meal", token.record.id);
    } else if (token.kind === "day") {
      state.meals[token.iso] = token.record;
      SLOTS.forEach(function (s) {
        (token.record[s] || []).forEach(function (m) { touch(m); untomb("meal", m.id); });
      });
    } else if (token.kind === "shot") {
      state.shots.splice(Math.min(token.index, state.shots.length), 0, touch(token.record));
      untomb("shot", token.record.id);
    } else if (token.kind === "activity") {
      state.activities.splice(Math.min(token.index, state.activities.length), 0, touch(token.record));
      untomb("activity", token.record.id);
    } else if (token.kind === "weight") {
      state.weights.splice(Math.min(token.index, state.weights.length), 0, touch(token.record));
      untomb("weight", token.record.id);
    } else if (token.kind === "food") {
      state.foods.splice(Math.min(token.index, state.foods.length), 0, touch(token.record));
      untomb("food", token.record.id);
    } else {
      return false;
    }
    commit();
    return true;
  }

  /* ---------- import / export ---------- */
  function exportJSON() { return JSON.stringify(state, null, 2); }

  function unionById(a, b) {
    var out = (a || []).slice(), seen = {};
    out.forEach(function (x) { seen[x.id] = true; });
    (b || []).forEach(function (x) { if (x && !seen[x.id]) { out.push(x); seen[x.id] = true; } });
    return out;
  }

  function importJSON(text, mode) {
    var incoming = JSON.parse(text);
    if (!incoming || typeof incoming !== "object") throw new Error("Not a Cauldron backup.");
    if (mode === "merge") {
      var merged = deepMerge(JSON.parse(JSON.stringify(state)), incoming);
      merged.shots = unionById(state.shots, incoming.shots);
      merged.activities = unionById(state.activities, incoming.activities);
      merged.weights = unionById(state.weights, incoming.weights);
      merged.foods = unionById(state.foods, incoming.foods);
      state = migrate(merged);
    } else {
      state = migrate(deepMerge(defaults(), incoming));
    }
    commit();
    return true;
  }

  function reset() {
    var sync = state.sync;   // keep the connection, wipe the data
    state = defaults();
    state.sync = sync;
    commit();
  }

  /* ---------- public ---------- */
  var Store = {
    D: D,
    SLOTS: SLOTS,
    SITES: SITES,
    EFFECTS: EFFECTS,
    ACTIVITY_TYPES: ACTIVITY_TYPES,
    MACROS: MACROS,

    get state() { return state; },
    get settings() { return state.settings; },
    set state(v) { state = v; },

    load: load, commit: commit, uid: uid, touch: touch, migrate: migrate, defaults: defaults,
    now: now, tomb: tomb, untomb: untomb,
    subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (s) { return s !== fn; }); }; },

    set: function (path, value, silent) {
      var parts = path.split("."), o = state;
      for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
      o[parts[parts.length - 1]] = value;
      if (parts[0] === "settings") state.settingsAt = now();
      commit(silent);
    },

    trackedMacros: trackedMacros, macroGoal: macroGoal, macroDef: macroDef,
    macroTotals: macroTotals, macroAverages: macroAverages, macroStatus: macroStatus,

    dayMeals: dayMeals, findMeal: findMeal, addMeal: addMeal, updateMeal: updateMeal,
    removeMeal: removeMeal, moveMeal: moveMeal, copyDay: copyDay, clearDay: clearDay,
    dayTotals: dayTotals,

    addFood: addFood, updateFood: updateFood, removeFood: removeFood, getFood: getFood,
    searchFoods: searchFoods, noteFoodUsed: noteFoodUsed, scaleMacros: scaleMacros,
    seedFoods: seedFoods, cleanMacros: cleanMacros,

    shotsSorted: shotsSorted, lastShot: lastShot, addShot: addShot, updateShot: updateShot,
    removeShot: removeShot, suggestSite: suggestSite, siteLabel: siteLabel,
    nextShotDate: nextShotDate, shotStreak: shotStreak,

    addActivity: addActivity, updateActivity: updateActivity, removeActivity: removeActivity,
    activitiesOn: activitiesOn, activitiesBetween: activitiesBetween,
    weekMinutes: weekMinutes, moveStreak: moveStreak,

    water: water, setWater: setWater, bumpWater: bumpWater,

    addWeight: addWeight, removeWeight: removeWeight, weightsSorted: weightsSorted,
    latestWeight: latestWeight, weightChange: weightChange,

    undo: undo,
    exportJSON: exportJSON, importJSON: importJSON, reset: reset,
  };

  global.Store = Store;
})(window);
