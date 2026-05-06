#!/usr/bin/env bash
set -euo pipefail

# Usage: ensure-release-tag.sh [yyyy.mm.dd] [remote]
# If no tag is provided, use current UTC date.
TAG="${1:-$(date -u +%Y.%m.%d)}"
REMOTE="${2:-origin}"

if [[ ! "$TAG" =~ ^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$ ]]; then
  echo "Tag must match yyyy.mm.dd. Received: $TAG" >&2
  exit 1
fi

git fetch --tags --force >/dev/null 2>&1 || true

if git rev-parse "$TAG" >/dev/null 2>&1; then
  TAG_COMMIT="$(git rev-list -n 1 "$TAG")"
  HEAD_COMMIT="$(git rev-parse HEAD)"

  if [[ "$TAG_COMMIT" != "$HEAD_COMMIT" ]]; then
    echo "Tag $TAG already exists on a different commit ($TAG_COMMIT)." >&2
    echo "Use a different tag input to avoid releasing the wrong commit." >&2
    exit 1
  fi

  echo "Tag $TAG already exists on current commit."
else
  git tag "$TAG"
  echo "Created tag $TAG"
fi

git push "$REMOTE" "$TAG"
echo "Pushed tag $TAG to $REMOTE"

echo "$TAG"
