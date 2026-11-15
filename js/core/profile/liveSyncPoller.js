import { AuthManager } from "../auth/authManager.js";
import { SupabaseApi } from "../../data/remote/supabase/supabaseApi.js";
import { ProfileManager } from "./profileManager.js";
import { ProfileSyncService } from "./profileSyncService.js";
import { LibrarySyncService } from "./librarySyncService.js";
import { resetSyncBackoff } from "../sync/syncBackoffPolicy.js";

const OVERVIEW_RPC = "get_sync_overview";
const ACTIVE_GAP_MS = 400;
const HIDDEN_GAP_MS = 2500;
const LONG_POLL_WAIT_MS = 20_000;

let started = false;
let loopGeneration = 0;
let inFlight = null;
let visibilityHandler = null;
/** @type {number | null} */
let committedRevision = null;
/** @type {number | null} */
let committedProfilesRevision = null;
/** @type {number | null} */
let committedAddonsRevision = null;
/** @type {string | null} */
let committedProfilesFingerprint = null;

export function profilesFingerprint(overview) {
  const profiles =
    overview?.profiles && typeof overview.profiles === "object" ? overview.profiles : {};
  return Object.keys(profiles)
    .sort()
    .map((key) => `${key}:${String(profiles[key]?.name || "")}`)
    .join("|");
}

export function remoteProfileCount(overview) {
  const profiles =
    overview?.profiles && typeof overview.profiles === "object" ? overview.profiles : {};
  return Object.keys(profiles).length;
}

function normalizeOverview(response) {
  if (response?.overview && typeof response.overview === "object") {
    return response.overview;
  }
  if (response && typeof response === "object" && !Array.isArray(response)) {
    return response;
  }
  return {};
}

