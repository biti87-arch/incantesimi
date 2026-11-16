"""Legge i testi estratti da estrai_testo.py e scrive sorgenti/incantesimi.json.
Fonti (in sorgenti/docx/, nomi nelle costanti qui sotto):
- Vol. 4: schede (Cap. 3 + concessi dai privilegi), liste numerate (Cap. 2), tabelle del Cap. 1
- Vol. 2: controllo delle tabelle di conosciuti e lanciabili di ogni classe contro quelle per gruppo
- Vol. 3: i talenti di metamagia della sezione «Talenti di Metamagia» (+ Incantesimo ingannatore)
- lavoro/metamagia_golarion.json (se c'è): i talenti di metamagia di golarion
Stampa solo conteggi e segnalazioni (anomalie del manuale: vanno lette)."""
import json, os, re, sys
R = os.path.dirname(os.path.abspath(__file__))
VOL4 = 'Vol. 4 - Libro degli incantesimi 2.4.1'
VOL2 = 'Vol. 2 - Classi 2.5.19'
VOL3 = 'Vol. 3 - Miscellanea 2.5.9'
GOLARION = os.path.join(R, 'metamagia_golarion.json')

def carica(n):
    return json.load(open(os.path.join(R, 'txt', n + '.json'), encoding='utf8'))

SEGN = []
def segnala(*a):
    SEGN.append(' '.join(str(x) for x in a))

def chiave(nome):
    s = nome.replace('◆', '').replace('’', "'").strip().lower()
    return re.sub(r'\s+', ' ', s)

# ---------------------------------------------------------------- classi (Vol. 2 2.5.19, design §2)
CLASSI = {
    'Arcanista':   {'car': ['Int'], 'gruppo': 9},
    'Druido':      {'car': ['Sag'], 'gruppo': 9},
    'Fattucchiere': {'car': ['Int'], 'gruppo': 9},
    'Necrarca':    {'car': ['Car'], 'gruppo': 9},
    'Oracolo':     {'car': ['Car'], 'gruppo': 9},
    'Sacerdote':   {'car': ['Sag', 'Car'], 'gruppo': 9},
    'Stregone':    {'car': ['Int', 'Car'], 'gruppo': 9},
    'Bardo':       {'car': ['Car'], 'gruppo': 6},
    'Convocatore': {'car': ['Car'], 'gruppo': 6},
    'Inquisitore': {'car': ['Sag'], 'gruppo': 6},
    'Magus':       {'car': ['Int'], 'gruppo': 6},
    'Sigillatore': {'car': ['Int'], 'gruppo': 6},
    'Guardia Nera': {'car': ['Car'], 'gruppo': 4},
    'Paladino':    {'car': ['Car'], 'gruppo': 4},
    'Ranger':      {'car': ['Sag'], 'gruppo': 4},
}
for c, d in CLASSI.items():
    d['bonus0'] = d['gruppo'] != 4      # Massy 16/11: anche Magus, Necrarca, Sigillatore

# ---------------------------------------------------------------- utilità per le tabelle
def tabella(P, i):
    """Righe della tabella che comincia al paragrafo i (paragrafi in cella, raggruppati per riga)."""
    righe, r0 = [], None
    while i < len(P) and P[i]['c']:
        if P[i]['r'] != r0:
            righe.append([]); r0 = P[i]['r']
        righe[-1].append(P[i]['t'].strip())
        i += 1
    return righe

def prossima_tabella(P, i):
    while not P[i]['c']:
        i += 1
    return i

def numero(s):
    s = s.strip().replace('R', '')
    return None if s in ('—', '-', '') else int(s)

# ---------------------------------------------------------------- Vol. 4
P = carica(VOL4)
titoli = {p['t']: i for i, p in enumerate(P) if p['o'] and not p['c']}

def cerca(t, da=0):
    for i in range(da, len(P)):
        if P[i]['t'].strip() == t and not P[i]['c']:
            return i
    sys.exit('non trovato nel Vol. 4: ' + t)

# tabella della Concentrazione
i = cerca('CD delle prove di Concentrazione')
conc = [{'d': r[0], 'cd': r[1]} for r in tabella(P, prossima_tabella(P, i))[1:]]
if len(conc) != 12: segnala('Concentrazione: righe', len(conc), '(attese 12)')

