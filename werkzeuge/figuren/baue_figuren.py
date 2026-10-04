"""Baut die Spielfiguren als GLB-Dateien nach assets/figuren/.

Aufruf (aus dem Projektordner):
    werkzeuge/figuren/hole_quellen.sh          # einmalig: Rohdaten holen
    python werkzeuge/figuren/baue_figuren.py   # Figuren bauen

Jede Figur = MakeHuman-Grundkörper (CC0) + Körperform + Skelett + Haut + Haare + Kleidung
+ Bewegungen aus dem Bandai-Namco-Datensatz (CC BY-NC 4.0).
"""
import hashlib
import io
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import bewegung  # noqa: E402
import formen  # noqa: E402
import haare  # noqa: E402
import haut  # noqa: E402
import kleidung  # noqa: E402
import mh  # noqa: E402
import netz  # noqa: E402
from gltf import Glb  # noqa: E402

D1 = mh.QUELLEN / 'bandai' / 'dataset' / 'Bandai-Namco-Research-Motiondataset-1' / 'data'
D2 = mh.QUELLEN / 'bandai' / 'dataset' / 'Bandai-Namco-Research-Motiondataset-2' / 'data'

AUSGABE = Path(__file__).resolve().parents[2] / 'assets' / 'figuren'

# Einzelne Schläge aus längeren Aufnahmen (Einzelbilder, 30 je Sekunde): kurz ausholen, zuschlagen,
# zurückkehren. Im Spiel trifft der Schlag im schnellsten Moment (bei 18 von 30, 12 von 20, 15 von 36).
HIEB = ('hieb', 'ganz', D1 / 'dataset-1_slash_normal_001.bvh', 189, 219)
SCHLAG = ('schlag', 'ganz', D1 / 'dataset-1_punch_normal_002.bvh', 139, 159)
TRITT = ('tritt', 'ganz', D1 / 'dataset-1_kick_normal_001.bvh', 177, 213)
HAUT_STAND = (Path(__file__).parent / 'haut.py').read_text()

