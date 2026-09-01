# Release history

Every site keeps a copy of `consent.js` with the version written in the comment at its top. To find
out whether a site is behind, open that file and compare it with this list.

## 2.3.0 — 1 September 2026

A minor, because every item is a new key, a new file or a behaviour a site may want to look at. None
of them changes what a site has to do to install the kit: the two files, and nothing else.

**A choice now has an age.** `maxAgeDays`, default 365: a stored choice older than that is asked
again. The README has argued since 1.2.0 that tying consent to a version is what stops a "yes"
given in 2026 for two services from holding in 2027 for five — and nothing enforced the 2027 half of
that sentence. A human raising `policyVersion` was the only renewal path, and a human is the part
that forgets. The Italian Garante's guidelines put the floor at six months, CNIL's ceiling is
thirteen; a year is inside both. `maxAgeDays: 0` switches it off, for a site that has a reason.

**A notice is re-asked after a day.** A visitor outside the consent regime is recorded as `notice`
with everything on, and that record used to hold for ever: the same person, back in a country where
consent is owed, had everything running with no banner and no consent. The file's own reasoning —
being wrong that way is a violation — was written two functions above the code that ignored it. A
notice older than a day is now asked of the site's endpoint again on the next visit; if the answer
has changed, the record is dropped and the banner asks. One request a day, to your own server, and
only for these visitors: the name still holds.

**`tools/check-copy.sh` — the major-version refusal is a mechanism again.** 2.2.0 removed the
announcing script, and with it the one piece of code that compared major versions and refused to
proceed. The README kept the instruction; nothing executed it. This script reads the header of a
copy, fetches the newest tag with `git ls-remote`, compares the copy byte for byte with the release
it claims, and answers with an exit code: `0` current, `1` behind by a patch or a minor, `2` behind
by a major — where it refuses to say "copy the files", because that is the answer that would break
the site — `3` not the file it claims to be, `4` could not check. No token, no API, no account,
which is what going public bought. The three sites that hold copies can run it as they are.

**Loaded twice, the second copy stops.** A theme that carries the snippet in both a head partial and
a page template gave two panels, two focus traps fighting over Tab, and one `window.consent`
overwriting the other. The second copy now says so in the console and does nothing.

**Focus goes to the panel, not to "Accept all".** The first button in the markup was the one that
took the focus when the panel opened, so Enter accepted. A default handed to one of two answers, on
a panel whose whole design is that the two weigh the same. The panel itself takes the focus now
(with `tabindex="-1"`, which is what the ARIA authoring practices ask for a dialog), a screen reader
reads the title and the text before any control, and Tab reaches the buttons in order. The trap
knows that the panel is not in its list: from there Tab goes to the first control and Shift+Tab to
the last, instead of leaving.

**Under a nonce-based Content Security Policy, activated scripts keep their nonce.** The browser
empties the `nonce` attribute after parsing, on purpose, so the attribute loop never saw it and every
activated script was blocked. The property still carries it, and it is copied. The README's
installation section now says what a policy has to allow, including the case it cannot fix: an inline
marked script becomes an inline script at activation, and a hash for it will not match.

**Four lines of CSS against the host theme**, in the spirit of the `box-sizing` line from 2.1.0:

- `.ck-box [hidden] { display: none !important }`. The detail and the save button fold away with
  the `hidden` attribute, and the browser's own rule for it loses to *any* author rule that sets
  `display` on a div or a button. A theme with one showed the whole panel unfolded from the first
  paint.
- the policy link is underlined. A theme that strips underlines (Casper does) left it told apart by
  colour alone, which WCAG 1.4.1 says is not telling it apart.
- the checkboxes declare `appearance: auto` and `accent-color: var(--ck-primary)`: a theme that
  removes the native checkbox to draw its own drew nothing for these two.
- `max-height` in `dvh`, with the `vh` line kept as the fallback: on a phone the panel with the
  detail unfolded could run under the browser's bars.

