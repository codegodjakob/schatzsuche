"""Haare als Strähnen-Karten: Wurzeln auf der Kopfhaut, Wachstum mit Schwerkraft,
Ausweichen vor Kopf und Schultern, dann schmale Bänder mit einer Strähnen-Textur."""
import numpy as np
from scipy.spatial import cKDTree

from haut import glatt, kopf_bezug, kopfhaut_anteil, rauschen


def wurzeln(punkte, normalen, dreiecke, gewicht_je_punkt, anzahl, saat=0):
    """Zufällige Punkte auf den Dreiecken, gewichtet nach Fläche × Haaranteil."""
    zufall = np.random.default_rng(saat)
    a, b, c = punkte[dreiecke[:, 0]], punkte[dreiecke[:, 1]], punkte[dreiecke[:, 2]]
    flaeche = np.linalg.norm(np.cross(b - a, c - a), axis=1) / 2
    w = flaeche * gewicht_je_punkt[dreiecke].mean(axis=1)
    w /= w.sum()
    wahl = zufall.choice(len(dreiecke), size=anzahl, p=w)
    r1, r2 = zufall.random(anzahl), zufall.random(anzahl)
    s = np.sqrt(r1)
    l0, l1, l2 = 1 - s, s * (1 - r2), s * r2
    t = dreiecke[wahl]
    p = punkte[t[:, 0]] * l0[:, None] + punkte[t[:, 1]] * l1[:, None] + punkte[t[:, 2]] * l2[:, None]
    n = normalen[t[:, 0]] * l0[:, None] + normalen[t[:, 1]] * l1[:, None] + normalen[t[:, 2]] * l2[:, None]
    n /= np.linalg.norm(n, axis=1, keepdims=True)
    return p, n


def straehnen(wurzel, normale, laengen, kamm, koerper_p, koerper_n, glieder=8, abstand=0.004,
              schwere=0.6, steife=0.5, schritte=110, saat=0, volumen=0.006, kamm_kraft=0.0006,
              gesicht=None):
    """Strähnen als Punktketten. kamm: Kämmrichtung je Wurzel. Gibt (anzahl, glieder+1, 3).
    gesicht: (augen_mitte, kinn_y, stirn_y) – dann bleiben Haare hinter der Gesichtsebene."""
    zufall = np.random.default_rng(saat + 1)
    n = len(wurzel)
    seg = (laengen / glieder)[:, None]
    start = normale * (1 - steife) + kamm * steife
    start /= np.linalg.norm(start, axis=1, keepdims=True)
    kette = np.zeros((n, glieder + 1, 3))
    kette[:, 0] = wurzel
    richtung = start.copy()
    for i in range(1, glieder + 1):
        richtung = richtung + kamm * 0.15 + np.array([0, -schwere * i / glieder, 0]) * 0.25
        richtung += zufall.normal(0, 0.06, richtung.shape)
        richtung /= np.linalg.norm(richtung, axis=1, keepdims=True)
        kette[:, i] = kette[:, i - 1] + richtung * seg
    baum = cKDTree(koerper_p)
    extra = abstand + zufall.random(n) * volumen  # Strähnen liegen in Schichten -> Fülle
    # Kämmen wirkt vor allem nahe der Wurzel; weiter unten zieht die Schwerkraft
    verlauf = np.clip(1 - np.linspace(0, 1, glieder - 1) / 0.45, 0, 1) ** 1.5
    zug = verlauf[None, :, None] * kamm[:, None, :] * kamm_kraft
    alt = kette.copy()
    for _ in range(schritte):
        neu = kette + (kette - alt) * 0.75
        neu[:, 2:, 1] -= 0.0006 * schwere
        neu[:, 2:] += zug
        alt = kette
        kette = neu
        kette[:, 0] = wurzel
        kette[:, 1] = wurzel + start * seg
        for _ in range(3):
            d = kette[:, 1:] - kette[:, :-1]
            laenge = np.linalg.norm(d, axis=2, keepdims=True)
            korr = (laenge - seg[:, None]) / np.maximum(laenge, 1e-9) * d
            kette[:, 2:] -= korr[:, 1:] * 0.5
            kette[:, 1:-1] += korr[:, 1:] * 0.5
            # Biegesteife: Abstand zwischen i und i+2 nicht zu klein
            d2 = kette[:, 2:] - kette[:, :-2]
            l2 = np.linalg.norm(d2, axis=2, keepdims=True)
            soll = 2 * seg[:, None] * 0.97
            zu_kurz = np.minimum(l2 - soll, 0) / np.maximum(l2, 1e-9) * d2 * 0.25
            kette[:, 2:] -= zu_kurz
            kette[:, 1] = wurzel + start * seg
        flach = kette[:, 2:].reshape(-1, 3)
        _, nah = baum.query(flach, k=4)
        q = koerper_p[nah].mean(axis=1)
        nn = koerper_n[nah].mean(axis=1)
        nn /= np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-9)
        mindest = np.repeat(extra, glieder - 1)
        tiefe = ((flach - q) * nn).sum(axis=1)
        drin = tiefe < mindest
        flach[drin] += nn[drin] * (mindest[drin] - tiefe[drin])[:, None]
        if gesicht is not None:
            augen, kinn_y, stirn_y = gesicht
            vor_gesicht = (np.abs(flach[:, 0] - augen[0]) < 0.065) & (flach[:, 1] > kinn_y) & (flach[:, 1] < stirn_y)
            grenze = augen[2] - 0.045
            zu_weit = vor_gesicht & (flach[:, 2] > grenze)
            flach[zu_weit, 2] = grenze
        kette[:, 2:] = flach.reshape(n, glieder - 1, 3)
    return kette


