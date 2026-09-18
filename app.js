(function () {
  "use strict";

  var SECRET_KEY = "myapphub_secret";

  var els = {
    search: document.getElementById("search"),
    status: document.getElementById("status"),
    list: document.getElementById("list"),
    gate: document.getElementById("gate"),
    gateInput: document.getElementById("gate-input"),
    gateSubmit: document.getElementById("gate-submit"),
    gateError: document.getElementById("gate-error"),
    toast: document.getElementById("toast")
  };

  var allApps = [];
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

  function setStatus(text) {
    if (!text) {
      els.status.hidden = true;
      els.status.textContent = "";
    } else {
      els.status.hidden = false;
      els.status.textContent = text;
    }
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.hidden = true; }, 1400);
  }

  function copyText(value, label) {
    if (!value) return;
    var done = function () { toast(label + " copied"); };
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

  function buildCredRow(label, value, isPassword) {
    var row = el("div", "cred-row");
    row.appendChild(el("span", "cred-label", label));

    var valueSpan = el("span", "cred-value", isPassword ? "••••••••" : value);
    row.appendChild(valueSpan);

    var revealed = false;
    if (isPassword) {
      var toggleBtn = el("button", "icon-btn");
      toggleBtn.type = "button";
      toggleBtn.setAttribute("aria-label", "Show password");
      toggleBtn.textContent = "👁";
      toggleBtn.addEventListener("click", function () {
        revealed = !revealed;
        valueSpan.textContent = revealed ? value : "••••••••";
        toggleBtn.textContent = revealed ? "🙈" : "👁";
      });
      row.appendChild(toggleBtn);
    }

    var copyBtn = el("button", "icon-btn");
    copyBtn.type = "button";
    copyBtn.setAttribute("aria-label", "Copy " + label);
    copyBtn.textContent = "📋";
    copyBtn.addEventListener("click", function () {
      copyText(value, label);
    });
    row.appendChild(copyBtn);

    return row;
  }

  function buildCard(app) {
    var li = el("li", "card");

    var top = el("div", "card-top");
    top.appendChild(el("span", "card-name", app.name));

    var openBtn = el("a", "open-btn", "OPEN");
    openBtn.href = app.url || "#";
    openBtn.target = "_blank";
    openBtn.rel = "noopener noreferrer";
    top.appendChild(openBtn);
    li.appendChild(top);

    if (app.username || app.password) {
      var rows = el("div", "cred-rows");
      if (app.username) rows.appendChild(buildCredRow("USER", app.username, false));
      if (app.password) rows.appendChild(buildCredRow("PASS", app.password, true));
      li.appendChild(rows);
    }

    return li;
  }

  function render(apps) {
    els.list.innerHTML = "";
    if (apps.length === 0) {
      var empty = el("div", "empty-state", "No apps found");
      els.list.appendChild(empty);
      return;
    }
    apps.forEach(function (app) {
      els.list.appendChild(buildCard(app));
    });
  }

  function applyFilter() {
    var q = els.search.value.trim().toLowerCase();
    if (!q) {
      render(allApps);
      return;
    }
    render(allApps.filter(function (a) {
      return a.name.toLowerCase().indexOf(q) !== -1;
    }));
  }

  function loadApps(secret) {
    setStatus("Loading...");
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
          setStatus("Something went wrong: " + data.error);
          return;
        }
        allApps = (data.apps || []).sort(function (a, b) {
          return a.name.localeCompare(b.name);
        });
        setStatus("");
        hideGate();
        applyFilter();
      })
      .catch(function () {
        if (seq !== loadSeq) return;
        setStatus("Couldn't connect. Check your internet connection.");
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
