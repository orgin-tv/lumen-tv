/**
 * Resolve the Lumen Sync web desk origin and deep-link paths.
 * TV settings should open Sync for management that belongs on the desk.
 */
export function getLumenSyncOrigin() {
  const env = globalThis.__NUVIO_ENV__ || {};
  const fromSync = String(env.LUMEN_SYNC_URL || "").trim();
  if (fromSync) return fromSync.replace(/\/+$/, "");
  const fromDeviceLogin = String(env.DEVICE_LOGIN_WEB_BASE_URL || "").trim();
  if (fromDeviceLogin) {
    return fromDeviceLogin.replace(/\/link\/?$/i, "").replace(/\/+$/, "");
  }
  const fromTvLogin = String(env.TV_LOGIN_WEB_BASE_URL || "").trim();
  if (fromTvLogin) {
    return fromTvLogin.replace(/\/tv-login\/?$/i, "").replace(/\/+$/, "");
  }
  return "http://127.0.0.1:3847";
}

export function getLumenSyncUrl(path = "/dashboard") {
  const origin = getLumenSyncOrigin();
  const normalized = String(path || "/dashboard").startsWith("/")
    ? String(path || "/dashboard")
    : `/${path}`;
  return `${origin}${normalized}`;
}

export function openLumenSync(path = "/dashboard") {
  const url = getLumenSyncUrl(path);
  const opened = globalThis.window?.open?.(url, "_blank", "noopener");
  if (!opened && globalThis.window?.location) {
    globalThis.window.location.assign(url);
  }
  return url;
}
