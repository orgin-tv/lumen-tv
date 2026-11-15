import { AuthManager } from "../auth/authManager.js";
import { isMissingResourceError, isSyncBackoffActive } from "../sync/syncBackoffPolicy.js";
import {
  addonRepository,
  DEFAULT_ADDON_URLS,
  isDefaultAddonUrlList
} from "../../data/repository/addonRepository.js";
import { SupabaseApi } from "../../data/remote/supabase/supabaseApi.js";
import { ProfileManager } from "./profileManager.js";
import { getSyncClientId } from "../sync/syncClientIdentity.js";

const SYNC_OVERVIEW_RPC = "get_sync_overview";

// Records the outcome of the latest pull so the Addons screen can show a
// visible sync state on TV.
let lastPullStatus = { state: "idle", count: 0, error: null, at: 0 };

function recordPullStatus(state, { count = 0, error = null } = {}) {
  lastPullStatus = {
    state,
    count: Number(count) || 0,
    error: error ? String(error.message || error) : null,
    at: Date.now()
  };
}

async function resolveProfileId() {
  const activeId = String(ProfileManager.getActiveProfileId() || "1");
  const direct = Number(activeId);
  if (Number.isFinite(direct) && direct > 0) {
    return Math.trunc(direct);
  }

  const profiles = await ProfileManager.getProfiles();
  const activeProfile = profiles.find((profile) => String(profile.id) === activeId);
  const candidate = Number(activeProfile?.profileIndex || activeProfile?.id || 1);
  return Number.isFinite(candidate) && candidate > 0 ? Math.trunc(candidate) : 1;
}

async function resolveAddonProfileId() {
  const profileId = await resolveProfileId();
  if (profileId === 1) {
    return 1;
  }

  const profiles = await ProfileManager.getProfiles();
  const activeProfile = profiles.find((profile) => {
    const id = Number(profile?.profileIndex || profile?.id || 1);
    return Number.isFinite(id) && Math.trunc(id) === profileId;
  });
  const usesPrimaryAddons = readRemoteBoolean(
    activeProfile?.usesPrimaryAddons ?? activeProfile?.uses_primary_addons,
    false
  );

  return usesPrimaryAddons ? 1 : profileId;
}

function normalizeProfileId(profileId = null) {
  const raw = Number(profileId == null ? 1 : profileId);
  return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : 1;
}

function readRemoteBoolean(value, fallback = true) {
  if (value == null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return fallback;
}

async function verifyEmptyRemoteAddonSnapshot(profileId) {
  const profileKey = String(normalizeProfileId(profileId));
  try {
    const response = await SupabaseApi.rpc(SYNC_OVERVIEW_RPC, {}, true);
    const overview =
      Array.isArray(response) && response.length === 1
        ? response[0]
        : response && typeof response === "object" && !Array.isArray(response)
          ? response
          : null;
    const addons =
      overview?.addons && typeof overview.addons === "object" && !Array.isArray(overview.addons)
        ? overview.addons
        : null;
    const profiles =
      overview?.profiles &&
      typeof overview.profiles === "object" &&
      !Array.isArray(overview.profiles)
        ? overview.profiles
        : null;
    const profileExists =
      profiles &&
      Object.prototype.hasOwnProperty.call(profiles, profileKey) &&
      profiles[profileKey] &&
      typeof profiles[profileKey] === "object" &&
      !Array.isArray(profiles[profileKey]);
    const hasAddonCount = addons && Object.prototype.hasOwnProperty.call(addons, profileKey);
    const rawAddonCount = hasAddonCount ? addons[profileKey] : 0;
    const addonCount = Number(rawAddonCount);
    const validAddonCount =
      (!hasAddonCount || typeof rawAddonCount === "number" || typeof rawAddonCount === "string") &&
      Number.isInteger(addonCount) &&
      addonCount >= 0;
    const verified = Boolean(profileExists && validAddonCount && addonCount === 0);
    console.warn("Addon sync empty snapshot verification", {
      targetProfileId: profileKey,
      profileExists: Boolean(profileExists),
      addonCount: validAddonCount ? addonCount : null,
      verified
    });
    return verified;
  } catch (error) {
    console.warn("Addon sync empty snapshot verification failed", error);
    return false;
  }
}

function extractAddonEntries(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      const rawSortOrder = row?.sort_order ?? row?.sortOrder ?? row?.position ?? index;
      const sortOrder = Number(rawSortOrder);
      return {
        url: row?.url || row?.base_url || null,
        displayName:
          row?.display_name ||
          row?.displayName ||
          row?.custom_name ||
          row?.customName ||
          row?.alias ||
          row?.name ||
          null,
        name: row?.name || null,
        enabled: readRemoteBoolean(row?.enabled),
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : index,
        sourceIndex: index
      };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.sourceIndex - right.sourceIndex)
    .filter((entry) => entry.url)
    .filter(
      (entry, index, values) =>
        values.findIndex(
          (candidate) =>
            addonRepository.normalizeUrl(candidate.url) === addonRepository.normalizeUrl(entry.url)
        ) === index
    );
}

