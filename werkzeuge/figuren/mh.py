"""MakeHuman-Daten lesen: Grundkörper, Körperformen (Targets), Skelett, Gewichte, Anpassteile.

Alle Rohdaten sind CC0 (MakeHuman / MPFB2). Koordinaten im Rohformat: Dezimeter, Y nach oben,
Gesicht schaut nach +Z. Ausgabe dieses Moduls: Meter, Y nach oben, Füße auf y = 0.
"""
import gzip
import json
from pathlib import Path

import numpy as np

DM = 0.1  # Dezimeter -> Meter

QUELLEN = Path(__file__).parent / 'quellen'
MPFB = QUELLEN / 'mpfb2' / 'src' / 'mpfb' / 'data'
MH = QUELLEN / 'makehuman' / 'makehuman' / 'data'

# Ankerpunkte der Regler (Wert -> Name der Ziel-Form). '' bedeutet: an dieser Stelle keine Form.
ANKER = {
    'gender': [(0.0, 'female'), (1.0, 'male')],
    'age': [(0.0, 'baby'), (0.1875, 'child'), (0.5, 'young'), (1.0, 'old')],
    'muscle': [(0.0, 'minmuscle'), (0.5, 'averagemuscle'), (1.0, 'maxmuscle')],
    'weight': [(0.0, 'minweight'), (0.5, 'averageweight'), (1.0, 'maxweight')],
    'proportions': [(0.0, 'uncommonproportions'), (0.5, ''), (1.0, 'idealproportions')],
    'height': [(0.0, 'minheight'), (0.5, ''), (1.0, 'maxheight')],
    'cupsize': [(0.0, 'mincup'), (0.5, 'averagecup'), (1.0, 'maxcup')],
    'firmness': [(0.0, 'minfirmness'), (0.5, 'averagefirmness'), (1.0, 'maxfirmness')],
}


def regler_gewichte(name, wert):
    """Stückweise lineare Mischung zwischen den beiden benachbarten Ankerpunkten."""
    anker = ANKER[name]
    wert = min(max(wert, 0.0), 1.0)
    for (a, na), (b, nb) in zip(anker, anker[1:]):
        if a <= wert <= b:
            t = (wert - a) / (b - a)
            g = {}
            if na and 1 - t > 1e-6:
                g[na] = g.get(na, 0) + (1 - t)
            if nb and t > 1e-6:
                g[nb] = g.get(nb, 0) + t
            return g
    raise ValueError(name)


def lade_obj(pfad):
    v, vt, flaechen, flaechen_uv, gruppen = [], [], [], [], []
    gruppe = None
    with open(pfad) as datei:
        for zeile in datei:
            if zeile.startswith('v '):
                v.append([float(x) for x in zeile.split()[1:4]])
            elif zeile.startswith('vt '):
                vt.append([float(x) for x in zeile.split()[1:3]])
            elif zeile.startswith('g '):
                gruppe = zeile.split()[1]
            elif zeile.startswith('f '):
                teile = zeile.split()[1:]
                flaechen.append([int(t.split('/')[0]) - 1 for t in teile])
                flaechen_uv.append([int(t.split('/')[1]) - 1 if '/' in t and t.split('/')[1] else -1 for t in teile])
                gruppen.append(gruppe)
    return np.array(v, float), np.array(vt, float), flaechen, flaechen_uv, gruppen


def lade_target(pfad):
    idx, off = [], []
    oeffne = gzip.open if str(pfad).endswith('.gz') else open
    with oeffne(pfad, 'rt') as datei:
        for zeile in datei:
            if not zeile.strip() or zeile.startswith('#'):
                continue
            t = zeile.split()
            idx.append(int(t[0]))
            off.append([float(t[1]), float(t[2]), float(t[3])])
    return np.array(idx, int), np.array(off, float).reshape(-1, 3)


