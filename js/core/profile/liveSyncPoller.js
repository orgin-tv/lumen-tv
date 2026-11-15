import { AuthManager } from "../auth/authManager.js";
import { SupabaseApi } from "../../data/remote/supabase/supabaseApi.js";
import { ProfileManager } from "./profileManager.js";
import { ProfileSyncService } from "./profileSyncService.js";
import { LibrarySyncService } from "./librarySyncService.js";

const LIVE_SYNC_POLL_MS = 2500;
const OVERVIEW_RPC = "get_sync_overview";

let started = false;
let timerId = null;
let inFlight = null;
let lastProfilesRevision = null;
let lastAddonsRevision = null;
let lastProfilesFingerprint = null;

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

async function pollOnce({ force = false } = {}) {
  if (!AuthManager.isAuthenticated) {
    lastProfilesRevision = null;
    lastAddonsRevision = null;
    lastProfilesFingerprint = null;
    return false;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const response = await SupabaseApi.rpc(OVERVIEW_RPC, {}, true);
      // Bridge returns the overview object directly; some proxies nest it.
      const overview =
        response?.overview && typeof response.overview === "object"
          ? response.overview
          : response && typeof response === "object" && !Array.isArray(response)
            ? response
            : {};
      if (!overview || typeof overview !== "object") {
        return false;
      }

      const profilesRevision =
        overview.profilesRevision != null
          ? Number(overview.profilesRevision)
          : overview.revision != null
            ? Number(overview.revision)
            : null;
      const addonsRevision =
        overview.addonsRevision != null ? Number(overview.addonsRevision) : null;
      const nextProfilesFingerprint = profilesFingerprint(overview);

      const firstSample = lastProfilesFingerprint == null && lastProfilesRevision == null;
      const profilesRevisionChanged =
        !firstSample &&
        profilesRevision != null &&
        lastProfilesRevision != null &&
        profilesRevision !== lastProfilesRevision;
      const profilesListChanged =
        !firstSample &&
        nextProfilesFingerprint !== "" &&
        nextProfilesFingerprint !== lastProfilesFingerprint;
      const addonsChanged =
        !firstSample &&
        addonsRevision != null &&
        lastAddonsRevision != null &&
        addonsRevision !== lastAddonsRevision;

      let localBehindRemote = false;
      const remoteCount = remoteProfileCount(overview);
      if (remoteCount > 0) {
        const localProfiles = await ProfileManager.getProfiles().catch(() => []);
        localBehindRemote = remoteCount > (Array.isArray(localProfiles) ? localProfiles.length : 0);
      }

      if (profilesRevision != null) lastProfilesRevision = profilesRevision;
      if (addonsRevision != null) lastAddonsRevision = addonsRevision;
      if (nextProfilesFingerprint !== "") lastProfilesFingerprint = nextProfilesFingerprint;

      const shouldPullProfiles =
        force || profilesRevisionChanged || profilesListChanged || localBehindRemote;
      const shouldPullAddons = force || addonsChanged;

      if (!shouldPullProfiles && !shouldPullAddons) {
        return false;
      }

      if (shouldPullProfiles) {
        await ProfileSyncService.pull(true);
      }
      if (shouldPullAddons) {
        await LibrarySyncService.pull().catch((error) => {
          console.warn("Live sync addon pull failed", error);
        });
      }

      const { notifySyncPullCompleted } = await import("./startupSyncService.js");
      notifySyncPullCompleted({
        source: "live-sync",
        profilesChanged: shouldPullProfiles,
        addonsChanged: shouldPullAddons,
        overview
      });
      return true;
    } catch (error) {
      console.warn("Live sync poll failed", error);
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export const LiveSyncPoller = {
  start() {
    if (started) {
      void pollOnce();
      return;
    }
    started = true;
    void pollOnce();
    timerId = setInterval(() => {
      void pollOnce();
    }, LIVE_SYNC_POLL_MS);
  },

  stop() {
    started = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    inFlight = null;
    lastProfilesRevision = null;
    lastAddonsRevision = null;
    lastProfilesFingerprint = null;
  },

  async pollNow({ force = false } = {}) {
    return pollOnce({ force });
  },

  getStatus() {
    return {
      started,
      lastProfilesRevision,
      lastAddonsRevision,
      lastProfilesFingerprint
    };
  }
};
