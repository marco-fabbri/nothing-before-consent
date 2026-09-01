# Contributing

Read this before opening a pull request, mostly so that a refusal is never a surprise. Some of what
follows is not a preference — it is the reason the project exists in the form it does.

## What this project refuses, by construction

These are not open questions. A pull request that changes one of them will be declined, however well
it is written:

- **no dependency, no build step, no `package.json`.** The kit is installed by copying two files into
  a site. That is the promise, and it is what lets it run on a Ghost theme, an Astro build and a
  folder of static HTML without any of them acquiring a toolchain. A package manager to obtain two
  static files is a cost paid by every adopter for the convenience of one maintainer.
- **no network request from `consent.js`**, save the optional `regimeUrl`, which is the site's own
  endpoint and off by default. This is the file whose entire reason for existing is that no request
  leaves before the visitor answers. It does not get to make an exception for itself — no CDN, no
  version ping, no telemetry, ever.
- **no fourth category.** Three is a choice, not an oversight: a category the visitor cannot tell
  apart from another is a checkbox that collects a click rather than a decision. If something does
  not fit `necessary`, `analytics` or `marketing`, the case for a fourth has to be made in an issue
  before any code.
- **no TCF/IAB.** Supporting the consent string means adopting a vendor list and its update cadence,
  which is the subscription this project is the alternative to. An ad-tech setup that needs it is
  better served by something else, and the README says so.
- **no compatibility shim for a renamed thing.** When something is renamed, it is renamed. 2.0.0 set
  that precedent and gave the reasoning; the one exception in the tree is the `localStorage` key
  carried over in 2.2.0, which exists because the alternative was clearing consents that visitors had
  already given, and it is documented as temporary at the point where it is read.

## The release ritual

The version is written by hand in four places and they must all agree:

| Where | What |
|---|---|
| `src/consent.js` | the header comment (line 2: line 1 is the `/*!` that opens it) |
| `src/consent.js` | the `KIT_VERSION` constant |
| `src/consent.css` | the header comment (line 1) |
| `CHANGELOG.md` | the first `## ` entry |

`tools/check-version.sh` checks it, and CI runs it on every push and pull request. On a tag it also
checks that the tag agrees; on a branch it deliberately does not, because during a release the tree
is legitimately ahead of the newest tag.

**`texts/` is excluded on purpose.** Those templates carry the version they were last written for,
and a template whose header is behind the code is information rather than drift — it says the
words did not need to change. Adding them to the gate would create a fifth number to bump, which is
how a check teaches people to bump numbers without reading them. The corollary has teeth: **a
template that is rewritten gets the new number, and a template whose header is bumped has to have
been reread**, because the header is a claim that the words match the code of that release.

**The tag is the act that publishes.** Until `v<version>` exists, a change in `src/` is work in
progress and nobody is running it. Sites hold copies and compare against tags, so a tag is a promise
that a specific set of bytes is downloadable at a specific name, forever. Do not move one.

**Semantic versioning, with one rule that has teeth.** A patch or a minor must be deliverable by
copying the two files and nothing else — that is what makes a mechanical check worth writing on the
other side. A release where the site's own configuration, markup or stylesheet has to move in the
same commit is a major, by definition and without discussion.

## How a change is verified

There is no test framework, and adding one has been considered and declined: the only assertion that
matters is a property of a real browser's network traffic, and reaching it means a headless browser,
a lockfile and a dependency tree larger than the code it guards. Neither defect that actually
occurred in the first six releases would have been caught by one — both were visual, on a phone,
found by a person looking.

What exists instead is a page and a checklist, and they are the suite:

1. open `examples/demo.html` in a browser, in a private window, with the **Network** tab showing;
2. work through the six points under "Verify, before saying it works" in the README. Point 1 —
   nothing leaves before the choice — is the one that distinguishes this from a decorative banner,
   and it is not optional;
3. `?page=casper` reproduces a 62.5% root and that theme family's page colours, which is where two of
   the six releases' defects actually lived. Use it;
4. `?pos=bottom`, `top`, `corner` — the non-modal variants must stay navigable, and must not claim
   `aria-modal`;
5. keyboard only: reach and operate every control with Tab and Enter. In `modal`, Tab must not leave
   the panel, in either direction;
6. dark mode, actually emulated rather than assumed.

A pull request that changes behaviour says which of these were run and what was seen. "Tested" on its
own is not an answer.

## Language

Code, comments, documentation, commit messages and branch names in English.

What is **not** English-only is what the banner says to a visitor: `T.it` and `T.en` in
`src/consent.js`, and the Italian and English templates in `texts/`. Those are content, not artefact —
an Italian site needs an Italian banner, and consent collected in a language the visitor does not read
is not consent. A new language is a welcome pull request: add a dictionary under its two-letter code,
keep the keys identical, and translate the `texts/` templates or say plainly that you have not.

## Reporting something

Ordinary defects go in an issue. If you have found a way to make a third party load before the
visitor has answered, that is the one bug this project is about — use GitHub's private vulnerability
reporting rather than a public issue, and it will be treated as the first thing on the list.
