#!/usr/bin/env node
/**
 * TV-side sync path smokes against a running Sync (:3847).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const BASE = process.env.SYNC_BASE_URL || "http://127.0.0.1:3847";

const scripts = ["scripts/test-sync-defaults-not-cloud.mjs", "scripts/test-addon-seed-push.mjs"];

function runNode(rel) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, rel)], {
      cwd: root,
      env: { ...process.env, SYNC_BASE_URL: BASE },
      stdio: "inherit"
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${rel} exited ${code}`));
    });
  });
}

async function main() {
  const health = await fetch(`${BASE}/api/health`).catch(() => null);
  if (!health?.ok) {
    throw new Error(`Sync not reachable at ${BASE}/api/health — start lumen-sync first`);
  }
  for (const script of scripts) {
    console.log(`tv smoke: ${script}`);
    await runNode(script);
  }
  console.log("tv smoke: all PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
