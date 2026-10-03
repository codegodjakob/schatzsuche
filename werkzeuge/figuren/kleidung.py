"""Kleidung, eng am Körper gebaut: Gürtel, Lendenschurz-Lappen, Brustband, Kutte.

Die Teile werden in der Ruhehaltung erzeugt, fallen mit einer kleinen Stoff-Simulation
(Schwerkraft + Abstand zum Körper) und bekommen die Haut-Gewichte der nächsten Körperstellen.
"""
import numpy as np
from scipy.spatial import ConvexHull, cKDTree

from haut import fbm, glatt, rauschen


# ---------------------------------------------------------------- Formen

def querschnitt(punkte, hoehe, dicke=0.012, abstand=0.006, anzahl=64, nur_rumpf=0.30):
    """Umriss des Körpers in einer Höhe (konvexe Hülle, leicht nach außen versetzt), als geschlossener Ring."""
    nahe = punkte[(np.abs(punkte[:, 1] - hoehe) < dicke) & (np.abs(punkte[:, 0]) < nur_rumpf)]
    xz = nahe[:, [0, 2]]
    huelle = xz[ConvexHull(xz).vertices]
    mitte = huelle.mean(axis=0)
    # gleichmäßig nach Winkel abtasten
    winkel = np.arctan2(huelle[:, 0] - mitte[0], huelle[:, 1] - mitte[1])
    reihen = np.argsort(winkel)
    huelle, winkel = huelle[reihen], winkel[reihen]
    radius = np.linalg.norm(huelle - mitte, axis=1)
    ziel_w = np.linspace(-np.pi, np.pi, anzahl, endpoint=False)
    w_erw = np.concatenate([winkel - 2 * np.pi, winkel, winkel + 2 * np.pi])
    r_erw = np.concatenate([radius, radius, radius])
    r = np.interp(ziel_w, w_erw, r_erw) + abstand
    ring = np.column_stack([mitte[0] + np.sin(ziel_w) * r, np.full(anzahl, hoehe), mitte[1] + np.cos(ziel_w) * r])
    return ring, ziel_w


def huellring(punkte, hoehe, abstand=0.005, anzahl=72, dicke=0.012, bruecke_grad=14, nur_rumpf=0.30):
    """Äußerer Umriss in einer Höhe, eng am Körper, aber Mulden (z. B. zwischen den Brüsten) überbrückt."""
    nahe = punkte[(np.abs(punkte[:, 1] - hoehe) < dicke) & (np.abs(punkte[:, 0]) < nur_rumpf)]
    mitte = nahe[:, [0, 2]].mean(axis=0)
    rel = nahe[:, [0, 2]] - mitte
    w = np.arctan2(rel[:, 0], rel[:, 1])
    r = np.linalg.norm(rel, axis=1)
    faecher = np.linspace(-np.pi, np.pi, anzahl, endpoint=False)
    breite = 2 * np.pi / anzahl
    rad = np.full(anzahl, np.nan)
    for i, f in enumerate(faecher):
        d = np.abs(np.arctan2(np.sin(w - f), np.cos(w - f)))
        m = d < breite
        if m.any():
            rad[i] = r[m].max()
    gueltig = ~np.isnan(rad)
    rad = np.interp(np.arange(anzahl), np.arange(anzahl)[gueltig], rad[gueltig], period=anzahl)
    # Brücke: gleitendes Maximum über ein paar Grad, dann glätten
    k = max(1, int(round(bruecke_grad / 360 * anzahl)))
    erw = np.concatenate([rad[-k:], rad, rad[:k]])
    gross = np.array([erw[i:i + 2 * k + 1].max() for i in range(anzahl)])
    erw = np.concatenate([gross[-2:], gross, gross[:2]])
    glatt_r = np.convolve(erw, np.ones(5) / 5, mode='valid')
    r_end = glatt_r + abstand
    return np.column_stack([mitte[0] + np.sin(faecher) * r_end, np.full(anzahl, hoehe), mitte[1] + np.cos(faecher) * r_end])


