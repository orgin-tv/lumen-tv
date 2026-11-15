/**
 * Pure readers for the Lumen dashboard. The TV app remains the source of truth;
 * this only interprets the same local storage envelopes.
 */

export function readProfileScoped(value, profileId = "1") {
  if (
    value &&
    typeof value === "object" &&
    value.__profileScoped === true &&
    value.profiles &&
    typeof value.profiles === "object"
  ) {
    const id = String(profileId || "1");
    if (Object.prototype.hasOwnProperty.call(value.profiles, id)) {
      return value.profiles[id];
    }
    return null;
  }
  return value ?? null;
}

export function listAddonUrls(stored, profileId = "1") {
  const scoped = readProfileScoped(stored, profileId);
  const list = Array.isArray(scoped) ? scoped : Array.isArray(stored) ? stored : [];
  return list.map((value) => String(value || "").trim()).filter(Boolean);
}

export function addonLabel(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const tail = parsed.pathname.split("/").filter(Boolean).slice(-1)[0] || "";
    return tail ? `${host} · ${tail}` : host;
  } catch {
    return String(url || "");
  }
}
