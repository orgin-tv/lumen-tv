import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateThemePackage } from "./validateThemePackage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../../../");

const storage = new Map();
globalThis.localStorage = {
  getItem(key) {
    return storage.has(String(key)) ? storage.get(String(key)) : null;
  },
  setItem(key, value) {
    storage.set(String(key), String(value));
  },
  removeItem(key) {
    storage.delete(String(key));
  },
  clear() {
    storage.clear();
  }
};

const { DesignPackageStore } = await import("../../../data/local/designPackageStore.js");

test("community.aurora sample validates as an installable design", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(rootDir, "lumen/themes/community.aurora/theme.json"), "utf8")
  );
  const cssText = await readFile(
    path.join(rootDir, "lumen/themes/community.aurora/theme.css"),
    "utf8"
  );
  const result = validateThemePackage(manifest, { cssText });
  assert.equal(result.ok, true);
  assert.equal(result.package.id, "community.aurora");
  assert.ok(result.cssVariables["--secondary-color"]);
});

test("design package store upserts and removes installed designs", () => {
  DesignPackageStore.clear();
  const saved = DesignPackageStore.upsert({
    id: "community.test",
    name: "Test Design",
    version: "1.0.0",
    apiVersion: 1,
    tokens: { colors: { accent: "#112233" } },
    css: ":root { --tv-card-radius: 12px; }",
    cssVariables: { "--tv-card-radius": "12px" },
    sourceUrl: "/lumen/themes/community.test/theme.json"
  });
  assert.equal(saved.id, "community.test");
  assert.equal(DesignPackageStore.list().length, 1);
  assert.equal(DesignPackageStore.getById("community.test")?.name, "Test Design");
  assert.equal(DesignPackageStore.remove("community.test"), true);
  assert.equal(DesignPackageStore.list().length, 0);
});
