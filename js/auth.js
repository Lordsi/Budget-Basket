(function(global) {
  var user = null;
  var loading = false;
  var error = null;
  var listeners = [];

  function emit() {
    listeners.forEach(function(fn) { fn({ user: user, loading: loading, error: error }); });
  }

  function setState(s) {
    if (s.user !== undefined) user = s.user;
    if (s.loading !== undefined) loading = s.loading;
    if (s.error !== undefined) error = s.error;
    emit();
  }

  global.bbAuth = {
    getUser: function() { return user; },
    getLoading: function() { return loading; },
    getError: function() { return error; },
    subscribe: function(fn) {
      listeners.push(fn);
      return function() { listeners = listeners.filter(function(x) { return x !== fn; }); };
    },

    login: function(email, password) {
      setState({ loading: true, error: null });
      return global.bbApi.auth.login({ email: email, password: password })
        .then(function(data) {
          localStorage.setItem('accessToken', data.accessToken);
          setState({ user: data.user, loading: false });
        })
        .catch(function(err) {
          var msg = (err && err.body && err.body.error) ? err.body.error : (err && err.message) ? err.message : 'Login failed';
          setState({ error: msg, loading: false });
          throw new Error(msg);
        });
    },

    register: function(name, email, password) {
      setState({ loading: true, error: null });
      return global.bbApi.auth.register({ name: name, email: email, password: password })
        .then(function(data) {
          localStorage.setItem('accessToken', data.accessToken);
          setState({ user: data.user, loading: false });
        })
        .catch(function(err) {
          var msg = (err && err.body && err.body.error) ? err.body.error : (err && err.message) ? err.message : 'Registration failed';
          setState({ error: msg, loading: false });
          throw new Error(msg);
        });
    },

    logout: function() {
      return global.bbApi.auth.logout()
        .finally(function() {
          localStorage.removeItem('accessToken');
          setState({ user: null });
        });
    },

    fetchUser: function() {
      setState({ loading: true });
      return global.bbApi.auth.me()
        .then(function(data) { setState({ user: data.user, loading: false }); })
        .catch(function() { setState({ user: null, loading: false }); });
    },

    clearError: function() { setState({ error: null }); }
  };
})(typeof window !== 'undefined' ? window : this);
