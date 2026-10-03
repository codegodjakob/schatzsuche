"""Kleiner GLB-Schreiber (glTF 2.0, binär) für Figuren mit Skelett, Haut-Gewichten und Bewegungen."""
import json
import struct

import numpy as np

FLOAT, UBYTE, USHORT, UINT = 5126, 5121, 5123, 5125
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

    def _view(self, roh, ziel=None):
        while len(self.daten) % 4:
            self.daten += b'\0'
        view = {'buffer': 0, 'byteOffset': len(self.daten), 'byteLength': len(roh)}
        if ziel:
            view['target'] = ziel
        self.daten += roh
        self.gltf['bufferViews'].append(view)
        return len(self.gltf['bufferViews']) - 1

    def accessor(self, feld, komponente=FLOAT, ziel=None, minmax=False, normiert=False):
        feld = np.ascontiguousarray(feld)
        dtype = {FLOAT: np.float32, UBYTE: np.uint8, USHORT: np.uint16, UINT: np.uint32}[komponente]
        feld = feld.astype(dtype)
        breite = 1 if feld.ndim == 1 else int(np.prod(feld.shape[1:]))
        a = {
            'bufferView': self._view(feld.tobytes(), ziel),
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

    def netz(self, name, teile):
        """teile: Liste von dict(pos, normal, uv, tangente?, gelenke, gewichte, index, material)"""
        prims = []
        for t in teile:
            attr = {
                'POSITION': self.accessor(t['pos'], ziel=34962, minmax=True),
                'NORMAL': self.accessor(t['normal'], ziel=34962),
            }
            if t.get('uv') is not None:
                attr['TEXCOORD_0'] = self.accessor(t['uv'], ziel=34962)
            if t.get('tangente') is not None:
                attr['TANGENT'] = self.accessor(t['tangente'], ziel=34962)
            if t.get('gelenke') is not None:
                attr['JOINTS_0'] = self.accessor(t['gelenke'], USHORT, ziel=34962)
                attr['WEIGHTS_0'] = self.accessor(t['gewichte'], ziel=34962)
            prims.append({
                'attributes': attr,
                'indices': self.accessor(t['index'].reshape(-1), UINT, ziel=34963),
                'material': t['material'],
            })
        self.gltf['meshes'].append({'name': name, 'primitives': prims})
        return len(self.gltf['meshes']) - 1

    def knoten(self, **k):
        self.gltf['nodes'].append({kk: v for kk, v in k.items() if v is not None})
        return len(self.gltf['nodes']) - 1

    def schreibe(self, pfad):
        self.gltf['buffers'] = [{'byteLength': len(self.daten)}]
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