FIGUREN = {
    'er': dict(
        makro=dict(gender=1.0, age=0.5, muscle=0.62, weight=0.42, height=0.45, proportions=0.85,
                   rassen={'caucasian': 0.8, 'african': 0.1, 'asian': 0.1}),
        haut=dict(hautfarbe=(0.70, 0.53, 0.43), haarfarbe=(0.16, 0.11, 0.08), bart=0.8, alter=0.1, schmutz=0.6),
        # Lang gebaut: Im Spiel bestimmt ein Formziel, wie lang Haare und Bart gerade sind (sie wachsen nach)
        haare=dict(art='lang', laenge=(0.30, 0.40), anzahl=1900, breite=0.013, steife=0.65, bart=True,
                   bart_laenge=(0.12, 0.17), bart_anzahl=1300),
        # Längen der Formziele in Metern; die letzte Haarlänge ist die Grenze zwischen kurzem und langem Haarnetz
        editor=dict(haare=(0.006, 0.04, 0.12), bart=(0.003, 0.02, 0.06)),
        bewegungen=[
            ('stehen', 'stehen', D2 / 'dataset-2_wave-right-hand_normal_001.bvh'),
            ('gehen', 'zyklus', D1 / 'dataset-1_walk_normal_001.bvh'),
            ('rennen', 'zyklus', D1 / 'dataset-1_run_masculinity_001.bvh'),
            ('sprinten', 'zyklus', D1 / 'dataset-1_dash_masculinity_001.bvh'),
            ('erschoepft', 'zyklus', D1 / 'dataset-1_walk_tired_001.bvh'),
            HIEB, SCHLAG,
        ],
    ),
    'sie': dict(
        makro=dict(gender=0.0, age=0.48, muscle=0.55, weight=0.42, height=0.5, proportions=0.85,
                   cupsize=0.5, firmness=0.6, rassen={'caucasian': 0.8, 'african': 0.1, 'asian': 0.1}),
        haut=dict(hautfarbe=(0.77, 0.59, 0.49), haarfarbe=(0.30, 0.19, 0.11), bart=0, alter=0.05, weiblich=True,
                  lippen=(0.70, 0.42, 0.42), schmutz=0.5),
        haare=dict(art='lang', laenge=(0.30, 0.42), anzahl=2300, breite=0.016, steife=0.65),
        editor=dict(haare=(0.006, 0.04, 0.12)),
        bewegungen=[
            ('stehen', 'stehen', D2 / 'dataset-2_wave-right-hand_normal_002.bvh'),
            ('gehen', 'zyklus', D1 / 'dataset-1_walk_feminine_002.bvh'),
            ('rennen', 'zyklus', D1 / 'dataset-1_run_feminine_001.bvh'),
            ('sprinten', 'zyklus', D1 / 'dataset-1_dash_feminine_001.bvh'),
            ('erschoepft', 'zyklus', D1 / 'dataset-1_walk_tired_002.bvh'),
            HIEB, SCHLAG,
        ],
    ),
    'einsiedler': dict(
        makro=dict(gender=1.0, age=0.9, muscle=0.45, weight=0.38, height=0.4, proportions=0.6,
                   rassen={'caucasian': 0.85, 'african': 0.05, 'asian': 0.1}),
        haut=dict(hautfarbe=(0.67, 0.51, 0.41), haarfarbe=(0.62, 0.60, 0.57), bart=0.9, alter=1.0, glatze=True,
                  schmutz=0.4),
        haare=dict(art='kurz', glatze=True, laenge=(0.025, 0.06), anzahl=1100, breite=0.009, bart=True,
                   bart_laenge=(0.08, 0.20), bart_anzahl=1200),
        kleidung='kutte',
        bewegungen=[
            ('stehen', 'stehen', D2 / 'dataset-2_wave-right-hand_normal_003.bvh'),
            ('gehen', 'zyklus', D1 / 'dataset-1_walk_old_001.bvh'),
            ('winken', 'ganz', D2 / 'dataset-2_wave-right-hand_elderly_001.bvh'),
        ],
    ),
    # Räuber: jung, kräftig, sonnenverbrannt und schmutzig, im kurzen Kittel; Gang wie ein Halbstarker
    'raeuber': dict(
        makro=dict(gender=1.0, age=0.42, muscle=0.72, weight=0.5, height=0.5, proportions=0.7,
                   rassen={'caucasian': 0.7, 'african': 0.15, 'asian': 0.15}),
        haut=dict(hautfarbe=(0.64, 0.47, 0.36), haarfarbe=(0.09, 0.07, 0.05), bart=0.75, alter=0.2, schmutz=0.85),
        haare=dict(art='kurz', laenge=(0.03, 0.07), anzahl=1500, breite=0.012),
        kleidung='kutte',
        kutte=dict(saum=0.5, weite=0.16, farbe=(0.21, 0.20, 0.16), saat=23, guertel=(0.16, 0.11, 0.07, 1)),
        textur=1024,
        bewegungen=[
            ('stehen', 'stehen', D2 / 'dataset-2_wave-right-hand_normal_004.bvh'),
            ('gehen', 'zyklus', D1 / 'dataset-1_walk_chimpira_001.bvh'),
            ('rennen', 'zyklus', D1 / 'dataset-1_run_chimpira_001.bvh'),
            HIEB, SCHLAG,
        ],
    ),
    # Der Räuberhauptmann: groß, schwer, kahl mit rotem Bart, im dunkelroten Kittel; Gang wie ein Riese
    'hauptmann': dict(
        makro=dict(gender=1.0, age=0.62, muscle=0.9, weight=0.68, height=0.95, proportions=0.9,
                   rassen={'caucasian': 0.85, 'african': 0.05, 'asian': 0.1}),
        haut=dict(hautfarbe=(0.62, 0.45, 0.35), haarfarbe=(0.36, 0.13, 0.06), bart=1.0, alter=0.5, glatze=True,
                  schmutz=0.7),
        haare=dict(art='kurz', glatze=True, laenge=(0.02, 0.05), anzahl=900, breite=0.010, bart=True,
                   bart_laenge=(0.07, 0.17), bart_anzahl=1400),
        kleidung='kutte',
        kutte=dict(saum=0.6, weite=0.22, farbe=(0.33, 0.10, 0.08), saat=31, guertel=(0.10, 0.07, 0.05, 1)),
        textur=1024,
        bewegungen=[
            ('stehen', 'stehen', D2 / 'dataset-2_wave-right-hand_normal_005.bvh'),
            ('gehen', 'zyklus', D1 / 'dataset-1_walk_giant_001.bvh'),
            ('rennen', 'zyklus', D1 / 'dataset-1_run_giant_001.bvh'),
            HIEB, TRITT,
        ],
    ),
    # Erlenbach: Gerold, der alte Kartenleser, in einer langen blauen Kutte
    'gerold': dict(
        makro=dict(gender=1.0, age=0.85, muscle=0.35, weight=0.45, height=0.45, proportions=0.6,
                   rassen={'caucasian': 0.85, 'african': 0.05, 'asian': 0.1}),
        haut=dict(hautfarbe=(0.72, 0.56, 0.46), haarfarbe=(0.78, 0.77, 0.74), bart=0.9, alter=0.9, schmutz=0.1),
        haare=dict(art='kurz', laenge=(0.04, 0.09), anzahl=1300, breite=0.011, bart=True,
                   bart_laenge=(0.10, 0.24), bart_anzahl=1300),
        kleidung='kutte',
        kutte=dict(farbe=(0.20, 0.24, 0.38), saat=41, guertel=(0.55, 0.45, 0.25, 1)),
        textur=1024,
        bewegungen=[
            ('stehen', 'stehen', D2 / 'dataset-2_wave-right-hand_elderly_002.bvh'),
            ('gehen', 'zyklus', D1 / 'dataset-1_walk_old_001.bvh'),
            ('winken', 'ganz', D2 / 'dataset-2_wave-right-hand_elderly_003.bvh'),
        ],
    ),
    # Erlenbach: Marta, die Händlerin, im langen grünen Kleid
    'marta': dict(
        makro=dict(gender=0.0, age=0.52, muscle=0.45, weight=0.55, height=0.45, proportions=0.8,
                   cupsize=0.55, firmness=0.5, rassen={'caucasian': 0.75, 'african': 0.1, 'asian': 0.15}),
        haut=dict(hautfarbe=(0.76, 0.58, 0.47), haarfarbe=(0.32, 0.17, 0.09), bart=0, alter=0.3, weiblich=True,
                  lippen=(0.66, 0.38, 0.38), schmutz=0.15),
        haare=dict(art='lang', laenge=(0.20, 0.32), anzahl=1800, breite=0.016),
        kleidung='kutte',
        kutte=dict(farbe=(0.22, 0.32, 0.20), saat=53, guertel=(0.42, 0.30, 0.16, 1)),
        textur=1024,
        bewegungen=[
            ('stehen', 'stehen', D2 / 'dataset-2_wave-right-hand_normal_006.bvh'),
            ('gehen', 'zyklus', D1 / 'dataset-1_walk_feminine_001.bvh'),
            ('winken', 'ganz', D2 / 'dataset-2_wave-right-hand_normal_007.bvh'),
        ],
    ),
    # Erlenbach: Jost, der Fischer, wettergegerbt, im kurzen graublauen Kittel
    'jost': dict(
        makro=dict(gender=1.0, age=0.58, muscle=0.62, weight=0.55, height=0.55, proportions=0.75,
                   rassen={'caucasian': 0.8, 'african': 0.1, 'asian': 0.1}),
        haut=dict(hautfarbe=(0.66, 0.48, 0.37), haarfarbe=(0.36, 0.31, 0.26), bart=0.85, alter=0.55, schmutz=0.4),
        haare=dict(art='kurz', laenge=(0.03, 0.06), anzahl=1500, breite=0.012),
        kleidung='kutte',
        kutte=dict(saum=0.5, weite=0.16, farbe=(0.30, 0.33, 0.37), saat=67, guertel=(0.25, 0.18, 0.10, 1)),
        textur=1024,
        bewegungen=[
            ('stehen', 'stehen', D2 / 'dataset-2_wave-right-hand_normal_008.bvh'),
            ('gehen', 'zyklus', D1 / 'dataset-1_walk_normal_001.bvh'),
            ('winken', 'ganz', D2 / 'dataset-2_wave-right-hand_normal_009.bvh'),
        ],
    ),
}