# tabelle per gruppo
gruppi = {}
for g in (9, 6, 4):
    i = cerca(f'Incantatori fino al {g}° livello di magia')
    classi_riga = P[i + 1]['t']
    for c, d in CLASSI.items():
        if (d['gruppo'] == g) != (c in classi_riga):
            segnala(f'gruppo {g}: la riga «{classi_riga}» non torna con la classe {c}')
    t1 = prossima_tabella(P, i)
    con = tabella(P, t1)
    j = t1
    while P[j]['c']: j += 1
    j = cerca('Incantesimi Lanciabili al Giorno', j)
    lan = tabella(P, prossima_tabella(P, j))
    def conv(rr):
        liv = [int(x) for x in rr[0][1:]]
        out = {}
        for r in rr[1:]:
            L = int(r[0].replace('°', ''))
            out[L] = {str(liv[k]): r[k + 1].strip() for k in range(len(liv))}
        return out
    gruppi[g] = {'conosciuti': conv(con), 'lanciabili': conv(lan)}
    if len(gruppi[g]['conosciuti']) != {9: 20, 6: 20, 4: 17}[g] or len(gruppi[g]['lanciabili']) != len(gruppi[g]['conosciuti']):
        segnala(f'gruppo {g}: righe', len(gruppi[g]['conosciuti']), len(gruppi[g]['lanciabili']))

# tabella degli incantesimi bonus
i = cerca('Modificatori di caratteristica e incantesimi bonus')
bon = []
for r in tabella(P, prossima_tabella(P, i))[1:]:
    a, b = (r[0].split('–') + [r[0]])[:2]
    mod = int(r[1].replace('−', '-').replace('+', ''))
    vals = [numero(x) or 0 for x in r[2:]] if len(r) > 3 else [0] * 9
    bon.append({'da': int(a), 'a': int(b), 'mod': mod, 'b': (vals + [0] * 9)[:9], 'no': len(r) <= 3})
if len(bon) != 23: segnala('tabella bonus: righe', len(bon))

# liste del Cap. 2
liste = {}
i0 = cerca('Capitolo 2: Liste degli incantesimi')
i1 = cerca('Capitolo 3: Schede degli incantesimi', i0 + 1)
classe = None
i = i0
while i < i1:
    t = P[i]['t'].strip()
    m = re.match(r'Lista degli incantesimi da (.+)$', t)
    if m and not P[i]['c']:
        classe = m.group(1); liste[classe] = {}; i += 1; continue
    if classe and P[i]['c']:
        # riga d'intestazione con «Livello N» → la riga dopo ha gli elenchi in colonna
        riga = tabella(P, i)
        n = sum(len(r) for r in riga)
        livelli = []
        k = i
        r0 = None
        cur = None
        while k < i1 and P[k]['c']:
            tt = P[k]['t'].strip()
            ml = re.match(r'Livello (\d)$', tt)
            mn = re.match(r'(\d+)\. (.+)$', tt)
            if ml:
                livelli.append(int(ml.group(1)))
            elif mn:
                num = int(mn.group(1))
                if num == 1:
                    cur = livelli.pop(0)
                    liste[classe][cur] = []
                if num != len(liste[classe][cur]) + 1:
                    segnala(f'lista {classe} liv. {cur}: numero {num} fuori ordine')
                liste[classe][cur].append(mn.group(2).strip())
            k += 1
        i = k; continue
    i += 1
if sorted(liste) != sorted(CLASSI):
    segnala('liste del Cap. 2:', sorted(set(liste) ^ set(CLASSI)))

# schede
i0 = cerca('Capitolo 3: Schede degli incantesimi')
i1 = cerca('Appendice A: Modifiche di sistema', i0 + 1)
inizi = [i for i in range(i0, i1) if P[i + 1]['t'].startswith('Scuola:') and P[i]['h']]
CAMPI = {'Scuola': 's', 'Livello': 'l', 'Tempo di lancio': 'tl', 'Componenti': 'c', 'Raggio d’azione': 'r',
         'Bersaglio': 'b', 'Area': 'a', 'Effetto': 'e', 'Durata': 'd', 'Tiro Salvezza': 'ts',
         'Resistenza agli incantesimi': 'ri', 'Concesso da': 'cd'}
