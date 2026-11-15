import { ProfileManager } from "../core/profile/profileManager.js";
import { getLatestAppUpdate } from "../core/update/appUpdateService.js";
import { ThemeStore } from "../data/local/themeStore.js";
import { DesignPackageStore } from "../data/local/designPackageStore.js";
import {
  installDesignPackageFromUrl,
  listThemePackageSummaries,
  uninstallDesignPackage
} from "../ui/theme/packages/index.js";
import { addonLabel, listAddonUrls } from "./model.js";

const ADDON_URLS_KEY = "installedAddonUrls";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setView(name) {
  document.querySelectorAll("[data-view]").forEach((node) => {
    node.hidden = node.getAttribute("data-view") !== name;
  });
  document.querySelectorAll("[data-nav]").forEach((button) => {
    const selected = button.getAttribute("data-nav") === name;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-current", selected ? "page" : "false");
  });
  const title = document.querySelector(`[data-nav="${name}"]`)?.textContent || "Overview";
  const heading = document.querySelector("#dash-title");
  if (heading) heading.textContent = title.trim();
  document.querySelector("#update-banner")?.classList.toggle("is-suppressed", name === "updates");
}

function lookLabel(snapshot) {
  const design = snapshot.designs.find((item) => item.id === snapshot.theme.packageId);
  if (design?.name) return design.name;
  const raw = String(snapshot.theme.themeName || "").trim();
  if (!raw) return "Palette";
  if (raw.toUpperCase() === "CUSTOM") return "Custom palette";
  const pretty = raw.toLowerCase().replace(/_/g, " ");
  return `${pretty.charAt(0).toUpperCase()}${pretty.slice(1)} palette`;
}

function profileCardsHtml(snapshot) {
  return snapshot.profiles
    .map((profile) => {
      const active = String(profile.id) === snapshot.activeId;
      const color = profile.avatarColorHex || "#1E88E5";
      return `<article class="profile-card${active ? " is-active" : ""}">
        <span class="avatar" style="background:${escapeHtml(color)}">${escapeHtml(String(profile.name || "P").slice(0, 1))}</span>
        <div>
          <h3>${escapeHtml(profile.name || `Profile ${profile.id}`)}</h3>
          <p>${active ? "Active on this device" : "Saved profile"}</p>
        </div>
        ${
          active
            ? `<span class="pill">Active</span>`
            : `<button type="button" class="text-button" data-activate-profile="${escapeHtml(profile.id)}">Make active</button>`
        }
      </article>`;
    })
    .join("");
}

function bindProfileActions(root) {
  root?.querySelectorAll("[data-activate-profile]").forEach((button) => {
    button.addEventListener("click", async () => {
      await ProfileManager.setActiveProfile(button.getAttribute("data-activate-profile"));
      await refresh();
    });
  });
}

function statCard(label, value, hint) {
  return `<article class="stat">
    <p class="stat-label">${escapeHtml(label)}</p>
    <p class="stat-value">${escapeHtml(value)}</p>
    <p class="stat-hint">${escapeHtml(hint)}</p>
  </article>`;
}

async function loadSnapshot() {
  const profiles = await ProfileManager.getProfiles();
  const activeId = String(ProfileManager.getActiveProfileId() || "1");
  const theme = ThemeStore.get();
  let designs = [];
  let designsError = "";
  try {
    designs = await listThemePackageSummaries();
  } catch (error) {
    designsError = String(error?.message || error || "Could not load designs");
  }
  const installed = DesignPackageStore.list();
  const activeProfile = profiles.find((profile) => String(profile.id) === activeId);
  const addonProfileId = activeProfile?.usesPrimaryAddons ? "1" : activeId;
  const addons = listAddonUrls(readJson(ADDON_URLS_KEY), addonProfileId);
  let version = "1.4.1";
  try {
    const info = await fetch("appinfo.json", { cache: "no-store" }).then((response) =>
      response.json()
    );
    if (info?.version) version = String(info.version);
  } catch {
    // appinfo is optional in a bare static open
  }
  return { profiles, activeId, theme, designs, designsError, installed, addons, version };
}