def karten(ketten, breite_wurzel, mitte, saat=0, spalten_atlas=8):
    """Strähnen -> flache Bänder (zwei Punkte je Kettenglied). Bänder liegen flach am Kopf."""
    zufall = np.random.default_rng(saat + 2)
    n, g, _ = ketten.shape
    tang = np.gradient(ketten, axis=1)
    tang /= np.maximum(np.linalg.norm(tang, axis=2, keepdims=True), 1e-9)
    aussen = ketten - mitte
    aussen /= np.linalg.norm(aussen, axis=2, keepdims=True)
    quer = np.cross(tang, aussen)
    quer /= np.maximum(np.linalg.norm(quer, axis=2, keepdims=True), 1e-9)
    t = np.linspace(0, 1, g)
    breite = breite_wurzel[:, None] * (1 - 0.55 * t ** 1.5)
    links = ketten + quer * breite[..., None] / 2
    rechts = ketten - quer * breite[..., None] / 2
    punkte = np.stack([links, rechts], axis=2).reshape(-1, 3)
    spalte = zufall.integers(0, spalten_atlas, n)
    u0 = spalte / spalten_atlas
    uv = np.zeros((n, g, 2, 2))
    uv[:, :, 0, 0] = u0[:, None]
    uv[:, :, 1, 0] = (u0 + 1 / spalten_atlas)[:, None] - 0.002
    uv[:, :, :, 1] = t[None, :, None]
    uv = uv.reshape(-1, 2)
    tri = []
    for s in range(n):
        basis = s * g * 2
        for i in range(g - 1):
            a, b = basis + i * 2, basis + i * 2 + 1
            c, d = basis + (i + 1) * 2, basis + (i + 1) * 2 + 1
            tri += [[a, c, b], [b, c, d]]
    normale = np.repeat(aussen.reshape(-1, 3), 2, axis=0)
    return punkte, np.array(tri), uv, normale