**The dark block is documented.** It has existed since 1.0.0 and swapped five variables on a dark
system; the palette table never said so, and a light-only site overriding just `--ck-surface` got
its own white under the kit's near-white text. The README now says which variables move and what
to do about it.

Considered, and not done, so that nobody proposes them twice:

- **Escape closing the panel.** It still does nothing, deliberately (`consent.js` says why at the
  focus trap). Closing without saving would be safe — everything stays blocked and the banner
  returns — but a panel that vanishes on a keypress teaches that the panel can be made to vanish,
  which is not the lesson.
- **A guardian for a missing withdrawal link**, to match the one for unmarked trackers. It is not
  detectable without lying: a footer button wired with `addEventListener` leaves nothing in the
  markup to find, and a check that cannot see it would report a defect the site does not have.

## 2.2.1 — 1 September 2026

A release made by reading what the last one claimed and checking each claim against the tree, the
demo and the copies in the wild. Nothing in it is new. Everything in it is something 2.2.0 said that
was not true, or did not say and should have.

**Three claims of the project's own were false in the way the project exists to prevent.**

- **"Read the first line" was off by one.** Line 1 of `consent.js` is `/*!`; the version is on
  line 2, and has been in every release. The README, this file, CONTRIBUTING and the labels in
  `tools/check-version.sh` all said line 1 — the script reads three lines and was right; only what
  it said about itself was wrong. A check written to the letter of that instruction finds nothing
  and, by the README's own argument, concludes the file is unreadable rather than old. The
  instruction now says "the header", and the README gives the one-line `grep` that does not care
  which line.
- **The cookie policy templates told the visitor that nothing runs before the choice.** Since 2.2.0
  `necessary` runs before the banner is answered, which is correct and was announced — and the
  sentence in `texts/cookie-policy.*` saying that "none of the services listed below are loaded"
  was left as it was, under a header stamped 2.2.0 in the same commit, with the category it
  contradicted in the list beneath it. Reworded in both languages. And the services table no
  longer pre-fills "only after consent" in the one column the README calls load-bearing: `{{WHEN}}`
  is a blank to fill, with the two values it may take written beside it.
- **The watchdog stopped watching after the first answer.** Its exemption for resources that
  started after the kit activated something was unconditional. For a returning visitor the observer
  activates the first marked script during parsing, a few milliseconds in, so every unmarked tracker
  further down the page counted as a consequence of consent and was never reported. Accept once on
  your own site and the check went quiet for good; reproducible on the demo. The exemption now holds
  only where something was consented to. With no answer, or a refusal, nothing the kit activated can
  legitimately call a tracker, so everything the page contacted is examined — which is the state in
  which a leak is a violation, and the state the check exists for.

**Five smaller ones in the runtime, each a case nobody had hit:**

- `reloadAfterChoice` on a browser that refuses `localStorage` reloaded on a choice that had not
  been stored, found none, and put the banner back: every click a page load that changed nothing.
  `save()` now says whether it worked, and the reload waits for a yes.
- the carry-over of the old `consent-kit` key ran inside the read, so a write that failed threw
  away a choice that had been read correctly and asked again. It has its own `try`.
- the parse-time observer started only when `analytics` or `marketing` was on, so a `necessary`
  widget that draws itself got the treatment 2.2.0 describes only for a visitor who had accepted
  the rest. It starts on every initial pass.
- saving from the panel opened through a placeholder's "Manage consent" returned the focus to that
  placeholder, which the save had just removed, and the visitor landed on `<body>`. The focus now
  goes to what the placeholder stood for — the iframe, or the container — so the keyboard resumes
  from where the visitor was.
- outside the consent regime the informative notice appeared even on a page with nothing marked.
  The banner has had that guard since 1.2.0; the notice did not.

**The demo.** The map's embed string was one Google rejects, so accepting produced an error box in
the very place the argument's own picture belongs. The reviews widget was the one the three original
sites happen to use, a reference that explains nothing to anybody else: replaced by an embedded video
on `youtube-nocookie.com`, and by a self-drawing widget marked with `data-consent-placeholder` and
`data-consent-activates` — two attributes that have existed since 1.2.0 and had appeared in no README
until now.

