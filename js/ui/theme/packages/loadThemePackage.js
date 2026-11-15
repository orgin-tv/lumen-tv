import { validateThemePackage } from "./validateThemePackage.js";

const PACKAGE_BASE = "lumen/themes";

async function readText(url) {
  if (typeof fetch === "function") {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    return response.text();
  }
  throw new Error("fetch is unavailable");
}

async function readJson(url) {
  const text = await readText(url);
  return JSON.parse(text);
}

/**
 * Load a bundled theme package by id from lumen/themes/<id>/.
 * @param {string} packageId
 * @returns {Promise<{ ok: boolean, package?: object, cssVariables?: object, css?: string, errors: string[] }>}
 */
export async function loadThemePackage(packageId) {
  const id = String(packageId || "").trim();
  if (!id) {
    return { ok: false, errors: ["Missing package id"] };
  }

  try {
    const base = `${PACKAGE_BASE}/${encodeURIComponent(id)}`;
    const manifest = await readJson(`${base}/theme.json`);
    let cssText = "";
    const cssFile = manifest.css ? String(manifest.css) : "";
    if (cssFile && !cssFile.includes("..") && !cssFile.includes("/") && !cssFile.includes("\\")) {
      try {
        cssText = await readText(`${base}/${encodeURIComponent(cssFile)}`);
      } catch (error) {
        return {
          ok: false,
          errors: [`Failed to load theme CSS: ${error?.message || error}`]
        };
      }
    }
    return validateThemePackage(manifest, { cssText });
  } catch (error) {
    return {
      ok: false,
      errors: [`Failed to load theme package "${id}": ${error?.message || error}`]
    };
  }
}

/**
 * Load catalog of bundled package ids.
 * @returns {Promise<string[]>}
 */
export async function loadThemeCatalog() {
  try {
    const catalog = await readJson(`${PACKAGE_BASE}/catalog.json`);
    const packages = Array.isArray(catalog?.packages) ? catalog.packages : [];
    return packages.map((value) => String(value || "").trim()).filter(Boolean);
  } catch {
    return ["lumen.default", "lumen.cinema"];
  }
}