function renderOverview(snapshot) {
  const active = snapshot.profiles.find((profile) => String(profile.id) === snapshot.activeId);
  const design = snapshot.designs.find((item) => item.id === snapshot.theme.packageId);
  const root = document.querySelector("#overview-body");
  if (!root) return;
  root.innerHTML = `
    <div class="stat-grid">
      ${statCard("Profiles", String(snapshot.profiles.length), active ? active.name || "Active profile" : "No profile yet")}
      ${statCard("Addons", String(snapshot.addons.length), "Installed on this browser profile")}
      ${statCard("Designs", String(snapshot.designs.length), design ? design.name : "Palette only")}
      ${statCard("Installed", String(snapshot.installed.length), "Designs added from a URL")}
    </div>
    <section class="panel">
      <header class="panel-head">
        <h2>Library</h2>
        <p>The TV app and this dashboard share the same saved data.</p>
      </header>
      <dl class="facts">
        <div><dt>Active profile</dt><dd>${escapeHtml(active?.name || "Profile 1")}</dd></div>
        <div><dt>Look</dt><dd>${escapeHtml(lookLabel(snapshot))}</dd></div>
        <div><dt>App version</dt><dd>${escapeHtml(snapshot.version)}</dd></div>
        <div><dt>Upstream</dt><dd>Nuvio TV Smart</dd></div>
      </dl>
    </section>
    <section class="panel">
      <header class="panel-head">
        <h2>Profiles</h2>
        <p>The active profile is the one the TV app opens next.</p>
      </header>
      <div class="stack overview-profiles">${profileCardsHtml(snapshot)}</div>
    </section>
  `;
  bindProfileActions(root);
}

function renderProfiles(snapshot) {
  const root = document.querySelector("#profiles-body");
  if (!root) return;
  root.innerHTML = profileCardsHtml(snapshot);
  bindProfileActions(root);
}

function applyDesign(button) {
  const id = button.getAttribute("data-apply-design");
  const patch = { packageId: id };
  const base = button.getAttribute("data-base");
  const accent = button.getAttribute("data-accent");
  if (base) patch.themeName = String(base).toUpperCase();
  if (accent) patch.accentColor = accent;
  ThemeStore.set(patch);
}

function renderDesigns(snapshot) {
  const root = document.querySelector("#designs-body");
  if (!root) return;
  const activeId = snapshot.theme.packageId || "";
  const note = snapshot.designsError
    ? `<p class="empty">${escapeHtml(snapshot.designsError)}</p>`
    : "";
  const cards = snapshot.designs
    .map((design) => {
      const active = design.id === activeId;
      const remove = design.installed
        ? `<button type="button" class="text-button" data-remove-design="${escapeHtml(design.id)}">Remove</button>`
        : "";
      return `<article class="design-card${active ? " is-active" : ""}">
        <span class="swatch" style="background:${escapeHtml(design.accent || "#E8B45A")}"></span>
        <span class="design-copy">
          <strong>${escapeHtml(design.name)}</strong>
          <small>${escapeHtml(design.description || (design.builtin ? "Built in" : "Installed"))}</small>
        </span>
        <span class="design-actions">
          ${active ? `<em>Active</em>` : `<button type="button" class="text-button" data-apply-design="${escapeHtml(design.id)}" data-base="${escapeHtml(design.baseThemeName || "")}" data-accent="${escapeHtml(design.accent || "")}">Use</button>`}
          ${remove}
        </span>
      </article>`;
    })
    .join("");
  root.innerHTML = `${note}${cards}<button type="button" class="text-button palette-only" id="use-palette">Use palette only</button>`;
  root.querySelectorAll("[data-apply-design]").forEach((button) => {
    button.addEventListener("click", async () => {
      applyDesign(button);
      await refresh();
    });
  });
  root.querySelector("#use-palette")?.addEventListener("click", async () => {
    ThemeStore.set({ packageId: null });
    await refresh();
  });
  root.querySelectorAll("[data-remove-design]").forEach((button) => {
    button.addEventListener("click", async () => {
      const result = uninstallDesignPackage(button.getAttribute("data-remove-design"));
      const status = document.querySelector("#design-status");
      if (status)
        status.textContent = result.ok
          ? "Design removed"
          : result.error || "Could not remove design";
      await refresh();
    });
  });
}

function renderAddons(snapshot) {
  const root = document.querySelector("#addons-body");
  if (!root) return;
  if (!snapshot.addons.length) {
    root.innerHTML = `<p class="empty">No addons saved in this browser yet. Install them on the TV app and they will be listed here.</p>`;
    return;
  }
  root.innerHTML = snapshot.addons
    .map(
      (url) => `<article class="addon-row">
        <div>
          <strong>${escapeHtml(addonLabel(url))}</strong>
          <small>${escapeHtml(url)}</small>
        </div>
      </article>`
    )
    .join("");
}

