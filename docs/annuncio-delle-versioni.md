# Annuncio delle versioni ai siti che usano il kit

Progetto del meccanismo che avvisa i siti quando esce una versione del kit. Scritto il
1 agosto 2026, prima del codice.

## Il problema, misurato

Il kit si installa copiando due file. Da quel momento ogni sito ha una copia, e nulla collega
più la copia alla sorgente: il README dice «quando esce una versione nuova, leggi `CHANGELOG.md`
e ricopia i due file nei siti che vuoi», cioè affida a chi legge il compito di ricordarsi sia
delle versioni sia dei siti. Da nessuna parte è scritto quali siano quei siti.

Lo stato alla sera del 1 agosto 2026, letto dai repo e non dalla memoria:

| sito | repo | percorso della copia | versione |
|---|---|---|---|
| staybycity.com | `marco-fabbri/staybycity` | `site/public/consent` | 1.2.1 |
| marcofabbri.com | `marco-fabbri/marcofabbri-website` | `public/consent` | 1.2.1 |
| andreamuccioli.com | `marco-fabbri/andreamuccioli-com` | `public/consent` | **1.2.0** |

Il valore di quella tabella non è la riga in grassetto: è **quanto è durata**. Il pomeriggio in
cui è nata 1.2.1 sta tutto in mezz'ora — 21:56 il kit installato su marcofabbri.com alla 1.2.0,
22:12 la correzione delle misure scritta nel kit, 22:16 la 1.2.1 pubblicata, 22:18 la copia di
marcofabbri.com aggiornata. Ventidue minuti in cui il sito che aveva *trovato* il difetto girava
con la versione che ce l'aveva ancora.

Due copie su tre sono state riallineate a mano nel giro di pochi minuti perché una persona stava
guardando. La terza no, e non lo saprebbe nessuno. Su staybycity la stessa deriva si è ripetuta
due volte nella stessa giornata, la seconda mentre era aperta la PR che parlava di questo.

Nessuno di questi disallineamenti ha prodotto un errore, un log o un avviso. È la stessa forma
del guasto per cui esiste il guardiano: qualcosa che non rompe niente e per questo resta lì.

## Il principio: il kit annuncia, i siti non controllano

Oggi il controllo è chiesto al posto sbagliato. Un sito sa che cosa sta usando ma non sa che è
uscita una versione; il kit sa che è uscita una versione ma non sa chi lo usa. Chiedere a ogni
sito di controllarsi significa scrivere N volte lo stesso meccanismo, con N credenziali e N
schedulazioni — e proprio i siti che ne avrebbero più bisogno sono quelli meno attrezzati:
**né `marcofabbri-website` né `andreamuccioli-com` hanno workflow GitHub**, quindi non
avrebbero dove eseguirlo.

Esiste un posto solo che sa che è successo qualcosa, ed è quello che deve parlare.

Conseguenza non ovvia ma decisiva: **il repo del kit può restare privato**. Il token vive nel
kit e spinge verso l'esterno; nessun sito deve leggere il kit, quindi nessun sito ha bisogno di
credenziali e non serve pubblicare niente.

## Cosa si costruisce

Tre pezzi, ognuno inutile senza gli altri due.

### 1. Il registro dei consumatori

`consumatori.csv` nella radice del kit, una riga per sito:

```csv
sito,repo,percorso,ramo
staybycity.com,marco-fabbri/staybycity,site/public/consent,main
marcofabbri.com,marco-fabbri/marcofabbri-website,public/consent,main
andreamuccioli.com,marco-fabbri/andreamuccioli-com,public/consent,main
```

`percorso` è la cartella che contiene i due file, non i file: si chiamano `consent.js` e
`consent.css` ovunque, e ammettere il contrario servirebbe solo a permettere di rinominarli.

**Il registro è il rimedio vero, l'automazione è solo ciò che lo rende utile.** Anche senza il
workflow, un elenco di chi ha una copia è l'informazione che oggi manca del tutto. Va in CSV nel
repo, non in un servizio: è la stessa scelta per cui i registri di staybycity stanno in git.

### 2. I tag di versione

Il kit non ha tag: `1.2.1` esiste solo come stringa dentro tre file di testo. Vanno creati, anche
retroattivamente, perché sono ciò che permette al workflow di rispondere alla domanda
interessante — *questa copia è stata modificata a mano?* — confrontando i byte del sito contro la
versione che dichiara. Senza tag quella domanda non ha risposta e una PR sovrascriverebbe una
modifica locale senza dire niente.

Mappa da creare, letta dalla storia:

| tag | commit | perché quel commit |
|---|---|---|
| `v1.0.0` | `5fa25b4` | ultimo commit a 1.0.0 (aggiunge i modelli in inglese) |
| `v1.1.0` | `dfaacb6` | posizione configurabile |
| `v1.2.0` | `919a2ba` | banner silenzioso, guardiano, regime geografico |
| `v1.2.1` | `e628c88` | misure in px (merge su main) |

Da qui in avanti ogni versione è un tag, e **il tag è l'atto che pubblica**: finché non c'è, una
modifica in `src/` è lavoro in corso e nessun sito viene disturbato.

### 3. Il workflow che apre le PR

`.github/workflows/annuncia.yml` nel kit. Si avvia al push di un tag `v*`, più
`workflow_dispatch` con una versione facoltativa — serve quando si aggiunge un sito al registro e
lo si vuole portare all'ultima versione senza inventare un tag.

