/* Persistence layer — API key, settings, company profile, and a small TTL cache.
   Everything lives in localStorage; the API key never leaves the browser except in the
   direct call to api.anthropic.com. */
(function () {
  const NS = "cockpit.";
  const K = {
    key: NS + "apiKey",
    settings: NS + "settings",
    profile: NS + "profile",
    demo: NS + "demoMode"
  };

  function readJSON(k, fallback) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  const store = {
    getKey() { try { return localStorage.getItem(K.key) || ""; } catch (e) { return ""; } },
    setKey(v) { try { v ? localStorage.setItem(K.key, v) : localStorage.removeItem(K.key); } catch (e) {} },

    getSettings() {
      const d = COCKPIT.config.defaults;
      return Object.assign(
        { model: d.model, creativity: d.creativity, effort: d.effort, cacheTtlMin: d.cacheTtlMin },
        readJSON(K.settings, {})
      );
    },
    setSettings(s) { writeJSON(K.settings, s); },

    getProfile() { return readJSON(K.profile, COCKPIT.defaultProfile); },
    setProfile(p) { writeJSON(K.profile, p); },
    resetProfile() { try { localStorage.removeItem(K.profile); } catch (e) {} },

    getDemoMode() {
      const v = readJSON(K.demo, null);
      return v === null ? false : !!v;
    },
    setDemoMode(b) { writeJSON(K.demo, !!b); },

    /* --- TTL cache, keyed by a hash of (cacheVersion, tab, params, profile). --- */
    cacheKey(tab, payload) {
      const profile = JSON.stringify(store.getProfile());
      const raw = [COCKPIT.config.cacheVersion, tab, JSON.stringify(payload), profile].join("|");
      return NS + "cache." + hash(raw);
    },
    cacheGet(tab, payload) {
      const k = store.cacheKey(tab, payload);
      const entry = readJSON(k, null);
      if (!entry) return null;
      const ttl = store.getSettings().cacheTtlMin * 60 * 1000;
      if (Date.now() - entry.t > ttl) { try { localStorage.removeItem(k); } catch (e) {} return null; }
      return entry.v;
    },
    cacheSet(tab, payload, value) {
      writeJSON(store.cacheKey(tab, payload), { t: Date.now(), v: value });
    },
    cacheClear() {
      try {
        const rm = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(NS + "cache.")) rm.push(k);
        }
        rm.forEach((k) => localStorage.removeItem(k));
        return rm.length;
      } catch (e) { return 0; }
    }
  };

  // Tiny stable string hash (djb2 → base36). Good enough for cache keys.
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  COCKPIT.store = store;
})();
