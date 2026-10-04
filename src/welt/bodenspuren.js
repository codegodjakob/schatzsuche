// Spuren am Boden: Wo etwas liegt, wo gegraben oder viel gegangen wurde, steht das Gras niedrig.
// Ein Graubild über die ganze Welt (knapp ein Meter je Bildpunkt); das Gras liest es (siehe gras.js)
// und wird dort kürzer, je heller der Bildpunkt ist.
import * as THREE from 'three';
import { WELT_GROESSE } from './gelaende.js';

const N = 1024;
const daten = new Uint8Array(N * N);
export const spurenBild = new THREE.DataTexture(daten, N, N, THREE.RedFormat);
spurenBild.magFilter = spurenBild.minFilter = THREE.LinearFilter;
spurenBild.needsUpdate = true;

// Drückt das Gras in einem Kreis nieder (staerke 0 … 1: wie viel davon weg ist)
export function druecke(x, z, radius = 0.6, staerke = 0.85) {
  const zelle = WELT_GROESSE / N;
  const mx = (x + WELT_GROESSE / 2) / zelle - 0.5, mz = (z + WELT_GROESSE / 2) / zelle - 0.5;
  const r = radius / zelle + 1;
  for (let iz = Math.max(0, Math.floor(mz - r)); iz <= Math.min(N - 1, Math.ceil(mz + r)); iz++) {
    for (let ix = Math.max(0, Math.floor(mx - r)); ix <= Math.min(N - 1, Math.ceil(mx + r)); ix++) {
      const d = Math.hypot(ix - mx, iz - mz) * zelle;
      const w = staerke * THREE.MathUtils.clamp(1 - (d - radius * 0.6) / (radius * 0.8), 0, 1);
      const k = iz * N + ix;
      daten[k] = Math.max(daten[k], Math.round(w * 255));
    }
  }
  spurenBild.needsUpdate = true;
}
