/* ============================================================
   UI — rendering helpers, modals, toasts, tiny charts.
   No framework: template strings + event delegation.
   ============================================================ */
(function (global) {
  "use strict";

  /* ---------- escaping ---------- */
  var ENT = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(v) {
    if (v == null) return "";
    return String(v).replace(/[&<>"']/g, function (c) { return ENT[c]; });
  }
  function attr(v) { return esc(v); }

  /* ---------- numbers ---------- */
  function fmt(n, dp) {
    if (n == null || !isFinite(n)) return "—";
    var d = dp == null ? (Math.abs(n % 1) > 0.001 ? 1 : 0) : dp;
    return n.toFixed(d).replace(/\.0$/, "");
  }
  function signed(n, dp) {
    if (n == null || !isFinite(n)) return "—";
    return (n > 0 ? "+" : "") + fmt(n, dp);
  }
  function pct(a, b) {
    if (!b) return 0;
    return Math.max(0, Math.min(100, Math.round((a / b) * 100)));
  }

  /* ---------- icon shorthand ---------- */
  function ico(name, cls) {
    return '<span class="ico ' + (cls || "") + '" data-icon="' + attr(name) + '"></span>';
  }

  /* ---------- toast ---------- */
  function toast(message, iconName, opts) {
    opts = opts || {};
    var root = document.getElementById("toastRoot");
    if (!root) return;

    var el = document.createElement("div");
    el.className = "toast" + (iconName === "check" ? " good" : "") + (opts.actionLabel ? " has-action" : "");
    el.innerHTML = ico(iconName || "check") + "<span>" + esc(message) + "</span>" +
      (opts.actionLabel ? '<button class="toast-action" data-toast-action>' + esc(opts.actionLabel) + "</button>" : "");
    root.appendChild(el);
    Icons.hydrate(el);

    var timer = setTimeout(dismiss, opts.duration || 2300);
    function dismiss() {
      clearTimeout(timer);
      el.classList.add("out");
      setTimeout(function () { el.remove(); }, 260);
    }
    if (opts.actionLabel) {
      el.querySelector("[data-toast-action]").addEventListener("click", function () {
        dismiss();
        if (opts.onAction) opts.onAction();
      });
    }
    return dismiss;
  }

  /**
   * Confirm-free delete: act immediately, but give a real window to take it
   * back. `token` is the undo handle a Store remove call returns.
   */
  function undoToast(message, token) {
    if (!token) return toast(message);
    return toast(message, "trash", {
      actionLabel: "Undo",
      duration: 7000,
      onAction: function () {
        if (Store.undo(token)) toast("Restored", "check");
      },
    });
  }

  /* ---------- macros ---------- */
  /**
   * One row per tracked macro: value against goal, with a bar whose tone
   * reflects whether the macro is something to reach or something to stay under.
   */
  function macroRows(totals, opts) {
    opts = opts || {};
    var tracked = Store.trackedMacros();
    if (!tracked.length) {
      return '<p class="tiny faint">No macros tracked yet — pick some in Settings.</p>';
    }
    return '<div class="macros">' + tracked.map(function (m) {
      var value = totals[m.key] || 0;
      var goal = Store.macroGoal(m.key);
      var st = Store.macroStatus(m.key, value);
      return (
        '<div class="macro">' +
          '<div class="macro-head">' +
            '<span class="macro-name">' + esc(m.label) + "</span>" +
            '<span class="macro-val mono">' + fmt(value, m.decimals) +
              '<span class="faint">' + (m.unit ? m.unit : "") + " / " + fmt(goal, m.decimals) + m.unit + "</span></span>" +
          "</div>" +
          '<div class="bar ' + (st.tone || "") + '"><i style="width:' + st.pct + '%"></i></div>' +
          (opts.hideLabels ? "" :
            '<div class="macro-foot"><span class="' + (st.over ? "over" : "") + '">' + esc(st.label) + "</span></div>") +
        "</div>"
      );
    }).join("") + "</div>";
  }

  /** Compact inline chips, for tight spots like a day column. */
  function macroChips(totals) {
    return Store.trackedMacros().map(function (m) {
      var v = totals[m.key] || 0;
      if (!v) return "";
      var st = Store.macroStatus(m.key, v);
      return '<span class="chip ' + (st.over ? "danger" : "") + '">' +
        fmt(v, m.decimals) + m.unit + " " + esc(m.label.toLowerCase()) + "</span>";
    }).join("");
  }

  /* ---------- modal ---------- */
  var modalStack = [];

  function modal(opts) {
    var root = document.getElementById("modalRoot");
    var prevFocus = document.activeElement;

    var el = document.createElement("div");
    el.className = "modal" + (opts.wide ? " wide" : "");
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", opts.title || "Dialog");
    el.innerHTML =
      '<div class="modal-head">' +
        (opts.icon ? ico(opts.icon) : "") +
        "<h2>" + esc(opts.title || "") + "</h2>" +
        '<button class="icon-btn sm bare push" data-close aria-label="Close">' + ico("x") + "</button>" +
      "</div>" +
      '<div class="modal-body">' + (opts.body || "") + "</div>" +
      (opts.foot === false ? "" : '<div class="modal-foot">' + (opts.foot || '<button class="btn" data-close>Close</button>') + "</div>");

    root.innerHTML = "";
    root.appendChild(el);
    root.hidden = false;
    Icons.hydrate(root);

    var handle = {
      el: el,
      close: function () { close(); },
      body: el.querySelector(".modal-body"),
      $: function (sel) { return el.querySelector(sel); },
      $$: function (sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); },
    };

    function close() {
      root.hidden = true;
      root.innerHTML = "";
      document.removeEventListener("keydown", onKey);
      root.removeEventListener("click", onClick);
      modalStack.pop();
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      if (opts.onClose) opts.onClose();
    }

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "Tab") trapFocus(e, el);
      if (e.key === "Enter" && opts.submitOnEnter && e.target.tagName !== "TEXTAREA") {
        var go = el.querySelector("[data-primary]");
        if (go) { e.preventDefault(); go.click(); }
      }
    }

    function onClick(e) {
      if (e.target === root) { close(); return; }
      if (e.target.closest("[data-close]")) { close(); }
    }

    document.addEventListener("keydown", onKey);
    root.addEventListener("click", onClick);
    modalStack.push(handle);

    // focus the first meaningful control
    var first = el.querySelector("input:not([type=hidden]), select, textarea, [data-primary]");
    if (first) setTimeout(function () { first.focus(); if (first.select) first.select(); }, 30);

    if (opts.onMount) opts.onMount(handle);
    return handle;
  }

  function trapFocus(e, container) {
    var f = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /** Promise-based confirm dialog. */
  function confirm(opts) {
    return new Promise(function (resolve) {
      var settled = false;
      var m = modal({
        title: opts.title || "Are you sure?",
        icon: opts.icon || "alert",
        body: '<p class="muted">' + esc(opts.message || "") + "</p>",
        foot:
          '<button class="btn" data-close>' + esc(opts.cancelLabel || "Cancel") + "</button>" +
          '<button class="btn ' + (opts.danger ? "danger" : "primary") + '" data-primary data-go>' +
            esc(opts.confirmLabel || "Confirm") + "</button>",
        submitOnEnter: true,
        onClose: function () { if (!settled) { settled = true; resolve(false); } },
      });
      m.$("[data-go]").addEventListener("click", function () {
        settled = true;
        m.close();
        resolve(true);
      });
    });
  }

  /* ---------- files ---------- */
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function pickFile(accept) {
    return new Promise(function (resolve, reject) {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = accept || ".json,application/json";
      input.style.display = "none";
      document.body.appendChild(input);
      input.addEventListener("change", function () {
        var f = input.files && input.files[0];
        input.remove();
        if (!f) { reject(new Error("No file chosen")); return; }
        var r = new FileReader();
        r.onload = function () { resolve({ name: f.name, text: String(r.result) }); };
        r.onerror = function () { reject(new Error("Could not read that file")); };
        r.readAsText(f);
      });
      input.click();
    });
  }

  /* ---------- progress ring ---------- */
  var ringSeq = 0;
  function ring(percent, big, small, opts) {
    opts = opts || {};
    var r = 46, c = 2 * Math.PI * r;
    var p = Math.max(0, Math.min(100, percent || 0));
    var off = c * (1 - p / 100);
    var id = "rg" + (++ringSeq);
    var from = opts.from || "var(--primary)";
    var to = opts.to || "var(--accent)";
    return (
      '<div class="ring"' + (opts.size ? ' style="--ring-size:' + opts.size + 'px"' : "") + ">" +
        '<svg viewBox="0 0 108 108" role="img" aria-label="' + attr(big + " " + small) + '">' +
          "<defs><linearGradient id=\"" + id + "\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">" +
            '<stop offset="0%" stop-color="' + from + '"/><stop offset="100%" stop-color="' + to + '"/>' +
          "</linearGradient></defs>" +
          '<circle class="track" cx="54" cy="54" r="' + r + '"/>' +
          '<circle class="fill" cx="54" cy="54" r="' + r + '" style="stroke:url(#' + id + ')" ' +
            'stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
        "</svg>" +
        '<div class="center"><b>' + esc(big) + "</b><span>" + esc(small) + "</span></div>" +
      "</div>"
    );
  }

  function bar(percent, cls) {
    var p = Math.max(0, Math.min(100, percent || 0));
    return '<div class="bar ' + (cls || "") + '"><i style="width:' + p + '%"></i></div>';
  }

  /* ---------- line chart ---------- */
  /**
   * points: [{ x: isoDate, y: number }] in ascending x order.
   * Returns a responsive SVG with an area fill, dots and min/max labels.
   */
  function lineChart(points, opts) {
    opts = opts || {};
    var W = 640, H = opts.height || 190;
    var padL = 42, padR = 14, padT = 16, padB = 26;

    if (!points || points.length === 0) {
      return '<div class="empty tiny">Nothing charted yet.</div>';
    }
    if (points.length === 1) {
      points = [{ x: points[0].x, y: points[0].y }, { x: points[0].x, y: points[0].y }];
    }

    var ys = points.map(function (p) { return p.y; });
    var min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
    if (min === max) { min -= 1; max += 1; }
    var padY = (max - min) * 0.15;
    min -= padY; max += padY;

    var iw = W - padL - padR, ih = H - padT - padB;
    var sx = function (i) { return padL + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw); };
    var sy = function (v) { return padT + ih - ((v - min) / (max - min)) * ih; };

    var line = points.map(function (p, i) { return (i ? "L" : "M") + sx(i).toFixed(1) + " " + sy(p.y).toFixed(1); }).join(" ");
    var area = line + " L" + sx(points.length - 1).toFixed(1) + " " + (padT + ih) + " L" + sx(0).toFixed(1) + " " + (padT + ih) + " Z";

    var id = "lc" + (++ringSeq);
    var grid = "";
    for (var g = 0; g <= 3; g++) {
      var gy = padT + (ih / 3) * g;
      var gv = max - ((max - min) / 3) * g;
      grid += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) +
              '" stroke="var(--border-soft)" stroke-width="1"/>' +
              '<text x="' + (padL - 7) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" font-size="10" ' +
              'fill="var(--text-faint)" font-weight="700">' + fmt(gv, opts.dp == null ? 0 : opts.dp) + "</text>";
    }

    var dots = "";
    var showEvery = Math.max(1, Math.ceil(points.length / 24));
    points.forEach(function (p, i) {
      if (i % showEvery !== 0 && i !== points.length - 1) return;
      dots += '<circle cx="' + sx(i).toFixed(1) + '" cy="' + sy(p.y).toFixed(1) + '" r="3" ' +
              'fill="var(--bg)" stroke="var(--primary)" stroke-width="2"><title>' +
              esc(Store.D.monthDay(p.x) + " · " + fmt(p.y, opts.dp == null ? 1 : opts.dp) + (opts.unit ? " " + opts.unit : "")) +
              "</title></circle>";
    });

    var firstLbl = Store.D.monthDay(points[0].x);
    var lastLbl = Store.D.monthDay(points[points.length - 1].x);

    return (
      '<svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;height:auto;display:block" preserveAspectRatio="none" role="img">' +
        "<defs><linearGradient id=\"" + id + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">" +
          '<stop offset="0%" stop-color="var(--primary)" stop-opacity=".34"/>' +
          '<stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/>' +
        "</linearGradient></defs>" +
        grid +
        '<path d="' + area + '" fill="url(#' + id + ')"/>' +
        '<path d="' + line + '" fill="none" stroke="var(--primary)" stroke-width="2.4" ' +
          'stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
        dots +
        '<text x="' + padL + '" y="' + (H - 6) + '" font-size="10" fill="var(--text-faint)" font-weight="700">' + esc(firstLbl) + "</text>" +
        '<text x="' + (W - padR) + '" y="' + (H - 6) + '" text-anchor="end" font-size="10" fill="var(--text-faint)" font-weight="700">' + esc(lastLbl) + "</text>" +
      "</svg>"
    );
  }

  /**
   * Vertical bar chart. The plot area and the labels are separate rows so the
   * goal line can be positioned as an exact percentage of the bar height.
   */
  function barChart(bars, opts) {
    opts = opts || {};
    if (!bars.length) return '<div class="empty tiny">Nothing to chart yet.</div>';

    var max = Math.max.apply(null, bars.map(function (b) { return b.value; }).concat([opts.goal || 0, 1]));

    var cols = bars.map(function (b) {
      var h = (b.value / max) * 100;
      return '<div class="barchart-col" title="' + attr(b.label + ": " + fmt(b.value) + (opts.unit || "")) + '">' +
               '<div class="barchart-fill' + (b.highlight ? " on" : "") +
                 '" style="height:' + (b.value > 0 ? Math.max(3, h) : 0).toFixed(1) + '%"></div>' +
             "</div>";
    }).join("");

    var goalLine = opts.goal
      ? '<div class="barchart-goal" style="bottom:' + ((opts.goal / max) * 100).toFixed(1) + '%"></div>'
      : "";

    var labels = bars.map(function (b) {
      return '<span class="barchart-lbl">' + esc(b.label) + "</span>";
    }).join("");

    return '<div class="barchart">' +
             '<div class="barchart-plot">' + cols + goalLine + "</div>" +
             '<div class="barchart-labels">' + labels + "</div>" +
           "</div>";
  }

  /* ---------- form field builders ---------- */
  function field(label, control, hint) {
    return '<div class="field"><label>' + esc(label) + "</label>" + control +
           (hint ? '<span class="hint">' + esc(hint) + "</span>" : "") + "</div>";
  }
  function input(name, value, opts) {
    opts = opts || {};
    return '<input type="' + (opts.type || "text") + '" name="' + attr(name) + '" value="' + attr(value == null ? "" : value) + '"' +
      (opts.placeholder ? ' placeholder="' + attr(opts.placeholder) + '"' : "") +
      (opts.min != null ? ' min="' + opts.min + '"' : "") +
      (opts.max != null ? ' max="' + opts.max + '"' : "") +
      (opts.step != null ? ' step="' + opts.step + '"' : "") +
      (opts.inputmode ? ' inputmode="' + opts.inputmode + '"' : "") + ">";
  }
  function textarea(name, value, placeholder) {
    return '<textarea name="' + attr(name) + '" placeholder="' + attr(placeholder || "") + '">' + esc(value || "") + "</textarea>";
  }
  function select(name, options, value) {
    return '<select name="' + attr(name) + '">' + options.map(function (o) {
      var v = o.value != null ? o.value : o;
      var l = o.label != null ? o.label : o;
      return '<option value="' + attr(v) + '"' + (String(v) === String(value) ? " selected" : "") + ">" + esc(l) + "</option>";
    }).join("") + "</select>";
  }

  /** Read a modal's inputs into a plain object. */
  function readForm(scope) {
    var out = {};
    scope.querySelectorAll("[name]").forEach(function (el) {
      if (el.type === "checkbox") {
        if (el.dataset.multi) {
          out[el.name] = out[el.name] || [];
          if (el.checked) out[el.name].push(el.value);
        } else {
          out[el.name] = el.checked;
        }
      } else {
        out[el.name] = el.value;
      }
    });
    return out;
  }

  /* ---------- misc ---------- */
  function empty(iconName, title, message, actionHTML) {
    return '<div class="empty">' + ico(iconName) +
      "<h3>" + esc(title) + "</h3>" +
      (message ? "<p>" + esc(message) + "</p>" : "") +
      (actionHTML || "") + "</div>";
  }

  global.UI = {
    esc: esc, attr: attr, fmt: fmt, signed: signed, pct: pct, ico: ico,
    toast: toast, undoToast: undoToast, modal: modal, confirm: confirm,
    macroRows: macroRows, macroChips: macroChips,
    download: download, pickFile: pickFile,
    ring: ring, bar: bar, lineChart: lineChart, barChart: barChart,
    field: field, input: input, textarea: textarea, select: select,
    readForm: readForm, empty: empty,
  };
})(window);

/* Shared presentation metadata for meal slots. */
window.UI.SLOT_META = {
  breakfast: { label: "Breakfast", icon: "mug" },
  lunch:     { label: "Lunch",     icon: "bowl" },
  dinner:    { label: "Dinner",    icon: "utensils" },
  snack:     { label: "Snacks",    icon: "apple" },
};
