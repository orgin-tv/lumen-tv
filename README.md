# Lumen TV

<p align="center">
  <img src="assets/brand/lumen_wordmark.svg" alt="Lumen" width="280" />
</p>

<p align="center">
  Bring your sources together in one TV library — with Sync for the desk,<br />
  and installable, safe design packages on the glass.
</p>

**Lumen TV** is an open-source fork of [Nuvio TV Smart](https://github.com/NuvioMedia/NuvioTVSmart) (GPLv3). Upstream credit belongs to the NuvioMedia contributors who built the player, addon, and TV shell that Lumen extends.

Companion desk: **[lumen-tvs/lumen-sync](https://github.com/lumen-tvs/lumen-sync)** — profiles, addons, devices, and updates in the browser.

---

## What it is

| | |
| --- | --- |
| **Platforms** | Samsung **Tizen 4+**, LG **webOS 5+** |
| **Role** | Watch, browse, play — device-focused Settings |
| **Pairs with** | [Lumen Sync](https://github.com/lumen-tvs/lumen-sync) over a local or hosted bridge |

### Lumen adds (on top of Nuvio)

- Rebranded identity (`space.lumen.webos`, Lumen wordmark)
- **Designs** — installable looks (JSON tokens + sandboxed CSS)
- Slimmer Settings (five hubs); heavy management lives on Sync
- **Live sync** — signed-in TVs poll Sync every few seconds so desk profile changes appear without restart

---

## Quick start (browser smoke test)

Requires Node.js 20+ and npm.

```bash
git clone https://github.com/lumen-tvs/lumen-tv.git
cd lumen-tv
cp local.example.properties local.properties
npm install
npm run build
PORT=4317 npm run serve
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

Point the TV at Sync (defaults in `local.example.properties`):

```properties
NUVIO_SUPABASE_URL=http://127.0.0.1:3847/api/bridge
NUVIO_SUPABASE_ANON_KEY=lumen-local-anon
TV_LOGIN_WEB_BASE_URL=http://127.0.0.1:3847/tv-login
DEVICE_LOGIN_WEB_BASE_URL=http://127.0.0.1:3847/link
LUMEN_SYNC_URL=http://127.0.0.1:3847
```

Run [Lumen Sync](https://github.com/lumen-tvs/lumen-sync) on port **3847**, then sign in on the TV with the **same account**.

---

## Pair with Sync

```text
Lumen TV  (:4317)  ◄── QR / email + /api/bridge ──►  Lumen Sync  (:3847)
                         live get_sync_overview
```

1. Start Sync, then this TV serve.
2. On the TV, complete QR or email sign-in.
3. Create a profile on the Sync dashboard → it should show on the TV within a few seconds (Settings → You → Profiles, or **Refresh from Sync**).

---

## Scripts

| Script | Purpose |
| ------ | ------- |
| `npm run build` | Bundle into `dist/` (includes `lumen/` overlay) |
| `npm run serve` | Serve the build (set `PORT`, e.g. `4317`) |
| `npm run test:themes` | Design package validator / sanitizer tests |
| `npm run package:tizen` | Unsigned Tizen WGT |
| `npm run package:webos` | webOS IPK |

---

## Designs

Install a design like a catalog source: paste a `theme.json` URL. Packages are validated and sanitized before they apply.

- Guide: [`docs/lumen/creating-themes.md`](docs/lumen/creating-themes.md)
- Built-ins: `lumen.default`, `lumen.cinema`

---

## Repo layout

```text
├── js/              App source
├── lumen/           Overlays & built-in designs
├── assets/brand/    Wordmark & mark
├── docs/            Themes, upstream sync notes
├── scripts/         Build, serve, packaging
└── local.example.properties
```

---

## Upstream

- Guide: [`docs/lumen/upstream-sync.md`](docs/lumen/upstream-sync.md)
- Prefer changes under `lumen/` and `js/ui/theme/packages/` over large upstream rewrites

## License

GPLv3 — see [`LICENSE`](LICENSE).
