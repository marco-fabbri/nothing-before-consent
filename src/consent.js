/*!
 * consent-kit 1.2.1 — banner di consenso con blocco preventivo.
 * Copia versionata: se questo numero è più basso di quello nel CHANGELOG del kit, il sito è indietro.
 *
 * Il punto di questo file non è mostrare un banner: è impedire che le terze parti partano prima
 * della scelta. Un banner che non blocca niente è la situazione più contestata in assoluto, perché
 * dichiara un consenso che non c'è.
 *
 * Come si marcano le risorse da bloccare:
 *
 *   <script type="text/plain" data-consent="statistiche" data-src="https://..."></script>
 *   <script type="text/plain" data-consent="statistiche">codice inline</script>
 *   <iframe data-consent="marketing" data-consent-src="https://..." data-consent-etichetta="mappa"></iframe>
 *
 * `type="text/plain"` non è eseguibile per il browser e `data-src` non è `src`: finché non c'è
 * consenso non parte nessuna richiesta, nemmeno il DNS. È il motivo per cui il blocco va fatto nel
 * markup e non a runtime: qualsiasi cosa venga fatta dopo, la richiesta è già partita.
 */
(function () {
  'use strict';

  var VERSIONE_KIT = '1.2.1';
  var cfg = window.consensoConfig || {};

  // La versione della policy sta dentro la scelta salvata: quando cambiano i servizi la si alza e
  // il consenso viene richiesto di nuovo, invece di ereditare un "sì" dato per altri destinatari.
  var VERSIONE_POLICY = cfg.versionePolicy || 1;
  var CHIAVE = cfg.chiave || 'consenso-kit';
  var CATEGORIE = ['statistiche', 'marketing'];

  // localStorage e non un cookie: così il banner non introduce esattamente ciò che deve governare.
  // Non viene spedito a nessuno e non compare in una cookie policy.
  function leggi() {
    try {
      var g = JSON.parse(localStorage.getItem(CHIAVE) || 'null');
      if (!g || g.versione !== VERSIONE_POLICY) return null;
      return g;
    } catch (e) {
      return null; // localStorage negato (Safari in privata, o browser irrigidito): si richiede.
    }
  }

  function salva(scelta) {
    try {
      localStorage.setItem(CHIAVE, JSON.stringify({
        versione: VERSIONE_POLICY,
        quando: new Date().toISOString(),
        statistiche: !!scelta.statistiche,
        marketing: !!scelta.marketing,
        regime: scelta.regime || 'consenso'
      }));
    } catch (e) {
      /* Se non si può salvare, la scelta vale per questa pagina e verrà richiesta di nuovo:
         meglio richiedere due volte che assumere un consenso mai registrato. */
    }
  }

  /* ---------------------------------------------------------------- Consent Mode di Google
   * Va emesso PRIMA che GA4 venga caricato, altrimenti non serve a niente: per questo consent.js
   * deve stare per primo nel <head>. Tutto su "denied" di default significa nessun cookie prima
   * della scelta; all'accettazione si passa a "granted".
   */
  function consentMode(stato) {
    if (!cfg.consentMode) return;
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    gtag('consent', stato.iniziale ? 'default' : 'update', {
      ad_storage: stato.marketing ? 'granted' : 'denied',
      ad_user_data: stato.marketing ? 'granted' : 'denied',
      ad_personalization: stato.marketing ? 'granted' : 'denied',
      analytics_storage: stato.statistiche ? 'granted' : 'denied'
    });
  }

  /* ---------------------------------------------------------------- attivazione delle risorse */

  // Ciò che il kit ha attivato di sua mano, e quando. Serve al guardiano per non segnalare se
  // stesso: uno script attivato dopo il consenso ne chiama altri (GA4 chiama google-analytics.com),
  // e quelli non sono nell'elenco. Confrontare gli indirizzi non basta, conta il momento.
  var attivatiDalKit = [];
  var momentoAttivazione = Infinity;

  function attivaScript(nodo) {
    var s = document.createElement('script');
    for (var i = 0; i < nodo.attributes.length; i++) {
      var a = nodo.attributes[i];
      if (a.name === 'type' || a.name === 'data-src' || a.name.indexOf('data-consent') === 0) continue;
      s.setAttribute(a.name, a.value);
    }
    var src = nodo.getAttribute('data-src');
    if (momentoAttivazione === Infinity) momentoAttivazione = performance.now();
    if (src) { s.src = src; attivatiDalKit.push(src); } else { s.text = nodo.textContent; }
    nodo.parentNode.replaceChild(s, nodo);
  }

  function attivaIframe(nodo) {
    if (momentoAttivazione === Infinity) momentoAttivazione = performance.now();
    attivatiDalKit.push(nodo.getAttribute('data-consent-src') || '');
    var segnaposto = nodo.previousElementSibling;
    if (segnaposto && segnaposto.classList.contains('ck-segnaposto')) segnaposto.remove();
    nodo.src = nodo.getAttribute('data-consent-src');
    nodo.removeAttribute('data-consent-src');
    nodo.style.display = '';
  }

  // Un iframe bloccato lascerebbe un buco muto nella pagina. Il segnaposto dice cosa manca e offre
  // due strade diverse, che è il punto:
  //
  //   "Mostra" carica SOLO quell'elemento, SOLO per questa visita, senza toccare le preferenze.
  //   Premerlo è una richiesta esplicita di quel contenuto — chi ha rifiutato tutto può comunque
  //   vedere dove si trova uno studio senza dover cambiare idea sul resto del sito.
  //
  //   "Preferenze" apre il pannello, per chi invece vuole decidere una volta per tutte.
  function costruisciSegnaposto(etichetta, mostra) {
    var box = document.createElement('div');
    box.className = 'ck-segnaposto';
    box.innerHTML = '<p>' + t('bloccato').replace('%s', escapeHtml(etichetta || t('contenuto'))) + '</p>';
    var azioni = document.createElement('div');
    azioni.className = 'ck-azioni';
    // niente salva(): non è un consenso registrato, è un permesso per questo elemento e per ora
    azioni.appendChild(bottone(t('mostraOra'), 'ck-btn-primario', mostra));
    azioni.appendChild(bottone(t('sbloccaOra'), 'ck-btn-terziario', function () { apri(true); }));
    box.appendChild(azioni);
    return box;
  }

  function metteSegnaposto(nodo) {
    if (nodo.previousElementSibling && nodo.previousElementSibling.classList.contains('ck-segnaposto')) return;
    var seg = costruisciSegnaposto(nodo.getAttribute('data-consent-etichetta'), function () {
      attivaIframe(nodo);
    });
    nodo.style.display = 'none';
    nodo.parentNode.insertBefore(seg, nodo);
  }

  // consent.js sta nel <head> — deve, per emettere i segnali Consent Mode prima di GA4 — quindi
  // quando parte il <body> non esiste ancora. Toccare i nodi subito non troverebbe niente: gli
  // script resterebbero inerti anche con il consenso già dato. Il Consent Mode va emesso subito,
  // i nodi si toccano a documento pronto.
  function quandoPronto(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // Un widget che si disegna da solo (recensioni, feed) non ha un elemento da sostituire: c'è un
  // contenitore vuoto e uno script che lo riempie. Il segnaposto va sul contenitore, e "Mostra"
  // attiva gli script che lo alimentano, elencati per id in data-consent-attiva.
  function metteSegnapostoContenitore(box) {
    if (box.querySelector(':scope > .ck-segnaposto')) return;
    var ids = (box.getAttribute('data-consent-attiva') || '').split(/\s+/).filter(Boolean);
    var seg = costruisciSegnaposto(box.getAttribute('data-consent-etichetta'), function () {
      for (var i = 0; i < ids.length; i++) {
        var s = document.getElementById(ids[i]);
        if (s && s.type === 'text/plain') attivaScript(s);
      }
      seg.remove();
    });
    box.appendChild(seg);
  }

  function applicaAiNodi(scelta) {
    // I contenitori prima degli script: se lo script parte mentre il segnaposto è ancora lì, il
    // widget si disegna sopra un riquadro che dice "bloccato".
    var contenitori = document.querySelectorAll('[data-consent-segnaposto]');
    for (var k = 0; k < contenitori.length; k++) {
      var seg = contenitori[k].querySelector(':scope > .ck-segnaposto');
      if (scelta[contenitori[k].getAttribute('data-consent')]) { if (seg) seg.remove(); }
      else metteSegnapostoContenitore(contenitori[k]);
    }

    var script = document.querySelectorAll('script[type="text/plain"][data-consent]');
    for (var i = 0; i < script.length; i++) {
      if (scelta[script[i].getAttribute('data-consent')]) attivaScript(script[i]);
    }

    var frame = document.querySelectorAll('iframe[data-consent-src]');
    for (var j = 0; j < frame.length; j++) {
      if (scelta[frame[j].getAttribute('data-consent')]) attivaIframe(frame[j]);
      else metteSegnaposto(frame[j]);
    }

    // Chi vuole reagire (per esempio far partire un widget solo dopo il consenso) ascolta questo.
    window.dispatchEvent(new CustomEvent('consenso:cambiato', { detail: scelta }));
  }

  // Molti script di terze parti si agganciano a DOMContentLoaded per cercare i propri contenitori.
  // Attivarli dopo — cioè a documento pronto — li lascia inizializzati ma inerti: il loader di
  // Trustindex, per dire, definisce le sue variabili globali e non disegna niente, senza un errore
  // in console che lo dica. Prima del blocco funzionava perché era `async` nel <head>, quindi
  // partiva durante il parsing.
  //
  // Quando il consenso è già noto si riproduce quella condizione: un osservatore attiva ogni script
  // appena il parser lo aggiunge, senza aspettare la fine. Per il momento della scelta invece non
  // c'è rimedio a runtime — la pagina è già costruita — e serve `ricaricaDopoScelta`.
  function osservaEAttiva(scelta) {
    if (typeof MutationObserver === 'undefined') return null;
    var obs = new MutationObserver(function (mutazioni) {
      for (var m = 0; m < mutazioni.length; m++) {
        var aggiunti = mutazioni[m].addedNodes;
        for (var n = 0; n < aggiunti.length; n++) {
          var nodo = aggiunti[n];
          if (nodo.nodeType !== 1 || nodo.tagName !== 'SCRIPT') continue;
          if (nodo.type !== 'text/plain') continue;
          var cat = nodo.getAttribute('data-consent');
          if (cat && scelta[cat]) attivaScript(nodo);
        }
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    return obs;
  }

  function applica(scelta, iniziale) {
    consentMode({ statistiche: scelta.statistiche, marketing: scelta.marketing, iniziale: iniziale });
    var obs = (iniziale && (scelta.statistiche || scelta.marketing)) ? osservaEAttiva(scelta) : null;
    quandoPronto(function () {
      if (obs) obs.disconnect();
      applicaAiNodi(scelta);
    });
  }

  /* ---------------------------------------------------------------- testi */

  var T = {
    it: {
      titolo: 'Rispettiamo la tua scelta',
      testo: 'Questo sito usa servizi di terze parti che possono raccogliere dati sulla tua navigazione. Puoi accettarli, rifiutarli o scegliere nel dettaglio. Senza il tuo consenso non viene caricato nulla.',
      accetta: 'Accetta tutto',
      rifiuta: 'Rifiuta tutto',
      preferenze: 'Scegli nel dettaglio',
      salva: 'Salva le preferenze',
      necessari: 'Necessari',
      necessariDesc: 'Servono a far funzionare il sito e la protezione anti-spam dei moduli. Non si possono disattivare.',
      statistiche: 'Statistiche',
      statisticheDesc: 'Ci dicono quante persone visitano il sito e quali pagine leggono, in forma aggregata.',
      marketing: 'Contenuti esterni e marketing',
      marketingDesc: 'Mappe, recensioni, video e link di affiliazione ospitati da altri siti, che ricevono il tuo indirizzo IP.',
      sempreAttivi: 'Sempre attivi',
      bloccato: 'Per vedere %s serve il tuo consenso ai contenuti esterni.',
      mostraOra: 'Mostra',
      sbloccaOra: 'Gestisci il consenso',
      contenuto: 'questo contenuto',
      chiudi: 'Chiudi',
      dettaglio: 'Informativa privacy',
      avvisoTesto: 'Questo sito usa statistiche e contenuti di terze parti. Puoi disattivarli quando vuoi.',
      avvisoOk: 'Ho capito',
      avvisoScegli: 'Preferenze'
    },
    en: {
      titolo: 'Your choice, your data',
      testo: 'This site uses third-party services that may collect data about your visit. You can accept them, reject them, or choose in detail. Nothing loads without your consent.',
      accetta: 'Accept all',
      rifiuta: 'Reject all',
      preferenze: 'Choose in detail',
      salva: 'Save preferences',
      necessari: 'Necessary',
      necessariDesc: 'Required for the site to work and to protect forms from spam. These cannot be turned off.',
      statistiche: 'Analytics',
      statisticheDesc: 'Tell us how many people visit the site and which pages they read, in aggregate form.',
      marketing: 'External content and marketing',
      marketingDesc: 'Maps, reviews, videos and affiliate links hosted elsewhere, which receive your IP address.',
      sempreAttivi: 'Always on',
      bloccato: 'Seeing %s requires your consent to external content.',
      mostraOra: 'Show',
      sbloccaOra: 'Manage consent',
      contenuto: 'this content',
      chiudi: 'Close',
      dettaglio: 'Privacy policy',
      avvisoTesto: 'This site uses analytics and third-party content. You can turn them off at any time.',
      avvisoOk: 'Got it',
      avvisoScegli: 'Preferences'
    }
  };

  var lingua = (document.documentElement.getAttribute('lang') || 'it').slice(0, 2).toLowerCase();
  var dizionario = T[lingua] || T.it;
  function t(k) { return (cfg.testi && cfg.testi[k]) || dizionario[k]; }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------------------------------------------------------- interfaccia */

  var dialogo = null;
  var focusPrecedente = null;

  function bottone(testo, classe, azione) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ck-btn ' + classe;
    b.textContent = testo;
    b.addEventListener('click', azione);
    return b;
  }

  function riga(chiave, attiva, bloccata) {
    var w = document.createElement('div');
    w.className = 'ck-categoria';
    var id = 'ck-cat-' + chiave;
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = attiva;
    input.disabled = !!bloccata;
    input.setAttribute('data-categoria', chiave);
    var lab = document.createElement('label');
    lab.setAttribute('for', id);
    lab.innerHTML = '<strong>' + escapeHtml(t(chiave)) + '</strong>' +
      (bloccata ? ' <em>(' + escapeHtml(t('sempreAttivi')) + ')</em>' : '') +
      '<span>' + escapeHtml(t(chiave + 'Desc')) + '</span>';
    w.appendChild(input);
    w.appendChild(lab);
    return w;
  }

  function chiudi() {
    if (!dialogo) return;
    dialogo.remove();
    dialogo = null;
    document.removeEventListener('keydown', tastiera, true);
    if (focusPrecedente && focusPrecedente.focus) focusPrecedente.focus();
  }

  // Focus trattenuto dentro il dialogo: senza, con Tab si esce su una pagina che non è utilizzabile
  // finché la scelta non è fatta. Esc equivale a non decidere, quindi chiude solo il dettaglio.
  function tastiera(e) {
    if (!dialogo) return;
    if (e.key === 'Tab') {
      var f = dialogo.querySelectorAll('button, input, a[href]');
      if (!f.length) return;
      var primo = f[0], ultimo = f[f.length - 1];
      if (e.shiftKey && document.activeElement === primo) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primo.focus(); }
    }
  }

  function decidi(statistiche, marketing) {
    var scelta = { statistiche: statistiche, marketing: marketing, necessari: true };
    var acceso = statistiche || marketing;
    salva(scelta);

    // Alcuni script cercano i propri contenitori mentre la pagina si costruisce, e attivati a
    // pagina fatta restano muti. Per loro l'unico rimedio è ricostruirla: si ricarica, e al giro
    // successivo l'osservatore li attiva al momento giusto. Solo se si è acceso qualcosa — dopo un
    // rifiuto non c'è niente da far partire, e ricaricare sarebbe una punizione per aver detto no.
    if (cfg.ricaricaDopoScelta && acceso) {
      chiudi();
      location.reload();
      return;
    }

    applica(scelta, false);
    chiudi();
  }

  function apri(soloDettaglio) {
    chiudi();
    focusPrecedente = document.activeElement;
    var salvata = leggi() || { statistiche: false, marketing: false };

    // Posizione: 'modale' (default), 'basso', 'alto', 'angolo'.
    // Solo la variante modale oscura la pagina e trattiene il focus. Le altre lasciano leggere e
    // navigare: è lecito perché il blocco delle terze parti è tecnico e vale comunque, e un
    // pannello che copre il contenuto finché non si decide somiglia troppo a un muro.
    var posizione = cfg.posizione || 'modale';
    var modale = posizione === 'modale';

    dialogo = document.createElement('div');
    dialogo.className = 'ck-fondo ck-pos-' + posizione;
    var box = document.createElement('div');
    box.className = 'ck-box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-labelledby', 'ck-titolo');
    // aria-modal mente al lettore di schermo se la pagina resta navigabile: si dichiara solo dove
    // è vero, altrimenti chi usa uno screen reader crede di essere bloccato e non lo è.
    if (modale) box.setAttribute('aria-modal', 'true');

    var h = document.createElement('h2');
    h.id = 'ck-titolo';
    h.textContent = t('titolo');
    var p = document.createElement('p');
    p.className = 'ck-testo';
    p.textContent = t('testo');
    box.appendChild(h);
    box.appendChild(p);

    if (cfg.urlInformativa) {
      var a = document.createElement('a');
      a.className = 'ck-link';
      a.href = cfg.urlInformativa;
      a.textContent = t('dettaglio');
      box.appendChild(a);
    }

    var dettaglio = document.createElement('div');
    dettaglio.className = 'ck-dettaglio';
    dettaglio.appendChild(riga('necessari', true, true));
    dettaglio.appendChild(riga('statistiche', salvata.statistiche, false));
    dettaglio.appendChild(riga('marketing', salvata.marketing, false));
    dettaglio.hidden = !soloDettaglio;
    box.appendChild(dettaglio);

    var azioni = document.createElement('div');
    azioni.className = 'ck-azioni';

    // "Rifiuta" ha lo stesso peso visivo di "Accetta": un rifiuto meno visibile è il difetto più
    // contestato dei banner fatti in casa, e rende il consenso non libero.
    azioni.appendChild(bottone(t('accetta'), 'ck-btn-primario', function () { decidi(true, true); }));
    azioni.appendChild(bottone(t('rifiuta'), 'ck-btn-primario', function () { decidi(false, false); }));

    if (!soloDettaglio) {
      azioni.appendChild(bottone(t('preferenze'), 'ck-btn-terziario', function () {
        dettaglio.hidden = false;
        salvaBtn.hidden = false;
        this.hidden = true;
      }));
    }

    var salvaBtn = bottone(t('salva'), 'ck-btn-terziario', function () {
      var s = dialogo.querySelector('[data-categoria="statistiche"]').checked;
      var m = dialogo.querySelector('[data-categoria="marketing"]').checked;
      decidi(s, m);
    });
    salvaBtn.hidden = !soloDettaglio;
    azioni.appendChild(salvaBtn);

    box.appendChild(azioni);
    dialogo.appendChild(box);
    document.body.appendChild(dialogo);

    if (modale) {
      // Focus trattenuto: con la pagina oscurata, uscire con Tab porterebbe su contenuti che non
      // si possono usare finché la scelta non è fatta.
      document.addEventListener('keydown', tastiera, true);
      box.querySelector('button').focus();
    } else if (soloDettaglio) {
      // Riaperto dal footer: chi ha premuto "Preferenze" si aspetta di arrivarci col focus.
      // All'apertura automatica invece non si sposta, per non interrompere la lettura.
      box.querySelector('button').focus();
    }
  }


  /* ---------------------------------------------------------------- guardiano
   * Il kit non può bloccare da solo una terza parte scritta nel markup: quando il browser incontra
   * <script src="..."> la richiesta parte prima che qualunque JavaScript esista. Per questo il
   * blocco va messo a mano, e per questo ci si dimentica.
   *
   * Questo controllo non ripara niente — non potrebbe — ma guarda cosa la pagina ha davvero
   * contattato e dice ad alta voce se qualcosa è passato senza marcatura. Trasforma un guasto
   * silenzioso in uno rumoroso, che è l'unico modo in cui questi errori vengono trovati.
   *
   * La lista è indicativa e invecchia: un dominio che non c'è non significa che sia innocuo.
   */
  var TRACCIANTI = [
    'googletagmanager.com', 'google-analytics.com', 'doubleclick.net', 'googlesyndication.com',
    'connect.facebook.net', 'facebook.com/tr', 'hotjar.com', 'clarity.ms', 'matomo.cloud',
    'segment.io', 'segment.com', 'mixpanel.com', 'ads.linkedin.com', 'analytics.tiktok.com',
    'snap.licdn.com', 'bat.bing.com', 'cdn.amplitude.com', 'fullstory.com'
  ];

  function guardiano() {
    if (cfg.guardiano === false || typeof performance === 'undefined') return;
    var sospetti = {};
    var risorse = performance.getEntriesByType('resource');
    for (var i = 0; i < risorse.length; i++) {
      // Partita dopo che il kit ha attivato qualcosa: è una conseguenza del consenso, non una fuga.
      if (risorse[i].startTime >= momentoAttivazione) continue;
      var url = risorse[i].name;
      for (var j = 0; j < TRACCIANTI.length; j++) {
        if (url.indexOf(TRACCIANTI[j]) !== -1) sospetti[TRACCIANTI[j]] = true;
      }
    }
    var elenco = Object.keys(sospetti);
    if (!elenco.length) return;
    console.warn(
      '[consent-kit] ' + elenco.join(', ') + (elenco.length > 1 ? ' sono stati caricati' : ' è stato caricato') +
      ' senza passare dal consenso.\n' +
      'Il blocco va messo nel markup, perché una richiesta scritta in pagina parte prima di qualsiasi script:\n' +
      '  <script type="text/plain" data-consent="statistiche" data-src="..."></script>\n' +
      'Per spegnere questo avviso: window.consensoConfig.guardiano = false'
    );
  }

  /* ---------------------------------------------------------------- avviso informativo
   * Dove il consenso preventivo non è dovuto (fuori da UE, SEE e Regno Unito) il blocco non ha
   * fondamento giuridico: si informa e si lascia la porta aperta a cambiare idea. Non è un banner
   * di consenso e non finge di esserlo — chi vuole disattivare qualcosa apre le preferenze.
   */
  function avviso() {
    var barra = document.createElement('div');
    barra.className = 'ck-fondo ck-pos-basso ck-avviso';
    var box = document.createElement('div');
    box.className = 'ck-box';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', t('avvisoTesto'));

    var p = document.createElement('p');
    p.className = 'ck-testo';
    p.style.margin = '0';
    p.textContent = t('avvisoTesto');
    box.appendChild(p);

    var azioni = document.createElement('div');
    azioni.className = 'ck-azioni';
    azioni.appendChild(bottone(t('avvisoScegli'), 'ck-btn-terziario', function () {
      barra.remove();
      apri(true);
    }));
    azioni.appendChild(bottone(t('avvisoOk'), 'ck-btn-primario', function () { barra.remove(); }));
    box.appendChild(azioni);
    barra.appendChild(box);
    document.body.appendChild(barra);
  }

  /* ---------------------------------------------------------------- avvio */

  // Il regime si decide sul server, che è l'unico a sapere da dove arriva la richiesta. Finché non
  // risponde tutto resta bloccato: se la chiamata fallisce, va in timeout o dà una risposta strana,
  // si applica il regime rigoroso. Sbagliare mostrando un banner a chi non gli spettava è un
  // fastidio; sbagliare al contrario è una violazione.
  function decidiRegime(fn) {
    if (!cfg.regimeUrl) return fn(true);
    var fatto = false;
    var chiudiConservativo = setTimeout(function () {
      if (!fatto) { fatto = true; fn(true); }
    }, cfg.regimeTimeout || 1500);

    fetch(cfg.regimeUrl, { credentials: 'omit' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (fatto) return;
        fatto = true;
        clearTimeout(chiudiConservativo);
        fn(d && d.consensoRichiesto !== false);
      })
      .catch(function () {
        if (fatto) return;
        fatto = true;
        clearTimeout(chiudiConservativo);
        fn(true);
      });
  }

  // Se in pagina non c'è niente di marcato e il Consent Mode è spento, non c'è nulla da chiedere:
  // il banner resta zitto. Serve a poter tenere il kit installato su un sito che oggi non ha terze
  // parti — il giorno che se ne aggiunge una e la si marca, la richiesta compare da sé, senza
  // ricordarsi di reinstallare niente. Un banner che chiede il permesso per nulla è peggio che
  // inutile: dichiara un trattamento che non esiste e abitua a cliccare senza leggere.
  function nienteDaGovernare() {
    if (cfg.consentMode) return false;
    return !document.querySelector('script[type="text/plain"][data-consent], [data-consent-src], [data-consent-segnaposto]');
  }

  var salvata = leggi();
  if (salvata) {
    applica(salvata, true);
  } else {
    // Prima di sapere il regime: tutto negato. È lo stato sicuro, e dura qualche decina di ms.
    applica({ statistiche: false, marketing: false }, true);
    decidiRegime(function (serveConsenso) {
      if (serveConsenso) {
        quandoPronto(function () { if (!nienteDaGovernare()) apri(false); });
      } else {
        // Attivato senza consenso perché lì non è richiesto. Resta registrato come 'avviso' e non
        // come consenso: chiamare "sì" una cosa che nessuno ha detto sarebbe una bugia scritta
        // nel proprio localStorage.
        var aperto = { statistiche: true, marketing: true, regime: 'avviso' };
        salva(aperto);
        applica(aperto, false);
        quandoPronto(avviso);
      }
    });
  }

  // Revoca: da collegare a un link "Preferenze cookie" nel footer. Senza una revoca facile il
  // consenso non è valido, perché ritirarlo deve costare quanto darlo.
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('load', function () { setTimeout(guardiano, 2000); });
  }

  window.consenso = {
    versione: VERSIONE_KIT,
    apri: function () { apri(true); },
    stato: function () { return leggi(); },
    revoca: function () {
      try { localStorage.removeItem(CHIAVE); } catch (e) {}
      location.reload();
    }
  };
})();
