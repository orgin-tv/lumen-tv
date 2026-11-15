import assert from "node:assert/strict";
import test from "node:test";
import { addonLabel, listAddonUrls, readProfileScoped } from "./model.js";

test("reads the active profile out of a scoped envelope", () => {
  const stored = {
    __profileScoped: true,
    version: 1,
    profiles: {
      1: ["https://addons.example/a/manifest.json"],
      2: ["https://addons.example/b/manifest.json"]
    }
  };
  assert.deepEqual(listAddonUrls(stored, "2"), ["https://addons.example/b/manifest.json"]);
  assert.equal(readProfileScoped(stored, "9"), null);
});

test("accepts a plain addon url list", () => {
  assert.deepEqual(listAddonUrls([" https://a.test/m ", ""], "1"), ["https://a.test/m"]);
});

test("addon labels keep the host readable", () => {
  assert.equal(
    addonLabel("https://v3-cinemeta.strem.io/manifest.json"),
    "v3-cinemeta.strem.io · manifest.json"
  );
});
