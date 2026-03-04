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

  function render() {
    var user = window.bbAuth && window.bbAuth.getUser();
    var cart = window.bbCart && window.bbCart.getCart();
    var loading = window.bbCart && window.bbCart.getLoading();
    var content = document.getElementById('content');

    if (!user) {
      content.innerHTML = '<div class="card" style="padding:2rem;text-align:center;max-width:48rem;margin:0 auto">' +
        '<p style="font-size:1.125rem;color:#4b5563;margin-bottom:1.5rem">Please log in to proceed to checkout.</p>' +
        '<a href="auth/login.html" class="btn btn-secondary btn-lg">Log In</a></div>';
      return;
    }

    if (loading && !cart) {
      content.innerHTML = '<div class="skeleton" style="height:3rem;width:12rem;margin-bottom:2rem"></div>' +
        '<div style="display:flex;flex-direction:column;gap:1rem">' + [1,2,3].map(function() { return '<div class="skeleton" style="height:5rem;border-radius:0.75rem"></div>'; }).join('') + '</div>';
      return;
    }

    if (!cart || cart.items.length === 0) {
      content.innerHTML = '<div class="card" style="padding:2rem;text-align:center;max-width:48rem;margin:0 auto">' +
        '<p style="font-size:1.125rem;color:#4b5563;margin-bottom:1.5rem">Your basket is empty. Add items to proceed.</p>' +
        '<a href="products.html" class="btn btn-outline">Browse Products</a></div>';
      return;
    }

    var total = cart.optimizedTotal;
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
          return '<a href="' + mapsUrl + '" target="_blank" rel="noopener" class="btn btn-outline btn-sm">' + escapeHtml(s.name) + ' – Find on Map</a>';
        }).join('') + '</div>'
      : '';

    var itemsHtml = cart.items.map(function(item) {
      return '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:1rem;background:#f9fafb;border-radius:0.75rem;border:1px solid var(--border);margin-bottom:0.5rem">' +
        '<div><p style="font-weight:600;margin:0">' + escapeHtml(item.product.name) + '</p>' +
        '<p style="font-size:0.875rem;color:#6b7280;margin:0.25rem 0 0">Qty: ' + item.quantity + (item.cheapestStore ? ' - ' + escapeHtml(item.cheapestStore.name) : '') + '</p></div>' +
        '<span style="font-weight:600">' + formatPrice(item.cheapestPrice * item.quantity) + '</span></div>';
    }).join('');

    content.innerHTML = '<div style="display:grid;gap:2rem">' +
      '<div><h2 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem">Item Summary</h2>' + itemsHtml + '</div>' +
      '<aside class="card" style="padding:1.5rem"><h2 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem">Order Summary</h2>' +
      '<div style="display:flex;flex-direction:column;gap:0.5rem">' +
      '<div style="display:flex;justify-content:space-between;font-size:1.125rem;font-weight:700;padding-top:0.5rem"><span>Total</span><span>' + formatPrice(total) + '</span></div>' +
      '<div style="padding-top:0.5rem"><span class="savings-label">Total Saved</span><span class="savings-amount">' + formatPrice(cart.totalSavings) + '</span></div></div>' +
      renderNudge('savings', "You're saving " + formatPrice(cart.totalSavings) + " on this order") +
      storeMapLinks +
      '<button type="button" class="btn btn-primary btn-lg btn-full" id="generate-list-btn" style="margin-top:1rem">Generate Shopping List</button></aside></div>';

    document.getElementById('generate-list-btn').addEventListener('click', function() {
      var lines = ['BudgetBasket Shopping List', 'Generated ' + new Date().toLocaleDateString(), '', 'ITEMS'];
      cart.items.forEach(function(item) {
        var store = item.cheapestStore ? ' @ ' + item.cheapestStore.name : '';
        lines.push('- ' + item.product.name + ' x' + item.quantity + store + ' — ' + formatPrice(item.cheapestPrice * item.quantity));
      });
      lines.push('', 'TOTAL: ' + formatPrice(total));
      if (uniqueStores.length > 0) {
        lines.push('', 'STORES TO VISIT:');
        uniqueStores.forEach(function(s) {
          lines.push('- ' + s.name + ', ' + s.location);
        });
      }
      var listText = lines.join('\n');
      var escapedLines = lines.map(function(l) { return l.replace(/</g, '&lt;').replace(/>/g, '&gt;'); }).join('\n');

      function openPrintWindow(qrDataUrl) {
        var qrHtml = qrDataUrl
          ? '<p style="font-size:0.875rem;color:#6b7280;margin:1rem 0 0.5rem;text-align:center">Scan to view this list on your phone</p>' +
            '<div style="margin:1rem auto;text-align:center"><img src="' + qrDataUrl + '" alt="QR code - scan to view list" style="display:block;margin:0 auto;width:180px;height:180px"></div>'
          : '';
        var printWin = window.open('', '_blank');
        printWin.document.write(
          '<html><head><title>BudgetBasket Shopping List</title>' +
          '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">' +
          '</head><body style="font-family:Inter,sans-serif;padding:2rem;max-width:28rem;margin:0 auto">' +
          '<pre style="font-size:1rem;line-height:1.6;white-space:pre-wrap;word-wrap:break-word">' + escapedLines + '</pre>' +
          qrHtml +
          '</body></html>'
        );
        printWin.document.close();
        printWin.focus();
        setTimeout(function() { printWin.print(); }, 300);
      }

      if (typeof QRCode !== 'undefined' && QRCode.toDataURL) {
        QRCode.toDataURL(listText, { width: 180, margin: 2 })
          .then(openPrintWindow)
          .catch(function() { openPrintWindow(null); });
      } else {
        openPrintWindow(null);
      }
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
