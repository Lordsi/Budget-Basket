(function(global) {
  const API_BASE = global.API_BASE || 'http://localhost:5000/api';

  function getAuthHeader() {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }

  function request(method, path, data) {
    const url = API_BASE + path;
    const opts = {
      method: method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    };
    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      opts.body = JSON.stringify(data);
    }
    return fetch(url, opts).then(function(res) {
      if (res.status === 401) {
        return fetch(API_BASE + '/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }).then(function(refreshRes) {
          if (refreshRes.ok) {
            return refreshRes.json().then(function(d) {
              localStorage.setItem('accessToken', d.accessToken);
              return request(method, path, data);
            });
          }
          localStorage.removeItem('accessToken');
          if (typeof window !== 'undefined') window.location.href = 'auth/login.html';
          return Promise.reject(new Error('Unauthorized'));
        });
      }
      return res.text().then(function(txt) {
        var body;
        try { body = txt ? JSON.parse(txt) : {}; } catch (e) {
          throw new Error(res.status === 404 ? 'Service unavailable. Please try again.' : 'Invalid server response');
        }
        if (!res.ok) throw Object.assign(new Error(body.error || 'Request failed'), { response: res, body: body });
        return body;
      });
    });
  }

  const api = {
    auth: {
      register: function(data) { return request('POST', '/auth/register', data); },
      login: function(data) { return request('POST', '/auth/login', data); },
      logout: function() { return request('POST', '/auth/logout'); },
      me: function() { return request('GET', '/auth/me'); }
    },
    products: {
      list: function(params) {
        const q = params ? '?' + new URLSearchParams(params).toString() : '';
        return request('GET', '/products' + q);
      },
      suggest: function(q) {
        return request('GET', '/products/suggest?' + new URLSearchParams({ q: q || '' }).toString());
      },
      deals: function() { return request('GET', '/products/deals'); },
      popular: function() { return request('GET', '/products/popular'); },
      ticker: function() { return request('GET', '/products/ticker'); },
      categories: function() { return request('GET', '/products/categories'); },
      get: function(id) { return request('GET', '/products/' + id); }
    },
    stores: { list: function() { return request('GET', '/stores'); } },
    comparison: {
      product: function(id) { return request('GET', '/compare/' + id); },
      basket: function(items) { return request('POST', '/compare/basket', { items: items }); }
    },
    cart: {
      get: function(params) {
        const q = params && (params.mode) ? '?mode=' + encodeURIComponent(params.mode) : '';
        return request('GET', '/cart' + q);
      },
      addItem: function(productId, quantity) { return request('POST', '/cart/items', { productId: productId, quantity: quantity || 1 }); },
      updateItem: function(itemId, quantity) { return request('PATCH', '/cart/items/' + itemId, { quantity: quantity }); },
      removeItem: function(itemId) { return request('DELETE', '/cart/items/' + itemId); },
      clear: function() { return request('DELETE', '/cart'); }
    },
    savedLists: {
      list: function() { return request('GET', '/saved-lists'); },
      create: function(name) { return request('POST', '/saved-lists', { name: name }); },
      remove: function(id) { return request('DELETE', '/saved-lists/' + id); },
      refresh: function(id, mode) {
        var q = mode ? '?mode=' + encodeURIComponent(mode) : '';
        return request('GET', '/saved-lists/' + id + '/refresh' + q);
      },
      load: function(id) { return request('POST', '/saved-lists/' + id + '/load'); }
    },
    watchlist: {
      list: function() { return request('GET', '/watchlist'); },
      add: function(productId) { return request('POST', '/watchlist', { productId: productId }); },
      remove: function(productId) { return request('DELETE', '/watchlist/' + productId); }
    },
    dashboard: {
      stats: function() { return request('GET', '/dashboard/stats'); },
      leaderboard: function() { return request('GET', '/dashboard/leaderboard'); },
      priceAlerts: function() { return request('GET', '/dashboard/price-alerts'); },
      trending: function() { return request('GET', '/dashboard/trending'); }
    }
  };

  global.bbApi = api;
})(typeof window !== 'undefined' ? window : this);
