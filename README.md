# consent-kit

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
        data-consent-label="the studio's map"></iframe>
```

`type="text/plain"` is not executable and `data-src` is not `src`: until consent exists no request
leaves, not even a DNS lookup. That is why the blocking must live in the markup: any mechanism that
steps in later arrives once the request has already gone.

In place of a blocked iframe a **placeholder** appears, saying what is missing and letting you
unblock it there, without going to look for the banner.

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

5. **register the site in `consumers.csv`** — one line with site, repo, the folder holding the two
   files, and branch. It is the step that makes every future release arrive at that site as a PR: an
   unregistered site receives nothing, and in silence. No mechanism here can notice a copy that
   never declared it exists.

`consent.js` **must** come before GA4: the Consent Mode signals only count if they arrive first.

## Categories

| Category | What it holds | Consent |
|---|---|---|
| `necessary` | the site working, form anti-spam (e.g. Turnstile) | not required |
| `analytics` | analytics | required |
| `marketing` | maps, reviews, video, affiliation | required |

Turnstile is among the necessary ones because it protects a form from spam: it is the function the
user asked for, not profiling.

## Configuration

| Key | Default | What it does |
|---|---|---|
| `policyVersion` | `1` | raising it asks for consent again instead of inheriting the old answer |
| `consentMode` | `false` | emits the Google signals with everything `denied` before anything loads |
| `policyUrl` | — | the link shown in the banner |
| `position` | `modal` | `modal`, `bottom`, `top`, `corner` |
| `storageKey` | `consent-kit` | the name of the `localStorage` entry |
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
| `--ck-border` | `#e5e7eb` | the rules between the categories, inside the panel |
| `--ck-panel-border` | `#6b7280` | the panel's own outline, against the page |
| `--ck-backdrop` | `rgba(15,23,42,.55)` | the dimming, in the `modal` variant only |
| `--ck-radius` | `10px` | the corner |

**`--ck-panel-border` is the one to look at.** A banner sits on a page whose colour it does not know,
so the default is a neutral grey that holds against both a white page (4.8:1) and a near-black one
(3.7:1) — the 3:1 that WCAG 1.4.11 asks for the boundary of a user interface component. It is a
compromise by construction: on a site with a palette of its own, a neutral grey beside a warm ink
reads as an accident. Override it with something of the site's own that still clears 3:1.

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

## How a site is updated

The kit is **not a dependency**: every site keeps a copy, with the version written at the top of the
file. That is because a site can change hands — if it depended on this private repo, the day it
passes to somebody else a silent tie would remain.

**When a release comes out there is nothing to remember.** You publish a `v<version>` tag and
`announce.yml` opens a PR on every site in `consumers.csv`, carrying the `CHANGELOG.md` entries
between that site's version and the new one. The merge stays a decision of whoever answers for the
site. The design and the reasoning are in
[`docs/announcing-releases.md`](docs/announcing-releases.md).

By hand remains possible and is sometimes right: copy the two files and open the PR yourself. To
find out whether a site is behind, open its `consent.js` and read the first line.

## Do you need a consent database?

**No, not for these sites** — and wanting one would be counterproductive.

Article 7 GDPR asks the controller to **be able to demonstrate** that consent was given. That is
where the idea of logging it on a server comes from. But for a site with no accounts, demonstrating
an anonymous visitor's consent would mean **identifying them**: storing an IP, a browser
fingerprint, or a unique identifier. You would end up collecting more personal data than you collect
without a log, in order to prove you collected little. The remedy worse than the disease.

What you demonstrate, and what suffices, is **the mechanism**:

1. **what that person chose**: it is in their browser, with the date and the policy version — the
   `{ version, when, analytics, marketing }` the kit stores. If they dispute it, that datum is on
   their device, where it belongs;
2. **what the banner was asking at that moment**: it is in git. The history of `consent.js`, of the
   texts and of `policyVersion` records which categories existed, how they were described and since
   when. It is dated evidence that cannot be rewritten afterwards, which is exactly what is needed;
3. **that nothing ran before the choice**: demonstrated by opening the site with the Network tab.

This is why `policyVersion` is not a detail: tying the choice to a number, and raising it when the
services change, is what stops anyone claiming that a consent given in 2026 for two services holds
in 2027 for five.

**When a log really is needed**: newsletters with double opt-in, account registration, marketing to
an identified person. There the consent concerns an individual you have already identified, and the
log makes sense because it adds no data you did not have. If one of these sites ever adds a
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