schede = []
sezione = None
sezioni = [(i, P[i]['t']) for i in range(i0, i1) if P[i]['o'] and not P[i]['c']]
for n, i in enumerate(inizi):
    fine = inizi[n + 1] if n + 1 < len(inizi) else i1
    sez = [t for (k, t) in sezioni if k < i][-1]
    nome = P[i]['t'].strip()
    s = {'n': nome.replace('◆', '').strip(), 'k': chiave(nome), 'mod': '◆' in nome,
         'concesso': sez == 'Incantesimi concessi dai privilegi'}
    j = i + 1
    while j < fine and P[j]['h'] and not P[j]['t'].startswith('Descrizione:'):
        for parte in P[j]['t'].split('  ·  '):
            m = re.match(r'([^:]+): (.*)$', parte.strip())
            if m and m.group(1) in CAMPI:
                s[CAMPI[m.group(1)]] = m.group(2).strip()
            else:
                segnala(f'{nome}: campo non riconosciuto «{parte[:60]}»')
        j += 1
    desc = []
    while j < fine:
        p = P[j]
        if p['o'] and not p['c']:
            break
        t = p['t']
        if t.startswith('Descrizione: '): t = t[13:]
        if t.strip():
            d = {'t': t}
            if p['c']: d['c'] = p['r']
            if p['l']: d['l'] = 1
            if t.startswith('◆ Modifica di sistema'): d['m'] = 1
            desc.append(d)
        j += 1
    s['desc'] = desc
    # livelli per classe
    lv, var = {}, {}
    if s.get('l', '—') not in ('—', ''):
        for blocco in s['l'].split(';'):
            mv = re.match(r'\s*([^:]+): (.*)$', blocco)
            dove = lv
            if mv:
                dove = var.setdefault(chiave(mv.group(1)), {'n': mv.group(1).strip(), 'lv': {}})['lv']
                blocco = mv.group(2)
            for parte in blocco.split(','):
                m = re.match(r'\s*(.+?) (\d)\b', parte)
                if m and m.group(1).strip() in CLASSI:
                    dove[m.group(1).strip()] = int(m.group(2))
                else:
                    segnala(f'{nome}: livello non riconosciuto «{parte.strip()}»')
    s['lv'] = lv
    if var: s['var'] = list(var.values())
    for k in ('s', 'l', 'tl', 'c', 'd'):
        if k not in s: segnala(f'{nome}: manca il campo {k}')
    schede.append(s)

print('schede', len(schede), 'concesse', sum(s['concesso'] for s in schede))
indice, varianti = {}, {}
for n, s in enumerate(schede):
    if s['k'] in indice: segnala('scheda doppia:', s['n'])
    indice[s['k']] = n
    for v in s.get('var', []):
        varianti[chiave(v['n'])] = (n, v)

# collega le liste alle schede e controlla i livelli
liste_idx = {}
for c, per in liste.items():
    liste_idx[c] = {}
    for L, nomi in per.items():
        out = []
        for nome in nomi:
            k = chiave(nome)
            if k in varianti:
                n, v = varianti[k]
                if v['lv'].get(c) != L:
                    segnala(f'lista {c} liv. {L}: «{nome}» ha nella scheda {c} {v["lv"].get(c)}')
                out.append([n, v['n']]); continue
            if k not in indice:
                segnala(f'lista {c} liv. {L}: «{nome}» senza scheda'); out.append(-1); continue
            s = schede[indice[k]]
            if s['lv'].get(c) != L:
                segnala(f'lista {c} liv. {L}: «{nome}» ha nella scheda {c} {s["lv"].get(c)}')
            out.append(indice[k])
        liste_idx[c][L] = out
for n, s in enumerate(schede):
    for c, L in s['lv'].items():
        if n not in liste_idx.get(c, {}).get(L, []):
            segnala(f'{s["n"]}: «{c} {L}» nella scheda ma non nella lista')
    for v in s.get('var', []):
        for c, L in v['lv'].items():
            if [n, v['n']] not in liste_idx.get(c, {}).get(L, []):
                segnala(f'{v["n"]}: «{c} {L}» nella scheda ma non nella lista')

