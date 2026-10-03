"""Überträgt aufgezeichnete Bewegungen (BVH, Bandai-Namco-Datensatz) auf das MakeHuman-Skelett.

Grundidee: Für jeden Knochen wird ein „anatomischer Rahmen“ bestimmt (Knochenrichtung + eine
zweite Achse: Körper-links, oben oder die Scharnierachse von Ellbogen/Knie). Im Ziel-Skelett
(Ruhelage) und in der Aufnahme (jedes Einzelbild) wird derselbe Rahmen gebildet; die Ziel-Drehung
bildet den einen auf den anderen ab. So stören unterschiedliche Ruhehaltungen (A- gegen T-Pose)
und unterschiedliche Achsen-Konventionen nicht.
"""
import numpy as np
from scipy.spatial.transform import Rotation, Slerp

import bvh as bvhmod

CM = 0.01


def norm(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-9)


def rahmen(d, u):
    """Orthonormaler Rahmen (Spalten: d, u', d x u') – funktioniert für einzelne und gestapelte Vektoren."""
    d = norm(d)
    u = norm(u - (u * d).sum(-1, keepdims=True) * d)
    w = np.cross(d, u)
    return np.stack([d, u, w], axis=-1)


# Zielknochen -> (Quellgelenk, Kind-Gelenk für die Richtung oder None, Art der zweiten Achse)
ZUORDNUNG = {
    'pelvis': ('Hips', 'Spine', 'links_huefte'),
    'spine_01': ('Spine', 'Chest', 'links_mitte'),
    'spine_03': ('Chest', 'Neck', 'links_schulter'),
    'neck_01': ('Neck', 'Head', 'links_schulter'),
    'head': ('Head', None, 'links_schulter'),
    'clavicle_l': ('Shoulder_L', 'UpperArm_L', 'oben'),
    'clavicle_r': ('Shoulder_R', 'UpperArm_R', 'oben'),
    'upperarm_l': ('UpperArm_L', 'LowerArm_L', 'arm_l'),
    'upperarm_r': ('UpperArm_R', 'LowerArm_R', 'arm_r'),
    'lowerarm_l': ('LowerArm_L', 'Hand_L', 'arm_l'),
    'lowerarm_r': ('LowerArm_R', 'Hand_R', 'arm_r'),
    'hand_l': ('Hand_L', None, 'arm_l'),
    'hand_r': ('Hand_R', None, 'arm_r'),
    'thigh_l': ('UpperLeg_L', 'LowerLeg_L', 'bein_l'),
    'thigh_r': ('UpperLeg_R', 'LowerLeg_R', 'bein_r'),
    'calf_l': ('LowerLeg_L', 'Foot_L', 'bein_l'),
    'calf_r': ('LowerLeg_R', 'Foot_R', 'bein_r'),
    'foot_l': ('Foot_L', 'Toes_L', 'flach'),
    'foot_r': ('Foot_R', 'Toes_R', 'flach'),
    'ball_l': ('Toes_L', None, 'flach'),
    'ball_r': ('Toes_R', None, 'flach'),
}
# Ersatz-Richtung für Gelenke ohne Kind (Endpunkte): Richtung des genannten Gelenks
ERSATZ_RICHTUNG = {'Head': 'Neck', 'Hand_L': 'LowerArm_L', 'Hand_R': 'LowerArm_R', 'Toes_L': 'Foot_L', 'Toes_R': 'Foot_R'}


