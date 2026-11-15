#!/usr/bin/env bash
# Push split TV + Sync trees to https://github.com/lumen-tvs
# Requires: `gh auth login` (or GH_TOKEN) with permission to create repos in lumen-tvs.
set -euo pipefail

ORG="${LUMEN_ORG:-lumen-tvs}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${TMPDIR:-/tmp}/lumen-org-export"
VISIBILITY="${LUMEN_REPO_VISIBILITY:-private}" # private|public

need() { command -v "$1" >/dev/null || { echo "Missing $1"; exit 1; }; }
need git
need gh
need tar

gh auth status >/dev/null

rm -rf "$OUT"
mkdir -p "$OUT/lumen-tv" "$OUT/lumen-sync"

tar -C "$SRC" --exclude=node_modules --exclude=dist --exclude=.git --exclude=web \
  --exclude=.next --exclude='*.log' -cf - . | tar -C "$OUT/lumen-tv" -xf -

tar -C "$SRC/web" --exclude=node_modules --exclude=.next --exclude=.git \
  --exclude='*.log' -cf - . | tar -C "$OUT/lumen-sync" -xf -

create_and_push() {
  local name="$1"
  local dir="$OUT/$name"
  cd "$dir"
  rm -rf .git
  git init -b main
  git add -A
  git commit -m "Initial import for ${ORG}/${name}"

  if ! gh repo view "${ORG}/${name}" >/dev/null 2>&1; then
    gh repo create "${ORG}/${name}" "--${VISIBILITY}" \
      --description "Lumen ${name}" --source=. --remote=origin --push
  else
    git remote remove origin 2>/dev/null || true
    git remote add origin "https://github.com/${ORG}/${name}.git"
    git push -u origin main
  fi
  echo "Pushed https://github.com/${ORG}/${name}"
}

create_and_push lumen-tv
create_and_push lumen-sync
echo "Done."
