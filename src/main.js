// Einstiegspunkt: baut die Welt, wartet auf die Figurenwahl und startet das Spiel.
import * as THREE from 'three';
import { erzeugeGelaende, erzeugeTeich, hoeheBei } from './welt/gelaende.js';
import { erzeugeHimmel } from './welt/himmel.js';
import { erzeugeGras } from './welt/gras.js';
import { erzeugeNatur } from './welt/natur.js';
import { erzeugeFigur } from './spieler/figur.js';
import { erzeugeSteuerung } from './spieler/steuerung.js';
import { erzeugeEreignisse } from './ereignisse/ereignisse.js';
import { erzeugeOberflaeche } from './ui/oberflaeche.js';

const flaeche = document.getElementById('welt');
const renderer = new THREE.WebGLRenderer({ canvas: flaeche, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.55;

const szene = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(62, 1, 0.08, 3000);
const zeit = { value: 0 };

const himmel = erzeugeHimmel(szene, renderer);
szene.add(erzeugeGelaende(), erzeugeTeich(), erzeugeGras(zeit), erzeugeNatur());

function groesse() {
  const b = flaeche.clientWidth, h = flaeche.clientHeight;
  renderer.setSize(b, h, false);
  kamera.aspect = b / h;
  kamera.updateProjectionMatrix();
}
addEventListener('resize', groesse);
groesse();

const oberflaeche = erzeugeOberflaeche();
let steuerung = null, ereignisse = null;

// Für automatische Prüfungen und zum Ausprobieren in der Browser-Konsole
window.spiel = { szene, kamera, get steuerung() { return steuerung; }, get ereignisse() { return ereignisse; }, bereit: false };

oberflaeche.warteAufStart().then((art) => {
  const figur = erzeugeFigur(art);
  szene.add(figur.objekt);
  steuerung = erzeugeSteuerung({ kamera, figur, flaeche });
  ereignisse = erzeugeEreignisse({ steuerung, oberflaeche });
  steuerung.zustand.aktiv = true;
});

const uhr = new THREE.Clock();
const mitte = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const dt = Math.min(uhr.getDelta(), 0.05);
  zeit.value += dt;
  if (steuerung) {
    steuerung.schritt(dt);
    ereignisse.schritt(dt);
    himmel.folge(steuerung.zustand.ort);
  } else {
    // Vor dem Start: langsamer Kameraflug über die Wiese
    const w = zeit.value * 0.05 + 2.4;
    kamera.position.set(Math.sin(w) * 14, hoeheBei(Math.sin(w) * 14, Math.cos(w) * 14) + 2.2, Math.cos(w) * 14);
    mitte.set(0, hoeheBei(0, 0) + 0.8, 0);
    kamera.lookAt(mitte);
    himmel.folge(mitte);
  }
  renderer.render(szene, kamera);
  window.spiel.bereit = true;
});