**Prima di tutto, il controllo di coerenza.** Il nome del tag, `VERSIONE_KIT` in `src/consent.js`,
le intestazioni di entrambi i file e la prima voce di `CHANGELOG.md` devono dire lo stesso numero.
Se divergono il workflow si ferma e non tocca nessun sito: sono quattro numeri tenuti allineati a
mano, e da questo momento ogni controllo a valle si fida di loro. Un numero sbagliato qui non
produce un errore, produce un annuncio falso a tre siti.

Poi, per ogni riga del registro:

1. legge la copia del sito e ne ricava la versione dichiarata dall'intestazione;
2. se è già quella nuova, non fa niente e lo dice nel log;
3. confronta i byte della copia con `git show v<versione-dichiarata>:src/…` — se differiscono,
   **quella copia è stata modificata a mano** e il diff finisce nel corpo della PR;
4. copia i due file e apre una PR sul ramo `consent-kit/v<versione>`;
5. se quella PR esiste già, la aggiorna invece di aprirne una seconda.

Un sito che fallisce — repo rinominato, percorso spostato, token senza accesso — non ferma gli
altri: gli errori si raccolgono e il job fallisce alla fine, rumorosamente.

## Che cosa dice la PR

Il corpo è il punto: una PR che porta due file senza spiegare perché è una PR che si merge senza
leggere.

- **le voci di `CHANGELOG.md` fra la versione del sito e quella nuova**, non solo l'ultima: un
  sito fermo a 1.0.0 deve vedere anche 1.1.0;
- **se la copia era stata modificata a mano**, il diff di quelle modifiche, con l'avvertenza che
  stanno per essere sovrascritte;
- **le opzioni nuove che quella versione introduce** (`guardiano`, `ricaricaDopoScelta`, …),
  nominate e non attivate: il kit non può sapere se a quel sito servano;
- **quello che va guardato a mano**, quando c'è: 1.2.1 cambia le misure e su un tema con root a
  62,5% cambia la taglia del pannello.

Il merge resta l'atto umano. Il kit propone, chi risponde del sito decide.

## Cosa il meccanismo NON fa, di proposito

- **Non fa il merge** e non pubblica: sarebbe un file che cambia da solo su un sito in
  produzione, per giunta quello che governa il consenso.
- **Non tocca la configurazione né i fogli di stile** del sito. Le variabili `--ck-*` e
  `window.consensoConfig` sono decisioni del sito, e una versione nuova non le conosce.
- **Non verifica che il sito sia poi andato online** con la versione nuova. Una PR mergiata che
  non si deploya è un guasto diverso, e chi lo sa è il deploy di quel sito.
- **Non gestisce un sito che non sia un repo GitHub.** Oggi tutti e tre lo sono. Il giorno che
  uno non lo fosse — un Ghost dove i due file sono incollati nella code injection — il registro
  serve comunque a sapere che esiste, e l'annuncio per quel sito sarà una notifica a una persona.
  Fuori perimetro adesso, scritto qui perché non venga riscoperto.

## Il token, e il suo raggio d'azione

Il `GITHUB_TOKEN` di default non può scrivere su altri repo, quindi serve un PAT fine-grained,
custodito nel kit come `CONSUMATORI_TOKEN`, con `contents: write` e `pull requests: write`
**limitato ai repo elencati nel registro**.

È il costo reale di questo progetto e va detto per intero: esiste una credenziale che può
scrivere su tre siti. La variante a permessi più stretti è aprire una **issue** invece di una PR
— il kit avvisa, la copia la fa una persona. Si perde il diff pronto e si tiene il controllo;
è la strada da prendere se quel raggio d'azione non è accettabile.

## Il punto debole, dichiarato

Un sito non registrato non riceve niente, in silenzio. È lo stesso guasto di oggi, spostato di
un passo: prima si dimenticava di ricopiare i file, ora si dimenticherebbe di aggiungere una
riga. La differenza è che una riga si aggiunge una volta sola, all'installazione — e per questo
la sezione «Installazione» del README acquista un quinto passo: **registra il sito in
`consumatori.csv`**. Nessun meccanismo qui può accorgersi di un sito che non ha mai dichiarato
di esistere.

## Alternative scartate, e perché

- **Ogni sito si controlla da solo**, come `refresh_status.py` su staybycity. Onesto ma caro: N
  implementazioni, N credenziali di lettura sul kit privato, N schedulazioni — e due dei tre siti
  non hanno una CI dove eseguirlo. In più annuncia soltanto: la copia va poi fatta a mano.
- **Pacchettizzarlo su npm** e lasciar fare a Dependabot. È la risposta standard al problema delle
  copie vendorizzate, e viene scartata per due ragioni del kit, non del problema: il kit nasce come
  «due file da copiare, nessuna dipendenza, nessun passo di build», e un pacchetto privato richiede
  registry e autenticazione **per sito** — lo stesso problema di credenziali, con in più una
  build in ogni sito.
- **Rendere pubblico il repo** per permettere controlli senza credenziali. Funzionerebbe, ma il
  modello a spinta non ne ha bisogno: è lavoro (togliere i riferimenti ai progetti, dare
  contesto) che non compra niente qui.
- **Un controllo dentro `consent.js` che interroghi il kit a runtime.** Da non fare mai: sarebbe
  una richiesta di rete in più fatta dal file la cui ragione d'essere è non farne partire nessuna.