class Koerper:
    """Der MakeHuman-Grundkörper mit allen Hilfsgeometrien, in Rohkoordinaten (dm)."""

    def __init__(self):
        self.v0, self.vt, self.flaechen, self.flaechen_uv, self.gruppen = lade_obj(MPFB / '3dobjs' / 'base.obj')
        with open(MPFB / 'mesh_metadata' / 'basemesh_vertex_groups.json') as d:
            self.vgruppen = {k: self._bereiche(b) for k, b in json.load(d).items()}
        self.v = self.v0.copy()
        self.angewendet = []

    @staticmethod
    def _bereiche(bereiche):
        idx = []
        for a, b in bereiche:
            idx.extend(range(a, b + 1))
        return np.array(idx, int)

    def form(self, pfad, gewicht):
        if gewicht < 1e-6:
            return
        if not Path(pfad).exists():
            print(f'  (fehlt, übersprungen: {Path(pfad).name})')
            return
        idx, off = lade_target(pfad)
        if len(idx):
            self.v[idx] += off * gewicht
        self.angewendet.append((Path(pfad).name, round(gewicht, 3)))

    def makro(self, gender, age, muscle, weight, height=0.5, proportions=0.5,
              cupsize=0.5, firmness=0.5, rassen=None):
        """Wendet die MakeHuman-Makro-Formen an (wie die Regler in MakeHuman)."""
        rassen = rassen or {'african': 1 / 3, 'asian': 1 / 3, 'caucasian': 1 / 3}
        g = regler_gewichte('gender', gender)
        a = regler_gewichte('age', age)
        m = regler_gewichte('muscle', muscle)
        w = regler_gewichte('weight', weight)
        h = regler_gewichte('height', height)
        p = regler_gewichte('proportions', proportions)
        c = regler_gewichte('cupsize', cupsize)
        f = regler_gewichte('firmness', firmness)
        md = MPFB / 'targets' / 'macrodetails'
        for rasse, rw in rassen.items():
            for gn, gw in g.items():
                for an, aw in a.items():
                    self.form(md / f'{rasse}-{gn}-{an}.target.gz', rw * gw * aw)
        for gn, gw in g.items():
            for an, aw in a.items():
                for mn, mw in m.items():
                    for wn, ww in w.items():
                        basis = gw * aw * mw * ww
                        self.form(md / f'universal-{gn}-{an}-{mn}-{wn}.target.gz', basis)
                        for hn, hw in h.items():
                            self.form(md / 'height' / f'{gn}-{an}-{mn}-{wn}-{hn}.target.gz', basis * hw)
                        for pn, pw in p.items():
                            self.form(md / 'proportions' / f'{gn}-{an}-{mn}-{wn}-{pn}.target.gz', basis * pw)
                        for cn, cw in c.items():
                            for fn, fw in f.items():
                                self.form(MPFB / 'targets' / 'breast' / f'{gn}-{an}-{mn}-{wn}-{cn}-{fn}.target.gz',
                                          basis * cw * fw)

    def gelenk(self, name):
        return self.v[self.vgruppen[name]].mean(axis=0)

    def koerper_flaechen(self):
        """Nur die Flächen der Haut (Gruppe 'body'), ohne Hilfsgeometrie."""
        idx = [i for i, g in enumerate(self.gruppen) if g == 'body']
        return np.array([self.flaechen[i] for i in idx]), np.array([self.flaechen_uv[i] for i in idx])

    def gruppen_flaechen(self, gruppe):
        idx = [i for i, g in enumerate(self.gruppen) if g == gruppe]
        return [self.flaechen[i] for i in idx], [self.flaechen_uv[i] for i in idx]

    def in_meter(self, punkte):
        """Rohkoordinaten (dm) -> Meter, Füße auf dem Boden."""
        boden = self.gelenk('joint-ground')[1]
        p = np.array(punkte, float) * 1.0
        p = p - np.array([0.0, boden, 0.0])
        return p * DM


def lade_skelett(koerper, rig_datei='rig.game_engine.json'):
    """Knochen mit Kopf-/Schwanzposition (Meter) aus den Gelenkwürfeln des angepassten Körpers."""
    with open(MPFB / 'rigs' / 'standard' / rig_datei) as d:
        rig = json.load(d)

    def ort(angabe):
        s = angabe['strategy']
        if s == 'CUBE':
            return koerper.gelenk(angabe['cube_name'])
        if s == 'MEAN':
            return koerper.v[angabe['vertex_indices']].mean(axis=0)
        if s == 'VERTEX':
            return koerper.v[angabe['vertex_index']]
        raise ValueError(s)

    knochen = {}
    for name, d in rig.items():
        knochen[name] = {
            'name': name,
            'eltern': d['parent'] or None,
            'kopf': koerper.in_meter(ort(d['head'])),
            'schwanz': koerper.in_meter(ort(d['tail'])),
        }
    # Reihenfolge: Eltern vor Kindern
    reihe, gesehen = [], set()

    def besuche(n):
        if n in gesehen:
            return
        e = knochen[n]['eltern']
        if e:
            besuche(e)
        gesehen.add(n)
        reihe.append(n)

    for n in knochen:
        besuche(n)
    return [knochen[n] for n in reihe]


def lade_gewichte(weights_datei='weights.game_engine.json'):
    with open(MPFB / 'rigs' / 'standard' / weights_datei) as d:
        return json.load(d)['weights']


def lade_mhclo(pfad):
    """Anpassdatei für Zusatzteile (z. B. Augen): je Punkt drei Bezugspunkte, Gewichte, Versatz."""
    skalen, zeilen, obj = {}, [], None
    in_punkten = False
    with open(pfad) as d:
        for zeile in d:
            t = zeile.split()
            if not t or t[0].startswith('#'):
                continue
            if t[0] in ('x_scale', 'y_scale', 'z_scale'):
                skalen[t[0][0]] = (int(t[1]), int(t[2]), float(t[3]))
            elif t[0] == 'obj_file':
                obj = t[1]
            elif t[0] == 'verts':
                in_punkten = True
            elif in_punkten:
                if len(t) == 9:
                    zeilen.append(t)
                elif len(t) == 1:
                    zeilen.append([t[0], t[0], t[0], '1', '0', '0', '0', '0', '0'])
                else:
                    in_punkten = False
    ref = np.array([[int(z[0]), int(z[1]), int(z[2])] for z in zeilen])
    gew = np.array([[float(z[3]), float(z[4]), float(z[5])] for z in zeilen])
    off = np.array([[float(z[6]), float(z[7]), float(z[8])] for z in zeilen])
    return {'skalen': skalen, 'ref': ref, 'gew': gew, 'off': off, 'obj': Path(pfad).parent / obj}


def passe_an(mhclo, koerper):
    """Rohkoordinaten der Zusatzteil-Punkte auf dem angepassten Körper."""
    v = koerper.v
    s = np.ones(3)
    for i, achse in enumerate('xyz'):
        if achse in mhclo['skalen']:
            a, b, laenge = mhclo['skalen'][achse]
            s[i] = abs(v[a][i] - v[b][i]) / laenge
    p = (v[mhclo['ref']] * mhclo['gew'][:, :, None]).sum(axis=1)
    return p + mhclo['off'] * s