def schlauch(ringe, v_bereich=(0.0, 0.8)):
    """Übereinanderliegende Ringe zu einer Fläche verbinden (z. B. Brustband)."""
    reihen, n = len(ringe), len(ringe[0])
    punkte = np.vstack([np.vstack([r, r[:1]]) for r in ringe])
    umfang = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(np.vstack([ringe[0], ringe[0][:1]]), axis=0), axis=1))])
    uv = np.array([[umfang[i] / 0.2, v_bereich[0] + (v_bereich[1] - v_bereich[0]) * z / (reihen - 1)]
                   for z in range(reihen) for i in range(n + 1)])
    tri = []
    for z in range(reihen - 1):
        for i in range(n):
            a, b = z * (n + 1) + i, z * (n + 1) + i + 1
            c, d = (z + 1) * (n + 1) + i, (z + 1) * (n + 1) + i + 1
            tri += [[a, b, c], [b, d, c]]
    return punkte, np.array(tri), uv


def band(ring, hoehe_band, dicke=0.004):
    """Ein Band (z. B. Gürtel) um einen Ring: außen, innen, oben, unten. Gibt Punkte, Dreiecke, UV."""
    n = len(ring)
    mitte = ring.mean(axis=0)
    nach_aussen = ring - mitte
    nach_aussen[:, 1] = 0
    nach_aussen /= np.linalg.norm(nach_aussen, axis=1, keepdims=True)
    lagen = [
        ring + np.array([0, hoehe_band / 2, 0]) + nach_aussen * dicke,
        ring - np.array([0, hoehe_band / 2, 0]) + nach_aussen * dicke,
        ring - np.array([0, hoehe_band / 2, 0]),
        ring + np.array([0, hoehe_band / 2, 0]),
    ]
    punkte, uv, tri = [], [], []
    umfang = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(np.vstack([ring, ring[:1]]), axis=0), axis=1))])
    for li in range(4):
        for i in range(n + 1):
            punkte.append(lagen[li][i % n])
            uv.append([umfang[i] / hoehe_band * 0.25, li / 4])
    zeile = n + 1
    for li in range(4):
        lj = (li + 1) % 4
        for i in range(n):
            a, b = li * zeile + i, li * zeile + i + 1
            c, d = lj * zeile + i, lj * zeile + i + 1
            tri += [[a, c, b], [b, c, d]]
    return np.array(punkte), np.array(tri), np.array(uv)


class Stoff:
    """Ein rechteckiges Stoffstück (Raster), das fällt und dem Körper ausweicht."""

    def __init__(self, oben, laenge, zeilen=18, spalten=12):
        self.spalten, self.zeilen = spalten, zeilen
        # oben: (spalten, 3) Aufhängepunkte; nach unten hängen
        p = np.zeros((zeilen, spalten, 3))
        for z in range(zeilen):
            p[z] = oben - np.array([0, laenge * z / (zeilen - 1), 0])
        self.p = p.reshape(-1, 3)
        self.fest = np.zeros(len(self.p), bool)
        self.fest[:spalten] = True
        idx = np.arange(zeilen * spalten).reshape(zeilen, spalten)
        kanten = []
        for z in range(zeilen):
            for s in range(spalten):
                if s + 1 < spalten:
                    kanten.append((idx[z, s], idx[z, s + 1]))
                if z + 1 < zeilen:
                    kanten.append((idx[z, s], idx[z + 1, s]))
                if z + 1 < zeilen and s + 1 < spalten:
                    kanten.append((idx[z, s], idx[z + 1, s + 1]))
                    kanten.append((idx[z, s + 1], idx[z + 1, s]))
                if z + 2 < zeilen:
                    kanten.append((idx[z, s], idx[z + 2, s]))
        self.kanten = np.array(kanten)
        self.ruhe = np.linalg.norm(self.p[self.kanten[:, 0]] - self.p[self.kanten[:, 1]], axis=1)
        self.grad = np.bincount(self.kanten.ravel(), minlength=len(self.p)).astype(float)
        self.idx = idx

    def fallen(self, koerper_punkte, koerper_normalen, abstand=0.008, schritte=160, schwerkraft=0.0012,
               nach_vorn=None):
        baum = cKDTree(koerper_punkte)
        alt = self.p.copy()
        for _ in range(schritte):
            geschw = (self.p - alt) * 0.9
            alt = self.p.copy()
            self.p[~self.fest] += geschw[~self.fest]
            self.p[~self.fest, 1] -= schwerkraft
            if nach_vorn is not None:
                self.p[~self.fest] += nach_vorn * 0.0002
            for _ in range(6):
                a, b = self.kanten[:, 0], self.kanten[:, 1]
                d = self.p[b] - self.p[a]
                laenge = np.linalg.norm(d, axis=1)
                korr = ((laenge - self.ruhe) / np.maximum(laenge, 1e-9))[:, None] * d * 0.5
                beweglich_a = (~self.fest[a])[:, None]
                beweglich_b = (~self.fest[b])[:, None]
                summe = np.zeros_like(self.p)
                np.add.at(summe, a, korr * beweglich_a)
                np.add.at(summe, b, -korr * beweglich_b)
                # gemittelt (Jacobi), sonst schaukelt sich das Gitter auf
                self.p += summe / np.maximum(self.grad, 1)[:, None] * 1.8
                # Körper nicht durchdringen
                _, nah = baum.query(self.p, k=3)
                q = koerper_punkte[nah].mean(axis=1)
                n = koerper_normalen[nah].mean(axis=1)
                n /= np.linalg.norm(n, axis=1, keepdims=True)
                tiefe = ((self.p - q) * n).sum(axis=1)
                drin = (tiefe < abstand) & ~self.fest
                self.p[drin] += n[drin] * (abstand - tiefe[drin])[:, None]
        return self

    def netz(self):
        z, s = self.zeilen, self.spalten
        tri = []
        for i in range(z - 1):
            for j in range(s - 1):
                a, b, c, d = self.idx[i, j], self.idx[i, j + 1], self.idx[i + 1, j], self.idx[i + 1, j + 1]
                tri += [[a, c, b], [b, c, d]]
        uv = np.array([[j / (s - 1), i / (z - 1)] for i in range(z) for j in range(s)])
        return self.p.copy(), np.array(tri), uv


