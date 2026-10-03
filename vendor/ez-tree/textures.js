// Ersatz für die Original-Datei: Schatzsuche legt Rinde und Blätter selbst an
// (eigene Materialien mit Wind, Licht durch die Blätter usw., siehe src/welt/baeume.js).
// EZ-Tree braucht hier nur Platzhalter, damit die Geometrie entstehen kann.
import * as THREE from 'three';

const platzhalter = new THREE.Texture();

export function getBarkTexture() {
  const t = platzhalter.clone();
  t.repeat = new THREE.Vector2(1, 1);
  return t;
}

export function getLeafTexture() {
  return platzhalter;
}
