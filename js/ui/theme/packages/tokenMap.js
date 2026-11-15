/**
 * Allowlisted token → CSS custom property map.
 * Themes may only set these variables (plus --lumen-* cosmetics via sanitized CSS).
 */

export const ALLOWED_CSS_VARS = Object.freeze([
  "--bg-color",
  "--bg-elevated",
  "--card-bg",
  "--secondary-color",
  "--secondary-variant",
  "--on-secondary",
  "--text-color",
  "--text-secondary",
  "--text-tertiary",
  "--border-color",
  "--focus-color",
  "--focus-bg",
  "--accent-gradient",
  "--app-font-family",
  "--tv-safe-gutter",
  "--tv-safe-gutter-wide",
  "--tv-card-radius",
  "--tv-card-gap",
  "--tv-button-height",
  "--tv-button-padding-x",
  "--tv-title-text",
  "--tv-subtitle-text",
  "--tv-body-text",
  "--lumen-hero-overlay",
  "--lumen-glass-bg",
  "--lumen-glass-blur",
  "--lumen-glass-opacity",
  "--lumen-card-expand-scale",
  "--lumen-title-shadow",
  "--lumen-motion-fast-ms",
  "--lumen-motion-normal-ms",
  "--lumen-motion-cinematic-ms",
  "--lumen-rail-scale",
  "--lumen-density",
  "--lumen-poster-radius",
  "--lumen-brand",
  "--lumen-hero-overlay-bottom"
]);

export const ALLOWED_CSS_VAR_SET = new Set(ALLOWED_CSS_VARS);

const FONT_STACKS = Object.freeze({
  INTER: '"Inter", "Segoe UI", Arial, sans-serif',
  DM_SANS: '"DM Sans", "Segoe UI", Arial, sans-serif',
  OPEN_SANS: '"Open Sans", "Segoe UI", Arial, sans-serif'
});

const HEX_RE = /^#([0-9a-fA-F]{6})$/;
const CSS_LENGTH_RE = /^-?\d+(\.\d+)?(px|%|vw|vh|rem|em)$/;
const CSS_TIME_MS_RE = /^\d+(\.\d+)?$/;
const CSS_BLUR_RE = /^\d+(\.\d+)?px$/;

function isHex(value) {
  return HEX_RE.test(String(value || "").trim());
}

function isLength(value) {
  return CSS_LENGTH_RE.test(String(value || "").trim());
}

function clampOpacity(value, fallback = 0.5) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(1, num));
}

/**
 * Convert package tokens into CSS variable map. Unknown keys are ignored.
 * @param {object} tokens
 * @returns {Record<string, string>}
 */