**Documentation that described the previous release.** `state()` was documented without `necessary`
and `regime`, the two fields 2.2.0 added and spent a paragraph on. `window.consent.version` was used
in the README and missing from its API block. The `storageKey` row now says that storage is per
origin. The "template still saying 2.0.0" illustration described a state no file was in. The 2.0.0
rename table listed two files that did not exist before 2.0.0, and 2.1.0 was dated a day early.

The paragraph that follows was added to the 2.2.0 entry three commits after `v2.2.0` was tagged —
a record edited after the act it records. It moves here, under the tag it will actually ship with.

**The text templates are now mentioned as something you can use.** `texts/` has shipped a privacy
notice and a cookie policy, in English and Italian, since 1.0.0 — and the README named the folder
only three times, every time as a warning that they are not legal advice. It never said they exist.
Meanwhile step 2 of the installation has you write a `policyUrl` pointing at a page you are left to
write yourself, with no hint that a draft is in the box. Nothing about the files changed; they are
findable now.

Also: `tools/check-version.sh --tag` with no value reported an unbound variable instead of saying
what it needed; the workflow declares `permissions: contents: read`; `.gitignore` no longer mentions
a `node_modules/` this repository refuses to have.

## 2.2.0 — 1 September 2026

**First public release, and the project is now called `nothing-before-consent`.** It was
`consent-kit`, in a private repository. The name is the claim the kit makes, and a claim you can
falsify in a browser's Network tab in under a minute is worth more on the front of a repository than
a description of a category.

**The announcing mechanism is gone**: `consumers.csv`, `tools/announce.sh` and `announce.yml`, along
with the design essay that argued for them. A registered site used to receive a pull request when a
release was tagged. **Nothing arrives now, and nothing will say so** — which is exactly the shape of
failure this project keeps writing about, so it is written here in full rather than left to be
discovered. Any site holding a copy has to check for itself from now on, and the README has a section
that says what to check and what the answers mean.

The essay listed "making the repository public" among the alternatives it rejected, on the grounds
that it bought nothing. That was true while the token could reach three known repositories and the
kit could keep the pen. It stops being true the moment the reader might be anybody: a public tree can
be read without a credential, so the version check and the byte-for-byte hand-edit check that used to
need a token now need nothing at all, and they work for a stranger exactly as well as for the author.
The essay stays where it was, at `v2.1.0`, correct about the world it was written in.

**The version check now runs.** It used to live inside the announcing workflow, behind a condition
that required a credential — so in six releases it never once executed, and the coherence of those
six tags was maintained by hand without anybody knowing that was what was happening. It is now
`tools/check-version.sh`, on every push and every pull request. A wrong number used to mean a false
announcement to three known sites; it would now mean a wrong answer to everyone who ever asks.

Fixed, and each of these was in the code while the documentation said otherwise:

- **the focus trap in the `modal` variant never fired.** It collected the panel's controls without
  filtering them, so the first was the `necessary` checkbox — disabled and hidden — and the last was
  the save button, hidden until the detail is unfolded. Neither can hold the focus, so neither branch
  ever ran and Tab left the panel freely, which is what the README said it did not do. With
  `policyUrl` set it was worse than absent: Shift+Tab from the link suppressed the browser's own
  behaviour and then focused something hidden, dropping the visitor on `<body>`.
