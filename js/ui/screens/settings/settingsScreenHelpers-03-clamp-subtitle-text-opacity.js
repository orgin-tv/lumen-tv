import { Router } from "../../navigation/routerState.js";

import { ScreenUtils } from "../../navigation/screen.js";

import { addonRepository } from "../../../data/repository/addonRepository.js";

import { LocalStore } from "../../../core/storage/localStore.js";

import { SessionStore } from "../../../core/storage/sessionStore.js";

import { TmdbSettingsStore } from "../../../data/local/tmdbSettingsStore.js";

import { HomeCatalogStore } from "../../../data/local/homeCatalogStore.js";

import { accentColorForTheme, ThemeStore } from "../../../data/local/themeStore.js";

import { MemberAccessRepository } from "../../../data/remote/supabase/memberAccessRepository.js";

import { ThemeManager } from "../../theme/themeManager.js";

import { ThemeColors } from "../../theme/themeColors.js";

import { availableThemeIds, resolveThemeName } from "../../theme/themeAccess.js";

import { renderMemberBrandWordmark } from "../../components/memberBrandWordmark.js";

import { PlayerSettingsStore } from "../../../data/local/playerSettingsStore.js";

import {
  SUBTITLE_VERTICAL_OFFSET_DEFAULT,
  SUBTITLE_VERTICAL_OFFSET_MAX,
  SUBTITLE_VERTICAL_OFFSET_MIN,
  normalizeSubtitleVerticalOffset
} from "../../../core/player/subtitleVerticalOffset.js";

import {
  SUBTITLE_TEXT_OPACITY_MAX,
  SUBTITLE_TEXT_OPACITY_MIN,
  SUBTITLE_TEXT_OPACITY_STEP,
  normalizeSubtitleTextOpacity
} from "../../../core/player/subtitleTextOpacity.js";

import { TorrentSettingsStore } from "../../../data/local/torrentSettingsStore.js";

import { LayoutPreferences } from "../../../data/local/layoutPreferences.js";

import { ExperienceModeStore } from "../../../data/local/experienceModeStore.js";

import { MdbListSettingsStore } from "../../../data/local/mdbListSettingsStore.js";

import { AnimeSkipSettingsStore } from "../../../data/local/animeSkipSettingsStore.js";

import {
  DEBRID_SETTINGS_DEFAULTS,
  DEBRID_SORT_PROFILES,
  DEBRID_STREAM_AUDIO_CHANNELS,
  DEBRID_STREAM_AUDIO_TAGS,
  DEBRID_STREAM_ENCODES,
  DEBRID_STREAM_LANGUAGES,
  DEBRID_STREAM_QUALITIES,
  DEBRID_STREAM_RESOLUTIONS,
  DEBRID_STREAM_VISUAL_TAGS,
  DEFAULT_STREAM_PREFERENCES,
  normalizeDebridStreamPreferences,
  DebridSettingsStore
} from "../../../data/local/debridSettingsStore.js";

import { StreamBadgeSettingsStore } from "../../../data/local/streamBadgeSettingsStore.js";

import { DebridApi } from "../../../data/remote/api/debridApi.js";

import { DEBRID_AUTH_METHODS, DebridProviders } from "../../../core/debrid/debridProviders.js";

import { DEBRID_DEVICE_AUTH_STATUS, DebridDeviceAuthService } from "../../../core/debrid/debridDeviceAuthService.js";

import { ProfileManager } from "../../../core/profile/profileManager.js";

import { AuthManager } from "../../../core/auth/authManager.js";

import { SupabaseApi } from "../../../data/remote/supabase/supabaseApi.js";

import { Platform } from "../../../platform/index.js";

import { TizenCapabilities } from "../../../platform/tizen/tizenCapabilities.js";

import { isFastHorizontalNavigationEnabled } from "../../../platform/sharedKeys.js";

import { CW_DISPLAY_SNAPSHOT_KEY, CW_ENRICHMENT_CACHE_KEY } from "../home/homeConstants.js";

import { I18n } from "../../../i18n/index.js";

import { isContentRtl } from "../../../core/util/contentTextDirection.js";

import { PluginManager } from "../../../core/player/pluginManager.js";

