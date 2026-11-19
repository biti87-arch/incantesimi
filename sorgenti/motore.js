// Motore di calcolo del Libro degli incantesimi: funzioni pure, testate da test_motore.js.
// Riferimenti: design doc (Incantesimi_app_design_v2.md), Vol. 4 2.4.1 Cap. 1, Vol. 3 (metamagia, oggetti).
const Motore = (function () {
  let D = null;                       // dati di incantesimi.json
  const imposta = d => { D = d; };

  // ---------------------------------------------------------------- caratteristica e slot
  const modCar = p => Math.floor(p / 2) - 5;
  const rigaBonus = p => D.bonus.find(r => p >= r.da && p <= r.a) || D.bonus[D.bonus.length - 1];
  // incantesimi bonus da caratteristica per un livello di magia (0 = come il 1°, se la classe lo prevede)
  function bonusCar(classe, punteggio, L) {
    const r = rigaBonus(punteggio);
    if (r.no) return 0;
    if (L === 0) return D.classi[classe].bonus0 ? r.b[0] : 0;
    return r.b[L - 1] || 0;
  }
  const cella = (tab, livello, L) => {
    const riga = tab[String(livello)];
    if (!riga) return null;
    const v = riga[String(L)];
    if (v === undefined || v === '—' || v === '-' || v === '') return null;
    return v;
  };
  const livelliMagia = classe => ({ 9: [0,1,2,3,4,5,6,7,8,9], 6: [0,1,2,3,4,5,6], 4: [1,2,3,4] })[D.classi[classe].gruppo];
  const maxLivello = classe => D.classi[classe].gruppo;
  // requisito: punteggio almeno 10 + livello dell'incantesimo
  const requisito = (punteggio, L) => punteggio >= 10 + L;

  // slot al giorno per livello: tabella + bonus (solo dove la tabella ha un numero, anche 0) + extra dei bonus
  function slot(classe, livello, punteggio, extra) {
    const out = {};
    for (const L of livelliMagia(classe)) {
      const v = cella(D.gruppi[D.classi[classe].gruppo].lanciabili, livello, L);
      if (v === null) { out[L] = null; continue; }
      if (!requisito(punteggio, L)) { out[L] = 0; continue; }
      out[L] = parseInt(v, 10) + bonusCar(classe, punteggio, L) + ((extra && extra[L]) || 0);
    }
    return out;
  }
  // conosciuti dalla tabella: {L: {n, r}} (n comprende le R). Ogni «R» della colonna, dal 1° livello di classe
  // a quello attuale, dice che uno dei nuovi conosciuti di quel livello è di ricerca: le R si sommano
  // (Massy, 18/11: Stregone 10° → 12 di 1° livello, 5 R)
  function conosciuti(classe, livello, extra) {
    const out = {}, tab = D.gruppi[D.classi[classe].gruppo].conosciuti;
    for (const L of livelliMagia(classe)) {
      const v = cella(tab, livello, L);
      if (v === null) { if (extra && extra[L]) out[L] = { n: extra[L], r: 0 }; continue; }
      let r = 0;
      for (let l = 1; l <= livello; l++) if (/R/.test(cella(tab, l, L) || '')) r++;
      out[L] = { n: parseInt(v, 10) + ((extra && extra[L]) || 0), r };
    }
    return out;
  }
  const preparabili = (L, nConosciuti) => L === 0 ? nConosciuti : Math.ceil(nConosciuti / 2);
  const usiSlotSuperiore = punteggio => Math.max(1, Math.floor(modCar(punteggio) / 2));
  // sostituzioni: gruppi del 9° e del 6° al 4° e ai pari; gruppo del 4° al 7° e ogni 3 livelli
  function livelloSostituzione(classe, livello) {
    return D.classi[classe].gruppo === 4 ? (livello >= 7 && (livello - 7) % 3 === 0) : (livello >= 4 && livello % 2 === 0);
  }

  // ---------------------------------------------------------------- bonus permanenti
  // bonus: {ambito, filtro:{tipo:'tutti'|'scuola'|'descrittore'|'incantesimo', v}, valore, attivo, classe, modo}
  function siApplica(b, scheda, classe) {
    if (b.attivo === false) return false;
    if (b.classe && classe && b.classe !== classe) return false;
    const f = b.filtro || { tipo: 'tutti' };
    if (!f.tipo || f.tipo === 'tutti') return true;
    if (!scheda) return false;
    if (f.tipo === 'scuola') return scheda.scuola.toLowerCase() === String(f.v).toLowerCase();
    if (f.tipo === 'descrittore') return scheda.descr.some(x => x.toLowerCase() === String(f.v).toLowerCase());
    if (f.tipo === 'incantesimo') return scheda.k === f.v;
    return false;
  }
  const somma = (bonus, ambito, scheda, classe, cond) => (bonus || [])
    .filter(b => b.ambito === ambito && siApplica(b, scheda, classe) && (!cond || cond(b)))
    .reduce((a, b) => a + (Number(b.valore) || 0), 0);

  // ---------------------------------------------------------------- valori di un incantesimo
  // ctx: {classe, livello (di classe), punteggio, bonus[]}
  function LI(ctx, scheda) { return ctx.livello + somma(ctx.bonus, 'li', scheda, ctx.classe); }
  function CD(ctx, scheda, L) { return 10 + L + modCar(ctx.punteggio) + somma(ctx.bonus, 'cd', scheda, ctx.classe); }
  function RI(ctx, scheda, li) { return (li == null ? LI(ctx, scheda) : li) + somma(ctx.bonus, 'ri', scheda, ctx.classe); }
  // Concentrazione: modo 'difensiva' aggiunge i bonus «sulla difensiva e In Lotta»
  function concentrazione(ctx, scheda, difensiva, li) {
    return (li == null ? LI(ctx, scheda) : li) + modCar(ctx.punteggio) +
      somma(ctx.bonus, 'conc', scheda, ctx.classe, b => b.modo !== 'difensiva' || difensiva);
  }
  // CD della prova di Concentrazione per la riga i della tabella; x = danni, BMC o CD a seconda della riga
  function cdConcentrazione(riga, L, x) {
    const d = riga.d;
    x = Number(x) || 0;
    if (/difensiva/.test(d)) return 15 + 2 * L;
    if (/^Ferimento/.test(d)) return 10 + x + L;
    if (/continuati/.test(d)) return 10 + Math.floor(x / 2) + L;
    if (/Distratto/.test(d)) return x + L;
    if (/Lotta/.test(d)) return 10 + x + L;
    if (/estremamente/.test(d)) return 20 + L;
    if (/violento/.test(d)) return 15 + L;
    if (/vigoroso/.test(d)) return 10 + L;
    if (/pioggia/.test(d)) return 5 + L;
    if (/grandine/.test(d)) return 10 + L;
    if (/Intralciato/.test(d)) return 15 + L;
    return null;                       // «vedi l'incantesimo»
  }
  const servePerCD = (bonus, cd) => Math.max(1, Math.min(21, cd - bonus));   // 21 = impossibile

  // ---------------------------------------------------------------- testi calcolati
  const num = s => parseFloat(String(s).replace(',', '.'));
  const fmt = n => (Math.round(n * 100) / 100).toString().replace('.', ',');
  const PAROLE = { due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6 };
  const passi = (li, k) => Math.floor(li / (k || 1));

  // raggio: «medio (30 m + 3 m/livello)», «vicino (7,5 m + 1,5 m/2 livelli)», «3 m/livello»
  function raggio(testo, li, fattore) {
    if (!testo) return null;
    fattore = fattore || 1;
    const re = /(?:(\d+(?:,\d+)?) (m|km) \+ )?(\d+(?:,\d+)?) (m|km)\/(?:(\d+|due|tre) )?livell[oi]/;
    // vicino, medio e lungo: vale sempre la formula dell'etichetta (Vol. 4, Cap. 1), anche se la scheda la scrive diversa
    const g = (testo.match(/^(vicino|medio|lungo)/i) || [])[1];
    const m = (g ? RAGGI_STD[g.toLowerCase()] : testo).match(re);
    if (!m) return null;
    const k = m[5] ? (PAROLE[m[5]] || parseInt(m[5], 10)) : 1;
    const unita = m[4];
    let v = (m[1] ? num(m[1]) * (m[2] === 'km' && unita === 'm' ? 1000 : 1) : 0) + num(m[3]) * passi(li, k);
    v *= fattore;
    return fmt(v) + ' ' + unita;
  }
  // gradino del raggio per Incantesimi con Portata
  const GRADINI = ['contatto', 'vicino', 'medio', 'lungo'];
  const gradino = testo => { const t = (testo || '').toLowerCase(); return GRADINI.findIndex(g => t.startsWith(g)); };
  const RAGGI_STD = { vicino: '7,5 m + 1,5 m/2 livelli', medio: '30 m + 3 m/livello', lungo: '120 m + 12 m/livello' };

  // durata: ogni «N unità/livello» o «N unità/N livelli» è sostituita col valore calcolato
  const UNITA = { round: 1, minuto: 10, minuti: 10, ora: 600, ore: 600, giorno: 14400, giorni: 14400 };
  const SING = { round: 'round', minuto: 'minuto', minuti: 'minuto', ora: 'ora', ore: 'ora', giorno: 'giorno', giorni: 'giorno' };
  const PLUR = { round: 'round', minuto: 'minuti', ora: 'ore', giorno: 'giorni' };
  const unitaTesto = (n, u) => n + ' ' + (n === 1 ? SING[u] : PLUR[SING[u]]);
  const RE_DUR = /(\d+) (round|minut[oi]|or[ae]|giorn[oi])\/(?:(\d+|due|tre) )?livell[oi]/g;
  function durata(testo, li, fattore) {
    if (!testo) return { testo: '', round: null };
    fattore = fattore || 1;
    const nuovo = testo.replace(RE_DUR, (all, n, u, k) => {
      k = k ? (PAROLE[k] || parseInt(k, 10)) : 1;
      return unitaTesto(parseInt(n, 10) * Math.max(passi(li, k), 1) * fattore, u);
    });
    return { testo: nuovo, round: duratamRound(testo, li, fattore), cambiata: nuovo !== testo };
  }
  // durata principale in round (per gli incantesimi attivi): somma dei termini prima di « o », «;», «(»
  function duratamRound(testo, li, fattore) {
    const t = testo.toLowerCase();
    if (/^(istantanea|permanente|vedi)/.test(t)) return null;
    const testa = t.replace(/^concentrazione(,| \+)?\s*(fino a )?/, '').split(/ o |;|\(|,/)[0];
    let tot = 0, trovato = false;
    const re = /(\d+) (round|minut[oi]|or[ae]|giorn[oi])(?:\/(?:(\d+|due|tre) )?livell[oi])?/g;
    let m;
    while ((m = re.exec(testa))) {
      const perLiv = /\//.test(m[0]);
      const k = m[3] ? (PAROLE[m[3]] || parseInt(m[3], 10)) : 1;
      tot += parseInt(m[1], 10) * UNITA[m[2]] * (perLiv ? Math.max(passi(li, k), 1) * (fattore || 1) : (fattore || 1));
      trovato = true;
    }
    return trovato ? tot : null;
  }
  const concentrazioneDurata = testo => /^concentrazione/i.test(testo || '');
  const interrompibile = testo => /\(I\)/.test(testo || '');
  function tempoTesto(round) {
    if (round == null) return '';
    if (round < 10) return unitaTesto(round, 'round');
    if (round < 600) return round % 10 ? unitaTesto(round, 'round') : unitaTesto(round / 10, 'minuti');
    if (round < 14400) return round % 600 ? unitaTesto(Math.floor(round / 10), 'minuti') : unitaTesto(round / 600, 'ore');
    return round % 14400 ? unitaTesto(Math.floor(round / 600), 'ore') : unitaTesto(round / 14400, 'giorni');
  }

  // formula di una scheda → testo calcolato; meta: {potenziati, massimizzati, intensi}
  function formula(f, li, meta) {
    meta = meta || {};
    if (f.t === 'd') {
      let max = f.max;
      if (max != null && meta.intensi) max += Math.floor(5 * f.n / f.k);
      // base: dadi fissi in più («3d6 danni più 1d6 aggiuntivi per ogni 2 livelli»)
      let n = f.base ? f.n * passi(li, f.k) : f.n * Math.max(passi(li, f.k), 1);
      if (max != null) n = Math.min(n, max);
      n += f.base || 0;
      return perColpo(f, meta, dadi(n, f.f, bonusDanni(meta, n), meta));
    }
    if (f.t === 'k') {                 // danni di un colpo, moltiplicati per il numero di colpi
      const m = f.dadi.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
      const n = +m[1];
      return perColpo(f, meta, dadi(n, +m[2], (+m[3] || 0) + bonusDanni(meta, n), meta));
    }
    if (f.t === 'm') {                 // misura in metri, con i danni da caduta
      const v = conteggio(f, li);
      if (!f.cad) return fmt(v) + ' m';
      let n = f.cad.n * Math.floor(v / f.cad.ogni);
      if (f.cad.max != null) n = Math.min(n, f.cad.max);
      const dd = n ? (f.fmt === 'danni' ? dadi(n, f.cad.f, 0, meta) : n + 'd' + f.cad.f) : 'nessun danno';
      return f.fmt === 'danni' ? dd + ' (' + fmt(v) + ' m)' : fmt(v) + ' m · caduta ' + dd;
    }
    if (f.t === 'p') {
      const [n, fa] = f.dadi.split('d').map(Number);
      let max = f.max;
      if (max != null && meta.intensi) max += Math.floor(5 * f.p / f.k);
      let p = f.p * passi(li, f.k);
      if (max != null) p = Math.min(p, max);
      if (fa === 20) return '1d20+' + p;
      return perColpo(f, meta, dadi(n, fa, p + bonusDanni(meta, n), meta));
    }
    if (f.t === 'c') {
      const n = conteggio(f, li);
      return (f.pre || '') + fmt(n) + (f.u ? ' ' + (n === 1 && SINGOLARE[f.u] || f.u) : '');
    }
    return '';
  }
  const SINGOLARE = { dardi: 'dardo', raggi: 'raggio', globi: 'globo', catene: 'catena', rimbalzi: 'rimbalzo' };
  // a + p·⌊(LI − da)/k⌋, al massimo max (colpi, bonus e misure che crescono col livello)
  function conteggio(f, li) {
    let n = f.a + (f.p == null ? 1 : f.p) * Math.floor(Math.max(li - (f.da || 0), 0) / f.k);
    if (f.max != null) n = Math.min(n, f.max);
    return n;
  }
  // numero di colpi di una scheda (Dardo incantato, Raggio di fuoco…): 1 se non ne ha
  function colpi(s, li) {
    for (const p of s.desc) for (const f of p.f || []) if (f.t === 'c' && f.colpi) return conteggio(f, li);
    return 1;
  }
  const perColpo = (f, meta, testo) => (f.t === 'k' || f.pc) && (meta.colpi || 1) > 1 ? meta.colpi + ' × ' + testo : testo;
  // bonus di danno (ambito «danni»): fissi + per dado; meta.danni = {fissi, dado}
  const bonusDanni = (meta, n) => meta.danni ? (meta.danni.fissi || 0) + (meta.danni.dado || 0) * n : 0;
  function dadi(n, f, piu, meta) {
    const base = n + 'd' + f + (piu ? '+' + piu : '');
    if (meta.massimizzati && meta.potenziati) return (n * f + piu) + ' + metà di ' + base;
    if (meta.massimizzati) return String(n * f + piu);
    if (meta.potenziati) return base + ' (+50%)';
    return base;
  }

  // ---------------------------------------------------------------- metamagia
  // talenti scelti → slot necessario; riduz: {nomeTalento: −N} dai bonus «Incremento di metamagia»
  function incrementi(talenti, scheda, ctx, intensificatoA, L) {
    let tot = 0;
    for (const t of talenti) {
      if (t.eff === 'intensificati') continue;
      let inc = t.inc || 0;
      const rid = (ctx.bonus || []).filter(b => b.ambito === 'meta' && siApplica(b, scheda, ctx.classe) &&
        (!b.talento || b.talento === t.n)).reduce((a, b) => a + (Number(b.valore) || 0), 0);
      tot += Math.max(0, inc - rid);
    }
    const base = intensificatoA != null ? Math.max(intensificatoA, L) : L;
    return base + tot;
  }
  // compatibilità di un talento con una scheda (design E6)
  function compatibile(t, s) {
    switch (t.eff) {
      case 'estesi': return RE_DUR_TEST.test(s.d || '') && !/^(istantanea|permanente|concentrazione)/i.test(s.d || '');
      case 'ingranditi': return /^(vicino|medio|lungo)/i.test(s.r || '');
      case 'ampliati': return !!s.a;
      case 'potenziati': case 'massimizzati': case 'intensi':
        return s.desc.some(p => p.f && p.f.some(f => f.t !== 'c')) || s.desc.some(p => /\d+d\d+/.test(p.t));
      case 'portata': { const g = gradino(s.r); return g >= 0 && g < 3; }
      case 'silenziosi': return /\bV\b/.test(s.c || '');
      case 'immobili': return /\bS\b/.test(s.c || '');
      case 'elementali': return s.descr.some(x => /^(acido|elettricità|fuoco|freddo)$/i.test(x));
      case 'penetranti': return /sì/i.test(s.ri || '');
      default: return true;
    }
  }
  const RE_DUR_TEST = /\/(?:\d+ |due |tre )?livell/;

  // ---------------------------------------------------------------- lancio
  // slotLiberi: {L: liberi}; restituisce i livelli degli slot da spendere o null
  function slotDaSpendere(slotLiberi, L, quanti, minimo) {
    const scelti = [];
    const liberi = Object.assign({}, slotLiberi);
    for (let l = Math.max(L, minimo || 0); l <= 9 && scelti.length < quanti; l++) {
      while ((liberi[l] || 0) > 0 && scelti.length < quanti) { liberi[l]--; scelti.push(l); }
    }
    return scelti.length === quanti ? scelti : null;
  }
  // reagenti (componenti M con costo): usi gratuiti
  function reagente(costo) {
    if (!costo) return null;
    if (costo <= 250) return { per: 'giorno', usi: 2 };
    if (costo <= 500) return { per: 'giorno', usi: 1 };
    if (costo <= 999) return { per: 'settimana', usi: 1 };
    return { per: 'lancio', usi: 0, costo };
  }

  // ---------------------------------------------------------------- Venti della magia (regola opzionale, design v6 §15)
  // potenziamenti di Forzare i Venti: 1/2/3/4 dal 1°/6°/11°/16° livello nelle classi incantatrici (sommati)
  const maxForzare = liv => liv >= 16 ? 4 : liv >= 11 ? 3 : liv >= 6 ? 2 : liv >= 1 ? 1 : 0;
  const potenziamento = k => D.venti.forzare.find(f => f.k === k) || { scatta: 0, d12: 0 };
  // il tiro dei Venti fa scattare la prova con 1..soglia (0 = mai); eff = effetti dei Venti in corso {prova12, noProva, malus}
  function sogliaVenti(forzati, eff) {
    if (eff && eff.noProva) return 0;
    return (eff && eff.prova12 ? 2 : 1) + (forzati || []).reduce((a, k) => a + potenziamento(k).scatta, 0);
  }
  const malusVenti = (forzati, eff) => ((eff && eff.malus) || 0) + (forzati || []).reduce((a, k) => a + potenziamento(k).d12, 0);
  // esito del d20: 'libero' (20; 19 con l'Essenza di acciaio arcano pronta), 'prova', 'normale';
  // con le bacchette (oggetto) il 20 non ha effetto e l'Essenza non scatta (W1)
  function esitoVenti(d20, soglia, opz) {
    opz = opz || {};
    if (d20 === 20 && !opz.oggetto) return { e: 'libero' };
    if (d20 === 19 && opz.essenza && !opz.oggetto && soglia < 19) return { e: 'libero', essenza: true };
    if (d20 <= soglia) return { e: 'prova' };
    return { e: 'normale' };
  }
  // prova di incantatore: 1d20 + LI contro CD 15 + livello dell'incantesimo
  const cdProvaVenti = L => 15 + L;
  // un passo della manifestazione: d12 − malus; con 0 o meno si ritira 1d12 senza modificatori sulla tabella
  // successiva ({sali}); al 9° si applica il risultato 1
  function manifestazione(L, d12, malus) {
    const r = d12 - (malus || 0);
    if (r >= 1) return { L, n: Math.min(12, r) };
    if (L >= 9) return { L: 9, n: 1 };
    return { sali: L + 1 };
  }
  // danni delle manifestazioni sul livello di incantatore: n dadi ogni k livelli, minimo 1 dado, massimo max
  const danniVenti = (dv, li) => Math.max(1, Math.min(dv.max, dv.n * Math.floor(li / dv.k))) + 'd' + dv.f;
  // slot spesi da un lancio: 1 (preparato) o 2 (non preparato); con l'effetto «slot doppi» 2 o 3;
  // il 20 (e lo slot non consumato delle manifestazioni) ne fa risparmiare uno (W4)
  const slotLancio = (nonPrep, doppi, libero) => (nonPrep ? 2 : 1) + (doppi ? 1 : 0) - (libero ? 1 : 0);
  // durata di un effetto dei Venti, con la quantità già tirata: {riposi: N} (giorni: −1 a ogni Riposo),
  // {fine: 'riposo'} (minuti e ore), {fine: 'termina'} (mesi e per sempre), {fine: 'subito'} (round)
  function durataEffetto(dur, q) {
    if (!dur) return { fine: 'termina' };
    if (dur.u === 'round') return { fine: 'subito' };
    if (dur.u === 'minuti' || dur.u === 'ore') return { fine: 'riposo' };
    if (dur.u === 'giorni') return { riposi: q * (dur.x || 1) };
    if (dur.u === 'riposi') return { riposi: q };
    return { fine: 'termina' };
  }
  // ritardo in round di un incantesimo inceppato (round, minuti, ore)
  const roundRitardo = (q, u) => q * ({ round: 1, minuti: 10, ore: 600 }[u] || 1);
  // quantità di una durata: «1d4» tirato, «24» fisso
  const quantita = (q, rnd) => /d/.test(q) ? tira(q, rnd).tot : (+q || 0);
  // livello più alto con slot (per «Perdi per sempre 1 slot del livello più alto che hai»)
  function livelloPiuAlto(tot) { let m = null; for (const L in tot) if (+L > 0 && tot[L] > 0) m = m == null ? +L : Math.max(m, +L); return m; }

  // ---------------------------------------------------------------- incantesimi di ricerca
  // numeri della lista già occupati → numero tirato (1-based) fra quelli liberi; rnd ∈ [0,1)
  function tiroRicerca(lunghezza, occupati, rnd) {
    const liberi = [];
    for (let i = 1; i <= lunghezza; i++) if (!occupati.includes(i)) liberi.push(i);
    if (!liberi.length) return null;
    // si tira sulla numerazione intera e si ritira se esce un incantesimo già conosciuto
    let tiro, prove = 0;
    do { tiro = 1 + Math.floor((rnd ? rnd() : Math.random()) * lunghezza); prove++; } while (occupati.includes(tiro) && prove < 500);
    return occupati.includes(tiro) ? liberi[0] : tiro;
  }

  // ---------------------------------------------------------------- oggetti
  const liMinimo = L => Math.max(1, 2 * L - 1);
  const cdOggetto = (L, ritrovato) => 10 + L + Math.floor(L / 2) + (ritrovato ? 1 : 0);
  const cdUcmPergamena = li => 20 + li;
  const CD_UCM_BACCHETTA = 20;
  // Vol. 3, Numero di cariche: 1 carica al giorno, rinnovata all'alba (nell'app: Riposo);
  // le bacchette di tipo «Cura» (fra lo 0 e il 4°) fino a 3 cariche, scelte quando si aggiunge la bacchetta
  const curaConCariche = nome => /^Cura ferite (minori contingente|(leggere|moderate|gravi|critiche)( contingente)?)$/i.test(nome || '');
  // Vol. 3, Sovraccaricare una bacchetta: prova di incantatore (1d20 + LI) con CD 7 + livello dell'incantesimo + LI dell'utilizzatore
  const cdSovraccarico = (L, li) => 7 + L + li;
  const caricheMax = (nome, scelta) => curaConCariche(nome) ? Math.min(3, Math.max(1, Math.floor(+scelta) || 3)) : 1;

  // ---------------------------------------------------------------- dadi
  // rit (Forzare i Venti): i risultati fino a rit (1 o 2) si ritirano una volta e si tiene il secondo
  function tira(espr, rnd, rit) {
    rnd = rnd || Math.random;
    const m = String(espr).match(/^(\d+)d(\d+)(?:\+(\d+))?/);
    if (!m) return null;
    let tot = 0, ritirati = 0; const tiri = [];
    for (let i = 0; i < +m[1]; i++) {
      let r = 1 + Math.floor(rnd() * +m[2]);
      if (rit && r <= rit) { r = 1 + Math.floor(rnd() * +m[2]); ritirati++; }
      tiri.push(r); tot += r;
    }
    return { tot: tot + (+m[3] || 0), tiri, ritirati };
  }
  // tiro di un valore calcolato: «3 × 1d4+1», «7d6 (+50%)», «42 + metà di 7d6», «9 m · caduta 3d6», «10d6 (15 m)»
  // → {tot, colpi: [totale di ogni colpo], tiri: [dadi]} oppure null se non c'è niente da tirare
  const tirabile = espr => /\d+d\d+/.test(String(espr)) || /^\d+ × \d+$/.test(String(espr));
  function tiraValore(espr, rnd, rit) {
    let s = String(espr), n = 1;
    const mc = s.match(/^(\d+) × (.+)$/);
    if (mc) { n = +mc[1]; s = mc[2]; }
    const uno = () => {
      let m = s.match(/^(\d+) \+ metà di (\d+d\d+(?:\+\d+)?)/);
      if (m) { const r = tira(m[2], rnd, rit); return { tot: +m[1] + Math.floor(r.tot / 2), tiri: r.tiri, ritirati: r.ritirati }; }
      m = s.match(/\d+d\d+(?:\+\d+)?/);
      if (m) { const r = tira(m[0], rnd, rit); return { tot: /\(\+50%\)/.test(s) ? Math.floor(r.tot * 1.5) : r.tot, tiri: r.tiri, ritirati: r.ritirati }; }
      if (/^\d+$/.test(s)) return { tot: +s, tiri: [], ritirati: 0 };
      return null;
    };
    const out = { tot: 0, colpi: [], tiri: [], ritirati: 0 };
    for (let i = 0; i < n; i++) { const r = uno(); if (!r) return null; out.tot += r.tot; out.colpi.push(r.tot); out.tiri.push(...r.tiri); out.ritirati += r.ritirati; }
    return out;
  }

  return { imposta, modCar, bonusCar, slot, conosciuti, preparabili, usiSlotSuperiore, livelloSostituzione,
    livelliMagia, maxLivello, requisito, siApplica, somma, LI, CD, RI, concentrazione, cdConcentrazione, servePerCD,
    raggio, gradino, GRADINI, RAGGI_STD, durata, durataRound: duratamRound, concentrazioneDurata, interrompibile, tempoTesto,
    formula, incrementi, compatibile, slotDaSpendere, reagente, tiroRicerca, liMinimo, cdOggetto, cdUcmPergamena,
    CD_UCM_BACCHETTA, curaConCariche, caricheMax, cdSovraccarico, tira, tiraValore, tirabile, colpi, conteggio,
    maxForzare, potenziamento, sogliaVenti, malusVenti, esitoVenti, cdProvaVenti, manifestazione, danniVenti, slotLancio,
    durataEffetto, roundRitardo, quantita, livelloPiuAlto };
})();
if (typeof module !== 'undefined') module.exports = Motore;
