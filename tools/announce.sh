#!/usr/bin/env bash
#
# Announce a release of the kit to the sites listed in consumers.csv, opening one PR per site.
#
# The design and the reasoning are in docs/announcing-releases.md. In two lines: the kit is the only
# place that knows a release happened, the sites are the only ones that know what they are running,
# and asking every site to find out for itself means N mechanisms and N credentials on sites that in
# part have no CI at all. So the kit announces.
#
# The logic lives here and not inside the workflow on purpose: it runs identically by hand — with
# your own authenticated `gh` — and in CI with the repository's token. A mechanism you can only try
# after publishing it is a mechanism you never try.
#
#   tools/announce.sh                      # latest tag, to every site
#   tools/announce.sh --dry-run            # says what it would do, touches nothing
#   tools/announce.sh --version 2.0.0      # a specific release
#   tools/announce.sh --only andreamuccioli.com
#
# A note for whoever edits this: no `[ … ] && command` outside an `if`. Under `set -e` a false test
# exits the script, and it is the kind of failure that only shows up in the case you did not try.
#
set -euo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$KIT"

VERSION=""
DRY_RUN=0
ONLY=""

while [ $# -gt 0 ]; do
  case "$1" in
    --version) VERSION="${2#v}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --only)    ONLY="$2"; shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

# `gh auth token` locally, GH_TOKEN in CI: one code path for two credentials.
if [ -z "${GH_TOKEN:-}" ]; then
  GH_TOKEN="$(gh auth token 2>/dev/null || true)"
fi
if [ -z "$GH_TOKEN" ]; then
  echo "no credential: neither GH_TOKEN nor an authenticated gh" >&2
  exit 2
fi
export GH_TOKEN

declared_version() {  # reads "consent-kit X.Y.Z" from a file's header
  sed -n '1,3p' "$1" 2>/dev/null | sed -n 's/.*consent-kit \([0-9][0-9.]*\).*/\1/p' | head -1
}

# The CHANGELOG entries between the site's version (excluded) and the new one (included): a site
# stuck at 1.0.0 must see what went past in between, not only the latest line.
changelog_between() {
  awk -v newer="## $1" -v older="## $2" '
    index($0, newer) == 1 { inside = 1 }
    older != "## " && index($0, older) == 1 { inside = 0 }
    inside { print }
  ' CHANGELOG.md
}

# ---------------------------------------------------------------- the release to announce

if [ -z "$VERSION" ]; then
  LATEST="$(git tag -l 'v*' --sort=-v:refname | head -1)"
  if [ -z "$LATEST" ]; then
    echo "no v* tag in this repo: a release is published by tagging it" >&2
    exit 1
  fi
  VERSION="${LATEST#v}"
fi
TAG="v$VERSION"

if ! git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "the tag $TAG does not exist" >&2
  exit 1
fi

# ---------------------------------------------------------------- the coherence gate
#
# Four numbers kept in step by hand: the tag, the constant in the engine, the headers of the two
# files and the top entry of the CHANGELOG. From here on every comparison trusts them, and a wrong
# number does not produce an error — it produces a false announcement to every site at once. It is
# the reason a hash is preferred elsewhere to a counter somebody has to remember to bump.

CONSTANT="$(sed -n "s/.*KIT_VERSION = '\([0-9][0-9.]*\)'.*/\1/p" src/consent.js | head -1)"
HEADER_JS="$(declared_version src/consent.js)"
HEADER_CSS="$(declared_version src/consent.css)"
FROM_CHANGELOG="$(grep -m1 '^## ' CHANGELOG.md | sed -n 's/^## \([0-9][0-9.]*\).*/\1/p')"

INCOHERENT=0
for PAIR in "tag:$VERSION" "KIT_VERSION:$CONSTANT" "consent.js:$HEADER_JS" \
            "consent.css:$HEADER_CSS" "CHANGELOG.md:$FROM_CHANGELOG"; do
  WHERE="${PAIR%%:*}"
  SAYS="${PAIR#*:}"
  if [ "$SAYS" != "$VERSION" ]; then
    echo "incoherent: $WHERE says '${SAYS:-nothing}', the tag says '$VERSION'" >&2
    INCOHERENT=1
  fi
done
if [ "$INCOHERENT" -ne 0 ]; then
  echo "no site was touched." >&2
  exit 1
fi

echo "announcing $VERSION"
if [ "$DRY_RUN" -eq 1 ]; then
  echo "(dry run: no commit, no PR)"
fi

# ---------------------------------------------------------------- the sites

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
FAILED=""