import { QrCodeGenerator } from "../../../core/qr/qrCodeGenerator.js";

import { TraktAuthService } from "../../../data/repository/traktAuthService.js";

import { mdbListRepository } from "../../../data/repository/mdbListRepository.js";

import {
  getStreamBadgePreviewSections,
  normalizeStreamBadgeChipColor,
  STREAM_BADGE_IMPORT_LIMIT
} from "../../../core/streams/streamBadgeRules.js";

import {
  TRAKT_CONTINUE_WATCHING_DAYS_CAP_ALL,
  TraktLibrarySourceMode,
  TraktSettingsStore,
  WatchProgressSource
} from "../../../data/local/traktSettingsStore.js";

import {
  activateLegacySidebarAction,
  bindRootSidebarEvents,
  getRootSidebarNodes,
  getRootSidebarSelectedNode,
  getSidebarProfileState,
  isModernSidebarBlurAvailable,
  isSelectedSidebarAction,
  isRootSidebarNode,
  renderRootSidebar,
  setModernSidebarExpanded,
  setLegacySidebarExpanded
} from "../../components/sidebarNavigation.js";

import { renderLoadingIndicator } from "../../components/loadingIndicator.js";

import { getLatestAppUpdate } from "../../../core/update/appUpdateService.js";

import { showAppUpdatePrompt } from "../../components/appUpdatePrompt.js";

import { AVAILABLE_LANGUAGES } from "./settingsScreenHelpers-02-available-languages.js";

export function clampSubtitleTextOpacity(value) {
  return normalizeSubtitleTextOpacity(value);
}

export function clampSubtitleOffset(value) {
  return normalizeSubtitleVerticalOffset(value);
}

export const TMDB_LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "en-AU", label: "English (Australia)" },
  { id: "en-CA", label: "English (Canada)" },
  { id: "en-GB", label: "English (United Kingdom)" },
  ...AVAILABLE_LANGUAGES.filter((option) => option.id !== "en")
].sort((left, right) => String(left.label || "").localeCompare(String(right.label || "")));

export const DEBRID_PREPARE_LIMIT_OPTIONS = [
  { id: 0, labelKey: "common.off", label: "Off" },
  { id: 1, labelKey: "settings.integration.debrid.prepare.countOne", label: "1 link" },
  {
    id: 2,
    labelKey: "settings.integration.debrid.prepare.countMany",
    labelParams: { count: 2 },
    label: "2 links"
  },
  {
    id: 3,
    labelKey: "settings.integration.debrid.prepare.countMany",
    labelParams: { count: 3 },
    label: "3 links"
  },
  {
    id: 5,
    labelKey: "settings.integration.debrid.prepare.countMany",
    labelParams: { count: 5 },
    label: "5 links"
  }
];

export const DEBRID_PREPARE_COUNT_OPTIONS = DEBRID_PREPARE_LIMIT_OPTIONS.filter((option) => Number(option.id) > 0);

export const DEBRID_MAX_RESULTS_OPTIONS = [
  { id: 0, labelKey: "settings.integration.debrid.maxResults.all", label: "All streams" },
  {
    id: 5,
    labelKey: "settings.integration.debrid.maxResults.count",
    labelParams: { count: 5 },
    label: "5 streams"
  },
  {
    id: 10,
    labelKey: "settings.integration.debrid.maxResults.count",
    labelParams: { count: 10 },
    label: "10 streams"
  },
  {
    id: 20,
    labelKey: "settings.integration.debrid.maxResults.count",
    labelParams: { count: 20 },
    label: "20 streams"
  },
  {
    id: 50,
    labelKey: "settings.integration.debrid.maxResults.count",
    labelParams: { count: 50 },
    label: "50 streams"
  }
];

export const DEBRID_SORT_PROFILE_OPTIONS = [
  { id: "ORIGINAL", labelKey: "debrid_stream_sort_original", label: "Original order" },
  { id: "BEST_QUALITY", labelKey: "debrid_stream_sort_best_quality", label: "Best quality first" },
  { id: "LARGEST", labelKey: "debrid_stream_sort_largest", label: "Largest first" },
  { id: "SMALLEST", labelKey: "debrid_stream_sort_smallest", label: "Smallest first" },
  { id: "AUDIO", labelKey: "debrid_stream_sort_best_audio", label: "Best audio first" },
  { id: "LANGUAGE", labelKey: "debrid_stream_sort_language", label: "Language first" }
];