def png(feld):
    puffer = io.BytesIO()
    Image.fromarray(feld).save(puffer, 'PNG', optimize=True)
    return puffer.getvalue()


def jpg(feld, qualitaet=88):
    puffer = io.BytesIO()
    Image.fromarray(feld).convert('RGB').save(puffer, 'JPEG', quality=qualitaet, optimize=True)
    return puffer.getvalue()


def augen_farbe(bild, ziel):
    """Iris umfärben: braune Teile der Vorlage bekommen den Zielton (Helligkeit bleibt)."""
    f = bild.astype(np.float32) / 255
    hell = f.mean(axis=2, keepdims=True)
    braun = np.clip((f[..., 0] - f[..., 2]) * 4, 0, 1)[..., None]
    neu = np.clip(hell * np.array(ziel) * 2.2, 0, 1)
    return ((f * (1 - braun) + neu * braun) * 255).astype(np.uint8)


def baue(name, einstellung):
    t0 = time.time()
    k = mh.Koerper()
    k.makro(**einstellung['makro'])
    skelett = mh.lade_skelett(k)
    knochen_index = {b['name']: i for i, b in enumerate(skelett)}
    gewichtsliste = mh.lade_gewichte()

    # --- Haut ---
    flaechen, flaechen_uv = k.koerper_flaechen()
    tri, ort, uvi = netz.naht_auftrennen(flaechen, flaechen_uv)
    alle_punkte_m = k.in_meter(k.v)
    roh_tri = netz.dreiecke(flaechen)
    normalen_roh = netz.normalen(alle_punkte_m, roh_tri)
    gelenke_roh, gewichte_roh = netz.gewichte_aus_liste(len(k.v), gewichtsliste, knochen_index)

    haut_teil = dict(
        pos=alle_punkte_m[ort], normal=normalen_roh[ort],
        uv=np.column_stack([k.vt[uvi, 0], 1 - k.vt[uvi, 1]]),
        gelenke=gelenke_roh[ort], gewichte=gewichte_roh[ort], index=tri,
    )

    # Charakter-Editor (nur Spielerfiguren): Formziele für Gesicht und Körper
    editor = einstellung.get('editor')
    koerper_idx = np.unique(flaechen)
    formziele, koerper_ziele = {}, []
    if editor:
        t_f = time.time()
        formziele = formen.berechne(k, einstellung['makro'])
        haut_teil['ziele'] = {n: d[ort] for n, d in formziele.items()}
        koerper_ziele = list(formziele)
        print(f'  {len(formziele)} Formziele in {time.time() - t_f:.1f} s')
    haut_d = {n: d[koerper_idx] for n, d in formziele.items()}

    glb = Glb()
    t1 = time.time()
    schluessel = hashlib.sha1(repr((einstellung['makro'], einstellung['haut'], HAUT_STAND)).encode()).hexdigest()[:12]
    zwischen = Path(__file__).parent / 'ausgabe-pruefung' / f'haut_{name}_{schluessel}.npz'
    if zwischen.exists():
        z = np.load(zwischen)
        farbe, normal, orm = z['farbe'], z['normal'], z['orm']
    else:
        farbe, normal, orm = haut.male_haut(k, skelett, haut_teil['pos'], haut_teil['normal'], haut_teil['uv'], tri,
                                           einstellung['haut'], groesse=einstellung.get('textur', 2048))
        zwischen.parent.mkdir(exist_ok=True)
        np.savez(zwischen, farbe=farbe, normal=normal, orm=orm)
    klein = lambda a: np.asarray(Image.fromarray(a).resize((einstellung.get('textur', 2048) // 2,) * 2, Image.LANCZOS))
    haut_teil['material'] = glb.material(
        'haut', farb_textur=glb.bild(jpg(farbe, 90), 'image/jpeg'),
        normal_textur=glb.bild(jpg(normal, 92), 'image/jpeg'), normal_staerke=1.0,
        orm_textur=glb.bild(jpg(klein(orm), 90), 'image/jpeg'), rauheit=1.0)
    print(f'  Haut gemalt in {time.time() - t1:.1f} s')
    Image.fromarray(farbe).resize((1024, 1024)).save(Path(__file__).parent / 'ausgabe-pruefung' / f'{name}_haut.jpg')
    teile = [haut_teil]  # Haut und Augen (ein Netz)
    haar_teile, lang_teile, bart_teile, kleid_teile, wams_teile = [], [], [], [], []

    # --- Augen ---
    augen = mh.lade_mhclo(mh.MH / 'eyes' / 'high-poly' / 'high-poly.mhclo')
    av, avt, af, afuv, _ = mh.lade_obj(augen['obj'])
    aug_roh = mh.passe_an(augen, k)
    aug_m = k.in_meter(aug_roh)
    # Die Augen hängen an Bezugspunkten im Gesicht und folgen so jedem Formziel (z. B. größere Augen)
    aug_ziele = {n: k2.in_meter(mh.passe_an(augen, k2)) - aug_m for n, k2 in formen.angepasst(k, formziele)}
    an = netz.normalen(aug_m, netz.dreiecke(af))
    kopf = knochen_index['head']
    augen_bild = np.array(Image.open(mh.MH / 'eyes' / 'materials' / 'brown_eye.png').convert('RGB'))
    if einstellung.get('augenfarbe'):
        augen_bild = augen_farbe(augen_bild, einstellung['augenfarbe'])
    flaechen_uv_mitte = np.array([avt[t].mean(axis=0) for t in afuv])
    ist_hornhaut = (flaechen_uv_mitte[:, 0] > 0.85) & (flaechen_uv_mitte[:, 1] < 0.15)
    augen_textur = glb.bild(jpg(augen_bild, 90), 'image/jpeg')
    for hornhaut in (False, True):
        auswahl = [i for i in range(len(af)) if ist_hornhaut[i] == hornhaut]
        atri, aort, auvi = netz.naht_auftrennen([af[i] for i in auswahl], [afuv[i] for i in auswahl])
        if hornhaut:
            mat = glb.material('hornhaut', farbe=(1, 1, 1, 0.12), rauheit=0.03, alpha='BLEND')
        else:
            mat = glb.material('augen', farb_textur=augen_textur, rauheit=0.25)
        teile.append(dict(
            pos=aug_m[aort], normal=an[aort], uv=np.column_stack([avt[auvi, 0], 1 - avt[auvi, 1]]),
            gelenke=np.tile([kopf, 0, 0, 0], (len(aort), 1)), gewichte=np.tile([1.0, 0, 0, 0], (len(aort), 1)),
            index=atri, material=mat, ziele={n: d[aort] for n, d in aug_ziele.items()},
        ))

    # --- Haare ---
    stil = einstellung.get('haare')
    if stil:
        # Spielerfiguren: helle Haare, die das Spiel nach Wunsch einfärbt
        haarfarbe = (0.86, 0.82, 0.76) if editor else einstellung['haut']['haarfarbe']
        haar_mat = glb.material('haare', farb_textur=glb.bild(png(haare.haar_textur(haarfarbe))), rauheit=0.55,
                                alpha='MASK', alpha_grenze=0.35, doppelseitig=True)
        kopf_y = skelett[knochen_index['head']]['kopf'][1]

        def gewichte(hp, nur_kopf):
            # Lange Haare liegen unten auf Nacken und Rücken und bewegen sich mit ihnen; kurze nur mit dem Kopf
            t = 0 * hp[:, 1] if nur_kopf else haut.glatt(kopf_y - 0.02, kopf_y - 0.16, hp[:, 1])
            voll = np.zeros((len(hp), len(skelett)))
            voll[:, knochen_index['head']] = 1 - t
            voll[:, knochen_index['neck_01']] = t * 0.3
            voll[:, knochen_index['spine_03']] = t * 0.7
            return netz.beste_vier(voll)

        def teil(hp, ht, huv, hn, nur_kopf=False, ziele=None):
            g, w = gewichte(hp, nur_kopf)
            return dict(pos=hp, normal=hn, uv=huv, gelenke=g, gewichte=w, index=netz.wicklung_angleichen(hp, ht, hn),
                        material=haar_mat, ziele=ziele)

        gebaut = {}  # mittlere Länge der Strähnen, wie sie gebaut sind
        for hname, ketten, breite, mitte, s in haare.straehnen_von(k, alle_punkte_m, normalen_roh, roh_tri, stil):
            gebaut[hname] = round(float(np.linalg.norm(np.diff(ketten, axis=1), axis=2).sum(axis=1).mean()), 3)
            if not editor:
                teile.append(teil(*haare.karten(ketten, breite, mitte, s)))
                continue
            # Charakter-Editor: Haare und Bart in mehreren Längen (Formziele); ganz kurze Strähnen werden auch schmal
            folgt = formen.FUER_HAARE if hname == 'haare' else formen.FUER_BART
            voll_breit = 0.04 if hname == 'haare' else 0.03

            def karten(laenge, punkte):
                return haare.karten(formen.kuerzen(ketten, laenge, punkte), breite * np.clip(laenge / voll_breit, 0.15, 1),
                                    mitte, s)

            def mit_zielen(hp, laengen, punkte, namen):
                ziele = formen.uebertrage(hp, alle_punkte_m[koerper_idx], {n: haut_d[n] for n in folgt})
                for n, l in zip(namen, laengen):
                    ziele[n] = karten(l, punkte)[0] - hp
                return ziele

            if hname == 'haare':
                # Zwei Netze: kurz (bis zur mittleren Länge, ganz am Kopf) und lang (liegt auf Nacken und Rücken).
                # Bei der mittleren Länge sehen beide gleich aus; das Spiel blendet je nach Länge eins davon ein.
                *kurz, mitte_l = editor['haare']
                hp, ht, huv, hn = karten(mitte_l, 7)
                haar_teile.append(teil(hp, ht, huv, hn, True, mit_zielen(hp, kurz, 7, [f'haar_{i + 1}' for i in range(len(kurz))])))
                hp, ht, huv, hn = haare.karten(ketten, breite, mitte, s)
                lang_teile.append(teil(hp, ht, huv, hn, False, mit_zielen(hp, [mitte_l], ketten.shape[1], [f'haar_{len(kurz) + 1}'])))
            else:
                # Der Bart hängt am Kinn und bewegt sich ganz mit dem Kopf
                stufen = editor['bart']
                hp, ht, huv, hn = haare.karten(ketten, breite, mitte, s)
                bart_teile.append(teil(hp, ht, huv, hn, True, mit_zielen(hp, stufen, ketten.shape[1], [f'bart_{i + 1}' for i in range(len(stufen))])))
            print(f'  {hname}: {len(ketten)} Strähnen')

    # --- Kleidung ---
    kp, kn_ = alle_punkte_m[koerper_idx], normalen_roh[koerper_idx]
    kleid_ziele = (lambda punkte: formen.uebertrage(punkte, kp, {n: haut_d[n] for n in formen.FUER_KLEIDUNG})) \
        if editor else (lambda punkte: None)
    kg, kw = gelenke_roh[koerper_idx], gewichte_roh[koerper_idx]
    if einstellung.get('kleidung') == 'kutte':
        stuecke = []
        schnitt = einstellung.get('kutte', {})
        kidx, kpunkte, ktri, kuv = kleidung.kutte(k, normalen_roh, skelett, koerper_flaechen=flaechen,
                                                  saum=schnitt.get('saum'), weite=schnitt.get('weite', 0.35))
        wf, wn, wo = kleidung.wolle_textur(grund=schnitt.get('farbe', (0.42, 0.37, 0.30)), saat=schnitt.get('saat', 11))
        wolle = glb.material('wolle', farb_textur=glb.bild(jpg(wf, 88), 'image/jpeg'),
                             normal_textur=glb.bild(jpg(wn, 90), 'image/jpeg'),
                             orm_textur=glb.bild(jpg(wo, 90), 'image/jpeg'), rauheit=1.0, doppelseitig=True)
        teile.append(dict(pos=kpunkte, normal=netz.normalen(kpunkte, ktri), uv=kuv, gelenke=gelenke_roh[kidx],
                          gewichte=gewichte_roh[kidx], index=ktri, material=wolle))
        guertel_y = skelett[knochen_index['pelvis']]['kopf'][1] + 0.08
        sp, st, suv = kleidung.strick(kleidung.huellring(kpunkte, guertel_y, abstand=0.004, bruecke_grad=25,
                                                           dicke=0.02, nur_rumpf=0.35))
        g, w = netz.uebertrage_gewichte(sp, kp, kg, kw)
        strick_mat = glb.material('strick', farbe=schnitt.get('guertel', (0.30, 0.24, 0.16, 1)), rauheit=0.95)
        teile.append(dict(pos=sp, normal=netz.normalen(sp, st), uv=suv, gelenke=g, gewichte=w, index=st,
                          material=strick_mat))
    else:
        stuecke = kleidung.lendenschurz(kp, kn_, skelett, weiblich=einstellung['haut'].get('weiblich', False))
    if einstellung['haut'].get('weiblich'):
        stuecke += kleidung.brustband(kp, skelett)
    lf, ln, lo = kleidung.leder_textur(512, grund=einstellung.get('leder', (0.36, 0.25, 0.16)))
    leder = glb.material('leder', farb_textur=glb.bild(png(lf)), normal_textur=glb.bild(jpg(ln, 90), 'image/jpeg'),
                         orm_textur=glb.bild(jpg(lo, 90), 'image/jpeg'), rauheit=1.0, alpha='MASK', alpha_grenze=0.5,
                         doppelseitig=True)
    for b in kleidung.lappen_knochen(stuecke):
        skelett.append(b)
        knochen_index[b['name']] = len(skelett) - 1
    for sname, sp, st, suv, art in stuecke:
        g, w = netz.uebertrage_gewichte(sp, kp, kg, kw)
        if art == 'lappen':
            voll = np.zeros((len(sp), len(skelett)))
            # oben: Gewichte des Gürtels; nach unten übernimmt der Pendel-Knochen
            oben_g, oben_w = netz.uebertrage_gewichte(sp[:, :] * [1, 0, 1] + [0, sp[:, 1].max(), 0], kp, kg, kw)
            for spalte in range(4):
                np.add.at(voll, (np.arange(len(sp)), oben_g[:, spalte]), oben_w[:, spalte])
            unten = haut.glatt(0.0, 0.45, suv[:, 1])[:, None]
            pendel = np.zeros_like(voll)
            pendel[:, knochen_index[sname]] = 1
            g, w = netz.beste_vier(voll * (1 - unten) + pendel * unten)
        (kleid_teile if editor else teile).append(dict(pos=sp, normal=netz.normalen(sp, st), uv=suv, gelenke=g,
                                                       gewichte=w, index=st, material=leder, ziele=kleid_ziele(sp)))
    if editor:
        # Lederwams: ein eigenes Netz, das das Spiel zeigt, sobald man eins trägt (Rumpf bis über die Hüfte, ohne Ärmel)
        # Armlöcher und Halsausschnitt folgen dem Körper: kein Stoff, wo Arme, Hals oder Kopf die Haut bewegen
        def anteil_an(namen):
            ids = [knochen_index[n] for n in namen if n in knochen_index]
            a = np.zeros(len(gelenke_roh))
            for spalte in range(4):
                a += np.isin(gelenke_roh[:, spalte], ids) * gewichte_roh[:, spalte]
            return a
        hals = anteil_an(('neck_01', 'head')) > 0.35
        arme = anteil_an(('upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r')) > 0.6
        widx, wp, wtri, wuv = kleidung.kutte(k, normalen_roh, skelett, aermel_bis=0.3, koerper_flaechen=flaechen,
                                             saum=0.1, weite=0.05, ohne=np.nonzero(hals | arme)[0])
        wf, wn, wo = kleidung.leder_textur(512, grund=(0.30, 0.20, 0.12), saat=5, fransen=False)
        wams_leder = glb.material('leder', farb_textur=glb.bild(jpg(wf[..., :3] if wf.shape[-1] == 4 else wf, 88), 'image/jpeg'),
                                  normal_textur=glb.bild(jpg(wn, 90), 'image/jpeg'),
                                  orm_textur=glb.bild(jpg(wo, 90), 'image/jpeg'), rauheit=1.0, doppelseitig=True)
        wams_teile.append(dict(pos=wp, normal=netz.normalen(wp, wtri), uv=wuv, gelenke=gelenke_roh[widx],
                               gewichte=gewichte_roh[widx], index=wtri, material=wams_leder, ziele=kleid_ziele(wp)))

    # --- Bewegungen ---
    bewegungen = []
    for bname, art, quelle, *bereich in einstellung.get('bewegungen', []):
        if art == 'stehen':
            bewegungen.append(bewegung.stehen_aus(bewegung.Quelle(quelle), skelett))
        elif art == 'zyklus':
            bewegungen.append(bewegung.zyklus_bewegung(quelle, skelett, bname))
        else:  # 'ganz' oder ein Abschnitt (von, bis) in Einzelbildern, z. B. ein einzelner Hieb
            bewegungen.append(bewegung.ganze_bewegung(quelle, skelett, bname, *bereich))
    finger = bewegungen[0]['finger'] if bewegungen else {}

    # --- Skelett-Knoten (Grundhaltung: erste Stellung des Stehens, Finger locker gekrümmt) ---
    grund = {}
    if bewegungen:
        grund = {n: q[0] for n, q in bewegungen[0]['lokal'].items()}
    knoten = []
    for b in skelett:
        eltern = b['eltern']
        rel = b['kopf'] - (skelett[knochen_index[eltern]]['kopf'] if eltern else 0)
        if b['name'] == 'pelvis' and bewegungen:
            rel = bewegungen[0]['becken'][0]
        dreh = grund.get(b['name'], finger.get(b['name']))
        knoten.append(glb.knoten(name=b['name'], translation=[float(x) for x in rel],
                                 rotation=[float(x) for x in dreh] if dreh is not None else None))
    for i, b in enumerate(skelett):
        kinder = [knoten[j] for j, c in enumerate(skelett) if c['eltern'] == b['name']]
        if kinder:
            glb.gltf['nodes'][knoten[i]]['children'] = kinder
    ibm = np.tile(np.eye(4), (len(skelett), 1, 1))
    for i, b in enumerate(skelett):
        ibm[i, :3, 3] = -b['kopf']
    # glTF erwartet Spalten-Reihenfolge
    ibm_acc = glb.accessor(np.transpose(ibm, (0, 2, 1)).reshape(len(skelett), 16))
    glb.gltf['skins'].append({'joints': knoten, 'inverseBindMatrices': ibm_acc, 'skeleton': knoten[0]})
    if editor:
        # Eigene Netze für Körper, Haare, Bart und Kleidung, jedes mit den Formzielen, die es betrifft
        # (spart Speicher auf der Grafikkarte: ein Formziel kostet dort Platz für jeden Punkt des Netzes)
        n_haar, n_bart = len(editor['haare']), len(editor.get('bart', ()))
        netze = [
            ('koerper', teile, koerper_ziele),
            ('haare', haar_teile, [f'haar_{i + 1}' for i in range(n_haar - 1)] + formen.FUER_HAARE),
            ('haare_lang', lang_teile, [f'haar_{n_haar}'] + formen.FUER_HAARE),
            ('bart', bart_teile, [f'bart_{i + 1}' for i in range(n_bart)] + formen.FUER_BART),
            ('kleidung', kleid_teile, formen.FUER_KLEIDUNG),
            ('wams', wams_teile, formen.FUER_KLEIDUNG),
        ]
        netz_knoten = [glb.knoten(name=f'{name}-{teil}', mesh=glb.netz(f'{name}-{teil}', liste, ziele), skin=0)
                       for teil, liste, ziele in netze if liste]
    else:
        netz_knoten = [glb.knoten(name=f'{name}-koerper', mesh=glb.netz(name, teile), skin=0)]
    for bw in bewegungen:
        zeiten = glb.accessor(bw['zeiten'].astype(np.float32), minmax=True)
        kanaele, abtaster = [], []
        for kn, q in bw['lokal'].items():
            abtaster.append({'input': zeiten, 'output': glb.accessor(q), 'interpolation': 'LINEAR'})
            kanaele.append({'sampler': len(abtaster) - 1, 'target': {'node': knoten[knochen_index[kn]], 'path': 'rotation'}})
        abtaster.append({'input': zeiten, 'output': glb.accessor(bw['becken']), 'interpolation': 'LINEAR'})
        kanaele.append({'sampler': len(abtaster) - 1, 'target': {'node': knoten[knochen_index['pelvis']], 'path': 'translation'}})
        glb.gltf['animations'].append({'name': bw['name'], 'samplers': abtaster, 'channels': kanaele})
    tempo = {bw['name']: round(bw['tempo'], 3) for bw in bewegungen}
    extras = {'tempo': tempo}
    if editor and stil:
        # Für das Spiel: bei welchen Längen die Formziele liegen und wie lang Haare und Bart gebaut sind
        extras['editor'] = {
            # aufgemalte Haarfarbe (Brauen, Haaransatz); das Spiel färbt sie über die Maske im ORM-Bild um
            'haarfarbe': [float(x) for x in einstellung['haut']['haarfarbe']],
            'haarbild': list(haarfarbe),  # Farbe des Strähnenbilds (hell, wird im Spiel eingefärbt)
            'haare': [*editor['haare'], gebaut['haare']],
            **({'bart': [*editor['bart'], gebaut['bart']]} if editor.get('bart') else {}),
        }
    wurzel = glb.knoten(name=name, children=[knoten[0], *netz_knoten], extras=extras)
    glb.gltf['scenes'][0]['nodes'] = [wurzel]

    AUSGABE.mkdir(parents=True, exist_ok=True)
    groesse = glb.schreibe(AUSGABE / f'{name}.glb')
    print(f'{name}: {groesse / 1e6:.1f} MB, {len(tri)} Dreiecke, Tempo {tempo}, {time.time() - t0:.1f} s')


if __name__ == '__main__':
    namen = sys.argv[1:] or list(FIGUREN)
    for n in namen:
        baue(n, FIGUREN[n])
