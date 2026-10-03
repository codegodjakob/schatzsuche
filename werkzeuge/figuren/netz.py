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