function applyPulledAddons(entries = []) {
  const urls = entries.map((entry) => entry.url).filter(Boolean);
  addonRepository.setAddonDisplayNameOverrides(
    entries.map((entry) => {
      const cleanUrl = addonRepository.canonicalizeUrl(entry.url);
      return {
        url: entry.url,
        name:
          entry.displayName ||
          entry.name ||
          addonRepository.getAddonDisplayNameOverride(cleanUrl) ||
          ""
      };
    }),
    { replace: true }
  );
  addonRepository.setAddonEnabledStates(entries, { replace: true });
  return urls;
}

function mergeCloudAddonsWithDefaults(entries = []) {
  const byUrl = new Map();
  // Always keep local catalog/subtitle fallbacks so a desk that only stores
  // stream addons (Torrentio, etc.) cannot blank Home.
  DEFAULT_ADDON_URLS.forEach((url, index) => {
    byUrl.set(addonRepository.normalizeUrl(url), {
      url,
      sortOrder: index,
      enabled: true,
      name: null,
      displayName: null
    });
  });
  entries.forEach((entry, index) => {
    const url = entry?.url;
    if (!url) return;
    const key = addonRepository.normalizeUrl(url);
    if (!key) return;
    byUrl.set(key, {
      ...entry,
      url,
      sortOrder: DEFAULT_ADDON_URLS.length + index
    });
  });
  return Array.from(byUrl.values()).sort(
    (left, right) => (left.sortOrder || 0) - (right.sortOrder || 0)
  );
}

function isManagedAddonUrl(url) {
  return Boolean(url) && !isDefaultAddonUrlList([url]);
}

function managedAddonUrls(urls = []) {
  return (Array.isArray(urls) ? urls : []).filter((url) => isManagedAddonUrl(url));
}

function prepareRemoteAddonSnapshot(rows, { allowVerifiedEmptySnapshot = false } = {}) {
  const entries = extractAddonEntries(rows);
  const urls = entries.map((entry) => entry.url).filter(Boolean);
  const localUrls = addonRepository.getInstalledAddonUrls();
  const localHasManaged = managedAddonUrls(localUrls).length > 0;
  const remoteIsEmptyManaged = urls.length === 0 || isDefaultAddonUrlList(urls);

  // Empty / defaults-only Sync catalog with local managed addons: keep local and
  // seed Sync so desk learns about TV-installed manifests.
  if (remoteIsEmptyManaged && localHasManaged && !allowVerifiedEmptySnapshot) {
    console.warn(
      `Addon sync pull returned an empty managed remote list while local has ${localUrls.length} entries; preserving local addons and seeding Sync`
    );
    return {
      urls: [...localUrls],
      shouldApply: false,
      shouldSeedPush: true,
      cloudCount: 0
    };
  }

  // Empty Sync catalog: keep local TV fallbacks (Cinemeta / OpenSubtitles) for
  // browsing, but do not preserve a previously cloud-pushed list as "synced".
  if (urls.length === 0) {
    if (allowVerifiedEmptySnapshot || isDefaultAddonUrlList(localUrls)) {
      const defaults = mergeCloudAddonsWithDefaults([]);
      applyPulledAddons(defaults);
      return {
        urls: defaults.map((entry) => entry.url),
        shouldApply: true,
        shouldSeedPush: false,
        cloudCount: 0
      };
    }
    console.warn(
      `Addon sync pull returned an empty remote list while local has ${localUrls.length} custom entries; preserving local addons`
    );
    return { urls: [...localUrls], shouldApply: false, shouldSeedPush: true, cloudCount: 0 };
  }

  // Desk only has the TV defaults mirrored — treat as no managed cloud catalog.
  if (isDefaultAddonUrlList(urls)) {
    const defaults = mergeCloudAddonsWithDefaults([]);
    applyPulledAddons(defaults);
    return {
      urls: defaults.map((entry) => entry.url),
      shouldApply: true,
      shouldSeedPush: false,
      cloudCount: 0
    };
  }

  const merged = mergeCloudAddonsWithDefaults(entries);
  applyPulledAddons(merged);
  return {
    urls: merged.map((entry) => entry.url),
    shouldApply: true,
    shouldSeedPush: false,
    cloudCount: urls.filter((url) => isManagedAddonUrl(url)).length
  };
}

async function reconcileRemoteAddonSnapshot(rows, options = {}) {
  const { urls, shouldApply, shouldSeedPush } = prepareRemoteAddonSnapshot(rows, options);
  if (shouldApply) {
    await addonRepository.setAddonOrder(urls, { silent: true, allowReadOnly: true });
  }
  return { urls, shouldSeedPush: Boolean(shouldSeedPush) };
}

