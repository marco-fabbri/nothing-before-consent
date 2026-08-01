# Release history

Every site keeps a copy of `consent.js` with the version written on its first line. To find out
whether a site is behind, open that file and compare it with this list.

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
| `consumatori.csv`, `strumenti/`, `testi/`, `esempi/` | `consumers.csv`, `tools/`, `texts/`, `examples/` |

**No compatibility layer, deliberately.** The kit could have accepted both spellings for a while,
and it does not: three sites, all in the same hands, all with a PR flow — a permanent piece of
complexity to avoid one coordinated change is a bad trade in a kit whose virtue is being small.

**Stored choices are not migrated.** The `localStorage` key goes from `consenso-kit` to
`consent-kit`, so everyone who had already chosen is asked once more. The choices in circulation are
a day old, being asked again is never a violation, and the alternative was a few lines of transition
code that nobody would have remembered to remove.

Also here:

- **the announcing mechanism**: `consumers.csv`, version tags, `tools/announce.sh` and
  `announce.yml`. Publishing a tag opens a PR on every registered site, carrying the entries that
  separate it from the new release, and saying out loud if that copy had been edited by hand.
  Design and reasoning in `docs/announcing-releases.md`.
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
  px are exactly the ones the browser was computing before. Whoever adopted the kit on
  andreamuccioli and staybycity can copy the two files expecting no visual difference.

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
