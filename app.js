(function () {
  "use strict";

  var SECRET_KEY = "myapphub_secret";

  // Static, trusted markup only (never built from registry data).
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + inner + "</svg>";
  }

  // App icons, keyed by meaning. Stroke style comes from CSS.
  var ICONS = {
    clipboard: svg('<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5h6V7H9z"/><path d="m9 14 2 2 4-4"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7.5 9 6 9-6"/>'),
    basket: svg('<path d="M4 10h16l-1.6 9a2 2 0 0 1-2 1.7H7.6a2 2 0 0 1-2-1.7L4 10Z"/><path d="m8 10 3-6M16 10l-3-6"/>'),
    home: svg('<path d="M4 11 12 4l8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/><path d="m9.5 15 2 2 3.5-3.5"/>'),
    gauge: svg('<path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="m12 17 4-5"/><circle cx="12" cy="17" r="1.3"/>'),
    cake: svg('<path d="M4 20h16"/><path d="M5 20v-7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v7"/><path d="M5 16.5c2 1.4 3.5 1.4 5 0s3-1.4 4.5 0 3 1.4 4.5 0"/><path d="M12 12V9"/><path d="M12 4.5c1 1 1 2 0 3-1-1-1-2 0-3Z"/>'),
    trend: svg('<path d="M3 17 9 11l4 4 8-8"/><path d="M15 7h6v6"/>'),
    card: svg('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>'),
    calendar: svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>'),
    plane: svg('<path d="m21 4-8.5 17-2.5-7.5L2.5 11 21 4Z"/><path d="m10 13.5 5-5"/>'),
    heart: svg('<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"/>'),
    book: svg('<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>'),
    grid: svg('<rect x="4.5" y="4.5" width="6.5" height="6.5" rx="1.5"/><rect x="13" y="4.5" width="6.5" height="6.5" rx="1.5"/><rect x="4.5" y="13" width="6.5" height="6.5" rx="1.5"/><rect x="13" y="13" width="6.5" height="6.5" rx="1.5"/>'),
    shield: svg('<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>'),
    arrow: svg('<path d="M7 17 17 7"/><path d="M8 7h9v9"/>')
  };

  // First match wins. Order matters (e.g. "Home Helper Hub" is a pantry app, not "home").
  var ICON_RULES = [
    [/task|todo|habit|משימ|הרגל/, "clipboard"],
    [/mail|inbox|דוא|מייל/, "mail"],
    [/pantry|food|grocer|kitchen|helper|מזון|מזווה|מטבח/, "basket"],
    [/routine|chore|home|שגר|בית/, "home"],
    [/hydraul|gauge|calculator|engineer|מחשבון|הידראול/, "gauge"],
    [/birthday|cake|party|הולדת|יומולדת/, "cake"],
    [/financ|budget|money|invest|stock|planning|כספ|תקציב|השקע|פיננס/, "trend"],
    [/subscri|billing|payment|מנוי|תשלום/, "card"],
    [/calendar|schedule|sync|לוח|יומן/, "calendar"],
    [/travel|trip|flight|טיול|טיסה/, "plane"],
    [/health|doctor|diet|fitness|בריאות|רופא|תזונה/, "heart"],
    [/book|read|study|learn|school|ספר|לימוד/, "book"]
  ];

  function iconFor(name) {
    var n = name.toLowerCase();
    for (var i = 0; i < ICON_RULES.length; i++) {
      if (ICON_RULES[i][0].test(n)) return ICONS[ICON_RULES[i][1]];
    }
    return ICONS.grid;
  }

  var ADMIN_RE = /\s*[-–—]\s*admin$/i;

  var els = {
    search: document.getElementById("search"),
    status: document.getElementById("status"),
    count: document.getElementById("count"),
    list: document.getElementById("list"),
    gate: document.getElementById("gate"),
    gateInput: document.getElementById("gate-input"),
    gateSubmit: document.getElementById("gate-submit"),
    gateError: document.getElementById("gate-error"),
    toast: document.getElementById("toast")
  };

  var groups = [];
  var openKeys = {};
  var toastTimer = null;
  var loadSeq = 0;

  function getStoredSecret() {
    try {
      return localStorage.getItem(SECRET_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function storeSecret(secret) {
    try {
      localStorage.setItem(SECRET_KEY, secret);
    } catch (e) {
      /* private browsing / storage blocked — app still works for this load */
    }
  }

  function clearStoredSecret() {
    try {
      localStorage.removeItem(SECRET_KEY);
    } catch (e) {}
  }

  function showGate(message) {
    els.gate.hidden = false;
    if (message) {
      els.gateError.textContent = message;
      els.gateError.hidden = false;
    } else {
      els.gateError.hidden = true;
    }
    setTimeout(function () { els.gateInput.focus(); }, 50);
  }

  function hideGate() {
    els.gate.hidden = true;
  }

  function setStatus(text, isError) {
    if (!text) {
      els.status.hidden = true;
      els.status.textContent = "";
      return;
    }
    els.status.hidden = false;
    els.status.className = isError ? "status error" : "status";
    els.status.textContent = text;
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.hidden = true; }, 1400);
  }

  function copyText(value, label, onOk) {
    if (!value) return;
    var done = function () { toast(label + " copied"); if (onOk) onOk(); };
    var fail = function () { toast("Couldn't copy"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(done, fail);
    } else {
      try {
        var ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        done();
      } catch (e) {
        fail();
      }
    }
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function hasCreds(a) {
    return !!(a && (a.username || a.password));
  }

  function prettyUrl(u) {
    try {
      var x = new URL(u);
      return x.host.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "");
    } catch (e) {
      return u;
    }
  }

  // "X - Admin" is shown under "X" when both exist; otherwise it stands alone.
  function buildGroups(apps) {
    var out = [];
    var byName = {};
    apps.forEach(function (a) {
      if (!ADMIN_RE.test(a.name)) {
        var g = { main: a, admin: null };
        out.push(g);
        byName[a.name.toLowerCase()] = g;
      }
    });
    apps.forEach(function (a) {
      if (!ADMIN_RE.test(a.name)) return;
      var parent = byName[a.name.replace(ADMIN_RE, "").trim().toLowerCase()];
      if (parent) parent.admin = a;
      else out.push({ main: a, admin: null });
    });
    out.sort(function (x, y) { return x.main.name.localeCompare(y.main.name); });
    return out;
  }

  function textButton(label, extraClass) {
    var b = el("button", "text-btn" + (extraClass ? " " + extraClass : ""), label);
    b.type = "button";
    return b;
  }

  function buildCredRow(label, full, value, isPassword) {
    var row = el("div", "cred");
    row.appendChild(el("span", "cred-label", label));

    var valueSpan = el("span", "cred-value", isPassword ? "••••••••" : value);
    row.appendChild(valueSpan);

    if (isPassword) {
      var revealed = false;
      var toggleBtn = textButton("Show");
      toggleBtn.setAttribute("aria-label", "Show password");
      toggleBtn.setAttribute("aria-pressed", "false");
      toggleBtn.addEventListener("click", function () {
        revealed = !revealed;
        valueSpan.textContent = revealed ? value : "••••••••";
        toggleBtn.textContent = revealed ? "Hide" : "Show";
        toggleBtn.setAttribute("aria-label", revealed ? "Hide password" : "Show password");
        toggleBtn.setAttribute("aria-pressed", revealed ? "true" : "false");
      });
      row.appendChild(toggleBtn);
    }

    var copyBtn = textButton("Copy");
    copyBtn.setAttribute("aria-label", "Copy " + full.toLowerCase());
    var copyTimer = null;
    copyBtn.addEventListener("click", function () {
      copyText(value, full, function () {
        copyBtn.textContent = "Copied";
        copyBtn.classList.add("done");
        clearTimeout(copyTimer);
        copyTimer = setTimeout(function () {
          copyBtn.textContent = "Copy";
          copyBtn.classList.remove("done");
        }, 1200);
      });
    });
    row.appendChild(copyBtn);

    return row;
  }

  function buildLogins(g) {
    var panel = el("div", "logins");
    var sections = [];
    if (hasCreds(g.main)) sections.push({ label: g.admin && hasCreds(g.admin) ? "App" : "", app: g.main });
    if (g.admin && hasCreds(g.admin)) sections.push({ label: "Admin", app: g.admin });
    sections.forEach(function (s) {
      if (s.label) panel.appendChild(el("div", "grp", s.label));
      if (s.app.username) panel.appendChild(buildCredRow("User", "Username", s.app.username, false));
      if (s.app.password) panel.appendChild(buildCredRow("Pass", "Password", s.app.password, true));
    });
    return panel;
  }

  function buildEntry(g) {
    var m = g.main;
    var li = el("li", "entry");

    var link = m.url ? el("a", "entry-link") : el("div", "entry-link");
    if (m.url) {
      link.href = m.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", "Open " + m.name);
    }

    var stamp = el("span", "stamp");
    stamp.innerHTML = iconFor(m.name.replace(ADMIN_RE, ""));
    link.appendChild(stamp);

    var text = el("span", "entry-text");
    var name = el("span", "entry-name", m.name);
    name.dir = "auto";
    text.appendChild(name);
    if (m.url) {
      var host = el("span", "entry-host", prettyUrl(m.url));
      host.dir = "ltr";
      text.appendChild(host);
    }
    link.appendChild(text);

    if (m.url) {
      var go = el("span", "");
      go.innerHTML = ICONS.arrow;
      go.firstChild.setAttribute("class", "entry-go");
      link.appendChild(go.firstChild);
    }
    li.appendChild(link);

    var showAdminLink = g.admin && g.admin.url;
    var showLogins = hasCreds(m) || hasCreds(g.admin);
    if (showAdminLink || showLogins) {
      var actions = el("div", "actions");

      if (showAdminLink) {
        var admin = el("a", "admin-link");
        admin.href = g.admin.url;
        admin.target = "_blank";
        admin.rel = "noopener noreferrer";
        admin.setAttribute("aria-label", "Open " + g.admin.name);
        admin.innerHTML = ICONS.shield;
        admin.appendChild(el("span", "", "Admin"));
        actions.appendChild(admin);
      }

      if (showLogins) {
        var key = m.name.toLowerCase();
        var panel = buildLogins(g);
        var isOpen = !!openKeys[key];
        panel.hidden = !isOpen;
        var btn = textButton(isOpen ? "Logins ▴" : "Logins ▾");
        btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        btn.addEventListener("click", function () {
          var open = panel.hidden;
          panel.hidden = !open;
          openKeys[key] = open;
          btn.textContent = open ? "Logins ▴" : "Logins ▾";
          btn.setAttribute("aria-expanded", open ? "true" : "false");
        });
        actions.appendChild(btn);
        li.appendChild(actions);
        li.appendChild(panel);
        return li;
      }
      li.appendChild(actions);
    }

    return li;
  }

  function buildEmpty(title, sub) {
    var box = el("li", "entry empty");
    var t = el("div", "empty-title", title);
    t.dir = "auto";
    box.appendChild(t);
    box.appendChild(el("div", "empty-sub", sub));
    return box;
  }

  function render(list, query) {
    els.list.innerHTML = "";
    if (list.length === 0) {
      els.list.appendChild(query
        ? buildEmpty("No match for “" + query + "”", "Try another name.")
        : buildEmpty("No apps yet", "Tell Claude Code when you finish an app and it will show up here."));
      return;
    }
    list.forEach(function (g) {
      els.list.appendChild(buildEntry(g));
    });
  }

  function applyFilter() {
    var raw = els.search.value.trim();
    var q = raw.toLowerCase();
    if (!q) {
      render(groups, "");
      return;
    }
    render(groups.filter(function (g) {
      return g.main.name.toLowerCase().indexOf(q) !== -1 ||
        (g.admin && g.admin.name.toLowerCase().indexOf(q) !== -1);
    }), raw);
  }

  function loadApps(secret) {
    setStatus("Loading…");
    var seq = ++loadSeq;
    var url = CONFIG.WEB_APP_URL + "?secret=" + encodeURIComponent(secret);
    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (seq !== loadSeq) return; // a newer request already superseded this one
        if (data.error === "unauthorized") {
          clearStoredSecret();
          setStatus("");
          showGate("Wrong passphrase. Try again.");
          return;
        }
        if (data.error) {
          setStatus("Something went wrong: " + data.error, true);
          return;
        }
        groups = buildGroups(data.apps || []);
        els.count.textContent = groups.length === 1 ? "1 app or site" : groups.length + " apps & sites";
        els.count.hidden = false;
        setStatus("");
        hideGate();
        applyFilter();
      })
      .catch(function () {
        if (seq !== loadSeq) return;
        setStatus("Couldn't connect. Check your internet connection.", true);
      });
  }

  function tryUnlock() {
    var secret = els.gateInput.value;
    if (!secret) return;
    storeSecret(secret);
    loadApps(secret);
  }

  els.search.addEventListener("input", applyFilter);
  els.gateSubmit.addEventListener("click", tryUnlock);
  els.gateInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") tryUnlock();
  });

  var stored = getStoredSecret();
  if (stored) {
    loadApps(stored);
  } else {
    showGate();
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
