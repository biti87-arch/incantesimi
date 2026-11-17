# Libro degli incantesimi — design dell'app v4

STATO LAVORO: design confermato da Massy a blocchi il 16/11/2026 (blocchi 1–5); v2: bonus di livello 0 anche per Magus, Necrarca e Sigillatore; app v1.0.1 rilasciata il 16/11. **v3 (17/11/2026)**: bacchette con 1 carica al giorno come nel Vol. 3 (H2), dati riallineati a Vol. 2 2.5.20, Vol. 3 2.5.10 e Vol. 4 2.4.2 (§14), confermati da Massy. **v4 (17/11)**: sovraccarico delle bacchette (H3), tema scuro di base (§0), più conosciuti scelti alla volta (B1). Prossimo passo: prova della pagina da parte di Massy, poi push (APK e Windows).

## 0. Identità

| Voce | Valore |
|---|---|
| Nome | Libro degli incantesimi (senza apostrofi) |
| Repo | `biti87-arch/incantesimi` (creato da Massy) |
| Pacchetto | `it.collana.incantesimi` |
| Prefisso dei file | `Incantesimi` (`Incantesimi-N.apk`, `Incantesimi-1.0.N-portatile.exe`) |
| Origine dell'infrastruttura | `alchimista` (`nuova_app.py`, skill collana-app §7) |
| Piattaforme | Android (Capacitor) e Windows (Electron) |
| Dati utente | `localStorage`, chiave `libro-incantesimi-v1` |

**Priorità di progetto: il telefono.** Una colonna, pulsanti grandi (almeno 44 px), barra in basso con quattro schede: **Personaggio · Oggi · Libro · Oggetti**. Su Windows la stessa pagina si apre su due colonne (elenco a sinistra, scheda a destra). Stile della Collana: oro #8B6914 / #D4A84B, fondi #F5EDD0 / #FAF3E0, titoli Georgia #C45911, condizioni in rosso #C00000. **Tema scuro di base** (Massy, 17/11): il pulsante del tema passa scuro → chiaro → automatico (segue il sistema) → scuro; la scelta si salva.

## 1. Fonti dei dati

| Dato | Fonte | File dei dati |
|---|---|---|
| 1.708 schede (1.650 delle liste + 58 concesse dai privilegi) | Vol. 4 2.4.2 (docx), Cap. 3 | `schede.json` |
| 15 liste con la numerazione per livello (servono le R) | Vol. 4 2.4.2, Cap. 2 | `liste.json` |
| Conosciuti e lanciabili per gruppo (9°, 6°, 4°), con le «R» | Vol. 4 2.4.2, Cap. 1 | `tabelle.json` |
| Modificatori di caratteristica e incantesimi bonus (1–45) | Vol. 4 2.4.2, Cap. 1 | `tabelle.json` |
| CD delle prove di Concentrazione (12 righe) | Vol. 4 2.4.2, Cap. 1 | `tabelle.json` |
| Caratteristica da incantatore, gruppo, bonus di livello 0 | Vol. 2 2.5.20 | `classi.json` (a mano, con controllo nel parser) |
| Metamagia: i 22 talenti del Vol. 3 | Vol. 3 2.5.10 | `metamagia.json` |
| Metamagia: i 43 talenti di Golarion (44 estratti, Incantesimi tenaci vale quello del Vol. 3) | pagine di golarion.altervista.org | `metamagia.json` |
| Modelli di bonus (talenti comuni) | golarion | `modelli.json` |