export const DEBRID_SIZE_RANGE_OPTIONS = [
  { id: "0:0", min: 0, max: 0 },
  { id: "0:5", min: 0, max: 5 },
  { id: "0:10", min: 0, max: 10 },
  { id: "5:20", min: 5, max: 20 },
  { id: "10:50", min: 10, max: 50 },
  { id: "20:100", min: 20, max: 100 }
];

export const DEBRID_MIN_QUALITY_OPTIONS = [
  { id: "ANY", labelKey: "settings.integration.debrid.minQuality.any", label: "Any quality" },
  { id: "P720", labelKey: "settings.integration.debrid.minQuality.720", label: "720p and above" },
  {
    id: "P1080",
    labelKey: "settings.integration.debrid.minQuality.1080",
    label: "1080p and above"
  },
  { id: "P2160", labelKey: "settings.integration.debrid.minQuality.2160", label: "4K only" }
];

export const DEBRID_FEATURE_FILTER_OPTIONS = [
  { id: "ANY", labelKey: "settings.integration.debrid.feature.any", label: "Any" },
  { id: "EXCLUDE", labelKey: "settings.integration.debrid.feature.exclude", label: "Hide" },
  { id: "ONLY", labelKey: "settings.integration.debrid.feature.only", label: "Only" }
];

export const DEBRID_CODEC_OPTIONS = [
  { id: "ANY", labelKey: "settings.integration.debrid.codec.any", label: "Any codec" },
  { id: "H264", labelKey: "settings.integration.debrid.codec.h264", label: "H.264 / AVC" },
  { id: "HEVC", labelKey: "settings.integration.debrid.codec.hevc", label: "HEVC / H.265" },
  { id: "AV1", labelKey: "settings.integration.debrid.codec.av1", label: "AV1" }
];

export const HOME_LAYOUT_OPTIONS = [
  {
    id: "modern",
    labelKey: "settings.layout.homeLayouts.modern.label",
    captionKey: "settings.layout.homeLayouts.modern.caption"
  },
  {
    id: "grid",
    labelKey: "settings.layout.homeLayouts.grid.label",
    captionKey: "settings.layout.homeLayouts.grid.caption"
  },
  {
    id: "classic",
    labelKey: "settings.layout.homeLayouts.classic.label",
    captionKey: "settings.layout.homeLayouts.classic.caption"
  }
];

export const TRAKT_CONTINUE_WATCHING_DAY_OPTIONS = [14, 30, 60, 90, 180, 365, TRAKT_CONTINUE_WATCHING_DAYS_CAP_ALL];

export const TRAKT_WATCH_PROGRESS_OPTIONS = [
  { id: WatchProgressSource.MDBLIST, label: "MDBList" },
  { id: WatchProgressSource.SIMKL, label: "Simkl" },
  { id: WatchProgressSource.TRAKT, labelKey: "trakt_watch_progress_source_trakt" },
  { id: WatchProgressSource.NUVIO_SYNC, labelKey: "trakt_watch_progress_source_nuvio" }
];

export const TRAKT_LIBRARY_SOURCE_OPTIONS = [
  { id: TraktLibrarySourceMode.TRAKT, labelKey: "trakt_library_source_trakt" },
  { id: TraktLibrarySourceMode.LOCAL, labelKey: "trakt_library_source_nuvio" }
];

export const TRAKT_COMMENTS_OPTIONS = [
  { id: "on", labelKey: "trakt_setting_on" },
  { id: "off", labelKey: "trakt_setting_off" }
];

