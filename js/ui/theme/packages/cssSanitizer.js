import { ALLOWED_CSS_VAR_SET } from "./tokenMap.js";

const FORBIDDEN_PATTERNS = [
  /@import/i,
  /@charset/i,
  /@font-face/i,
  /@keyframes/i,
  /expression\s*\(/i,
  /javascript\s*:/i,
  /url\s*\(/i,
  /behavior\s*:/i,
  /-moz-binding/i,
  /position\s*:\s*fixed/i,
  /position\s*:\s*absolute/i,
  /pointer-events\s*:/i,
  /z-index\s*:/i,
  /display\s*:\s*none/i,
  /visibility\s*:\s*hidden/i
];

// Designs may only style the document root / theme attribute — never player, addon, or focus engine nodes.
const ALLOWED_SELECTOR_RE =
  /^(:root|html|body|\[data-lumen-theme(?:=["'][\w.-]+["'])?\])(\s*,\s*(:root|html|body|\[data-lumen-theme(?:=["'][\w.-]+["'])?\]))*$/i;

const DECLARATION_RE = /(--[\w-]+)\s*:\s*([^;]+);?/g;

/**
 * Sanitize theme CSS so only allowlisted custom properties on safe selectors remain.
 * @param {string} cssText
 * @param {string} [packageId]
 * @returns {{ ok: boolean, css: string, errors: string[] }}
 */
export function sanitizeThemeCss(cssText, packageId = "") {
  const errors = [];
  const source = String(cssText || "");

  if (!source.trim()) {
    return { ok: true, css: "", errors };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(source)) {
      errors.push(`Forbidden CSS construct matched: ${pattern}`);
    }
  }

  if (errors.length) {
    return { ok: false, css: "", errors };
  }

  const blocks = [];
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = ruleRe.exec(source)) !== null) {
    const selector = String(match[1] || "")
      .trim()
      .replace(/\s+/g, " ");
    const body = String(match[2] || "");
    if (!ALLOWED_SELECTOR_RE.test(selector)) {
      errors.push(`Disallowed selector: ${selector}`);
      continue;
    }

    const declarations = [];
    let decl;
    DECLARATION_RE.lastIndex = 0;
    while ((decl = DECLARATION_RE.exec(body)) !== null) {
      const prop = decl[1];
      const value = String(decl[2] || "").trim();
      if (!ALLOWED_CSS_VAR_SET.has(prop) && !prop.startsWith("--lumen-")) {
        errors.push(`Disallowed CSS variable: ${prop}`);
        continue;
      }
      if (!value || /[{}]/.test(value) || /url\s*\(/i.test(value)) {
        errors.push(`Unsafe value for ${prop}`);
        continue;
      }
      declarations.push(`${prop}: ${value};`);
    }

    if (declarations.length) {
      const scopedSelector =
        packageId && selector.includes(":root")
          ? selector.replace(/:root/g, `:root, [data-lumen-theme="${packageId}"]`)
          : selector;
      blocks.push(`${scopedSelector} {\n  ${declarations.join("\n  ")}\n}`);
    }
  }

  if (!blocks.length && source.includes("{")) {
    errors.push("No safe CSS declarations found");
  }

  if (errors.length && !blocks.length) {
    return { ok: false, css: "", errors };
  }

  return {
    ok: true,
    css: blocks.join("\n"),
    errors
  };
}
