/*!
 * consent-kit 2.0.1 — consent banner with prior blocking.
 * Versioned copy: if this number is lower than the one in the kit's CHANGELOG, the site is behind.
 *
 * The point of this file is not to show a banner: it is to stop third parties from running before
 * the choice is made. A banner that blocks nothing is the most contested arrangement of all,
 * because it declares a consent that was never given.
 *
 * How resources are marked for blocking:
 *
 *   <script type="text/plain" data-consent="analytics" data-src="https://..."></script>
 *   <script type="text/plain" data-consent="analytics">inline code</script>
 *   <iframe data-consent="marketing" data-consent-src="https://..." data-consent-label="the map"></iframe>
 *
 * `type="text/plain"` is not executable and `data-src` is not `src`: until consent exists no
 * request leaves, not even a DNS lookup. That is why the blocking belongs in the markup and not at
 * runtime: whatever is done afterwards arrives once the request has already gone.
 */
(function () {
  'use strict';

  var KIT_VERSION = '2.0.1';
  var cfg = window.consentConfig || {};

  // The policy version lives inside the stored choice: when the services change you raise it and
  // consent is asked again, instead of inheriting a "yes" given for other recipients.
  var POLICY_VERSION = cfg.policyVersion || 1;
  var STORAGE_KEY = cfg.storageKey || 'consent-kit';

  // localStorage rather than a cookie: so the banner does not introduce the very thing it governs.
  // It is sent to nobody and appears in no cookie policy.
  function read() {
    try {
      var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!stored || stored.version !== POLICY_VERSION) return null;
      return stored;
    } catch (e) {
      return null; // localStorage denied (Safari private, or a hardened browser): ask again.
    }
  }

  function save(choice) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: POLICY_VERSION,
        when: new Date().toISOString(),
        analytics: !!choice.analytics,
        marketing: !!choice.marketing,
        regime: choice.regime || 'consent'
      }));
    } catch (e) {
      /* If it cannot be stored, the choice holds for this page and will be asked again: better to
         ask twice than to assume a consent that was never recorded. */
    }
  }

  /* ---------------------------------------------------------------- Google Consent Mode
   * Must be emitted BEFORE GA4 is loaded, or it is worth nothing: which is why consent.js has to
   * come first in the <head>. Everything on "denied" by default means no cookie before the choice;
   * on acceptance it turns to "granted".
   */
  function consentMode(state) {
    if (!cfg.consentMode) return;
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    gtag('consent', state.initial ? 'default' : 'update', {
      ad_storage: state.marketing ? 'granted' : 'denied',
      ad_user_data: state.marketing ? 'granted' : 'denied',
      ad_personalization: state.marketing ? 'granted' : 'denied',
      analytics_storage: state.analytics ? 'granted' : 'denied'
    });
  }

  /* ---------------------------------------------------------------- activating the resources */

  // What the kit activated itself, and when. The watchdog needs this so it does not report its own
  // work: a script activated after consent calls others (GA4 calls google-analytics.com), and those
  // are not in the list. Comparing addresses is not enough — the moment is what counts.
  var activatedByKit = [];
  var activationTime = Infinity;

  function activateScript(node) {
    var s = document.createElement('script');
    for (var i = 0; i < node.attributes.length; i++) {
      var a = node.attributes[i];
      if (a.name === 'type' || a.name === 'data-src' || a.name.indexOf('data-consent') === 0) continue;
      s.setAttribute(a.name, a.value);
    }
    var src = node.getAttribute('data-src');
    if (activationTime === Infinity) activationTime = performance.now();
    if (src) { s.src = src; activatedByKit.push(src); } else { s.text = node.textContent; }
    node.parentNode.replaceChild(s, node);
  }

  function activateIframe(node) {
    if (activationTime === Infinity) activationTime = performance.now();
    activatedByKit.push(node.getAttribute('data-consent-src') || '');
    var placeholder = node.previousElementSibling;
    if (placeholder && placeholder.classList.contains('ck-placeholder')) placeholder.remove();
    node.src = node.getAttribute('data-consent-src');
    node.removeAttribute('data-consent-src');
    node.style.display = '';
  }

  // A blocked iframe would leave a mute hole in the page. The placeholder says what is missing and
  // offers two different ways out, which is the point:
  //
  //   "Show" loads ONLY that element, ONLY for this visit, without touching the preferences.
  //   Pressing it is an explicit request for that content — someone who refused everything can
  //   still see where a studio is without having to change their mind about the rest of the site.
  //
  //   "Manage consent" opens the panel, for whoever would rather decide once and for all.
  function buildPlaceholder(label, show) {
    var box = document.createElement('div');
    box.className = 'ck-placeholder';
    box.innerHTML = '<p>' + t('blocked').replace('%s', escapeHtml(label || t('thisContent'))) + '</p>';
    var actions = document.createElement('div');
    actions.className = 'ck-actions';
    // no save(): this is not a recorded consent, it is permission for this element and for now
    actions.appendChild(button(t('showNow'), 'ck-btn-primary', show));
    actions.appendChild(button(t('manageConsent'), 'ck-btn-tertiary', function () { open(true); }));
    box.appendChild(actions);
    return box;
  }

  function placeholderFor(node) {
    if (node.previousElementSibling && node.previousElementSibling.classList.contains('ck-placeholder')) return;
    var ph = buildPlaceholder(node.getAttribute('data-consent-label'), function () {
      activateIframe(node);
    });
    node.style.display = 'none';
    node.parentNode.insertBefore(ph, node);
  }

  // consent.js lives in the <head> — it must, to emit the Consent Mode signals before GA4 — so when
  // it runs the <body> does not exist yet. Touching the nodes straight away would find nothing: the
  // scripts would stay inert even with consent already given. Consent Mode is emitted immediately,
  // the nodes are touched once the document is ready.
  function whenReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // A widget that draws itself (reviews, feeds) has no element to replace: there is an empty
  // container and a script that fills it. The placeholder goes on the container, and "Show"
  // activates the scripts that feed it, listed by id in data-consent-activates.
  function placeholderForContainer(box) {
    if (box.querySelector(':scope > .ck-placeholder')) return;
    var ids = (box.getAttribute('data-consent-activates') || '').split(/\s+/).filter(Boolean);
    var ph = buildPlaceholder(box.getAttribute('data-consent-label'), function () {
      for (var i = 0; i < ids.length; i++) {
        var s = document.getElementById(ids[i]);
        if (s && s.type === 'text/plain') activateScript(s);
      }
      ph.remove();
    });
    box.appendChild(ph);
  }

  function applyToNodes(choice) {
    // Containers before scripts: if the script runs while the placeholder is still there, the
    // widget draws itself on top of a box that says "blocked".
    var containers = document.querySelectorAll('[data-consent-placeholder]');
    for (var k = 0; k < containers.length; k++) {
      var ph = containers[k].querySelector(':scope > .ck-placeholder');
      if (choice[containers[k].getAttribute('data-consent')]) { if (ph) ph.remove(); }
      else placeholderForContainer(containers[k]);
    }

    var scripts = document.querySelectorAll('script[type="text/plain"][data-consent]');
    for (var i = 0; i < scripts.length; i++) {
      if (choice[scripts[i].getAttribute('data-consent')]) activateScript(scripts[i]);
    }

    var frames = document.querySelectorAll('iframe[data-consent-src]');
    for (var j = 0; j < frames.length; j++) {
      if (choice[frames[j].getAttribute('data-consent')]) activateIframe(frames[j]);
      else placeholderFor(frames[j]);
    }

    // Anyone who wants to react (starting a widget only after consent, say) listens for this.
    window.dispatchEvent(new CustomEvent('consent:changed', { detail: choice }));
  }

  // Many third-party scripts hook DOMContentLoaded to look for their own containers. Activating
  // them afterwards — that is, once the document is ready — leaves them initialised but mute: the
  // Trustindex loader, for one, defines its globals and draws nothing, with no console error to say
  // so. Before the blocking it worked because it was `async` in the <head>, so it ran during parsing.
  //
  // When consent is already known that condition can be reproduced: an observer activates each
  // script as soon as the parser adds it, without waiting for the end. For the moment of the choice
  // itself there is no runtime remedy — the page is already built — and `reloadAfterChoice` is what
  // it takes.
  function observeAndActivate(choice) {
    if (typeof MutationObserver === 'undefined') return null;
    var obs = new MutationObserver(function (mutations) {
      for (var m = 0; m < mutations.length; m++) {
        var added = mutations[m].addedNodes;
        for (var n = 0; n < added.length; n++) {
          var node = added[n];
          if (node.nodeType !== 1 || node.tagName !== 'SCRIPT') continue;
          if (node.type !== 'text/plain') continue;
          var category = node.getAttribute('data-consent');
          if (category && choice[category]) activateScript(node);
        }
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    return obs;
  }

  function apply(choice, initial) {
    consentMode({ analytics: choice.analytics, marketing: choice.marketing, initial: initial });
    var obs = (initial && (choice.analytics || choice.marketing)) ? observeAndActivate(choice) : null;
    whenReady(function () {
      if (obs) obs.disconnect();
      applyToNodes(choice);
    });
  }

  /* ---------------------------------------------------------------- texts
   * The project speaks English; the banner speaks the visitor's language. These two dictionaries
   * are content, not artefacts — an Italian site needs an Italian banner — and both stay.
   */

  var T = {
    en: {
      title: 'Your choice, your data',
      text: 'This site uses third-party services that may collect data about your visit. You can accept them, reject them, or choose in detail. Nothing loads without your consent.',
      acceptAll: 'Accept all',
      rejectAll: 'Reject all',
      chooseInDetail: 'Choose in detail',
      savePreferences: 'Save preferences',
      necessary: 'Necessary',
      necessaryDesc: 'Required for the site to work and to protect forms from spam. These cannot be turned off.',
      analytics: 'Analytics',
      analyticsDesc: 'Tell us how many people visit the site and which pages they read, in aggregate form.',
      marketing: 'External content and marketing',
      marketingDesc: 'Maps, reviews, videos and affiliate links hosted elsewhere, which receive your IP address.',
      alwaysOn: 'Always on',
      blocked: 'Seeing %s requires your consent to external content.',
      showNow: 'Show',
      manageConsent: 'Manage consent',
      thisContent: 'this content',
      close: 'Close',
      policyLink: 'Privacy policy',
      noticeText: 'This site uses analytics and third-party content. You can turn them off at any time.',
      noticeOk: 'Got it',
      noticePreferences: 'Preferences'
    },
    it: {
      title: 'Rispettiamo la tua scelta',
      text: 'Questo sito usa servizi di terze parti che possono raccogliere dati sulla tua navigazione. Puoi accettarli, rifiutarli o scegliere nel dettaglio. Senza il tuo consenso non viene caricato nulla.',
      acceptAll: 'Accetta tutto',
      rejectAll: 'Rifiuta tutto',
      chooseInDetail: 'Scegli nel dettaglio',
      savePreferences: 'Salva le preferenze',
      necessary: 'Necessari',
      necessaryDesc: 'Servono a far funzionare il sito e la protezione anti-spam dei moduli. Non si possono disattivare.',
      analytics: 'Statistiche',
      analyticsDesc: 'Ci dicono quante persone visitano il sito e quali pagine leggono, in forma aggregata.',
      marketing: 'Contenuti esterni e marketing',
      marketingDesc: 'Mappe, recensioni, video e link di affiliazione ospitati da altri siti, che ricevono il tuo indirizzo IP.',
      alwaysOn: 'Sempre attivi',
      blocked: 'Per vedere %s serve il tuo consenso ai contenuti esterni.',
      showNow: 'Mostra',
      manageConsent: 'Gestisci il consenso',
      thisContent: 'questo contenuto',
      close: 'Chiudi',
      policyLink: 'Informativa privacy',
      noticeText: 'Questo sito usa statistiche e contenuti di terze parti. Puoi disattivarli quando vuoi.',
      noticeOk: 'Ho capito',
      noticePreferences: 'Preferenze'
    }
  };

  // Fallback English, to match the language the kit is documented in. A page with no `lang` is a
  // defect of that page — screen readers need it too — so this default should stay unreached.
  var language = (document.documentElement.getAttribute('lang') || 'en').slice(0, 2).toLowerCase();
  var dictionary = T[language] || T.en;
  function t(k) { return (cfg.texts && cfg.texts[k]) || dictionary[k]; }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------------------------------------------------------- interface */

  var dialog = null;
  var previousFocus = null;

  function button(label, className, action) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ck-btn ' + className;
    b.textContent = label;
    b.addEventListener('click', action);
    return b;
  }

  function row(key, on, locked) {
    var w = document.createElement('div');
    w.className = 'ck-category';
    var id = 'ck-cat-' + key;
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = on;
    input.disabled = !!locked;
    input.setAttribute('data-category', key);
    var lab = document.createElement('label');
    lab.setAttribute('for', id);
    lab.innerHTML = '<strong>' + escapeHtml(t(key)) + '</strong>' +
      (locked ? ' <em>(' + escapeHtml(t('alwaysOn')) + ')</em>' : '') +
      '<span>' + escapeHtml(t(key + 'Desc')) + '</span>';
    w.appendChild(input);
    w.appendChild(lab);
    return w;
  }

  function close() {
    if (!dialog) return;
    dialog.remove();
    dialog = null;
    document.removeEventListener('keydown', keyboard, true);
    if (previousFocus && previousFocus.focus) previousFocus.focus();
  }

  // Focus held inside the dialog: without it, Tab leaves for a page that cannot be used until the
  // choice is made. Esc amounts to not deciding, so it closes nothing but the detail.
  function keyboard(e) {
    if (!dialog) return;
    if (e.key === 'Tab') {
      var f = dialog.querySelectorAll('button, input, a[href]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function decide(analytics, marketing) {
    var choice = { analytics: analytics, marketing: marketing, necessary: true };
    var somethingOn = analytics || marketing;
    save(choice);

    // Some scripts look for their own containers while the page is being built, and activated once
    // it is finished they stay mute. For those the only remedy is to build it again: reload, and on
    // the next pass the observer activates them at the right moment. Only if something was turned
    // on — after a refusal there is nothing to start, and reloading would be a punishment for
    // having said no.
    if (cfg.reloadAfterChoice && somethingOn) {
      close();
      location.reload();
      return;
    }

    apply(choice, false);
    close();
  }

  function open(detailOnly) {
    close();
    previousFocus = document.activeElement;
    var stored = read() || { analytics: false, marketing: false };

    // Position: 'modal' (default), 'bottom', 'top', 'corner'.
    // Only the modal variant dims the page and holds the focus. The others leave it readable and
    // navigable: legitimate, because the blocking of third parties is technical and holds anyway,
    // and a panel covering the content until you decide looks too much like a wall.
    var position = cfg.position || 'modal';
    var modal = position === 'modal';

    dialog = document.createElement('div');
    dialog.className = 'ck-backdrop ck-pos-' + position;
    var box = document.createElement('div');
    box.className = 'ck-box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-labelledby', 'ck-title');
    // aria-modal lies to a screen reader if the page stays navigable: declare it only where it is
    // true, or someone using one believes they are trapped when they are not.
    if (modal) box.setAttribute('aria-modal', 'true');

    var h = document.createElement('h2');
    h.id = 'ck-title';
    h.textContent = t('title');
    var p = document.createElement('p');
    p.className = 'ck-text';
    p.textContent = t('text');
    box.appendChild(h);
    box.appendChild(p);

    if (cfg.policyUrl) {
      var a = document.createElement('a');
      a.className = 'ck-link';
      a.href = cfg.policyUrl;
      a.textContent = t('policyLink');
      box.appendChild(a);
    }

    var details = document.createElement('div');
    details.className = 'ck-details';
    details.appendChild(row('necessary', true, true));
    details.appendChild(row('analytics', stored.analytics, false));
    details.appendChild(row('marketing', stored.marketing, false));
    details.hidden = !detailOnly;
    box.appendChild(details);

    var actions = document.createElement('div');
    actions.className = 'ck-actions';

    // "Reject" carries the same visual weight as "Accept": a less visible refusal is the most
    // contested defect of home-made banners, and it makes the consent unfree.
    actions.appendChild(button(t('acceptAll'), 'ck-btn-primary', function () { decide(true, true); }));
    actions.appendChild(button(t('rejectAll'), 'ck-btn-primary', function () { decide(false, false); }));

    if (!detailOnly) {
      actions.appendChild(button(t('chooseInDetail'), 'ck-btn-tertiary', function () {
        details.hidden = false;
        saveBtn.hidden = false;
        this.hidden = true;
      }));
    }

    var saveBtn = button(t('savePreferences'), 'ck-btn-tertiary', function () {
      var a = dialog.querySelector('[data-category="analytics"]').checked;
      var m = dialog.querySelector('[data-category="marketing"]').checked;
      decide(a, m);
    });
    saveBtn.hidden = !detailOnly;
    actions.appendChild(saveBtn);

    box.appendChild(actions);
    dialog.appendChild(box);
    document.body.appendChild(dialog);

    if (modal) {
      // Focus held: with the page dimmed, tabbing out would land on content that cannot be used
      // until the choice is made.
      document.addEventListener('keydown', keyboard, true);
      box.querySelector('button').focus();
    } else if (detailOnly) {
      // Reopened from the footer: whoever pressed "Preferences" expects to arrive there with the
      // focus. On an automatic opening it does not move, so as not to interrupt the reading.
      box.querySelector('button').focus();
    }
  }

  /* ---------------------------------------------------------------- watchdog
   * The kit cannot block a third party written in the markup by itself: when the browser meets
   * <script src="..."> the request leaves before any JavaScript exists. That is why the blocking
   * has to be done by hand, and why it gets forgotten.
   *
   * This check repairs nothing — it could not — but it looks at what the page actually contacted
   * and says out loud if something got through unmarked. It turns a silent failure into a noisy
   * one, which is the only way these mistakes are ever found.
   *
   * The list is indicative and it ages: a domain that is not on it is not thereby harmless.
   */
  var TRACKERS = [
    'googletagmanager.com', 'google-analytics.com', 'doubleclick.net', 'googlesyndication.com',
    'connect.facebook.net', 'facebook.com/tr', 'hotjar.com', 'clarity.ms', 'matomo.cloud',
    'segment.io', 'segment.com', 'mixpanel.com', 'ads.linkedin.com', 'analytics.tiktok.com',
    'snap.licdn.com', 'bat.bing.com', 'cdn.amplitude.com', 'fullstory.com'
  ];

  function watchdog() {
    if (cfg.watchdog === false || typeof performance === 'undefined') return;
    var suspects = {};
    var resources = performance.getEntriesByType('resource');
    for (var i = 0; i < resources.length; i++) {
      // Started after the kit activated something: a consequence of consent, not a leak.
      if (resources[i].startTime >= activationTime) continue;
      var url = resources[i].name;
      for (var j = 0; j < TRACKERS.length; j++) {
        if (url.indexOf(TRACKERS[j]) !== -1) suspects[TRACKERS[j]] = true;
      }
    }
    var found = Object.keys(suspects);
    if (!found.length) return;
    console.warn(
      '[consent-kit] ' + found.join(', ') + (found.length > 1 ? ' were loaded' : ' was loaded') +
      ' without going through consent.\n' +
      'The blocking belongs in the markup, because a request written into the page leaves before any script runs:\n' +
      '  <script type="text/plain" data-consent="analytics" data-src="..."></script>\n' +
      'To silence this warning: window.consentConfig.watchdog = false'
    );
  }

  /* ---------------------------------------------------------------- informative notice
   * Where prior consent is not owed (outside the EU, the EEA and the UK) the blocking has no legal
   * basis: inform, and leave the door open to changing your mind. It is not a consent banner and
   * does not pretend to be one — anyone who wants to switch something off opens the preferences.
   */
  function notice() {
    var bar = document.createElement('div');
    bar.className = 'ck-backdrop ck-pos-bottom ck-notice';
    var box = document.createElement('div');
    box.className = 'ck-box';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', t('noticeText'));

    var p = document.createElement('p');
    p.className = 'ck-text';
    p.style.margin = '0';
    p.textContent = t('noticeText');
    box.appendChild(p);

    var actions = document.createElement('div');
    actions.className = 'ck-actions';
    actions.appendChild(button(t('noticePreferences'), 'ck-btn-tertiary', function () {
      bar.remove();
      open(true);
    }));
    actions.appendChild(button(t('noticeOk'), 'ck-btn-primary', function () { bar.remove(); }));
    box.appendChild(actions);
    bar.appendChild(box);
    document.body.appendChild(bar);
  }

  /* ---------------------------------------------------------------- start */

  // The regime is decided on the server, the only place that knows where the request comes from.
  // Until it answers everything stays blocked: if the call fails, times out or answers oddly, the
  // strict regime applies. Being wrong by showing a banner to someone who did not need one is an
  // annoyance; being wrong the other way is a violation.
  function decideRegime(fn) {
    if (!cfg.regimeUrl) return fn(true);
    var done = false;
    var conservativeTimeout = setTimeout(function () {
      if (!done) { done = true; fn(true); }
    }, cfg.regimeTimeout || 1500);

    fetch(cfg.regimeUrl, { credentials: 'omit' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (done) return;
        done = true;
        clearTimeout(conservativeTimeout);
        fn(d && d.consentRequired !== false);
      })
      .catch(function () {
        if (done) return;
        done = true;
        clearTimeout(conservativeTimeout);
        fn(true);
      });
  }

  // If nothing on the page is marked and Consent Mode is off, there is nothing to ask about: the
  // banner stays quiet. It is what lets the kit stay installed on a site that has no third parties
  // today — the day one is added and marked, the request appears by itself, with nobody having to
  // remember to reinstall anything. A banner that asks permission for nothing is worse than
  // useless: it declares a processing that does not exist, and it teaches people to click without
  // reading.
  function nothingToGovern() {
    if (cfg.consentMode) return false;
    return !document.querySelector('script[type="text/plain"][data-consent], [data-consent-src], [data-consent-placeholder]');
  }

  var stored = read();
  if (stored) {
    apply(stored, true);
  } else {
    // Before the regime is known: everything denied. It is the safe state, and it lasts a few tens
    // of milliseconds.
    apply({ analytics: false, marketing: false }, true);
    decideRegime(function (consentRequired) {
      if (consentRequired) {
        whenReady(function () { if (!nothingToGovern()) open(false); });
      } else {
        // Activated without consent because none is required there. It stays recorded as 'notice'
        // and not as a consent: calling "yes" something nobody said would be a lie written into
        // the reader's own localStorage.
        var opened = { analytics: true, marketing: true, regime: 'notice' };
        save(opened);
        apply(opened, false);
        whenReady(notice);
      }
    });
  }

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('load', function () { setTimeout(watchdog, 2000); });
  }

  // Revocation: to be wired to a "Cookie preferences" link in the footer. Without an easy
  // revocation the consent is not valid, because withdrawing it must cost what giving it cost.
  window.consent = {
    version: KIT_VERSION,
    open: function () { open(true); },
    state: function () { return read(); },
    revoke: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      location.reload();
    }
  };
})();
