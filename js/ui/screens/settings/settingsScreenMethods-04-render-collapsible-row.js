/* eslint-disable no-unused-vars */
import * as internals from "./settingsScreenContext.js";
import { openLumenSync } from "../../../core/sync/lumenSyncUrl.js";

export function createSettingsScreenMethods04() {
  const { Router, AuthManager, renderLoadingIndicator, SECTION_META, ROW_ICONS, t, escapeHtml, iconSvg } = internals;

  return {
    renderCollapsibleRow({ focusKey, title, subtitle, expanded, bodyHtml = "", classes = "" }) {
      return `
          <div class="settings-collapsible${classes ? ` ${classes}` : ""}${expanded ? " is-open" : ""}">
            <button class="settings-action-row settings-collapsible-trigger settings-content-focusable focusable${expanded ? " is-open" : ""}"
                    data-zone="content"
                    ${this.registerAction(focusKey, this.actionMap.get(focusKey))}
                    aria-expanded="${expanded ? "true" : "false"}"
                    data-role="section-toggle">
              <span class="settings-row-copy">
                <span class="settings-row-title">${escapeHtml(title)}</span>
                ${subtitle ? `<span class="settings-row-subtitle">${escapeHtml(subtitle)}</span>` : ""}
              </span>
              <span class="settings-row-tail">
                <span class="settings-row-value">${expanded ? t("common.open") : t("common.closed")}</span>
                ${iconSvg(expanded ? ROW_ICONS.expand : ROW_ICONS.chevron, "settings-row-icon")}
              </span>
            </button>
            ${
              expanded
                ? `
              <div class="settings-collapsible-body">
                <div class="settings-group-card settings-subsection-card">
                  ${bodyHtml}
                </div>
              </div>
            `
                : ""
            }
          </div>
        `;
    },
    renderAccountSection(model) {
      const signedIn = model.authState === "authenticated";
      const loading = model.authState === "loading";
      this.actionMap.set("account:dashboard", () => openLumenSync("/dashboard"));
      this.actionMap.set("account:sync-profiles", () => openLumenSync("/dashboard/profiles"));
      this.actionMap.set("account:sync-addons", () => openLumenSync("/dashboard/addons"));
      this.actionMap.set("account:sync-designs", () => openLumenSync("/dashboard/designs"));
      this.actionMap.set("account:sync-devices", () => openLumenSync("/dashboard/devices"));
      this.actionMap.set("account:signin", () => Router.navigate("authQrSignIn"));
      this.actionMap.set("account:signout", () => {
        this.openOptionDialog({
          title: t("account_sign_out_confirm_title", {}, "Sign out?"),
          message: t(
            "account_sign_out_confirm_subtitle",
            {},
            "You will need to sign in again to sync library, watch progress, addons, and plugins on this device."
          ),
          options: [
            { id: "cancel", labelKey: "action_cancel", label: "Cancel" },
            { id: "confirm", labelKey: "account_sign_out", label: "Sign Out" }
          ],
          selectedId: "cancel",
          returnFocusKey: "account:signout",
          dialogClassName: "settings-account-signout-dialog",
          onSelect: async (option) => {
            if (option.id !== "confirm") return;
            await AuthManager.signOut();
            this.accountSyncOverview = null;
            this.accountSyncOverviewPromise = null;
            this.accountSyncOverviewLoaded = false;
          }
        });
      });

      return `
          ${this.renderSectionHeader(SECTION_META.find((item) => item.id === "account"))}
          <div class="settings-group-card settings-group-card-fill settings-account-card">
            <div class="settings-account-list">
              ${
                loading
                  ? `
                <div class="settings-account-loading">
                  ${renderLoadingIndicator()}
                  <span>${escapeHtml(t("account_loading", {}, "Loading..."))}</span>
                </div>
              `
                  : ""
              }
              ${
                !loading && !signedIn
                  ? `
                <p class="settings-account-description">${escapeHtml(t("account_sync_description", {}, "Sync your library, watch progress, addons, and plugins across devices."))}</p>
                <p class="settings-account-inline-note">${escapeHtml(t("account_sync_live_note", {}, "After you sign in, this TV polls Sync every few seconds so profiles and library updates appear live."))}</p>
                ${this.renderAccountActionButton({
                  focusKey: "account:signin",
                  icon: "vpn_key",
                  title: t("account_signin_qr_title", {}, "Sign In with QR"),
                  subtitle: t("account_signin_qr_subtitle", {}, "Scan a QR code and complete email login on your phone")
                })}
              `
                  : ""
              }
              ${
                signedIn
                  ? `
                ${this.renderAccountStatusCard(model.accountEmail || t("settings.status.linkedFallback", {}, "Linked account"))}
                <p class="settings-account-inline-note">${escapeHtml(t("account_sync_live_note_signed_in", {}, "Live sync is on. Profile and library changes from Lumen Sync usually appear within a few seconds."))}</p>
                ${
                  model.accountSyncOverview
                    ? this.renderAccountSyncOverview(model.accountSyncOverview)
                    : model.accountSyncOverviewLoading
                      ? this.renderAccountSyncOverviewLoading()
                      : ""
                }
                ${this.renderAccountSignOutButton()}
              `
                  : ""
              }
                ${this.renderAccountActionButton({
                  focusKey: "account:dashboard",
                  icon: "space_dashboard",
                  title: t("account_open_dashboard", {}, "Open Lumen Sync"),
                  subtitle: t(
                    "account_open_dashboard_subtitle",
                    {},
                    "Profiles, addons, designs, devices, and updates live on Sync — not in TV settings"
                  )
                })}
                <div class="settings-account-sync-links">
                  <p class="settings-account-inline-note">${escapeHtml(
                    t(
                      "account_manage_on_sync_note",
                      {},
                      "Manage these on Lumen Sync. Live sync pulls profile changes onto this TV within a few seconds."
                    )
                  )}</p>
                  ${this.renderAccountActionButton({
                    focusKey: "account:sync-profiles",
                    icon: "manage_accounts",
                    title: t("account_manage_profiles", {}, "Manage profiles"),
                    subtitle: t("account_manage_profiles_subtitle", {}, "Add, rename, or remove profiles on Sync")
                  })}
                  ${this.renderAccountActionButton({
                    focusKey: "account:sync-addons",
                    icon: "extension",
                    title: t("account_manage_addons", {}, "Manage addons"),
                    subtitle: t("account_manage_addons_subtitle", {}, "Install and order Stremio manifests on Sync")
                  })}
                  ${this.renderAccountActionButton({
                    focusKey: "account:sync-designs",
                    icon: "palette",
                    title: t("account_manage_designs", {}, "Manage designs"),
                    subtitle: t("account_manage_designs_subtitle", {}, "Install visual packages on Sync")
                  })}
                  ${this.renderAccountActionButton({
                    focusKey: "account:sync-devices",
                    icon: "tv",
                    title: t("account_manage_devices", {}, "Manage devices"),
                    subtitle: t("account_manage_devices_subtitle", {}, "See linked TVs and sessions on Sync")
                  })}
                </div>
            </div>
          </div>
        `;
    },
    renderAccountStatusCard(value) {
      return `
          <div class="settings-account-status-card">
            <span class="settings-account-status-icon material-icons" aria-hidden="true">check_circle</span>
            <span class="settings-account-status-label">${escapeHtml(t("account_signed_in_label", {}, "Signed in"))}</span>
            <strong class="settings-account-status-value">${escapeHtml(value)}</strong>
          </div>
        `;
    },
    renderAccountActionButton({ focusKey, icon, title, subtitle }) {
      return `
          <button class="settings-account-action-button settings-content-focusable focusable"
                  data-zone="content"
                  ${this.registerAction(focusKey, this.actionMap.get(focusKey))}
                  data-role="action">
            <span class="settings-account-button-icon material-icons" aria-hidden="true">${escapeHtml(icon)}</span>
            <span class="settings-account-button-copy">
              <span class="settings-account-button-title">${escapeHtml(title)}</span>
              <span class="settings-account-button-subtitle">${escapeHtml(subtitle)}</span>
            </span>
          </button>
        `;
    },
    renderAccountSignOutButton() {
      return `
          <button class="settings-account-signout-button settings-content-focusable focusable"
                  data-zone="content"
                  ${this.registerAction("account:signout", this.actionMap.get("account:signout"))}
                  data-role="action">
            <span class="settings-account-signout-icon material-icons" aria-hidden="true">logout</span>
            <span class="settings-account-signout-label">${escapeHtml(t("account_sign_out", {}, "Sign Out"))}</span>
          </button>
        `;
    },
    renderAccountSyncOverviewLoading() {
      return `
          <div class="settings-account-sync-overview settings-account-sync-loading">
            ${renderLoadingIndicator()}
            <span>${escapeHtml(t("account_loading_sync", {}, "Loading sync data..."))}</span>
          </div>
        `;
    },
    renderAccountSyncOverview(overview) {
      const statLabels = [
        t("account_stat_addons", {}, "addons"),
        t("account_stat_plugins", {}, "plugins"),
        t("account_stat_library", {}, "library"),
        t("account_stat_progress", {}, "progress"),
        t("account_stat_watched", {}, "watched")
      ];
      const renderStats = (values) =>
        values
          .map(
            (value, index) => `
          <span class="settings-account-stat">
            <strong>${escapeHtml(value)}</strong>
            <small>${escapeHtml(statLabels[index])}</small>
          </span>
        `
          )
          .join("");
      const rows = Array.isArray(overview?.perProfile) ? overview.perProfile : [];
      return `
          <div class="settings-account-sync-overview">
            <div class="settings-account-sync-row settings-account-sync-total-row">
              <span class="settings-account-sync-total-label">${escapeHtml(t("account_total_label", {}, "Total"))}</span>
              <span class="settings-account-sync-stats">
                ${renderStats([
                  overview.totalAddons || 0,
                  overview.totalPlugins || 0,
                  overview.totalLibrary || 0,
                  overview.totalWatchProgress || 0,
                  overview.totalWatchedItems || 0
                ])}
              </span>
            </div>
            ${rows
              .map(
                (profile) => `
              <div class="settings-account-sync-row">
                <span class="settings-account-profile-badge" style="background:${escapeHtml(profile.avatarColorHex || "#1E88E5")};">${escapeHtml(
                  String(profile.profileName || "?")
                    .charAt(0)
                    .toUpperCase() || "?"
                )}</span>
                <span class="settings-account-profile-name">${escapeHtml(profile.profileName || `Profile ${profile.profileId || ""}`)}</span>
                <span class="settings-account-sync-stats">
                  ${renderStats([
                    profile.addons || 0,
                    profile.plugins || 0,
                    profile.library || 0,
                    profile.watchProgress || 0,
                    profile.watchedItems || 0
                  ])}
                </span>
              </div>
            `
              )
              .join("")}
          </div>
        `;
    },
    renderProfilesSection(model) {
      const isPrimaryProfileActive = String(model?.activeProfileId || "1") === "1";
      const profiles = Array.isArray(model?.profiles) ? model.profiles : [];
      if (isPrimaryProfileActive) {
        this.actionMap.set("profiles:manage", () =>
          Router.navigate("profileSelection", {
            mode: "management",
            returnRoute: "settings"
          })
        );
        this.actionMap.set("profiles:refresh", async () => {
          const { ProfileSyncService } = await import("../../../core/profile/profileSyncService.js");
          const { LiveSyncPoller } = await import("../../../core/profile/liveSyncPoller.js");
          await LiveSyncPoller.pollNow({ force: true });
          await ProfileSyncService.pull(true);
          if (this.isMounted && Router.getCurrent() === "settings") {
            await this.render({ refreshModel: true });
          }
        });
      }
      const profileRows = profiles
        .map((profile) => {
          const id = String(profile.id || profile.profileIndex || "");
          const active = id === String(model?.activeProfileId || "1");
          return this.renderInformationRow({
            title: String(profile.name || `Profile ${id}`),
            subtitle: active
              ? t("settings.profiles.activeOnThisTv", {}, "Active on this TV")
              : t("settings.profiles.tvSlot", { slot: id }, `TV slot ${id}`),
            value: active ? t("common.active", {}, "Active") : `Slot ${id}`
          });
        })
        .join("");
      return `
          ${this.renderSectionHeader(SECTION_META.find((item) => item.id === "profiles"))}
          <div class="settings-group-card settings-hub-card settings-profile-card">
            <div class="settings-hub-list">
              ${
                profileRows ||
                `<p class="settings-hub-empty">${escapeHtml(t("settings.profiles.empty", {}, "No profiles synced yet."))}</p>`
              }
              ${
                isPrimaryProfileActive
                  ? this.renderActionRow({
                      focusKey: "profiles:refresh",
                      title: t("settings.profiles.refresh", {}, "Refresh from Sync"),
                      subtitle: t("settings.profiles.refreshSubtitle", {}, "Pull the latest profiles from Lumen Sync now")
                    })
                  : ""
              }
              ${
                isPrimaryProfileActive
                  ? this.renderActionRow({
                      focusKey: "profiles:manage",
                      title: t("profile_manage_button", {}, "Manage Profiles"),
                      subtitle: t("settings.profiles.manageSubtitle", {}, "Switch, edit, or add profiles on this TV"),
                      classes: "settings-profile-manage-row"
                    })
                  : ""
              }
            </div>
          </div>
        `;
    }
  };
}
