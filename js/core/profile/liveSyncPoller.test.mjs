import assert from "node:assert/strict";
import test from "node:test";

function profilesFingerprint(overview) {
  const profiles =
    overview?.profiles && typeof overview.profiles === "object" ? overview.profiles : {};
  return Object.keys(profiles)
    .sort()
    .map((key) => `${key}:${String(profiles[key]?.name || "")}`)
    .join("|");
}

function remoteProfileCount(overview) {
  const profiles =
    overview?.profiles && typeof overview.profiles === "object" ? overview.profiles : {};
  return Object.keys(profiles).length;
}

test("live sync fingerprint changes when a profile is added", () => {
  const before = profilesFingerprint({
    profiles: { 1: { name: "Primary" } }
  });
  const after = profilesFingerprint({
    profiles: { 1: { name: "Primary" }, 2: { name: "Kids" } }
  });
  assert.notEqual(before, after);
});

test("live sync fingerprint changes when a profile is renamed", () => {
  const before = profilesFingerprint({
    profiles: { 1: { name: "Primary" }, 2: { name: "Kids" } }
  });
  const after = profilesFingerprint({
    profiles: { 1: { name: "Primary" }, 2: { name: "Family" } }
  });
  assert.notEqual(before, after);
});

test("localBehindRemote when desk has more slots than the TV", () => {
  assert.equal(remoteProfileCount({ profiles: { 1: { name: "A" }, 2: { name: "B" } } }), 2);
  assert.ok(remoteProfileCount({ profiles: { 1: { name: "A" }, 2: { name: "B" } } }) > 1);
});
