"""Malt die Haut-Texturen (Farbe, Oberflächenstruktur, Rauheit) direkt im UV-Raum des Körpers.

Trick: Jedes Texel kennt seinen 3D-Ort auf dem Körper (Positionskarte). Damit lassen sich
Augenbrauen, Bartschatten, Haaransatz, Rötungen und Erde an den Füßen räumlich beschreiben
und trotzdem in die Textur malen.
"""
import numpy as np
from PIL import Image

import mh


# ---------------------------------------------------------------- Rasterung in den UV-Raum

def positionskarte(punkte, normalen, uv, dreiecke, groesse):
    """Für jedes Texel: 3D-Ort und Normale (Ruhelage). uv in [0,1], Zeile 0 = oben (v nach unten)."""
    H = W = groesse
    ort = np.zeros((H, W, 3), np.float32)
    nor = np.zeros((H, W, 3), np.float32)
    belegt = np.zeros((H, W), bool)
    pix = uv * np.array([W, H]) - 0.5
    for tri in dreiecke:
        a, b, c = pix[tri]
        x0, y0 = np.floor(np.minimum(np.minimum(a, b), c)).astype(int)
        x1, y1 = np.ceil(np.maximum(np.maximum(a, b), c)).astype(int)
        x0, y0 = max(x0, 0), max(y0, 0)
        x1, y1 = min(x1, W - 1), min(y1, H - 1)
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        v0, v1 = b - a, c - a
        d = v0[0] * v1[1] - v1[0] * v0[1]
        if abs(d) < 1e-12:
            continue
        px, py = gx - a[0], gy - a[1]
        l1 = (px * v1[1] - v1[0] * py) / d
        l2 = (v0[0] * py - px * v0[1]) / d
        l0 = 1 - l1 - l2
        innen = (l0 >= -0.02) & (l1 >= -0.02) & (l2 >= -0.02)
        if not innen.any():
            continue
        yy, xx = gy[innen], gx[innen]
        w = np.stack([l0[innen], l1[innen], l2[innen]], axis=1)
        ort[yy, xx] = w @ punkte[tri]
        nor[yy, xx] = w @ normalen[tri]
        belegt[yy, xx] = True
    nor /= np.maximum(np.linalg.norm(nor, axis=2, keepdims=True), 1e-9)
    return ort, nor, belegt


