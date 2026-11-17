# Libro degli incantesimi

Incantesimi dei personaggi della Collana (Vol. 4 Libro degli incantesimi 2.4.2, Vol. 2 Classi 2.5.20, Vol. 3 Miscellanea 2.5.10): più personaggi, conosciuti con le R, preparati e slot del giorno, CD, livello di incantatore, raggi, durate e danni calcolati, bonus permanenti, metamagia, Concentrazione, pergamene e bacchette. Pensata per il telefono, con tema chiaro e scuro.

## Scaricare l'app
Nella pagina **Releases** del repository:
- **Android**: il file `Incantesimi-N.apk` (release `v1.0.N`). Scaricalo dal telefono e aprilo per installarlo.
- **Windows**: release `win-1.0.N`, versione *portatile* (doppio clic, niente installazione) o *installazione*.

Le app si ricompilano da sole a ogni aggiornamento del ramo `main`.

## Come si aggiorna quando cambia il manuale
1. Metti il .docx aggiornato in `sorgenti/docx/` (togli il vecchio) e scrivi il nome nuovo nelle costanti `VOL4`, `VOL2`, `VOL3` in cima a `parse_incantesimi.py`.
2. `python3 sorgenti/estrai_testo.py` → testo e paragrafi in `sorgenti/txt/` (non nel repo: si rigenerano)
3. `python3 sorgenti/parse_incantesimi.py` → `sorgenti/incantesimi.json`; le anomalie dei manuali vanno in `sorgenti/segnalazioni.txt` (vanno lette). Legge anche `sorgenti/metamagia_golarion.json` (44 talenti di golarion, estratti il 16/11/2026).
4. `node sorgenti/test_motore.js` → test del motore di calcolo
5. `python3 sorgenti/build.py` → `www/index.html` (con un percorso come argomento scrive anche la versione web, da pubblicare come pagina di prova)

Le icone si rigenerano con `python3 sorgenti/icone.py`.

## Decisioni di design
Vedi `Incantesimi_app_design_v4.md`.

## Struttura
- `sorgenti/parse_incantesimi.py`: schede, liste numerate, tabelle del Cap. 1, controllo delle tabelle del Vol. 2, metamagia; in fondo `CORREZIONI` per le formule di danno che i modelli non riconoscono.
- `sorgenti/motore.js`: calcoli (slot, conosciuti, preparati, CD, livello di incantatore, raggi, durate, formule, metamagia, Concentrazione, oggetti), testati da `test_motore.js`.
- `sorgenti/template.html`: interfaccia (Personaggio · Oggi · Libro · Oggetti); i personaggi stanno nel `localStorage` con la chiave `libro-incantesimi-v1`.