- Il parser legge il docx (regex sull'XML con i flag, come le altre app). I campi delle schede sono: Scuola, Livello, Tempo di lancio, Componenti, Raggio d'azione, Bersaglio/Area/Effetto, Durata, Tiro Salvezza, Resistenza agli incantesimi, Concesso da, più la descrizione.
- Il parser confronta le tabelle per gruppo del Vol. 4 con quelle di ogni classe del Vol. 2 corrente e **segnala** le differenze senza scegliere. Nota: il vecchio `tabelle_vol2_2.5.18.json` della Fase 4 non ha la colonna 0 dei lanciabili dell'Inquisitore, che invece c'è nel Vol. 2 2.5.19: si legge dai volumi correnti, non da quel JSON.
- **Formule dei danni**: il parser riconosce i modelli «XdY per livello (massimo ZdY)», «ogni N livelli», «+1 per livello (massimo +N)», ecc. (circa 244 schede con dadi che crescono col livello; le altre 308 con dadi hanno dadi fissi). Quelle che non riconosce vanno in un elenco di segnalazioni e, se servono, in `CORREZIONI` in fondo al parser, come nell'Officina.

## 2. Classi (`classi.json`)

| Classe | Caratteristica | Gruppo | Bonus di liv. 0 |
|---|---|---|---|
| Arcanista | Int | 9° | sì |
| Druido | Sag | 9° | sì |
| Fattucchiere | Int | 9° | sì |
| Necrarca | Car | 9° | sì |
| Oracolo | Car | 9° | sì |
| Sacerdote | Sag o Car (scelta) | 9° | sì |
| Stregone | Int o Car (scelta) | 9° | sì |
| Bardo | Car | 6° | sì |
| Convocatore | Car | 6° | sì |
| Inquisitore | Sag | 6° | sì |
| Magus | Int | 6° | sì |
| Sigillatore | Int | 6° | sì |
| Guardia Nera | Car | 4° | (niente liv. 0) |
| Paladino | Car | 4° | (niente liv. 0) |
| Ranger | Sag | 4° | (niente liv. 0) |

La caratteristica resta modificabile a mano (archetipi come il vessatore). Ogni classe lancia dalla propria lista (Arcanista: lista dello Stregone, come indicano le schede). Livello di incantatore = livello nella classe (Vol. 4, «Livello di incantatore e Classe Difficoltà»).

## 3. Personaggi (blocco 5)

- **A1** Più personaggi; dati: nome, classe, livello 1–20, caratteristica e punteggio (1–45), bonus di Utilizzare congegni magici, note.
- **A2** Multiclasse: fino a 2 classi incantatrici per personaggio, ognuna con livello, caratteristica, conosciuti, preparati e slot propri. I bonus valgono per tutte, oppure per una sola se il bonus indica la classe.
- **A3** Requisito: per imparare o lanciare serve un punteggio pari almeno a 10 + livello dell'incantesimo; sotto il requisito l'incantesimo resta visibile in grigio e non si può preparare né lanciare.
- **A4** Backup: esporta e importa uno o tutti i personaggi (file JSON e «Copia»/«Incolla»), per passare fra telefono e PC.

## 4. Incantesimi conosciuti (blocco 5)

- **B1** Contatore per livello di magia, ad esempio «6/8 (1 R)», dalle tabelle per gruppo. Si aggiungono dalla lista della classe, con la numerazione del Cap. 2, **più alla volta** (Massy, 17/11): una casella per incantesimo, al massimo i posti liberi del livello (le altre caselle si spengono), poi «Aggiungi N»; vale anche per le R a mano. Il tocco sul nome apre la scheda.
- **B2** **Tiro delle R**: il pulsante si attiva quando i conosciuti normali di quel livello sono completi (le R si determinano DOPO quelli normali). Tira sulla numerazione della lista di quel livello e ritira se esce un incantesimo già conosciuto. Le R restano segnate e non si sostituiscono.
- **B3** **R inserite a mano** (Massy, 16/11): per i personaggi già creati che hanno già tirato le R, ogni casella R si può riempire scegliendo l'incantesimo dalla lista, senza tiro e senza la regola dell'ordine. Resta segnato come R a tutti gli effetti.
- **B4** **Extra a mano**: ricerca su tutte le 1.708 schede, con l'etichetta «extra» e una nota sulla fonte (talento, dote, privilegio…). Non contano nel contatore. Livello: quello della lista della propria classe se c'è, altrimenti si sceglie fra i livelli indicati nella scheda.
- **B5** Salire di livello: l'app mostra i nuovi conosciuti da scegliere e le R da tirare o inserire.
- **B6** Sostituzioni: al livello giusto compare l'avviso «Puoi sostituire un conosciuto» (gruppi del 9° e del 6°: al 4° e a ogni livello pari; gruppo del 4°: al 7° e ogni 3 livelli). Stesso livello di magia, mai una R; una sostituzione per livello, segnata come usata.

## 5. Bonus permanenti (blocco 2)

- **C1** Ogni bonus ha: nome, fonte (talento, tratto, oggetto, razza, altro), valore, ambito, filtro, classe (facoltativa), nota libera, interruttore attivo/spento (serve anche per i bonus temporanei).
- **C2** Tutti i bonus attivi si sommano; l'app non applica i tipi di bonus di Pathfinder, e quelli che non si cumulano li spegne il giocatore.

| Ambito | Filtro | Effetto |
|---|---|---|
| CD | tutti · scuola · descrittore · incantesimo | +N alla CD |
| Livello di incantatore | tutti · scuola · descrittore · incantesimo | +N; ricalcola danni, durate, raggi, RI e Concentrazione |
| Concentrazione | sempre · sulla difensiva e In Lotta | +N |
| Superare la RI | tutti · scuola | +N |
| Danni | tutti · descrittore · incantesimo | +N per dado oppure +N fissi |
| Conosciuti extra | livello di magia | +N al contatore |
| Slot extra | livello di magia | +N slot al giorno |
| Utilizzare congegni magici | — | +N alla prova |
| Incremento di metamagia | incantesimo (e talento facoltativo) | −N all'incremento (minimo 0) |

- **C3** Modelli pronti (nomi di Golarion):

| Talento | Bonus |
|---|---|
| Incantesimi Focalizzati | +1 CD, scuola scelta |
| Incantesimi Focalizzati Superiore | +1 CD, scuola scelta |
| Elemento Focalizzato | +1 CD, energia scelta |
| Elemento Focalizzato Superiore | +1 CD, energia scelta |
| Incantesimi Inarrestabili | +2 Superare la RI |
| Incantesimi Inarrestabili Superiore | +2 Superare la RI |
| Incantare in Combattimento | +4 Concentrazione sulla difensiva e In Lotta |
| Concentrazione Prodigiosa | +2 Concentrazione sempre; nota: nessuna prova per il movimento violento |
| Incantesimo Specializzato | +2 livello di incantatore, incantesimo scelto |
| Incantesimi Aggiuntivi | +1 conosciuto, livello scelto |
| Vocazione Magica | +2 Utilizzare congegni magici |

## 6. Calcoli sulla scheda (blocco 1)

- **D1** CD = 10 + livello dell'incantesimo + bonus della caratteristica + bonus di CD che si applicano.
- **D2** Livello di incantatore (LI) = livello nella classe + bonus di LI che si applicano.
- **D3** Raggio: vicino 7,5 m + 1,5 m ogni 2 livelli; medio 30 m + 3 m per livello; lungo 120 m + 12 m per livello; i raggi in metri senza etichetta sono fissi (Vol. 4, Cap. 1).
- **D4** Durata: le durate «per livello» calcolate e scritte nell'unità più comoda (round, minuti, ore); (I) e Concentrazione segnalati.
- **D5** Danni: il valore calcolato si evidenzia dentro il testo, ad esempio «1d6 per livello (massimo 10d6) → **7d6**», più i bonus di danno.
- **D6** Superare la RI = 1d20 + LI + bonus, mostrato come «+X».
- **D7** Concentrazione = 1d20 + LI + bonus della caratteristica + bonus di Concentrazione. Calcolatore con le 12 righe della tabella (Lanciare sulla difensiva 15 + 2 × livello; Ferimento 10 + danni + livello, con Punti Fatica e Punti Ferita insieme; Danni continuati 10 + ½ danni + livello; Distratto da un incantesimo; In Lotta o Immobilizzato 10 + BMC + livello; Movimento vigoroso, violento, estremamente violento; Vento; Disturbato da un incantesimo; Intralciato 15 + livello); risultato in forma «serve d20 ≥ N». Se la scheda ha una CD propria, vale quella.

## 7. Metamagia (blocchi 1 e 3)

- **E1** Si applica al momento del lancio, solo agli incantesimi preparati del giorno (Vol. 3: «solamente agli incantesimi preparati»); mai ai lanci da non preparato, alle pergamene o alle bacchette.
- **E2** Slot = livello + somma degli incrementi (meno le riduzioni dei bonus §5); oltre il 9° non si lancia.
- **E3** Tempo di lancio invariato (i preparati non sono spontanei).
- **E4** La CD resta quella del livello originale, tranne con Incantesimi Intensificati (livello scelto, CD ricalcolata).
- **E5** Lo stesso talento non si applica due volte allo stesso lancio. Potenziati e Massimizzati insieme danno il massimo più metà di un tiro normale.
- **E6** Al lancio compaiono solo i talenti posseduti e compatibili con quell'incantesimo:
  - Estesi solo se la durata dipende dal livello;
  - Ingranditi solo con raggio vicino, medio o lungo;
  - Potenziati e Massimizzati solo con dadi variabili;
  - Silenziosi solo con componente V, Immobili solo con S;
  - Elementali solo con un descrittore di energia.

  Su ogni casella si vede lo slot risultante.

| Gruppo | Talenti | Effetto nell'app |
|---|---|---|
| Effetto calcolato | Estesi, Ingranditi, Ampliati, Potenziati, Massimizzati, Intensificati, Intensi, con Portata, Penetranti | valori riscritti nella scheda del lancio |
| Azione o componenti | Rapidi, Silenziosi, Immobili | Tempo di lancio o Componenti corretti |
| Solo nota | tutti gli altri (Golarion e Vol. 3) | incremento allo slot + riga riassuntiva |

- **E7** Incrementi e note di tutti i talenti letti dalle pagine (Vol. 3 per i suoi 22, golarion per i 43) durante l'estrazione dei dati, e ricontrollati uno per uno. I numeri della proposta del 16/11 (Estesi +1, Ingranditi +1, Ampliati +3, Potenziati +2, Massimizzati +3, Rapidi +4, Silenziosi +1, Immobili +1, Intensi +1, con Portata +1 per gradino, Penetranti +1) vanno confermati sulle fonti.

## 8. Schermata «Oggi» (blocco 4)

- **F1** Barra fissa: personaggio (tocco per cambiarlo), classe e livello, LI, CD base, Concentrazione, Superare la RI.
- **F2** **Slot**: una riga per livello di magia, pallini pieni e vuoti. Totale = tabella del gruppo + bonus della caratteristica (solo per i livelli in cui la tabella ha un numero, anche 0; il livello 0 ha il bonus «come se fosse di 1°» per le classi che lo prevedono) + slot extra dei bonus. Anche il livello 0 si conta. Un tocco su un pallino lo spende o lo recupera.
- **F3** **Preparati**: metà dei conosciuti per eccesso, per livello; il livello 0 è tutto preparato. Si scelgono dopo il Riposo, partendo da quelli del giorno prima.
- **F4** **Lancio**: la scheda calcolata ha tre pulsanti.
  - **Lancia**: 1 slot.
  - **Slot superiore**: usi al giorno = metà del bonus della caratteristica (minimo 1); le variabili restano quelle del livello originale.
  - **Non preparato**: 2 slot del livello dell'incantesimo o superiori, presi dal più basso disponibile; pulsante spento senza 2 slot validi; niente metamagia.

  Il pulsante «Annulla ultimo lancio» rimedia ai tocchi sbagliati.
- **F5** Slot superiore e metamagia insieme: ammessi. Lo slot deve essere almeno il livello più gli incrementi; se è più alto si consuma un uso dello slot superiore e la CD resta quella del livello originale.
- **F6** **Reagenti** (componenti M con un costo): fino a 250 mo 2 al giorno; 251–500 mo 1 al giorno; 501–999 mo 1 alla settimana; da 1.000 mo il prezzo è da pagare a ogni lancio (mostrato in rosso).
- **F7** **Incantesimi attivi**: ogni lancio con durata entra in elenco con il tempo rimasto. Pulsanti: «Round successivo», «+1 minuto», «+10 minuti», «+1 ora». Quelli a Concentrazione hanno l'etichetta «azione standard ogni round»; quelli (I) e a Concentrazione hanno «Termina». Allo scadere l'incantesimo sparisce con un avviso.
- **F8** Pulsante «Tira» opzionale su danni, Concentrazione e RI, con il risultato in un riquadro.
- **F9** **Riposo**: azzera slot, usi dello slot superiore, cariche, blocchi e sovraccarichi falliti delle bacchette e reagenti giornalieri, poi apre la scelta dei preparati. **Nuova settimana** (menu) azzera i reagenti settimanali.

## 9. Libro

- **G1** Ricerca per nome; filtri per lista, livello, scuola, descrittore, Tiro Salvezza, RI, componenti; preferiti.
- **G2** Ogni scheda è mostrata calcolata per il personaggio attivo (§6), oppure «pura» se non c'è un personaggio.

## 10. Oggetti (blocchi 1 e 5)

- **H1** **Pergamene**: incantesimo, livello, LI (predefinito 2 × livello − 1; livello 0 → 1), CD = 10 + livello + ⌊livello/2⌋, +1 se «ritrovata» (spuntato di default: Manuale dei Tesori, CD degli oggetti ritrovati +1), quantità; tutti i valori modificabili. Usarla toglie 1 dalla quantità. Se l'incantesimo è nella lista della classe si usa e basta; altrimenti prova di Utilizzare congegni magici CD 20 + LI della pergamena, con «serve d20 ≥ N». Niente metamagia.
- **H2** **Bacchette** (v3, 17/11; fa fede il Vol. 3 2.5.10, «Numero di cariche»: Massy, 16/11): livello **0–4**, CD come le pergamene.
  - **1 carica al giorno** per ogni bacchetta; le bacchette di tipo **Cura** fino a **3**: *Cura ferite leggere, moderate, gravi, critiche*, le *contingente* e *Cura ferite minori contingente* (1°, anche lei «di tipo Cura»; le *di massa* sono oltre il 4°). Il numero (1–3, predefinito 3) si sceglie quando si aggiunge la bacchetta, perché il Vol. 3 ne moltiplica il costo per le cariche; la riga mostra «cariche N/max» e «Usa» si spegne a 0.
  - Le cariche si rinnovano «all'alba del giorno seguente»: nell'app col **Riposo**, insieme ai blocchi.
  - Se l'incantesimo non è nella lista, prova di Utilizzare congegni magici CD 20: riuscita consuma la carica, fallita no; il pulsante «Fallita di 5+» la blocca fino al Riposo (resta com'era).
  - Bacchette salvate con la v1.0.1: alla prima apertura prendono 1 carica (le Cura 3, con le cariche che avevano).
  - Avviso oltre 5 bacchette per personaggio o con 2 bacchette dello stesso incantesimo (Vol. 3, «Limiti delle bacchette»). Niente metamagia.