# ---------------------------------------------------------------- Lederstücke

def lendenschurz(punkte, normalen, skelett, weiblich=False):
    """Gürtel + vorderer und hinterer Lappen. Gibt eine Liste (Name, Punkte, Dreiecke, UV, Gewichtsart)."""
    k = {b['name']: b for b in skelett}
    huefte = (k['thigh_l']['kopf'][1] + k['pelvis']['kopf'][1]) / 2
    guertel_y = huefte + 0.03
    ring, winkel = querschnitt(punkte, guertel_y, abstand=0.004)
    teile = []
    ringe = [huellring(punkte, guertel_y + d, abstand=0.005, bruecke_grad=20) for d in (0.016, 0.0, -0.016)]
    gp, gt, guv = schlauch(ringe, (0.05, 0.25))
    teile.append(('guertel', gp, gt, guv, 'koerper'))
    for vorne, laenge, breite in ((True, 0.30 if not weiblich else 0.26, 0.27), (False, 0.33 if not weiblich else 0.30, 0.32)):
        mitte_w = 0.0 if vorne else np.pi
        halb = breite / 2
        # Aufhängepunkte entlang des Gürtels (unterhalb)
        rel_w = np.arctan2(np.sin(winkel - mitte_w), np.cos(winkel - mitte_w))
        r_guertel = np.linalg.norm(ring[:, [0, 2]] - ring[:, [0, 2]].mean(axis=0), axis=1).mean()
        spanne = halb / r_guertel
        spalten = 12
        ziel = np.linspace(-spanne, spanne, spalten)
        reihen = np.argsort(rel_w)
        oben = np.column_stack([np.interp(ziel, rel_w[reihen], ring[reihen, i]) for i in range(3)])
        oben[:, 1] = guertel_y - 0.012
        mitte = ring.mean(axis=0)
        aussen = oben - mitte
        aussen[:, 1] = 0
        aussen /= np.linalg.norm(aussen, axis=1, keepdims=True)
        oben += aussen * 0.004
        stoff = Stoff(oben, laenge, zeilen=16, spalten=spalten)
        stoff.fallen(punkte, normalen, abstand=0.009, schritte=240, schwerkraft=0.002,
                     nach_vorn=np.array([0, 0, 0.5]) if vorne else None)
        p, t, uv = stoff.netz()
        # unterer Rand leicht ausgefranst (UV v > 0.85 wird in der Textur durchsichtig)
        teile.append(('lappen_vorne' if vorne else 'lappen_hinten', p, t, uv, 'lappen'))
    return teile


def lappen_knochen(teile):
    """Je Lappen ein Pendel-Knochen: Kopf in der Mitte der Aufhängung, Schwanz in der Mitte unten."""
    knochen = []
    for name, p, t, uv, art in teile:
        if art != 'lappen':
            continue
        oben = p[uv[:, 1] < 0.01].mean(axis=0)
        unten = p[uv[:, 1] > 0.99].mean(axis=0)
        knochen.append({'name': name, 'eltern': 'pelvis', 'kopf': oben, 'schwanz': unten})
    return knochen


