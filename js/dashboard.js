(function() {
  var stored = localStorage.getItem('dashboardCity');
  var city = (stored === 'Mzuzu') ? stored : 'Mzuzu';
  var renderTimer = null;
  var lastRenderAt = 0;
  var RENDER_COALESCE_MS = 250;

  function debouncedRender(delay) {
    delay = delay != null ? delay : 80;
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(function() {
      renderTimer = null;
      render();
    }, delay);
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function renderNudge(type, message) {
    var icon = typeof getNudgeIcon === 'function' ? getNudgeIcon(type) : '';
    return '<div class="nudge nudge-' + type + '"><span class="nudge-icon">' + icon + '</span><p class="nudge-msg">' + escapeHtml(message) + '</p></div>';
  }

  function renderCityBadge() {
    return '<div class="dash-city-badge" id="dash-city-badge">' +
      '<span class="dash-city-label">Current City:</span>' +
      '<select class="dash-city-select" id="dash-city-select">' +
      '<option value="Lilongwe" disabled>Lilongwe (coming soon)</option>' +
      '<option value="Blantyre" disabled>Blantyre (coming soon)</option>' +
      '<option value="Mzuzu"' + (city === 'Mzuzu' ? ' selected' : '') + '>Mzuzu</option>' +
      '<option value="Zomba" disabled>Zomba (coming soon)</option>' +
      '</select></div>';
  }

  function renderHeroStats(stats) {
    var total = stats && stats.totalSaved != null ? stats.totalSaved : 0;
    var month = stats && stats.monthSaved != null ? stats.monthSaved : 0;
    return '<div class="dash-hero-stats">' +
      '<div class="dash-stat-card dash-stat-primary">' +
      '<span class="dash-stat-label">Total Saved</span>' +
      '<span class="dash-stat-value dash-stat-green">' + formatPrice(total) + '</span>' +
      '<span class="dash-stat-sublabel">Across all smart baskets</span></div>' +
      '<div class="dash-stat-card">' +
      '<span class="dash-stat-label">This Month</span>' +
      '<span class="dash-stat-value">' + formatPrice(month) + '</span></div>' +
      '<div class="dash-stat-card">' +
      '<span class="dash-stat-label">Saved Lists</span>' +
      '<span class="dash-stat-value">' + (stats && stats.savedListsCount != null ? stats.savedListsCount : 0) + '</span></div></div>';
  }

  function renderPriceAlerts(alerts) {
    if (!alerts || alerts.length === 0) return '';
    return '<div class="dash-section"><h2 class="dash-section-title">Active Price Alerts</h2>' +
      '<div class="dash-alerts-scroll">' + alerts.map(function(a) {
        return '<div class="dash-alert-card">' +
          '<span class="dash-alert-badge">Price Drop</span>' +
          '<h4 class="dash-alert-name">' + escapeHtml(a.name) + '</h4>' +
          '<div class="dash-alert-prices">' +
          '<span class="dash-alert-was">' + formatPrice(a.wasPrice) + '</span>' +
          '<span class="dash-alert-now">' + formatPrice(a.nowPrice) + '</span></div>' +
          '<p class="dash-alert-store">Cheapest at ' + escapeHtml(a.cheapestAt || '-') + '</p>' +
          '<button type="button" class="btn btn-secondary btn-sm dash-alert-add" data-id="' + a.productId + '">+ Add to Basket</button>' +
          '</div>';
      }).join('') + '</div></div>';
  }

  function renderWatchlist(items) {
    if (!items || items.length === 0) return '';
    return '<div class="dash-section"><h2 class="dash-section-title">Price Drop Watchlist</h2>' +
      '<div class="dash-watchlist-scroll">' + items.map(function(w) {
        return '<a href="product.html?id=' + w.productId + '" class="dash-watch-card">' +
          '<span class="dash-watch-badge">Current Low</span>' +
          '<h4 class="dash-watch-name">' + escapeHtml(w.product.name) + '</h4>' +
          '<span class="dash-watch-price">' + formatPrice(w.cheapestPrice) + '</span>' +
          '<p class="dash-watch-store">' + escapeHtml(w.cheapestStore ? w.cheapestStore.name : '-') + '</p>' +
          '</a>';
      }).join('') + '</div></div>';
  }

  function renderSavedLists(lists, refreshData) {
    var refreshMap = refreshData || {};
    if (!lists || lists.length === 0) {
      return '<div class="dash-section"><h2 class="dash-section-title">My Saved Lists</h2>' +
        '<div class="card dash-empty-card">' +
        '<p class="dash-empty-msg">You\'re one basket away from saving your first MWK 1,000.</p>' +
        '<p class="dash-empty-sub">Save your basket as a list on the basket page to track prices over time.</p>' +
        '<a href="basket.html" class="btn btn-secondary">Go to Basket</a></div></div>';
    }
    return '<div class="dash-section"><h2 class="dash-section-title">My Saved Lists</h2>' +
      '<div class="dash-lists-grid">' + lists.map(function(list) {
        var rd = refreshMap[list.id];
        var bestPrice = rd ? rd.optimizedTotal : null;
        var bestStore = rd ? rd.bestStore : null;
        var mode = rd ? rd.mode : 'multi_store';
        var itemCount = (list.items || []).reduce(function(s, i) { return s + i.quantity; }, 0);
        return '<div class="dash-list-card" data-id="' + list.id + '">' +
          '<div class="dash-list-header">' +
          '<h3 class="dash-list-name">' + escapeHtml(list.name) + '</h3>' +
          '<div class="dash-list-meta">' + itemCount + ' item' + (itemCount !== 1 ? 's' : '') + '</div></div>' +
          (bestPrice != null ? '<div class="dash-list-best"><span class="dash-list-price">' + formatPrice(bestPrice) + '</span>' +
            (bestStore ? '<span class="dash-list-store">' + escapeHtml(bestStore.name) + '</span>' : '') + '</div>' : '<div class="dash-list-placeholder">Tap Refresh for latest prices</div>') +
          '<div class="dash-list-actions">' +
          '<button type="button" class="btn btn-secondary btn-sm dash-refresh-btn" data-id="' + list.id + '" title="Refresh prices">Refresh Prices</button>' +
          '<div class="dash-list-toggle"><label><input type="checkbox" class="dash-split-toggle" data-id="' + list.id + '" ' + (mode === 'single_store' ? 'checked' : '') + '> Single store</label></div>' +
          '<button type="button" class="btn btn-outline btn-sm dash-load-btn" data-id="' + list.id + '">Load into Basket</button>' +
          '<a href="#" class="dash-share-btn" data-id="' + list.id + '" title="Share via WhatsApp">Share</a></div></div>';
      }).join('') + '</div></div>';
  }

  function renderLeaderboard(leaderboard) {
    if (!leaderboard || leaderboard.length === 0) return '';
    return '<div class="dash-section dash-leaderboard"><h2 class="dash-section-title">Cheapest Store Leaderboard</h2>' +
      '<div class="dash-leaderboard-list">' + leaderboard.map(function(l, i) {
        return '<div class="dash-leader-row"><span class="dash-leader-rank">' + (i + 1) + '</span>' +
          '<span class="dash-leader-name">' + escapeHtml(l.store.name) + '</span>' +
          '<span class="dash-leader-total">' + formatPrice(l.total) + '</span></div>';
      }).join('') + '</div></div>';
  }

  function renderTrending(items) {
    if (!items || items.length === 0) return '';
    return '<div class="dash-section"><h2 class="dash-section-title">Trending Essentials</h2>' +
      '<div class="dash-trending-table">' +
      '<div class="dash-trend-header"><span>Product</span><span>Best Price</span><span>Store</span></div>' +
      items.map(function(t) {
        return '<a href="product.html?id=' + t.productId + '" class="dash-trend-row">' +
          '<span>' + escapeHtml(t.name) + '</span>' +
          '<span>' + formatPrice(t.cheapestPrice) + '</span>' +
          '<span>' + escapeHtml(t.cheapestAt || '-') + '</span></a>';
      }).join('') + '</div></div>';
  }

  function renderSpendingChart(stats) {
    var opt = stats && stats.cartOptimized != null ? stats.cartOptimized : 0;
    var worst = stats && stats.cartWorst != null ? stats.cartWorst : 0;
    if (opt === 0 && worst === 0) {
      opt = 35000;
      worst = 42000;
    }
    var pct = worst > 0 ? Math.round((1 - opt / worst) * 100) : 0;
    return '<div class="dash-section"><h2 class="dash-section-title">Basket Optimization</h2>' +
      '<div class="dash-chart-bar">' +
      '<div class="dash-chart-legend"><span>Optimized</span><span>Most Expensive</span></div>' +
      '<div class="dash-chart-bars">' +
      '<div class="dash-chart-bar-opt" style="width:' + (worst > 0 ? (opt / worst * 100) : 100) + '%"></div>' +
      '<div class="dash-chart-bar-worst" style="width:100%"></div></div>' +
      '<div class="dash-chart-labels"><span>' + formatPrice(opt) + '</span><span>' + formatPrice(worst) + '</span></div>' +
      '<p class="dash-chart-save">Save ' + pct + '% by shopping smart</p></div></div>';
  }

  function renderBasketPreview(cart) {
    if (!cart || !cart.items || cart.items.length === 0) return '';
    var total = cart.optimizedTotal || 0;
    var saved = cart.totalSavings || 0;
    return '<div class="dash-basket-preview">' +
      '<h3 class="dash-basket-title">Your Smart Basket</h3>' +
      '<div class="dash-basket-total">' + formatPrice(total) + '</div>' +
      '<p class="dash-basket-saved">Save ' + formatPrice(saved) + '</p>' +
      '<a href="basket.html" class="btn btn-primary btn-sm btn-full">View Basket</a></div>';
  }

  function render() {
    var now = Date.now();
    if (now - lastRenderAt < RENDER_COALESCE_MS) return;
    lastRenderAt = now;

    var user = window.bbAuth && window.bbAuth.getUser();
    var content = document.getElementById('content');
    if (!user) {
      window.location.href = 'auth/login.html';
      return;
    }

    content.innerHTML = '<div class="dash-header">' +
      '<h1 class="dash-title">Your Dashboard</h1>' +
      '<p class="dash-welcome">Welcome back, ' + escapeHtml(user.name) + '</p>' +
      renderCityBadge() + '</div>' +
      '<div id="dash-stats" class="dash-stats-skeleton"></div>' +
      '<div class="dash-body">' +
      '<div id="dash-main" class="dash-main"></div>' +
      '<aside class="dash-sidebar" id="dash-sidebar"></aside>' +
      '</div>';

    var statsEl = document.getElementById('dash-stats');
    var mainEl = document.getElementById('dash-main');
    var sidebarEl = document.getElementById('dash-sidebar');

    document.getElementById('dash-city-select').addEventListener('change', function() {
      city = this.value;
      localStorage.setItem('dashboardCity', city);
    });

    Promise.all([
      window.bbApi.dashboard.stats().catch(function() { return {}; }),
      window.bbApi.dashboard.priceAlerts().catch(function() { return { alerts: [] }; }),
      window.bbApi.watchlist.list().catch(function() { return { items: [] }; }),
      window.bbApi.savedLists.list().catch(function() { return []; }),
      window.bbApi.dashboard.leaderboard().catch(function() { return { leaderboard: [] }; }),
      window.bbApi.dashboard.trending().catch(function() { return { items: [] }; }),
      window.bbCart ? window.bbCart.fetchCart().then(function() { return window.bbCart.getCart(); }) : Promise.resolve(null)
    ]).then(function(results) {
      var stats = results[0];
      var alerts = results[1].alerts || [];
      var watchlist = results[2].items || [];
      var lists = Array.isArray(results[3]) ? results[3] : (results[3].lists || []);
      var leaderboard = results[4].leaderboard || [];
      var trending = results[5].items || [];
      var cart = results[6];

      statsEl.innerHTML = renderHeroStats(stats);

      var refreshData = {};
      var listHtml = renderSavedLists(lists, refreshData);
      mainEl.innerHTML = renderPriceAlerts(alerts) +
        renderWatchlist(watchlist) +
        listHtml +
        renderTrending(trending) +
        renderLeaderboard(leaderboard) +
        renderSpendingChart(stats);

      if (sidebarEl) {
        sidebarEl.innerHTML = renderBasketPreview(cart) + renderSpendingChart(stats);
      }

      document.querySelectorAll('.dash-alert-add').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          var id = btn.getAttribute('data-id');
          if (id && window.bbCart) window.bbCart.addItem(id).catch(function() {});
        });
      });

      document.querySelectorAll('.dash-refresh-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.getAttribute('data-id');
          var card = btn.closest('.dash-list-card');
          var toggle = card ? card.querySelector('.dash-split-toggle') : null;
          var mode = toggle && toggle.checked ? 'single_store' : 'multi_store';
          btn.disabled = true;
          window.bbApi.savedLists.refresh(id, mode).then(function(data) {
            refreshData[id] = data;
            var bestEl = card.querySelector('.dash-list-best, .dash-list-placeholder');
            if (bestEl) {
              bestEl.outerHTML = '<div class="dash-list-best"><span class="dash-list-price">' + formatPrice(data.optimizedTotal) + '</span>' +
                (data.bestStore ? '<span class="dash-list-store">' + escapeHtml(data.bestStore.name) + '</span>' : '') + '</div>';
            }
          }).catch(function() {}).finally(function() { btn.disabled = false; });
        });
      });

      document.querySelectorAll('.dash-split-toggle').forEach(function(toggle) {
        toggle.addEventListener('change', function() {
          var id = toggle.getAttribute('data-id');
          var btn = document.querySelector('.dash-refresh-btn[data-id="' + id + '"]');
          if (btn) btn.click();
        });
      });

      document.querySelectorAll('.dash-load-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.getAttribute('data-id');
          btn.disabled = true;
          window.bbApi.savedLists.load(id).then(function() {
            if (window.bbCart) window.bbCart.fetchCart();
            window.location.href = 'basket.html';
          }).catch(function() { btn.disabled = false; });
        });
      });

      document.querySelectorAll('.dash-share-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          var id = btn.getAttribute('data-id');
          var list = lists.find(function(l) { return l.id === id; });
          if (!list) return;
          var text = 'My ' + (list.name || 'shopping') + ' list - check prices on BudgetBasket';
          var url = 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + window.location.origin);
          window.open(url);
        });
      });
    }).catch(function(err) {
      console.error('Dashboard load failed:', err);
      statsEl.innerHTML = '<div class="card" style="padding:2rem;text-align:center;color:#6b7280">Failed to load dashboard.</div>';
    });
  }

  var footerYear = document.getElementById('footer-year');
  if (footerYear) footerYear.textContent = new Date().getFullYear() + ' BudgetBasket.';

  function init() {
    if (!window.bbAuth) {
      window.location.href = 'auth/login.html';
      return;
    }
    var user = window.bbAuth.getUser();
    if (user) {
      render();
      return;
    }
    if (localStorage.getItem('accessToken')) {
      window.bbAuth.fetchUser().then(function() {
        if (window.bbAuth.getUser()) render();
        else window.location.href = 'auth/login.html';
      }).catch(function() {
        window.location.href = 'auth/login.html';
      });
    } else {
      window.location.href = 'auth/login.html';
    }
  }

  if (window.bbAuth) window.bbAuth.subscribe(function() {
    if (window.bbAuth.getLoading()) return;
    var user = window.bbAuth.getUser();
    if (!user) window.location.href = 'auth/login.html';
    else debouncedRender();
  });
  if (window.bbCart) window.bbCart.subscribe(debouncedRender);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