- **H3** **Sovraccaricare una bacchetta** (Vol. 3; Massy, 17/11): casella «Sovraccarica» nel dialogo «Usa», sia con l'incantesimo in lista sia dopo la prova di Utilizzare congegni magici.
  - Prova di incantatore 1d20 + LI dell'utilizzatore, **CD 7 + livello dell'incantesimo + LI dell'utilizzatore** (in pratica d20 ≥ 7 + livello). LI e CD sono quelli della classe che ha l'incantesimo in lista, altrimenti della classe attiva.
  - Riuscita: l'incantesimo usa LI e CD dell'utilizzatore (10 + livello + bonus della caratteristica + bonus di CD), senza talenti. Fallita: l'incantesimo parte comunque con i valori della bacchetta e quella bacchetta non si sovraccarica più fino al Riposo. In entrambi i casi si consuma la carica.
  - Promemoria nel dialogo: «si applica la regola opzionale Maledizione di Tzeentch (Vol. 3): chiedi al DM».

## 11. Fuori dall'app

Riserve di classe (Scorta arcana, Riserva arcana e simili: Tracker di classe, rimandato); sigilli del Sigillatore (app Sigillatore); forme (app Forme Selvatiche e Necrarca); fallimento degli incantesimi per l'armatura (dipende dalla classe, Vol. 2).

