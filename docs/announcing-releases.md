# Announcing releases to the sites that use the kit

The design of the mechanism that tells the sites when a release comes out. Written 1 August 2026,
before the code.

## The problem, measured

The kit is installed by copying two files. From that moment every site has a copy, and nothing links
the copy back to its source: the README used to say "when a release comes out, read `CHANGELOG.md`
and copy the two files into whichever sites you want", which leaves the reader to remember both the
releases and the sites. Nowhere was it written which sites those were.

The state on the evening of 1 August 2026, read from the repositories rather than from memory:

| site | repo | path of the copy | version |
|---|---|---|---|
| staybycity.com | `marco-fabbri/staybycity` | `site/public/consent` | 1.2.1 |
| marcofabbri.com | `marco-fabbri/marcofabbri-website` | `public/consent` | 1.2.1 |
| andreamuccioli.com | `marco-fabbri/andreamuccioli-com` | `public/consent` | **1.2.0** |

The value of that table is not the row in bold: it is **how long it lasted**. The afternoon 1.2.1
was born fits in half an hour — 21:56 the kit installed on marcofabbri.com at 1.2.0, 22:12 the
correction to the sizes written in the kit, 22:16 1.2.1 published, 22:18 marcofabbri.com's copy
updated. Twenty-two minutes in which the site that had *found* the defect was running the version
that still had it.

Two copies out of three were realigned by hand within minutes because a person was watching. The
third was not, and nobody would know. On staybycity the same drift happened twice in one day, the
second time while the pull request about it was open.

None of these misalignments produced an error, a log or a warning. It is the same shape as the
failure the watchdog exists for: something that breaks nothing and for that reason stays.

## The principle: the kit announces, the sites do not check

Today the check is asked of the wrong place. A site knows what it is using but not that a release
came out; the kit knows a release came out but not who uses it. Asking every site to check itself
means writing the same mechanism N times, with N credentials and N schedules — and precisely the
sites that would need it most are the least equipped: **neither `marcofabbri-website` nor
`andreamuccioli-com` has any GitHub workflow**, so they would have nowhere to run it.

There is exactly one place that knows something happened, and that is the one that must speak.

A consequence that is not obvious but is decisive: **the kit's repository can stay private**. The
token lives in the kit and pushes outward; no site has to read the kit, so no site needs a
credential and nothing has to be published.

## What gets built

Three pieces, each useless without the other two.

### 1. The registry of consumers

`consumers.csv` in the root of the kit, one line per site:

```csv
site,repo,path,branch
staybycity.com,marco-fabbri/staybycity,site/public/consent,main
marcofabbri.com,marco-fabbri/marcofabbri-website,public/consent,main
andreamuccioli.com,marco-fabbri/andreamuccioli-com,public/consent,main
```

`path` is the folder holding the two files, not the files: they are called `consent.js` and
`consent.css` everywhere, and allowing otherwise would only permit renaming them.

**The registry is the real remedy; the automation is only what makes it useful.** Even without the
workflow, a list of who holds a copy is the information that is missing today. It goes into a CSV in
the repository, not into a service: the same choice for which staybycity keeps its ledgers in git.

### 2. The version tags

The kit had no tags: `1.2.1` existed only as a string inside three text files. They have to be
created, retroactively too, because they are what lets the workflow answer the interesting question
— *has this copy been edited by hand?* — by comparing the site's bytes against the version it
declares. Without tags that question has no answer, and a pull request would overwrite a local edit
without saying so.

The map, read from the history:

| tag | commit | why that commit |
|---|---|---|
| `v1.0.0` | `5fa25b4` | last commit at 1.0.0 (adds the English templates) |
| `v1.1.0` | `dfaacb6` | configurable position |
| `v1.2.0` | `919a2ba` | quiet banner, watchdog, geographic regime |
| `v1.2.1` | `e628c88` | sizes in px (merge on main) |

From here on every release is a tag, and **the tag is the act that publishes**: until it exists, a
change in `src/` is work in progress and no site is disturbed.

### 3. The mechanism that opens the pull requests

`tools/announce.sh`, with `.github/workflows/announce.yml` as a thin wrapper around it. The logic
lives in the script and not in the workflow so that it runs identically by hand — with an
authenticated `gh` — and in CI with the repository's token. A mechanism you can only try after
publishing it is a mechanism you never try.

