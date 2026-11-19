// Test del motore: stampa solo gli errori e il conteggio finale. Uso: node sorgenti/test_motore.js
const path = require('path');
const M = require(path.join(__dirname, 'motore.js'));
const D = require(path.join(__dirname, 'incantesimi.json'));
M.imposta(D);
let ok = 0, ko = 0;
const eq = (nome, a, b) => { const A = JSON.stringify(a), B = JSON.stringify(b); if (A === B) ok++; else { ko++; console.log('ERRORE', nome, 'ottenuto', A, 'atteso', B); } };
const S = n => D.schede.find(s => s.n === n);
const formule = (n, li, meta) => S(n).desc.flatMap(p => (p.f || []).map(f => M.formula(f, li, meta)));

// caratteristica e tabelle
eq('mod 18', M.modCar(18), 4); eq('mod 9', M.modCar(9), -1); eq('mod 45', M.modCar(45), 17);
eq('bonus Int 18 liv 4', M.bonusCar('Arcanista', 18, 4), 1);
eq('bonus Int 18 liv 5', M.bonusCar('Arcanista', 18, 5), 0);
eq('bonus liv 0 Arcanista (come il 1°) 20', M.bonusCar('Arcanista', 20, 0), 2);
eq('bonus liv 0 Magus (Massy 16/11)', M.bonusCar('Magus', 14, 0), 1);
eq('bonus liv 0 Paladino', M.bonusCar('Paladino', 14, 0), 0);
// Arcanista 1° liv., Int 16: lanciabili 5 / 3 + bonus (1 al liv. 0 come il 1°, 1 al 1°)
eq('slot Arcanista 1 Int 16', M.slot('Arcanista', 1, 16), { 0: 6, 1: 4, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null });
// requisito: Int 11 non lancia il 2° (serve 12)
eq('requisito', M.slot('Arcanista', 4, 11)[2], 0);
// Paladino 4°: tabella 0 al 1° → bonus solo dove c'è un numero (anche 0)
eq('slot Paladino 4 Car 14', M.slot('Paladino', 4, 14), { 1: 1, 2: null, 3: null, 4: null });
eq('conosciuti Arcanista 1', M.conosciuti('Arcanista', 1), { 0: { n: 4, r: 0 }, 1: { n: 4, r: 1 } });
// R cumulative (Massy, 18/11): Stregone 10° → 12 di 1° con 5 R (righe 1, 2, 3, 5, 7)
eq('R Stregone 10', [0, 1, 2, 3, 4, 5].map(L => M.conosciuti('Stregone', 10)[L]), [{ n: 7, r: 0 }, { n: 12, r: 5 }, { n: 12, r: 5 }, { n: 10, r: 4 }, { n: 8, r: 3 }, { n: 4, r: 1 }]);
eq('R Bardo 20 liv 6', M.conosciuti('Bardo', 20)[6], { n: 6, r: 3 });
eq('R Ranger 15 liv 1', M.conosciuti('Ranger', 15)[1], { n: 8, r: 3 });
eq('preparabili 7', M.preparabili(1, 7), 4); eq('preparabili liv 0', M.preparabili(0, 7), 7);
eq('slot superiore Int 18', M.usiSlotSuperiore(18), 2); eq('slot superiore Int 12', M.usiSlotSuperiore(12), 1);
eq('sostituzioni 9°', [3, 4, 5, 6].map(l => M.livelloSostituzione('Stregone', l)), [false, true, false, true]);
eq('sostituzioni 4°', [7, 9, 10, 13].map(l => M.livelloSostituzione('Ranger', l)), [true, false, true, true]);

// bonus
const pf = S('Palla di fuoco');
const ctx = { classe: 'Stregone', livello: 7, punteggio: 18, bonus: [
  { ambito: 'cd', filtro: { tipo: 'scuola', v: 'Invocazione' }, valore: 1 },
  { ambito: 'cd', filtro: { tipo: 'descrittore', v: 'freddo' }, valore: 1 },
  { ambito: 'li', filtro: { tipo: 'incantesimo', v: 'palla di fuoco' }, valore: 2 },
  { ambito: 'ri', filtro: { tipo: 'tutti' }, valore: 2 },
  { ambito: 'conc', modo: 'difensiva', valore: 4 },
  { ambito: 'conc', valore: 2, attivo: false } ] };
