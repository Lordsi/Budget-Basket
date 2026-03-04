(function() {
  var CATEGORIES = ['Food','Cooking Oil','Spices','Vegetables','Beverages','Household','Toiletries'];
  var page = 1;
  var limit = 12;
  var search = '';
  var debouncedSearch = '';
  var category = '';
  var debounceTimer;

  function getParams() {
    var p = new URLSearchParams(window.location.search);
    category = p.get('category') || '';
    search = debouncedSearch = p.get('search') || p.get('q') || '';
    return category;
  }

  function renderPills() {
    var pills = document.getElementById('cat-pills');
    if (!pills) return;
    var pillStyle = 'shrink:0;padding:0.5rem 1rem;border-radius:9999px;font-weight:600;font-size:0.875rem;text-decoration:none;display:inline-flex;align-items:center;gap:0.5rem;border:1px solid var(--border, #e5e7eb)';
    var html = '<a href="products.html" class="pill' + (category ? '' : ' active') + '" style="' + pillStyle + '">All</a>';
    CATEGORIES.forEach(function(cat) {
      var isActive = category === cat;
      html += '<a href="products.html?category=' + encodeURIComponent(cat) + '" class="pill' + (isActive ? ' active' : '') + '" style="' + pillStyle + '">';
      html += '<span class="cat-icon-inline">' + getCategoryIcon(cat) + '</span>' + cat + '</a>';
    });
    pills.innerHTML = html;
  }

  function renderProduct(p, watched) {
    var placeholder = '<div class="prod-img-placeholder icon-wrap" style="display:flex"><span class="placeholder-text">Image coming soon</span></div>';
    var icon = p.imageUrl
      ? '<img src="' + escapeAttr(p.imageUrl) + '" alt="' + escapeAttr(p.name) + '" loading="lazy" onerror="this.style.display=\'none\';var s=this.nextElementSibling;if(s)s.style.display=\'flex\'">' +
        placeholder
      : placeholder;
    var heartBtn = (window.bbAuth && window.bbAuth.getUser() && window.bbApi && window.bbApi.watchlist)
      ? '<button type="button" class="prod-watch-btn' + (watched ? ' watched' : '') + '" data-id="' + escapeAttr(p.id) + '" aria-label="Watch price">' + (typeof Icons !== 'undefined' && Icons ? (watched ? Icons.heartFilled : Icons.heart) : '') + '</button>'
      : '';
    var price = p.cheapestPrice != null ? formatPrice(p.cheapestPrice) : '-';
    var saving = (p.potentialSaving || 0) > 0;
    var savingHtml = saving
      ? '<div class="prod-savings"><span class="prod-saving-badge">Save ' + formatPrice(p.potentialSaving) + (p.savingPercent ? ' <span class="prod-saving-pct">(' + p.savingPercent + '%)</span>' : '') + '</span></div>'
      : '';
    var cheapestStoreHtml = p.cheapestStore ? '<p class="prod-cheapest-at">Cheapest at ' + escapeHtml(p.cheapestStore.name) + '</p>' : '';
    var updatedHtml = p.priceUpdatedAt && typeof formatPriceUpdated === 'function' ? '<p class="prod-updated">' + formatPriceUpdated(p.priceUpdatedAt) + '</p>' : '';
    return '<article class="prod-card">' +
      '<a href="product.html?id=' + escapeAttr(p.id) + '" class="prod-card-link">' +
      '<div class="prod-image">' + heartBtn + icon + '</div>' +
      '<div class="prod-body">' +
      '<h3 class="prod-name">' + escapeHtml(p.name) + '</h3>' +
      (p.brand ? '<p class="prod-brand">' + escapeHtml(p.brand) + '</p>' : '') +
      savingHtml +
      '<div class="prod-price">' + price + '</div>' +
      cheapestStoreHtml +
      updatedHtml +
      '</div></a>' +
      '<div class="prod-actions">' +
      '<a href="product.html?id=' + escapeAttr(p.id) + '" class="prod-compare-link">Compare Prices</a>' +
      '<button type="button" class="btn btn-secondary btn-sm btn-full add-cart" data-id="' + escapeAttr(p.id) + '">Add to Basket</button>' +
      '</div></article>';
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
  function escapeAttr(s) {
    return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function fetchProducts() {
    var grid = document.getElementById('prod-grid');
    var pagEl = document.getElementById('pagination');
    grid.innerHTML = '<div style="grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.5rem">' +
      Array(8).fill('<div class="card" style="overflow:hidden"><div class="skeleton" style="aspect-ratio:1"></div><div style="padding:1rem"><div class="skeleton" style="height:1.25rem;width:75%"></div><div class="skeleton" style="height:1rem;width:50%;margin-top:0.75rem"></div><div class="skeleton" style="height:1.5rem;width:33%;margin-top:1rem"></div></div></div>').join('') + '</div>';

    var params = { page: page, limit: limit };
    if (category) params.category = category;
    if (debouncedSearch) params.search = debouncedSearch;

    var watchlistPromise = (window.bbAuth && window.bbAuth.getUser() && window.bbApi && window.bbApi.watchlist)
      ? window.bbApi.watchlist.list().then(function(d) {
          var ids = (d.items || []).map(function(w) { return w.productId || w.product.id; });
          return Object.fromEntries(ids.map(function(id) { return [id, true]; }));
        }).catch(function() { return {}; })
      : Promise.resolve({});

    Promise.all([window.bbApi.products.list(params), watchlistPromise]).then(function(results) {
      var data = results[0];
      var watchlistIds = results[1] || {};
      var products = data.products || (Array.isArray(data) ? data : []);
      var pag = data.pagination || {};
      var totalPages = pag.totalPages || 1;

      if (products.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:4rem"><p style="font-size:1.25rem;color:#4b5563">No products found. Try a different category or search.</p><a href="products.html" style="display:inline-block;margin-top:1rem;color:var(--accent);font-weight:700">Clear filters</a></div>';
      } else {
        grid.innerHTML = products.map(function(p) { return renderProduct(p, !!watchlistIds[p.id]); }).join('');
        grid.querySelectorAll('.add-cart').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            var id = btn.getAttribute('data-id');
            if (id && window.bbCart) window.bbCart.addItem(id).catch(function() {});
          });
        });
        grid.querySelectorAll('.prod-watch-btn').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var id = btn.getAttribute('data-id');
            var isWatched = btn.classList.contains('watched');
            var api = window.bbApi.watchlist;
            if (!api) return;
            (isWatched ? api.remove(id) : api.add(id)).then(function() {
              btn.classList.toggle('watched', !isWatched);
              btn.innerHTML = typeof Icons !== 'undefined' && Icons ? (!isWatched ? Icons.heartFilled : Icons.heart) : '';
            }).catch(function() {});
          });
        });
      }

      if (totalPages > 1) {
        var hasPrev = page > 1;
        var hasNext = page < totalPages;
        pagEl.innerHTML = '<button type="button" class="btn btn-outline" ' + (hasPrev ? '' : 'disabled') + ' id="prev-btn">Previous</button>' +
          '<span style="color:#4b5563;font-weight:500">Page ' + page + ' of ' + totalPages + '</span>' +
          '<button type="button" class="btn btn-outline" ' + (hasNext ? '' : 'disabled') + ' id="next-btn">Next</button>';
        pagEl.style.display = 'flex';
        document.getElementById('prev-btn').addEventListener('click', function() { page = Math.max(1, page - 1); fetchProducts(); });
        document.getElementById('next-btn').addEventListener('click', function() { page = Math.min(totalPages, page + 1); fetchProducts(); });
      } else {
        pagEl.innerHTML = '';
        pagEl.style.display = 'none';
      }
    }).catch(function(err) {
      var isLive = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      var msg = isLive
        ? '<p style="font-size:1.125rem;margin-bottom:1rem">Products could not be loaded. The backend API is not reachable.</p>' +
          '<p style="font-size:0.875rem;margin-bottom:1rem;color:#4b5563">On live hosting, the <strong>Node.js backend</strong> must be deployed and running alongside the site. Static HTML alone cannot serve products.</p>' +
          '<p style="font-size:0.875rem;margin-bottom:0.5rem"><strong>Hostinger:</strong> Use the Node.js app in the control panel to deploy the <code style="background:#f3f4f6;padding:0.2rem 0.4rem;border-radius:0.25rem">backend</code> folder, set MySQL in .env, then run <code style="background:#f3f4f6;padding:0.2rem 0.4rem;border-radius:0.25rem">npx prisma migrate deploy</code> and <code style="background:#f3f4f6;padding:0.2rem 0.4rem;border-radius:0.25rem">npm run db:seed</code>.</p>' +
          '<p style="font-size:0.875rem;margin-top:1rem">See <code style="background:#f3f4f6;padding:0.2rem 0.4rem;border-radius:0.25rem">HOSTINGER_DEPLOY.md</code> for full steps.</p>'
        : '<p style="font-size:1.125rem;margin-bottom:1rem">Failed to load products.</p>' +
          '<p style="font-size:0.875rem;margin-bottom:0.5rem">1. Start the backend: <code style="background:#f3f4f6;padding:0.25rem 0.5rem;border-radius:0.25rem">cd backend && npm run dev</code></p>' +
          '<p style="font-size:0.875rem;margin-bottom:0.5rem">2. Run migrations & seed: <code style="background:#f3f4f6;padding:0.25rem 0.5rem;border-radius:0.25rem">npx prisma migrate deploy</code> then <code style="background:#f3f4f6;padding:0.25rem 0.5rem;border-radius:0.25rem">npm run db:seed</code></p>' +
          '<p style="font-size:0.875rem;margin-top:1rem">Then refresh this page.</p>';
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:4rem;color:#6b7280;max-width:36rem;margin:0 auto">' + msg + '</div>';
    });
  }

  var suggestTimer;
  function fetchSuggestions(q) {
    if (!q || q.length < 2) {
      document.getElementById('search-suggest').style.display = 'none';
      return;
    }
    window.bbApi.products.suggest(q).then(function(data) {
      var list = data.suggestions || [];
      var el = document.getElementById('search-suggest');
      if (list.length === 0) {
        el.style.display = 'none';
        return;
      }
      el.innerHTML = list.map(function(s) {
        var label = escapeHtml(s.name) + (s.brand ? '<span class="brand"> — ' + escapeHtml(s.brand) + '</span>' : '');
        return '<a href="product.html?id=' + escapeAttr(s.id) + '" class="search-suggest-item">' + label + '</a>';
      }).join('');
      el.style.display = 'block';
    }).catch(function() {
      document.getElementById('search-suggest').style.display = 'none';
    });
  }

  function init() {
    getParams();
    renderPills();
    document.getElementById('footer-year').textContent = new Date().getFullYear() + ' BudgetBasket.';
    var searchEl = document.getElementById('search');
    if (searchEl && search) searchEl.value = search;
    searchEl.addEventListener('input', function() {
      search = this.value;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() { debouncedSearch = search; page = 1; fetchProducts(); }, 300);
      clearTimeout(suggestTimer);
      suggestTimer = setTimeout(function() { fetchSuggestions(search); }, 150);
    });
    searchEl.addEventListener('focus', function() {
      if (search.length >= 2) fetchSuggestions(search);
    });
    searchEl.addEventListener('blur', function() {
      setTimeout(function() {
        document.getElementById('search-suggest').style.display = 'none';
      }, 200);
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') document.getElementById('search-suggest').style.display = 'none';
    });
    fetchProducts();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
