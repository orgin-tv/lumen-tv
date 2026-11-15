import { LUMEN_DEFAULT_THEME_PACKAGE_ID } from "../../../../lumen/branding/identity.js";
import { DesignPackageStore } from "../../../data/local/designPackageStore.js";
import { loadThemeCatalog, loadThemePackage } from "./loadThemePackage.js";

const cache = new Map();
let catalogPromise = null;
let summariesPromise = null;

export function getDefaultThemePackageId() {
  return LUMEN_DEFAULT_THEME_PACKAGE_ID;
}

function summarizeInstalled(pkg) {
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    author: pkg.author,
    sourceUrl: pkg.sourceUrl,
    accent: pkg.cssVariables?.["--secondary-color"] || "#E8B45A",
    onAccent: pkg.cssVariables?.["--on-secondary"] || "#111111",
    baseThemeName: pkg.baseThemeName,
    installed: true,
    builtin: false,
    supporterOnly: Boolean(pkg.supporterOnly)
  };
}

export async function listThemePackageIds() {
  if (!catalogPromise) {
    catalogPromise = loadThemeCatalog();
  }
  const builtinIds = await catalogPromise;
  const installedIds = DesignPackageStore.list().map((pkg) => pkg.id);
  return Array.from(new Set([...builtinIds, ...installedIds]));
}

/**
 * Return lightweight summaries for settings UI (built-in + installed).
 */
export async function listThemePackageSummaries() {
  if (summariesPromise) return summariesPromise;
  summariesPromise = (async () => {
    const builtinIds = await loadThemeCatalog();
    const summaries = [];
    for (const id of builtinIds) {
      const loaded = await getThemePackage(id);
      if (!loaded.ok || !loaded.package) continue;
      summaries.push({
        id: loaded.package.id,
        name: loaded.package.name,
        description: loaded.package.description,
        accent: loaded.cssVariables?.["--secondary-color"] || "#E8B45A",
        onAccent: loaded.cssVariables?.["--on-secondary"] || "#111111",
        baseThemeName: loaded.package.baseThemeName,
        supporterOnly: loaded.package.supporterOnly,
        builtin: true,
        installed: false,
        version: loaded.package.version,
        author: loaded.package.author || "Lumen"
      });
    }
    for (const pkg of DesignPackageStore.list()) {
      if (summaries.some((item) => item.id === pkg.id)) continue;
      summaries.push(summarizeInstalled(pkg));
    }
    return summaries;
  })();
  return summariesPromise;
}

function fromInstalledStore(packageId) {
  const stored = DesignPackageStore.getById(packageId);
  if (!stored) return null;
  return {
    ok: true,
    package: {
      id: stored.id,
      name: stored.name,
      version: stored.version,
      apiVersion: stored.apiVersion,
      author: stored.author,
      description: stored.description,
      baseThemeName: stored.baseThemeName,
      tokens: stored.tokens,
      css: null,
      preview: null,
      supporterOnly: stored.supporterOnly
    },
    cssVariables: stored.cssVariables || {},
    css: stored.css || "",
    errors: [],
    source: "installed"
  };
}

export async function getThemePackage(packageId) {
  const id = String(packageId || "").trim();
  if (!id) {
    return { ok: false, errors: ["Missing package id"] };
  }
  if (cache.has(id)) {
    return cache.get(id);
  }

  // Prefer installed (user) packages so updates via URL win over older builtins of same id
  const installed = fromInstalledStore(id);
  if (installed) {
    cache.set(id, installed);
    return installed;
  }

  const loaded = await loadThemePackage(id);
  if (loaded.ok) {
    const withSource = { ...loaded, source: "builtin" };
    cache.set(id, withSource);
    return withSource;
  }
  return loaded;
}

export function clearThemePackageCache() {
  cache.clear();
  catalogPromise = null;
  summariesPromise = null;
}
