# Lumen TV

<p align="center">
  <img src="assets/brand/lumen_wordmark.svg" alt="Lumen" width="280" />
</p>

<p align="center">
  Bring your sources together in one TV library — with installable, safe theme packages.
</p>

**Lumen** is an open-source fork of [Nuvio TV Smart](https://github.com/NuvioMedia/NuvioTVSmart) (GPLv3). Upstream credit belongs to the NuvioMedia contributors who built the player, addon, and TV shell that Lumen extends.

## What Lumen adds

- Rebranded TV app identity (`space.lumen.webos`, Lumen wordmark)
- **Designs** — addon-like installable looks (JSON tokens + sandboxed CSS)
- Settings → Appearance → Install design from URL, apply, remove
- Soft fallback to Lumen Default; designs never touch addons, player, or navigation

Install a design the same way you’d add a catalog source: paste a `theme.json` URL. Packages are validated and sanitized before they apply.

## Platforms

Same as upstream Nuvio TV Smart: **Samsung Tizen 4+** and **LG webOS 5+**.

## Develop locally

Requires Node.js and npm.

```bash
git clone <your-lumen-repo-url> lumen-tv-smart
cd lumen-tv-smart
npm install
npm run build
npm run serve
```

Open the printed local URL in a browser for a desktop smoke check. Theme packages load from `lumen/themes/`.

### Lumen Sync (website)

Companion desk: **[lumen-tvs/lumen-sync](https://github.com/lumen-tvs/lumen-sync)** (separate repo under [lumen-tvs](https://github.com/lumen-tvs)).

```bash
git clone https://github.com/lumen-tvs/lumen-sync.git
cd lumen-sync
npm install
env -u DATABASE_URL npm run dev
```

Open `http://127.0.0.1:3847`. QR login points at Sync `/link` by default.


## Designs

- Authoring / install guide: [`docs/lumen/creating-themes.md`](docs/lumen/creating-themes.md)
- Built-ins: `lumen.default`, `lumen.cinema`
- Sample installable (not in catalog): `/lumen/themes/community.aurora/theme.json`

## Upstream sync

- Guide: [`docs/lumen/upstream-sync.md`](docs/lumen/upstream-sync.md)
- Remote: `upstream` → `https://github.com/NuvioMedia/NuvioTVSmart.git`
- Prefer `lumen/` and `js/ui/theme/packages/` over large upstream rewrites

## License

GNU General Public License v3.0 — see [`LICENSE`](LICENSE).
This project includes and modifies NuvioTVSmart under the same license.