function renderUpdate(snapshot, status) {
  const root = document.querySelector("#update-body");
  if (!root) return;
  const tone = status.tone || "idle";
  root.innerHTML = `
    <div class="update-status is-${escapeHtml(tone)}">
      <p class="eyebrow">Nuvio upstream</p>
      <h2>${escapeHtml(status.title)}</h2>
      <p>${escapeHtml(status.detail)}</p>
      <p class="meta">This app ${escapeHtml(snapshot.version)} · source NuvioMedia/NuvioTVSmart</p>
      <div class="row-actions">
        <button type="button" class="primary" id="check-update">Check again</button>
        ${
          status.releaseUrl
            ? `<a class="text-button" href="${escapeHtml(status.releaseUrl)}" target="_blank" rel="noreferrer">Open release</a>`
            : ""
        }
      </div>
    </div>
  `;
  root.querySelector("#check-update")?.addEventListener("click", () => {
    void checkUpdate(snapshot, true);
  });
}

async function checkUpdate(snapshot, force) {
  const slot = document.querySelector("#update-body");
  if (slot && force) {
    slot.innerHTML = `<p class="empty">Checking Nuvio releases…</p>`;
  }
  try {
    const update = await getLatestAppUpdate({ currentVersion: snapshot.version });
    const status = update
      ? {
          tone: "ready",
          title: `Update available · ${update.tag}`,
          detail: update.title || "A newer Nuvio TV Smart release is available.",
          releaseUrl: update.releaseUrl
        }
      : {
          tone: "ok",
          title: "You’re on the latest upstream release",
          detail:
            "Auto-update still compares this app with NuvioMedia/NuvioTVSmart. Nothing newer is published.",
          releaseUrl: "https://github.com/NuvioMedia/NuvioTVSmart/releases/latest"
        };
    renderUpdate(snapshot, status);
    const banner = document.querySelector("#update-banner");
    if (banner) {
      banner.hidden = false;
      banner.textContent = status.title;
    }
  } catch (error) {
    renderUpdate(snapshot, {
      tone: "warn",
      title: "Couldn’t reach the update feed",
      detail: String(
        error?.message || error || "The check failed. The TV app uses the same Nuvio release URL."
      ),
      releaseUrl: "https://github.com/NuvioMedia/NuvioTVSmart/releases/latest"
    });
  }
}

async function refresh() {
  const snapshot = await loadSnapshot();
  renderOverview(snapshot);
  renderProfiles(snapshot);
  renderDesigns(snapshot);
  renderAddons(snapshot);
  const versionNode = document.querySelector("#app-version");
  if (versionNode) versionNode.textContent = snapshot.version;
  return snapshot;
}

function bindChrome() {
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      setView(button.getAttribute("data-nav"));
      document.body.classList.remove("nav-open");
    });
  });
  document.querySelector("#nav-toggle")?.addEventListener("click", (event) => {
    event.stopPropagation();
    document.body.classList.toggle("nav-open");
  });
  document.querySelector("#nav-scrim")?.addEventListener("click", () => {
    document.body.classList.remove("nav-open");
  });
  document.querySelector("#install-design")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.querySelector("#design-url");
    const status = document.querySelector("#design-status");
    const url = String(input?.value || "").trim();
    if (!url) return;
    if (status) status.textContent = "Checking package…";
    try {
      const result = await installDesignPackageFromUrl(url);
      const pkg = result.package;
      ThemeStore.set({
        packageId: pkg.id,
        themeName: String(pkg.baseThemeName || "AMBER").toUpperCase(),
        accentColor: pkg.cssVariables?.["--secondary-color"]
      });
      if (input) input.value = "";
      if (status) status.textContent = `Installed ${pkg.name}`;
      await refresh();
    } catch (error) {
      if (status) status.textContent = String(error?.message || error || "Install failed");
    }
  });
}

async function start() {
  bindChrome();
  setView("overview");
  try {
    const snapshot = await refresh();
    await checkUpdate(snapshot, false);
  } catch (error) {
    const root = document.querySelector("#overview-body");
    if (root) {
      root.innerHTML = `<p class="empty">${escapeHtml(String(error?.message || error || "Dashboard failed to load"))}</p>`;
    }
  }
}

start();
