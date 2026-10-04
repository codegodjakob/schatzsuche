"""Hilfen für Dreiecksnetze: Viereck->Dreieck, UV-Nähte auftrennen, Normalen, Gewichte."""
import numpy as np


def dreiecke(flaechen):
    """Vierecke/Dreiecke (Liste von Index-Listen) -> Dreiecke (n, 3)."""
    aus = []
    for f in flaechen:
        for i in range(1, len(f) - 1):
            aus.append([f[0], f[i], f[i + 1]])
    return np.array(aus, int)


def normalen(punkte, dreieck):
    """Flächengewichtete, glatte Normalen je Punkt."""
    a, b, c = punkte[dreieck[:, 0]], punkte[dreieck[:, 1]], punkte[dreieck[:, 2]]
    fn = np.cross(b - a, c - a)
    n = np.zeros_like(punkte)
    for k in range(3):
        np.add.at(n, dreieck[:, k], fn)
    laenge = np.linalg.norm(n, axis=1, keepdims=True)
    return n / np.maximum(laenge, 1e-12)


def naht_auftrennen(flaechen, flaechen_uv):
    """Ein glTF-Punkt je (Ortspunkt, UV-Punkt)-Paar. Gibt Dreiecke (neu), Ursprungspunkt- und UV-Index je neuem Punkt."""
    paare = {}
    ort, uv, tri = [], [], []
    for f, t in zip(flaechen, flaechen_uv):
        neu = []
        for vi, ti in zip(f, t):
            schluessel = (vi, ti)
            if schluessel not in paare:
                paare[schluessel] = len(ort)
                ort.append(vi)
                uv.append(ti)
            neu.append(paare[schluessel])
        for i in range(1, len(neu) - 1):
            tri.append([neu[0], neu[i], neu[i + 1]])
    return np.array(tri, int), np.array(ort, int), np.array(uv, int)


def gewichte_aus_liste(anzahl_punkte, gewichtsliste, knochen_index, max_einfluss=4):
    """gewichtsliste: {knochen: [[punkt, gewicht], ...]} -> (gelenke (n,4), gewichte (n,4))."""
    einfluss = [[] for _ in range(anzahl_punkte)]
    for name, eintraege in gewichtsliste.items():
        if name not in knochen_index:
            continue
        k = knochen_index[name]
        for p, w in eintraege:
            if p < anzahl_punkte and w > 0:
                einfluss[p].append((w, k))
    gelenke = np.zeros((anzahl_punkte, max_einfluss), int)
    gewichte = np.zeros((anzahl_punkte, max_einfluss), float)
    for p, e in enumerate(einfluss):
        e.sort(reverse=True)
        e = e[:max_einfluss]
        summe = sum(w for w, _ in e)
        for i, (w, k) in enumerate(e):
            gelenke[p, i] = k
            gewichte[p, i] = w / summe if summe else 0
    return gelenke, gewichte


def uebertrage_gewichte(ziel_punkte, quelle_punkte, quelle_gelenke, quelle_gewichte, nachbarn=4):
    """Gewichte für neue Teile (Kleidung, Haare) von den nächstgelegenen Hautpunkten übernehmen."""
    from scipy.spatial import cKDTree
    baum = cKDTree(quelle_punkte)
    abstand, idx = baum.query(ziel_punkte, k=nachbarn)
    abstand = np.maximum(abstand, 1e-6)
    gew_nachbar = 1 / abstand ** 2
    gew_nachbar /= gew_nachbar.sum(axis=1, keepdims=True)
    anzahl_knochen = int(quelle_gelenke.max()) + 1
    voll = np.zeros((len(ziel_punkte), anzahl_knochen))
    for n in range(nachbarn):
        for s in range(quelle_gelenke.shape[1]):
            np.add.at(voll, (np.arange(len(ziel_punkte)), quelle_gelenke[idx[:, n], s]),
                      gew_nachbar[:, n] * quelle_gewichte[idx[:, n], s])
    return beste_vier(voll)


def beste_vier(voll):
    reihen = np.argsort(-voll, axis=1)[:, :4]
    gewichte = np.take_along_axis(voll, reihen, axis=1)
    gewichte /= np.maximum(gewichte.sum(axis=1, keepdims=True), 1e-9)
    return reihen, gewichte


def wicklung_angleichen(punkte, dreiecke, normalen):
    """Dreiecke so drehen, dass ihre Vorderseite zur angegebenen Normale zeigt (wichtig für doppelseitige Teile)."""
    a, b, c = punkte[dreiecke[:, 0]], punkte[dreiecke[:, 1]], punkte[dreiecke[:, 2]]
    fn = np.cross(b - a, c - a)
    soll = normalen[dreiecke].mean(axis=1)
    falsch = (fn * soll).sum(axis=1) < 0
    aus = dreiecke.copy()
    aus[falsch] = aus[falsch][:, [0, 2, 1]]
    return aus