// Nuvio-style hubs for the settings rail (5 top-level categories).
export const SETTINGS_HUBS = [
  {
    id: "you",
    label: "You",
    labelKey: "settings.hubs.you",
    subtitle: "",
    icon: "person",
    entries: [
      {
        sectionId: "account",
        title: "Account",
        titleKey: "settings.sections.account.label",
        subtitle: "Account and sync status",
        subtitleKey: "settings.sections.account.subtitle",
        icon: "person"
      },
      {
        sectionId: "profiles",
        title: "Switch Profile",
        titleKey: "settings.hubs.you.switchProfile",
        subtitle: "Change to a different profile.",
        subtitleKey: "settings.hubs.you.switchProfileSubtitle",
        icon: "people"
      },
      {
        sectionId: "watchParty",
        title: "Watch party",
        titleKey: "party_title",
        subtitle: "Join friends with a party code",
        subtitleKey: "party_settings_description",
        icon: "groups"
      }
    ]
  },
  {
    id: "look",
    label: "Look",
    labelKey: "settings.hubs.look",
    subtitle: "",
    icon: "palette",
    entries: [
      {
        sectionId: "appearance",
        title: "Appearance",
        titleKey: "settings.sections.appearance.label",
        subtitle: "Language, settings style, and accents",
        subtitleKey: "settings.sections.appearance.subtitle",
        icon: "palette"
      },
      {
        sectionId: "layout",
        title: "Layout",
        titleKey: "settings.sections.layout.label",
        subtitle: "Home rows, posters, and sidebar style",
        subtitleKey: "settings.sections.layout.subtitle",
        icon: "grid_view"
      },
      {
        sectionId: "ambient",
        title: "Ambient Mode",
        titleKey: "ambient_mode_title",
        subtitle: "Screensaver when the TV is idle",
        subtitleKey: "ambient_mode_subtitle",
        icon: "nightlife"
      }
    ]
  },
  {
    id: "media",
    label: "Media",
    labelKey: "settings.hubs.media",
    subtitle: "",
    icon: "play_circle",
    entries: [
      {
        sectionId: "contentDiscovery",
        title: "Content & Discovery",
        titleKey: "settings.sections.contentDiscovery.label",
        subtitle: "Search, addons, media servers, and plugins",
        subtitleKey: "settings.sections.contentDiscovery.subtitle",
        icon: "explore"
      },
      {
        sectionId: "playback",
        title: "Playback",
        titleKey: "settings.sections.playback.label",
        subtitle: "Player, audio, and subtitle preferences",
        subtitleKey: "settings.sections.playback.subtitle",
        icon: "play_circle"
      },
      {
        sectionId: "streams",
        title: "Stream badges",
        titleKey: "settings_stream_badges_section",
        subtitle: "Badge rules and stream list chips",
        subtitleKey: "settings_stream_badges_description",
        icon: "style"
      }
    ]
  },
  {
    id: "services",
    label: "Services",
    labelKey: "settings.hubs.services",
    subtitle: "",
    icon: "link",
    entries: [
      {
        sectionId: "trakt",
        title: "Tracking",
        titleKey: "settings_tracking_title",
        subtitle: "Connect Trakt or Simkl on this TV",
        subtitleKey: "settings_tracking_subtitle",
        icon: "sync"
      },
      {
        sectionId: "integration",
        title: "Integrations",
        titleKey: "settings.sections.integration.label",
        subtitle: "Debrid, TMDB, MDBList, and AnimeSkip",
        subtitleKey: "settings.sections.integration.subtitle",
        icon: "extension"
      },
      {
        sectionId: "syncDesk",
        title: "Lumen Sync",
        titleKey: "settings.hubs.services.sync",
        subtitle: "Manage addons, designs, and devices on Sync",
        subtitleKey: "settings.hubs.services.syncSubtitle",
        icon: "space_dashboard",
        syncPath: "/dashboard"
      }
    ]
  },
  {
    id: "system",
    label: "System",
    labelKey: "settings.hubs.system",
    subtitle: "",
    icon: "settings",
    entries: [
      {
        sectionId: "advanced",
        title: "Advanced",
        titleKey: "settings_advanced",
        subtitle: "Experience mode, network tests, and tuning",
        subtitleKey: "settings_advanced_subtitle",
        icon: "tune"
      },
      {
        sectionId: "about",
        title: "About",
        titleKey: "settings.sections.about.label",
        subtitle: "Version, updates, and licenses",
        subtitleKey: "settings.sections.about.subtitle",
        icon: "info"
      }
    ]
  }
];

