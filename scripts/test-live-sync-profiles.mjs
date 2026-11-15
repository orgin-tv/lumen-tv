#!/usr/bin/env node
/**
 * Integration: desk profile create → bridge overview revision + pull profiles.
 * Requires Sync on http://127.0.0.1:3847
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const BASE = process.env.SYNC_BASE_URL || "http://127.0.0.1:3847";
const email = `live-sync-${Date.now()}@lumen.test`;
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
      body: JSON.stringify({ email, password, name: "Live Sync Tester" })
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
  // Desk auth is cookie-based; mint the same JWT shape the TV bridge expects.
  const accessToken = mintAccessToken(userId, email);
  const cookie = `lumen_auth=in; lumen_uid=${encodeURIComponent(userId)}`;

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    apikey: "lumen-local-anon"
  };
  const deskHeaders = {
    "Content-Type": "application/json",
    Cookie: cookie
  };

  const before = await json(
    await fetch(`${BASE}/api/bridge/rest/v1/rpc/get_sync_overview`, {
      method: "POST",
      headers: authHeaders,
      body: "{}"
    })
  );
  assert.equal(before.res.ok, true, `overview before failed: ${JSON.stringify(before.body)}`);
  const beforeOverview = before.body?.overview || before.body || {};
  const beforeRev = Number(beforeOverview.profilesRevision || beforeOverview.revision || 0);

  const created = await json(
    await fetch(`${BASE}/api/profiles`, {
      method: "POST",
      headers: deskHeaders,
      body: JSON.stringify({ name: "Realtime Kids", avatarColorHex: "#E53935" })
    })
  );
  assert.equal(created.res.ok, true, `create profile failed: ${JSON.stringify(created.body)}`);
  assert.equal(created.body?.liveSync, true);

  const after = await json(
    await fetch(`${BASE}/api/bridge/rest/v1/rpc/get_sync_overview`, {
      method: "POST",
      headers: authHeaders,
      body: "{}"
    })
  );
  assert.equal(after.res.ok, true, `overview after failed: ${JSON.stringify(after.body)}`);
  const afterOverview = after.body?.overview || after.body || {};
  const afterRev = Number(afterOverview.profilesRevision || afterOverview.revision || 0);
  assert.ok(afterRev > beforeRev, `revision did not bump (${beforeRev} -> ${afterRev})`);

  const names = Object.values(afterOverview.profiles || {}).map((p) => p.name);
  assert.ok(names.includes("Realtime Kids"), `overview missing new profile: ${names.join(",")}`);

  const pulled = await json(
    await fetch(`${BASE}/api/bridge/rest/v1/rpc/sync_pull_profiles`, {
      method: "POST",
      headers: authHeaders,
      body: "{}"
    })
  );
  assert.equal(pulled.res.ok, true, `pull profiles failed: ${JSON.stringify(pulled.body)}`);
  const rows = Array.isArray(pulled.body) ? pulled.body : pulled.body?.profiles || [];
  assert.ok(
    rows.some((row) => String(row.name || "").includes("Realtime Kids")),
    `pull missing Realtime Kids: ${JSON.stringify(rows)}`
  );

  // Stale TV push (slot 1 only) must not wipe the desk-created profile.
  const push = await json(
    await fetch(`${BASE}/api/bridge/rest/v1/rpc/sync_push_profiles`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        p_client_max_profiles: 5,
        p_profiles: [
          {
            profile_index: 1,
            name: "Profile 1",
            avatar_color_hex: "#1E88E5",
            uses_primary_addons: false,
            uses_primary_plugins: false
          }
        ]
      })
    })
  );
  assert.equal(push.res.ok, true, `stale push failed: ${JSON.stringify(push.body)}`);

  const afterPush = await json(
    await fetch(`${BASE}/api/bridge/rest/v1/rpc/get_sync_overview`, {
      method: "POST",
      headers: authHeaders,
      body: "{}"
    })
  );
  assert.equal(
    afterPush.res.ok,
    true,
    `overview after push failed: ${JSON.stringify(afterPush.body)}`
  );
  const afterPushOverview = afterPush.body?.overview || afterPush.body || {};
  const afterPushNames = Object.values(afterPushOverview.profiles || {}).map((p) => p.name);
  assert.ok(
    afterPushNames.includes("Realtime Kids"),
    `stale TV push wiped desk profile: ${afterPushNames.join(",")}`
  );

  console.log("live sync profiles PASS", {
    email,
    beforeRev,
    afterRev,
    tvProfileId: created.body?.tvProfileId,
    pulled: rows.length,
    afterPushNames
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
