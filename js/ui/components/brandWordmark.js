import { ThemeStore } from "../../data/local/themeStore.js";
import { LUMEN_APP_NAME, LUMEN_WORDMARK_ASSET } from "../../../lumen/branding/identity.js";

const BRAND_WORDMARK_ASSETS = Object.freeze({
  GOLD: "assets/brand/app_logo_wordmark_gold.png",
  JADE: "assets/brand/app_logo_wordmark_jade.png",
  ROSE_GOLD: "assets/brand/app_logo_wordmark_rose_gold.png",
  ARCTIC_BLUE: "assets/brand/app_logo_wordmark_arctic_blue.png",
  GRAPHITE: "assets/brand/app_logo_wordmark_graphite.png"
});

// LUMEN: default wordmark for non-supporter themes
const LUMEN_DEFAULT_WORDMARK = LUMEN_WORDMARK_ASSET;

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getBrandWordmarkAsset(themeName = null) {
  const storedThemeName =
    themeName || (typeof window !== "undefined" ? ThemeStore.get()?.themeName : "WHITE");
  const normalizedThemeName = String(storedThemeName || "WHITE")
    .trim()
    .toUpperCase();
  return BRAND_WORDMARK_ASSETS[normalizedThemeName] || LUMEN_DEFAULT_WORDMARK;
}

export function syncBrandWordmarks(themeName) {
  if (typeof document === "undefined") return;
  const src = getBrandWordmarkAsset(themeName);
  document.querySelectorAll("[data-theme-brand-wordmark]").forEach((image) => {
    if (image.getAttribute("src") !== src) {
      image.setAttribute("src", src);
    }
  });
}

export function renderBrandWordmarkImage({ className = "", alt = LUMEN_APP_NAME } = {}) {
  const safeClassName = className ? ` ${escapeHtml(className)}` : "";
  return `<img src="${getBrandWordmarkAsset()}" class="theme-brand-wordmark${safeClassName}" data-theme-brand-wordmark alt="${escapeHtml(alt)}" />`;
}