class Quelle:
    """Eine BVH-Aufnahme mit Gelenkorten (Meter) und Weltdrehungen je Einzelbild."""

    def __init__(self, pfad):
        self.b = bvhmod.Bvh(pfad)
        self.p = self.b.welt_p * CM
        self.r = self.b.welt_r
        self.dt = self.b.dt
        self.n = self.b.anzahl

    def ort(self, name):
        return self.p[:, self.b.index(name)]

    def richtung(self, gelenk, kind):
        return norm(self.ort(kind) - self.ort(gelenk))

    def zweite_achse(self, art):
        if art == 'links_huefte':
            return norm(self.ort('UpperLeg_L') - self.ort('UpperLeg_R')), None
        if art == 'links_schulter':
            return norm(self.ort('Shoulder_L') - self.ort('Shoulder_R')), None
        if art == 'links_mitte':
            return norm(norm(self.ort('UpperLeg_L') - self.ort('UpperLeg_R'))
                        + norm(self.ort('Shoulder_L') - self.ort('Shoulder_R'))), None
        if art == 'oben':
            return self.richtung('Chest', 'Neck'), None
        seite = art[-1].upper()
        if art.startswith('arm'):
            a, b, c = f'UpperArm_{seite}', f'LowerArm_{seite}', f'Hand_{seite}'
        else:
            a, b, c = f'UpperLeg_{seite}', f'LowerLeg_{seite}', f'Foot_{seite}'
        kreuz = np.cross(self.richtung(a, b), self.richtung(b, c))
        gewicht = np.linalg.norm(kreuz, axis=-1)
        return norm(kreuz), gewicht

    def flach_stehend(self, gelenk):
        """Mittlere Weltdrehung des Fußes, während er flach auf dem Boden steht."""
        seite = gelenk[-1]
        fuss, zehen = self.ort(f'Foot_{seite}'), self.ort(f'Toes_{seite}')
        v = np.linalg.norm(np.gradient(fuss, axis=0), axis=1) / self.dt
        hoehe = zehen[:, 1]
        auf_boden = (v < max(0.12, np.percentile(v, 15))) & (hoehe < hoehe.min() + 0.03)
        if auf_boden.sum() < 2:
            auf_boden = v <= np.percentile(v, 20)
        return Rotation.from_matrix(self.r[auf_boden, self.b.index(gelenk)]).mean()

    def lokaler_rahmen(self, gelenk, kind, art, bilder):
        """Der anatomische Rahmen des Gelenks in seinen eigenen (lokalen) Achsen – über alle Bilder gemittelt."""
        rt = np.transpose(self.r[bilder, self.b.index(gelenk)], (0, 2, 1))
        if kind:
            d_welt = self.richtung(gelenk, kind)[bilder]
        else:
            ersatz = ERSATZ_RICHTUNG[gelenk]
            kind_von_ersatz = {'Neck': 'Head', 'LowerArm_L': 'Hand_L', 'LowerArm_R': 'Hand_R',
                               'Foot_L': 'Toes_L', 'Foot_R': 'Toes_R'}[ersatz]
            d_welt = self.richtung(ersatz, kind_von_ersatz)[bilder]
        u_welt, gewicht = self.zweite_achse(art)
        u_welt = u_welt[bilder]
        gewicht = np.ones(len(bilder)) if gewicht is None else gewicht[bilder] ** 2
        d_lok = norm(np.einsum('nij,nj->ni', rt, d_welt).mean(axis=0))
        u_lok = norm((np.einsum('nij,nj->ni', rt, u_welt) * gewicht[:, None]).sum(axis=0))
        return rahmen(d_lok, u_lok)


def ziel_rahmen(skelett, name, art):
    k = {b['name']: b for b in skelett}
    b = k[name]
    d = norm(b['schwanz'] - b['kopf'])
    if art.startswith('links'):
        u = np.array([1.0, 0, 0])
    elif art == 'oben':
        u = np.array([0, 1.0, 0])
    elif art.startswith('arm'):
        s = art[-1]
        u = np.cross(norm(k[f'upperarm_{s}']['schwanz'] - k[f'upperarm_{s}']['kopf']),
                     norm(k[f'lowerarm_{s}']['schwanz'] - k[f'lowerarm_{s}']['kopf']))
    else:  # Bein: Knie-Scharnier zeigt zur linken Körperseite
        u = np.array([1.0, 0, 0])
    return rahmen(d, u)


def finger_kruemmung(skelett):
    """Locker gekrümmte Finger (die Aufnahmen enthalten keine Finger)."""
    k = {b['name']: b for b in skelett}
    lokal = {}
    for seite in 'lr':
        hand = k[f'hand_{seite}']
        handrichtung = norm(hand['schwanz'] - hand['kopf'])
        quer = norm(k[f'index_01_{seite}']['kopf'] - k[f'pinky_01_{seite}']['kopf'])
        handflaeche = norm(np.cross(quer, handrichtung))  # zeigt aus der Handfläche heraus (geprüft am Bild)
        if seite == 'r':
            handflaeche = -handflaeche
        for finger, winkel in (('index', (14, 22, 14)), ('middle', (16, 24, 16)), ('ring', (19, 26, 18)),
                               ('pinky', (22, 28, 20)), ('thumb', (6, 10, 10))):
            for i, w in enumerate(winkel, start=1):
                b = k[f'{finger}_0{i}_{seite}']
                d = norm(b['schwanz'] - b['kopf'])
                achse = norm(np.cross(d, handflaeche))
                if finger == 'thumb':
                    achse = norm(np.cross(d, quer if seite == 'l' else -quer))
                lokal[b['name']] = Rotation.from_rotvec(achse * np.radians(w))
    return lokal


