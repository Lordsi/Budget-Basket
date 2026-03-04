(function() {
  function renderCartIcon() {
    var iconHtml = typeof Icons !== 'undefined' ? Icons.cart : '';
    ['nav-cart-icon', 'nav-cart-icon-mobile'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = iconHtml;
    });
  }

  function renderStickyBasket() {
    var bar = document.getElementById('sticky-basket-bar');
    var cart = window.bbCart && window.bbCart.getCart ? window.bbCart.getCart() : null;
    var user = window.bbAuth && window.bbAuth.getUser ? window.bbAuth.getUser() : null;
    var path = (window.location.pathname || '').split('/').pop() || '';
    var hideOn = ['basket.html', 'checkout.html', 'auth/login.html', 'auth/register.html'];
    if (!bar || !user || !cart || cart.items.length === 0 || hideOn.indexOf(path) >= 0) {
      if (bar) bar.style.display = 'none';
      return;
    }
    bar.innerHTML = '<div class="sticky-basket-inner">' +
      '<div class="sticky-basket-summary">' +
      '<span class="sticky-basket-label">Smart basket</span>' +
      '<span class="sticky-basket-total">' + (typeof formatPrice === 'function' ? formatPrice(cart.optimizedTotal) : cart.optimizedTotal) + '</span>' +
      '<span class="sticky-basket-savings">Save ' + (typeof formatPrice === 'function' ? formatPrice(cart.totalSavings) : cart.totalSavings) + '</span>' +
      '</div>' +
      '<a href="basket.html" class="btn btn-primary btn-sm">View Basket</a>' +
      '</div>';
    bar.style.display = 'block';
  }

  function renderThemeToggle() {
    var el = document.getElementById('nav-theme-toggle');
    if (!el || !window.bbTheme) return;
    var isDark = window.bbTheme.getEffectiveTheme ? window.bbTheme.getEffectiveTheme() === 'dark' : window.bbTheme.getTheme() === 'dark';
    var moonIcon = typeof Icons !== 'undefined' ? Icons.moon : '';
    var sunIcon = typeof Icons !== 'undefined' ? Icons.sun : '';
    el.innerHTML = '<button type="button" class="nav-theme-btn" aria-label="' + (isDark ? 'Switch to light mode' : 'Switch to dark mode') + '" title="' + (isDark ? 'Light mode' : 'Dark mode') + '">' + (isDark ? sunIcon : moonIcon) + '</button>';
    el.querySelector('.nav-theme-btn').onclick = function() {
      window.bbTheme.toggleTheme();
      renderThemeToggle();
      renderNav();
    };
  }

  function renderNav() {
    var user = window.bbAuth && window.bbAuth.getUser();
    var count = window.bbCart && window.bbCart.getItemCount ? window.bbCart.getItemCount() : 0;
    var badge = document.getElementById('nav-cart-badge');
    var userEl = document.getElementById('nav-user');
    var mobileUser = document.getElementById('mobile-user');

    renderThemeToggle();

    ['nav-cart-badge', 'nav-cart-badge-mobile'].forEach(function(id) {
      var b = document.getElementById(id);
      if (b) {
        b.textContent = count > 99 ? '99+' : count;
        b.style.display = count > 0 ? 'flex' : 'none';
      }
    });

    var userHtml = '';
    if (user) {
      userHtml = '<button type="button" class="nav-user-trigger" aria-expanded="false" aria-haspopup="true">' +
        '<span class="nav-avatar">' + getInitials(user.name) + '</span>' +
        '<span class="nav-user-name">' + escapeHtml(user.name) + '</span>' +
        '</button>' +
        '<div class="nav-user-dropdown">' +
        '<a href="dashboard.html" class="nav-dropdown-item">Dashboard</a>' +
        '<button type="button" class="nav-dropdown-item nav-logout-btn">Logout</button>' +
        '</div>';
    } else {
      userHtml = '<a href="auth/login.html" class="nav-link">Login</a>' +
        '<a href="auth/register.html" class="nav-cta">Register</a>';
    }
    if (userEl) userEl.innerHTML = userHtml;

    var panel = document.getElementById('mobile-panel');
    if (panel) {
      var icons = typeof Icons !== 'undefined' ? Icons : {};
      var searchIcon = icons.search || '';
      var cartIcon = icons.cart || '';
      var userIcon = icons.user || icons.settings || '';
      var logoutIcon = icons.logOut || '';
      var closeIcon = icons.close || '✕';
      var basketLabel = count > 0 ? 'My Basket (' + (count > 99 ? '99+' : count) + ')' : 'My Basket';
      var panelHtml = '<div class="mobile-panel-header">' +
        (user ? '<div class="mobile-panel-user"><span class="mobile-panel-avatar">' + getInitials(user.name) + '</span><span class="mobile-panel-name">' + escapeHtml(user.name) + '</span></div>' : '') +
        '<button type="button" class="mobile-close" id="mobile-close" aria-label="Close">' + closeIcon + '</button>' +
        '</div>' +
        '<nav class="mobile-panel-nav">' +
        '<a href="products.html" class="mobile-nav-item"><span class="mobile-nav-icon">' + searchIcon + '</span>Browse</a>' +
        '<a href="basket.html" class="mobile-nav-item"><span class="mobile-nav-icon mobile-nav-cart-wrap">' + cartIcon + (count > 0 ? '<span class="mobile-nav-badge">' + (count > 99 ? '99+' : count) + '</span>' : '') + '</span>' + basketLabel + '</a>' +
        '</nav>';
      var moonIcon = (icons && icons.moon) || '';
      var sunIcon = (icons && icons.sun) || '';
      var isDark = window.bbTheme && (window.bbTheme.getEffectiveTheme ? window.bbTheme.getEffectiveTheme() : window.bbTheme.getTheme()) === 'dark';
      if (user) {
        panelHtml += '<hr class="mobile-panel-divider">' +
          '<nav class="mobile-panel-account">' +
          '<a href="dashboard.html" class="mobile-nav-item"><span class="mobile-nav-icon">' + userIcon + '</span>Dashboard</a>' +
          '<button type="button" class="mobile-nav-item mobile-nav-theme" data-action="theme"><span class="mobile-nav-icon">' + (isDark ? sunIcon : moonIcon) + '</span>' + (isDark ? 'Light mode' : 'Dark mode') + '</button>' +
          '<button type="button" class="mobile-nav-item mobile-nav-logout" data-action="logout"><span class="mobile-nav-icon">' + logoutIcon + '</span>Logout</button>' +
          '</nav>';
      } else {
        panelHtml += '<hr class="mobile-panel-divider">' +
          '<div class="mobile-panel-auth">' +
          '<button type="button" class="mobile-nav-item mobile-nav-theme" data-action="theme"><span class="mobile-nav-icon">' + (isDark ? sunIcon : moonIcon) + '</span>' + (isDark ? 'Light mode' : 'Dark mode') + '</button>' +
          '<a href="auth/login.html" class="mobile-nav-item">Login</a>' +
          '<a href="auth/register.html" class="mobile-nav-item mobile-nav-register">Register</a>' +
          '</div>';
      }
      panel.innerHTML = panelHtml;
    }

    renderStickyBasket();

    document.querySelectorAll('.nav-user-dropdown').forEach(function(dd) {
      dd.onclick = function(e) { e.stopPropagation(); };
    });
    document.querySelectorAll('.nav-user-trigger').forEach(function(trigger) {
      var wrapper = trigger.closest('.nav-user');
      var dropdown = wrapper ? wrapper.querySelector('.nav-user-dropdown') : trigger.nextElementSibling;
      if (!dropdown) return;
      trigger.onclick = function(e) {
        e.stopPropagation();
        var wasOpen = dropdown.classList.contains('open');
        document.querySelectorAll('.nav-user-dropdown.open').forEach(function(d) { d.classList.remove('open'); });
        document.querySelectorAll('.nav-user-trigger[aria-expanded="true"]').forEach(function(t) { t.setAttribute('aria-expanded', 'false'); });
        if (!wasOpen) {
          dropdown.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      };
    });
    if (!window._navUserCloseBound) {
      window._navUserCloseBound = true;
      document.addEventListener('click', closeUserDropdowns);
    }
    document.querySelectorAll('.nav-logout-btn').forEach(function(btn) {
      btn.onclick = function() { window.bbAuth.logout().then(function() { location.reload(); }); };
    });
    document.querySelectorAll('.mobile-nav-logout').forEach(function(btn) {
      btn.onclick = function() { window.bbAuth.logout().then(function() { location.reload(); }); };
    });
    document.querySelectorAll('.mobile-nav-theme').forEach(function(btn) {
      btn.onclick = function() {
        if (window.bbTheme) {
          window.bbTheme.toggleTheme();
          renderNav();
        }
      };
    });
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function closeUserDropdowns() {
    document.querySelectorAll('.nav-user-dropdown.open').forEach(function(d) { d.classList.remove('open'); });
    document.querySelectorAll('.nav-user-trigger[aria-expanded="true"]').forEach(function(t) { t.setAttribute('aria-expanded', 'false'); });
  }

  function initMobileMenu() {
    var btn = document.getElementById('nav-menu-btn');
    var menu = document.getElementById('mobile-menu');
    var overlay = document.getElementById('mobile-overlay');
    var panel = document.getElementById('mobile-panel');
    if (btn && menu) {
      btn.innerHTML = typeof Icons !== 'undefined' ? Icons.menu : '';
      function open() { menu.classList.add('open'); }
      function closeMenu() {
        menu.classList.remove('open');
        closeUserDropdowns();
      }
      btn.addEventListener('click', open);
      overlay.addEventListener('click', closeMenu);
      if (panel) {
        panel.addEventListener('click', function(e) {
          if (e.target.closest('#mobile-close') || e.target.closest('a.mobile-nav-item') || e.target.closest('.mobile-nav-logout') || e.target.closest('.mobile-nav-theme')) closeMenu();
        });
      }
    }
  }

  function initScroll() {
    var nav = document.getElementById('navbar');
    if (!nav) return;
    function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 5); }
    window.addEventListener('scroll', onScroll);
    onScroll();
  }

  function activeLink() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link[href="' + path + '"]').forEach(function(a) { a.classList.add('active'); });
    document.querySelectorAll('.nav-link[href="products.html"], .nav-link[href="products.html' + window.location.search + '"]').forEach(function(a) {
      if (path === 'products.html') a.classList.add('active');
    });
  }

  function bootstrap() {
    renderCartIcon();
    renderNav();
    initMobileMenu();
    initScroll();
    activeLink();
    if (window.bbAuth) {
      window.bbAuth.fetchUser().then(function() {
        renderNav();
        var u = window.bbAuth.getUser();
        if (u && window.bbCart) window.bbCart.fetchCart();
      });
      window.bbAuth.subscribe(renderNav);
    }
    if (window.bbCart) window.bbCart.subscribe(renderNav);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