# SITE_PATH and not PATH: assigning to PATH would leave the rest of this script without a shell.
while IFS=, read -r SITE REPO SITE_PATH BRANCH || [ -n "$SITE" ]; do
  SITE="$(echo "$SITE" | tr -d '\r')"
  BRANCH="$(echo "${BRANCH:-main}" | tr -d '\r')"
  if [ "$SITE" = "site" ] || [ -z "$SITE" ]; then
    continue
  fi
  if [ -n "$ONLY" ] && [ "$ONLY" != "$SITE" ]; then
    continue
  fi

  echo
  echo "── $SITE ($REPO)"

  # A site that fails — repo renamed, path moved, token without access — must not stop the others:
  # one subshell per site, errors collected, the job fails at the end.
  if (
    set -e
    CLONE="$WORK/$(echo "$REPO" | tr '/' '_')"
    git clone --quiet --depth 1 --branch "$BRANCH" \
      "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git" "$CLONE"

    COPY="$CLONE/$SITE_PATH"
    if [ ! -f "$COPY/consent.js" ]; then
      echo "   no consent.js in $SITE_PATH — wrong path in the registry?"
      exit 1
    fi

    THEIRS="$(declared_version "$COPY/consent.js")"
    echo "   has: ${THEIRS:-unreadable}"

    if [ "$THEIRS" = "$VERSION" ]; then
      echo "   already up to date, nothing to do"
      exit 0
    fi

    # A MAJOR bump is not something this mechanism may deliver. It knows how to carry two files,
    # and a major release is by definition one where two files are not enough: the site's own
    # config, markup and stylesheet have to move in the same commit. A PR carrying only the files
    # would be a PR that breaks the site if merged — and it would look like every other one.
    #
    # So it refuses, loudly, and the run goes red. A major happens rarely enough that doing it by
    # hand is right; being quietly wrong about it once is not.
    if [ "${VERSION%%.*}" != "${THEIRS%%.*}" ]; then
      echo "   REFUSED: ${THEIRS:-unknown} → $VERSION crosses a major version."
      echo "   Two files are not enough here: this site's own configuration, markup and stylesheet"
      echo "   have to move with them, in the same commit. See the rename table in CHANGELOG.md"
      echo "   and do this one by hand."
      exit 1
    fi

    # Has this copy been edited by hand? It is the question the tags exist for. Without this check
    # the PR would overwrite a local edit in silence — and a local edit is also what makes the
    # declared version false, and with it every future comparison.
    EDITS=""
    if [ -n "$THEIRS" ] && git rev-parse -q --verify "refs/tags/v$THEIRS" >/dev/null; then
      for F in consent.js consent.css; do
        if ! git show "v$THEIRS:src/$F" | diff -q - "$COPY/$F" >/dev/null 2>&1; then
          D="$(git show "v$THEIRS:src/$F" | diff -u - "$COPY/$F" || true)"
          D="$(echo "$D" | sed "s|^--- -|--- kit $THEIRS/$F|; s|^+++ .*|+++ $SITE/$F|")"
          EDITS="${EDITS}${D}
"
        fi
      done
      if [ -n "$EDITS" ]; then
        echo "   WARNING: this copy has been edited by hand"
      fi
    else
      echo "   version does not map to a tag: no byte-for-byte comparison"
    fi

    BODY="$WORK/body.md"
    {
      echo "The kit has moved to **$VERSION**; this site was on \`${THEIRS:-an unreadable version}\`."
      echo
      changelog_between "$VERSION" "$THEIRS"
      echo
      if [ -n "$EDITS" ]; then
        echo "## ⚠ This copy had been edited by hand"
        echo
        echo "The edits below **are about to be overwritten**. If this site needs them they belong in"
        echo "the kit, or where they should have been in the first place: colours in the \`--ck-*\`"
        echo "variables of the site's own stylesheet, behaviour in \`window.consentConfig\`. An edited"
        echo "copy can no longer be compared with its source, which is the only way to know whether"
        echo "the site is behind."
        echo
        echo '```diff'
        echo "$EDITS"
        echo '```'
        echo
      fi
      echo "---"
      echo
      echo "Opened by \`tools/announce.sh\` in the kit. The merge stays a decision of whoever answers"
      echo "for this site, and the new options listed above have not been switched on: the kit cannot"
      echo "know whether this site wants them."
    } > "$BODY"

    if [ "$DRY_RUN" -eq 1 ]; then
      echo "   DRY RUN: would open a PR ${THEIRS:-?} → $VERSION"
      echo "   ---8<--- PR body ---8<---"
      sed 's/^/   /' "$BODY"
      echo "   ---8<---------------8<---"
      exit 0
    fi

    cp src/consent.js src/consent.css "$COPY/"
    cd "$CLONE"
    git checkout --quiet -b "consent-kit/$TAG"
    git -c user.name="consent-kit" -c user.email="consent-kit@users.noreply.github.com" \
      commit --quiet -a -m "Update consent-kit to $VERSION

The versioned copy realigned to the kit's $TAG. The CHANGELOG entries separating this site
from the new release are in the body of the PR."
    git push --quiet --force-with-lease origin "consent-kit/$TAG"

    EXISTING="$(gh pr list --repo "$REPO" --head "consent-kit/$TAG" --state open --json number --jq '.[0].number')"
    if [ -n "$EXISTING" ]; then
      gh pr edit "$EXISTING" --repo "$REPO" --body-file "$BODY" >/dev/null
      echo "   PR #$EXISTING updated"
    else
      gh pr create --repo "$REPO" --base "$BRANCH" --head "consent-kit/$TAG" \
        --title "Update consent-kit to $VERSION" --body-file "$BODY"
    fi
  ); then
    :
  else
    echo "   FAILED"
    FAILED="$FAILED $SITE"
  fi
done < consumers.csv

echo
if [ -n "$FAILED" ]; then
  echo "failed:$FAILED" >&2
  exit 1
fi
echo "done."