async function reconcileFetchedAddonSnapshot(rows, profileId, requestedProfileId) {
  if (String(ProfileManager.getActiveProfileId()) !== String(requestedProfileId)) {
    return {
      urls: addonRepository.getInstalledAddonUrls(),
      shouldSeedPush: false
    };
  }
  const allowVerifiedEmptySnapshot =
    Array.isArray(rows) &&
    rows.length === 0 &&
    addonRepository.getInstalledAddonUrls().length > 0 &&
    (await verifyEmptyRemoteAddonSnapshot(profileId));
  if (String(ProfileManager.getActiveProfileId()) !== String(requestedProfileId)) {
    return {
      urls: addonRepository.getInstalledAddonUrls(),
      shouldSeedPush: false
    };
  }
  return reconcileRemoteAddonSnapshot(rows, { allowVerifiedEmptySnapshot });
}

let seedPushInFlight = null;

async function maybeSeedPushAfterPull(shouldSeedPush) {
  if (!shouldSeedPush) {
    return;
  }
  if (seedPushInFlight) {
    return seedPushInFlight;
  }
  seedPushInFlight = (async () => {
    try {
      await LibrarySyncService.push();
    } catch (error) {
      console.warn("Addon sync seed push failed", error);
    } finally {
      seedPushInFlight = null;
    }
  })();
  return seedPushInFlight;
}

export const LibrarySyncService = {
  getLastPullStatus() {
    return lastPullStatus;
  },

  async pull() {
    let readError = null;
    try {
      if (isSyncBackoffActive()) {
        recordPullStatus("deferred");
        return addonRepository.getInstalledAddonUrls();
      }
      if (!AuthManager.isAuthenticated) {
        recordPullStatus("signed-out");
        return [];
      }
      const requestedProfileId = String(ProfileManager.getActiveProfileId() || "1");
      const localUrls = addonRepository.getInstalledAddonUrls();
      const profileId = await resolveAddonProfileId();
      if (String(ProfileManager.getActiveProfileId()) !== requestedProfileId) {
        recordPullStatus("stale", { count: localUrls.length });
        return addonRepository.getInstalledAddonUrls();
      }

      // Lumen Sync bridge speaks RPCs; skip table probes that only 404-noise.
      try {
        const rpcRows = await SupabaseApi.rpc(
          "sync_pull_addons",
          { p_profile_id: profileId },
          true
        );
        const reconciled = await reconcileFetchedAddonSnapshot(
          Array.isArray(rpcRows) ? rpcRows : [],
          profileId,
          requestedProfileId
        );
        const cloudCount = isDefaultAddonUrlList(
          (Array.isArray(rpcRows) ? rpcRows : []).map((row) => row?.url || row?.manifest_url)
        )
          ? 0
          : Array.isArray(rpcRows)
            ? rpcRows.length
            : 0;
        recordPullStatus("ok", { count: cloudCount });
        await maybeSeedPushAfterPull(reconciled.shouldSeedPush);
        return reconciled.urls;
      } catch (rpcError) {
        // Lumen Sync is RPC-only — do not probe legacy addons/tv_addons tables (404 noise).
        readError = rpcError;
        recordPullStatus("error", { count: localUrls.length, error: readError });
        if (!isMissingResourceError(rpcError)) {
          console.warn("Addon sync pull RPC failed", rpcError);
        }
        return localUrls.length ? localUrls : [...DEFAULT_ADDON_URLS];
      }
    } catch (error) {
      recordPullStatus("error", { error });
      console.warn("Library sync pull failed", error);
      return [];
    }
  },

  async push() {
    if (isSyncBackoffActive()) {
      return false;
    }
    try {
      if (!AuthManager.isAuthenticated) {
        return false;
      }
      const requestedProfileId = await resolveProfileId();
      const profileId = await resolveAddonProfileId();
      // Android treats a secondary profile that inherits the primary addon
      // set as read-only. Do not publish the primary profile's local state
      // merely because this profile became active.
      if (requestedProfileId !== profileId) {
        return true;
      }
      const urls = addonRepository.getInstalledAddonUrls();
      if ((await resolveProfileId()) !== requestedProfileId) {
        return false;
      }

      // Desk stores managed addons only — strip TV local fallbacks from the payload.
      const managedUrls = managedAddonUrls(urls);

      // Never promote the TV's built-in fallback pair into the Sync desk catalog.
      if (!managedUrls.length) {
        return true;
      }

      await SupabaseApi.rpc(
        "sync_push_addons",
        {
          p_profile_id: profileId,
          p_addons: managedUrls.map((url, index) => ({
            url,
            sort_order: index,
            enabled: addonRepository.isAddonEnabled(url),
            ...(addonRepository.getAddonDisplayNameOverride(url)
              ? { name: addonRepository.getAddonDisplayNameOverride(url) }
              : {})
          })),
          p_origin_client_id: getSyncClientId()
        },
        true
      );
      return true;
    } catch (error) {
      console.warn("Library sync push failed", error);
      return false;
    }
  }
};
