"""BVH-Bewegungsdateien lesen und Gelenkstellungen berechnen (Vorwärtskinematik)."""
import numpy as np
from scipy.spatial.transform import Rotation


class Bvh:
    def __init__(self, pfad):
        self.namen, self.eltern, self.offsets, self.kanaele = [], [], [], []
        with open(pfad) as d:
            text = d.read()
        kopf, bewegung = text.split('MOTION')
        stapel, letzter = [], None
        tokens = kopf.split()
        i = 0
        while i < len(tokens):
            t = tokens[i]
            if t in ('ROOT', 'JOINT'):
                name = tokens[i + 1]
                self.namen.append(name)
                self.eltern.append(stapel[-1] if stapel else -1)
                self.offsets.append(None)
                self.kanaele.append([])
                letzter = len(self.namen) - 1
                i += 2
            elif t == 'End':
                # Endpunkt: als eigener Eintrag ohne Kanäle merken wir uns nicht
                tiefe = 0
                i += 2
                while True:
                    if tokens[i] == '{':
                        tiefe += 1
                    elif tokens[i] == '}':
                        tiefe -= 1
                        if tiefe == 0:
                            i += 1
                            break
                    i += 1
                letzter = None
            elif t == '{':
                stapel.append(letzter)
                i += 1
            elif t == '}':
                stapel.pop()
                i += 1
            elif t == 'OFFSET':
                self.offsets[letzter] = [float(x) for x in tokens[i + 1:i + 4]]
                i += 4
            elif t == 'CHANNELS':
                n = int(tokens[i + 1])
                self.kanaele[letzter] = tokens[i + 2:i + 2 + n]
                i += 2 + n
            else:
                i += 1
        self.offsets = np.array(self.offsets, float)
        zeilen = bewegung.strip().splitlines()
        self.anzahl = int(zeilen[0].split(':')[1])
        self.dt = float(zeilen[1].split(':')[1])
        werte = np.array([[float(x) for x in z.split()] for z in zeilen[2:2 + self.anzahl]], float)
        self._berechne(werte)

    def _berechne(self, werte):
        n, j = self.anzahl, len(self.namen)
        self.lokal_r = np.zeros((n, j, 3, 3))
        self.lokal_t = np.zeros((n, j, 3))
        spalte = 0
        for k in range(j):
            kan = self.kanaele[k]
            pos = np.tile(self.offsets[k], (n, 1))
            achsen, winkel = '', []
            for c in kan:
                if c.endswith('position'):
                    pos[:, 'XYZ'.index(c[0])] = werte[:, spalte]
                else:
                    achsen += c[0]
                    winkel.append(werte[:, spalte])
                spalte += 1
            self.lokal_t[:, k] = pos
            if achsen:
                # BVH: Drehungen in der angegebenen Reihenfolge, mitgeführte Achsen (intrinsisch)
                r = Rotation.from_euler(achsen.upper(), np.stack(winkel, axis=1), degrees=True)
                self.lokal_r[:, k] = r.as_matrix()
            else:
                self.lokal_r[:, k] = np.eye(3)
        self.welt_r = np.zeros_like(self.lokal_r)
        self.welt_p = np.zeros((n, j, 3))
        for k in range(j):
            e = self.eltern[k]
            if e < 0:
                self.welt_r[:, k] = self.lokal_r[:, k]
                self.welt_p[:, k] = self.lokal_t[:, k]
            else:
                self.welt_r[:, k] = self.welt_r[:, e] @ self.lokal_r[:, k]
                self.welt_p[:, k] = self.welt_p[:, e] + np.einsum('nij,nj->ni', self.welt_r[:, e], self.lokal_t[:, k])

    def index(self, name):
        return self.namen.index(name)
