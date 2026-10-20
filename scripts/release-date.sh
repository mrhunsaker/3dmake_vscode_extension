#!/usr/bin/env bash
set -euo pipefail

# Usage: release-date.sh [yyyy.mm.dd] [remote]
# Default date is current UTC date.
DATE_TAG="${1:-$(date -u +%Y.%m.%d)}"
REMOTE="${2:-origin}"

if [[ ! "$DATE_TAG" =~ ^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$ ]]; then
  echo "Date tag must match yyyy.mm.dd. Received: $DATE_TAG" >&2
  exit 1
fi

IFS='.' read -r YEAR MONTH DAY <<< "$DATE_TAG"
SEMVER_VERSION="${YEAR}.$((10#$MONTH)).$((10#$DAY))"
VSIX_PATH="artifacts/vscode-3dmake-gui-${SEMVER_VERSION}.vsix"

for cmd in git npm npx bash; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Required command not found: $cmd" >&2
    exit 1
  fi
done

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash changes before running release-date.sh." >&2
  exit 1
fi

echo "Releasing with date tag: $DATE_TAG"
echo "Using semver version: $SEMVER_VERSION"

npm version "$SEMVER_VERSION" --no-git-tag-version
npm run compile
npm run lint
mkdir -p artifacts
npx vsce package --out "$VSIX_PATH"
npx vsce publish --packagePath "$VSIX_PATH"

git add package.json package-lock.json
if git diff --cached --quiet; then
  echo "No version changes to commit (already at $SEMVER_VERSION)."
else
  git commit -m "Release $SEMVER_VERSION"
fi

git push "$REMOTE" HEAD
bash ./scripts/ensure-release-tag.sh "$DATE_TAG" "$REMOTE"

echo "Release flow complete."
echo "Published version: $SEMVER_VERSION"
echo "Git tag pushed: $DATE_TAG"
