// Tageszeit: Sonnenlauf, Mond, Lichtfarben. Eine Spielstunde dauert eine echte Minute.
import * as THREE from 'three';

export const SEKUNDEN_JE_STUNDE = 60;
const OSTEN = new THREE.Vector3(1, 0, 0);
const SUEDEN = new THREE.Vector3(0, 0, 1);

export const zeit = {
  stunde: 8.5, // Start: halb neun am Morgen
  tag: 1,
  sonne: new THREE.Vector3(),
  mond: new THREE.Vector3(),
  hell: 1, // 0 = Nacht, 1 = voller Tag
  daemmerung: 0, // 1 = Sonne nahe am Horizont (Morgen-/Abendrot)
};

const farbe = (h) => new THREE.Color(h);
const LICHT = {
  mittag: farbe(0xfff4e6), abend: farbe(0xffb070), nacht: farbe(0x8aa4ff),
};

function richtung(stunde, ziel, versatz) {
  // Sonne geht um 6 Uhr im Osten auf, steht um 12 Uhr im Süden, geht um 18 Uhr im Westen unter
  const w = ((stunde + versatz - 6) / 24) * Math.PI * 2;
  const hoehe = Math.sin(w) * 0.92; // höchster Stand ~67°
  const quer = Math.cos(w);
  ziel.copy(OSTEN).multiplyScalar(quer).addScaledVector(SUEDEN, 0.35 + 0.25 * Math.max(0, hoehe));
  ziel.y = hoehe;
  return ziel.normalize();
}

export function tageszeitSchritt(dt) {
  zeit.stunde += dt / SEKUNDEN_JE_STUNDE;
  if (zeit.stunde >= 24) { zeit.stunde -= 24; zeit.tag += 1; }
  richtung(zeit.stunde, zeit.sonne, 0);
  richtung(zeit.stunde, zeit.mond, 12);
  zeit.hell = THREE.MathUtils.smoothstep(zeit.sonne.y, -0.12, 0.08);
  zeit.daemmerung = 1 - THREE.MathUtils.smoothstep(Math.abs(zeit.sonne.y), 0.02, 0.3);
  return zeit;
}

// Lichtfarbe der Sonne (bzw. des Mondes) und Stärke
export function lichtFuerZeit(ziel) {
  const s = zeit.sonne.y;
  if (s > -0.02) {
    const tief = 1 - THREE.MathUtils.smoothstep(s, 0.0, 0.35);
    ziel.farbe.copy(LICHT.mittag).lerp(LICHT.abend, tief);
    ziel.staerke = 4.0 * THREE.MathUtils.smoothstep(s, -0.02, 0.1);
    ziel.richtung.copy(zeit.sonne);
  } else {
    ziel.farbe.copy(LICHT.nacht);
    ziel.staerke = 0.22 * THREE.MathUtils.smoothstep(zeit.mond.y, 0.0, 0.25);
    ziel.richtung.copy(zeit.mond);
  }
  return ziel;
}

export function uhrzeitText() {
  const h = Math.floor(zeit.stunde);
  const m = Math.floor((zeit.stunde - h) * 60);
  return `Tag ${zeit.tag}, ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} Uhr`;
}
