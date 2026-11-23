// Token Radar's page, model radar-6: the board, the detail view and the filters, all from window.RADAR.
(function () {
  'use strict';
  var R = window.RADAR;
  if (!R) return;

  function fmtUsd(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n;
  }
  function fmtPct(n) {
    if (n === null || n === undefined) return '—';
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return '—';
    if (days < 365) return days + 'd';
    return (days / 365).toFixed(1) + 'y';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- Header stats and footer.
  document.getElementById('stat-asof').textContent = R.as_of;
  document.getElementById('stat-board').textContent = String(R.board_size);
  document.getElementById('stat-watchlist').textContent = String(R.watchlist_size);
  document.getElementById('stat-early').textContent = String(R.early_size);
  document.getElementById('stat-above').textContent = String(R.above_floor_size);
  document.getElementById('foot-source').textContent = R.source;
  document.getElementById('foot-asof').textContent = R.as_of;

  // ---- Top 10.
  var top10 = document.getElementById('top10-list');
  R.rows.slice(0, 10).forEach(function (r) {
    var li = document.createElement('li');
    li.innerHTML = '<button class="top10-row" data-slug="' + esc(r.slug) + '"><span class="top10-rank">#' +
      r.rank + '</span> <span class="top10-name">' + esc(r.name) + '</span> <span class="top10-cat">' +
      esc(r.category || '—') + '</span> <span class="top10-value">' + fmtUsd(r.implied_value_usd) + '</span></button>';
    top10.appendChild(li);
  });

  // ---- Filter selects.
  var cats = {}, chains = {};
  R.rows.forEach(function (r) {
    if (r.category) cats[r.category] = true;
    r.chains.forEach(function (ch) { chains[ch] = true; });
  });
  var catSel = document.getElementById('category');
  Object.keys(cats).sort().forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    catSel.appendChild(o);
  });
  var chainSel = document.getElementById('chain');
  Object.keys(chains).sort().forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    chainSel.appendChild(o);
  });

  // ---- Board rendering, sorting and filtering.
  var state = { sort: 'rank', dir: 1, q: '', category: '', chain: '', watchlistOnly: false };
  var body = document.getElementById('board-body');
  var count = document.getElementById('count');
  var empty = document.getElementById('empty');

  function visibleRows() {
    var q = state.q.trim().toLowerCase();
    var rows = R.rows.filter(function (r) {
      if (state.watchlistOnly && !r.watchlist) return false;
      if (state.category && r.category !== state.category) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var key = state.sort;
    rows.sort(function (a, b) {
      var av = a[key], bv = b[key];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'string') return av.localeCompare(bv) * state.dir;
      return (av - bv) * state.dir;
    });
    return rows;
  }

  function renderBoard() {
    var rows = visibleRows();
    body.innerHTML = '';
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.dataset.slug = r.slug;
      var range = fmtUsd(r.implied_value_bear_usd) + ' – ' + fmtUsd(r.implied_value_bull_usd);
      var badges = (r.watchlist ? ' <span class="badge">watchlist</span>' : '') +
        (r.rank <= 20 ? ' <span class="badge badge-high">farm first</span>' : '');
      tr.innerHTML = '<td>' + r.rank + '</td><td class="name">' + esc(r.name) + badges +
        '</td><td>' + esc(r.category || '—') +
        '</td><td>' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') +
        '</td><td>' + fmtUsd(r.tvl_usd) + '</td><td>' + fmtPct(r.change_7d) + '</td><td>' + fmtAge(r.age_days) +
        '</td><td class="value">' + fmtUsd(r.implied_value_usd) + '</td><td class="range">' + range + '</td>';
      body.appendChild(tr);
    });
    count.textContent = rows.length + ' of ' + R.rows.length + ' protocols';
    empty.hidden = rows.length > 0;
  }

  document.querySelectorAll('#board-table th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var key = th.dataset.sort;
      if (state.sort === key) state.dir = -state.dir;
      else { state.sort = key; state.dir = key === 'rank' ? 1 : -1; }
      renderBoard();
    });
  });
  document.getElementById('q').addEventListener('input', function (e) { state.q = e.target.value; renderBoard(); });
  catSel.addEventListener('change', function (e) { state.category = e.target.value; renderBoard(); });
  chainSel.addEventListener('change', function (e) { state.chain = e.target.value; renderBoard(); });
  document.getElementById('watchlist-only').addEventListener('change', function (e) { state.watchlistOnly = e.target.checked; renderBoard(); });

  // ---- Live token view.
  var liveBody = document.getElementById('live-body');
  R.live.forEach(function (p) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td class="name">' + esc(p.name) + '</td><td>' + esc(p.category || '—') + '</td><td>' +
      esc(p.chains.slice(0, 3).join(', ')) + '</td><td>' + fmtUsd(p.tvl_usd) + '</td><td>' + fmtPct(p.change_7d) +
      '</td><td>' + fmtUsd(p.mcap_usd) + '</td><td>' + (p.mcap_tvl === null ? '—' : p.mcap_tvl.toFixed(3) + '×') + '</td>';
    liveBody.appendChild(tr);
  });

  var tabPre = document.getElementById('tab-pre');
  var tabLive = document.getElementById('tab-live');
  var boardSection = document.querySelector('.board');
  var liveSection = document.getElementById('live-section');
  var filters = document.querySelector('.filters');
  function showLive(on) {
    tabPre.classList.toggle('active', !on);
    tabLive.classList.toggle('active', on);
    tabPre.setAttribute('aria-selected', String(!on));
    tabLive.setAttribute('aria-selected', String(on));
    boardSection.hidden = on;
    liveSection.hidden = !on;
    filters.style.visibility = on ? 'hidden' : 'visible';
    document.getElementById('count').style.visibility = on ? 'hidden' : 'visible';
  }
  tabPre.addEventListener('click', function () { showLive(false); });
  tabLive.addEventListener('click', function () { showLive(true); });

  // ---- Detail dialog.
  var dialog = document.getElementById('detail');
  var detailBody = document.getElementById('detail-body');
  function whyRank(r) {
    // One plain sentence naming what most lifts this row and what most holds
    // it back, from the model's own numbers: the curve multiple at its TVL
    // and the spike discount on its own seven-day move. Radar-6's spike
    // discount spans 0.30-1.82 (k = -2), wider than radar-5's 0.55-1.35,
    // so the thresholds move with it: a discount at or above 1.3 means
    // the protocol fell against its category that week, at or below 0.7
    // its TVL spiked against its category.
    var ups = [];
    var downs = [];
    if (r.multiple >= 0.2) ups.push('a rich curve multiple (' + r.multiple.toFixed(3) + '× at its size)');
    else if (r.multiple >= 0.08) ups.push('a mid curve multiple (' + r.multiple.toFixed(3) + '× at its size)');
    if (r.spike_discount >= 1.3) ups.push('TVL that fell against its category (spike discount ×' + r.spike_discount.toFixed(2) + ')');
    if (r.spike_discount <= 0.7) downs.push('its TVL spiked against its category (spike discount ×' + r.spike_discount.toFixed(2) + ')');
    if (r.multiple <= 0.05) downs.push('a thin curve multiple at its size (' + r.multiple.toFixed(3) + '×)');
    var s = 'Ranked #' + r.rank + ' because it is ' + fmtUsd(r.tvl_usd) + ' of TVL';
    if (ups.length > 0) s += ' and ' + ups.join(', ');
    s += '.';
    if (downs.length > 0) s += ' Held back by ' + downs.join(', ') + '.';
    return s;
  }
  function openDetail(slug) {
    var r = null;
    for (var i = 0; i < R.rows.length; i++) if (R.rows[i].slug === slug) { r = R.rows[i]; break; }
    if (!r) return;
    var rangePct = Math.round((r.implied_value_bull_usd - r.implied_value_bear_usd) / r.implied_value_usd * 100);
    var steps = r.farm_steps.map(function (s, i) {
      return '<li><span class="step-n">' + (i + 1) + '.</span> ' + esc(s) + '</li>';
    }).join('');
    var mcapNote = r.mcap_usd ? '<p class="detail-sub">Note: this protocol records a market cap of ' +
      fmtUsd(r.mcap_usd) + ' but no token id, so the watchlist still lists it — the value above is the model’s, not the market’s.</p>' : '';
    detailBody.innerHTML =
      '<h2>#' + r.rank + ' ' + esc(r.name) + '</h2>' +
      '<p class="detail-sub">' + esc(r.category || 'No category') + ' · ' + esc(r.chains.join(', ')) +
      (r.watchlist ? ' · <span class="badge">on the watchlist</span>' : '') + '</p>' +
      '<p class="detail-why">' + esc(whyRank(r)) + '</p>' +
      '<p class="detail-verdict">' + esc(r.farm_verdict) + '</p>' +
      '<dl class="factors">' +
      '<div><dt>TVL</dt><dd>' + fmtUsd(r.tvl_usd) + '</dd></div>' +
      '<div><dt>7d change</dt><dd>' + fmtPct(r.change_7d) + '</dd></div>' +
      '<div><dt>Own growth (vs category)</dt><dd>' + fmtPct(r.growth_idio_pct) + '</dd></div>' +
      '<div><dt>Curve multiple</dt><dd>' + r.multiple.toFixed(3) + '× (fitted, 128 peers)</dd></div>' +
      '<div><dt>Curve value</dt><dd>' + fmtUsd(r.curve_value_usd) + '</dd></div>' +
      '<div><dt>Spike discount</dt><dd>×' + r.spike_discount.toFixed(3) + '</dd></div>' +
      '<div><dt>Implied value</dt><dd class="value">' + fmtUsd(r.implied_value_usd) + '</dd></div>' +
      '<div><dt>Range (bear – bull)</dt><dd>' + fmtUsd(r.implied_value_bear_usd) + ' – ' + fmtUsd(r.implied_value_bull_usd) + ' (±' + rangePct + '%)</dd></div>' +
      '</dl>' +
      '<p class="detail-formula">curve(' + fmtUsd(r.tvl_usd) + ') = ' + fmtUsd(r.curve_value_usd) +
      ' × ' + r.spike_discount.toFixed(3) + ' × 0.60 = ' + fmtUsd(r.implied_value_usd) + '. Bear × 0.50, bull × 0.70.</p>' + mcapNote +
      '<h3>Farm plan</h3><ol class="farm">' + steps + '</ol>';
    if (typeof dialog.showModal === 'function') dialog.showModal();
  }
  body.addEventListener('click', function (e) {
    var tr = e.target.closest('tr');
    if (tr && tr.dataset.slug) openDetail(tr.dataset.slug);
  });
  top10.addEventListener('click', function (e) {
    var b = e.target.closest('[data-slug]');
    if (b) openDetail(b.dataset.slug);
  });

  renderBoard();
})();
