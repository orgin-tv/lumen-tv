#!/usr/bin/env node
/**
 * Desk bump must wake a waiting get_sync_overview long-poll quickly.
 * Requires Sync on http://127.0.0.1:3847
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const BASE = process.env.SYNC_BASE_URL || "http://127.0.0.1:3847";
const email = `longpoll-${Date.now()}@lumen.test`;
const password = "lumen12345";

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function mintAccessToken(ownerId, mail) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      sub: ownerId,
      email: mail,
      role: "authenticated",
      aud: "authenticated",
      iat: now,
      exp: now + 60 * 60,
      lumen: true
    })
  );
  const sig = b64url(createHash("sha256").update(`${header}.${payload}.lumen`).digest());
  return `${header}.${payload}.${sig}`;
}

async function json(res) {
  const body = await res.json().catch(() => null);
  return { res, body };
}

async function main() {
  let r = await json(
    await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: "Longpoll Tester" })
    })
  );
  if (!r.res.ok) {
    r = await json(
      await fetch(`${BASE}/api/auth/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
    );
  }
  assert.equal(r.res.ok, true, `auth failed: ${JSON.stringify(r.body)}`);
  const userId = r.body?.user?.id;
  assert.ok(userId, "missing user id");
  const accessToken = mintAccessToken(userId, email);
  const cookie = `lumen_auth=in; lumen_uid=${encodeURIComponent(userId)}`;
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    apikey: "lumen-local-anon"
  };

  const before = await json(
    await fetch(`${BASE}/api/bridge/rest/v1/rpc/get_sync_overview`, {
      method: "POST",
      headers: authHeaders,
      body: "{}"
    })
  );
  assert.equal(before.res.ok, true, `overview failed: ${JSON.stringify(before.body)}`);
  const beforeRev = Number(before.body?.revision || 0);

  const waiting = fetch(`${BASE}/api/bridge/rest/v1/rpc/get_sync_overview`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ p_since_revision: beforeRev, p_wait_ms: 15000 })
  }).then(async (res) => json(res));

  await new Promise((resolve) => setTimeout(resolve, 250));

  const started = Date.now();
  const created = await json(
    await fetch(`${BASE}/api/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Longpoll Kids", avatarColorHex: "#43A047" })
    })
  );
  assert.equal(created.res.ok, true, `create failed: ${JSON.stringify(created.body)}`);

  const after = await waiting;
  const elapsed = Date.now() - started;
  assert.equal(after.res.ok, true, `long-poll failed: ${JSON.stringify(after.body)}`);
  const afterRev = Number(after.body?.revision || 0);
  assert.ok(afterRev > beforeRev, `revision did not advance (${beforeRev} -> ${afterRev})`);
  assert.ok(elapsed < 5000, `long-poll took too long: ${elapsed}ms`);
  const names = Object.values(after.body?.profiles || {}).map((p) => p.name);
  assert.ok(names.includes("Longpoll Kids"), `missing profile: ${names.join(",")}`);

  console.log("live sync longpoll PASS", { email, beforeRev, afterRev, elapsed });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
