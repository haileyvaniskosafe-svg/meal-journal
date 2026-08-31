/* ============================================================
   SYNC — optional Supabase backing for multi-device use.

   The app is local-first: everything works with sync switched off,
   and every write still lands in localStorage immediately. Sync is
   a background reconciliation on top of that.

   Talks to Supabase's REST endpoints directly (GoTrue for auth,
   PostgREST for data) rather than pulling in the SDK, so the app
   keeps its no-dependency, works-offline character.

   Merge rule: last write wins per record, compared on the client
   clock (`updatedAt`). The pull cursor uses the SERVER clock
   (`synced_at`) instead, so a device with a wrong clock can still
   never hide its own writes from the next pull.
   ============================================================ */
(function (global) {
  "use strict";

  var AUTH_KEY = "cauldron.auth";     // tokens live outside the synced blob
  var PUSH_DEBOUNCE = 2500;
  var POLL_MS = 60000;

  var auth = null;        // { access_token, refresh_token, expires_at, user_id, email }
  var status = "off";     // off | signed-out | ok | syncing | error | offline
  var lastError = "";
  var lastSyncAt = 0;
  var pushTimer = null;
  var pollTimer = null;
  var running = false;
  var listeners = [];

  /* ---------- config ---------- */
  /**
   * The connection in use. Anything saved in Settings wins; otherwise we fall
   * back to the project baked into js/config.js, so a new device only has to
   * sign in. `ignoreBuiltIn` is set when someone deliberately disconnects.
   */
  function cfg() {
    var s = (global.Store && global.Store.state.sync) || {};
    var built = (!s.ignoreBuiltIn && global.CAULDRON_CONFIG) || {};
    return {
      url: s.url || built.supabaseUrl || "",
      anonKey: s.anonKey || built.supabaseAnonKey || "",
      lastPulledAt: s.lastPulledAt || 0,
      lastPushedAt: s.lastPushedAt || 0,
      email: s.email || "",
      builtIn: !s.url && !!built.supabaseUrl,
    };
  }
  function isConfigured() { return !!(cfg().url && cfg().anonKey); }
  function isSignedIn() { return !!(auth && auth.access_token); }

  function baseUrl() { return String(cfg().url || "").replace(/\/+$/, ""); }

  function notify() {
    listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
  }
  function setStatus(s, err) {
    status = s;
    lastError = err || "";
    notify();
  }

  /* ---------- token storage ---------- */
  function loadAuth() {
    try {
      var raw = global.localStorage.getItem(AUTH_KEY);
      auth = raw ? JSON.parse(raw) : null;
    } catch (e) { auth = null; }
    status = !isConfigured() ? "off" : isSignedIn() ? "ok" : "signed-out";
  }
  function saveAuth(a) {
    auth = a;
    try {
      if (a) global.localStorage.setItem(AUTH_KEY, JSON.stringify(a));
      else global.localStorage.removeItem(AUTH_KEY);
    } catch (e) { /* private mode — session stays in memory only */ }
  }

  /** Decode the `sub` (user id) and `email` out of a JWT payload. */
  function decodeJwt(token) {
    try {
      var part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(decodeURIComponent(escape(atob(part))));
    } catch (e) { return {}; }
  }

  function adoptSession(json) {
    var claims = decodeJwt(json.access_token);
    saveAuth({
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: Date.now() + (json.expires_in || 3600) * 1000,
      user_id: claims.sub,
      email: claims.email || (json.user && json.user.email) || "",
    });
    if (global.Store) Store.set("sync.email", auth.email, true);
    return auth;
  }

  /* ---------- http ---------- */
  function api(path, opts) {
    opts = opts || {};
    var headers = Object.assign({
      apikey: cfg().anonKey,
      "Content-Type": "application/json",
    }, opts.headers || {});
    if (opts.auth !== false && isSignedIn()) {
      headers.Authorization = "Bearer " + auth.access_token;
    }
    return fetch(baseUrl() + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (res) {
      if (res.status === 204) return null;
      return res.text().then(function (text) {
        var json = null;
        try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
        if (!res.ok) {
          var msg = (json && (json.msg || json.message || json.error_description || json.error)) ||
                    ("Request failed (" + res.status + ")");
          var err = new Error(msg);
          err.status = res.status;
          throw err;
        }
        return json;
      });
    });
  }

  /** Refresh once on a 401, then retry the original call. */
  function apiAuthed(path, opts) {
    return api(path, opts).catch(function (err) {
      if (err.status !== 401 || !auth || !auth.refresh_token) throw err;
      return refresh().then(function () { return api(path, opts); });
    });
  }

  function refresh() {
    return api("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      auth: false,
      body: { refresh_token: auth.refresh_token },
    }).then(adoptSession);
  }

  /* ---------- auth ---------- */
  function redirectTarget() {
    return global.location.origin + global.location.pathname;
  }

  /**
   * Password sign-in. Preferred over magic links here because Supabase's
   * built-in email service allows only 2 messages an hour, which makes
   * link-based sign-in painful when setting up a second device.
   */
  function signInWithPassword(email, password) {
    if (!isConfigured()) return Promise.reject(new Error("Sync isn't set up yet."));
    return api("/auth/v1/token?grant_type=password", {
      method: "POST",
      auth: false,
      body: { email: String(email).trim(), password: password },
    }).then(adoptSession).then(afterSignIn);
  }

  /**
   * Create the account. Supabase only returns a session here when email
   * confirmation is switched off for the project; otherwise it sends a
   * confirmation mail and we have to say so.
   */
  function signUpWithPassword(email, password) {
    if (!isConfigured()) return Promise.reject(new Error("Sync isn't set up yet."));
    return api("/auth/v1/signup", {
      method: "POST",
      auth: false,
      body: { email: String(email).trim(), password: password },
    }).then(function (json) {
      if (!json || !json.access_token) {
        var err = new Error(
          "Account created, but this project asks for email confirmation. " +
          "Either check your inbox, or turn confirmation off in Supabase " +
          "(Authentication → Sign In / Providers → Email)."
        );
        err.code = "needs_confirmation";
        throw err;
      }
      return adoptSession(json);
    }).then(afterSignIn);
  }

  function afterSignIn() {
    setStatus("ok");
    startPolling();
    return sync().catch(function () { /* status already reflects it */ });
  }

  /** Email the user a magic link back to this page. */
  function signIn(email) {
    if (!isConfigured()) return Promise.reject(new Error("Add your Supabase URL and key first."));
    return api("/auth/v1/otp?redirect_to=" + encodeURIComponent(redirectTarget()), {
      method: "POST",
      auth: false,
      body: { email: String(email).trim(), create_user: true },
    });
  }

  /**
   * Magic links come back as #access_token=...  The app's own router also
   * lives in the hash, so this has to run before routing and clean up after
   * itself. Returns true if it consumed an auth redirect.
   */
  function handleAuthRedirect() {
    var hash = global.location.hash || "";
    if (hash.indexOf("access_token=") < 0) {
      // PKCE-style links land as ?code=... which this flow doesn't issue.
      return false;
    }
    var params = new URLSearchParams(hash.replace(/^#/, ""));
    var access = params.get("access_token");
    if (!access) return false;

    adoptSession({
      access_token: access,
      refresh_token: params.get("refresh_token"),
      expires_in: parseInt(params.get("expires_in"), 10) || 3600,
    });

    // strip the tokens out of the address bar before the router sees them
    try {
      global.history.replaceState(null, "", redirectTarget() + "#/settings");
    } catch (e) {
      global.location.hash = "#/settings";
    }
    setStatus("ok");
    return true;
  }

  function signOut() {
    var had = isSignedIn();
    if (had) {
      api("/auth/v1/logout", { method: "POST" }).catch(function () { /* best effort */ });
    }
    saveAuth(null);
    if (global.Store) {
      Store.set("sync.lastPulledAt", 0, true);
      Store.set("sync.email", "", true);
    }
    setStatus(isConfigured() ? "signed-out" : "off");
  }

  /* ---------- local <-> record mapping ---------- */
  var ARRAY_KINDS = { shot: "shots", activity: "activities", weight: "weights", favorite: "favorites" };

  /** Flatten local state into sync records. */
  function localRecords() {
    var s = Store.state, out = [];

    Object.keys(s.meals).forEach(function (iso) {
      Store.SLOTS.forEach(function (slot) {
        (s.meals[iso][slot] || []).forEach(function (m) {
          out.push({ kind: "meal", id: m.id, data: m, updatedAt: m.updatedAt || 0 });
        });
      });
    });

    Object.keys(ARRAY_KINDS).forEach(function (kind) {
      (s[ARRAY_KINDS[kind]] || []).forEach(function (r) {
        out.push({ kind: kind, id: r.id, data: r, updatedAt: r.updatedAt || 0 });
      });
    });

    Object.keys(s.water || {}).forEach(function (iso) {
      out.push({ kind: "water", id: iso, data: { cups: s.water[iso] },
                 updatedAt: (s.waterAt && s.waterAt[iso]) || 0 });
    });

    Object.keys(s.customThemes || {}).forEach(function (id) {
      var t = s.customThemes[id];
      out.push({ kind: "theme", id: id, data: t, updatedAt: t.updatedAt || 0 });
    });

    out.push({ kind: "settings", id: "singleton", data: s.settings, updatedAt: s.settingsAt || 0 });

    (s.tombstones || []).forEach(function (t) {
      out.push({ kind: t.kind, id: t.id, data: null, updatedAt: t.at || 0, deleted: true });
    });

    return out;
  }

  /** The client clock we hold for one record, or 0 if we don't have it. */
  function localStampFor(kind, id) {
    var s = Store.state;
    if (kind === "meal") {
      var found = findMeal(id);
      return found ? (found.item.updatedAt || 0) : tombstoneStamp(kind, id);
    }
    if (ARRAY_KINDS[kind]) {
      var rec = (s[ARRAY_KINDS[kind]] || []).find(function (r) { return r.id === id; });
      return rec ? (rec.updatedAt || 0) : tombstoneStamp(kind, id);
    }
    if (kind === "water") return (s.waterAt && s.waterAt[id]) || tombstoneStamp(kind, id);
    if (kind === "theme") {
      var t = (s.customThemes || {})[id];
      return t ? (t.updatedAt || 0) : tombstoneStamp(kind, id);
    }
    if (kind === "settings") return s.settingsAt || 0;
    return 0;
  }

  function tombstoneStamp(kind, id) {
    var t = (Store.state.tombstones || []).find(function (x) { return x.kind === kind && x.id === id; });
    return t ? t.at : 0;
  }

  function findMeal(id) {
    var s = Store.state;
    var days = Object.keys(s.meals);
    for (var i = 0; i < days.length; i++) {
      for (var j = 0; j < Store.SLOTS.length; j++) {
        var slot = Store.SLOTS[j];
        var list = s.meals[days[i]][slot] || [];
        var k = list.findIndex(function (m) { return m.id === id; });
        if (k >= 0) return { iso: days[i], slot: slot, index: k, item: list[k] };
      }
    }
    return null;
  }

  function removeMealById(id) {
    var found = findMeal(id);
    if (found) Store.state.meals[found.iso][found.slot].splice(found.index, 1);
  }

  /** Write one remote record into local state. Caller decides if it's newer. */
  function applyRecord(rec) {
    var s = Store.state;
    var kind = rec.kind, id = rec.id, data = rec.data;

    if (rec.deleted) {
      if (kind === "meal") removeMealById(id);
      else if (ARRAY_KINDS[kind]) {
        s[ARRAY_KINDS[kind]] = (s[ARRAY_KINDS[kind]] || []).filter(function (r) { return r.id !== id; });
      } else if (kind === "water") { delete s.water[id]; if (s.waterAt) delete s.waterAt[id]; }
      else if (kind === "theme") { delete s.customThemes[id]; }
      Store.tomb(kind, id);
      return;
    }
    if (!data) return;

    if (kind === "meal") {
      removeMealById(id);                       // it may have moved day or slot
      var day = Store.dayMeals(data.date || Store.D.today());
      var slot = Store.SLOTS.indexOf(data.slot) >= 0 ? data.slot : "snack";
      day[slot].push(data);
    } else if (ARRAY_KINDS[kind]) {
      var arr = s[ARRAY_KINDS[kind]] || (s[ARRAY_KINDS[kind]] = []);
      var i = arr.findIndex(function (r) { return r.id === id; });
      if (i >= 0) arr[i] = data; else arr.push(data);
    } else if (kind === "water") {
      if (data.cups) { s.water[id] = data.cups; s.waterAt = s.waterAt || {}; s.waterAt[id] = rec.updatedAt; }
      else { delete s.water[id]; }
    } else if (kind === "theme") {
      s.customThemes[id] = data;
    } else if (kind === "settings") {
      // Never let a remote settings row overwrite this device's connection details.
      var keepSync = s.sync;
      Object.assign(s.settings, data);
      s.sync = keepSync;
      s.settingsAt = rec.updatedAt;
    }
    Store.untomb(kind, id);
  }

  /* ---------- pull / push ---------- */
  function pull() {
    var cursor = cfg().lastPulledAt ? new Date(cfg().lastPulledAt).toISOString() : "1970-01-01T00:00:00Z";
    var q = "/rest/v1/records?select=kind,id,data,deleted,updated_at,synced_at" +
            "&synced_at=gt." + encodeURIComponent(cursor) +
            "&order=synced_at.asc&limit=2000";

    return apiAuthed(q).then(function (rows) {
      if (!rows || !rows.length) return 0;
      var applied = 0, newest = cfg().lastPulledAt || 0;

      rows.forEach(function (row) {
        var remoteStamp = new Date(row.updated_at).getTime();
        var localStamp = localStampFor(row.kind, row.id);
        // Strict >: a tie means we already have it, so leave local alone.
        if (remoteStamp > localStamp) {
          applyRecord({ kind: row.kind, id: row.id, data: row.data,
                        deleted: row.deleted, updatedAt: remoteStamp });
          applied++;
        }
        var sv = new Date(row.synced_at).getTime();
        if (sv > newest) newest = sv;
      });

      Store.set("sync.lastPulledAt", newest, true);
      if (applied) Store.commit();          // repaint with whatever arrived
      return applied;
    });
  }

  function push() {
    var since = cfg().lastPushedAt || 0;
    var mine = localRecords().filter(function (r) { return (r.updatedAt || 0) > since; });
    if (!mine.length) return Promise.resolve(0);

    var maxStamp = since;
    var payload = mine.map(function (r) {
      if (r.updatedAt > maxStamp) maxStamp = r.updatedAt;
      return {
        user_id: auth.user_id,
        kind: r.kind,
        id: String(r.id),
        data: r.deleted ? null : r.data,
        deleted: !!r.deleted,
        updated_at: new Date(r.updatedAt).toISOString(),
      };
    });

    return apiAuthed("/rest/v1/records", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: payload,
    }).then(function () {
      Store.set("sync.lastPushedAt", maxStamp, true);
      return payload.length;
    });
  }

  /** Pull first so remote edits land, then push whatever is still ours. */
  function sync(opts) {
    opts = opts || {};
    if (!isConfigured() || !isSignedIn()) return Promise.resolve(null);
    if (running) return Promise.resolve(null);
    if (!global.navigator.onLine) { setStatus("offline"); return Promise.resolve(null); }

    running = true;
    setStatus("syncing");
    return pull()
      .then(function (pulled) {
        return push().then(function (pushed) { return { pulled: pulled, pushed: pushed }; });
      })
      .then(function (result) {
        running = false;
        lastSyncAt = Date.now();
        setStatus("ok");
        if (opts.toast && global.UI) {
          global.UI.toast(result.pulled || result.pushed
            ? "Synced · " + result.pulled + " in, " + result.pushed + " out"
            : "Already up to date", "check");
        }
        return result;
      })
      .catch(function (err) {
        running = false;
        console.warn("Cauldron sync:", err);
        if (err.status === 401) { saveAuth(null); setStatus("signed-out", "Session expired — sign in again."); }
        else setStatus("error", err.message || "Sync failed");
        if (opts.toast && global.UI) global.UI.toast(lastError || "Sync failed", "alert");
        throw err;
      });
  }

  /** Every local write nudges a debounced push. */
  function onLocalChange() {
    if (!isConfigured() || !isSignedIn()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      sync().catch(function () { /* status already reflects it */ });
    }, PUSH_DEBOUNCE);
  }

  function startPolling() {
    clearInterval(pollTimer);
    if (!isConfigured() || !isSignedIn()) return;
    pollTimer = setInterval(function () {
      if (!global.document.hidden) sync().catch(function () {});
    }, POLL_MS);
  }

  /** Recompute the resting status after the connection details change. */
  function configChanged() {
    setStatus(!isConfigured() ? "off" : isSignedIn() ? "ok" : "signed-out");
    if (isConfigured() && isSignedIn()) {
      startPolling();
      sync().catch(function () {});
    } else {
      clearInterval(pollTimer);
    }
  }

  function init() {
    loadAuth();
    var consumed = handleAuthRedirect();

    if (isConfigured() && isSignedIn()) {
      sync().catch(function () {});
      startPolling();
      // coming back to the tab is the moment another device's edits matter
      global.document.addEventListener("visibilitychange", function () {
        if (!global.document.hidden) sync().catch(function () {});
      });
      global.addEventListener("online", function () { sync().catch(function () {}); });
    }
    return consumed;
  }

  global.Sync = {
    init: init,
    config: cfg,
    configChanged: configChanged,
    onLocalChange: onLocalChange,
    sync: sync,
    signIn: signIn,
    signInWithPassword: signInWithPassword,
    signUpWithPassword: signUpWithPassword,
    signOut: signOut,
    handleAuthRedirect: handleAuthRedirect,
    isConfigured: isConfigured,
    isSignedIn: isSignedIn,
    startPolling: startPolling,
    get status() { return status; },
    get lastError() { return lastError; },
    get lastSyncAt() { return lastSyncAt; },
    get email() { return (auth && auth.email) || cfg().email || ""; },
    onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (l) { return l !== fn; }); }; },
    /** Exposed for tests. */
    _internals: { localRecords: localRecords, applyRecord: applyRecord, localStampFor: localStampFor, decodeJwt: decodeJwt },
  };
})(window);