eq('CD Palla di fuoco', M.CD(ctx, pf, 3), 18);
eq('LI Palla di fuoco (Specializzato)', M.LI(ctx, pf), 9);
eq('RI', M.RI(ctx, pf), 11);
eq('Concentrazione normale', M.concentrazione(ctx, pf, false), 13);
eq('Concentrazione sulla difensiva', M.concentrazione(ctx, pf, true), 17);
eq('CD conc. difensiva liv 3', M.cdConcentrazione(D.concentrazione[0], 3), 21);
eq('CD conc. ferimento 12 danni', M.cdConcentrazione(D.concentrazione[1], 3, 12), 25);
eq('CD conc. continuati 7', M.cdConcentrazione(D.concentrazione[2], 3, 7), 16);
eq('serve d20', M.servePerCD(13, 21), 8);

// raggi, durate, formule
eq('raggio medio 7', M.raggio(pf.r, 7), '51 m');
eq('raggio vicino 7', M.raggio('vicino (7,5 m + 1,5 m/2 livelli)', 7), '12 m');
eq('raggio vicino 7 ingrandito', M.raggio('vicino (7,5 m + 1,5 m/2 livelli)', 7, 2), '24 m');
eq('raggio lungo 10', M.raggio('lungo (120 m + 12 m/livello)', 10), '240 m');
eq('durata 1 round/livello', M.durata('1 round/livello', 7).testo, '7 round');
eq('durata 10 minuti/livello (I)', M.durata('10 minuti/livello (I)', 3).testo, '30 minuti (I)');
eq('durata 1 ora/livello estesa', M.durata('1 ora/livello', 5, 2).testo, '10 ore');
eq('durata in round', M.durataRound('1 minuto/livello', 4), 40);
eq('durata conc + 1 round/livello', M.durataRound('Concentrazione + 1 round/livello', 4), 4);
eq('durata istantanea', M.durataRound('istantanea', 4), null);
eq('durata 1 round + 1 round/livello', M.durataRound('1 round + 1 round/livello', 4), 5);
eq('tempo 70 min', M.tempoTesto(700), '70 minuti');
eq('Palla di fuoco LI 7', formule('Palla di fuoco', 7), ['7d6']);
eq('Palla di fuoco LI 12', formule('Palla di fuoco', 12), ['10d6']);
eq('Palla di fuoco intensa LI 14', formule('Palla di fuoco', 14, { intensi: true }), ['14d6']);
eq('Palla di fuoco massimizzata 7', formule('Palla di fuoco', 7, { massimizzati: true }), ['42']);
eq('Palla di fuoco potenziata 7', formule('Palla di fuoco', 7, { potenziati: true }), ['7d6 (+50%)']);
eq('Palla di fuoco pot+max', formule('Palla di fuoco', 7, { potenziati: true, massimizzati: true }), ['42 + metà di 7d6']);
eq('Dardo incantato LI 7', formule('Dardo incantato', 7), ['1d4+1', '4 dardi']);
eq('Dardo incantato LI 1', formule('Dardo incantato', 1), ['1d4+1', '1 dardo']);
eq('Cura ferite leggere LI 3', formule('Cura ferite leggere', 3)[0], '1d8+3');
eq('Cura ferite leggere LI 9', formule('Cura ferite leggere', 9)[0], '1d8+5');
eq('Lama infuocata LI 9', formule('Lama infuocata', 9)[0], '1d8+4');

