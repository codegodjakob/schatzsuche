// Laufen, Rennen, Springen, Umsehen – und die zwei Blickwinkel:
// über die Schulter (wie GTA) und aus den eigenen Augen (wie The Witcher in Ich-Sicht).
import * as THREE from 'three';
import { hoeheBei, wasserspiegel, WELT_GROESSE } from '../welt/gelaende.js';
import { TEICH } from '../welt/orte.js';
import { freieSicht, schiebeHinaus } from '../welt/kollision.js';

const GEHEN = 1.5, RENNEN = 4.6, SPRUNG = 4.2, SCHWERKRAFT = 9.81; // Meter, Sekunden

export function erzeugeSteuerung({ kamera, flaeche }) {
  const z = {
    ort: new THREE.Vector3(0, hoeheBei(0, 0), 0),
    blickSeite: Math.PI, // Drehung nach links/rechts (π = Blick nach +Z)
    blickHoehe: -0.1,
    fallTempo: 0,
    amBoden: true,
    tempo: 0,
    ichSicht: false,
    abstand: 3.6,
    gelaufen: 0, // Meter insgesamt – Ereignisse fragen danach
    aktiv: false,
    erschoepft: false,
  };
  let figur = null;
  const tasten = new Set();
  // Beim Zuschlagen: kurz langsamer, und die Figur dreht sich zum Gegner
  let bremsUhr = 0;
  const drehung = { winkel: 0, uhr: 0 };
  // Laufstick auf Handy und Tablet (src/ui/beruehrung.js): Richtung von -1 bis 1, ganz ausgelenkt = rennen
  const stick = { vor: 0, seit: 0, rennt: false };
  let ziehen = false;
  // Nach einer Berührung schickt der Browser nachgeahmte Mausereignisse; die sollen die Kamera nicht drehen
  let letzteBeruehrung = -Infinity;
  addEventListener('touchstart', () => { letzteBeruehrung = performance.now(); }, { capture: true, passive: true });
  const nachgeahmt = () => performance.now() - letzteBeruehrung < 1000;
  const bewegung = new THREE.Vector3();
  const ziel = new THREE.Vector3(), kameraZiel = new THREE.Vector3(), kameraOrt = new THREE.Vector3();
  const wsp = wasserspiegel();

  addEventListener('keydown', (e) => {
    tasten.add(e.code);
    if (e.code === 'KeyV' && z.aktiv) {
      z.ichSicht = !z.ichSicht;
      figur?.kopfSichtbar(!z.ichSicht);
    }
  });
  addEventListener('keyup', (e) => tasten.delete(e.code));
  addEventListener('blur', () => tasten.clear());

  // Umsehen: mit Mauszeiger-Sperre (Pointer Lock), sonst bei gedrückter Maustaste
  flaeche.addEventListener('mousedown', () => {
    if (nachgeahmt()) return;
    ziehen = true;
    if (z.aktiv && document.pointerLockElement !== flaeche) {
      try { flaeche.requestPointerLock()?.catch?.(() => {}); } catch { /* nicht verfügbar */ }
    }
  });
  addEventListener('mouseup', () => { ziehen = false; });
  addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== flaeche && !ziehen) return;
    if (!nachgeahmt()) umsehen(e.movementX, e.movementY);
  });

  function umsehen(dx, dy) {
    if (!z.aktiv) return;
    z.blickSeite -= dx * 0.0025;
    z.blickHoehe = THREE.MathUtils.clamp(z.blickHoehe - dy * 0.0022, -1.3, 1.2);
  }

  function setzeStick(vor, seit, rennt) {
    stick.vor = vor;
    stick.seit = seit;
    stick.rennt = rennt;
  }

  flaeche.addEventListener('wheel', (e) => {
    z.abstand = THREE.MathUtils.clamp(z.abstand + e.deltaY * 0.004, 1.6, 9);
  }, { passive: true });

  function setzeFigur(f) {
    figur = f;
    figur.kopfSichtbar(!z.ichSicht);
  }

  function setzeOrt(x, zz) {
    z.ort.set(x, hoeheBei(x, zz), zz);
    z.tempo = 0;
  }

  function schritt(dt) {
    const vorTaste = (tasten.has('KeyW') || tasten.has('ArrowUp') ? 1 : 0) - (tasten.has('KeyS') || tasten.has('ArrowDown') ? 1 : 0);
    const seitTaste = (tasten.has('KeyD') || tasten.has('ArrowRight') ? 1 : 0) - (tasten.has('KeyA') || tasten.has('ArrowLeft') ? 1 : 0);
    const vor = THREE.MathUtils.clamp(vorTaste + stick.vor, -1, 1);
    const seit = THREE.MathUtils.clamp(seitTaste + stick.seit, -1, 1);
    const rennt = (tasten.has('ShiftLeft') || tasten.has('ShiftRight') || stick.rennt) && !z.erschoepft;

    bewegung.set(0, 0, 0);
    if (z.aktiv && (vor || seit)) {
      const sinS = Math.sin(z.blickSeite), cosS = Math.cos(z.blickSeite);
      bewegung.set(-sinS * vor + cosS * seit, 0, -cosS * vor - sinS * seit).normalize();
    }
    // im Wasser langsamer
    const imWasser = Math.hypot(z.ort.x - TEICH.x, z.ort.z - TEICH.z) < TEICH.radius * 1.6 && z.ort.y < wsp - 0.15;
    let sollTempo = bewegung.lengthSq() ? (rennt ? RENNEN : GEHEN) : 0;
    if (bremsUhr > 0) { bremsUhr -= dt; sollTempo = Math.min(sollTempo, GEHEN * 0.5); }
    if (z.erschoepft) sollTempo *= 0.75;
    if (imWasser) sollTempo *= 0.45;
    z.tempo = THREE.MathUtils.damp(z.tempo, sollTempo, sollTempo > z.tempo ? 4 : 7, dt);

    const vorher = z.ort.clone();
    z.ort.addScaledVector(bewegung, z.tempo * dt);
    schiebeHinaus(z.ort);
    // tiefes Wasser: nicht weiter hinein (Schwimmen gibt es noch nicht)
    if (wsp - hoeheBei(z.ort.x, z.ort.z) > 1.05 && Math.hypot(z.ort.x - TEICH.x, z.ort.z - TEICH.z) < TEICH.radius * 1.7) {
      z.ort.x = vorher.x;
      z.ort.z = vorher.z;
    }
    const grenze = WELT_GROESSE / 2 - 20;
    z.ort.x = THREE.MathUtils.clamp(z.ort.x, -grenze, grenze);
    z.ort.z = THREE.MathUtils.clamp(z.ort.z, -grenze, grenze);

    // Springen und Fallen
    const boden = hoeheBei(z.ort.x, z.ort.z);
    if (z.aktiv && z.amBoden && tasten.has('Space')) { z.fallTempo = SPRUNG; z.amBoden = false; }
    z.fallTempo -= SCHWERKRAFT * dt;
    z.ort.y += z.fallTempo * dt;
    if (z.ort.y <= boden) { z.ort.y = boden; z.fallTempo = 0; z.amBoden = true; }
    const strecke = Math.hypot(z.ort.x - vorher.x, z.ort.z - vorher.z);
    z.gelaufen += strecke;
    const wirklichesTempo = dt > 0 ? strecke / dt : 0;

    if (figur) {
      // Die Figur dreht sich weich in Laufrichtung
      const fig = figur.objekt;
      fig.position.copy(z.ort);
      if (drehung.uhr > 0) {
        drehung.uhr -= dt;
        let d = drehung.winkel - fig.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        fig.rotation.y += d * Math.min(1, dt * 16);
      } else if (bewegung.lengthSq()) {
        const soll = Math.atan2(bewegung.x, bewegung.z);
        let d = soll - fig.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        fig.rotation.y += d * Math.min(1, dt * 8);
      } else if (z.ichSicht) {
        // in der Ich-Sicht schaut der Körper dorthin, wohin man blickt
        let d = (z.blickSeite + Math.PI) - fig.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        fig.rotation.y += d * Math.min(1, dt * 6);
      }
      figur.bewege(dt, Math.min(wirklichesTempo, z.tempo + 0.2), { erschoepft: z.erschoepft });
    }

    // Kamera
    const blick = new THREE.Vector3(
      -Math.sin(z.blickSeite) * Math.cos(z.blickHoehe),
      Math.sin(z.blickHoehe),
      -Math.cos(z.blickSeite) * Math.cos(z.blickHoehe),
    );
    if (z.ichSicht && figur) {
      figur.augenOrt(kamera.position);
      kamera.lookAt(ziel.copy(kamera.position).add(blick));
    } else {
      ziel.set(z.ort.x, z.ort.y + 1.55, z.ort.z);
      const schulter = new THREE.Vector3(Math.cos(z.blickSeite), 0, -Math.sin(z.blickSeite)).multiplyScalar(0.42);
      kameraOrt.copy(ziel).addScaledVector(blick, -z.abstand).add(schulter);
      // Büsche und Stämme zwischen Figur und Kamera: Kamera rückt näher heran
      const frei = freieSicht(ziel, kameraOrt);
      if (frei < 1) kameraOrt.lerpVectors(ziel, kameraOrt, Math.max(frei, 0.25));
      const minY = hoeheBei(kameraOrt.x, kameraOrt.z) + 0.3;
      if (kameraOrt.y < minY) kameraOrt.y = minY;
      kamera.position.lerp(kameraOrt, 1 - Math.exp(-dt * 18));
      kameraZiel.copy(ziel).add(schulter);
      kamera.lookAt(kameraZiel);
    }
  }

  return {
    zustand: z, schritt, tasten, setzeFigur, setzeOrt, umsehen, setzeStick,
    bremse: (sekunden) => { bremsUhr = Math.max(bremsUhr, sekunden); },
    dreheZu: (winkel, sekunden) => { drehung.winkel = winkel; drehung.uhr = sekunden; },
  };
}
