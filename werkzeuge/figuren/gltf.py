"""Kleiner GLB-Schreiber (glTF 2.0, binär) für Figuren mit Skelett, Haut-Gewichten, Bewegungen und
Formzielen (Morph-Targets: z. B. Muskeln, Nase, Haarlänge, die sich im Spiel stufenlos einstellen lassen)."""
import json
import struct

import numpy as np

FLOAT, BYTE, UBYTE, SHORT, USHORT, UINT = 5126, 5120, 5121, 5122, 5123, 5125
DTYP = {FLOAT: np.float32, BYTE: np.int8, UBYTE: np.uint8, SHORT: np.int16, USHORT: np.uint16, UINT: np.uint32}
# Gepackte Zahlen (KHR_mesh_quantization): Richtungen, Bildkoordinaten und Formziele brauchen keine vollen
# Kommazahlen. Das halbiert die Figuren ungefähr; three.js entpackt sie beim Laden selbst.
PACKEN = 'KHR_mesh_quantization'


def ganzzahlig(werte, komponente):
    """Kommazahlen von -1..1 (BYTE, SHORT) oder 0..1 (UBYTE, USHORT) als normierte ganze Zahlen."""
    groesst = {BYTE: 127, SHORT: 32767, UBYTE: 255, USHORT: 65535}[komponente]
    return np.round(np.clip(werte, -1 if komponente in (BYTE, SHORT) else 0, 1) * groesst).astype(DTYP[komponente])
TYP = {1: 'SCALAR', 2: 'VEC2', 3: 'VEC3', 4: 'VEC4', 16: 'MAT4'}


