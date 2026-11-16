#!/usr/bin/env bash
set -Eeuo pipefail

REMOTE=promin
BRANCH=main
REPOSITORY_URL=https://github.com/karolmarol931-coder/promin
CONFIG=frontend/src-tauri/tauri.conf.json
DRY_RUN=false

usage() {
  printf 'Usage: %s <patch|minor|major> [--dry-run]\n' "${0##*/}" >&2
}

fail() {
  printf 'Release stopped: %s\n' "$1" >&2
  exit 1
}

[[ $# -ge 1 && $# -le 2 ]] || { usage; exit 2; }
INCREMENT=$1
if [[ $# -eq 2 ]]; then
  [[ $2 == --dry-run ]] || { usage; exit 2; }
  DRY_RUN=true
fi
case "$INCREMENT" in
  patch|minor|major) ;;
  *) usage; exit 2 ;;
esac

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || fail 'run this from inside the Promin repository.'
cd "$ROOT"

REMOTE_URL=$(git remote get-url "$REMOTE" 2>/dev/null) || fail "Git remote '$REMOTE' is missing."
case "${REMOTE_URL%.git}" in
  "$REPOSITORY_URL"|git@github.com:karolmarol931-coder/promin|ssh://git@github.com/karolmarol931-coder/promin) ;;
  *) fail "Git remote '$REMOTE' points to an unexpected repository: $REMOTE_URL" ;;
esac

CURRENT_BRANCH=$(git branch --show-current)
[[ $CURRENT_BRANCH == "$BRANCH" ]] || fail "release from '$BRANCH', not '$CURRENT_BRANCH'."
[[ -z $(git status --porcelain --untracked-files=all) ]] || fail 'commit or discard all local changes first.'

git fetch --quiet --tags "$REMOTE" "refs/heads/$BRANCH:refs/remotes/$REMOTE/$BRANCH" || fail "could not fetch $REMOTE/$BRANCH."
REMOTE_HEAD=$(git rev-parse "refs/remotes/$REMOTE/$BRANCH")
LOCAL_HEAD=$(git rev-parse HEAD)
[[ $LOCAL_HEAD == "$REMOTE_HEAD" ]] || fail "local $BRANCH must match $REMOTE/$BRANCH before making a release."

VERSION=$(python3 - "$CONFIG" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as config_file:
    print(json.load(config_file)["version"])
PY
)
[[ $VERSION =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]] || fail "unsupported app version '$VERSION'; expected MAJOR.MINOR.PATCH."
MAJOR=${BASH_REMATCH[1]}
MINOR=${BASH_REMATCH[2]}
PATCH=${BASH_REMATCH[3]}

case "$INCREMENT" in
  patch) PATCH=$((10#$PATCH + 1)) ;;
  minor) MINOR=$((10#$MINOR + 1)); PATCH=0 ;;
  major) MAJOR=$((10#$MAJOR + 1)); MINOR=0; PATCH=0 ;;
esac
NEXT_VERSION="$((10#$MAJOR)).$((10#$MINOR)).$((10#$PATCH))"
TAG="v$NEXT_VERSION"
if git show-ref --verify --quiet "refs/tags/$TAG"; then
  fail "tag $TAG already exists."
fi

printf 'Promin release: %s -> %s\n' "$VERSION" "$NEXT_VERSION"
printf 'Repository: %s (%s)\n' "$REPOSITORY_URL" "$REMOTE"
printf 'Branch: %s\n' "$BRANCH"
if [[ $DRY_RUN == true ]]; then
  printf 'Dry run: would update %s, commit, tag %s, push main, then push the tag.\n' "$CONFIG" "$TAG"
  exit 0
fi

python3 - "$CONFIG" "$VERSION" "$NEXT_VERSION" <<'PY'
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
current, following = sys.argv[2:]
text = path.read_text(encoding="utf-8")
pattern = re.compile(r'("version"\s*:\s*")' + re.escape(current) + r'(")')
updated, count = pattern.subn(rf"\g<1>{following}\g<2>", text, count=1)
if count != 1:
    raise SystemExit(f"Expected one version field containing {current} in {path}.")
path.write_text(updated, encoding="utf-8")
PY

git add "$CONFIG"
git commit -m "chore: release v$NEXT_VERSION"
git tag -a "$TAG" -m "Promin $TAG"
git push "$REMOTE" "HEAD:refs/heads/$BRANCH" || fail "branch push failed; no release tag was sent."
git push "$REMOTE" "refs/tags/$TAG" || fail "version commit reached $REMOTE/$BRANCH, but the release tag did not. Finish with: git push $REMOTE refs/tags/$TAG"

printf '\nRelease build started. Track it here:\n%s/actions/workflows/promin-release.yml\n' "$REPOSITORY_URL"
printf 'When the workflow finishes, the release will be published and the app updater can deliver %s.\n' "$TAG"