// più colpi, bonus e altezze (Massy, 18/11)
const conColpi = (n, li, meta) => formule(n, li, Object.assign({ colpi: M.colpi(S(n), li) }, meta || {}));
eq('Dardo incantato LI 9', conColpi('Dardo incantato', 9), ['5 × 1d4+1', '5 dardi']);
eq('Dardo incantato LI 2', conColpi('Dardo incantato', 2), ['1d4+1', '1 dardo']);
eq('Raggio di fuoco LI 6/7/11/20', [6, 7, 11, 20].map(li => conColpi('Raggio di fuoco', li)), [['1 raggio', '3d6'], ['2 raggi', '2 × 3d6'], ['3 raggi', '3 × 3d6'], ['3 raggi', '3 × 3d6']]);
eq('Saetta LI 11 massimizzata', conColpi('Saetta', 11, { massimizzati: true }), ['3 raggi', '3 × 18']);
eq('Raggio accecante LI 7', conColpi('Raggio accecante', 7), ['2 raggi', '2 × 3d4']);
eq('Shuriken ardente LI 15', conColpi('Shuriken ardente', 15), ['8 shuriken', '8 × 1d8']);
eq('Fulmine globulare LI 15', conColpi('Fulmine globulare', 15), ['4 globi', '4 × 3d6']);
eq('Scuotiossa LI 7', formule('Scuotiossa', 7), ['6d6']);
eq('Scudo della fede LI 6/18', [6, 18, 20].map(li => formule('Scudo della fede', li)[0]), ['+3', '+5', '+5']);
eq('Pelle coriacea LI 3/6/12', [3, 6, 12].map(li => formule('Pelle coriacea', li)[0]), ['+2', '+3', '+5']);
eq('Passapareti LI 9/12/20', [9, 12, 20].map(li => formule('Passapareti', li)[0]), ['3 m', '4,5 m', '7,5 m']);
eq('Geyser d\'aria LI 7', formule('Geyser d’aria', 7), ['10,5 m · caduta 3d6']);
eq('Geyser LI 10', formule('Geyser', 10), ['15 m · caduta 5d6']);
eq('Corrente ascensionale LI 12', formule('Corrente ascensionale', 12), ['15 m · caduta 5d6']);
eq('Cometa LI 9', formule('Cometa', 9), ['8d6 (13,5 m)']);
eq('Fossa con spuntoni', formule('Fossa con spuntoni', 5), ['9 m · caduta 3d6']);
// tiri
const sempre = (v => () => v);
eq('tira 3 × 1d4+1', M.tiraValore('3 × 1d4+1', sempre(0.99)), { tot: 15, colpi: [5, 5, 5], tiri: [4, 4, 4], ritirati: 0 });
eq('tira potenziato', M.tiraValore('2d6 (+50%)', sempre(0)).tot, 3);
eq('tira pot+max', M.tiraValore('12 + metà di 2d6', sempre(0.99)).tot, 18);
eq('tira caduta', M.tiraValore('9 m · caduta 3d6', sempre(0)).tot, 3);
eq('tira 3 × 18', M.tiraValore('3 × 18').tot, 54);
eq('tirabile', ['7d6', '3 × 18', '42', '+3', '4 dardi'].map(M.tirabile), [true, true, false, false, false]);

// metamagia
const T = n => D.metamagia.find(t => t.n === n);
eq('slot estesi+potenziati liv 3', M.incrementi([T('Incantesimi Estesi'), T('Incantesimi Potenziati')], pf, ctx, null, 3), 6);
eq('riduzione', M.incrementi([T('Incantesimi Massimizzati')], pf, Object.assign({}, ctx, { bonus: [{ ambito: 'meta', filtro: { tipo: 'incantesimo', v: 'palla di fuoco' }, valore: 1 }] }), null, 3), 5);
eq('intensificati a 5', M.incrementi([T('Incantesimi Intensificati')], pf, ctx, 5, 3), 5);
eq('compatibile estesi Palla di fuoco', M.compatibile(T('Incantesimi Estesi'), pf), false);
eq('compatibile ingranditi Palla di fuoco', M.compatibile(T('Incantesimi Ingranditi'), pf), true);
eq('compatibile elementali Palla di fuoco', M.compatibile(T('Incantesimi Elementali'), pf), true);
eq('compatibile silenziosi', M.compatibile(T('Incantesimi Silenziosi'), pf), true);