It starts on the push of a `v*` tag, plus `workflow_dispatch` with an optional version — useful when
a site is added to the registry and has to be brought up to the current release without inventing a
tag.

**First of all, the coherence gate.** The tag name, `KIT_VERSION` in `src/consent.js`, the headers of
both files and the top entry of `CHANGELOG.md` must all say the same number. If they diverge the run
stops and touches no site: these are four numbers kept in step by hand, and from that moment every
downstream check trusts them. A wrong number here does not produce an error, it produces a false
announcement to three sites.

Then, for every line of the registry:

1. read the site's copy and take the version its header declares;
2. if it is already the new one, do nothing and say so in the log;
3. compare the copy byte for byte with `git show v<declared-version>:src/…` — if they differ, **that
   copy has been edited by hand**, and the diff goes into the body of the pull request;
4. copy the two files and open a PR on the branch `consent-kit/v<version>`;
5. if that PR already exists, update it instead of opening a second one.

A site that fails — repository renamed, path moved, token without access — does not stop the others:
the errors are collected and the job fails at the end, noisily.

## What the pull request says

The body is the point: a PR carrying two files without explaining why is a PR that gets merged
without being read.

- **the `CHANGELOG.md` entries between the site's version and the new one**, not only the latest: a
  site stuck at 1.0.0 must see 1.1.0 as well;
- **if the copy had been edited by hand**, the diff of those edits, with the warning that they are
  about to be overwritten;
- **the new options that release introduces** (`watchdog`, `reloadAfterChoice`, …), named and not
  switched on: the kit cannot know whether that site wants them;
- **what has to be checked by hand**, where there is any: 1.2.1 changes the sizes, and on a theme
  with a 62.5% root that changes the panel's size.

The merge stays a human act. The kit proposes; whoever answers for the site decides.

## What the mechanism deliberately does NOT do

- **It does not merge** and it does not publish: that would be a file changing by itself on a
  production site, and the file that governs consent at that.
- **It does not touch the site's configuration or stylesheet.** The `--ck-*` variables and
  `window.consentConfig` are the site's decisions, and a new release does not know them.
- **It does not check that the site actually went live** with the new version. A merged PR that never
  deploys is a different failure, and the thing that knows about it is that site's own deploy.
- **It does not handle a site that is not a GitHub repository.** Today all three are. The day one is
  not — a Ghost install where the two files are pasted into the code injection — the registry still
  serves to know it exists, and the announcement for that site will be a notification to a person.
  Out of scope now, written here so it is not rediscovered.

## The token, and its blast radius

The default `GITHUB_TOKEN` cannot write to other repositories, so this needs a fine-grained PAT,
kept in the kit as `CONSUMERS_TOKEN`, with `contents: write` and `pull requests: write` **limited to
the repositories listed in the registry**.

That is the real cost of this design and it should be stated in full: a credential exists that can
write to three sites. The narrower-permission variant is to open an **issue** instead of a pull
request — the kit warns, a person does the copying. You lose the ready-made diff and you keep the
control; it is the road to take if that blast radius is not acceptable.

## The declared weak point

An unregistered site receives nothing, in silence. It is the same failure as today, moved one step:
before, you forgot to copy the files; now you would forget to add a line. The difference is that a
line is added once, at installation — which is why the README's "Installation" section gains a fifth
step: **register the site in `consumers.csv`**. No mechanism here can notice a site that never
declared it exists.

## Alternatives rejected, and why

- **Every site checks itself**, the way `refresh_status.py` does on staybycity. Honest but expensive:
  N implementations, N read credentials on a private kit, N schedules — and two of the three sites
  have no CI to run it in. On top of that it only announces: the copying still has to be done by
  hand.
- **Publishing it on npm** and letting Dependabot do the work. It is the standard answer to the
  vendored-copy problem, and it is rejected for two reasons that belong to the kit rather than to the
  problem: the kit exists as "two files to copy, no dependencies, no build step", and a private
  package needs a registry and authentication **per site** — the same credential problem, with a
  build in every site on top.
- **Making the repository public** so that checks need no credentials. It would work, but the push
  model does not need it: it is work (removing references to the projects, adding context) that buys
  nothing here.
- **A check inside `consent.js` that asks the kit at runtime.** Never to be done: it would be one
  more network request, made by the very file whose reason for existing is to let none leave.