# ---------------------------------------------------------------- dati derivati delle schede
def costo_reagente(comp):
    m = re.search(r'\bM(?:/FD)? \((.*)\)', comp or '')
    if not m: return 0
    v = [int(x.replace('.', '')) for x in re.findall(r'(\d[\d.]*) ?mo\b', m.group(1))]
    return max(v) if v else 0

PAROLE = {'due': 2, 'tre': 3, 'quattro': 4, 'cinque': 5, 'sei': 6}
INC = r'(?:dell’|di |d’)?incantatore'
NO_INC = r'(?! ?(?:di|dell’) ?incantesim)'
# dadi che crescono col livello: «1d6 [danni …] per livello dell’incantatore (massimo 10d6)»,
# «1d6 danni ogni due livelli dell’incantatore (massimo 5d6)», «1d4 DV di creature … per livello (massimo 20d4)»
RE_DADI = re.compile(r'(?P<n>\d+)d(?P<f>\d+)(?P<mezzo>[^.;()0-9+]{0,60}?) '
                     r'(?:per|ogni) (?:(?P<k>\d+|due|tre|quattro|cinque|sei) )?livell[oi]' + NO_INC + r'(?: ' + INC + r')?'
                     r'(?P<coda>[^.;()0-9]{0,40}?)(?:\(massimo (?P<max>\d+)d\d+[^)]*\))?')
# bonus piatto: «1d8 danni + 1 danno per livello dell’incantatore (massimo +5)», «+1 danno ogni 3 livelli (massimo +5…)»,
# «2d4 + il livello dell’incantatore (massimo 10)», «1d20 + livello dell’incantatore», «1d6+1 ogni 2 livelli (massimo 1d6+5)»
RE_PIATTO = re.compile(r'(?P<dadi>\d+d\d+)(?P<mezzo>[^.;()0-9+]{0,50}?) ?(?:\+|più) ?'
                       r'(?:(?P<p>\d+)(?P<mezzo2>[^.;()0-9]{0,35}?) (?:per|ogni) (?:(?P<k>\d+|due|tre|quattro|cinque) )?livell[oi]' + NO_INC + r'(?: ' + INC + r')?'
                       r'|(?:il )?(?:proprio )?(?:livello ' + INC + r'|livello di incantatore))'
                       r'(?P<coda>[^.;()0-9]{0,25}?)(?: ?\((?:massimo|max) \+?(?:\d+d\d+ ?\+ ?)?(?P<max>\d+)[^)]*\))?')

RE_MAX_D = re.compile(r'[^.;()]{0,50}?[ ,(](?:fino a un )?(?:massimo|max)(?: di)? (\d+)d\d+[^)]*?\)?')
RE_MAX_P = re.compile(r'[^.;()]{0,40}?[ ,(](?:fino a un )?(?:massimo|max)(?: di)? \+?(?:\d+d\d+ ?\+ ?)?(\d+)(?![d\d])[^)]*?\)?')

def formule(t):
    out = []
    for m in RE_DADI.finditer(t):
        k = m.group('k')
        k = 1 if not k else (PAROLE.get(k) or int(k))
        if 'oltre' in (m.group('coda') or '') or 'round' in m.group('mezzo'):
            continue
        f = {'t': 'd', 'i': m.start(), 'j': m.end(), 'n': int(m.group('n')), 'f': int(m.group('f')), 'k': k,
             'max': int(m.group('max')) if m.group('max') else None}
        if f['max'] is None:
            mm = RE_MAX_D.match(t, m.end())
            if mm: f['max'] = int(mm.group(1)); f['j'] = mm.end()
        out.append(f)
    for m in RE_PIATTO.finditer(t):
        if any(o['i'] <= m.start() < o['j'] or m.start() <= o['i'] < m.end() for o in out):
            continue
        k = m.group('k')
        k = 1 if not k else (PAROLE.get(k) or int(k))
        f = {'t': 'p', 'i': m.start(), 'j': m.end(), 'dadi': m.group('dadi'), 'p': int(m.group('p') or 1), 'k': k,
             'max': int(m.group('max')) if m.group('max') else None}
        if f['max'] is None:
            mm = RE_MAX_P.match(t, m.end())
            if mm: f['max'] = int(mm.group(1)); f['j'] = mm.end()
        out.append(f)
    return sorted(out, key=lambda o: o['i'])