def ausdehnen(bild, belegt, schritte=12):
    """Ränder der UV-Inseln nach außen fortsetzen, damit keine Nähte durchscheinen."""
    bild = bild.astype(np.float32).copy()
    maske = belegt.copy()
    for _ in range(schritte):
        summe = np.zeros_like(bild)
        anzahl = np.zeros(maske.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            verschoben = np.roll(np.roll(bild, dy, 0), dx, 1)
            m = np.roll(np.roll(maske, dy, 0), dx, 1)
            summe += verschoben * m[..., None] if bild.ndim == 3 else verschoben * m
            anzahl += m
        neu = (~maske) & (anzahl > 0)
        if bild.ndim == 3:
            bild[neu] = summe[neu] / anzahl[neu][:, None]
        else:
            bild[neu] = summe[neu] / anzahl[neu]
        maske |= neu
    return bild


# ---------------------------------------------------------------- Rauschen im Raum

def _hash(ix, iy, iz, saat):
    h = (ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791) ^ (saat * 2654435761)
    h = (h ^ (h >> 13)) * 1274126177
    return ((h ^ (h >> 16)) & 0xFFFFFF).astype(np.float32) / 0xFFFFFF


def rauschen(p, frequenz, saat=0):
    """Glattes Wertrauschen in 3D, Werte etwa 0..1."""
    q = p * frequenz
    i = np.floor(q).astype(np.int64)
    f = q - i
    f = f * f * (3 - 2 * f)
    ergebnis = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (f[..., 0] if dx else 1 - f[..., 0]) * (f[..., 1] if dy else 1 - f[..., 1]) * (f[..., 2] if dz else 1 - f[..., 2])
                ergebnis = ergebnis + w * _hash(i[..., 0] + dx, i[..., 1] + dy, i[..., 2] + dz, saat)
    return ergebnis


def fbm(p, frequenz, oktaven=4, saat=0):
    summe, amp, norm = 0, 1.0, 0
    for o in range(oktaven):
        summe = summe + amp * rauschen(p, frequenz * 2 ** o, saat + o * 17)
        norm += amp
        amp *= 0.5
    return summe / norm


def zellen(p, frequenz, saat=0):
    """Abstand zum nächsten zufälligen Punkt (Poren, Sommersprossen). 0 = im Punkt."""
    q = p * frequenz
    i = np.floor(q).astype(np.int64)
    best = np.full(q.shape[:-1], 9.0, np.float32)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                j = i + np.array([dx, dy, dz])
                zufall = np.stack([_hash(j[..., 0], j[..., 1], j[..., 2], saat + k) for k in range(3)], -1)
                d = np.linalg.norm(j + zufall - q, axis=-1)
                best = np.minimum(best, d)
    return best


def glatt(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def kugel(p, mitte, radius):
    return 1 - glatt(0, 1, np.linalg.norm(p - mitte, axis=-1) / radius)


def _maske(name, groesse):
    m = Image.open(mh.MPFB / 'textures' / f'mpfb_{name}.jpg').convert('L').resize((groesse, groesse), Image.BILINEAR)
    return np.asarray(m, np.float32) / 255


# ---------------------------------------------------------------- Kopf-Bezugspunkte

def kopf_bezug(k):
    auge_l = k.in_meter(k.gelenk('joint-l-eye'))
    auge_r = k.in_meter(k.gelenk('joint-r-eye'))
    augen_mitte = (auge_l + auge_r) / 2
    return auge_l, auge_r, augen_mitte, augen_mitte + np.array([0, 0.02, -0.075])


def kopfhaut_anteil(p, augen_mitte, kopf_mitte, glatze=False, weich=(-0.004, 0.006)):
    """0..1: wie sehr ein Punkt auf der behaarten Kopfhaut liegt."""
    rel = p - kopf_mitte
    winkel = np.degrees(np.abs(np.arctan2(rel[..., 0], rel[..., 2])))
    stuetz_w = np.array([0, 50, 90, 125, 180])
    stuetz_h = np.array([0.062, 0.05, 0.022, -0.035, -0.072]) + augen_mitte[1]
    if glatze:
        stuetz_h = np.array([0.10, 0.09, 0.03, -0.03, -0.065]) + augen_mitte[1]
    ansatz = np.interp(winkel, stuetz_w, stuetz_h)
    auf_kopf = np.linalg.norm(rel, axis=-1) < 0.17
    anteil = auf_kopf * glatt(weich[0], weich[1], p[..., 1] - ansatz)
    if glatze:
        oben = glatt(0.0, 0.03, p[..., 1] - (augen_mitte[1] + 0.07)) * glatt(-0.4, 0.2, rel[..., 2] / 0.1 + 0.3)
        anteil = anteil * (1 - oben * 0.95)
    return anteil


# ---------------------------------------------------------------- Die Haut selbst

def male_haut(k, skelett, punkte, normalen, uv, dreiecke, art, groesse=2048, saat=1):
    """art: dict mit hautfarbe, haarfarbe, bart (0..1), alter (0..1), weiblich (bool), glatze (bool)"""
    ort_bild, nor_bild, belegt = positionskarte(punkte, normalen, uv, dreiecke, groesse)
    wo = np.nonzero(belegt)
    p = ort_bild[wo]
    nor = nor_bild[wo]

    def maske(name):
        return _maske(name, groesse)[wo]
    kn = {b['name']: b for b in skelett}
    auge_l, auge_r, augen_mitte, kopf_mitte = kopf_bezug(k)

    # Grundton mit großflächigen und feinen Schwankungen
    basis = np.array(art['hautfarbe'], np.float32)
    farbe = np.tile(basis, (len(p), 1))
    gross = fbm(p, 6, 3, saat) - 0.5
    mittel = fbm(p, 40, 3, saat + 5) - 0.5
    farbe *= (1 + 0.10 * gross[..., None] + 0.05 * mittel[..., None])
    # rötliche Flecken und Unregelmäßigkeit (Blutgefäße unter der Haut)
    roete = np.clip(fbm(p, 18, 3, saat + 9) - 0.45, 0, 1) * 0.25
    farbe += roete[..., None] * np.array([0.10, -0.03, -0.03])

    def toene(gewicht, ziel, staerke=1.0):
        nonlocal farbe
        g = np.clip(gewicht * staerke, 0, 1)[..., None]
        farbe = farbe * (1 - g) + np.array(ziel, np.float32) * g

    rot = basis * np.array([1.06, 0.86, 0.84])
    gesicht = maske('face')
    # Wangen, Nase, Ohren, Knie, Ellbogen, Knöchel röter
    for seite in (1, -1):
        wange = augen_mitte + np.array([seite * 0.033, -0.032, 0.0])
        toene(kugel(p, wange, 0.035) * gesicht, rot, 0.45)
    nasenspitze = augen_mitte + np.array([0, -0.045, 0.045])
    toene(kugel(p, nasenspitze, 0.02), rot, 0.4)
    toene(maske('ears'), rot, 0.35)
    for knochen in ('calf_l', 'calf_r'):
        knie = kn[knochen]['kopf'] + np.array([0, 0, 0.05])
        toene(kugel(p, knie, 0.07), basis * np.array([1.02, 0.84, 0.80]), 0.35)
    for knochen in ('lowerarm_l', 'lowerarm_r'):
        toene(kugel(p, kn[knochen]['kopf'], 0.045), basis * np.array([0.96, 0.82, 0.78]), 0.4)
    for finger in ('index', 'middle', 'ring', 'pinky'):
        for s in 'lr':
            toene(kugel(p, kn[f'{finger}_01_{s}']['kopf'], 0.014), rot, 0.35)
    # Achseln, Leiste dunkler
    for s in 'lr':
        achsel = kn[f'upperarm_{s}']['kopf'] + np.array([-0.04 if s == 'l' else 0.04, -0.06, -0.02])
        toene(kugel(p, achsel, 0.06), basis * 0.82, 0.5)
    toene(maske('crotch'), basis * 0.85, 0.5)

    # Lippen, Lider, Nägel, Brustwarzen
    toene(maske('lips'), np.array(art.get('lippen', basis * np.array([0.88, 0.62, 0.62]))), 0.85)
    toene(maske('eyelids'), basis * np.array([0.93, 0.80, 0.78]), 0.5)
    naegel = np.maximum(maske('fingernails'), maske('toenails'))
    toene(naegel, np.array([0.86, 0.72, 0.66]), 0.8)
    toene(maske('aureolae'), basis * np.array([0.80, 0.62, 0.58]), 0.75)

    # Sommersprossen / Altersflecken
    flecken = 1 - glatt(0.0, 0.18, zellen(p, 90, saat + 3))
    flecken *= (fbm(p, 5, 2, saat + 4) > 0.5)
    toene(flecken * (0.25 + 0.2 * art.get('alter', 0)), basis * np.array([0.80, 0.65, 0.55]), 0.55)

    # Augenbrauen
    haar = np.array(art['haarfarbe'], np.float32)
    braue = np.zeros(len(p), np.float32)
    for seite, auge in ((1, auge_l), (-1, auge_r)):
        dx = (p[..., 0] - auge[0]) * seite  # positiv = nach außen
        s = np.clip(dx / 0.026, -1, 1)
        hoehe = auge[1] + 0.018 + 0.006 * (1 - s ** 2) - 0.002 * s
        dicke = (0.0085 - 0.0045 * (s + 1) / 2) * (0.75 if art.get('weiblich') else 1.0)
        abstand = np.abs(p[..., 1] - hoehe) / (dicke / 2)
        vorne = glatt(auge[2] - 0.03, auge[2] - 0.015, p[..., 2]) * glatt(0.1, 0.3, nor[..., 2])
        rand = 1 - glatt(0.55, 1.0, abstand)
        enden = glatt(-0.024, -0.014, dx) * (1 - glatt(0.018, 0.03, dx))
        # Härchen: längs gestreckt (nach außen), dicht in der Mitte
        haare = rauschen(np.stack([p[..., 0] * 0.22, p[..., 1] * 1.0, p[..., 2] * 0.5], -1), 2200, saat + 21)
        dichte = rand * (0.55 + 0.45 * glatt(0.3, 0.7, haare))
        braue = np.maximum(braue, vorne * enden * dichte)
    toene(braue, haar, 0.85)

    # Haaransatz (unter den Haarsträhnen) und Bartschatten
    kopfhaut = kopfhaut_anteil(p, augen_mitte, kopf_mitte, art.get('glatze', False)) * (1 - maske('ears'))
    stoppeln = glatt(0.3, 0.7, rauschen(p, 1400, saat + 30))
    toene(kopfhaut * (0.55 + 0.4 * stoppeln), haar, 0.95)

    if art.get('bart', 0) > 0:
        mund_y = augen_mitte[1] - 0.072
        quer = np.abs(p[..., 0] - augen_mitte[0])
        # obere Grenze: Wangenlinie, fällt zur Seite hin ab; untere: Kinn/Hals
        obere = augen_mitte[1] - 0.045 - 0.25 * np.maximum(quer - 0.02, 0)
        oben_weich = 1 - glatt(obere - 0.012, obere + 0.004, p[..., 1])
        unten_weich = glatt(mund_y - 0.068, mund_y - 0.045, p[..., 1])
        seite_weich = 1 - glatt(0.058, 0.072, quer)
        vorne = glatt(kopf_mitte[2] - 0.02, kopf_mitte[2] + 0.01, p[..., 2])
        gewicht = oben_weich * unten_weich * seite_weich * vorne * (1 - maske('lips'))
        punkte_bart = glatt(0.4, 0.65, rauschen(p, 2600, saat + 40))
        toene(gewicht * (0.35 + 0.65 * punkte_bart), haar * 0.85 + 0.04, 0.42 * art['bart'])

    # Erde: Fußsohlen, Füße, Unterschenkel, Knie, Hände
    erde_farbe = np.array([0.30, 0.23, 0.16])
    flecken_erde = glatt(0.45, 0.75, fbm(p, 60, 3, saat + 50))
    unten = 1 - glatt(0.02, 0.45, p[..., 1])
    sohle = (nor[..., 1] < -0.4) * (p[..., 1] < 0.06)
    toene(np.maximum(unten * flecken_erde * 0.8, sohle * 0.75), erde_farbe, art.get('schmutz', 0.6))
    for knochen in ('calf_l', 'calf_r'):
        knie = kn[knochen]['kopf'] + np.array([0, 0, 0.05])
        toene(kugel(p, knie, 0.06) * flecken_erde, erde_farbe, 0.4 * art.get('schmutz', 0.6))
    for s in 'lr':
        toene(kugel(p, kn[f'hand_{s}']['schwanz'], 0.09) * flecken_erde, erde_farbe, 0.25 * art.get('schmutz', 0.6))

    farbe = np.clip(farbe, 0, 1)

    def bild(werte, kanaele):
        b = np.zeros((groesse, groesse, kanaele) if kanaele > 1 else (groesse, groesse), np.float32)
        b[wo] = werte
        return b

    # Oberfläche: Poren, feine Fältchen, Unebenheiten -> Höhenbild
    poren = glatt(0.0, 0.35, zellen(p, 650, saat + 60))
    poren_staerke = 0.35 + 0.65 * gesicht
    hoehe = (poren - 1) * 0.00012 * poren_staerke
    hoehe += (fbm(p, 120, 3, saat + 61) - 0.5) * 0.0003
    hoehe += (rauschen(np.stack([p[..., 0] * 3, p[..., 1] * 0.3, p[..., 2] * 3], -1), 400, saat + 62) - 0.5) * 0.00008
    hoehe -= kopfhaut * 0.0002 * stoppeln
    hoehe = bild(hoehe, 1)
    # Texelgröße in Metern (für richtige Neigungen)
    du = np.linalg.norm(np.gradient(ort_bild, axis=1), axis=2)
    dv = np.linalg.norm(np.gradient(ort_bild, axis=0), axis=2)
    du = np.where(belegt, np.clip(du, 1e-5, 0.01), 0.001)
    dv = np.where(belegt, np.clip(dv, 1e-5, 0.01), 0.001)
    gu = np.gradient(hoehe, axis=1) / du
    gv = np.gradient(hoehe, axis=0) / dv
    normal = np.stack([-gu, gv, np.ones_like(gu)], -1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)

    # Rauheit (glTF: G-Kanal), Verdeckung (R) aus Mulden
    rauh = 0.55 + 0.08 * (fbm(p, 30, 2, saat + 70) - 0.5)
    t_zone = kugel(p, augen_mitte + np.array([0, 0.03, 0.03]), 0.05) + kugel(p, nasenspitze, 0.03)
    rauh -= 0.1 * np.clip(t_zone, 0, 1)
    rauh = rauh * (1 - maske('lips')) + 0.38 * maske('lips')
    rauh = rauh * (1 - naegel) + 0.28 * naegel
    rauh = np.maximum(rauh, 0.85 * np.clip(unten * flecken_erde + sohle, 0, 1))
    rauh = np.maximum(rauh, kopfhaut * 0.75)
    verdeckung = 1 - 0.35 * (maske('crotch')) - 0.15 * (1 - poren) * poren_staerke

    farbe = ausdehnen(bild(farbe, 3), belegt)
    normal = ausdehnen(normal, belegt)
    orm = ausdehnen(bild(np.stack([verdeckung, rauh, np.zeros_like(rauh)], -1), 3), belegt)

    def acht_bit(x):
        return (np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8)

    return acht_bit(farbe), acht_bit(normal * 0.5 + 0.5), acht_bit(orm)
