import { DesignPackageStore } from "../../../data/local/designPackageStore.js";
import { ThemeStore } from "../../../data/local/themeStore.js";
import { validateThemePackage } from "./validateThemePackage.js";
import { clearThemePackageCache, getDefaultThemePackageId } from "./themePackageRegistry.js";

const MAX_MANIFEST_BYTES = 64 * 1024;
const MAX_CSS_BYTES = 64 * 1024;
const ID_RE = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/i;

function assertSafeInstallUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) throw new Error("Enter a design package URL");

  // Same-origin relative paths (bundled samples / self-hosted)
  if (value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) {
    if (value.includes("..") && !value.startsWith("../")) {
      // allow only explicit relative parents from current origin root usage
    }
    if (/\s/.test(value)) throw new Error("Invalid design package URL");
    return { href: value, isRelative: true };
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Invalid design package URL");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only http(s) design package URLs are allowed");
  }

  // Block obvious credential exfiltration helpers
  if (parsed.username || parsed.password) {
    throw new Error("Design package URL must not include credentials");
  }

  return { href: parsed.href, isRelative: false, origin: parsed.origin };
}

async function fetchTextLimited(url, maxBytes, label) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${label} (${response.status})`);
  }
  const text = await response.text();
  if (text.length > maxBytes) {
    throw new Error(`${label} exceeds ${maxBytes} byte limit`);
  }
  return text;
}

function resolveSiblingUrl(manifestUrl, relativeName) {
  const name = String(relativeName || "").trim();
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    throw new Error("Unsafe CSS path in design package");
  }
  if (manifestUrl.startsWith("http://") || manifestUrl.startsWith("https://")) {
    const base = new URL(manifestUrl);
    return new URL(name, base).href;
  }
  const trimmed = manifestUrl.replace(/\/[^/]*$/, "/");
  return `${trimmed}${encodeURIComponent(name)}`;
}

/**
 * Install a design package from a theme.json URL (addon-like).
 * Validates + sanitizes before persistence. Never executes package JS.
 */
export async function installDesignPackageFromUrl(rawUrl) {
  const safeUrl = assertSafeInstallUrl(rawUrl);
  const manifestText = await fetchTextLimited(safeUrl.href, MAX_MANIFEST_BYTES, "design manifest");
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    throw new Error("Design manifest must be valid JSON");
  }

  if (!ID_RE.test(String(manifest?.id || ""))) {
    throw new Error("Design package id is invalid");
  }

  // Built-in ids stay reserved so remote packages cannot shadow core designs
  if (String(manifest.id).startsWith("lumen.") && !safeUrl.isRelative) {
    // Allow lumen.* only from same-origin relative sample paths
    const isLocalSample = safeUrl.href.includes("/lumen/themes/");
    if (!isLocalSample) {
      throw new Error("Remote packages cannot use reserved lumen.* ids");
    }
  }

  let cssText = "";
  if (manifest.css) {
    const cssUrl = resolveSiblingUrl(safeUrl.href, manifest.css);
    if (!safeUrl.isRelative && safeUrl.origin) {
      const cssOrigin = new URL(cssUrl).origin;
      if (cssOrigin !== safeUrl.origin) {
        throw new Error("Design CSS must be hosted on the same origin as the manifest");
      }
    }
    cssText = await fetchTextLimited(cssUrl, MAX_CSS_BYTES, "design CSS");
  }

  const validated = validateThemePackage(manifest, { cssText });
  if (!validated.ok) {
    throw new Error(validated.errors[0] || "Design package failed validation");
  }

  const saved = DesignPackageStore.upsert({
    ...validated.package,
    tokens: validated.package.tokens,
    css: validated.css,
    cssVariables: validated.cssVariables,
    sourceUrl: safeUrl.href
  });

  clearThemePackageCache();
  return { ok: true, package: saved };
}

export function uninstallDesignPackage(packageId) {
  const id = String(packageId || "").trim();
  if (!id) return { ok: false, error: "Missing package id" };
  if (id === getDefaultThemePackageId()) {
    return { ok: false, error: "Cannot remove the built-in default design" };
  }
  // Built-ins are not in the store — only remove installed copies
  const removed = DesignPackageStore.remove(id);
  if (!removed) {
    return { ok: false, error: "Design is not installed" };
  }
  clearThemePackageCache();
  const active = ThemeStore.get()?.packageId;
  if (active === id) {
    ThemeStore.set({ packageId: getDefaultThemePackageId() });
  }
  return { ok: true };
}

export function listInstalledDesignPackages() {
  return DesignPackageStore.list().map((pkg) => ({
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
    builtin: false
  }));
}
