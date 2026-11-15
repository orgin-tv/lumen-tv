# Creating Lumen design packages

Designs are **addon-like visual packages**. Install a `theme.json` URL the same way you add a catalog addon — except designs can never run JavaScript, fetch addons, or touch the player.

Designs may change colors, density, radius, motion, glass, and hero cosmetics. They must never change addon, player, or navigation behavior.

## Why designs (not option sprawl)

Users pick **one complete look**. Authors ship curated tokens + optional safe CSS. The app validates and sandboxes every package before it applies, then falls back to **Lumen Default** if anything fails.

## Package layout

```
your-design/
  theme.json      # required manifest + tokens
  theme.css       # optional allowlisted cosmetic CSS
  preview.png     # optional preview image (not loaded into CSS)
```

Ship the folder on HTTPS (or drop it under `lumen/themes/` for local/bundled use). Users install with the `theme.json` URL.

Built-ins live in `lumen/themes/` and are registered in `catalog.json` (`lumen.default`, `lumen.cinema`). Anything else is installed from a `theme.json` URL and is not shipped as a built-in. A local sample for install testing is `community.aurora`.

## Install (in the app)

Settings → Appearance → **Install design from URL**

Examples:

- `https://example.com/designs/aurora/theme.json`
- `/lumen/themes/community.aurora/theme.json` (same-origin sample)

## Manifest (`theme.json`)

| Field           | Required | Notes                                        |
| --------------- | -------- | -------------------------------------------- |
| `id`            | yes      | Stable id, e.g. `studio.midnight`            |
| `name`          | yes      | Display name                                 |
| `version`       | yes      | Semver string                                |
| `apiVersion`    | yes      | Must be `1`                                  |
| `tokens`        | yes      | Design tokens (see below)                    |
| `author`        | no       | Credit string                                |
| `description`   | no       | Short subtitle                               |
| `baseThemeName` | no       | Seed palette (`AMBER`, `CRIMSON`, `JADE`, …) |
| `css`           | no       | Relative CSS filename only (no paths)        |
| `preview`       | no       | Relative preview image (metadata)            |
| `supporterOnly` | no       | Reserved; keep `false`                       |

Remote packages cannot use reserved `lumen.*` ids.

### Token groups

- **colors** — `bg`, `bgElevated`, `cardBg`, `accent`, `accentStrong`, `onAccent`, `focus`, `focusBg`, `text`, `textSecondary`, `textTertiary`, `border` (6-digit hex only)
- **typography** — `fontFamily` (`INTER` \| `DM_SANS` \| `OPEN_SANS`), `titleScale`
- **spacing** — `density` (`comfortable` \| `compact` \| `spacious`), `cardGap`, `safeGutter`
- **shapes** — `cardRadius`, `posterRadius`, `buttonRadius`
- **motion** — `fastMs`, `normalMs`, `cinematicMs`
- **glass** — `enabled`, `blur`, `opacity`
- **hero** — `gradientStrength`, `titleShadow`
- **layout** — `railScale`, `expandingCards`

Unknown keys are ignored. Invalid values are dropped.

## Optional CSS

`theme.css` may only:

- Target `:root` or `[data-lumen-theme="<id>"]`
- Set allowlisted CSS custom properties (`--*` from the token map, plus `--lumen-*` cosmetics)
- Use safe visual property values (no `url()`, no positioning hacks)

Blocked:

- `@import`, `@font-face`, `@keyframes`, any `url(...)`
- `javascript:`, `expression()`, bindings
- Absolute / fixed positioning, `display: none`, `visibility: hidden`, `pointer-events`, `z-index`
- Selectors outside the allowlist (no `.player-*`, no addon nodes)
- Any JavaScript

CSS referenced by the manifest must be on the **same origin** as the manifest.

## Safety model

| Layer     | Rule                                                              |
| --------- | ----------------------------------------------------------------- |
| Install   | Fetch → size limits → JSON parse → validate → sanitize → persist  |
| Persist   | Only sanitized tokens/CSS variables stored                        |
| Apply     | Hot-swap CSS variables via ThemeManager; soft-fallback on failure |
| Isolation | `data-lumen-theme` / `data-lumen-design` on `<html>` only         |
| Non-goals | No JS, no addon APIs, no player control overrides                 |

On validation failure or load error the app stays on **Lumen Default** (`lumen.default`).

## Authoring workflow

1. Copy `lumen/themes/lumen.default/` or `community.aurora/`.
2. Edit `theme.json` tokens and optional `theme.css`.
3. Run `npm run test:themes`.
4. `npm run build && npm run serve`, then install via Settings → Appearance with the `theme.json` path/URL.

## Bridge CSS

`css/lumen-design.css` maps `--lumen-*` tokens onto home/settings shell surfaces (hero overlay, glass panels, focus scale, motion). Player chrome is explicitly opted out.
