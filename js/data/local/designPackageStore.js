import { createProfileScopedStore } from "./profileScopedStore.js";

const KEY = "lumenDesignPackages";
const MAX_INSTALLED = 24;

function normalizePackageEntry(entry = {}) {
  const id = String(entry?.id || "").trim();
  if (!id) return null;
  return {
    id,
    name: String(entry.name || id),
    version: String(entry.version || "0.0.0"),
    apiVersion: Number(entry.apiVersion) || 1,
    author: String(entry.author || ""),
    description: String(entry.description || ""),
    baseThemeName: String(entry.baseThemeName || "WHITE").toUpperCase(),
    sourceUrl: String(entry.sourceUrl || ""),
    installedAt: Number(entry.installedAt) || Date.now(),
    updatedAt: Number(entry.updatedAt) || Date.now(),
    tokens: entry.tokens && typeof entry.tokens === "object" ? entry.tokens : {},
    css: String(entry.css || ""),
    cssVariables:
      entry.cssVariables && typeof entry.cssVariables === "object" ? entry.cssVariables : {},
    supporterOnly: Boolean(entry.supporterOnly)
  };
}

function normalizeStore(value = {}) {
  const packages = {};
  const source = value?.packages && typeof value.packages === "object" ? value.packages : {};
  Object.values(source).forEach((entry) => {
    const normalized = normalizePackageEntry(entry);
    if (normalized) packages[normalized.id] = normalized;
  });
  return { packages };
}

const store = createProfileScopedStore({
  key: KEY,
  normalize: normalizeStore
});

export const DesignPackageStore = {
  get() {
    return store.get();
  },

  list() {
    return Object.values(this.get().packages || {}).sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    );
  },

  getById(packageId) {
    const id = String(packageId || "").trim();
    return this.get().packages?.[id] || null;
  },

  upsert(entry) {
    const normalized = normalizePackageEntry(entry);
    if (!normalized) {
      throw new Error("Invalid design package");
    }
    const current = this.get();
    const packages = { ...current.packages };
    const isUpdate = Boolean(packages[normalized.id]);
    if (!isUpdate && Object.keys(packages).length >= MAX_INSTALLED) {
      throw new Error(`Design package limit reached (${MAX_INSTALLED})`);
    }
    packages[normalized.id] = {
      ...normalized,
      installedAt: isUpdate ? packages[normalized.id].installedAt : Date.now(),
      updatedAt: Date.now()
    };
    store.set({ packages });
    return packages[normalized.id];
  },

  remove(packageId) {
    const id = String(packageId || "").trim();
    if (!id) return false;
    const current = this.get();
    if (!current.packages?.[id]) return false;
    const packages = { ...current.packages };
    delete packages[id];
    store.set({ packages });
    return true;
  },

  clear() {
    store.set({ packages: {} });
  }
};
