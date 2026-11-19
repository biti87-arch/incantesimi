"""Legge i testi estratti da estrai_testo.py e scrive sorgenti/incantesimi.json.
Fonti (in sorgenti/docx/, nomi nelle costanti qui sotto):
- Vol. 4: schede (Cap. 3 + concessi dai privilegi), liste numerate (Cap. 2), tabelle del Cap. 1
- Vol. 2: controllo delle tabelle di conosciuti e lanciabili di ogni classe contro quelle per gruppo
- Vol. 3: i talenti di metamagia della sezione «Talenti di Metamagia» (+ Incantesimo ingannatore)
- lavoro/metamagia_golarion.json (se c'è): i talenti di metamagia di golarion
Stampa solo conteggi e segnalazioni (anomalie del manuale: vanno lette)."""
import json, os, re, sys
R = os.path.dirname(os.path.abspath(__file__))
VOL4 = 'Vol. 4 - Libro degli incantesimi 2.4.5'
VOL2 = 'Vol. 2 - Classi 2.5.20'
VOL3 = 'Vol. 3 - Miscellanea 2.5.10'
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
RE_RIMANDO = re.compile(r'^.+ → (?:\d+° livello|livello 0) \(qui per [^)]*\)$')
n_rimandi = 0
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
        # rimandi del Cap. 3 («Giavellotto sacro → 2° livello (qui per Oracolo, Sacerdote)»): non sono testo della scheda
        if RE_RIMANDO.match(t.strip()):
            n_rimandi += 1; j += 1; continue
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

print('schede', len(schede), 'concesse', sum(s['concesso'] for s in schede), '· rimandi tolti dalle descrizioni', n_rimandi)
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

