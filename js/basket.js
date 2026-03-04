(function(global) {
  var cart = null;
  var loading = false;
  var listeners = [];

  function emit() {
    listeners.forEach(function(fn) { fn({ cart: cart, loading: loading }); });
  }

  function setState(s) {
    if (s.cart !== undefined) cart = s.cart;
    if (s.loading !== undefined) loading = s.loading;
    emit();
  }

  global.bbCart = {
    getCart: function() { return cart; },
    getLoading: function() { return loading; },
    getItemCount: function() { return cart ? cart.itemCount : 0; },
    subscribe: function(fn) {
      listeners.push(fn);
      return function() { listeners = listeners.filter(function(x) { return x !== fn; }); };
    },

    fetchCart: function(mode) {
      setState({ loading: true });
      return global.bbApi.cart.get(mode ? { mode: mode } : null)
        .then(function(data) { setState({ cart: data, loading: false }); })
        .catch(function() { setState({ loading: false }); });
    },

    addItem: function(productId, quantity, mode) {
      return global.bbApi.cart.addItem(productId, quantity || 1)
        .then(function() { return global.bbApi.cart.get(mode ? { mode: mode } : null); })
        .then(function(data) { setState({ cart: data }); });
    },

    updateItem: function(itemId, quantity, mode) {
      return global.bbApi.cart.updateItem(itemId, quantity)
        .then(function() { return global.bbApi.cart.get(mode ? { mode: mode } : null); })
        .then(function(data) { setState({ cart: data }); });
    },

    removeItem: function(itemId, mode) {
      return global.bbApi.cart.removeItem(itemId)
        .then(function() { return global.bbApi.cart.get(mode ? { mode: mode } : null); })
        .then(function(data) { setState({ cart: data }); });
    },

    clearCart: function(mode) {
      return global.bbApi.cart.clear()
        .then(function() { return global.bbApi.cart.get(mode ? { mode: mode } : null); })
        .then(function(data) { setState({ cart: data }); });
    }
  };
})(typeof window !== 'undefined' ? window : this);