function readNumber(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isDocumentVisible() {
  if (typeof document === "undefined") return true;
  return document.visibilityState !== "hidden";
}

function sleep(ms, generation) {
  return new Promise((resolve) => {
    const timer = setTimeout(
      () => {
        resolve(generation === loopGeneration);
      },
      Math.max(0, ms)
    );
    if (generation !== loopGeneration) {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

async function applyProfilePull() {
  const profiles = await ProfileSyncService.pull(true, { ignoreBackoff: true });
  const status = ProfileSyncService.getLastPullStatus();
  if (status !== "ok") {
    return false;
  }
  // Empty ok results are rare (slot 1 is required); treat as success only when
  // we actually applied at least the primary profile.
  return Array.isArray(profiles) && profiles.length > 0;
}

async function applyAddonPull() {
  try {
    await LibrarySyncService.pull();
    return true;
  } catch (error) {
    console.warn("Live sync addon pull failed", error);
    return false;
  }
}

async function pollOnce({ force = false, waitMs = 0 } = {}) {
  if (!AuthManager.isAuthenticated) {
    committedRevision = null;
    committedProfilesRevision = null;
    committedAddonsRevision = null;
    committedProfilesFingerprint = null;
    return false;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const body = {};
      if (!force && committedRevision != null && waitMs > 0) {
        body.p_since_revision = committedRevision;
        body.p_wait_ms = waitMs;
      }

      const response = await SupabaseApi.rpc(OVERVIEW_RPC, body, true);
      // Overview proving the bridge is reachable — clear stale failure backoff
      // so a desk change is not deferred for minutes after a prior outage.
      resetSyncBackoff();

      const overview = normalizeOverview(response);
      if (!overview || typeof overview !== "object") {
        return false;
      }

      const revision = readNumber(overview.revision);
      const profilesRevision =
        readNumber(overview.profilesRevision) ?? readNumber(overview.revision);
      const addonsRevision = readNumber(overview.addonsRevision);
      const nextProfilesFingerprint = profilesFingerprint(overview);

      const firstSample = committedProfilesFingerprint == null && committedProfilesRevision == null;
      const profilesRevisionChanged =
        !firstSample &&
        profilesRevision != null &&
        committedProfilesRevision != null &&
        profilesRevision !== committedProfilesRevision;
      const revisionChanged =
        !firstSample &&
        revision != null &&
        committedRevision != null &&
        revision !== committedRevision;
      const profilesListChanged =
        !firstSample &&
        nextProfilesFingerprint !== "" &&
        nextProfilesFingerprint !== committedProfilesFingerprint;
      const addonsChanged =
        !firstSample &&
        addonsRevision != null &&
        committedAddonsRevision != null &&
        addonsRevision !== committedAddonsRevision;

      let localBehindRemote = false;
      const remoteCount = remoteProfileCount(overview);
      if (remoteCount > 0) {
        const localProfiles = await ProfileManager.getProfiles().catch(() => []);
        const localCount = Array.isArray(localProfiles) ? localProfiles.length : 0;
        localBehindRemote = remoteCount > localCount;
        if (!localBehindRemote && nextProfilesFingerprint) {
          const localFingerprint = localProfiles
            .map((profile) => {
              const id = String(profile?.id || profile?.profileIndex || "").trim();
              return id ? `${id}:${String(profile?.name || "")}` : "";
            })
            .filter(Boolean)
            .sort()
            .join("|");
          localBehindRemote = localFingerprint !== nextProfilesFingerprint;
        }
      }

      const shouldPullProfiles =
        force ||
        firstSample ||
        profilesRevisionChanged ||
        revisionChanged ||
        profilesListChanged ||
        localBehindRemote;
      const shouldPullAddons = force || firstSample || addonsChanged;

      if (!shouldPullProfiles && !shouldPullAddons) {
        if (revision != null) committedRevision = revision;
        if (profilesRevision != null) committedProfilesRevision = profilesRevision;
        if (addonsRevision != null) committedAddonsRevision = addonsRevision;
        if (nextProfilesFingerprint !== "") committedProfilesFingerprint = nextProfilesFingerprint;
        return false;
      }

      let profilesOk = !shouldPullProfiles;
      let addonsOk = !shouldPullAddons;

      if (shouldPullProfiles) {
        profilesOk = await applyProfilePull();
      }
      if (shouldPullAddons) {
        addonsOk = await applyAddonPull();
      }

      // Only advance cursors after a successful apply. A failed pull must leave
      // the previous markers so the next tick retries the same desk change.
      if (profilesOk && addonsOk) {
        if (revision != null) committedRevision = revision;
        if (profilesRevision != null) committedProfilesRevision = profilesRevision;
        if (addonsRevision != null) committedAddonsRevision = addonsRevision;
        if (nextProfilesFingerprint !== "") committedProfilesFingerprint = nextProfilesFingerprint;
      }

      if (profilesOk || addonsOk) {
        const { notifySyncPullCompleted } = await import("./startupSyncService.js");
        notifySyncPullCompleted({
          source: "live-sync",
          profilesChanged: shouldPullProfiles && profilesOk,
          addonsChanged: shouldPullAddons && addonsOk,
          overview
        });
      }

      return Boolean((shouldPullProfiles && profilesOk) || (shouldPullAddons && addonsOk));
    } catch (error) {
      console.warn("Live sync poll failed", error);
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

async function runLoop(generation) {
  while (started && generation === loopGeneration) {
    const visible = isDocumentVisible();
    const waitMs = visible ? LONG_POLL_WAIT_MS : 0;
    await pollOnce({ waitMs });
    if (!started || generation !== loopGeneration) {
      break;
    }
    const gap = visible ? ACTIVE_GAP_MS : HIDDEN_GAP_MS;
    const stillRunning = await sleep(gap, generation);
    if (!stillRunning) {
      break;
    }
  }
}

function attachVisibilityHandler() {
  if (typeof document === "undefined" || visibilityHandler) {
    return;
  }
  visibilityHandler = () => {
    if (!started || !AuthManager.isAuthenticated) {
      return;
    }
    if (isDocumentVisible()) {
      void pollOnce({ force: true });
    }
  };
  document.addEventListener("visibilitychange", visibilityHandler);
}

function detachVisibilityHandler() {
  if (typeof document === "undefined" || !visibilityHandler) {
    return;
  }
  document.removeEventListener("visibilitychange", visibilityHandler);
  visibilityHandler = null;
}

export const LiveSyncPoller = {
  start() {
    attachVisibilityHandler();
    if (started) {
      void pollOnce({ force: true });
      return;
    }
    started = true;
    loopGeneration += 1;
    const generation = loopGeneration;
    void pollOnce({ force: true }).finally(() => {
      void runLoop(generation);
    });
  },

  stop() {
    started = false;
    loopGeneration += 1;
    detachVisibilityHandler();
    inFlight = null;
    committedRevision = null;
    committedProfilesRevision = null;
    committedAddonsRevision = null;
    committedProfilesFingerprint = null;
  },

  async pollNow({ force = false } = {}) {
    return pollOnce({ force, waitMs: 0 });
  },

  getStatus() {
    return {
      started,
      committedRevision,
      lastProfilesRevision: committedProfilesRevision,
      lastAddonsRevision: committedAddonsRevision,
      lastProfilesFingerprint: committedProfilesFingerprint
    };
  }
};