class Glb:
    def __init__(self):
        self.gltf = {
            'asset': {'version': '2.0', 'generator': 'schatzsuche/werkzeuge/figuren'},
            'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [], 'materials': [],
            'textures': [], 'images': [], 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
            'accessors': [], 'bufferViews': [], 'buffers': [], 'skins': [], 'animations': [],
        }
        self.daten = bytearray()
        self.erweiterungen = set()

    def _view(self, roh, ziel=None, schritt=None):
        while len(self.daten) % 4:
            self.daten += b'\0'
        view = {'buffer': 0, 'byteOffset': len(self.daten), 'byteLength': len(roh)}
        if ziel:
            view['target'] = ziel
        if schritt:
            view['byteStride'] = schritt
        self.daten += roh
        self.gltf['bufferViews'].append(view)
        return len(self.gltf['bufferViews']) - 1

    def accessor(self, feld, komponente=FLOAT, ziel=None, minmax=False, normiert=False, schritt=None):
        """schritt: Bytes je Element, wenn es auf eine durch 4 teilbare Länge aufgefüllt werden muss (glTF verlangt
        das für Punktdaten, z. B. drei Bytes für eine gepackte Richtung -> vier)."""
        feld = np.ascontiguousarray(feld).astype(DTYP[komponente])
        breite = 1 if feld.ndim == 1 else int(np.prod(feld.shape[1:]))
        roh = feld.reshape(len(feld), -1)
        if schritt and schritt != roh.itemsize * breite:
            platz = np.zeros((len(roh), schritt), np.uint8)
            platz[:, :roh.itemsize * breite] = roh.view(np.uint8).reshape(len(roh), -1)
            daten = platz.tobytes()
        else:
            schritt, daten = None, roh.tobytes()
        a = {
            'bufferView': self._view(daten, ziel, schritt),
            'componentType': komponente,
            'count': int(feld.shape[0]),
            'type': TYP[breite],
        }
        if normiert:
            a['normalized'] = True
        if minmax:
            f2 = feld.reshape(len(feld), -1)
            a['min'] = [float(x) for x in f2.min(axis=0)]
            a['max'] = [float(x) for x in f2.max(axis=0)]
        self.gltf['accessors'].append(a)
        return len(self.gltf['accessors']) - 1

    def formziel(self, verschiebung, schwelle=2e-4):
        """Ein Formziel: Verschiebung je Punkt. Bewegen sich nur wenige Punkte (z. B. nur die Nase), werden nur
        diese gespeichert (dünn besetzter Accessor); bewegt sich keiner, gar nichts (glTF: dann überall 0)."""
        # Gepackt als normierte 16-Bit-Zahlen (1 = ein Meter, genau auf drei Hundertstel Millimeter); gespeichert
        # werden nur die Punkte, die sich bewegen (Indizes + Werte), so braucht auch ein volles Ziel keine Lücken.
        self.erweiterungen.add(PACKEN)
        d = np.ascontiguousarray(verschiebung, np.float32).reshape(-1, 3)
        bewegt = np.nonzero(np.abs(d).max(axis=1) > schwelle)[0] if len(d) else np.zeros(0, int)
        q = ganzzahlig(d[bewegt], SHORT)
        echt = q.astype(np.float32) / 32767
        a = {'componentType': SHORT, 'normalized': True, 'count': int(len(d)), 'type': 'VEC3',
             'min': [float(x) for x in np.minimum(echt.min(axis=0), 0)] if len(bewegt) else [0.0] * 3,
             'max': [float(x) for x in np.maximum(echt.max(axis=0), 0)] if len(bewegt) else [0.0] * 3}
        if len(bewegt):
            klein = len(d) <= 65536
            a['sparse'] = {
                'count': int(len(bewegt)),
                'indices': {'bufferView': self._view(bewegt.astype(np.uint16 if klein else np.uint32).tobytes()),
                            'componentType': USHORT if klein else UINT},
                'values': {'bufferView': self._view(q.tobytes())},
            }
        self.gltf['accessors'].append(a)
        return len(self.gltf['accessors']) - 1

    def bild(self, png_bytes, mime='image/png'):
        self.gltf['images'].append({'bufferView': self._view(png_bytes), 'mimeType': mime})
        self.gltf['textures'].append({'sampler': 0, 'source': len(self.gltf['images']) - 1})
        return len(self.gltf['textures']) - 1

    def material(self, name, **eig):
        m = {'name': name, 'pbrMetallicRoughness': {}}
        pbr = m['pbrMetallicRoughness']
        if 'farbe' in eig:
            pbr['baseColorFactor'] = list(eig['farbe'])
        if 'farb_textur' in eig:
            pbr['baseColorTexture'] = {'index': eig['farb_textur']}
        pbr['metallicFactor'] = eig.get('metall', 0.0)
        pbr['roughnessFactor'] = eig.get('rauheit', 0.8)
        if 'orm_textur' in eig:
            pbr['metallicRoughnessTexture'] = {'index': eig['orm_textur']}
            m['occlusionTexture'] = {'index': eig['orm_textur']}
        if 'normal_textur' in eig:
            m['normalTexture'] = {'index': eig['normal_textur'], 'scale': eig.get('normal_staerke', 1.0)}
        if eig.get('alpha') == 'MASK':
            m['alphaMode'] = 'MASK'
            m['alphaCutoff'] = eig.get('alpha_grenze', 0.5)
        elif eig.get('alpha') == 'BLEND':
            m['alphaMode'] = 'BLEND'
        if eig.get('doppelseitig'):
            m['doubleSided'] = True
        self.gltf['materials'].append(m)
        return len(self.gltf['materials']) - 1

    def netz(self, name, teile, zielnamen=None):
        """teile: Liste von dict(pos, normal, uv, tangente?, gelenke, gewichte, index, material, ziele?).
        zielnamen: Namen der Formziele; jedes Teil bringt dann in 'ziele' je Name eine Verschiebung je Punkt
        mit (oder None: bleibt bei diesem Ziel unverändert). glTF verlangt dieselbe Zahl Ziele in allen Teilen."""
        prims = []
        for t in teile:
            self.erweiterungen.add(PACKEN)
            normal = np.asarray(t['normal'], np.float32)
            normal = normal / np.maximum(np.linalg.norm(normal, axis=1, keepdims=True), 1e-9)
            attr = {
                'POSITION': self.accessor(t['pos'], ziel=34962, minmax=True),
                'NORMAL': self.accessor(ganzzahlig(normal, BYTE), BYTE, ziel=34962, normiert=True, schritt=4),
            }
            if t.get('uv') is not None:
                uv = np.asarray(t['uv'], np.float32)
                if uv.min() >= 0 and uv.max() <= 1:
                    attr['TEXCOORD_0'] = self.accessor(ganzzahlig(uv, USHORT), USHORT, ziel=34962, normiert=True)
                else:  # Bilder, die sich wiederholen (Koordinaten über 1), bleiben Kommazahlen
                    attr['TEXCOORD_0'] = self.accessor(uv, ziel=34962)
            if t.get('tangente') is not None:
                attr['TANGENT'] = self.accessor(t['tangente'], ziel=34962)
            if t.get('gelenke') is not None:
                gelenke = np.asarray(t['gelenke'])
                attr['JOINTS_0'] = self.accessor(gelenke, UBYTE if gelenke.max() < 256 else USHORT, ziel=34962)
                # Gewichte in 255 Teilen; Rundungsreste gehen an das größte, damit die Summe genau 1 bleibt
                w = np.asarray(t['gewichte'], np.float64)
                w = w / np.maximum(w.sum(axis=1, keepdims=True), 1e-9)
                q = np.round(w * 255).astype(np.int32)
                q[np.arange(len(q)), q.argmax(axis=1)] += 255 - q.sum(axis=1)
                attr['WEIGHTS_0'] = self.accessor(q.astype(np.uint8), UBYTE, ziel=34962, normiert=True)
            index = t['index'].reshape(-1)
            prim = {
                'attributes': attr,
                'indices': self.accessor(index, USHORT if len(t['pos']) <= 65535 else UINT, ziel=34963),
                'material': t['material'],
            }
            if zielnamen:
                ziele = t.get('ziele') or {}
                leer = np.zeros((len(t['pos']), 3), np.float32)
                prim['targets'] = [{'POSITION': self.formziel(ziele.get(n) if ziele.get(n) is not None else leer)}
                                   for n in zielnamen]
            prims.append(prim)
        netz = {'name': name, 'primitives': prims}
        if zielnamen:
            netz['weights'] = [0.0] * len(zielnamen)
            netz['extras'] = {'targetNames': list(zielnamen)}
        self.gltf['meshes'].append(netz)
        return len(self.gltf['meshes']) - 1

    def knoten(self, **k):
        self.gltf['nodes'].append({kk: v for kk, v in k.items() if v is not None})
        return len(self.gltf['nodes']) - 1

    def schreibe(self, pfad):
        self.gltf['buffers'] = [{'byteLength': len(self.daten)}]
        if self.erweiterungen:
            self.gltf['extensionsUsed'] = self.gltf['extensionsRequired'] = sorted(self.erweiterungen)
        for schluessel in ('skins', 'animations', 'textures', 'images', 'materials'):
            if not self.gltf[schluessel]:
                del self.gltf[schluessel]
        if 'textures' not in self.gltf:
            self.gltf.pop('samplers', None)
        j = json.dumps(self.gltf, separators=(',', ':')).encode()
        while len(j) % 4:
            j += b' '
        while len(self.daten) % 4:
            self.daten += b'\0'
        gesamt = 12 + 8 + len(j) + 8 + len(self.daten)
        with open(pfad, 'wb') as d:
            d.write(struct.pack('<III', 0x46546C67, 2, gesamt))
            d.write(struct.pack('<II', len(j), 0x4E4F534A) + j)
            d.write(struct.pack('<II', len(self.daten), 0x004E4942) + bytes(self.daten))
        return gesamt
