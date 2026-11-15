import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateThemePackage } from "./validateThemePackage.js";
import { sanitizeThemeCss } from "./cssSanitizer.js";
import { tokensToCssVariables } from "./tokenMap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../../../");

test("a custom package can set canvas, focus, brand, and poster radius", () => {
  const result = validateThemePackage(
    {
      id: "studio.custom",
      name: "Studio Custom",
      version: "1.0.0",
      apiVersion: 1,
      tokens: {
        colors: {
          bg: "#141414",
          accent: "#FFFFFF",
          accentStrong: "#E5E5E5",
          brand: "#E50914",
          focus: "#FFFFFF"
        },
        shapes: { posterRadius: "4px", cardRadius: "4px" }
      }
    },
    {
      cssText: ":root { --lumen-hero-overlay: linear-gradient(90deg, #141414, transparent); }"
    }
  );
  assert.equal(result.ok, true);
  assert.equal(result.cssVariables["--bg-color"], "#141414");
  assert.equal(result.cssVariables["--secondary-color"], "#FFFFFF");
  assert.equal(result.cssVariables["--lumen-brand"], "#E50914");
  assert.equal(result.cssVariables["--lumen-poster-radius"], "4px");
  assert.equal(result.cssVariables["--focus-color"], "#FFFFFF");
  assert.ok(result.css.includes("--lumen-hero-overlay"));
});

test("validates lumen.default package from disk", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(rootDir, "lumen/themes/lumen.default/theme.json"), "utf8")
  );
  const cssText = await readFile(
    path.join(rootDir, "lumen/themes/lumen.default/theme.css"),
    "utf8"
  );
  const result = validateThemePackage(manifest, { cssText });
  assert.equal(result.ok, true);
  assert.equal(result.package.id, "lumen.default");
  assert.ok(result.cssVariables["--secondary-color"]);
  assert.ok(result.css.includes("--lumen-hero-overlay"));
});

test("rejects packages with unsupported apiVersion", () => {
  const result = validateThemePackage({
    id: "bad.theme",
    name: "Bad",
    version: "1.0.0",
    apiVersion: 99,
    tokens: { colors: { accent: "#ffffff" } }
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => /apiVersion/i.test(error)));
});

test("sanitizer blocks @import and absolute positioning", () => {
  const blockedImport = sanitizeThemeCss(
    '@import url("https://evil.test/x.css"); :root { --bg-color: #000000; }'
  );
  assert.equal(blockedImport.ok, false);

  const blockedPosition = sanitizeThemeCss(":root { position: absolute; --bg-color: #111111; }");
  assert.equal(blockedPosition.ok, false);

  const blockedUrl = sanitizeThemeCss(
    ":root { --lumen-hero-overlay: url(https://evil.test/x.png); }"
  );
  assert.equal(blockedUrl.ok, false);

  const blockedHide = sanitizeThemeCss(":root { display: none; --bg-color: #111111; }");
  assert.equal(blockedHide.ok, false);
});

test("token map only emits allowlisted variables", () => {
  const vars = tokensToCssVariables({
    colors: { bg: "#0E0F12", accent: "#E8B45A", focus: "#F4D39A" },
    shapes: { cardRadius: "18px" },
    glass: { enabled: true, blur: "16px", opacity: 0.5 },
    unknown: { hack: true }
  });
  assert.equal(vars["--bg-color"], "#0E0F12");
  assert.equal(vars["--secondary-color"], "#E8B45A");
  assert.equal(vars["--tv-card-radius"], "18px");
  assert.equal(vars["--lumen-glass-blur"], "16px");
  assert.equal(vars.hack, undefined);
});

test("invalid hex colors are ignored", () => {
  const vars = tokensToCssVariables({
    colors: { bg: "red", accent: "#GGHHII", focus: "#ABCDEF" }
  });
  assert.equal(vars["--bg-color"], undefined);
  assert.equal(vars["--secondary-color"], undefined);
  assert.equal(vars["--focus-color"], "#ABCDEF");
});