def brustband(punkte, skelett):
    k = {b['name']: b for b in skelett}
    brust = punkte[(np.abs(punkte[:, 0]) < 0.16) & (punkte[:, 1] > k['spine_03']['kopf'][1]) &
                   (punkte[:, 1] < k['spine_03']['schwanz'][1] + 0.05)]
    # Höhe der Brust: die am weitesten vorne liegenden Punkte
    vorne = brust[brust[:, 2] > np.percentile(brust[:, 2], 97)]
    y = vorne[:, 1].mean()
    ringe = [huellring(punkte, y + d, abstand=0.004, anzahl=96, dicke=0.008, bruecke_grad=12, nur_rumpf=0.19)
             for d in np.linspace(0.06, -0.055, 7)]
    p, t, uv = schlauch(ringe, (0.05, 0.75))
    return [('brustband', p, t, uv, 'koerper')]


# ---------------------------------------------------------------- Lederoberfläche

def leder_textur(groesse=512, grund=(0.36, 0.25, 0.16), saat=3, fransen=True):
    """Farbe (mit Durchsichtigkeit am ausgefransten Rand), Normalen, Rauheit eines gegerbten Fells."""
    v, u = np.mgrid[0:groesse, 0:groesse] / groesse
    p = np.stack([u * 1.0, v * 1.0, np.zeros_like(u)], -1)
    grob = fbm(p, 4, 4, saat)
    fein = fbm(p, 40, 3, saat + 1)
    falten = rauschen(np.stack([u * 0.4, v * 3.0, np.zeros_like(u)], -1), 8, saat + 2)
    farbe = np.array(grund) * (0.75 + 0.45 * grob[..., None]) * (0.9 + 0.2 * fein[..., None])
    flecken = glatt(0.55, 0.75, fbm(p, 7, 3, saat + 3))
    farbe *= (1 - 0.25 * flecken[..., None])
    alpha = np.ones_like(u)
    if fransen:
        rand = 0.9 + 0.06 * (rauschen(np.stack([u * 1, np.zeros_like(u), np.zeros_like(u)], -1), 30, saat + 4) - 0.5) * 2
        alpha = 1 - glatt(rand - 0.01, rand + 0.01, v)
        farbe *= (1 - 0.3 * glatt(rand - 0.08, rand, v))[..., None]
    hoehe = grob * 0.6 + fein * 0.25 + falten * 0.4
    gy, gx = np.gradient(hoehe)
    n = np.stack([-gx * 18, gy * 18, np.ones_like(gx)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    rauh = 0.72 + 0.15 * (fein - 0.5)
    orm = np.stack([0.85 + 0.15 * grob, rauh, np.zeros_like(u)], -1)

    def acht(x):
        return (np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8)

    return acht(np.dstack([farbe, alpha])), acht(n * 0.5 + 0.5), acht(orm)


# ---------------------------------------------------------------- Kutte (Einsiedler)

def _glaetten(punkte, dreiecke, schritte=8, staerke=0.5):
    nachbarn = [set() for _ in range(len(punkte))]
    for a, b, c in dreiecke:
        nachbarn[a] |= {b, c}
        nachbarn[b] |= {a, c}
        nachbarn[c] |= {a, b}
    p = punkte.copy()
    for _ in range(schritte):
        mitte = np.array([p[list(n)].mean(axis=0) if n else p[i] for i, n in enumerate(nachbarn)])
        p += (mitte - p) * staerke
    return p


def kutte(koerper, normalen_alle, skelett, aermel_bis=0.40, koerper_flaechen=None):
    """Lange Wollkutte aus den MakeHuman-Hilfsformen ('helper-tights' oben, 'helper-skirt' unten).
    Gibt Punktindizes im Grundkörper (für die Gewichte), neue Punkte, Dreiecke, UV."""
    import netz
    k = {b['name']: b for b in skelett}
    P = koerper.in_meter(koerper.v)
    rock_f, _ = koerper.gruppen_flaechen('helper-skirt')
    oben_f, _ = koerper.gruppen_flaechen('helper-tights')
    rock_oben = P[koerper.vgruppen['helper-skirt']][:, 1].max()
    behalten = []
    for f in oben_f:
        m = P[f].mean(axis=0)
        if m[1] > rock_oben - 0.14 and abs(m[0]) < aermel_bis:
            behalten.append(f)
    flaechen = behalten + list(rock_f)
    dreiecke_roh = netz.dreiecke(flaechen)
    benutzt = np.unique(dreiecke_roh)
    neu_index = {v: i for i, v in enumerate(benutzt)}
    tri = np.array([[neu_index[v] for v in t] for t in dreiecke_roh])
    p = P[benutzt].copy()
    n = netz.normalen(p, tri)
    # Stoff ist weicher als Haut: Muskeln glätten, etwas Abstand, unten weiter werdend
    p = _glaetten(p, tri, schritte=10, staerke=0.5)
    n = netz.normalen(p, tri)
    p += n * 0.012
    # Nirgends in den Körper eintauchen (Glätten schrumpft Schultern und Ellbogen)
    if koerper_flaechen is not None:
        haut_idx = np.unique(koerper_flaechen)
        hp = P[haut_idx]
        hn = normalen_alle[haut_idx]
        baum = cKDTree(hp)
        for _ in range(3):
            _, nah = baum.query(p, k=4)
            q = hp[nah].mean(axis=1)
            nn = hn[nah].mean(axis=1)
            nn /= np.linalg.norm(nn, axis=1, keepdims=True)
            tiefe = ((p - q) * nn).sum(axis=1)
            drin = tiefe < 0.014
            p[drin] += nn[drin] * (0.014 - tiefe[drin])[:, None]
            p = p * 0.6 + _glaetten(p, tri, schritte=2, staerke=0.5) * 0.4
    knoechel = k['foot_l']['kopf'][1]
    huefte = k['pelvis']['kopf'][1]
    achse = np.array([0.0, 0, k['pelvis']['kopf'][2]])
    ist_rock = np.isin(benutzt, koerper.vgruppen['helper-skirt'])
    tiefe = np.clip((huefte - p[:, 1]) / (huefte - knoechel), 0, 1)
    radial = p - achse
    radial[:, 1] = 0
    p[ist_rock] += radial[ist_rock] * (0.35 * tiefe[ist_rock] ** 1.3)[:, None]
    # Saum nicht ganz bis zum Boden
    # UV: Umfangswinkel und Höhe (Wollmuster ohne sichtbare Richtung)
    winkel = np.arctan2(p[:, 0], p[:, 2] - achse[2])
    uv = np.column_stack([winkel / (2 * np.pi) * 3 + 0.5, p[:, 1] * 2.5])
    return benutzt, p, tri, uv


def strick(ring, radius=0.008, seiten=6):
    """Ein gedrehter Strick um einen Ring (Gürtel der Kutte)."""
    n = len(ring)
    mitte = ring.mean(axis=0)
    punkte, uv, tri = [], [], []
    for i in range(n + 1):
        a = ring[i % n]
        t = ring[(i + 1) % n] - ring[(i - 1) % n]
        t /= np.linalg.norm(t)
        aussen = a - mitte
        aussen[1] = 0
        aussen /= np.linalg.norm(aussen)
        oben = np.cross(t, aussen)
        for s in range(seiten + 1):
            w = 2 * np.pi * s / seiten
            punkte.append(a + (np.cos(w) * aussen + np.sin(w) * oben) * radius)
            uv.append([i / n * 40, s / seiten])
    for i in range(n):
        for s in range(seiten):
            a = i * (seiten + 1) + s
            b, c, d = a + 1, a + seiten + 1, a + seiten + 2
            tri += [[a, c, b], [b, c, d]]
    return np.array(punkte), np.array(tri), np.array(uv)


def wolle_textur(groesse=512, grund=(0.42, 0.37, 0.30), saat=11):
    v, u = np.mgrid[0:groesse, 0:groesse] / groesse
    p = np.stack([u, v, np.zeros_like(u)], -1)
    # Gewebe: feine Kett- und Schussfäden
    faden = 0.5 + 0.25 * np.sin(u * 2 * np.pi * 128) * np.sin(v * 2 * np.pi * 128)
    noppen = fbm(p, 24, 3, saat)
    flecken = fbm(p, 3, 3, saat + 1)
    farbe = np.array(grund) * (0.85 + 0.2 * flecken[..., None]) * (0.96 + 0.06 * faden[..., None]) * (0.92 + 0.12 * noppen[..., None])
    hoehe = faden * 0.6 + noppen * 0.4
    gy, gx = np.gradient(hoehe)
    n = np.stack([-gx * 25, gy * 25, np.ones_like(gx)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    orm = np.stack([0.8 + 0.2 * faden, 0.9 + 0.05 * noppen, np.zeros_like(u)], -1)

    def acht(x):
        return (np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8)

    return acht(farbe), acht(n * 0.5 + 0.5), acht(orm)