export function tokensToCssVariables(tokens = {}) {
  const colors = tokens.colors || {};
  const typography = tokens.typography || {};
  const spacing = tokens.spacing || {};
  const shapes = tokens.shapes || {};
  const motion = tokens.motion || {};
  const glass = tokens.glass || {};
  const hero = tokens.hero || {};
  const layout = tokens.layout || {};
  const vars = {};

  if (isHex(colors.bg)) vars["--bg-color"] = colors.bg;
  if (isHex(colors.bgElevated)) vars["--bg-elevated"] = colors.bgElevated;
  if (isHex(colors.cardBg)) vars["--card-bg"] = colors.cardBg;
  if (isHex(colors.accent)) vars["--secondary-color"] = colors.accent;
  if (isHex(colors.accentStrong)) vars["--secondary-variant"] = colors.accentStrong;
  if (isHex(colors.onAccent)) vars["--on-secondary"] = colors.onAccent;
  if (isHex(colors.focus)) vars["--focus-color"] = colors.focus;
  if (isHex(colors.focusBg)) vars["--focus-bg"] = colors.focusBg;
  if (isHex(colors.text)) vars["--text-color"] = colors.text;
  if (isHex(colors.textSecondary)) vars["--text-secondary"] = colors.textSecondary;
  if (isHex(colors.textTertiary)) vars["--text-tertiary"] = colors.textTertiary;
  if (isHex(colors.border)) vars["--border-color"] = colors.border;
  if (isHex(colors.brand)) vars["--lumen-brand"] = colors.brand;
  if (isHex(colors.accent) && isHex(colors.accentStrong)) {
    vars["--accent-gradient"] =
      `linear-gradient(90deg, ${colors.accentStrong} 0%, ${colors.accent} 50%, ${colors.focus || colors.accent} 100%)`;
  }

  const fontKey = String(typography.fontFamily || "").toUpperCase();
  if (FONT_STACKS[fontKey]) {
    vars["--app-font-family"] = FONT_STACKS[fontKey];
  }
  const titleScale = Number(typography.titleScale);
  if (Number.isFinite(titleScale) && titleScale > 0.8 && titleScale < 1.4) {
    vars["--tv-title-text"] = `calc(48px * ${titleScale})`;
  }

  if (isLength(spacing.cardGap)) vars["--tv-card-gap"] = spacing.cardGap;
  if (isLength(spacing.safeGutter)) vars["--tv-safe-gutter"] = spacing.safeGutter;
  const density = String(spacing.density || "").toLowerCase();
  if (density === "compact" || density === "comfortable" || density === "spacious") {
    vars["--lumen-density"] = density;
  }

  if (isLength(shapes.cardRadius)) vars["--tv-card-radius"] = shapes.cardRadius;
  if (isLength(shapes.posterRadius)) {
    vars["--lumen-poster-radius"] = shapes.posterRadius;
  }

  if (CSS_TIME_MS_RE.test(String(motion.fastMs ?? ""))) {
    vars["--lumen-motion-fast-ms"] = `${Number(motion.fastMs)}ms`;
  }
  if (CSS_TIME_MS_RE.test(String(motion.normalMs ?? ""))) {
    vars["--lumen-motion-normal-ms"] = `${Number(motion.normalMs)}ms`;
  }
  if (CSS_TIME_MS_RE.test(String(motion.cinematicMs ?? ""))) {
    vars["--lumen-motion-cinematic-ms"] = `${Number(motion.cinematicMs)}ms`;
  }

  if (glass.enabled === true || glass.enabled === false) {
    vars["--lumen-glass-opacity"] = String(glass.enabled ? clampOpacity(glass.opacity, 0.55) : 0);
  } else if (glass.opacity != null) {
    vars["--lumen-glass-opacity"] = String(clampOpacity(glass.opacity, 0.55));
  }
  if (CSS_BLUR_RE.test(String(glass.blur || ""))) {
    vars["--lumen-glass-blur"] = String(glass.blur);
  }

  const strength = Number(hero.gradientStrength);
  if (Number.isFinite(strength) && strength >= 0 && strength <= 1) {
    const alpha = (0.35 + strength * 0.6).toFixed(2);
    vars["--lumen-hero-overlay"] =
      `linear-gradient(90deg, rgba(0,0,0,${alpha}) 0%, rgba(0,0,0,${(strength * 0.45).toFixed(2)}) 45%, rgba(0,0,0,0.05) 100%)`;
  }
  if (hero.titleShadow === true) {
    vars["--lumen-title-shadow"] = "0 8px 28px rgba(0, 0, 0, 0.5)";
  } else if (hero.titleShadow === false) {
    vars["--lumen-title-shadow"] = "none";
  }

  const railScale = Number(layout.railScale);
  if (Number.isFinite(railScale) && railScale > 0.7 && railScale < 1.4) {
    vars["--lumen-rail-scale"] = String(railScale);
  }
  if (layout.expandingCards === true) {
    vars["--lumen-card-expand-scale"] = "1.1";
  } else if (layout.expandingCards === false) {
    vars["--lumen-card-expand-scale"] = "1";
  }

  return vars;
}

export function filterAllowedCssVariables(vars = {}) {
  const next = {};
  for (const [key, value] of Object.entries(vars)) {
    if (!ALLOWED_CSS_VAR_SET.has(key)) continue;
    if (value == null || value === "") continue;
    next[key] = String(value);
  }
  return next;
}