# Correzioni a mano: formule che i modelli non riconoscono (nome scheda → [paragrafo, testo da cercare, formula])
CORREZIONI = {
    'trama ipnotica': [(0, 'Tirare 2d4 e aggiungere il proprio livello dell’incantatore (massimo +10)',
                        {'t': 'p', 'dadi': '2d4', 'p': 1, 'k': 1, 'max': 10})],
    'nova incorporea': [(0, '1d4 Dadi Vita di creature gassose, fumose, semicorporee e incorporee per livello di incantatore (massimo 20d4)',
                         {'t': 'd', 'n': 1, 'f': 4, 'k': 1, 'max': 20})],
    'dardo incantato': [(2, '2 al 3° livello, 3 al 5°, 4 al 7° fino a un massimo di 5 al 9° livello e oltre',
                         {'t': 'c', 'a': 1, 'k': 2, 'da': 1, 'max': 5, 'u': 'dardi'})],
}

n_form = n_dadi_liv = 0
for s in schede:
    s['reag'] = costo_reagente(s.get('c'))
    m = re.search(r'\[([^\]]+)\]', s.get('s', ''))
    s['descr'] = [x.strip() for x in m.group(1).split(',')] if m else []
    s['scuola'] = re.match(r'[A-Za-zà]+', s.get('s', 'x')).group(0)
    for d in s['desc']:
        f = formule(d['t'])
        if f:
            d['f'] = f; n_form += 1
    for (ip, testo, form) in CORREZIONI.get(s['k'], []):
        d = s['desc'][ip]
        i = d['t'].find(testo)
        if i < 0:
            segnala(f'CORREZIONI: «{testo[:40]}» non trovato in {s["n"]}'); continue
        d.setdefault('f', []).append(dict(form, i=i, j=i + len(testo)))
    tutto = ' '.join(d['t'] for d in s['desc'])
    if re.search(r'\d+d\d+[^.;]{0,80}livell', tutto) and not any('f' in d for d in s['desc']):
        n_dadi_liv += 1
        segnala(f'danni non riconosciuti: {s["n"]}')
print('paragrafi con formule', n_form, '· schede con dadi e «livello» non riconosciute', n_dadi_liv)

# ---------------------------------------------------------------- Vol. 2: controllo delle tabelle
P2 = carica(VOL2)
cl_corr = None
trovate = {}
i = 0
while i < len(P2):
    p = P2[i]
    t = p['t'].strip()
    if p['o'] and not p['c'] and t.lower() in {c.lower(): c for c in CLASSI}:
        cl_corr = {c.lower(): c for c in CLASSI}[t.lower()]
    if p['c'] and t == 'Liv.' and cl_corr:
        rr = tabella(P2, i)
        if len(rr) >= 15 and all(re.match(r'^\d$', x) for x in rr[0][1:]) and len(rr[0]) <= 11:
            trovate.setdefault(cl_corr, []).append(rr)
        while i < len(P2) and P2[i]['c']: i += 1
        continue
    i += 1
print('Vol. 2: tabelle trovate', {c: len(v) for c, v in trovate.items()})
for c, d in CLASSI.items():
    tt = trovate.get(c, [])
    if len(tt) < 2:
        segnala(f'Vol. 2, {c}: trovate {len(tt)} tabelle degli incantesimi (attese 2)'); continue
    g = gruppi[d['gruppo']]
    for nome, rr in zip(('conosciuti', 'lanciabili'), tt[:2]):
        liv = rr[0][1:]
        for r in rr[1:]:
            L = int(r[0].replace('°', ''))
            for k, x in enumerate(r[1:]):
                atteso = g[nome].get(L, {}).get(liv[k])
                if atteso is not None and atteso != x.strip():
                    segnala(f'Vol. 2, {c}, {nome} {L}° liv. {liv[k]}: «{x}» (Vol. 4: «{atteso}»)')

