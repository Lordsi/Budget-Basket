(function() {
  function getHoursAgo(dateStr) {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
  }

  function escapeAttr(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function renderNudge(type, message) {
    var icon = getNudgeIcon(type);
    return '<div class="nudge nudge-' + type + '"><span class="nudge-icon">' + icon + '</span><p class="nudge-msg">' + escapeHtml(message) + '</p></div>';
  }

  function render(data) {
    var p = data.product;
    var comp = data.comparison || [];
    var cheapestPrice = data.cheapestPrice || 0;
    var maxSaving = data.maxSaving || 0;
    var placeholder = '<div class="prod-img-placeholder icon-wrap" style="display:flex;position:absolute;inset:0"><span class="placeholder-text">Image coming soon</span></div>';
    var icon = p.imageUrl
      ? '<img src="' + escapeAttr(p.imageUrl) + '" alt="' + escapeAttr(p.name) + '" style="width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.style.display=\'none\';var s=this.nextElementSibling;if(s)s.style.display=\'flex\'">' +
        placeholder
      : placeholder;

    var cheapestEntry = comp.find(function(e) { return e.isCheapest; });
    var highestPrice = Math.max.apply(null, comp.map(function(e) { return e.price; }).concat(0));
    var savingPercent = highestPrice > 0 ? Math.round((maxSaving / highestPrice) * 100) : 0;
    var priceInsightRows = comp.slice().sort(function(a, b) { return a.price - b.price; }).map(function(e) {
      return '<span style="display:block;padding:0.25rem 0">' + escapeHtml(e.store.name) + ': ' + formatPrice(e.price) + (e.isCheapest ? ' <span style="color:var(--accent);font-weight:600">(best)</span>' : '') + '</span>';
    }).join('');
    var priceInsightHtml = comp.length > 0
      ? '<div class="card" style="padding:1.25rem;margin-bottom:1rem"><h3 style="font-size:1rem;font-weight:700;margin:0 0 0.75rem;color:#111">Price Insight</h3><div style="font-size:0.9375rem;color:#4b5563;line-height:1.6">' + priceInsightRows + '</div>' +
        (maxSaving > 0 ? '<p style="margin-top:0.75rem;font-weight:600;color:var(--accent)">Save ' + formatPrice(maxSaving) + (savingPercent ? ' (' + savingPercent + '%)' : '') + '</p>' : '') + '</div>'
      : '';

    var rows = comp.map(function(e) {
      return '<tr' + (e.isCheapest ? ' style="background:rgba(0,230,118,0.1)"' : '') + '>' +
        '<td style="padding:1rem 1.5rem;font-weight:500">' + escapeHtml(e.store.name) + '</td>' +
        '<td style="padding:1rem 1.5rem"><span style="' + (e.isCheapest ? 'font-weight:700;color:var(--accent)' : '') + '">' + formatPrice(e.price) + '</span></td>' +
        '<td style="padding:1rem 1.5rem"><span style="' + (e.inStock ? 'color:var(--accent);font-weight:500' : 'color:#6b7280') + '">' + (e.inStock ? 'In stock' : 'Out of stock') + '</span></td>' +
        '<td style="padding:1rem 1.5rem;color:#4b5563">' + (typeof formatPriceUpdated === 'function' ? formatPriceUpdated(e.updatedAt) : timeAgo(e.updatedAt)) + '</td>' +
        '<td style="padding:1rem 1.5rem">' + (e.savingsVsHighest > 0 ? '<span style="font-weight:600;color:var(--accent)">Save ' + formatPrice(e.savingsVsHighest) + '</span>' : '<span style="color:#9ca3af">-</span>') + '</td></tr>';
    }).join('');

    return '<div style="display:flex;flex-direction:column;gap:2rem;margin-bottom:3rem">' +
      '<div style="display:flex;flex-direction:column;gap:2rem">' +
      '<div style="display:flex;flex-direction:column;gap:2rem">' +
      '<div style="aspect-ratio:1;max-width:20rem;background:var(--bg-secondary);border-radius:var(--radius-lg);border:1px solid var(--border);overflow:hidden;display:flex;align-items:center;justify-content:center;position:relative">' + icon + '</div>' +
      '<div><h1 style="font-size:1.875rem;font-weight:900;margin:0 0 0.5rem">' + escapeHtml(p.name) + '</h1>' +
      (p.brand ? '<p style="font-size:1.125rem;color:#4b5563;font-weight:500;margin:0">' + escapeHtml(p.brand) + '</p>' : '') +
      '<div style="display:flex;flex-wrap:wrap;gap:1rem;margin-top:1rem">' +
      (p.category ? '<span style="padding:0.25rem 0.75rem;background:#f3f4f6;border-radius:9999px;font-size:0.875rem;font-weight:500">' + escapeHtml(p.category) + '</span>' : '') +
      (p.size ? '<span style="padding:0.25rem 0.75rem;background:#f3f4f6;border-radius:9999px;font-size:0.875rem;font-weight:500">' + escapeHtml(p.size) + '</span>' : '') + '</div>' +
      (maxSaving > 0 ? '<div class="prod-savings" style="margin-top:1rem"><span class="prod-saving-badge">Save ' + formatPrice(maxSaving) + (savingPercent ? ' <span class="prod-saving-pct">(' + savingPercent + '%)</span>' : '') + '</span></div>' : '') +
      '<div style="margin-top:1rem"><span style="font-size:1.5rem;font-weight:700;color:var(--accent)">From ' + formatPrice(cheapestPrice) + '</span></div>' +
      (cheapestEntry ? '<p class="prod-cheapest-at" style="margin-top:0.5rem">Cheapest at ' + escapeHtml(cheapestEntry.store.name) + '</p>' : '') +
      (cheapestEntry && cheapestEntry.updatedAt && typeof formatPriceUpdated === 'function' ? '<p class="prod-updated" style="margin-top:0.25rem;font-size:0.8125rem;font-weight:500">' + formatPriceUpdated(cheapestEntry.updatedAt) + '</p>' : '') +
      '<div style="margin-top:2rem;display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap">' +
      '<button type="button" class="btn btn-secondary btn-lg" id="add-cart-btn">Add to Basket</button>' +
      (window.bbAuth && window.bbAuth.getUser() && window.bbApi && window.bbApi.watchlist
        ? '<button type="button" class="btn btn-outline btn-lg" id="watch-btn" data-id="' + escapeAttr(p.id) + '"><span id="watch-icon"></span> <span id="watch-label">Watch Price</span></button>'
        : '') + '</div></div></div></div>' +
      priceInsightHtml +
      '<div class="card" style="overflow:hidden"><h2 style="font-size:1.25rem;font-weight:700;padding:1rem 1.5rem;border-bottom:1px solid var(--border)">Price Comparison</h2>' +
      '<div style="overflow-x:auto"><table style="width:100%;min-width:500px"><thead><tr style="background:#f9fafb;border-bottom:1px solid var(--border)">' +
      '<th style="text-align:left;padding:1rem 1.5rem;font-weight:700">Store</th>' +
      '<th style="text-align:left;padding:1rem 1.5rem;font-weight:700">Price</th>' +
      '<th style="text-align:left;padding:1rem 1.5rem;font-weight:700">Availability</th>' +
      '<th style="text-align:left;padding:1rem 1.5rem;font-weight:700">Updated</th>' +
      '<th style="text-align:left;padding:1rem 1.5rem;font-weight:700">Savings</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></div>';
  }

  var id = new URLSearchParams(window.location.search).get('id');
  var content = document.getElementById('content');
  document.getElementById('footer-year').textContent = new Date().getFullYear() + ' BudgetBasket.';

  if (!id) {
    content.innerHTML = '<p>Product not found. <a href="../products.html" style="color:var(--accent);font-weight:600">Back to products</a></p>';
    return;
  }

  content.innerHTML = '<div class="skeleton" style="height:8rem;width:12rem;margin-bottom:2rem"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem"><div class="skeleton" style="aspect-ratio:1"></div><div><div class="skeleton" style="height:2.5rem;width:75%"></div><div class="skeleton" style="height:1rem;width:50%;margin-top:1rem"></div></div></div>';

  function setWatchState(watched) {
    var icon = document.getElementById('watch-icon');
    var label = document.getElementById('watch-label');
    if (icon && label) {
      icon.innerHTML = typeof Icons !== 'undefined' && Icons ? (watched ? Icons.heartFilled : Icons.heart) : '';
      label.textContent = watched ? 'Watching' : 'Watch Price';
      var btn = document.getElementById('watch-btn');
      if (btn) btn.classList.toggle('watched', watched);
    }
  }

  Promise.all([
    window.bbApi.comparison.product(id),
    (window.bbAuth && window.bbAuth.getUser() && window.bbApi && window.bbApi.watchlist)
      ? window.bbApi.watchlist.list().then(function(d) {
          return (d.items || []).some(function(w) { return (w.productId || (w.product && w.product.id)) === id; });
        }).catch(function() { return false; })
      : Promise.resolve(false)
  ]).then(function(results) {
    var data = results[0];
    var isWatched = results[1];
    content.innerHTML = render(data);
    setWatchState(isWatched);
    var watchBtn = document.getElementById('watch-btn');
    if (watchBtn) {
      watchBtn.addEventListener('click', function() {
        var watched = watchBtn.classList.contains('watched');
        var api = window.bbApi.watchlist;
        if (!api) return;
        (watched ? api.remove(id) : api.add(id)).then(function() { setWatchState(!watched); }).catch(function() {});
      });
    }
    document.getElementById('add-cart-btn').addEventListener('click', function() {
      var btn = this;
      btn.disabled = true;
      if (window.bbCart) window.bbCart.addItem(id).finally(function() { btn.disabled = false; });
    });
  }).catch(function() {
    content.innerHTML = '<h1 style="font-size:1.5rem;font-weight:700;margin-bottom:1rem">Product not found</h1><a href="products.html" style="color:var(--accent);font-weight:600">Back to products</a>';
  });
})();