## 12. Punti aperti

- ✅ Vol. 2, Magus, Necrarca, Sigillatore: frase del bonus di livello 0 (Vol. 2 2.5.20, 16/11).
- ✅ Vol. 3, Bacchette 0–4° e Incantesimi a catena con requisito Incantesimi Inarrestabili (Vol. 3 2.5.10, 16/11).
- ✅ Vol. 3, Incantesimo ingannatore e Incantesimo consacrato: riga «Incremento di livello» (Vol. 3 2.5.10); `META_INC` del parser ora è vuoto.
- **Schede con danni non da formula**: 11 schede con dadi e «livello» che i modelli non riconoscono (Ora della dipartita, Colpo doloroso, Infusione elementale, Lance di ghiaccio, Ostacolare evocazione, Richiesta planare, Cerchi di debilitazione, Colpo doloroso di massa, Teschio esplosivo necrotico, Kraken d'ombra, Eruzione ectoplasmatica): mostrano il testo com'è; se servono, formule a mano in `CORREZIONI` di `parse_incantesimi.py`.
- **Maledizione di Tzeentch**: il Vol. 3 la cita due volte come «regola opzionale» (sovraccarico delle bacchette; Essenza di acciaio arcano: «lanciare gratuitamente gli incantesimi con un risultato di 19-20 (anziché di 20)»), ma nessun manuale della Collana la descrive (cercata in Vol. 1–4, Guida del DM e manuali aggiuntivi il 17/11). L'app mostra solo il promemoria; se la regola viene scritta, si può aggiungere il test al dialogo del sovraccarico.
- Prova dell'APK e dell'app Windows sul telefono e sul PC (Massy).

## 13. Piano dei lavori

1. Clone del repo vuoto, `nuova_app.py --da alchimista`.
2. `sorgenti/docx/`: Vol. 4 2.4.1 (+ Vol. 3 2.5.9 per la metamagia); `estrai_testo.py` → `parse_incantesimi.py` → JSON; lettura delle segnalazioni.
3. `motore.js` (funzioni pure: slot, preparati, CD, LI, raggi, durate, danni, metamagia, Concentrazione, oggetti) con `test_motore.js`.
4. `template.html` per il telefono, `build.py`, prova con Playwright a 390 px.
5. Pagina web pubblicata come artifact per la prova di Massy; correzioni.
6. Icona, `controlla_app.py`, primo push, Releases (APK e Windows); righe in `app.tsv`, `app.md` e nello stato.

## 14. Versioni

| App | Data | Cosa |
|---|---|---|
| v1.0.1 / win-1.0.1 | 16/11/2026 | prima versione (design v2): Vol. 4 2.4.1, Vol. 2 2.5.19, Vol. 3 2.5.9 |
| prossima | 17/11/2026 | design v4: sovraccarico (H3), tema scuro di base, più conosciuti alla volta; design v3: bacchette con 1 carica al giorno (H2); Vol. 4 2.4.2 (raggi di Bolle di sapone, Brontolare, Evoca Amarok, Muro di tenebre), Vol. 2 2.5.20 (nessuna differenza nei dati), Vol. 3 2.5.10 (Incantesimo ingannatore +1; nota di Incantesimo consacrato senza il testo del talento seguente) |