- **the `necessary` category barely worked at all.** Resources are activated by looking their
  category up by name in the choice object, and `necessary` was absent from every one of those
  objects except the single in-memory one built at the instant a button is clicked. So a script
  marked `data-consent="necessary"` ran on the visit where the visitor answered and **never again**;
  it did not run before the answer either, nor for a visitor in a country where a notice is shown
  instead of a request. A missing field reads as a refusal, and this is a category that cannot be
  refused — which is the whole of what the word means.

  It is now present on all four paths, and two consequences are worth stating rather than leaving to
  be noticed. A choice stored by an earlier version is completed on the next page load, so nobody is
  asked again. And **a `necessary` resource now runs before the banner is answered**, which is a
  change in behaviour and the correct one: the category holds things the visitor asked for by using
  the site, the README's own example is a form's anti-spam, and withholding that until a dialog is
  read leaves the form unprotected for exactly as long as somebody takes to read it. Nothing in the
  other two categories moved: they still wait, and the demo has a `necessary` resource on it now so
  that this is visible rather than asserted.
- **two contrasts under the threshold this project invokes for others.** The policy link was 3.43:1
  against the dark surface, where text owes 4.5:1, and the outline of the tertiary buttons was 1.24:1
  in light and 1.72:1 in dark, against the 3:1 WCAG 1.4.11 asks of a user interface component — the
  same criterion cited in 2.1.0 for the panel's own outline, applied to the panel and not to the
  things inside it.
- **a comment described an Escape key that no code handled.** Removed. Escape still does nothing, on
  purpose: dismissing the panel with a key would be a choice nobody made.

**Two new variables, so a site with a palette should read this.** `--ck-link` paints the policy link
and starts as `--ck-primary`; `--ck-control-border` outlines a control inside the panel. They are
separate from `--ck-primary` and `--ck-border` because they are measured differently: a button colour
carries its own text and is legible whatever it is, while a link is text on the surface and owes
4.5:1 against it — lightening `--ck-primary` enough to fix the link would have taken the buttons' own
white text to 2.5:1. A site that does not map them gets the defaults, which hold in both themes. In
dark mode `--ck-link` is the one variable the kit overrules on a site's behalf.

**`--ck-` and `.ck-` stay as they are**, and no longer abbreviate the name. Renaming them is the only
part of a rename that would break anything, because those variables are the ones a site sets in its
*own* stylesheet — an abbreviation that has come loose from its word is a much smaller price than a
compatibility layer, which 2.0.0 refused on principle and which would be harder to refuse now that
the sites are not all in the same hands.

**The `localStorage` key follows the name, and nobody loses a choice.** It is now
`nothing-before-consent`; the old key is read once, carried over and removed. No banner comes back in
front of somebody who had already answered — including somebody who had said no, which is the case
that matters. `policyVersion` is untouched. The migration goes away in the next major.

## 2.1.0 — 2 August 2026

- **the panel has an outline.** Until now it was the same colour as the page it sat on — 1.00:1
  against a white page, 1.11:1 against a dark one — with a shadow as its only separator, and a
  shadow is black on black in the dark and too soft to read on a phone in the light. The new
  `--ck-panel-border` defaults to a grey that clears 3:1 against both a white and a near-black page,
  the threshold WCAG 1.4.11 asks for the boundary of a user interface component. **No palette
  variable changed**, so no site has to touch its stylesheet to be correct — but `--ck-panel-border`
  is a new one, and a site that does not map it gets that neutral grey. Which is why this is a minor
  and not a patch: the number is what tells a site with a palette of its own to go and look.
- **below 40em the banner runs edge to edge**, square corners, with the outline only on the side
  facing the page. A floating card with faint edges reads as a block of text inside the article; a
  bar that touches both sides reads as chrome, which is what it is.
- **`env(safe-area-inset-bottom)`** on the bottom variant: on an iPhone the buttons were ending up
  under Safari's floating toolbar.
- `box-sizing: border-box` on the panel — the outline must not add to its width, and the host page
  cannot be assumed to set it.

Found on a phone, in dark mode, on marcofabbri.com: the banner was there, worked, and simply could
not be told apart from the article behind it. Nothing was broken, which is why it had survived four
releases.

## 2.0.0 — 1 August 2026

**The kit is in English.** Code, comments, documentation, file and folder names, the configuration
keys, the data attributes, the CSS classes and variables. What does *not* change language is what
the banner says to a visitor: `T.it` and `T.en` both stay, and so do the Italian templates in
`texts/`. That is content, not an artefact — an Italian site needs an Italian banner.