// lancio e oggetti
eq('non preparato 2 slot', M.slotDaSpendere({ 2: 1, 3: 2 }, 2, 2), [2, 3]);
eq('non preparato senza slot', M.slotDaSpendere({ 2: 1 }, 2, 2), null);
eq('reagenti', [100, 300, 700, 5000].map(c => M.reagente(c).per), ['giorno', 'giorno', 'settimana', 'lancio']);
eq('tiro R', M.tiroRicerca(5, [1, 2, 3, 4], () => 0.1), 5);
eq('pergamena liv 3', [M.liMinimo(3), M.cdOggetto(3, true), M.cdUcmPergamena(5)], [5, 15, 25]);
eq('cure con cariche', ['Cura ferite gravi', 'Cura ferite leggere contingente', 'Cura ferite minori contingente', 'Cura ferite leggere di massa', 'Condotto vitale'].map(M.curaConCariche), [true, true, true, false, false]);
eq('sovraccarico', [M.cdSovraccarico(3, 9), M.servePerCD(9, M.cdSovraccarico(3, 9)), M.cdSovraccarico(0, 1)], [19, 10, 8]);
eq('cariche al giorno', [M.caricheMax('Dardo incantato'), M.caricheMax('Dardo incantato', 3), M.caricheMax('Cura ferite moderate'), M.caricheMax('Cura ferite moderate', 2), M.caricheMax('Cura ferite critiche', 9), M.caricheMax('Cura ferite gravi', 0)], [1, 1, 3, 2, 3, 3]);

// Venti della magia (design v6 §15)
const V = D.venti, voce = (L, n) => V.tab[L][n - 1];
eq('venti: 9 tabelle da 12', Object.keys(V.tab).map(L => V.tab[L].length), [12, 12, 12, 12, 12, 12, 12, 12, 12]);
eq('venti: niente Warp', JSON.stringify(V).includes('Warp'), false);
eq('forzare per livello', [1, 5, 6, 10, 11, 15, 16, 20].map(M.maxForzare), [1, 1, 2, 2, 3, 3, 4, 4]);
eq('soglia senza forzare', M.sogliaVenti([], {}), 1);
eq('soglia +1 CD e −5 RI (manuale: 1–9)', M.sogliaVenti(['cd', 'ri'], {}), 9);
eq('soglia massima', M.sogliaVenti(['focus', 'cd', 'ri', 'rit12'], {}), 14);
eq('soglia con prova 1–2', M.sogliaVenti(['rit1'], { prova12: true }), 4);
eq('soglia con niente prova', M.sogliaVenti(['cd'], { noProva: true }), 0);
eq('malus d12', [M.malusVenti(['focus'], {}), M.malusVenti(['cd', 'ri'], {}), M.malusVenti(['rit12'], { malus: 2 })], [0, 3, 4]);
eq('esito 20', M.esitoVenti(20, 1), { e: 'libero' });
eq('esito 19 con Essenza', M.esitoVenti(19, 1, { essenza: true }), { e: 'libero', essenza: true });
eq('esito 19 senza Essenza', M.esitoVenti(19, 1, {}), { e: 'normale' });
eq('esito 20 bacchetta', M.esitoVenti(20, 1, { oggetto: true, essenza: true }), { e: 'normale' });
eq('esito 9 con soglia 9', M.esitoVenti(9, 9), { e: 'prova' });
eq('esito 1 senza prova', M.esitoVenti(1, 0), { e: 'normale' });
eq('prova: serve', M.servePerCD(9, M.cdProvaVenti(5)), 11);
eq('manifestazione normale', M.manifestazione(3, 7, 2), { L: 3, n: 5 });
eq('manifestazione sale', M.manifestazione(3, 2, 2), { sali: 4 });
eq('manifestazione al 9°', M.manifestazione(9, 1, 3), { L: 9, n: 1 });
eq('danni 1° LI 1/9/20', [1, 9, 20].map(li => M.danniVenti(voce(1, 2).dv, li)), ['1d6', '4d6', '5d6']);
eq('danni 3° LI 7, 9° LI 25', [M.danniVenti(voce(3, 2).dv, 7), M.danniVenti(voce(9, 2).dv, 25)], ['7d6', '20d12']);
eq('danni come la voce 2 (7°/6)', M.danniVenti(voce(7, 6).dv, 14), '14d10');
eq('slot del lancio', [M.slotLancio(false), M.slotLancio(true), M.slotLancio(false, false, true), M.slotLancio(true, false, true), M.slotLancio(false, true), M.slotLancio(true, true), M.slotLancio(false, true, true), M.slotLancio(true, true, true)], [1, 2, 0, 1, 2, 3, 1, 2]);
eq('durate', [M.durataEffetto({ u: 'giorni' }, 3), M.durataEffetto({ u: 'giorni', x: 7 }, 2), M.durataEffetto({ u: 'ore' }, 24), M.durataEffetto({ u: 'mesi' }, 2), M.durataEffetto({ u: 'riposi' }, 2), M.durataEffetto({ u: 'round' }, 1)],
  [{ riposi: 3 }, { riposi: 14 }, { fine: 'riposo' }, { fine: 'termina' }, { riposi: 2 }, { fine: 'subito' }]);
