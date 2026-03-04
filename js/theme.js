(function(global) {
  var STORAGE_KEY = 'bbTheme';

  function getStored() {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'system';
    } catch (e) {
      return 'system';
    }
  }

  function prefersDark() {
    return global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function getEffectiveTheme() {
    var stored = getStored();
    if (stored === 'dark') return 'dark';
    if (stored === 'light') return 'light';
    return prefersDark() ? 'dark' : 'light';
  }

  function setTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
    applyTheme(getEffectiveTheme());
    if (typeof global.bbThemeEmit === 'function') global.bbThemeEmit(theme);
  }

  function applyTheme(effective) {
    var html = document.documentElement;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (effective === 'dark') {
      html.setAttribute('data-theme', 'dark');
      if (meta) meta.setAttribute('content', '#121212');
    } else {
      html.setAttribute('data-theme', 'light');
      if (meta) meta.setAttribute('content', '#e8f5e9');
    }
  }

  function toggleTheme() {
    var effective = getEffectiveTheme();
    var next = effective === 'dark' ? 'light' : 'dark';
    setTheme(next);
    return next;
  }

  function init() {
    applyTheme(getEffectiveTheme());
    if (global.matchMedia) {
      global.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
        if (getStored() === 'system') applyTheme(getEffectiveTheme());
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.bbTheme = {
    getTheme: getStored,
    getEffectiveTheme: getEffectiveTheme,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    subscribe: function(fn) {
      var prev = 'bbThemeEmit';
      var orig = global[prev];
      global[prev] = function(theme) {
        if (typeof orig === 'function') orig(theme);
        fn(theme);
      };
      return function() { global[prev] = orig; };
    }
  };
})(typeof window !== 'undefined' ? window : this);