def haar_textur(farbe, breite=1024, hoehe=1024, spalten=8, saat=0):
    """Strähnen-Atlas: In jeder Spalte eine Strähne aus vielen feinen Haaren. Zur Mitte dicht, zu den Rändern
    hin lichter (so sieht man die Kante der Karte nicht), zur Spitze hin schmaler und ausgefranst.
    Haare wellen sich leicht und haben eigene Farbtöne; an der Wurzel etwas dunkler."""
    zufall = np.random.default_rng(saat + 3)
    bild = np.zeros((hoehe, breite, 4), np.float32)
    v = np.linspace(0, 1, hoehe)[:, None]
    bild[..., :3] = np.array(farbe) * (0.88 + 0.12 * v)[..., None]  # Grundton unter den einzelnen Haaren (Wurzel etwas dunkler)
    x = np.arange(breite)[None, :]
    spalte_b = breite // spalten
    for sp in range(spalten):
        mitte_sp = sp * spalte_b + spalte_b / 2
        for _ in range(90):
            # Lage quer zur Strähne: zur Mitte gehäuft (Gauß), an der Spitze rückt alles zusammen
            quer = np.clip(zufall.normal(0, 0.24), -0.46, 0.46) * spalte_b
            zur_spitze = 1 - 0.55 * v ** 1.3
            welle = zufall.uniform(0.5, 2.5) * np.sin(v * zufall.uniform(4, 11) + zufall.uniform(0, 6.3))
            mitte = mitte_sp + quer * zur_spitze + welle
            dicke = zufall.uniform(0.45, 1.0)
            ende = zufall.uniform(0.62, 1.0)
            d = np.abs(x - mitte)
            deckung = np.clip(1.0 - d / dicke, 0, 1) * (1 - glatt(ende - 0.2, ende, v)) * glatt(0.0, 0.03, v)
            deckung *= zufall.uniform(0.6, 1.0)
            hell = zufall.uniform(0.78, 1.22)
            ton = (np.array(farbe) * hell * (0.9 + 0.15 * v))[:, None, :]
            bild[..., :3] = bild[..., :3] * (1 - deckung[..., None]) + ton * deckung[..., None]
            bild[..., 3] = np.maximum(bild[..., 3], deckung)
        # Ein weicher Grundschleier in der Mitte jeder Spalte, damit die Strähne nicht durchsichtig wirkt
        rel = (x - mitte_sp) / (spalte_b * 0.32 * (1 - 0.5 * v))
        schleier = np.exp(-rel ** 2) * 0.55 * (1 - glatt(0.55, 0.9, v)) * glatt(0.0, 0.03, v)
        bild[..., 3] = np.maximum(bild[..., 3], schleier * (np.abs(x - mitte_sp) < spalte_b / 2))
    leer = bild[..., 3] < 0.05
    bild[leer, :3] = np.array(farbe)
    return (np.clip(bild, 0, 1) * 255 + 0.5).astype(np.uint8)


