(function() {
  var API_BASE = window.API_BASE || 'http://localhost:5000/api';

  function formatPrice(n) {
    return (typeof window.formatPrice === 'function' ? window.formatPrice(n) : 'MWK ' + (n == null ? '0' : Number(n).toLocaleString()));
  }

  function initHeroSearch() {
    var form = document.getElementById('hero-search-form');
    var input = document.getElementById('hero-search-input');
    var suggestWrap = document.getElementById('hero-search-suggest');
    var debounce;

    if (!form || !input) return;

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var q = (input.value || '').trim();
      if (q) window.location.href = 'products.html?search=' + encodeURIComponent(q);
    });

    input.addEventListener('input', function() {
      var q = (input.value || '').trim();
      clearTimeout(debounce);
      if (q.length < 2) {
        suggestWrap.innerHTML = '';
        suggestWrap.style.display = 'none';
        return;
      }
      debounce = setTimeout(function() {
        fetch(API_BASE + '/products/suggest?q=' + encodeURIComponent(q))
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (!data.suggestions || data.suggestions.length === 0) {
              suggestWrap.innerHTML = '';
              suggestWrap.style.display = 'none';
              return;
            }
            suggestWrap.innerHTML = data.suggestions.slice(0, 6).map(function(p) {
              return '<a href="product.html?id=' + p.id + '" class="hero-suggest-item">' +
                escapeHtml(p.name) + (p.brand ? ' <span class="brand">' + escapeHtml(p.brand) + '</span>' : '') + '</a>';
            }).join('');
            suggestWrap.style.display = 'block';
          })
          .catch(function() { suggestWrap.innerHTML = ''; suggestWrap.style.display = 'none'; });
      }, 150);
    });

    input.addEventListener('blur', function() {
      setTimeout(function() { suggestWrap.style.display = 'none'; }, 200);
    });
    input.addEventListener('focus', function() {
      if (suggestWrap.innerHTML) suggestWrap.style.display = 'block';
    });
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function renderTicker(items) {
    var el = document.getElementById('live-ticker');
    if (!el) return;
    var tickerHtml = function(arr) {
      return arr.map(function(x) {
        return '<span class="ticker-item">' + escapeHtml(x.name) + ' is MWK ' + x.saving.toLocaleString() + ' cheaper at ' + escapeHtml(x.cheapestAt || 'selected stores') + ' today!</span>';
      }).join('');
    };
    if (!items || items.length === 0) {
      el.innerHTML = '<span class="ticker-item">Prices updated in Mzuzu.</span>';
      return;
    }
    var html = tickerHtml(items);
    el.innerHTML = html + (items.length > 1 ? html : '');
    if (items.length > 1) el.classList.add('ticker-scroll');
  }

  function renderPopular(data) {
    var hero = document.getElementById('popular-hero');
    var grid = document.getElementById('popular-grid');
    if (!hero || !grid) return;
    var popular = data && data.popular ? data.popular : [];
    var topProduct = data && data.topProduct ? data.topProduct : (popular[0] || null);

    if (topProduct) {
      hero.innerHTML = '<a href="product.html?id=' + topProduct.id + '" class="popular-hero-card">' +
        '<span class="popular-badge">Most bought by other users</span>' +
        '<div class="popular-hero-body">' +
        '<h3 class="popular-hero-name">' + escapeHtml(topProduct.name) + '</h3>' +
        (topProduct.brand ? '<p class="popular-hero-brand">' + escapeHtml(topProduct.brand) + '</p>' : '') +
        '<div class="popular-hero-prices">' +
        '<span class="popular-hero-price">From ' + formatPrice(topProduct.cheapestPrice) + '</span>' +
        (topProduct.cheapestStore ? '<span class="popular-hero-store">at ' + escapeHtml(topProduct.cheapestStore.name) + '</span>' : '') +
        '</div>' +
        '<p class="popular-hero-count">' + (topProduct.cartCount || 0) + ' added to baskets this week</p>' +
        '</div></a>';
    } else {
      hero.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:2rem">Be the first to add products and we&rsquo;ll show the most popular here!</p>';
    }

    var others = popular.slice(1, 4);
    if (others.length > 0) {
      grid.innerHTML = others.map(function(p) {
        return '<a href="product.html?id=' + p.id + '" class="popular-card">' +
          '<h4 class="popular-card-name">' + escapeHtml(p.name) + '</h4>' +
          '<span class="popular-card-price">' + formatPrice(p.cheapestPrice) + '</span>' +
          '<span class="popular-card-count">' + (p.cartCount || 0) + ' in baskets</span></a>';
      }).join('');
    } else {
      grid.innerHTML = '';
    }
  }

  function renderDeals(deals) {
    var grid = document.getElementById('deals-grid');
    if (!grid) return;
    if (!deals || deals.length === 0) {
      grid.innerHTML = '<p style="text-align:center;color:var(--text-secondary);grid-column:1/-1">No deals loaded. <a href="products.html">Browse products</a></p>';
      return;
    }
    grid.innerHTML = deals.map(function(p) {
      var oldP = p.maxPrice || p.cheapestPrice;
      var newP = p.cheapestPrice;
      var save = p.potentialSaving || 0;
      var store = p.cheapestStore ? p.cheapestStore.name : '';
      return '<a href="product.html?id=' + p.id + '" class="deal-card">' +
        '<div class="deal-badge">Save MWK ' + save.toLocaleString() + '</div>' +
        '<div class="deal-body">' +
        '<h4 class="deal-name">' + escapeHtml(p.name) + '</h4>' +
        '<div class="deal-prices">' +
        '<span class="deal-old">' + formatPrice(oldP) + '</span>' +
        '<span class="deal-new">' + formatPrice(newP) + '</span>' +
        '</div>' +
        (store ? '<p class="deal-store">Cheapest at ' + escapeHtml(store) + '</p>' : '') +
        '</div></a>';
    }).join('');
  }

  function init() {
    initHeroSearch();

    if (window.bbApi && window.bbApi.products) {
      window.bbApi.products.ticker().then(function(d) { renderTicker(d.items); }).catch(function() {
        renderTicker([
          { name: 'Soap (1kg)', saving: 400, cheapestAt: 'Metro' },
          { name: 'Cooking oil', saving: 350, cheapestAt: 'Shoprite' }
        ]);
      });
      window.bbApi.products.deals().then(function(d) { renderDeals(d.deals); }).catch(function() {
        renderDeals([]);
      });
      window.bbApi.products.popular().then(renderPopular).catch(function() {
        renderPopular({ popular: [], topProduct: null });
      });
    } else {
      renderTicker([
        { name: 'Soap (1kg)', saving: 400, cheapestAt: 'Metro' },
        { name: 'Cooking oil', saving: 350, cheapestAt: 'Shoprite' },
        { name: 'Rice (2kg)', saving: 280, cheapestAt: 'Spar' }
      ]);
      renderDeals([]);
      renderPopular({ popular: [], topProduct: null });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