# Correzioni a mano: formule che i modelli non riconoscono (nome scheda → [(testo da cercare, formula)]).
# Il testo si cerca in tutti i paragrafi; la formula sostituisce quelle automatiche che si sovrappongono.
# Tipi: 'd' dadi per livello (base = dadi fissi in più), 'p' dadi + bonus piatto,
#   'c' conteggio o bonus: a + p·⌊(LI − da)/k⌋ (massimo max), u = unità, pre = '+' per i bonus, colpi = numero di colpi,
#   'k' danni di un colpo (dadi fissi), moltiplicati per il numero di colpi; pc = 1 su 'd' e 'p' fa lo stesso,
#   'm' misura in metri (stessa formula di 'c'), con cad = danni da caduta {n, f, ogni (m), max} e fmt 'altezza' o 'danni'.
CADUTA = {'n': 1, 'f': 6, 'ogni': 3}                       # 1d6 ogni 3 m (Vol. 4, modifica di sistema di Geyser d'aria)
RAGGI_4 = {'t': 'c', 'a': 1, 'k': 4, 'da': 3, 'max': 3, 'u': 'raggi', 'colpi': 1}
CORREZIONI = {
    'trama ipnotica': [('Tirare 2d4 e aggiungere il proprio livello dell’incantatore (massimo +10)',
                        {'t': 'p', 'dadi': '2d4', 'p': 1, 'k': 1, 'max': 10})],
    'nova incorporea': [('1d4 Dadi Vita di creature gassose, fumose, semicorporee e incorporee per livello di incantatore (massimo 20d4)',
                         {'t': 'd', 'n': 1, 'f': 4, 'k': 1, 'max': 20})],
    # più colpi col livello (Massy, 18/11)
    'dardo incantato': [('2 al 3° livello, 3 al 5°, 4 al 7° fino a un massimo di 5 al 9° livello e oltre',
                         {'t': 'c', 'a': 1, 'k': 2, 'da': 1, 'max': 5, 'u': 'dardi', 'colpi': 1}),
                        ('1d4+1 danni da forza', {'t': 'k', 'dadi': '1d4+1'})],
    'dardo di energia': [('Per ogni due livelli di incantatore oltre il 1°, si scaglia un dardo aggiuntivo del medesimo tipo di energia (massimo 5)',
                          {'t': 'c', 'a': 1, 'k': 2, 'da': 1, 'max': 5, 'u': 'dardi', 'colpi': 1}),
                         ('1d6+1 danni del tipo di energia scelto', {'t': 'k', 'dadi': '1d6+1'})],
    'raggio di fuoco': [('Si può scagliare un raggio, più un raggio addizionale ogni 4 livelli oltre il 3° (massimo 3)', RAGGI_4),
                        ('3d6 danni da fuoco', {'t': 'k', 'dadi': '3d6'})],
    'saetta': [('Si può scagliare un raggio, più un raggio addizionale ogni 4 livelli oltre il 3° (massimo 3)', RAGGI_4),
               ('3d6 danni da elettricità', {'t': 'k', 'dadi': '3d6'})],
    'raggio accecante': [('Si può lanciare un raggio, più un raggio aggiuntivo ogni 4 livelli oltre al 3° (fino ad un massimo di tre raggi all’11° livello)', RAGGI_4),
                         ('1d4 danni ogni due livelli dell’incantatore (massimo 5d4)', {'t': 'd', 'n': 1, 'f': 4, 'k': 2, 'max': 5, 'pc': 1})],
    'fiamma contagiosa': [('Si possono scagliare tre raggi, più un raggio aggiuntivo ogni 4 livelli oltre l’11° (fino ad un massimo di 5 raggi al 19° livello)',
                           {'t': 'c', 'a': 3, 'k': 4, 'da': 11, 'max': 5, 'u': 'raggi', 'colpi': 1}),
                          ('4d6 danni da fuoco', {'t': 'k', 'dadi': '4d6'})],
    'dardi di tenebra': [('È possibile lanciare un dardo, più un dardo aggiuntivo ogni quattro livelli oltre il 5° (fino a un massimo di tre dardi al 13° livello)',
                          {'t': 'c', 'a': 1, 'k': 4, 'da': 5, 'max': 3, 'u': 'dardi', 'colpi': 1}),
                         ('4d6 danni a una creatura vivente', {'t': 'k', 'dadi': '4d6'})],
    'shuriken ardente': [('più un altro proiettile ogni due livelli dell’incantatore oltre il 3° (fino a un massimo di 8 shuriken al 15° livello)',
                          {'t': 'c', 'a': 2, 'k': 2, 'da': 3, 'max': 8, 'u': 'shuriken', 'colpi': 1}),
                         ('1d8 danni da fuoco', {'t': 'k', 'dadi': '1d8'})],
    'fulmine globulare': [('Per ogni 4 livelli dell’incantatore oltre il 7°, si crea un ulteriore globo di fulmini (3 globi all’11°, 4 globi al 15°, fino al massimo di 5 globi al 19°)',
                           {'t': 'c', 'a': 2, 'k': 4, 'da': 7, 'max': 5, 'u': 'globi', 'colpi': 1}),
                          ('3d6 danni da elettricità', {'t': 'k', 'dadi': '3d6'})],
    'catene uncinate': [('Si evoca una catena aggiuntiva ogni 3 livelli dopo il 1°, per un totale di due catene al 4° livello, tre al 7° fino a un massimo di quattro al 10°',
                         {'t': 'c', 'a': 1, 'k': 3, 'da': 1, 'max': 4, 'u': 'catene', 'colpi': 1}),
                        ('1d6 danni taglienti', {'t': 'k', 'dadi': '1d6'})],
    'colpo di rimbalzo': [('un proiettile ogni tre livelli dell’incantatore posseduti, fino a un massimo di sei al 18° livello dell’incantatore',
                           {'t': 'c', 'a': 0, 'k': 3, 'da': 0, 'max': 6, 'u': 'rimbalzi'})],
    'scuotiossa': [('3d6 danni più 1d6 danni aggiuntivi per ogni 2 livelli dell’incantatore',
                    {'t': 'd', 'n': 1, 'f': 6, 'k': 2, 'max': None, 'base': 3})],
    # bonus che crescono col livello
    'acume tattico': [('Questo bonus aumenta di +1 per ogni cinque livelli dell’incantatore oltre il 5° (massimo +4)',
                       {'t': 'c', 'a': 1, 'k': 5, 'da': 5, 'max': 4, 'u': '', 'pre': '+'})],
    'arma infallibile': [('più 1 punto bonus addizionale ogni quattro livelli dell’incantatore (bonus massimo totale +7)',
                          {'t': 'c', 'a': 2, 'k': 4, 'da': 0, 'max': 7, 'u': '', 'pre': '+'})],
    'scudo della fede': [('con un +1 addizionale ogni 6 livelli dell’incantatore (Bonus di Deviazione massimo +5 al 18° livello)',
                          {'t': 'c', 'a': 2, 'k': 6, 'da': 0, 'max': 5, 'u': '', 'pre': '+'})],
    'antiproiettile': [('con un ulteriore +1 al bonus ogni cinque livelli dell’incantatore posseduti (fino a un massimo di +8 al 20° livello)',
                        {'t': 'c', 'a': 4, 'k': 5, 'da': 0, 'max': 8, 'u': '', 'pre': '+'})],
    'pelle coriacea': [('Tale bonus aumenta di +1 ogni 3 livelli dell’incantatore oltre il 3°, fino a un massimo di +5 al 12° livello dell’incantatore',
                        {'t': 'c', 'a': 2, 'k': 3, 'da': 3, 'max': 5, 'u': '', 'pre': '+'})],
    'bande protettive': [('12 danni per livello dell’incantatore (fino ad un massimo di 120 danni al 10° livello)',
                          {'t': 'c', 'a': 0, 'p': 12, 'k': 1, 'da': 0, 'max': 120, 'u': 'danni'})],
    'passapareti': [('profondo 3 metri più altri 1,5 metri ogni 3 livelli dell’incantatore oltre il 9° (4,5 metri al 12°, 6 metri al 15° e un massimo di 7,5 metri al 18° livello)',
                     {'t': 'm', 'a': 3, 'p': 1.5, 'k': 3, 'da': 9, 'max': 7.5})],
    # altezze e cadute (Massy, 18/11)
    'geyser d\'aria': [('per un numero di metri pari a 1,5 x il livello dell’incantatore',
                        {'t': 'm', 'a': 0, 'p': 1.5, 'k': 1, 'da': 0, 'cad': CADUTA})],
    'geyser': [('in base all’altezza del Geyser', {'t': 'm', 'a': 0, 'p': 3, 'k': 2, 'da': 0, 'cad': CADUTA})],
    'corrente ascensionale': [('di 1,5 m per livello di incantatore (massimo 15 m)',
                               {'t': 'm', 'a': 0, 'p': 1.5, 'k': 1, 'da': 0, 'max': 15, 'cad': CADUTA})],
    'creare fossa': [('con una profondità di 3 metri ogni 2 livelli dell’incantatore (massimo 9 metri)',
                      {'t': 'm', 'a': 0, 'p': 3, 'k': 2, 'da': 0, 'max': 9, 'cad': CADUTA})],
    'fossa acida': [('con una profondità di 3 metri ogni 2 livelli dell’incantatore (massimo 30 metri)',
                     {'t': 'm', 'a': 0, 'p': 3, 'k': 2, 'da': 0, 'max': 30, 'cad': CADUTA})],
    'fossa con spuntoni': [('con una profondità di 9 metri', {'t': 'm', 'a': 9, 'p': 0, 'k': 1, 'da': 0, 'cad': CADUTA})],
    'fossa affamata': [('con una profondità fissa di 9 metri', {'t': 'm', 'a': 9, 'p': 0, 'k': 1, 'da': 0, 'cad': CADUTA})],
    'cometa': [('2d6 danni contundenti ogni 3 m percorsi (massimo 20d6)',
                {'t': 'm', 'a': 0, 'p': 1.5, 'k': 1, 'da': 0, 'cad': {'n': 2, 'f': 6, 'ogni': 3, 'max': 20}, 'fmt': 'danni'})],
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
    for (testo, form) in CORREZIONI.get(s['k'], []):
        d = next((d for d in s['desc'] if testo in d['t']), None)
        if d is None:
            segnala(f'CORREZIONI: «{testo[:40]}» non trovato in {s["n"]}'); continue
        i = d['t'].find(testo); j = i + len(testo)
        d['f'] = [f for f in d.get('f', []) if f['j'] <= i or f['i'] >= j] + [dict(form, i=i, j=j)]
        d['f'].sort(key=lambda o: o['i'])
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
META_INC = {}
meta = []
def leggi_meta(i):
    nome = re.sub(r'\s*\(metamagia\)$', '', P3[i]['t'].strip())
    inc, req, testo = None, '', []
    j = i + 1
    # si ferma al talento successivo: titolo senza «:» (Incremento, Requisiti, Speciale hanno i due punti)
    while j < len(P3) and not (P3[j]['h'] and P3[j]['t'].strip() and ':' not in P3[j]['t']) and not P3[j]['o']:
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

# ---------------------------------------------------------------- Vol. 4: Venti della magia (regola opzionale, design v6 §15)
# Testo della regola, tabella di Forzare i Venti e 9 tabelle d12 delle manifestazioni, letti dal Cap. 1.
# Il tipo di ogni voce si ricava dal testo (niente elenchi a mano); quello che non torna va nelle segnalazioni.
def leggi_venti():
    i0 = cerca('Venti della magia (regola opzionale)')
    fine = cerca('Incantesimi conosciuti e lanciabili', i0)
    if 'Warp' in ' '.join(P[k]['t'] for k in range(i0, fine)): segnala('Venti: «Warp» ancora nel testo (deve essere «Vuoto»)')
    regola, forzare, tabelle = [], [], {}
    k = i0 + 1
    while k < fine:
        p = P[k]
        if p['c']:
            k += 1; continue
        t = p['t'].strip()
        if t == 'Potenziamenti di Forzare i Venti':
            for r in tabella(P, prossima_tabella(P, k))[1:]:
                nome, scatta, man = r[0], r[1], r[2]
                ch = ('rit12' if re.search(r'risultati di 1 e di 2', nome) else 'rit1' if re.search(r'risultati di 1 ', nome)
                      else 'focus' if nome.startswith('Focus') else 'cd' if 'alla CD' in nome else 'ri' if 'alla RI' in nome else None)
                if not ch: segnala('Venti, Forzare: potenziamento non riconosciuto', nome)
                m = re.search(r'([+−-])(\d+)', nome)
                forzare.append({'k': ch, 'n': nome, 'scatta': int(scatta.replace('+', '')),
                                'd12': 0 if man.strip() in ('—', '-') else int(re.search(r'(\d+)', man).group(1)),
                                'v': (-1 if m and m.group(1) in '−-' else 1) * int(m.group(2)) if m and ch in ('focus', 'cd', 'ri') else None})
            k += 1; continue
        m = re.match(r'Manifestazioni degli incantesimi di (\d)° livello$', t)
        if m:
            L = int(m.group(1))
            righe = tabella(P, prossima_tabella(P, k))[1:]
            tabelle[L] = righe
            k += 1; continue
        if t and t != 'Tabelle delle manifestazioni':
            regola.append({'t': t, 'h': p['h']})
        k += 1
    if len(forzare) != 5 or {f['k'] for f in forzare} != {'focus', 'rit1', 'rit12', 'cd', 'ri'}:
        segnala('Venti, Forzare: righe', [f['k'] for f in forzare], '(attese 5: focus, rit1, cd, ri, rit12)')
    if sorted(tabelle) != list(range(1, 10)): segnala('Venti: tabelle trovate', sorted(tabelle), '(attese 1–9)')
    voci = {}
    conti = {}
    for L, righe in sorted(tabelle.items()):
        if [r[0] for r in righe] != [str(n) for n in range(1, 13)]:
            segnala(f'Venti, tabella del {L}°: numeri', [r[0] for r in righe])
        voci[L] = []
        for r in righe:
            v = voce_venti(L, int(r[0]), r[1])
            voci[L].append(v)
            for x in v['dove']: conti[x] = conti.get(x, 0) + 1
    # «danni come la voce 2»
    for L in voci:
        for v in voci[L]:
            m = re.search(r'danni come la voce (\d+)', v['t'])
            if m:
                ref = voci[L][int(m.group(1)) - 1].get('dv')
                if ref: v['dv'] = dict(ref, i=m.start(), j=m.end(), rif=int(m.group(1)))
                else: segnala(f'Venti {L}°/{v["n"]}: la voce {m.group(1)} non ha danni')
    print('Venti: regola', len(regola), 'paragrafi · Forzare', len(forzare), '· tabelle', len(voci), '·', ' '.join(f'{k} {n}' for k, n in sorted(conti.items())))
    return {'regola': regola, 'forzare': forzare, 'tab': {str(L): voci[L] for L in voci}}

UNITA_V = {'round': 'round', 'minuto': 'minuti', 'minuti': 'minuti', 'ora': 'ore', 'ore': 'ore', 'giorno': 'giorni', 'giorni': 'giorni',
           'notte': 'giorni', 'notti': 'giorni', 'mese': 'mesi', 'mesi': 'mesi'}
RANGO = {'round': 0, 'minuti': 1, 'ore': 2, 'riposi': 3, 'giorni': 3, 'mesi': 4, 'sempre': 5}
def voce_venti(L, n, t):
    v = {'n': n, 't': t}
    fascia = 'grave' if n == 1 else 'danno' if n <= 5 else 'deviato' if n <= 8 else 'stranezza' if n <= 11 else 'capriccio'
    v['parte'] = (fascia == 'deviato' and not t.startswith('Al posto dell')) or bool(re.search(r'parte normalmente', t))
    m = re.search(r'(\d+)d(\d+) (?:danni )?(?:ogni (\d+) livelli|per livello) di incantatore \(minimo \d+d\d+, massimo (\d+)d\d+\)', t)
    if m: v['dv'] = {'n': int(m.group(1)), 'f': int(m.group(2)), 'k': int(m.group(3) or 1), 'max': int(m.group(4)), 'i': m.start(), 'j': m.end()}
    elif fascia == 'danno' and re.search(r'danni per livello|livelli di incantatore', t): segnala(f'Venti {L}°/{n}: danni non riconosciuti')
    a = {}
    alt = re.search(r'se non ha valori variabili, (è esteso|non consuma lo slot)', t)
    senza_alt = t.replace(alt.group(0), '') if alt else t
    if 'non consuma lo slot' in senza_alt: a['noSlot'] = True
    m = re.search(r'come con Incantesimi (estesi|potenziati|massimizzati)', t)
    if m:
        a['meta'] = m.group(1)
        if alt: a['alt'] = 'estesi' if alt.group(1) == 'è esteso' else 'noSlot'
    m = re.search(r'perdi uno slot di (\d)° livello non ancora usato', t)
    if m: a['perdi'] = int(m.group(1))
    if 'consumano 2 slot se preparati, 3 se non preparati' in t: a['doppi'] = True
    if re.search(r'fa scattare la prova di incantatore con 1–2', t): a['prova12'] = True
    m = re.search(r'manifestazioni hanno −(\d) al d12', t)
    if m: a['malus'] = int(m.group(1))
    if 'non fa scattare la prova' in t: a['noProva'] = True
    if t.startswith('Perdi per sempre 1 slot'): a['perso'] = True
    if 'serve una prova di Concentrazione' in t: a['conc'] = True
    if a: v['app'] = a
    # incantesimo in ritardo o che si ripete → Incantesimi attivi
    m = re.search(r'(\d+d\d+|\d+) (round|minuti|ore) dopo', t) or re.search(r'nei (\d+d\d+) (round) successivi', t)
    if m: v['rit'] = {'q': m.group(1), 'u': UNITA_V[m.group(2)]}
    # durata più lunga dell'effetto
    durs = [{'q': x.group(1), 'u': UNITA_V[x.group(2)]} for x in re.finditer(r'[Pp]er (\d+d\d+(?:\+\d+)?|\d+) (round|minut[oi]|or[ae]|giorn[oi]|nott[ei]|mes[ei])\b', t)]
    m = re.search(r'entro (\d+d\d+) giorni', t)
    if m: durs.append({'q': m.group(1), 'u': 'giorni'})
    m = re.search(r'ottenete (\d+d\d+(?:\+\d+)?) livelli negativi.*al ritmo di 1 (al giorno|alla settimana|al mese)', t)
    if m: durs.append({'q': m.group(1), 'u': {'al giorno': 'giorni', 'alla settimana': 'settimane', 'al mese': 'mesi'}[m.group(2)]})
    m = re.search(r'subisci (\d+d\d+) danni alla caratteristica.*al ritmo di 1 punto al giorno', t)
    if m: durs.append({'q': m.group(1), 'u': 'giorni'})
    if 'fino al prossimo riposo' in t: durs.append({'q': '1', 'u': 'riposi'})
    if 'dopo due riposi' in t: durs.append({'q': '2', 'u': 'riposi'})
    if 'per sempre' in t.lower() or 'Solo Rigenerazione' in t: durs.append({'q': '', 'u': 'sempre'})
    for d in durs:
        if d['u'] == 'settimane': d['u'] = 'giorni'; d['x'] = 7
    if durs: v['dur'] = max(durs, key=lambda d: RANGO[d['u']])
    dove = []
    if a.get('noSlot') or a.get('meta') or a.get('perdi'): dove.append('applica')
    if 'rit' in v: dove.append('attivi')
    lunga = 'dur' in v and RANGO[v['dur']['u']] >= 1 and not re.search(r'(?<!se non ne hai, )nessun effetto', t)
    if lunga and 'rit' not in v: dove.append('effetti')
    if any(a.get(k) for k in ('doppi', 'prova12', 'noProva', 'perso', 'conc')) and 'effetti' not in dove:
        segnala(f'Venti {L}°/{n}: effetto da applicare senza durata riconosciuta')
    if not dove: dove.append('testo')
    v['dove'] = dove
    return v

venti = leggi_venti()

# ---------------------------------------------------------------- uscita
dati = {'fonti': {'vol4': VOL4, 'vol2': VOL2, 'vol3': VOL3},
        'classi': CLASSI, 'gruppi': gruppi, 'bonus': bon, 'concentrazione': conc,
        'liste': liste_idx, 'schede': schede, 'metamagia': meta, 'venti': venti}
json.dump(dati, open(os.path.join(R, 'incantesimi.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
open(os.path.join(R, 'segnalazioni.txt'), 'w', encoding='utf8').write('\n'.join(SEGN) + '\n')
print('segnalazioni', len(SEGN), '→ sorgenti/segnalazioni.txt')
print('json', os.path.getsize(os.path.join(R, 'incantesimi.json')))
