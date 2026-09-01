#!/usr/bin/env bash
#
# The coherence gate: the version is written by hand in four places, and they must all say the same
# number.
#
#   src/consent.js       the header (line 2), which a copied file carries with it
#   src/consent.js       the KIT_VERSION constant
#   src/consent.css      the header (line 1)
#   CHANGELOG.md         the first `## ` entry
#
# Four numbers kept in step by hand do not stay in step. A wrong one does not produce an error — it
# produces a wrong answer, silently, to everyone who ever asks which version they are on. That is
# the whole failure this repository is organised against, so it gets a check rather than a habit.
#
# This gate used to live inside the announcement script, which ran only when a credential was
# present — so it never actually ran. Standing on its own, it runs on every push and every pull
# request, which is the point.
#
#   tools/check-version.sh              # the four numbers in the tree agree with each other
#   tools/check-version.sh --tag v2.2.0 # ...and with that tag
#
# On a release branch the tree is legitimately ahead of the newest tag, which is why comparing
# against a tag is opt-in and not the default.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NAME="nothing-before-consent"
TAG=""

while [ $# -gt 0 ]; do
  case "$1" in
    --tag)
      TAG="${2:-}"
      if [ -z "$TAG" ]; then echo "--tag needs a value, e.g. --tag v2.2.1" >&2; exit 2; fi
      shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

declared_version() {  # reads "<name> X.Y.Z" from a file's header
  sed -n '1,3p' "$1" 2>/dev/null | sed -n "s/.*$NAME \([0-9][0-9.]*\).*/\1/p" | head -1
}

HEADER_JS="$(declared_version src/consent.js)"
HEADER_CSS="$(declared_version src/consent.css)"
CONSTANT="$(sed -n "s/.*KIT_VERSION = '\([0-9][0-9.]*\)'.*/\1/p" src/consent.js | head -1)"
FROM_CHANGELOG="$(grep -m1 '^## ' CHANGELOG.md | sed -n 's/^## \([0-9][0-9.]*\).*/\1/p')"

# Whichever number we compare the others against has to come from somewhere. With --tag it is the
# tag, because that is the thing being published; without it, the consent.js header — the one field
# every released version has carried, and the one a copied file takes with it.
if [ -n "$TAG" ]; then
  EXPECTED="${TAG#v}"
  AUTHORITY="the tag $TAG"
else
  EXPECTED="$HEADER_JS"
  AUTHORITY="src/consent.js header"
fi

if [ -z "$EXPECTED" ]; then
  echo "no version to compare against: $AUTHORITY says nothing" >&2
  exit 1
fi

INCOHERENT=0
for PAIR in "src/consent.js header:$HEADER_JS" \
            "src/consent.css header:$HEADER_CSS" \
            "KIT_VERSION:$CONSTANT" \
            "CHANGELOG.md first entry:$FROM_CHANGELOG"; do
  WHERE="${PAIR%%:*}"
  SAYS="${PAIR#*:}"
  if [ "$SAYS" != "$EXPECTED" ]; then
    echo "incoherent: $WHERE says '${SAYS:-nothing}', $AUTHORITY says '$EXPECTED'" >&2
    INCOHERENT=1
  fi
done

# texts/ is deliberately NOT checked. The templates carry the version they were last written for,
# and that is correct: they do not change in every release, and a template whose header is behind
# the code is information, not drift. Adding them here would create a fifth number to
# bump for no reason, which is how a gate teaches people to bump numbers without reading them.

if [ "$INCOHERENT" -ne 0 ]; then
  exit 1
fi

echo "version $EXPECTED, coherent in all four places"
