import assert from "node:assert/strict";
import test from "node:test";
import { getLatestAppUpdate, isRemoteAppVersionNewer } from "./appUpdateService.js";

test("upstream version compare treats a higher Nuvio tag as newer", () => {
  assert.equal(isRemoteAppVersionNewer("v1.4.2", "1.4.1"), true);
  assert.equal(isRemoteAppVersionNewer("1.4.1", "1.4.1"), false);
  assert.equal(isRemoteAppVersionNewer("1.4.0", "1.4.1"), false);
});

test("update check returns a newer Nuvio release and ignores drafts", async () => {
  const fetchImpl = async (url) => {
    assert.match(String(url), /NuvioMedia\/NuvioTVSmart\/releases\/latest/);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        tag_name: "v9.9.9",
        name: "Nuvio 9.9.9",
        body: "Upstream notes",
        html_url: "https://github.com/NuvioMedia/NuvioTVSmart/releases/tag/v9.9.9",
        draft: false,
        prerelease: false
      })
    };
  };

  const update = await getLatestAppUpdate({ currentVersion: "1.4.1", fetchImpl });
  assert.equal(update.tag, "v9.9.9");
  assert.equal(update.releaseUrl.includes("NuvioTVSmart"), true);

  const current = await getLatestAppUpdate({ currentVersion: "9.9.9", fetchImpl });
  assert.equal(current, null);
});

test("prerelease upstream tags are not offered as updates", async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      tag_name: "v9.9.9-beta",
      draft: false,
      prerelease: true
    })
  });
  const update = await getLatestAppUpdate({ currentVersion: "1.4.1", fetchImpl });
  assert.equal(update, null);
});
