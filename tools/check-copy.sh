#!/usr/bin/env bash
#
# Is this copy of consent.js current, behind, hand-edited, or a major behind?
#
#   tools/check-copy.sh path/to/your/consent.js
#
# The kit is not a dependency: a site keeps its own copy and nobody tells it when a release comes
# out. This is the check the README describes, written down so that it is a mechanism and not an
# instruction — and so that a major release is refused by the check rather than by a note in the
# docs. It needs git, curl and nothing else: no token, no API, no account.
#
# Exit codes, so that a job can act on them without reading:
#
#   0  current: the copy is the newest release, byte for byte
#   1  behind by a patch or a minor: copy src/consent.js and src/consent.css, and nothing else
#   2  behind by a major: stop and read the release notes — the site's own configuration, markup
#      and stylesheet have to move in the same commit, and two files would break it
#   3  the copy is not the file its header says it is: edited by hand, taken from an unreleased
#      tree, or renumbered. Until that is resolved there is no way to tell whether it is behind.
#   4  could not check: no file, no version in its header, or the repository could not be reached
#
# A version is matched by shape, `[0-9]+.[0-9]+.[0-9]+`, and not by the name beside it: copies
# taken before 2.2.0 say `consent-kit` there, and they are old, not unreadable.
set -euo pipefail

REPO="https://github.com/marco-fabbri/nothing-before-consent"
RAW="https://raw.githubusercontent.com/marco-fabbri/nothing-before-consent"
COPY="${1:-}"

if [ -z "$COPY" ] || [ ! -f "$COPY" ]; then
  echo "usage: $0 path/to/consent.js" >&2
  exit 4
fi

DECLARED="$(head -5 "$COPY" | grep -m1 -oE '[0-9]+\.[0-9]+\.[0-9]+' || true)"
if [ -z "$DECLARED" ]; then
  echo "cannot check: no version in the header of $COPY" >&2
  exit 4
fi

# The newest `v*` tag, and nothing else: main may legitimately be ahead of every release.
# --refs, because the tags are annotated and would otherwise come back twice.
NEWEST="$(git ls-remote --tags --refs --sort=-v:refname "$REPO" 'v*' 2>/dev/null | head -1 | sed 's|.*refs/tags/v||')"
if [ -z "$NEWEST" ]; then
  echo "cannot check: could not read the tags of $REPO" >&2
  exit 4
fi

# Byte for byte against the release the copy declares. A 404 here means that version was never
# released, which is a cleaner answer than a diff nobody can compute.
if ! curl -sf "$RAW/v$DECLARED/src/consent.js" | diff -q - "$COPY" >/dev/null 2>&1; then
  echo "differs: $COPY declares $DECLARED but is not the file released as v$DECLARED" >&2
  echo "  (edited by hand, taken from an unreleased tree, or renumbered). Colours belong in the" >&2
  echo "  --ck-* variables, behaviour in window.consentConfig, wording in texts: put the edits" >&2
  echo "  there, take a clean copy, and check again." >&2
  exit 3
fi

if [ "$DECLARED" = "$NEWEST" ]; then
  echo "current: $DECLARED"
  exit 0
fi

if [ "${DECLARED%%.*}" != "${NEWEST%%.*}" ]; then
  echo "major behind: $DECLARED -> $NEWEST. Two files are not enough for this one." >&2
  echo "  Read the release notes first: $REPO/releases" >&2
  exit 2
fi

echo "behind: $DECLARED -> $NEWEST. Copy src/consent.js and src/consent.css from $REPO/tree/v$NEWEST" >&2
exit 1
