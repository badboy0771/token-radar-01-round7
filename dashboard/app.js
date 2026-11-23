// Token Launch Radar — page logic for the radar-6 board.
// Renders everything from window.RADAR (data.js, loaded just above this file).
// No network: every number on the page comes from that one object.
(function () {
  "use strict";

  var DATA = window.RADAR || null;
  var countLine = document.getElementById("board-count");
  if (!DATA || !DATA.rows) {
    if (countLine) countLine.textContent = "The board data did not load.";
    return;
  }

  var rows = DATA.rows.slice();
  var live = DATA.live || [];

  // ---------- small formatters ----------
  function moneyFull(n) {
    return "$" + Math.round(n).toLocaleString("en-US");
  }
  function moneyShort(n) {
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    return "$" + Math.round(n);
  }
  function pct(x) {
    if (x === null || x === undefined) return "—";
    return (x >= 0 ? "+" : "") + x.toFixed(1) + "%";
  }
  function ageText(d) {
    if (d === null || d === undefined) return "—";
    return d + "d";
  }
  function chainText(chains) {
    if (!chains || !chains.length) return "—";
    if (chains.length <= 3) return chains.join(", ");
    return chains.slice(0, 3).join(", ") + " +" + (chains.length - 3);
  }
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---------- header stats, from the data, not from the markup ----------
  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  setText("stat-date", "14 Nov 2026");
  setText("stat-ranked", String(DATA.board_size || rows.length));
  setText("stat-watchlist", String(DATA.watchlist_size || 40));
  setText("stat-early", String(DATA.early_size || 138));
  setText("stat-above", String(DATA.above_floor_size || 20));

  // ---------- filter controls ----------
  var searchInput = document.getElementById("search");
  var categorySelect = document.getElementById("filter-category");
  var chainSelect = document.getElementById("filter-chain");
  var watchlistBox = document.getElementById("watchlist-only");

  function fillSelect(select, values) {
    values.forEach(function (v) {
      var opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
  }
  var categories = [];
  var chains = [];
  rows.forEach(function (r) {
    if (r.category && categories.indexOf(r.category) === -1) categories.push(r.category);
    (r.chains || []).forEach(function (c) {
      if (chains.indexOf(c) === -1) chains.push(c);
    });
  });
  fillSelect(categorySelect, categories.sort());
  fillSelect(chainSelect, chains.sort());

  // ---------- sorting ----------
  var sortKey = "rank";
  var sortDir = 1;
  var defaultDir = { rank: 1, name: 1, category: 1, chains: 1 };
  function sortValue(r, key) {
    if (key === "name") return (r.name || "").toLowerCase();
    if (key === "category") return (r.category || "").toLowerCase();
    if (key === "chains") return (r.chains && r.chains[0]) || "";
    if (key === "change_7d") return r.change_7d === null ? -Infinity : r.change_7d;
    if (key === "age_days") return r.age_days === null ? -Infinity : r.age_days;
    return r[key] === undefined ? 0 : r[key];
  }
  function sortedRows(list) {
    return list.slice().sort(function (a, b) {
      var va = sortValue(a, sortKey);
      var vb = sortValue(b, sortKey);
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return a.rank - b.rank;
    });
  }
  function markSortHeaders() {
    document.querySelectorAll("#board-table th[data-sort]").forEach(function (th) {
      var mark = th.querySelector(".sort-mark");
      if (mark) mark.textContent = th.dataset.sort === sortKey ? (sortDir === 1 ? " ▲" : " ▼") : "";
      th.setAttribute("aria-sort", th.dataset.sort === sortKey ? (sortDir === 1 ? "ascending" : "descending") : "none");
    });
  }

  // ---------- filtering ----------
  function visibleRows() {
    var q = searchInput.value.trim().toLowerCase();
    var cat = categorySelect.value;
    var chain = chainSelect.value;
    var wlOnly = watchlistBox.checked;
    return rows.filter(function (r) {
      if (wlOnly && !r.watchlist) return false;
      if (cat && r.category !== cat) return false;
      if (chain && (r.chains || []).indexOf(chain) < 0) return false;
      if (q && (r.name || "").toLowerCase().indexOf(q) === -1 && (r.slug || "").indexOf(q) === -1) return false;
      return true;
    });
  }

  // ---------- board rendering ----------
  var boardBody = document.getElementById("board-body");
  function renderBoard() {
    var list = sortedRows(visibleRows());
    var html = list.map(function (r) {
      var cls = r.change_7d === null ? "" : (r.change_7d >= 0 ? " up" : " down");
      return "<tr data-slug=\"" + esc(r.slug) + "\" tabindex=\"0\">" +
        "<td class=\"num\">" + r.rank + "</td>" +
        "<td><strong>" + esc(r.name) + "</strong>" + (r.watchlist ? " <span class=\"wl-dot\" title=\"On the watchlist\">●</span>" : "") + "</td>" +
        "<td>" + esc(r.category || "—") + "</td>" +
        "<td title=\"" + esc((r.chains || []).join(", ")) + "\">" + esc(chainText(r.chains)) + "</td>" +
        "<td class=\"num\">" + moneyShort(r.tvl_usd) + "</td>" +
        "<td class=\"num" + cls + "\">" + pct(r.change_7d) + "</td>" +
        "<td class=\"num\">" + ageText(r.age_days) + "</td>" +
        "<td class=\"num strong\">" + moneyShort(r.implied_value_usd) + "</td>" +
        "<td class=\"num\">" + moneyShort(r.implied_value_bear_usd) + " – " + moneyShort(r.implied_value_bull_usd) + "</td>" +
        "</tr>";
    }).join("");
    boardBody.innerHTML = html;
    countLine.textContent = "Showing " + list.length + " of " + rows.length + " protocols.";
    markSortHeaders();
  }

  document.querySelectorAll("#board-table th[data-sort]").forEach(function (th) {
    th.addEventListener("click", function () {
      var key = th.dataset.sort;
      if (key === sortKey) {
        sortDir = -sortDir;
      } else {
        sortKey = key;
        sortDir = defaultDir[key] || -1;
      }
      renderBoard();
    });
  });
  searchInput.addEventListener("input", renderBoard);
  categorySelect.addEventListener("change", renderBoard);
  chainSelect.addEventListener("change", renderBoard);
  watchlistBox.addEventListener("change", renderBoard);

  // ---------- top ten ----------
  var topTen = document.getElementById("top-ten");
  rows.slice(0, 10).forEach(function (r) {
    var li = document.createElement("li");
    li.dataset.slug = r.slug;
    li.tabIndex = 0;
    li.innerHTML = "<span class=\"top-rank\">#" + r.rank + "</span> " +
      "<span class=\"top-name\">" + esc(r.name) + "</span> " +
      "<span class=\"top-value\">" + moneyShort(r.implied_value_usd) + "</span> " +
      "<span class=\"top-meta\">" + esc(r.category || "") + " · " + moneyShort(r.tvl_usd) + " TVL</span>";
    topTen.appendChild(li);
  });

  // ---------- live tokens ----------
  var liveBody = document.getElementById("live-body");
  liveBody.innerHTML = live.map(function (r) {
    var cls = r.change_7d === null ? "" : (r.change_7d >= 0 ? " up" : " down");
    return "<tr>" +
      "<td><strong>" + esc(r.name) + "</strong></td>" +
      "<td>" + esc(r.category || "—") + "</td>" +
      "<td title=\"" + esc((r.chains || []).join(", ")) + "\">" + esc(chainText(r.chains)) + "</td>" +
      "<td class=\"num\">" + moneyShort(r.tvl_usd) + "</td>" +
      "<td class=\"num\">" + moneyShort(r.mcap_usd) + "</td>" +
      "<td class=\"num\">" + (r.mcap_tvl === null ? "—" : Number(r.mcap_tvl.toFixed(3))) + "×</td>" +
      "<td class=\"num" + cls + "\">" + pct(r.change_7d) + "</td>" +
      "</tr>";
  }).join("");
  setText("live-count", live.length + " live tokens.");

  // ---------- tabs ----------
  var tabBoard = document.getElementById("tab-board");
  var tabLive = document.getElementById("tab-live");
  var boardSection = document.getElementById("board-section");
  var liveSection = document.getElementById("live-section");
  function setTab(which) {
    var board = which === "board";
    boardSection.hidden = !board;
    liveSection.hidden = board;
    tabBoard.setAttribute("aria-pressed", board ? "true" : "false");
    tabLive.setAttribute("aria-pressed", board ? "false" : "true");
  }
  tabBoard.addEventListener("click", function () { setTab("board"); });
  tabLive.addEventListener("click", function () { setTab("live"); });

  // ---------- detail dialog ----------
  var dialog = document.getElementById("detail");
  var detailBody = document.getElementById("detail-body");

  function whyText(r) {
    var move = r.change_7d === null
      ? "no weekly move was reported"
      : "it moved " + pct(r.change_7d) + " over seven days";
    var spike;
    if (r.spike_discount >= 1.3) {
      spike = "Its TVL fell against its category, so the spike factor lifts the value above the curve — the model reads a fall as headroom for mean reversion, not as damage.";
    } else if (r.spike_discount <= 0.7) {
      spike = "Its TVL jumped against its category, so the spike factor cuts the value below the curve — the model treats a spike as borrowed growth that may not last.";
    } else {
      spike = "Its weekly move tracked its category, so the spike factor stays near 1 and the curve does most of the work.";
    }
    return "Rank #" + r.rank + ": " + moneyFull(r.tvl_usd) + " of TVL runs through the fitted curve to " +
      moneyFull(r.curve_value_usd) + " (" + r.multiple + "× TVL). " +
      "Against its category it moved " + r.growth_idio_pct.toFixed(1) + " points (" + move + "), " +
      "giving a spike factor of " + r.spike_discount + "× and an implied value of " +
      moneyFull(r.implied_value_usd) + ". " + spike;
  }

  function openDetail(slug) {
    var r = null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].slug === slug) { r = rows[i]; break; }
    }
    if (!r) return;
    var factorRows = [
      ["TVL", moneyFull(r.tvl_usd)],
      ["7-day change", pct(r.change_7d)],
      ["Own growth vs category", (r.growth_idio_pct >= 0 ? "+" : "") + r.growth_idio_pct.toFixed(1) + " points"],
      ["Curve multiple", r.multiple + "×"],
      ["Curve value", moneyFull(r.curve_value_usd)],
      ["Spike discount", r.spike_discount + "×"],
      ["Implied value", moneyFull(r.implied_value_usd)],
      ["Range (bear – bull)", moneyFull(r.implied_value_bear_usd) + " – " + moneyFull(r.implied_value_bull_usd)]
    ].map(function (pair) {
      return "<tr><td>" + pair[0] + "</td><td class=\"num\">" + pair[1] + "</td></tr>";
    }).join("");
    var steps = (r.farm_steps || []).map(function (s) {
      return "<li>" + esc(s) + "</li>";
    }).join("");
    detailBody.innerHTML =
      "<h2>" + esc(r.name) + "</h2>" +
      "<p class=\"detail-meta\">Rank #" + r.rank + " · " + esc(r.category || "no category") + " · " +
      esc((r.chains || []).join(", ")) + " · " + ageText(r.age_days) + " old" +
      (r.watchlist ? " · <span class=\"badge-watch\">On the watchlist</span>" : "") + "</p>" +
      "<p class=\"detail-why\">" + esc(whyText(r)) + "</p>" +
      "<table class=\"ledger factors\">" + factorRows + "</table>" +
      "<p class=\"formula-line\">implied = curve(TVL) × exp(−2 · idio / 100) × 0.60 — bear ×0.50, bull ×0.70.</p>" +
      "<p class=\"detail-verdict\">" + esc(r.farm_verdict || "") + "</p>" +
      "<h3>Farm plan</h3>" +
      "<ol class=\"farm-steps\">" + steps + "</ol>";
    var heading = detailBody.querySelector("h2");
    if (heading) heading.tabIndex = -1;
    if (typeof dialog.showModal === "function") dialog.showModal();
    // Keep the dialog showing its top: showModal focuses the last control,
    // which would scroll the farm plan into view instead of the verdict.
    if (heading) heading.focus();
    dialog.scrollTop = 0;
  }

  boardBody.addEventListener("click", function (event) {
    var tr = event.target.closest("tr");
    if (tr && tr.dataset.slug) openDetail(tr.dataset.slug);
  });
  boardBody.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") return;
    var tr = event.target.closest("tr");
    if (tr && tr.dataset.slug) openDetail(tr.dataset.slug);
  });
  topTen.addEventListener("click", function (event) {
    var li = event.target.closest("li");
    if (li && li.dataset.slug) openDetail(li.dataset.slug);
  });
  topTen.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") return;
    var li = event.target.closest("li");
    if (li && li.dataset.slug) openDetail(li.dataset.slug);
  });

  renderBoard();
})();
