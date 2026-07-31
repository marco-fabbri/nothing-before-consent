# consent-kit

Banner di consenso con **blocco preventivo**, per siti statici serviti da Cloudflare. Nessuna
dipendenza, due file da copiare, niente abbonamenti.

Nasce da un problema concreto: tre siti che caricano Google Analytics, mappe, recensioni e widget
di prenotazione **prima** che il visitatore possa dire qualcosa. Un banner che si limita ad avvisare
non risolve niente — anzi dichiara un consenso che non è stato dato.

> **Cosa non è.** Questo kit produce codice funzionante e **modelli di testo**. Non è consulenza
> legale e non include l'aggiornamento normativo che si paga con un abbonamento a un servizio come
> Iubenda. I testi in `testi/` vanno letti e validati da chi risponde per il titolare.

## Il punto: bloccare, non avvisare

Le risorse di terze parti si marcano nel markup in modo che il browser **non possa** caricarle:

```html
<!-- script esterno -->
<script type="text/plain" data-consent="statistiche"
        data-src="https://www.googletagmanager.com/gtag/js?id=G-XXXX"></script>

<!-- script inline -->
<script type="text/plain" data-consent="statistiche">
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('config', 'G-XXXX');
</script>

<!-- iframe (mappe, video) -->
<iframe data-consent="marketing"
        data-consent-src="https://www.google.com/maps/embed?pb=..."
        data-consent-etichetta="la mappa dello studio"></iframe>
```

`type="text/plain"` non è eseguibile e `data-src` non è `src`: finché manca il consenso non parte
nessuna richiesta, nemmeno la risoluzione DNS. È il motivo per cui il blocco deve stare nel markup:
qualsiasi meccanismo che intervenga dopo arriva quando la richiesta è già partita.

Al posto di un iframe bloccato compare un **segnaposto** che dice cosa manca e permette di
sbloccarlo lì, senza andare a cercare il banner.

## Installazione

1. copia `src/consent.js` e `src/consent.css` nel sito
2. metti il CSS nel `<head>` e **`consent.js` come primo script**, prima di qualunque terza parte:

```html
<link rel="stylesheet" href="/assets/consent.css">
<script>
  window.consensoConfig = {
    versionePolicy: 1,                    // alzala quando cambiano i servizi: richiede di nuovo
    consentMode: true,                    // solo se il sito usa Google Analytics o Ads
    urlInformativa: '/privacy-policy/'
  };
</script>
<script src="/assets/consent.js"></script>
```

3. marca le terze parti come sopra
4. aggiungi nel footer un link per tornare sulla scelta — **senza revoca facile il consenso non è
   valido**, perché ritirarlo deve costare quanto darlo:

```html
<button type="button" onclick="window.consenso.apri()">Preferenze cookie</button>
```

`consent.js` **deve** stare prima di GA4: i segnali di Consent Mode servono solo se arrivano prima.

## Categorie

| Categoria | Cosa contiene | Consenso |
|---|---|---|
| `necessari` | funzionamento del sito, anti-spam dei moduli (es. Turnstile) | non richiesto |
| `statistiche` | analytics | richiesto |
| `marketing` | mappe, recensioni, video, affiliazione | richiesto |

Turnstile sta fra i necessari perché protegge un modulo dallo spam: è la funzione che l'utente ha
chiesto, non una profilazione.

## Configurazione

| Chiave | Default | A cosa serve |
|---|---|---|
| `versionePolicy` | `1` | alzandola, il consenso viene richiesto di nuovo invece di essere ereditato |
| `consentMode` | `false` | emette i segnali Google con tutto su `denied` prima del caricamento |
| `urlInformativa` | — | link mostrato nel banner |
| `posizione` | `modale` | `modale`, `basso`, `alto`, `angolo` |
| `chiave` | `consenso-kit` | nome della voce in `localStorage` |
| `testi` | — | sovrascrive singole stringhe |

### Posizione

| Valore | Come appare | Quando conviene |
|---|---|---|
| `modale` | pannello centrato, pagina oscurata | quando la scelta deve essere la prima cosa che si fa |
| `basso` | barra in fondo, pagina leggibile | il default sensato per la maggior parte dei siti |
| `alto` | barra in cima | se in fondo alla pagina c'è già altro (widget, chat) |
| `angolo` | riquadro in basso a destra, barra sotto i 40em | quando il banner deve farsi notare poco |

