/*!
 * consent-kit 1.1.0 — banner di consenso con blocco preventivo.
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

  var VERSIONE_KIT = '1.1.0';
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
        marketing: !!scelta.marketing
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

  function attivaScript(nodo) {
    var s = document.createElement('script');
    for (var i = 0; i < nodo.attributes.length; i++) {
      var a = nodo.attributes[i];
      if (a.name === 'type' || a.name === 'data-src' || a.name.indexOf('data-consent') === 0) continue;
      s.setAttribute(a.name, a.value);
    }
    var src = nodo.getAttribute('data-src');
    if (src) s.src = src; else s.text = nodo.textContent;
    nodo.parentNode.replaceChild(s, nodo);
  }

  function attivaIframe(nodo) {
    var segnaposto = nodo.previousElementSibling;
    if (segnaposto && segnaposto.classList.contains('ck-segnaposto')) segnaposto.remove();
    nodo.src = nodo.getAttribute('data-consent-src');
    nodo.removeAttribute('data-consent-src');
    nodo.style.display = '';
  }

  // Un iframe bloccato lascerebbe un buco muto nella pagina. Il segnaposto dice cosa manca e
  // permette di sbloccarlo lì, senza andare a cercare il banner.
  function metteSegnaposto(nodo) {
    if (nodo.previousElementSibling && nodo.previousElementSibling.classList.contains('ck-segnaposto')) return;
    var etichetta = nodo.getAttribute('data-consent-etichetta') || t('contenuto');
    var box = document.createElement('div');
    box.className = 'ck-segnaposto';
    box.innerHTML = '<p>' + t('bloccato').replace('%s', escapeHtml(etichetta)) + '</p>';
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ck-btn ck-btn-primario';
    b.textContent = t('sbloccaOra');
    b.addEventListener('click', function () { apri(); });
    box.appendChild(b);
    nodo.style.display = 'none';
    nodo.parentNode.insertBefore(box, nodo);
  }

  // consent.js sta nel <head> — deve, per emettere i segnali Consent Mode prima di GA4 — quindi
  // quando parte il <body> non esiste ancora. Toccare i nodi subito non troverebbe niente: gli
  // script resterebbero inerti anche con il consenso già dato. Il Consent Mode va emesso subito,
  // i nodi si toccano a documento pronto.
  function quandoPronto(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function applicaAiNodi(scelta) {
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

  function applica(scelta, iniziale) {
    consentMode({ statistiche: scelta.statistiche, marketing: scelta.marketing, iniziale: iniziale });
    quandoPronto(function () { applicaAiNodi(scelta); });
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
      sbloccaOra: 'Gestisci il consenso',
      contenuto: 'questo contenuto',
      chiudi: 'Chiudi',
      dettaglio: 'Informativa privacy'
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
      sbloccaOra: 'Manage consent',
      contenuto: 'this content',
      chiudi: 'Close',
      dettaglio: 'Privacy policy'
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
    salva(scelta);
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

  /* ---------------------------------------------------------------- avvio */

  var salvata = leggi();
  if (salvata) {
    applica(salvata, true);
  } else {
    // Nessuna scelta: tutto negato, segnaposto al posto degli iframe, e si chiede.
    applica({ statistiche: false, marketing: false }, true);
    quandoPronto(function () { apri(false); });
  }

  // Revoca: da collegare a un link "Preferenze cookie" nel footer. Senza una revoca facile il
  // consenso non è valido, perché ritirarlo deve costare quanto darlo.
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