def straehnen_von(k, punkte, normalen, dreiecke, stil, saat=0):
    """Die Strähnen einer Frisur als Punktketten, noch ohne Karten.
    stil: dict(art='kurz'|'lang'|'kranz', laenge=(min,max), anzahl, breite, farbe, bart=bool)
    Gibt eine Liste von (name, ketten, breite je Strähne, mitte, saat für die Karten)."""
    auge_l, auge_r, augen_mitte, kopf_mitte = kopf_bezug(k)
    teile = []
    oberkoerper = punkte[:, 1] > augen_mitte[1] - 0.75
    kp, kn = punkte[oberkoerper], normalen[oberkoerper]

    if stil['art'] != 'keine':
        anteil = kopfhaut_anteil(punkte, augen_mitte, kopf_mitte, stil.get('glatze', False), weich=(0.0, 0.004))
        # Vorne oben mehr Wurzeln: dort sieht man am ehesten durch die Haare auf die Kopfhaut
        rel_p = punkte - kopf_mitte
        vorn_oben = glatt(-0.02, 0.06, rel_p[:, 2]) * glatt(0.02, 0.09, rel_p[:, 1])
        w, nrm = wurzeln(punkte, normalen, dreiecke, anteil * (1 + 1.5 * vorn_oben), stil['anzahl'], saat)
        zufall = np.random.default_rng(saat)
        lmin, lmax = stil['laenge']
        laengen = lmin + (lmax - lmin) * zufall.random(len(w)) ** 0.7
        # Kämmrichtung: vorne und oben nach hinten, an Seiten und Hinterkopf nach unten
        rel = w - kopf_mitte
        oben_vorn = glatt(-0.04, 0.05, rel[:, 2]) * glatt(0.0, 0.08, rel[:, 1])
        if stil.get('glatze'):
            oben_vorn *= 0
        # Vorne ein Seitenscheitel: Die Haare fallen schräg zur Seite und nach hinten, so bleibt keine Lücke in der Mitte
        kamm = np.array([0.55, -0.15, -0.8]) * oben_vorn[:, None] + np.array([0, -1.0, -0.25]) * (1 - oben_vorn[:, None])
        kamm[:, 0] += np.sign(rel[:, 0]) * 0.25 * (1 - oben_vorn)
        kamm -= (kamm * nrm).sum(axis=1, keepdims=True) * nrm
        kamm /= np.maximum(np.linalg.norm(kamm, axis=1, keepdims=True), 1e-9)
        lang = stil['art'] == 'lang'
        glieder = 10 if lang else 5
        gesicht = (augen_mitte, augen_mitte[1] - 0.13, augen_mitte[1] + 0.07)
        glatze = stil.get('glatze', False)
        ketten = straehnen(w, nrm, laengen, kamm, kp, kn, glieder=glieder,
                           schwere=1.6 if lang else (1.0 if glatze else 0.15),
                           steife=stil.get('steife', 0.85 if not glatze else 0.7), saat=saat, schritte=160 if lang else 110,
                           volumen=0.008 if lang else 0.006,
                           kamm_kraft=0.0005 if lang else (0.0004 if glatze else 0.0012),
                           gesicht=gesicht)
        breite = stil['breite'] * (0.7 + 0.6 * zufall.random(len(w)))
        teile.append(('haare', ketten, breite, kopf_mitte, saat))

    if stil.get('bart'):
        # Bart: Wurzeln an Kinn, Kiefer, Oberlippe
        quer = np.abs(punkte[:, 0] - augen_mitte[0])
        mund_y = augen_mitte[1] - 0.072
        obere = augen_mitte[1] - 0.045 - 0.25 * np.maximum(quer - 0.02, 0)
        bartzone = (glatt(obere + 0.004, obere - 0.01, punkte[:, 1]) * glatt(mund_y - 0.075, mund_y - 0.05, punkte[:, 1])
                    * (1 - glatt(0.058, 0.07, quer)) * glatt(kopf_mitte[2] - 0.02, kopf_mitte[2] + 0.01, punkte[:, 2]))
        lippen_frei = 1 - np.exp(-((punkte[:, 1] - (mund_y + 0.004)) ** 2) / 0.00004 - 0 * quer) * (quer < 0.025)
        bartzone *= np.clip(lippen_frei, 0, 1)
        w, nrm = wurzeln(punkte, normalen, dreiecke, bartzone, stil.get('bart_anzahl', 900), saat + 7)
        zufall = np.random.default_rng(saat + 7)
        lmin, lmax = stil.get('bart_laenge', (0.06, 0.16))
        laengen = lmin + (lmax - lmin) * zufall.random(len(w))
        kamm = np.tile([0, -1.0, 0.25], (len(w), 1))
        kamm -= (kamm * nrm).sum(axis=1, keepdims=True) * nrm
        kamm /= np.maximum(np.linalg.norm(kamm, axis=1, keepdims=True), 1e-9)
        ketten = straehnen(w, nrm, laengen, kamm, kp, kn, glieder=7, schwere=0.9, steife=0.8, saat=saat + 8,
                           volumen=0.01)
        mitte_bart = augen_mitte + np.array([0, -0.06, -0.04])
        teile.append(('bart', ketten, stil['breite'] * 0.8 * (0.7 + 0.6 * zufall.random(len(w))), mitte_bart, saat + 9))
    return teile


def frisur(k, punkte, normalen, dreiecke, stil, saat=0):
    """Fertige Haar- und Bartkarten: Liste von (name, punkte, dreiecke, uv, normalen)."""
    return [(name,) + karten(ketten, breite, mitte, s)
            for name, ketten, breite, mitte, s in straehnen_von(k, punkte, normalen, dreiecke, stil, saat)]