eq('ritardo in round', [M.roundRitardo(3, 'round'), M.roundRitardo(4, 'minuti'), M.roundRitardo(2, 'ore')], [3, 40, 1200]);
eq('livello più alto', M.livelloPiuAlto({ 0: 4, 1: 3, 2: 2, 3: 0, 4: null }), 2);
eq('tipi applicati', [voce(2, 4).app, voce(4, 12).app, voce(5, 12).app, voce(7, 12).app, voce(9, 12).app, voce(7, 4).app, voce(9, 5).app, voce(9, 3).app],
  [{ perdi: 1 }, { meta: 'estesi' }, { meta: 'potenziati', alt: 'estesi' }, { meta: 'massimizzati', alt: 'noSlot' }, { noSlot: true, meta: 'massimizzati', noProva: true }, { doppi: true }, { prova12: true, malus: 2 }, { perso: true }]);
eq('dove', [voce(1, 8).dove, voce(3, 5).dove, voce(6, 5).dove, voce(9, 1).dove, voce(7, 9).dove], [['attivi'], ['effetti'], ['applica', 'effetti'], ['testo'], ['testo']]);
eq('partono', [1, 2, 3, 4, 5, 6, 7, 8, 9].map(L => V.tab[L].filter(v => v.parte).map(v => v.n).join(',')),
  ['6,7,8,12', '6,7,8,12', '6,7,8,12', '6,7,8,12', '6,7,8,12', '6,7,8,12', '7,8,12', '6,7,8,12', '7,8,12']);
eq('ritiri: 1 ritirato una volta', (() => { const s = [0, 0.99]; let i = 0; return M.tira('1d6', () => s[i++], 1); })(), { tot: 6, tiri: [6], ritirati: 1 });
eq('ritiri: il secondo 1 resta', (() => { let i = 0; return M.tira('1d6', () => 0, 2); })(), { tot: 1, tiri: [1], ritirati: 1 });

// copertura dei dati
const conFormula = D.schede.filter(s => s.desc.some(p => p.f)).length;
let rotte = 0;
for (const s of D.schede) for (const p of s.desc) for (const f of p.f || []) { const r = M.formula(f, 10, { colpi: M.colpi(s, 10) }); if (!r || /NaN|undefined/.test(r)) rotte++; }
eq('formule rotte', rotte, 0);
let rg = 0; for (const s of D.schede) if (/^(vicino|medio|lungo)/.test(s.r || '') && !M.raggio(s.r, 5)) rg++;
eq('raggi non calcolati', rg, 0);
console.log(`test: ${ok} ok, ${ko} errori · schede con formule: ${conFormula}`);
process.exit(ko ? 1 : 0);
