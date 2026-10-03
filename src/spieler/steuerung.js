// Laufen, Rennen, Springen, Umsehen – und die zwei Blickwinkel:
// von hinten über die Schulter (wie GTA) und aus den eigenen Augen (wie The Witcher in Ich-Sicht).
import * as THREE from 'three';
import { hoeheBei, WELT_GROESSE } from '../welt/gelaende.js';

const GEHEN = 1.6, RENNEN = 5.2, SPRUNG = 4.2, SCHWERKRAFT = 9.81; // Meter, Sekunden
const AUGENHOEHE = 1.62;

export function erzeugeSteuerung({ kamera, figur, flaeche }) {
  const z = {
    ort: new THREE.Vector3(0, hoeheBei(0, 0), 0),
    blickSeite: Math.PI, // Drehung nach links/rechts
    blickHoehe: -0.12,   // nach oben/unten
    fallTempo: 0,
    amBoden: true,
    tempo: 0,
    ichSicht: false,
    abstand: 4.2,
    gelaufen: 0, // Meter insgesamt – Ereignisse fragen danach
    aktiv: false,
  };
  const tasten = new Set();
  let ziehen = false;
  const bewegung = new THREE.Vector3();
  const ziel = new THREE.Vector3();

  addEventListener('keydown', (e) => {
    tasten.add(e.code);
    if (e.code === 'KeyV' && z.aktiv) z.ichSicht = !z.ichSicht;
  });
  addEventListener('keyup', (e) => tasten.delete(e.code));
  addEventListener('blur', () => tasten.clear());

  // Umsehen: mit Mauszeiger-Sperre (Pointer Lock), sonst bei gedrückter Maustaste
  flaeche.addEventListener('mousedown', () => {
    ziehen = true;
    if (z.aktiv && document.pointerLockElement !== flaeche) {
      try { flaeche.requestPointerLock()?.catch?.(() => {}); } catch { /* nicht verfügbar */ }
    }
  });
  addEventListener('mouseup', () => { ziehen = false; });
  addEventListener('mousemove', (e) => {
    if (!z.aktiv) return;
    if (document.pointerLockElement !== flaeche && !ziehen) return;
    z.blickSeite -= e.movementX * 0.0025;
    z.blickHoehe = THREE.MathUtils.clamp(z.blickHoehe - e.movementY * 0.0022, -1.35, 1.2);
  });
  flaeche.addEventListener('wheel', (e) => {
    z.abstand = THREE.MathUtils.clamp(z.abstand + e.deltaY * 0.004, 1.8, 9);
  }, { passive: true });

  function schritt(dt) {
    const vor = (tasten.has('KeyW') || tasten.has('ArrowUp') ? 1 : 0) - (tasten.has('KeyS') || tasten.has('ArrowDown') ? 1 : 0);
    const seit = (tasten.has('KeyD') || tasten.has('ArrowRight') ? 1 : 0) - (tasten.has('KeyA') || tasten.has('ArrowLeft') ? 1 : 0);
    const rennt = tasten.has('ShiftLeft') || tasten.has('ShiftRight');

    bewegung.set(0, 0, 0);
    if (z.aktiv && (vor || seit)) {
      const sinS = Math.sin(z.blickSeite), cosS = Math.cos(z.blickSeite);
      bewegung.set(-sinS * vor + cosS * seit, 0, -cosS * vor - sinS * seit).normalize();
    }
    const sollTempo = bewegung.lengthSq() ? (rennt ? RENNEN : GEHEN) : 0;
    z.tempo += (sollTempo - z.tempo) * Math.min(1, dt * 6);

    const vorher = z.ort.clone();
    z.ort.addScaledVector(bewegung, z.tempo * dt);
    const grenze = WELT_GROESSE / 2 - 20;
    z.ort.x = THREE.MathUtils.clamp(z.ort.x, -grenze, grenze);
    z.ort.z = THREE.MathUtils.clamp(z.ort.z, -grenze, grenze);

    // Springen und Fallen
    const boden = hoeheBei(z.ort.x, z.ort.z);
    if (z.aktiv && z.amBoden && tasten.has('Space')) { z.fallTempo = SPRUNG; z.amBoden = false; }
    z.fallTempo -= SCHWERKRAFT * dt;
    z.ort.y += z.fallTempo * dt;
    if (z.ort.y <= boden) { z.ort.y = boden; z.fallTempo = 0; z.amBoden = true; }
    z.gelaufen += Math.hypot(z.ort.x - vorher.x, z.ort.z - vorher.z);

    // Die Figur dreht sich weich in Laufrichtung
    const fig = figur.objekt;
    fig.position.copy(z.ort);
    if (bewegung.lengthSq()) {
      const soll = Math.atan2(bewegung.x, bewegung.z);
      let d = soll - fig.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      fig.rotation.y += d * Math.min(1, dt * 10);
    }
    figur.bewege(dt, z.tempo, !z.amBoden);

    // Kamera
    const blick = new THREE.Vector3(
      -Math.sin(z.blickSeite) * Math.cos(z.blickHoehe),
      Math.sin(z.blickHoehe),
      -Math.cos(z.blickSeite) * Math.cos(z.blickHoehe),
    );
    if (z.ichSicht) {
      fig.visible = false;
      kamera.position.set(z.ort.x, z.ort.y + AUGENHOEHE + (z.tempo > 0.1 && z.amBoden ? Math.sin(z.gelaufen * 4) * 0.025 : 0), z.ort.z);
      kamera.lookAt(ziel.copy(kamera.position).add(blick));
    } else {
      fig.visible = true;
      ziel.set(z.ort.x, z.ort.y + 1.5, z.ort.z);
      const schulter = new THREE.Vector3(Math.cos(z.blickSeite), 0, -Math.sin(z.blickSeite)).multiplyScalar(0.45);
      kamera.position.copy(ziel).addScaledVector(blick, -z.abstand).add(schulter);
      const minY = hoeheBei(kamera.position.x, kamera.position.z) + 0.35;
      if (kamera.position.y < minY) kamera.position.y = minY;
      kamera.lookAt(ziel.add(schulter));
    }
  }

  return { zustand: z, schritt, tasten };
}