def gangzyklus(quelle):
    """Einen ganzen Schrittzyklus aus der Mitte der Aufnahme wählen (gleichmäßiges Tempo)."""
    sig = quelle.ort('Foot_L')[:, 2] - quelle.ort('Foot_R')[:, 2]
    null = np.where((sig[:-1] < 0) & (sig[1:] >= 0))[0]
    if len(null) < 2:
        raise ValueError('kein ganzer Schrittzyklus in der Aufnahme')
    mitte = quelle.n / 2
    paare = list(zip(null[:-1], null[1:]))
    a, b = min(paare, key=lambda p: abs((p[0] + p[1]) / 2 - mitte))
    return int(a), int(b)


def ruhiger_abschnitt(quelle, laenge=75):
    """Den ruhigsten Abschnitt finden (für das Stehen)."""
    v = np.linalg.norm(np.diff(quelle.p, axis=0), axis=2).sum(axis=1)
    v = np.concatenate([v, v[-1:]])
    kum = np.concatenate([[0], np.cumsum(v)])
    laenge = min(laenge, quelle.n - 1)
    summen = kum[laenge:] - kum[:-laenge]
    a = int(np.argmin(summen))
    return a, a + laenge


def uebertrage(quelle, skelett, bilder, name, schleife=True, auf_der_stelle=True):
    """Liefert eine Bewegung für das Ziel-Skelett: lokale Drehungen je Knochen und Becken-Verschiebung."""
    k = {b['name']: b for b in skelett}
    bilder = np.asarray(bilder)
    alle = np.arange(quelle.n)
    welt = {}
    for ziel, (gelenk, kind, art) in ZUORDNUNG.items():
        if art == 'flach':
            # Füße: flach auf dem Boden in der Aufnahme = flach wie in der Ruhelage des Ziels
            m = quelle.flach_stehend(gelenk).as_matrix().T
        else:
            ls = quelle.lokaler_rahmen(gelenk, kind, art, alle)
            ft = ziel_rahmen(skelett, ziel, art)
            m = ls @ ft.T
        welt[ziel] = Rotation.from_matrix(quelle.r[bilder, quelle.b.index(gelenk)] @ m)
    # Wirbelsäule: spine_02 liegt zwischen spine_01 und spine_03
    halbe = []
    for i in range(len(bilder)):
        s = Slerp([0, 1], Rotation.concatenate([welt['spine_01'][i], welt['spine_03'][i]]))
        halbe.append(s(0.5))
    welt['spine_02'] = Rotation.concatenate(halbe)

    # Becken-Ort: Hüftgelenk-Mitte der Aufnahme, auf die Beinlänge des Ziels skaliert
    bein_ziel = (np.linalg.norm(k['thigh_l']['schwanz'] - k['thigh_l']['kopf'])
                 + np.linalg.norm(k['calf_l']['schwanz'] - k['calf_l']['kopf']))
    bein_quelle = (np.linalg.norm(quelle.b.offsets[quelle.b.index('LowerLeg_L')])
                   + np.linalg.norm(quelle.b.offsets[quelle.b.index('Foot_L')])) * CM
    s = bein_ziel / bein_quelle
    huefte_q = (quelle.ort('UpperLeg_L') + quelle.ort('UpperLeg_R'))[bilder] / 2 * s
    huefte_ziel_ruhe = (k['thigh_l']['kopf'] + k['thigh_r']['kopf']) / 2
    becken_versatz = k['pelvis']['kopf'] - huefte_ziel_ruhe
    becken = huefte_q + welt['pelvis'].apply(becken_versatz)

    # Gerade ausrichten: mittlere Blickrichtung nach +Z, Vorwärtsbewegung herausrechnen
    vorn = welt['pelvis'].apply(np.array([0, 0, 1.0]))
    gier = np.arctan2(vorn[:, 0], vorn[:, 2])
    mittel_gier = np.arctan2(np.sin(gier).mean(), np.cos(gier).mean())
    t = np.arange(len(bilder)) * quelle.dt
    drehung = Rotation.from_rotvec(np.tile([0, -mittel_gier, 0], (len(bilder), 1)))
    if schleife:
        # Gier-Unterschied zwischen Anfang und Ende gleichmäßig verteilen
        rest = np.arctan2(np.sin(gier[-1] - gier[0]), np.cos(gier[-1] - gier[0]))
        anteil = np.linspace(0, 1, len(bilder))
        drehung = Rotation.from_rotvec(np.column_stack([np.zeros(len(bilder)), -mittel_gier - (anteil - 0.5) * rest,
                                                        np.zeros(len(bilder))]))
    for name_k in welt:
        welt[name_k] = drehung * welt[name_k]
    becken = drehung.apply(becken)
    tempo = 0.0
    for achse in (0, 2):
        if auf_der_stelle:
            steigung, achsenabschnitt = np.polyfit(t, becken[:, achse], 1)
            if achse == 2:
                tempo = steigung
            becken[:, achse] -= steigung * t + achsenabschnitt
        else:
            becken[:, achse] -= becken[:, achse].mean()
        becken[:, achse] += k['pelvis']['kopf'][achse]
    # Ziel-Vorwärtskinematik für den Bodenkontakt
    reihenfolge = [b['name'] for b in skelett]
    orte = {}
    finger = finger_kruemmung(skelett)
    voll = {}
    for b in skelett:
        n = b['name']
        if n in welt:
            voll[n] = welt[n]
        elif n == 'Root':
            voll[n] = Rotation.identity(len(bilder))
        else:
            eltern = voll[b['eltern']]
            lokal = finger.get(n, Rotation.identity())
            voll[n] = eltern * lokal
    for n in reihenfolge:
        b = k[n]
        if n == 'Root':
            orte[n] = np.zeros((len(bilder), 3))
        elif n == 'pelvis':
            orte[n] = becken.copy()
        else:
            e = b['eltern']
            orte[n] = orte[e] + voll[e].apply(b['kopf'] - k[e]['kopf'])
    tiefste = []
    for s_ in 'lr':
        knoechel = orte[f'foot_{s_}'][:, 1] - k[f'foot_{s_}']['kopf'][1]
        ballen = orte[f'ball_{s_}'][:, 1] - k[f'ball_{s_}']['kopf'][1]
        spitze = (orte[f'ball_{s_}'] + voll[f'ball_{s_}'].apply(k[f'ball_{s_}']['schwanz'] - k[f'ball_{s_}']['kopf']))[:, 1] \
            - k[f'ball_{s_}']['schwanz'][1]
        tiefste.append(np.minimum(np.minimum(knoechel, ballen), spitze))
    tiefste = np.minimum(*tiefste)
    boden = np.percentile(tiefste, 20)
    becken[:, 1] -= boden

    # Pendel-Knochen für hängende Teile (Lendenschurz, Kutte): hängen senkrecht, Beine schieben sie
    vorn_welt = voll['pelvis'].apply(np.array([0, 0, 1.0]))
    gier_b = np.arctan2(vorn_welt[:, 0], vorn_welt[:, 2])
    nur_gier = Rotation.from_rotvec(np.column_stack([np.zeros_like(gier_b), gier_b, np.zeros_like(gier_b)]))
    beinwinkel = []
    for s_ in 'lr':
        d = voll[f'thigh_{s_}'].apply(norm(k[f'thigh_{s_}']['schwanz'] - k[f'thigh_{s_}']['kopf']))
        d = nur_gier.inv().apply(d)
        beinwinkel.append(np.arctan2(d[:, 2], -d[:, 1]))
    beinwinkel = np.array(beinwinkel)

    def glaetten(x, a=0.35):
        y = x.copy()
        for _ in range(2):  # zweimal, damit die Schleife sich schließt
            for i in range(len(y)):
                y[i] = y[i - 1] * a + x[i] * (1 - a)
        return y

    for lname, richtung, rand in (('lappen_vorne', 1, 0.10), ('lappen_hinten', -1, 0.18)):
        if lname not in k:
            continue
        schub = np.maximum(0, (beinwinkel.max(axis=0) if richtung > 0 else -beinwinkel.min(axis=0)) - rand) * 0.85
        schub = glaetten(schub)
        winkel_x = -schub if richtung > 0 else schub
        voll[lname] = nur_gier * Rotation.from_rotvec(np.column_stack([winkel_x, np.zeros_like(winkel_x), np.zeros_like(winkel_x)]))
        welt[lname] = voll[lname]

    # Lokale Drehungen
    lokal = {}
    for b in skelett:
        n = b['name']
        if n == 'Root':
            continue
        if n in welt or n == 'pelvis':
            e = b['eltern']
            lokal[n] = voll[e].inv() * voll[n] if e != 'Root' else voll[n]
    becken_lokal = becken  # Eltern ist Root (Ursprung, ohne Drehung)

    if schleife:
        # Ende sanft an den Anfang angleichen, damit die Schleife nahtlos ist
        anteil = np.linspace(0, 1, len(bilder))
        for n, q in lokal.items():
            fehler = q[0] * q[-1].inv()
            korrektur = Rotation.from_rotvec(np.outer(anteil, fehler.as_rotvec()))
            lokal[n] = korrektur * q
        becken_lokal = becken_lokal + np.outer(anteil, becken_lokal[0] - becken_lokal[-1])

    return {
        'name': name,
        'zeiten': t,
        'lokal': {n: q.as_quat() for n, q in lokal.items()},
        'becken': becken_lokal,
        'tempo': float(abs(tempo)),
        'finger': {n: r.as_quat() for n, r in finger.items()},
    }