def unterteile_rund(teil, auswahl, rundung=0.75):
    """Ausgewählte Dreiecke einmal in vier teilen; die neuen Kantenmitten wölben sich nach den Normalen
    (Phong-Wölbung), damit grobe Flächen rund werden statt eckig. Nachbardreiecke, die eine geteilte Kante
    berühren, werden passend in zwei oder drei zerlegt (sonst klafften Risse). Gewichte, Formziele und UV
    der neuen Punkte sind die Mittel der Kantenenden.
    teil: dict(pos, normal, uv, gelenke, gewichte, index, ziele?) – wird nicht verändert, ein neues kommt zurück."""
    pos, nor, uv = teil['pos'], teil['normal'], teil['uv']
    tri = teil['index']
    n0 = len(pos)
    # Welche Kanten werden geteilt?
    kanten = {}
    def schluessel(a, b):
        return (a, b) if a < b else (b, a)
    for t in tri[auswahl]:
        for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
            kanten.setdefault(schluessel(a, b), None)
    # Gleiche Lage, andere UV (Nähte): Auch die Gegenkante dort muss geteilt werden, sonst entsteht ein Riss
    lage = {}
    for i, p in enumerate(np.round(pos, 6)):
        lage.setdefault(tuple(p), []).append(i)
    zwilling = np.arange(n0)
    for liste in lage.values():
        for i in liste:
            zwilling[i] = liste[0]
    gleich = {}
    for a, b in list(kanten):
        gleich.setdefault(schluessel(zwilling[a], zwilling[b]), True)
    for t in tri:
        for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
            if schluessel(zwilling[a], zwilling[b]) in gleich:
                kanten.setdefault(schluessel(a, b), None)
    # Neue Punkte: Mitte, gewölbt
    neu = []
    for k, (a, b) in enumerate(kanten):
        kanten[(a, b)] = n0 + k
        neu.append((a, b))
    neu = np.array(neu, dtype=np.int64).reshape(-1, 2)
    pa, pb, na, nb = pos[neu[:, 0]], pos[neu[:, 1]], nor[neu[:, 0]], nor[neu[:, 1]]
    m = (pa + pb) / 2
    proj_a = m - ((m - pa) * na).sum(1, keepdims=True) * na
    proj_b = m - ((m - pb) * nb).sum(1, keepdims=True) * nb
    mp = (1 - rundung) * m + rundung * (proj_a + proj_b) / 2
    mn = na + nb
    mn /= np.maximum(np.linalg.norm(mn, axis=1, keepdims=True), 1e-9)
    # Gewichte: beide Enden zusammenlegen, die stärksten vier behalten
    gel, gew = teil['gelenke'], teil['gewichte']
    ng = np.zeros((len(neu), 4), gel.dtype)
    nw = np.zeros((len(neu), 4), np.float32)
    for i, (a, b) in enumerate(neu):
        d = {}
        for j in range(4):
            d[gel[a, j]] = d.get(gel[a, j], 0) + gew[a, j] / 2
            d[gel[b, j]] = d.get(gel[b, j], 0) + gew[b, j] / 2
        beste = sorted(d.items(), key=lambda x: -x[1])[:4]
        s = sum(w for _, w in beste) or 1
        for j, (g, w) in enumerate(beste):
            ng[i, j], nw[i, j] = g, w / s
    aus = dict(teil)
    aus['pos'] = np.concatenate([pos, mp])
    aus['normal'] = np.concatenate([nor, mn])
    aus['uv'] = np.concatenate([uv, (uv[neu[:, 0]] + uv[neu[:, 1]]) / 2])
    aus['gelenke'] = np.concatenate([gel, ng])
    aus['gewichte'] = np.concatenate([gew, nw])
    if teil.get('ziele'):
        aus['ziele'] = {n: np.concatenate([d, (d[neu[:, 0]] + d[neu[:, 1]]) / 2]) for n, d in teil['ziele'].items()}
    # Dreiecke neu zusammensetzen
    neue_tri = []
    for t in tri:
        a, b, c = t
        mab = kanten.get(schluessel(a, b)); mbc = kanten.get(schluessel(b, c)); mca = kanten.get(schluessel(c, a))
        geteilt = (mab is not None) + (mbc is not None) + (mca is not None)
        if geteilt == 0:
            neue_tri.append((a, b, c))
        elif geteilt == 3:
            neue_tri += [(a, mab, mca), (mab, b, mbc), (mca, mbc, c), (mab, mbc, mca)]
        elif geteilt == 1:
            if mab is not None: neue_tri += [(a, mab, c), (mab, b, c)]
            elif mbc is not None: neue_tri += [(a, b, mbc), (a, mbc, c)]
            else: neue_tri += [(a, b, mca), (mca, b, c)]
        else:
            if mab is None: neue_tri += [(a, b, mbc), (a, mbc, mca), (mca, mbc, c)]
            elif mbc is None: neue_tri += [(a, mab, mca), (mab, b, c), (mca, mab, c)]
            else: neue_tri += [(a, mab, c), (mab, b, mbc), (mab, mbc, c)]
    aus['index'] = np.array(neue_tri, dtype=tri.dtype)
    return aus
