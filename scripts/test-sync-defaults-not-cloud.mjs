#!/usr/bin/env node
/**
 * Default TV addons must not appear as cloud catalog counts.
 * Requires Sync on http://127.0.0.1:3847
 */
import assert from "node:assert/strict";

const BASE = process.env.SYNC_BASE_URL || "http://127.0.0.1:3847";
const email = `defaults-${Date.now()}@lumen.test`;
const password = "lumen12345";

async function json(res) {
  const body = await res.json().catch(() => null);
  return { res, body };
}

async function main() {
  let r = await json(
    await fetch(`${BASE}/api/bridge/auth/v1/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })
  );
  assert.equal(r.res.ok, true, `auth failed: ${JSON.stringify(r.body)}`);
  const accessToken = r.body?.access_token;
  assert.ok(accessToken, "signup must return access_token");
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    apikey: "lumen-local-anon"
  };

  const push = await json(
    await fetch(`${BASE}/api/bridge/rest/v1/rpc/sync_push_addons`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        p_profile_id: 1,
        p_addons: [
          { url: "https://v3-cinemeta.strem.io", sort_order: 0, enabled: true },
          { url: "https://opensubtitles-v3.strem.io", sort_order: 1, enabled: true }
        ]
      })
    })
  );
  assert.equal(push.res.ok, true, `push failed: ${JSON.stringify(push.body)}`);

  const overview = await json(
    await fetch(`${BASE}/api/bridge/rest/v1/rpc/get_sync_overview`, {
      method: "POST",
      headers: authHeaders,
      body: "{}"
    })
  );
  assert.equal(overview.res.ok, true, `overview failed: ${JSON.stringify(overview.body)}`);
  const addons = overview.body?.addons || {};
  const total = Object.values(addons).reduce((sum, value) => sum + (Number(value) || 0), 0);
  assert.equal(total, 0, `default TV addons leaked into cloud counts: ${JSON.stringify(addons)}`);

  const pulled = await json(
    await fetch(`${BASE}/api/bridge/rest/v1/rpc/sync_pull_addons`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ p_profile_id: 1 })
    })
  );
  assert.equal(pulled.res.ok, true, `pull failed: ${JSON.stringify(pulled.body)}`);
  assert.equal(Array.isArray(pulled.body) ? pulled.body.length : -1, 0, "pull should be empty");

  console.log("sync defaults not cloud PASS", { email, addons });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
