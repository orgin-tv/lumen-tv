import { ThemeStore } from "../../../data/local/themeStore.js";
import { getDefaultThemePackageId, getThemePackage } from "./themePackageRegistry.js";
import { filterAllowedCssVariables } from "./tokenMap.js";

const PACKAGE_STYLE_ID = "lumen-theme-package";
const APPLIED_VAR_ATTR = "data-lumen-applied-vars";

function clearPreviousPackageVars(root) {
  const previous = String(root.getAttribute(APPLIED_VAR_ATTR) || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  previous.forEach((name) => {
    root.style.removeProperty(name);
  });
  root.removeAttribute(APPLIED_VAR_ATTR);
}

function injectPackageCss(cssText) {
  if (typeof document === "undefined") return;
  let styleEl = document.getElementById(PACKAGE_STYLE_ID);
  if (!cssText) {
    if (styleEl) styleEl.remove();
    return;
  }
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = PACKAGE_STYLE_ID;
  }
  styleEl.textContent = cssText;
  document.head.appendChild(styleEl);
}

function applyCssVariables(root, vars) {
  const names = [];
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
    names.push(key);
  });
  root.setAttribute(APPLIED_VAR_ATTR, names.join(","));
}

/**
 * Apply an installable theme package on top of the current palette.
 * Falls back to the default Lumen package when invalid.
 * @param {{ packageId?: string|null, colors?: Record<string,string> }} [options]
 * @returns {Promise<{ packageId: string|null, ok: boolean, fallback: boolean, errors: string[] }>}
 */
export async function applyThemePackage({ packageId = null, colors = null } = {}) {
  if (typeof document === "undefined") {
    return { packageId: null, ok: true, fallback: false, errors: [] };
  }

  const root = document.documentElement;
  clearPreviousPackageVars(root);

  const requestedId = String(packageId || ThemeStore.get()?.packageId || "").trim();
  if (!requestedId) {
    root.removeAttribute("data-lumen-theme");
    root.removeAttribute("data-lumen-design");
    root.removeAttribute("data-lumen-density");
    injectPackageCss("");
    return { packageId: null, ok: true, fallback: false, errors: [] };
  }

  let loaded = await getThemePackage(requestedId);
  let fallback = false;
  let errors = loaded.ok ? [] : [...(loaded.errors || [])];

  if (!loaded.ok) {
    fallback = true;
    const defaultId = getDefaultThemePackageId();
    loaded = await getThemePackage(defaultId);
    if (!loaded.ok) {
      root.removeAttribute("data-lumen-theme");
      root.removeAttribute("data-lumen-design");
      root.removeAttribute("data-lumen-density");
      injectPackageCss("");
      if (ThemeStore.get()?.packageId) {
        ThemeStore.set({ packageId: null });
      }
      return {
        packageId: null,
        ok: false,
        fallback: true,
        errors: [...errors, ...(loaded.errors || ["Default theme package failed"])]
      };
    }
    if (ThemeStore.get()?.packageId !== defaultId) {
      ThemeStore.set({ packageId: defaultId });
    }
  }

  const vars = filterAllowedCssVariables(loaded.cssVariables || {});
  applyCssVariables(root, vars);
  injectPackageCss(loaded.css || "");
  root.setAttribute("data-lumen-theme", loaded.package.id);
  root.setAttribute("data-lumen-design", loaded.package.id);
  const density = vars["--lumen-density"] || loaded.package?.tokens?.spacing?.density;
  if (density) {
    root.setAttribute("data-lumen-density", String(density));
  } else {
    root.removeAttribute("data-lumen-density");
  }

  // Keep palette-derived player tokens in sync when package overrides accent colors.
  if (colors && vars["--secondary-color"]) {
    root.style.setProperty("--player-secondary", vars["--secondary-color"]);
    root.style.setProperty(
      "--player-accent-gradient",
      vars["--accent-gradient"] || vars["--secondary-color"]
    );
  }

  return {
    packageId: loaded.package.id,
    ok: true,
    fallback,
    errors
  };
}
