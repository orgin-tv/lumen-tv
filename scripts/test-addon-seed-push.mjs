#!/usr/bin/env node
/**
 * Unit-style checks for managed-addon filtering used by TV→Sync seed/push.
 */
import assert from "node:assert/strict";

const DEFAULT_ADDON_URLS = ["https://v3-cinemeta.strem.io", "https://opensubtitles-v3.strem.io"];

function normalizeAddonIdentity(url) {
  return String(url || "")
    .trim()
    .replace(/\/manifest\.json$/i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function isDefaultAddonUrlList(urls = []) {
  const normalized = Array.from(
    new Set((Array.isArray(urls) ? urls : []).map(normalizeAddonIdentity).filter(Boolean))
  );
  if (!normalized.length) return true;
  const defaults = new Set(DEFAULT_ADDON_URLS.map(normalizeAddonIdentity));
  return normalized.length <= defaults.size && normalized.every((url) => defaults.has(url));
}

function managedAddonUrls(urls = []) {
  return (Array.isArray(urls) ? urls : []).filter((url) => url && !isDefaultAddonUrlList([url]));
}

const TORRENTIO = "https://torrentio.strem.fun";

assert.equal(isDefaultAddonUrlList(DEFAULT_ADDON_URLS), true);
assert.equal(isDefaultAddonUrlList([...DEFAULT_ADDON_URLS, TORRENTIO]), false);
assert.deepEqual(managedAddonUrls([...DEFAULT_ADDON_URLS, TORRENTIO]), [TORRENTIO]);
assert.deepEqual(managedAddonUrls(DEFAULT_ADDON_URLS), []);
assert.deepEqual(managedAddonUrls([TORRENTIO]), [TORRENTIO]);

console.log("addon seed push helpers PASS");
