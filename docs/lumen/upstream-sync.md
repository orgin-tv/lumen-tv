# Syncing with upstream NuvioTVSmart

Lumen is a GPLv3 fork of [NuvioMedia/NuvioTVSmart](https://github.com/NuvioMedia/NuvioTVSmart). Prefer keeping Lumen-specific code in the overlay so merges stay small.

## Remotes

```bash
git remote -v
# origin   → your Lumen repository
# upstream → https://github.com/NuvioMedia/NuvioTVSmart.git
```

Pinned sync base (import SHA):

```
a8b1cab02c3b6870db42fc692d2149995c94e845
```

Also recorded in `lumen/UPSTREAM_SHA`.

## Fetch and merge

```bash
git fetch upstream
git merge upstream/main
# or: git rebase upstream/main
```

Resolve conflicts with this rule: **prefer `lumen/` overlay and `js/ui/theme/packages/`** over rewriting large upstream files.

## Isolation map

| Area               | Location                                                                           | Merge tip                     |
| ------------------ | ---------------------------------------------------------------------------------- | ----------------------------- |
| Theme packages     | `lumen/themes/`                                                                    | Lumen-owned; rarely conflicts |
| Package engine     | `js/ui/theme/packages/`                                                            | Lumen-owned                   |
| Branding constants | `lumen/branding/`                                                                  | Lumen-owned                   |
| Docs               | `docs/lumen/`                                                                      | Lumen-owned                   |
| Thin hooks         | `themeManager.js`, `themeStore.js`, Appearance settings, `appinfo.json`, wordmarks | Look for `LUMEN:` comments    |

## Conflict hotspots

- `js/ui/theme/themeManager.js` — keep the `applyThemePackage` hook after palette apply
- `js/data/local/themeStore.js` — keep `packageId` default / null semantics
- `js/ui/screens/settings/settingsScreenMethods-05-*.js` — Theme Packages UI block
- `scripts/build.mjs` — copy of `lumen/` into `dist/`
- `appinfo.json` / webOS service ids — Lumen ids (`space.lumen.webos*`)

## After sync

1. `npm install`
2. `npm run build`
3. `node --test js/ui/theme/packages/validateThemePackage.test.mjs`
4. Smoke Settings → Appearance theme packages
5. Update `lumen/UPSTREAM_SHA` to the new upstream commit