Half in one language and half in the other is worse than either, and a README in English documenting
`versionePolicy` is exactly that. The cost was never going to be lower than now: the kit is a day
old and has three consumers.

**This release breaks every existing installation.** Copying the two files is not enough — the
site's own configuration, markup and stylesheet have to move with them, in the same commit. The
renames:

| before | now |
|---|---|
| `window.consensoConfig` | `window.consentConfig` |
| `window.consenso.apri() / .stato() / .revoca()` | `window.consent.open() / .state() / .revoke()` |
| `versionePolicy`, `chiave`, `testi`, `urlInformativa` | `policyVersion`, `storageKey`, `texts`, `policyUrl` |
| `posizione: modale / basso / alto / angolo` | `position: modal / bottom / top / corner` |
| `guardiano`, `ricaricaDopoScelta` | `watchdog`, `reloadAfterChoice` |
| `data-consent="statistiche"` | `data-consent="analytics"` |
| `data-consent-etichetta`, `data-consent-segnaposto`, `data-consent-attiva` | `data-consent-label`, `data-consent-placeholder`, `data-consent-activates` |
| `--ck-primario`, `--ck-superficie`, `--ck-testo`, `--ck-testo-tenue`, `--ck-bordo`, `--ck-fondo`, `--ck-raggio` | `--ck-primary`, `--ck-surface`, `--ck-text`, `--ck-text-muted`, `--ck-border`, `--ck-backdrop`, `--ck-radius` |
| `.ck-fondo`, `.ck-segnaposto`, `.ck-categoria`, `.ck-azioni`, `.ck-dettaglio`, `.ck-btn-primario`, `.ck-btn-terziario` | `.ck-backdrop`, `.ck-placeholder`, `.ck-category`, `.ck-actions`, `.ck-details`, `.ck-btn-primary`, `.ck-btn-tertiary` |
| event `consenso:cambiato` | event `consent:changed` |
| the endpoint's `{"consensoRichiesto": …}` | `{"consentRequired": …}` |
| `testi/`, `esempi/` | `texts/`, `examples/` |
| `testi/informativa-privacy.*.md`, `esempi/prova.html` | `texts/privacy-notice.*.md`, `examples/demo.html` |

**No compatibility layer, deliberately.** The kit could have accepted both spellings for a while,
and it does not: three sites, all in the same hands, all with a PR flow — a permanent piece of
complexity to avoid one coordinated change is a bad trade in a kit whose virtue is being small.

**Stored choices are not migrated.** The `localStorage` key goes from `consenso-kit` to
`consent-kit`, so everyone who had already chosen is asked once more. The choices in circulation are
a day old, being asked again is never a violation, and the alternative was a few lines of transition
code that nobody would have remembered to remove.

Also here:

- **the announcing mechanism**: `consumers.csv`, version tags, `tools/announce.sh` and
  `announce.yml`. Publishing a tag opened a PR on every registered site, carrying the entries that
  separated it from the new release, and saying out loud if that copy had been edited by hand.
  Removed in 2.2.0; the design and reasoning are still readable where they were true, at
  [`docs/announcing-releases.md` as of `v2.1.0`](https://github.com/marco-fabbri/nothing-before-consent/blob/v2.1.0/docs/announcing-releases.md).
- the language fallback moves from Italian to English, to match the language the kit is documented
  in. A page with no `lang` is a defect of that page — screen readers need it too — so this default
  should stay unreached.
- the unused `CATEGORIE` constant is gone.

## 1.2.1 — 1 August 2026

- **sizes in px instead of rem**: rem is measured against the host site's font, and themes of the
  Casper/Ghost family set `html { font-size: 62.5% }` so they can write `1.5rem` instead of `15px`.
  On those sites every rem was 10px and the panel shrank by 37.5% — 520px wide instead of 832, with
  15px of padding instead of 24. A banner must be the same size everywhere: it is not the site's
  content, it is an interface resting on top of it.

  **For sites already updated nothing changes**: where the root is the canonical 16px, the values in
  px are exactly the ones the browser was computing before. On such a site the two files can be
  copied over expecting no visual difference at all.

  The media queries stay in `em` on purpose: there the unit is measured against the browser's
  default font and not the site's root, so they were already immune, and in addition they follow
  anyone who has enlarged their type in the settings.

  Found while installing the kit on marcofabbri.com, which is a Casper: the banner worked perfectly,
  it was only smaller than it should have been — the kind of defect that breaks nothing and for that
  reason stays for years.

## 1.2.0 — 1 August 2026

- **the banner keeps quiet when there is nothing to govern**: nothing marked and Consent Mode off
  means no consent request. It is what lets the kit stay installed on a site with no third parties
  today: the day one is added and marked, the request appears by itself.
- **watchdog**: once the page has loaded it checks what was actually contacted and warns in the
  console if a known tracking domain got through unmarked. It does not block — it could not, since a
  request written into the markup leaves before any script — but it turns a silent oversight into a
  noisy one. Switched off with `watchdog: false`.
- **geographic regime**: `regimeUrl` asks the server who is owed prior consent (the EU, the EEA, the
  UK) and who is not. Until it answers everything stays blocked, and any failure counts as "consent
  required". Whoever gets the notice is recorded as `regime: "notice"`, never as a consent.
- **placeholder with two ways out**: "Show" loads only that element and only for that visit, without
  recording anything; "Manage consent" opens the panel. It works for widgets that draw themselves
  too, by marking the container with `data-consent-placeholder`.
- **`reloadAfterChoice`**: for scripts that look for their own containers while the page is being
  built and stay mute if activated afterwards. Only when something is switched on, never on a
  refusal.

### A note worth more than the lines above

The watchdog comes out of a day spent chasing silent failures: counters stopped, 404s frozen for a
week, a reviews widget dead for hours. None of them said anything, and we only found them by going
to look. A console warning repairs nothing, but it is the difference between noticing now and
noticing in six months.

## 1.1.0 — 1 August 2026

- **configurable position**: `modal` (as before), `bottom`, `top`, `corner`. Only the modal variant
  dims the page and holds the focus; the others leave it readable and navigable, which is legitimate
  because the blocking of third parties is technical and holds anyway.
- in the non-modal variants `aria-modal` is no longer declared: asserting it while the page stays
  navigable deceives anyone using a screen reader.
- the focus is not moved when a non-modal banner opens by itself — that would interrupt the reading
  — but it is moved when the user opens the preferences from the footer.
- README: a section on why a consent database is **not** needed for sites without accounts.

## 1.0.0 — 1 August 2026

First usable version.

- **prior blocking** of scripts (external and inline) and iframes: `type="text/plain"` + `data-src`,
  so the browser cannot load anything before the choice
- **three categories**: necessary (always on), analytics, marketing
- **placeholder** in place of blocked iframes, with a button to unblock them on the spot
- **Consent Mode v2**, optional, emitted with everything on `denied` before GA4 exists
- the choice in `localStorage`, tied to a **policy version**: changing the services asks for consent
  again instead of inheriting it
- **withdrawal** via `window.consenso.apri()` and `window.consenso.revoca()` (the names of the time;
  see the rename table under 2.0.0)
- accessibility: `role="dialog"`, `aria-modal`, focus moved and held, cycling with Tab
- English and Italian, read from `<html lang>`
- "Accept" and "Reject" with the same visual weight

### A development note

The first draft touched the nodes immediately, and that is wrong: `consent.js` lives in the `<head>`
— it must, to emit the Consent Mode signals before GA4 — so when it runs the `<body>` does not exist
yet. The result was that with consent already given **nothing was activated** and the placeholders
never appeared. Now Consent Mode is emitted at once and the nodes are touched once the document is
ready.

It only came out by trying the example page in a real browser: the syntax was correct and there were
no console errors. Worth remembering whenever something is added.