def stehen_aus(quelle, skelett, bild=0, dauer=8.0, takt=1 / 30):
    """Ruhiges Stehen: Haltung aus einem Einzelbild, dazu Atmen, leichtes Gewichtverlagern, Kopfbewegung.
    Alle Wellen gehen in der Dauer auf, damit die Schleife nahtlos ist."""
    basis = uebertrage(quelle, skelett, [bild, bild], 'stehen', schleife=False, auf_der_stelle=False)
    n = int(round(dauer / takt))
    t = np.arange(n + 1) * takt
    w = 2 * np.pi * t / dauer
    lokal = {}
    for name, q in basis['lokal'].items():
        lokal[name] = np.tile(q[0], (n + 1, 1))

    def dreh(name, achse, grad):
        r = Rotation.from_rotvec(np.outer(grad, achse) * np.pi / 180)
        lokal[name] = (Rotation.from_quat(lokal[name]) * r).as_quat()

    atem = np.sin(w * 2)            # 4 s Atemzug
    wiegen = np.sin(w)              # 8 s Gewicht verlagern
    kopf = np.sin(w * 2 + 1.3) * 0.6 + np.sin(w + 0.4) * 0.4
    dreh('spine_03', [1, 0, 0], -0.8 * atem)
    dreh('spine_02', [1, 0, 0], -0.4 * atem)
    dreh('clavicle_l', [0, 0, 1], 0.6 * atem)
    dreh('clavicle_r', [0, 0, 1], -0.6 * atem)
    dreh('pelvis', [0, 0, 1], 1.2 * wiegen)
    dreh('spine_01', [0, 0, 1], -0.8 * wiegen)
    dreh('neck_01', [0, 1, 0], 2.5 * kopf)
    dreh('head', [1, 0, 0], 1.0 * np.sin(w * 3))
    becken = np.tile(basis['becken'][0], (n + 1, 1))
    becken[:, 0] += 0.012 * wiegen
    becken[:, 1] += 0.002 * atem
    return {'name': 'stehen', 'zeiten': t, 'lokal': lokal, 'becken': becken, 'tempo': 0.0,
            'finger': basis['finger']}


def zyklus_bewegung(pfad, skelett, name):
    q = Quelle(pfad)
    a, b = gangzyklus(q)
    return uebertrage(q, skelett, np.arange(a, b + 1), name)


def ganze_bewegung(pfad, skelett, name, von=0, bis=None):
    q = Quelle(pfad)
    bis = q.n if bis is None else bis
    return uebertrage(q, skelett, np.arange(von, bis), name, schleife=False, auf_der_stelle=False)
