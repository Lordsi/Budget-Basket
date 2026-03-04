(function() {
  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function renderNudge(type, message) {
    var icon = getNudgeIcon(type);
    return '<div class="nudge nudge-' + type + '"><span class="nudge-icon">' + icon + '</span><p class="nudge-msg">' + escapeHtml(message) + '</p></div>';
  }

  function renderSavings(amount, label) {
    return '<div><span class="savings-label">' + (label || 'You Saved') + '</span><span class="savings-amount">' + formatPrice(amount) + '</span></div>';
  }

  function render() {
    var user = window.bbAuth && window.bbAuth.getUser();
    var cart = window.bbCart && window.bbCart.getCart();
    var loading = window.bbCart && window.bbCart.getLoading();
    var content = document.getElementById('content');

    if (!user) {
      content.innerHTML = '<div class="card" style="padding:2rem;text-align:center;max-width:48rem;margin:0 auto">' +
        '<p style="font-size:1.125rem;color:#4b5563;margin-bottom:1.5rem">Please log in to view and manage your basket.</p>' +
        '<a href="auth/login.html" class="btn btn-secondary btn-lg">Log In</a></div>';
      return;
    }

    if (loading && !cart) {
      content.innerHTML = '<div style="display:flex;flex-direction:column;gap:1rem">' +
        [1,2,3].map(function() { return '<div class="skeleton" style="height:8rem;border-radius:0.75rem"></div>'; }).join('') + '</div>';
      return;
    }

    if (!cart || cart.items.length === 0) {
      content.innerHTML = '<div class="card" style="padding:3rem;text-align:center;max-width:48rem;margin:0 auto">' +
        '<p style="font-size:1.25rem;color:#4b5563;margin-bottom:1.5rem">Your basket is empty.</p>' +
        '<a href="products.html" class="btn btn-outline">Browse Products</a></div>';
      return;
    }

    function itemImg(p) {
      var placeholder = '<div style="display:none;width:64px;height:64px;flex-shrink:0;flex-direction:column;align-items:center;justify-content:center;font-size:0.6rem;font-weight:600;color:#9ca3af;background:var(--bg-secondary);border-radius:0.5rem;padding:0.25rem;text-align:center">Coming soon</div>';
      if (!p.imageUrl) return '<div style="width:64px;height:64px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:0.6rem;font-weight:600;color:#9ca3af;background:var(--bg-secondary);border-radius:0.5rem;padding:0.25rem;text-align:center">Coming soon</div>';
      return '<img src="' + String(p.imageUrl).replace(/&/g,'&amp;').replace(/"/g,'&quot;') + '" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:0.5rem;flex-shrink:0" loading="lazy" onerror="this.style.display=\'none\';var n=this.nextElementSibling;if(n)n.style.display=\'flex\'">' +
        placeholder;
    }
    var itemsHtml = cart.items.map(function(item) {
      return '<div class="card" style="padding:1.5rem;margin-bottom:1rem;display:flex;flex-direction:column;gap:1rem">' +
        '<div style="display:flex;gap:1rem;align-items:flex-start">' +
        '<div style="position:relative;display:flex">' + itemImg(item.product) + '</div>' +
        '<div style="flex:1;min-width:0"><h3 style="font-weight:600;font-size:1.0625rem;margin:0">' + escapeHtml(item.product.name) + '</h3>' +
        '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.25rem;font-size:0.875rem;color:#6b7280">' +
        (item.product.brand ? '<span>' + escapeHtml(item.product.brand) + '</span>' : '') +
        (item.product.size ? '<span> - ' + escapeHtml(item.product.size) + '</span>' : '') + '</div>' +
        '<div style="margin-top:0.5rem"><span style="font-weight:600">' + formatPrice(item.cheapestPrice) + '</span>' +
        (item.cheapestStore ? '<span style="font-size:0.875rem;color:#6b7280;margin-left:0.5rem">@ ' + escapeHtml(item.cheapestStore.name) + '</span>' : '') + '</div>' +
        (item.saving > 0 ? '<p style="margin-top:0.25rem;font-size:0.875rem;font-weight:600;color:var(--accent)">Save ' + formatPrice(item.saving) + ' on this item</p>' : '') + '</div></div>' +
        '<div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap"><div style="display:flex;align-items:center;border:1px solid var(--border);border-radius:0.5rem;overflow:hidden">' +
        '<button type="button" class="btn btn-ghost btn-sm qty-btn" data-id="' + item.id + '" data-dir="-">-</button>' +
        '<span style="padding:0.5rem 1rem;font-weight:600;min-width:2.5rem;text-align:center">' + item.quantity + '</span>' +
        '<button type="button" class="btn btn-ghost btn-sm qty-btn" data-id="' + item.id + '" data-dir="+">+</button></div>' +
        '<button type="button" class="btn btn-ghost btn-sm remove-btn" data-id="' + item.id + '" style="color:#dc2626">Remove</button></div></div>';
    }).join('');

    var basketMode = localStorage.getItem('basketMode') || 'multi_store';
    var modeLabel = basketMode === 'single_store' ? 'Cheapest Total (Single Store)' : 'Absolute Lowest (Multi-Store)';
    var modeToggleHtml = '<div style="margin-bottom:1rem;padding:0.75rem;background:#f9fafb;border-radius:0.5rem;border:1px solid var(--border)">' +
      '<p style="font-size:0.8125rem;font-weight:600;margin:0 0 0.5rem;color:#4b5563">Basket mode</p>' +
      '<div style="display:flex;gap:0.5rem;flex-wrap:wrap">' +
      '<button type="button" class="btn ' + (basketMode === 'multi_store' ? 'btn-primary' : 'btn-outline') + ' btn-sm" id="mode-multi">Absolute Lowest (Multi-Store)</button>' +
      '<button type="button" class="btn ' + (basketMode === 'single_store' ? 'btn-primary' : 'btn-outline') + ' btn-sm" id="mode-single">Cheapest Total (Single Store)</button>' +
      '</div></div>';

    var uniqueStores = [];
    cart.items.forEach(function(item) {
      if (item.cheapestStore && !uniqueStores.find(function(s) { return s.id === item.cheapestStore.id; })) {
        uniqueStores.push(item.cheapestStore);
      }
    });

    var storeMapLinks = uniqueStores.length > 0
      ? '<div style="margin-top:0.75rem;display:flex;flex-wrap:wrap;gap:0.5rem">' +
        uniqueStores.map(function(s) {
          var lat = s.latitude; var lng = s.longitude;
          var mapsUrl = (lat != null && lng != null)
            ? 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng
            : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.name + ' ' + s.location);
          return '<a href="' + mapsUrl + '" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="font-size:0.8125rem">' + escapeHtml(s.name) + ' – View on Map</a>';
        }).join('') + '</div>'
      : '';

    var summary = '<aside class="card" style="padding:1.5rem;position:sticky;top:6rem">' +
      modeToggleHtml +
      '<h2 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem">Basket Summary</h2>' +
      '<div style="display:flex;flex-direction:column;gap:0.5rem">' +
      '<div style="display:flex;justify-content:space-between;color:#4b5563"><span>Subtotal (optimized)</span><span style="font-weight:600;color:#111">' + formatPrice(cart.optimizedTotal) + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:0.875rem;color:#6b7280"><span>If you bought at most expensive</span><span>' + formatPrice(cart.worstCaseTotal) + '</span></div></div>' +
      '<div style="padding-top:1rem;border-top:1px solid var(--border);margin-top:1rem">' + renderSavings(cart.totalSavings, 'Total Savings') + '</div>' +
      renderNudge('smart', 'You built the smartest basket today.') +
      storeMapLinks +
      '<a href="checkout.html" class="btn btn-primary btn-lg btn-full" style="margin-top:1rem;display:block;text-align:center;text-decoration:none">Proceed to Checkout</a></aside>';

    content.innerHTML = '<div class="cart-layout">' +
      '<div style="flex:1">' + itemsHtml +
      '<div style="margin-top:2rem;display:flex;flex-wrap:wrap;gap:0.75rem">' +
      '<button type="button" class="btn btn-outline btn-md" id="save-list-btn">Save as List</button>' +
      '<button type="button" class="btn btn-outline btn-md btn-danger" id="clear-btn">Clear Basket</button></div></div>' +
      summary + '</div>';

    content.querySelectorAll('.qty-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.getAttribute('data-id');
        var dir = btn.getAttribute('data-dir');
        var item = cart.items.find(function(i) { return i.id === id; });
        if (!item) return;
        var qty = dir === '+' ? item.quantity + 1 : Math.max(1, item.quantity - 1);
        var m = localStorage.getItem('basketMode') || 'multi_store';
        window.bbCart.updateItem(id, qty, m).catch(function() {});
      });
    });
    content.querySelectorAll('.remove-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (!confirm('Remove this item?')) return;
        var m = localStorage.getItem('basketMode') || 'multi_store';
        window.bbCart.removeItem(btn.getAttribute('data-id'), m).catch(function() {});
      });
    });
    var modeMulti = document.getElementById('mode-multi');
    var modeSingle = document.getElementById('mode-single');
    if (modeMulti) modeMulti.addEventListener('click', function() {
      localStorage.setItem('basketMode', 'multi_store');
      window.bbCart.fetchCart('multi_store').then(render);
    });
    if (modeSingle) modeSingle.addEventListener('click', function() {
      localStorage.setItem('basketMode', 'single_store');
      window.bbCart.fetchCart('single_store').then(render);
    });
    document.getElementById('save-list-btn').addEventListener('click', function() {
      var name = prompt('Enter a name for this list:');
      if (!name || !name.trim()) return;
      window.bbApi.savedLists.create(name.trim()).then(function() {
        alert('List saved successfully!');
      }).catch(function() { alert('Failed to save list.'); });
    });
    document.getElementById('clear-btn').addEventListener('click', function() {
      if (!confirm('Are you sure you want to clear your basket?')) return;
      var m = localStorage.getItem('basketMode') || 'multi_store';
      window.bbCart.clearCart(m).catch(function() {});
    });
  }

  document.getElementById('footer-year').textContent = new Date().getFullYear() + ' BudgetBasket.';

  function init() {
    var user = window.bbAuth && window.bbAuth.getUser();
    var mode = localStorage.getItem('basketMode') || 'multi_store';
    if (user && window.bbCart) window.bbCart.fetchCart(mode).then(render);
    else render();
  }

  if (window.bbAuth) window.bbAuth.subscribe(function() { if (window.bbAuth.getUser()) init(); else render(); });
  if (window.bbCart) window.bbCart.subscribe(render);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