export const SETTINGS_HUB_IDS = new Set(SETTINGS_HUBS.map((hub) => hub.id));

// Leaf sections (drill-in targets). Not shown on the rail.
export const SECTION_META = [
  {
    id: "account",
    labelKey: "settings.sections.account.label",
    label: "Account",
    subtitleKey: "settings.sections.account.subtitle",
    subtitle: "Account and sync status",
    hideFromNav: true
  },
  {
    id: "profiles",
    labelKey: "settings.sections.profiles.label",
    label: "Switch Profile",
    subtitleKey: "settings.hubs.you.switchProfileSubtitle",
    subtitle: "Change to a different profile.",
    hideFromNav: true
  },
  {
    id: "watchParty",
    labelKey: "party_title",
    subtitleKey: "party_settings_description",
    hideFromNav: true
  },
  {
    id: "playback",
    labelKey: "settings.sections.playback.label",
    label: "Playback",
    subtitleKey: "settings.sections.playback.subtitle",
    subtitle: "Player, audio, and subtitle preferences",
    hideFromNav: true
  },
  {
    id: "appearance",
    labelKey: "settings.sections.appearance.label",
    label: "Appearance",
    subtitleKey: "settings.sections.appearance.subtitle",
    subtitle: "Language, settings style, and accents on this TV",
    hideFromNav: true
  },
  {
    id: "ambient",
    labelKey: "ambient_mode_title",
    subtitleKey: "ambient_mode_subtitle",
    hideFromNav: true
  },
  {
    id: "trakt",
    labelKey: "settings_tracking_title",
    subtitleKey: "settings_tracking_subtitle",
    hideFromNav: true
  },
  {
    id: "about",
    labelKey: "settings.sections.about.label",
    subtitleKey: "settings.sections.about.subtitle",
    hideFromNav: true
  },
  {
    id: "layout",
    labelKey: "settings.sections.layout.label",
    subtitleKey: "settings.sections.layout.subtitle",
    hideFromNav: true
  },
  {
    id: "contentDiscovery",
    labelKey: "settings.sections.contentDiscovery.label",
    label: "Content & Discovery",
    subtitleKey: "settings.sections.contentDiscovery.subtitle",
    subtitle: "Add-ons, plugins, catalogs, and discovery sources",
    hideFromNav: true
  },
  {
    id: "plugins",
    labelKey: "settings.sections.plugins.label",
    subtitleKey: "settings.sections.plugins.subtitle",
    hideFromNav: true
  },
  {
    id: "integration",
    labelKey: "settings.sections.integration.label",
    subtitleKey: "settings.sections.integration.subtitle",
    hideFromNav: true
  },
  {
    id: "streams",
    labelKey: "settings_stream_badges_section",
    subtitleKey: "settings_stream_badges_description",
    hideFromNav: true
  },
  {
    id: "advanced",
    labelKey: "settings_advanced",
    subtitleKey: "settings_advanced_subtitle",
    hideFromNav: true
  }
];

export const SECTION_ICONS = {
  you: "person",
  look: "palette",
  media: "play_circle",
  services: "link",
  system: "settings",
  account: "person",
  profiles: "people",
  watchParty: "groups",
  appearance: "palette",
  ambient: "nightlife",
  playback: "play_circle",
  layout: "grid_view",
  contentDiscovery: "explore",
  plugins: "build",
  integration: "extension",
  streams: "style",
  advanced: "tune",
  trakt: "sync",
  syncDesk: "space_dashboard",
  about: "info"
};

export function getHubById(hubId) {
  return SETTINGS_HUBS.find((hub) => hub.id === hubId) || null;
}

export function getHubIdForSection(sectionId) {
  const match = SETTINGS_HUBS.find((hub) => (hub.entries || []).some((entry) => entry.sectionId === sectionId));
  return match?.id || null;
}

export function resolveSettingsHubId(sectionId) {
  if (!sectionId) {
    return "you";
  }
  if (SETTINGS_HUB_IDS.has(sectionId)) {
    return sectionId;
  }
  return getHubIdForSection(sectionId) || "you";
}

export function isSettingsHubId(sectionId) {
  return SETTINGS_HUB_IDS.has(sectionId);
}
