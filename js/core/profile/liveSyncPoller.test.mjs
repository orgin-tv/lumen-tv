import assert from "node:assert/strict";
import test from "node:test";
import { profilesFingerprint, remoteProfileCount } from "./liveSyncPoller.js";

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

test("remoteProfileCount tracks desk slots", () => {
  assert.equal(remoteProfileCount({ profiles: { 1: { name: "A" }, 2: { name: "B" } } }), 2);
  assert.equal(remoteProfileCount({ profiles: {} }), 0);
  assert.equal(remoteProfileCount(null), 0);
});

test("fingerprint is stable regardless of key insertion order", () => {
  const left = profilesFingerprint({
    profiles: { 2: { name: "Kids" }, 1: { name: "Primary" } }
  });
  const right = profilesFingerprint({
    profiles: { 1: { name: "Primary" }, 2: { name: "Kids" } }
  });
  assert.equal(left, right);
});
