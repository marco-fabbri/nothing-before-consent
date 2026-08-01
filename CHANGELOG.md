# Storia delle versioni

Ogni sito tiene una copia di `consent.js` con la versione scritta nella prima riga. Per sapere se
un sito è indietro, apri quel file e confronta con questo elenco.

## 1.2.0 — 1 agosto 2026

- **il banner tace se non c'è niente da governare**: nessun elemento marcato e Consent Mode spento
  significa nessuna richiesta di consenso. Serve a tenere il kit installato su un sito che oggi non
  ha terze parti: il giorno che se ne aggiunge una e la si marca, la richiesta compare da sé.
- **guardiano**: a pagina caricata controlla cosa è stato davvero contattato e avvisa in console se
  un dominio di tracciamento noto è passato senza marcatura. Non blocca — non può, una richiesta
  scritta nel markup parte prima di qualsiasi script — ma trasforma una dimenticanza silenziosa in
  una rumorosa. Si spegne con `guardiano: false`.
- **regime geografico**: `regimeUrl` interroga il server su chi è tenuto al consenso preventivo
  (UE, SEE, Regno Unito) e chi no. Finché non risponde tutto resta bloccato, e ogni errore vale come
  "consenso richiesto". Chi riceve l'avviso viene registrato come `regime: "avviso"`, mai come
  consenso.
- **segnaposto con due strade**: "Mostra" carica solo quell'elemento e solo per quella visita, senza
  registrare nulla; "Gestisci il consenso" apre il pannello. Funziona anche per i widget che si
  disegnano da soli, marcando il contenitore con `data-consent-segnaposto`.
- **`ricaricaDopoScelta`**: per gli script che cercano i propri contenitori mentre la pagina si
  costruisce e restano muti se attivati dopo. Solo quando si accende qualcosa, mai su un rifiuto.

### Una nota che vale più delle righe qui sopra

Il guardiano nasce da una giornata passata a inseguire guasti silenziosi: contatori fermi, 404
congelate per una settimana, un widget di recensioni morto da ore. Nessuno di questi diceva niente,
e li abbiamo trovati solo andandoli a cercare. Un avviso in console non ripara nulla, ma è la
differenza fra accorgersene subito e accorgersene fra sei mesi.

## 1.1.0 — 1 agosto 2026

- **posizione configurabile**: `modale` (come prima), `basso`, `alto`, `angolo`. Solo la variante
  modale oscura la pagina e trattiene il focus; le altre lasciano leggere e navigare, il che è
  lecito perché il blocco delle terze parti è tecnico e vale comunque.
- nelle varianti non modali `aria-modal` non viene più dichiarato: affermarlo mentre la pagina
  resta navigabile inganna chi usa uno screen reader.
- il focus non viene spostato all'apertura automatica di un banner non modale — interromperebbe la
  lettura — ma viene spostato quando è l'utente ad aprire le preferenze dal footer.
- README: sezione sul perché **non** serve un database dei consensi per siti senza account.

## 1.0.0 — 1 agosto 2026

Prima versione, usabile.

- **blocco preventivo** di script (esterni e inline) e iframe: `type="text/plain"` + `data-src`,
  così il browser non può caricare niente prima della scelta
- **tre categorie**: necessari (sempre attivi), statistiche, marketing
- **segnaposto** al posto degli iframe bloccati, con bottone per sbloccarli sul posto
- **Consent Mode v2** opzionale, emesso con tutto su `denied` prima che GA4 esista
- scelta in `localStorage`, legata a una **versione della policy**: cambiando i servizi il consenso
  viene richiesto di nuovo invece di essere ereditato
- **revoca** via `window.consenso.apri()` e `window.consenso.revoca()`
- accessibilità: `role="dialog"`, `aria-modal`, focus spostato e trattenuto, ciclo con Tab
- italiano e inglese, letti da `<html lang>`
- "Accetta" e "Rifiuta" con lo stesso peso visivo

### Nota di sviluppo

La prima stesura toccava i nodi subito, e questo è sbagliato: `consent.js` sta nel `<head>` — deve,
per emettere i segnali Consent Mode prima di GA4 — quindi quando parte il `<body>` non esiste
ancora. Il risultato era che con un consenso già dato **nulla veniva attivato** e i segnaposto non
comparivano. Ora il Consent Mode si emette subito e i nodi si toccano a documento pronto.

È emerso solo provando la pagina di esempio in un browser vero: la sintassi era corretta e non
c'erano errori in console. Vale la pena ricordarlo quando si aggiunge qualcosa.
