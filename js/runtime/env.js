(function bootstrapNuvioEnv() {
  var root = typeof globalThis !== "undefined" ? globalThis : window;
  var existing = root.__NUVIO_ENV__ || {};

  function pick(key, fallback, requireNonEmpty) {
    var value = existing[key];
    if (typeof value === "undefined") return fallback;
    if (requireNonEmpty && !String(value || "").trim()) return fallback;
    return value;
  }

  root.__NUVIO_ENV__ = {
    NUVIO_SUPABASE_URL: pick("NUVIO_SUPABASE_URL", "http://127.0.0.1:3847/api/bridge", true),
    NUVIO_SUPABASE_ANON_KEY: pick("NUVIO_SUPABASE_ANON_KEY", "lumen-local-anon", true),
    NUVIO_SUPABASE_FALLBACK_URL: pick("NUVIO_SUPABASE_FALLBACK_URL", "", false),
    TV_LOGIN_WEB_BASE_URL: pick("TV_LOGIN_WEB_BASE_URL", "http://127.0.0.1:3847/tv-login", true),
    DEVICE_LOGIN_WEB_BASE_URL: pick(
      "DEVICE_LOGIN_WEB_BASE_URL",
      "http://127.0.0.1:3847/link",
      true
    ),
    LUMEN_SYNC_URL: pick("LUMEN_SYNC_URL", "http://127.0.0.1:3847", true),
    YOUTUBE_PROXY_URL: pick("YOUTUBE_PROXY_URL", "youtube-proxy.html", true),
    INTRODB_API_URL: pick("INTRODB_API_URL", "https://api.introdb.app/", true),
    IMDB_RATINGS_API_BASE_URL: pick("IMDB_RATINGS_API_BASE_URL", "", false),
    IMDB_TAPFRAME_API_BASE_URL: pick("IMDB_TAPFRAME_API_BASE_URL", "", false),
    AVATAR_PUBLIC_BASE_URL: pick("AVATAR_PUBLIC_BASE_URL", "", false),
    UNIQUE_CONTRIBUTIONS_BASE_URL: pick("UNIQUE_CONTRIBUTIONS_BASE_URL", "", false),
    SUPPORTERS_API_BASE_URL: pick("SUPPORTERS_API_BASE_URL", "https://nuvio.tv/", true),
    SUPPORT_URL: pick("SUPPORT_URL", "https://nuvio.tv/support", true),
    SPONSOR_NAMES: pick("SPONSOR_NAMES", "ragmehos.", true),
    TMDB_API_KEY: pick("TMDB_API_KEY", "", false),
    TRAKT_CLIENT_ID: pick("TRAKT_CLIENT_ID", "", false),
    TRAKT_CLIENT_SECRET: pick("TRAKT_CLIENT_SECRET", "", false),
    SIMKL_CLIENT_ID: pick("SIMKL_CLIENT_ID", "", false),
    SIMKL_APP_NAME: pick("SIMKL_APP_NAME", "nuvio", true),
    PREMIUMIZE_CLIENT_ID: pick("PREMIUMIZE_CLIENT_ID", "", false)
  };
})();
