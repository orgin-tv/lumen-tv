# GitHub organization: lumen-tvs

Org: [https://github.com/lumen-tvs](https://github.com/lumen-tvs)

## Target layout

| Repo                                                              | Contents                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| [`lumen-tvs/lumen-tv`](https://github.com/lumen-tvs/lumen-tv)     | TV / webOS player (this monorepo root without `web/`) |
| [`lumen-tvs/lumen-sync`](https://github.com/lumen-tvs/lumen-sync) | Next.js Sync desk (`web/` as repo root)               |

## What the agent still needs from you

Cursor’s GitHub connection can see your user (`Modotss`) but **not** the `lumen-tvs` org yet, and this environment has no `gh` login — so the agent cannot create or push org repos until:

1. **Install the Cursor GitHub App on the org**  
   [https://github.com/apps/cursor/installations/new](https://github.com/apps/cursor/installations/new) → choose **lumen-tvs** → all repos (or the two Lumen repos).
2. **Either**
   - Create empty `lumen-tv` and `lumen-sync` under the org in the GitHub UI, **or**
   - Run the push script yourself after `gh auth login` (org owner token):

```bash
cd /path/to/this/repo
chmod +x scripts/push-to-lumen-tvs.sh
LUMEN_REPO_VISIBILITY=private ./scripts/push-to-lumen-tvs.sh
```

3. Reply here that the App is installed (and repos exist). The agent will retry push/verify.

Prepared export trees (when this machine last built them): `/tmp/lumen-org-export/lumen-tv` and `/tmp/lumen-org-export/lumen-sync`.

## Local Sync ↔ TV (no cloud Supabase)

```text
NUVIO_SUPABASE_URL=http://127.0.0.1:3847/api/bridge
NUVIO_SUPABASE_ANON_KEY=lumen-local-anon
DEVICE_LOGIN_WEB_BASE_URL=http://127.0.0.1:3847/link
TV_LOGIN_WEB_BASE_URL=http://127.0.0.1:3847/tv-login
```