Solo `modale` oscura la pagina e trattiene il focus con Tab; le altre lasciano leggere e navigare.
Non è una scorciatoia: **il blocco delle terze parti è tecnico e vale comunque**, quindi una barra
meno invadente non concede niente in più. Anzi, un pannello che copre il contenuto finché non si
decide somiglia a un muro, che è la cosa da evitare.

Nelle varianti non modali `aria-modal` **non** viene dichiarato: dirlo mentre la pagina resta
navigabile farebbe credere a chi usa uno screen reader di essere bloccato quando non lo è.

Lingua letta da `<html lang>`: italiano e inglese, con fallback italiano.

Colori via variabili CSS, da mettere nel foglio del sito:

```css
:root { --ck-primario: #29a9e0; --ck-primario-testo: #fff; }
```

## API

```js
window.consenso.apri()    // riapre la scelta, con il dettaglio già aperto
window.consenso.stato()   // { versione, quando, statistiche, marketing } oppure null
window.consenso.revoca()  // cancella la scelta e ricarica
window.addEventListener('consenso:cambiato', e => { /* e.detail */ });
```

L'evento serve a chi deve fare qualcosa di più di un `<script>`: per esempio far partire un widget
solo dopo il consenso, mantenendo un caricamento differito già esistente.

## Come si aggiorna un sito

Il kit **non è una dipendenza**: ogni sito ne tiene una copia, con la versione scritta in cima al
file. Questo perché un sito può cambiare mani — se dipendesse da questo repo privato, il giorno che
passa a qualcun altro resterebbe un legame silenzioso.

Quando esce una versione nuova: leggi `CHANGELOG.md`, ricopia i due file nei siti che vuoi
aggiornare, una PR per sito. Per sapere se un sito è indietro, apri il suo `consent.js` e guarda la
prima riga.

## Serve un database dei consensi?

**No, non per questi siti** — e volerlo sarebbe controproducente.

L'art. 7 GDPR chiede al titolare di **essere in grado di dimostrare** che il consenso è stato
prestato. Da lì nasce l'idea di registrarlo su un server. Ma per un sito senza account, dimostrare
il consenso di un visitatore anonimo significherebbe **identificarlo**: salvare IP, impronta del
browser o un identificatore univoco. Si finirebbe a raccogliere più dati personali di quanti se ne
raccolgano senza registro, per provare di averne raccolti pochi. Il rimedio peggiore del male.

Quello che si dimostra, e che basta, è **il meccanismo**:

1. **cosa ha scelto quella persona**: sta nel suo browser, con data e versione della policy — è il
   `{ versione, quando, statistiche, marketing }` che il kit salva. Se contesta, quel dato è nel suo
   dispositivo, dove deve stare;
2. **cosa chiedeva il banner in quel momento**: sta in git. La cronologia di `consent.js`, dei testi
   e della `versionePolicy` racconta quali categorie esistevano, come erano descritte e da quando.
   È una prova datata e non riscrivibile a posteriori, che è esattamente ciò che serve;
3. **che prima della scelta non partisse nulla**: si dimostra aprendo il sito con la scheda Rete.

Per questo la `versionePolicy` non è un dettaglio: legare la scelta a un numero, e alzarlo quando i
servizi cambiano, è ciò che impedisce di sostenere che un consenso dato nel 2026 per due servizi
valga nel 2027 per cinque.

**Quando un registro serve davvero**: newsletter con doppia conferma, registrazione di account,
marketing verso una persona identificata. Lì il consenso riguarda un individuo che hai già
identificato, e il log ha senso perché non aggiunge dati che non avevi. Se un giorno uno di questi
siti aggiunge una newsletter, il consenso all'iscrizione è un'altra cosa rispetto a questo banner e
va gestito dove vivono gli iscritti.

## Verifica, prima di dire che funziona

Il criterio non è "il banner appare", è **"prima del consenso non parte niente"**:

1. finestra in incognito, scheda **Rete** aperta, ricarica: nessuna richiesta verso le terze parti
2. accetta → le richieste partono; ricarica → partono senza chiedere di nuovo
3. rifiuta → non parte niente, e resta così dopo il ricaricamento
4. revoca dal footer → si torna allo stato iniziale
5. **tastiera**: raggiungi e attiva i bottoni con Tab e Invio, senza mouse
6. con `consentMode`, in console `dataLayer[0]` dev'essere `consent default` con tutto `denied`

Il punto 1 è l'unico che distingue questo kit da un banner decorativo.
