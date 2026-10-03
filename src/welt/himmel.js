// Himmel, Sonne und Licht. Ein klarer Vormittag.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export const SONNE = { hoehe: 28, richtung: 135 }; // Grad über Horizont, Grad Himmelsrichtung

export function erzeugeHimmel(szene, renderer) {
  const himmel = new Sky();
  himmel.scale.setScalar(4000);
  const u = himmel.material.uniforms;
  u.turbidity.value = 4;
  u.rayleigh.value = 1.4;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.85;

  const sonnenRichtung = new THREE.Vector3().setFromSphericalCoords(
    1, THREE.MathUtils.degToRad(90 - SONNE.hoehe), THREE.MathUtils.degToRad(SONNE.richtung),
  );
  u.sunPosition.value.copy(sonnenRichtung);
  szene.add(himmel);

  // Umgebungslicht aus dem Himmel selbst, damit alles im selben Licht steht
  const pmrem = new THREE.PMREMGenerator(renderer);
  const himmelSzene = new THREE.Scene();
  himmelSzene.add(himmel.clone());
  szene.environment = pmrem.fromScene(himmelSzene, 0, 1, 5000).texture;
  szene.environmentIntensity = 0.45;
  pmrem.dispose();

  const sonne = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sonne.castShadow = true;
  sonne.shadow.mapSize.set(2048, 2048);
  const s = sonne.shadow.camera;
  s.left = -45; s.right = 45; s.top = 45; s.bottom = -45; s.near = 1; s.far = 400;
  sonne.shadow.bias = -0.0004;
  sonne.shadow.normalBias = 0.03;
  szene.add(sonne, sonne.target);

  const himmelsLicht = new THREE.HemisphereLight(0xbcd6ef, 0x4a5a2a, 0.5);
  szene.add(himmelsLicht);

  szene.fog = new THREE.Fog(0xb9cbd6, 80, 520);

  // Der Schattenausschnitt wandert mit dem Spieler mit
  function folge(ziel) {
    sonne.position.copy(ziel).addScaledVector(sonnenRichtung, 150);
    sonne.target.position.copy(ziel);
  }
  return { folge };
}
