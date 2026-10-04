"""Formziele für den Charakter-Editor: Gesicht und Körper lassen sich im Spiel stufenlos verändern.

Jedes Formziel ist eine Verschiebung je Punkt (in Metern) gegenüber der gebauten Figur. Im Spiel mischt
three.js die Ziele mit einem Anteil von 0 bis 1 dazu (glTF-Morph-Targets).
- Gesicht: aus den MakeHuman-Formen (CC0) für Nase, Kinn, Augen, Mund, Wangen, Ohren, Brauen, Kopf.
- Körper: dieselbe Figur mit mehr Muskeln, schlanker oder runder (MakeHuman-Makro-Regler).
Haare, Bart, Augen und Kleidung folgen dem Körper: Sie übernehmen die Verschiebung der nächsten Hautpunkte.
"""
import numpy as np
from scipy.spatial import cKDTree

import mh

ZIELE = mh.MPFB / 'targets'

# Name im Spiel -> MakeHuman-Formen mit Anteil. Wo es ein Gegenstück gibt (groß/klein), ist es ein eigenes Ziel:
# Der Regler im Editor mischt dann je nach Richtung das eine oder das andere dazu.
GESICHT = {
    'nase_gross': [('nose/nose-scale-vert-incr', 1), ('nose/nose-scale-horiz-incr', 1), ('nose/nose-scale-depth-incr', 0.6)],
    'nase_klein': [('nose/nose-scale-vert-decr', 1), ('nose/nose-scale-horiz-decr', 1), ('nose/nose-scale-depth-decr', 0.6)],
    'nase_hoecker': [('nose/nose-hump-incr', 1)],
    'nase_stups': [('nose/nose-point-up', 1)],
    'kinn_kraeftig': [('chin/chin-prominent-incr', 1), ('chin/chin-width-incr', 0.7)],
    'kinn_zart': [('chin/chin-prominent-decr', 1), ('chin/chin-width-decr', 0.7)],
    'augen_gross': [('eyes/l-eye-scale-incr', 1), ('eyes/r-eye-scale-incr', 1)],
    'augen_klein': [('eyes/l-eye-scale-decr', 1), ('eyes/r-eye-scale-decr', 1)],
    'mund_breit': [('mouth/mouth-scale-horiz-incr', 1)],
    'mund_schmal': [('mouth/mouth-scale-horiz-decr', 1)],
    'lippen_voll': [('mouth/mouth-lowerlip-volume-incr', 1), ('mouth/mouth-upperlip-volume-incr', 1)],
    'wangen_hoch': [('cheek/l-cheek-bones-incr', 1), ('cheek/r-cheek-bones-incr', 1)],
    'wangen_voll': [('cheek/l-cheek-volume-incr', 1), ('cheek/r-cheek-volume-incr', 1)],
    'ohren_gross': [('ears/l-ear-scale-incr', 1), ('ears/r-ear-scale-incr', 1)],
    'ohren_klein': [('ears/l-ear-scale-decr', 1), ('ears/r-ear-scale-decr', 1)],
    'ohren_spitz': [('ears/l-ear-shape-pointed', 1), ('ears/r-ear-shape-pointed', 1)],
    'brauen_hoch': [('eyebrows/eyebrows-trans-up', 1)],
    'brauen_tief': [('eyebrows/eyebrows-trans-down', 1)],
    'kopf_rund': [('head/head-round', 1)],
    'kopf_eckig': [('head/head-square', 1)],
    'kopf_oval': [('head/head-oval', 1)],
}

# Körper: welche Makro-Regler wie weit verschoben werden (der Rest bleibt wie bei der Figur)
KOERPER = {
    'muskeln': {'muscle': 1.0},
    'schlank': {'weight': 0.0},
    'rund': {'weight': 1.0},
}

# Welche Ziele Haare und Bart mitmachen (die übrigen verändern Gesichtsteile, an denen keine Haare wachsen)
FUER_HAARE = ['kopf_rund', 'kopf_eckig', 'kopf_oval', 'ohren_gross', 'muskeln', 'schlank', 'rund']
FUER_BART = ['kinn_kraeftig', 'kinn_zart', 'mund_breit', 'mund_schmal', 'wangen_hoch', 'wangen_voll',
             'kopf_rund', 'kopf_eckig', 'kopf_oval', 'schlank', 'rund']
FUER_KLEIDUNG = ['muskeln', 'schlank', 'rund']


def berechne(k, makro):
    """Alle Formziele als Verschiebung (Meter) für jeden Punkt von k.v. Gibt dict name -> (n, 3)."""
    basis = k.in_meter(k.v)
    ziele = {}
    for name, teile in GESICHT.items():
        roh = np.zeros_like(k.v)
        for datei, anteil in teile:
            idx, off = mh.lade_target(ZIELE / f'{datei}.target.gz')
            roh[idx] += off * anteil
        ziele[name] = roh * mh.DM
    for name, aenderung in KOERPER.items():
        k2 = mh.Koerper()
        k2.makro(**{**makro, **aenderung})
        ziele[name] = k2.in_meter(k2.v) - basis
    return ziele


def angepasst(k, ziele):
    """Für Zusatzteile (Augen), die über Bezugspunkte am Körper hängen: der Körper je Formziel."""
    from copy import copy
    for name, d in ziele.items():
        k2 = copy(k)
        k2.v = k.v + d / mh.DM
        yield name, k2


def uebertrage(punkte, quelle, verschiebungen, nachbarn=4):
    """Teile ohne eigene Formen (Haare, Bart, Kleidung) folgen den nächsten Hautpunkten (nach Abstand gewichtet)."""
    baum = cKDTree(quelle)
    abstand, nah = baum.query(punkte, k=nachbarn)
    w = 1 / np.maximum(abstand, 1e-4)
    w /= w.sum(axis=1, keepdims=True)
    return {name: (d[nah] * w[..., None]).sum(axis=1) for name, d in verschiebungen.items()}


def kuerzen(ketten, laenge, punkte=None):
    """Strähnen (anzahl, glieder+1, 3) auf eine feste Länge kürzen: Punkt i liegt dann beim Anteil i/(punkte-1)
    dieser Länge auf der ursprünglichen Strähne. So entstehen die Formziele für die Haarlänge."""
    n, g, _ = ketten.shape
    abschnitt = np.linalg.norm(np.diff(ketten, axis=1), axis=2)
    bis = np.concatenate([np.zeros((n, 1)), np.cumsum(abschnitt, axis=1)], axis=1)
    punkte = punkte or g
    ziel = np.minimum(laenge, bis[:, -1])[:, None] * np.linspace(0, 1, punkte)[None, :]
    neu = np.empty((n, punkte, 3))
    for s in range(n):
        for a in range(3):
            neu[s, :, a] = np.interp(ziel[s], bis[s], ketten[s, :, a])
    return neu
