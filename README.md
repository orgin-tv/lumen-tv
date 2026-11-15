# Lumen TV

<p align="center">
  <img src="assets/brand/lumen_wordmark.svg" alt="Lumen" width="280" />
</p>

<p align="center">
  Bring your sources together in one TV library — with Sync for the desk,<br />
  and installable design packages on the glass.
</p>

**LAN beta:** pair with **[Lumen Sync](https://github.com/lumen-tvs/lumen-sync)** using the Sync [`BETA.md`](https://github.com/lumen-tvs/lumen-sync/blob/main/BETA.md) runbook.

Open-source fork of [Nuvio TV Smart](https://github.com/NuvioMedia/NuvioTVSmart) (GPLv3).

---

## Quick start (browser beta)

Requires Node.js 20+ and npm. Sync should already be running on **3847**.

```bash
git clone https://github.com/lumen-tvs/lumen-tv.git
cd lumen-tv
cp local.example.properties local.properties
```

Edit `local.properties` (gitignored). For other devices on the LAN, use your host IP:

```properties
NUVIO_SUPABASE_URL=http://YOUR_LAN_IP:3847/api/bridge
NUVIO_SUPABASE_ANON_KEY=lumen-local-anon
TV_LOGIN_WEB_BASE_URL=http://YOUR_LAN_IP:3847/tv-login
DEVICE_LOGIN_WEB_BASE_URL=http://YOUR_LAN_IP:3847/link
LUMEN_SYNC_URL=http://YOUR_LAN_IP:3847
```

**Security:** never put `*_SECRET` values in client env / `local.properties` for the browser build. Secrets stay server-side and are omitted from `nuvio.env.js`.

```bash
npm install
npm run build
set PORT=4317
npm run serve
```

Open `http://YOUR_LAN_IP:4317` (or `http://127.0.0.1:4317` on the host).

`npm run serve` serves **dist only** and does not expose `local.properties`.

Tizen / webOS packaging (`npm run package:tizen`, `npm run package:webos`) remains available for device installs; browser serve is the primary beta path.

---

## Verify live sync

1. Sign in on the TV with the same Sync account.
2. On Sync: create/rename a profile or install a managed addon → TV updates within a few seconds.
3. On TV: change a profile name or managed addon → open Sync dashboard refreshes.
4. Optional host smoke (Sync must be up): `npm run test:smoke-sync`

---

## Scripts

| Script                                    | Purpose                                                       |
| ----------------------------------------- | ------------------------------------------------------------- |
| `npm run build`                           | Bundle into `dist/` (beta version stamp includes git/date id) |
| `npm run serve`                           | Dist-only static serve (set `PORT`, e.g. `4317`)              |
| `npm run test:smoke-sync`                 | Sync-path smokes against local Sync                           |
| `npm run package:tizen` / `package:webos` | Device packages                                               |

Set `BETA_REQUIRE_SYNC_URL=1` when packaging beta builds so a blank Sync/bridge URL fails the build loudly.

---

## Designs

Install a design like a catalog source: paste a `theme.json` URL. Packages are validated and sanitized before they apply.

- Guide: [`docs/lumen/creating-themes.md`](docs/lumen/creating-themes.md)
- Built-ins: `lumen.default`, `lumen.cinema`

---

## Upstream

- Guide: [`docs/lumen/upstream-sync.md`](docs/lumen/upstream-sync.md)
- Prefer changes under `lumen/` and `js/ui/theme/packages/` over large upstream rewrites

## License

GPLv3 — see [`LICENSE`](LICENSE).
