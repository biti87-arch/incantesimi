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
eq('Dardo incantato LI 7', formule('Dardo incantato', 7), ['4 dardi']);
eq('Dardo incantato LI 1', formule('Dardo incantato', 1), ['1 dardi']);
eq('Cura ferite leggere LI 3', formule('Cura ferite leggere', 3)[0], '1d8+3');
eq('Cura ferite leggere LI 9', formule('Cura ferite leggere', 9)[0], '1d8+5');
eq('Lama infuocata LI 9', formule('Lama infuocata', 9)[0], '1d8+4');

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
eq('cure con cariche', ['Cura ferite gravi', 'Cura ferite leggere contingente', 'Condotto vitale'].map(M.curaConCariche), [true, true, false]);

// copertura dei dati
const conFormula = D.schede.filter(s => s.desc.some(p => p.f)).length;
let rotte = 0;
for (const s of D.schede) for (const p of s.desc) for (const f of p.f || []) { const r = M.formula(f, 10); if (!r || /NaN|undefined/.test(r)) rotte++; }
eq('formule rotte', rotte, 0);
let rg = 0; for (const s of D.schede) if (/^(vicino|medio|lungo)/.test(s.r || '') && !M.raggio(s.r, 5)) rg++;
eq('raggi non calcolati', rg, 0);
console.log(`test: ${ok} ok, ${ko} errori · schede con formule: ${conFormula}`);
process.exit(ko ? 1 : 0);
