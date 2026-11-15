import { REQUIRED_THEME_PACKAGE_FIELDS, isSupportedThemeApiVersion } from "./schema.js";
import { sanitizeThemeCss } from "./cssSanitizer.js";
import { tokensToCssVariables } from "./tokenMap.js";

const ID_RE = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/i;

/**
 * Validate a theme package object (and optional CSS text).
 * @param {object} pkg
 * @param {{ cssText?: string }} [options]
 * @returns {{ ok: boolean, package: object|null, cssVariables: Record<string,string>, css: string, errors: string[] }}
 */
export function validateThemePackage(pkg, options = {}) {
  const errors = [];
  if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) {
    return {
      ok: false,
      package: null,
      cssVariables: {},
      css: "",
      errors: ["Theme package must be an object"]
    };
  }

  for (const field of REQUIRED_THEME_PACKAGE_FIELDS) {
    if (pkg[field] == null || pkg[field] === "") {
      errors.push(`Missing required field: ${field}`);
    }
  }

  const id = String(pkg.id || "").trim();
  if (id && !ID_RE.test(id)) {
    errors.push("Invalid package id");
  }

  if (!isSupportedThemeApiVersion(pkg.apiVersion)) {
    errors.push(`Unsupported apiVersion: ${pkg.apiVersion}`);
  }

  if (!pkg.tokens || typeof pkg.tokens !== "object" || Array.isArray(pkg.tokens)) {
    errors.push("tokens must be an object");
  }

  const cssVariables = tokensToCssVariables(pkg.tokens || {});
  let css = "";
  if (options.cssText) {
    const sanitized = sanitizeThemeCss(options.cssText, id);
    if (!sanitized.ok) {
      errors.push(...sanitized.errors);
    } else {
      css = sanitized.css;
      if (sanitized.errors.length) {
        // Soft warnings for dropped declarations — keep package if any safe CSS remains.
      }
    }
  }

  if (errors.length) {
    return { ok: false, package: null, cssVariables: {}, css: "", errors };
  }

  return {
    ok: true,
    package: {
      id,
      name: String(pkg.name || id),
      version: String(pkg.version || "0.0.0"),
      apiVersion: Number(pkg.apiVersion),
      author: String(pkg.author || ""),
      description: String(pkg.description || ""),
      baseThemeName: String(pkg.baseThemeName || "WHITE").toUpperCase(),
      tokens: pkg.tokens,
      css: pkg.css ? String(pkg.css) : null,
      preview: pkg.preview ? String(pkg.preview) : null,
      supporterOnly: Boolean(pkg.supporterOnly)
    },
    cssVariables,
    css,
    errors: []
  };
}
