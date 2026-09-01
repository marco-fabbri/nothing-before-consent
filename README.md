# nothing-before-consent

[![Version coherence](https://github.com/marco-fabbri/nothing-before-consent/actions/workflows/check-version.yml/badge.svg)](https://github.com/marco-fabbri/nothing-before-consent/actions/workflows/check-version.yml)
[![Latest tag](https://img.shields.io/github/v/tag/marco-fabbri/nothing-before-consent?sort=semver&label=version)](https://github.com/marco-fabbri/nothing-before-consent/tags)
[![Licence: MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

A consent banner with **prior blocking**, for any site whose HTML you can edit. No dependencies, two
files to copy, no subscription.

It comes from a concrete problem: three sites loading Google Analytics, maps, reviews and booking
widgets **before** the visitor could say anything. A banner that merely informs solves none of it —
it declares a consent that was never given.

**What it needs from a site**, which is the honest version of who this is for: you must be able to
put a script first in the `<head>` and to edit the markup of the third parties themselves, because
that is where the blocking lives. Nothing else. The kit is not tied to a host, a framework or a
generator — it runs on a Ghost theme, on an Astro build and on a folder of static HTML, which is
what the three sites behind it are. The one optional feature that needs a server is the geographic
regime: an endpoint of your own answering `{"consentRequired": …}`, and reading the visitor's country
at the edge is one way of doing it rather than the way.

**What it is not for.** It has no TCF/IAB support, so an ad-tech setup that requires the consent
string will not be served by it. It has three fixed categories. And the list of tracker domains the
watchdog knows is indicative and ages — it catches an oversight, it does not certify anything.

**The name is a claim, so here is its one exception.** Nothing third-party leaves the browser before
the visitor answers — that is the whole of it, and you can check it yourself in the Network tab in
under a minute. The kit itself makes exactly one request, only if you switch it on: `regimeUrl`, the
endpoint that says whether prior consent is owed for this visitor. That endpoint is **yours**, on
your own server, and it is off by default. No third party is contacted for it, and nothing loads
while it is being asked.

> **What it is not.** This kit produces working code and **text templates**. It is not legal advice
> and it does not include the regulatory updates you pay for with a subscription to something like
> Iubenda. The texts in `texts/` must be read and validated by whoever answers for the data
> controller.

## The point: block, don't announce

Third-party resources are marked in the markup so the browser **cannot** load them:

```html
<!-- external script -->
<script type="text/plain" data-consent="analytics"
        data-src="https://www.googletagmanager.com/gtag/js?id=G-XXXX"></script>

<!-- inline script -->
<script type="text/plain" data-consent="analytics">
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('config', 'G-XXXX');
</script>

<!-- iframe (maps, video) -->
<iframe data-consent="marketing"
        data-consent-src="https://www.google.com/maps/embed?pb=..."
        data-consent-label="an embedded map"></iframe>
```

**There is a live demo**, and it is the point of the whole thing rather than a courtesy:
<https://marco-fabbri.github.io/nothing-before-consent/examples/demo.html>. Open it with the Network
tab showing and reload. Before you answer, no request goes to any of the third parties on the page.
That is a claim you can falsify in under a minute, which is the only kind worth making here.

`type="text/plain"` is not executable and `data-src` is not `src`: until consent exists no request
leaves, not even a DNS lookup. That is why the blocking must live in the markup: any mechanism that
steps in later arrives once the request has already gone.

In place of a blocked iframe a **placeholder** appears, saying what is missing and letting you
unblock it there, without going to look for the banner.

![A dark rounded box where a map should be, reading "Seeing an embedded map requires your consent to
external content.", with a Show button and a Manage consent button](examples/placeholder.png)

That box is the whole argument in one picture: the map is not hidden, it was never fetched. Google
does not know you are reading this page, and the visitor is told so and given the way back in the
same place rather than being sent to look for a banner.

## Installation

1. copy `src/consent.js` and `src/consent.css` into the site
2. put the CSS in the `<head>` and **`consent.js` as the first script**, before any third party:

```html
<link rel="stylesheet" href="/assets/consent.css">
<script>
  window.consentConfig = {
    policyVersion: 1,                     // raise it when the services change: asks again
    consentMode: true,                    // only if the site uses Google Analytics or Ads
    policyUrl: '/privacy-policy/'
  };
</script>
<script src="/assets/consent.js"></script>
```

3. mark the third parties as above
4. add a link in the footer that brings the choice back — **without an easy withdrawal the consent
   is not valid**, because taking it back must cost what giving it cost:

```html
<button type="button" onclick="window.consent.open()">Cookie preferences</button>
```

`consent.js` **must** come before GA4: the Consent Mode signals only count if they arrive first.

## Categories

| Category | What it holds | Consent |
|---|---|---|
| `necessary` | the site working, form anti-spam (e.g. Turnstile) | not required |
| `analytics` | analytics | required |
| `marketing` | maps, reviews, video, affiliation | required |

Turnstile is among the necessary ones because it protects a form from spam: it is the function the
user asked for, not profiling.

**Read the three descriptions the banner shows, and change them if they do not fit.** They are
written for a site with a contact form, analytics, and maps or reviews — the shape this came from —
and they name those things: the default `necessary` line says the category protects your forms from
spam. On a site with no form that is a claim about a protection you do not have, shown to a visitor,
about data. They are templates in the same sense the files in `texts/` are, with the difference that
these ship switched on. Override them one by one with the `texts` key:

```html
window.consentConfig = {
  texts: { necessaryDesc: 'Required for the site to work. These cannot be turned off.' }
};
```

## Configuration

| Key | Default | What it does |
|---|---|---|
| `policyVersion` | `1` | raising it asks for consent again instead of inheriting the old answer |
| `consentMode` | `false` | emits the Google signals with everything `denied` before anything loads |
| `policyUrl` | — | the link shown in the banner |
| `position` | `modal` | `modal`, `bottom`, `top`, `corner` |
| `storageKey` | `nothing-before-consent` | the name of the `localStorage` entry |
| `texts` | — | overrides individual strings |
| `watchdog` | `true` | warns in the console if a known tracker got through unmarked |
| `reloadAfterChoice` | `false` | reloads when something is switched on, for scripts that stay mute otherwise |
| `regimeUrl` | — | endpoint that says whether prior consent is owed for this visitor |
| `regimeTimeout` | `1500` | how long to wait for it before applying the strict regime |

### Position

| Value | How it looks | When it suits |
|---|---|---|
| `modal` | centred panel, page dimmed | when the choice must be the first thing you do |
| `bottom` | bar at the foot, page readable | the sensible default for most sites |
| `top` | bar at the top | if the foot of the page already has something (widgets, chat) |
| `corner` | box at bottom right, a bar below 40em | when the banner should draw little attention |

Only `modal` dims the page and holds the focus with Tab; the others leave it readable and navigable.
It is not a shortcut: **the blocking of third parties is technical and holds anyway**, so a less
intrusive bar concedes nothing extra. If anything, a panel that covers the content until you decide
looks like a wall, which is the thing to avoid.

In the non-modal variants `aria-modal` is **not** declared: saying it while the page stays navigable
would make someone using a screen reader believe they are trapped when they are not.

Language read from `<html lang>`: English and Italian, falling back to English. The project speaks
English; the banner speaks the visitor's language, which is why both dictionaries stay.

Colours through CSS variables, to be set in the site's own stylesheet:

```css
:root { --ck-primary: #29a9e0; --ck-primary-text: #fff; }
```

| Variable | Default | What it paints |
|---|---|---|
| `--ck-primary` / `--ck-primary-text` | `#2563eb` / `#fff` | the two equal-weight buttons |
| `--ck-surface` / `--ck-text` / `--ck-text-muted` | `#fff` / `#1f2937` / `#4b5563` | the panel and its type |
| `--ck-link` | `--ck-primary` | the policy link, which is text and not a button |
| `--ck-border` | `#e5e7eb` | the rules between the categories, inside the panel |
| `--ck-panel-border` | `#6b7280` | the panel's own outline, against the page |
| `--ck-control-border` | `#6b7280` | the outline of a control inside the panel |
| `--ck-backdrop` | `rgba(15,23,42,.55)` | the dimming, in the `modal` variant only |
| `--ck-radius` | `10px` | the corner |

**`--ck-panel-border` is the one to look at.** A banner sits on a page whose colour it does not know,
so the default is a neutral grey that holds against both a white page (4.8:1) and a near-black one
(3.7:1) — the 3:1 that WCAG 1.4.11 asks for the boundary of a user interface component. It is a
compromise by construction: on a site with a palette of its own, a neutral grey beside a warm ink
reads as an accident. Override it with something of the site's own that still clears 3:1.

**`--ck-link` starts as `--ck-primary` and is a separate variable for a reason worth knowing before
you set the palette.** `--ck-primary` is a *background*, with `--ck-primary-text` on top of it, so
it is legible whatever colour it is. The link is *text*, sitting straight on `--ck-surface`, and it
owes 4.5:1 against it. The two numbers are unrelated, and a colour can pass one and fail the other:
the `#29a9e0` in the example just above makes a fine button and a 2.7:1 link. If you set
`--ck-primary` to something light, set `--ck-link` to a darker shade of the same hue and the panel
still reads as yours. In dark mode `--ck-link` is the one variable the kit overrules — a brand
colour that cannot be read is not carrying the brand — and a site that wants its own there sets
`--ck-link` inside its own dark block.

Setting some of these and not others is not a mistake — the defaults are meant to work alone — but
a variable added by a later release will arrive at its default until the site maps it. That is what
a minor version is telling you to go and check.

## The geographic regime

Where prior consent is owed — the EU, the EEA and the UK — nothing loads until the visitor answers.
Everywhere else the law asks for information rather than permission, so a notice appears instead and
the services start.

Only the server knows where a request comes from, so the decision is its: `regimeUrl` points at an
endpoint that answers `{"consentRequired": true|false}`. Until it answers everything stays blocked,
and **any failure counts as "consent required"** — being wrong by showing a banner to someone who
did not need one is an annoyance, being wrong the other way is a violation.

Whoever gets the notice is recorded as `regime: "notice"`, never as a consent: calling "yes"
something nobody said would be a lie written into the reader's own browser.

## API

```js
window.consent.open()     // reopens the choice, with the detail already unfolded
window.consent.state()    // { version, when, analytics, marketing, regime } or null
window.consent.revoke()   // clears the choice and reloads
window.addEventListener('consent:changed', e => { /* e.detail */ });
```

The event is for whoever needs to do more than a `<script>`: starting a widget only after consent,
say, while keeping an existing deferred load.

## How a site finds out it is behind

**To know which version a site is running, open its `consent.js` and read the first line.** That is
the whole mechanism, and everything below is a way of automating that one act.

The kit is **not a dependency**, deliberately: every site keeps its own copy, with the version
written at the top of the file. A site can change hands, and a copied file owes this repository
nothing — the day it passes to somebody else there is no registry to update, no account to transfer
and no tie to unwind. A dependency would leave one behind even from a public repo. The price of that
choice is exactly this section: nobody is going to tell the site when a release comes out, so the
site has to be able to ask.

### What counts as released

**The newest `v*` tag, and nothing else.** The tag is the act that publishes: until it exists, a
change in `src/` is work in progress, and `main` may legitimately be ahead of every release.

```sh
git ls-remote --tags --refs --sort=-v:refname \
  https://github.com/marco-fabbri/nothing-before-consent | head -1
```

No token, no API, no rate limit, and git does the version ordering. `--refs` is not optional: the
tags are annotated objects, so without it every tag comes back twice, once as itself and once as
`^{}`.

**Read the tag, never `main`.** A check pointed at `raw.githubusercontent.com/…/main/src/consent.js`
reads the new version number the moment a release branch is merged — which is before the tag exists —
and tells the site it is behind a release that has not happened.

### Whether the copy was edited by hand

The version a copy declares is only worth something if the copy is otherwise untouched, because a
local edit is also what makes the declared number false:

```sh
curl -sf https://raw.githubusercontent.com/marco-fabbri/nothing-before-consent/v2.2.0/src/consent.js \
  | diff - path/to/your/consent.js
```

A `404` means the copy declares a version that was never released — edited by hand, taken from an
unreleased `main`, or renumbered afterwards. That is a cleaner answer than a diff nobody can compute.

If the two files differ, the edits belong somewhere else: colours in the `--ck-*` variables of the
site's own stylesheet, behaviour in `window.consentConfig`, wording in `texts`. An edited copy can no
longer be compared with its source, which is the only way to tell whether it is behind.

### What a check should do with the answer

- **patch or minor** — the two files, and nothing else. That is what makes an automatic check worth
  having.
- **major** — stop and read the release notes. A major is by definition a release where two files
  are not enough: the site's own configuration, markup and stylesheet have to move in the same
  commit. Compare the first component of the two version numbers and refuse to proceed when it
  differs; a pull request carrying only the files would break the site, and it would look exactly
  like every other one.

`window.consent.version` reports what is **live** on the page, which is not always what is merged in
the repository. Between a merge and a deploy they differ, and that gap is the site's own business.

### Being told instead of asking

`https://github.com/marco-fabbri/nothing-before-consent/releases.atom` is a feed of the releases: any
reader, or a scheduled job, turns "remember to check" into "be told". `releases/latest` in the API
exists too, but as a fallback rather than the source of truth — it orders by publication date and not
by version, it is empty until a release is published, and it is capped at 60 requests an hour per IP,
which shared CI runners reach.

**The kit does not check for you, and will not.** It has no idea who holds a copy: nothing links a
copied file back to here, which is the property that makes the copy free. The alternative — a registry
where each site declares itself — was built, used, and removed in 2.2.0: a site that forgets to
register receives nothing, in silence, which is the same failure it was meant to fix, moved one step
back. The check belongs on the side that knows what it is running.

## Do you need a consent database?

**No, not for a site of this kind** — and wanting one would be counterproductive.

Article 7 GDPR asks the controller to **be able to demonstrate** that consent was given. That is
where the idea of logging it on a server comes from. But for a site with no accounts, demonstrating
an anonymous visitor's consent would mean **identifying them**: storing an IP, a browser
fingerprint, or a unique identifier. You would end up collecting more personal data than you collect
without a log, in order to prove you collected little. The remedy worse than the disease.

What you demonstrate, and what suffices, is **the mechanism**:

1. **what that person chose**: it is in their browser, with the date and the policy version — the
   `{ version, when, analytics, marketing }` the kit stores. If they dispute it, that datum is on
   their device, where it belongs;
2. **what the banner was asking at that moment**: it is in git — **your** git, the repository of the
   site, not this one. The history of your copy of `consent.js`, of your texts and of your
   `policyVersion` records which categories existed, how they were described and since when. It is
   dated evidence that cannot be rewritten afterwards, which is exactly what is needed. This is the
   second reason the copy is committed to the site rather than fetched at build time: a file that
   arrives from elsewhere at deploy has no history where you need it;
3. **that nothing ran before the choice**: demonstrated by opening the site with the Network tab.

This is why `policyVersion` is not a detail: tying the choice to a number, and raising it when the
services change, is what stops anyone claiming that a consent given in 2026 for two services holds
in 2027 for five.

**When a log really is needed**: newsletters with double opt-in, account registration, marketing to
an identified person. There the consent concerns an individual you have already identified, and the
log makes sense because it adds no data you did not have. If a site of this kind adds a
newsletter, the subscription consent is a different thing from this banner and belongs where the
subscribers live.

## Verify, before saying it works

The test is not "the banner appears", it is **"nothing runs before consent"**:

1. private window, **Network** tab open, reload: no request towards the third parties
2. accept → the requests go; reload → they go without asking again
3. reject → nothing goes, and it stays that way after a reload
4. revoke from the footer → back to the initial state
5. **keyboard**: reach and press the buttons with Tab and Enter, without a mouse
6. with `consentMode`, in the console `dataLayer[0]` must be `consent default` with everything
   `denied`

Point 1 is the only one that tells this kit apart from a decorative banner.

## Licence

MIT — see [`LICENSE`](LICENSE). Use it, change it, ship it; keep the copyright notice.

The licence covers the code. It does not cover the two things this repository cannot give you: the
templates in `texts/` are a starting point to be read and validated by whoever answers for the data
controller, and nothing here is legal advice.
