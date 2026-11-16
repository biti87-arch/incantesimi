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
  // conosciuti dalla tabella: {L: {n, r}} (n comprende la R)
  function conosciuti(classe, livello, extra) {
    const out = {};
    for (const L of livelliMagia(classe)) {
      const v = cella(D.gruppi[D.classi[classe].gruppo].conosciuti, livello, L);
      if (v === null) { if (extra && extra[L]) out[L] = { n: extra[L], r: 0 }; continue; }
      out[L] = { n: parseInt(v, 10) + ((extra && extra[L]) || 0), r: /R/.test(v) ? 1 : 0 };
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
      let n = f.n * Math.max(passi(li, f.k), 1);
      if (max != null) n = Math.min(n, max);
      return dadi(n, f.f, bonusDanni(meta, n), meta);
    }
    if (f.t === 'p') {
      const [n, fa] = f.dadi.split('d').map(Number);
      let max = f.max;
      if (max != null && meta.intensi) max += Math.floor(5 * f.p / f.k);
      let p = f.p * passi(li, f.k);
      if (max != null) p = Math.min(p, max);
      if (fa === 20) return '1d20+' + p;
      return dadi(n, fa, p + bonusDanni(meta, n), meta);
    }
    if (f.t === 'c') {
      let n = f.a + Math.floor(Math.max(li - f.da, 0) / f.k);
      if (f.max != null) n = Math.min(n, f.max);
      return n + ' ' + f.u;
    }
    return '';
  }
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
  const curaConCariche = nome => /^Cura ferite (leggere|moderate|gravi|critiche)( contingente)?$/i.test(nome || '');

  // ---------------------------------------------------------------- dadi
  function tira(espr, rnd) {
    rnd = rnd || Math.random;
    const m = String(espr).match(/^(\d+)d(\d+)(?:\+(\d+))?/);
    if (!m) return null;
    let tot = 0; const tiri = [];
    for (let i = 0; i < +m[1]; i++) { const r = 1 + Math.floor(rnd() * +m[2]); tiri.push(r); tot += r; }
    return { tot: tot + (+m[3] || 0), tiri };
  }

  return { imposta, modCar, bonusCar, slot, conosciuti, preparabili, usiSlotSuperiore, livelloSostituzione,
    livelliMagia, maxLivello, requisito, siApplica, somma, LI, CD, RI, concentrazione, cdConcentrazione, servePerCD,
    raggio, gradino, GRADINI, RAGGI_STD, durata, durataRound: duratamRound, concentrazioneDurata, interrompibile, tempoTesto,
    formula, incrementi, compatibile, slotDaSpendere, reagente, tiroRicerca, liMinimo, cdOggetto, cdUcmPergamena,
    CD_UCM_BACCHETTA, curaConCariche, tira };
})();
if (typeof module !== 'undefined') module.exports = Motore;