# ---------------------------------------------------------------- Vol. 3: metamagia
P3 = carica(VOL3)
# incrementi scritti nel testo e non nella riga «Incremento di livello»
META_INC = {'Incantesimo consacrato': 2}
meta = []
def leggi_meta(i):
    nome = re.sub(r'\s*\(metamagia\)$', '', P3[i]['t'].strip())
    inc, req, testo = None, '', []
    j = i + 1
    while j < len(P3) and not (P3[j]['h'] and P3[j]['t'].strip().endswith('(metamagia)')) and not P3[j]['o']:
        t = P3[j]['t'].strip()
        m = re.match(r'Incremento di livello: ?\+?(\d+)', t, re.I)
        if m: inc = int(m.group(1))
        elif t.startswith('Requisiti:'): req = t[10:].strip().rstrip('.')
        elif t: testo.append(t)
        j += 1
    if inc is None:
        inc = META_INC.get(nome)
        segnala(f'Vol. 3, {nome}: incremento non trovato' + (f' (uso +{inc}, scritto nel testo)' if inc is not None else ''))
    return {'n': nome, 'inc': inc, 'req': req, 'nota': ' '.join(testo[1:])[:600] if len(testo) > 1 else '',
            'intro': testo[0] if testo else '', 'fonte': 'Vol. 3'}
# tutti i talenti «(metamagia)» del Vol. 3, tranne le Alterazioni magiche (modificano un solo incantesimo: bonus del §5)
visti = set()
for i, p in enumerate(P3):
    t = p['t'].strip()
    if p['h'] and not p['c'] and t.endswith('(metamagia)') and not t.startswith('Alterazione magica') and t not in visti:
        visti.add(t); meta.append(leggi_meta(i))
print('metamagia del Vol. 3', len(meta))

if os.path.exists(GOLARION):
    del_vol3 = {m['n'].lower() for m in meta}
    for g in json.load(open(GOLARION, encoding='utf8')):
        if g['nome'].lower() in del_vol3:      # il Vol. 3 fa fede (Incantesimi tenaci)
            continue
        meta.append({'n': g['nome'], 'inc': g.get('inc'), 'req': g.get('requisiti', ''), 'nota': g.get('effetto', ''),
                     'limiti': g.get('limiti', ''), 'nota_inc': g.get('nota_inc', ''), 'fonte': 'golarion', 'url': g.get('url', '')})
else:
    segnala('manca metamagia_golarion.json')

# effetti calcolati dal motore (design §7, E6)
EFFETTI = {'Incantesimi Estesi': 'estesi', 'Incantesimi Ingranditi': 'ingranditi', 'Incantesimi Ampliati': 'ampliati',
           'Incantesimi Potenziati': 'potenziati', 'Incantesimi Massimizzati': 'massimizzati',
           'Incantesimi Intensificati': 'intensificati', 'Incantesimi Intensi': 'intensi',
           'Incantesimi con Portata': 'portata', 'Incantesimi Penetranti': 'penetranti',
           'Incantesimi Rapidi': 'rapidi', 'Incantesimi Silenziosi': 'silenziosi', 'Incantesimi Immobili': 'immobili',
           'Incantesimi Elementali': 'elementali'}
for m in meta:
    if m['n'] in EFFETTI: m['eff'] = EFFETTI[m['n']]
for nome in EFFETTI:
    if not any(m['n'] == nome for m in meta): segnala('metamagia senza dati:', nome)

# ---------------------------------------------------------------- uscita
dati = {'fonti': {'vol4': VOL4, 'vol2': VOL2, 'vol3': VOL3},
        'classi': CLASSI, 'gruppi': gruppi, 'bonus': bon, 'concentrazione': conc,
        'liste': liste_idx, 'schede': schede, 'metamagia': meta}
json.dump(dati, open(os.path.join(R, 'incantesimi.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
open(os.path.join(R, 'segnalazioni.txt'), 'w', encoding='utf8').write('\n'.join(SEGN) + '\n')
print('segnalazioni', len(SEGN), '→ sorgenti/segnalazioni.txt')
print('json', os.path.getsize(os.path.join(R, 'incantesimi.json')))
