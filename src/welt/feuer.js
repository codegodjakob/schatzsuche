// Lagerfeuer: Steinkreis, Holzscheite, Flammen, Glut, Rauch und flackerndes Licht.
// Wird beim Einsiedler benutzt und später, wenn der Spieler selbst Feuer macht.
import * as THREE from 'three';
import { hoeheBei } from './gelaende.js';
import { zufall } from './zufall.js';

function flammenTextur() {
  const g = 128, c = document.createElement('canvas');
  c.width = c.height = g;
  const k = c.getContext('2d');
  const v = k.createRadialGradient(g / 2, g * 0.62, 2, g / 2, g * 0.62, g * 0.5);
  v.addColorStop(0, 'rgba(255,255,230,1)');
  v.addColorStop(0.25, 'rgba(255,200,90,0.9)');
  v.addColorStop(0.55, 'rgba(255,110,20,0.45)');
  v.addColorStop(1, 'rgba(120,20,0,0)');
  k.fillStyle = v;
  k.fillRect(0, 0, g, g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function rauchTextur() {
  const g = 128, c = document.createElement('canvas');
  c.width = c.height = g;
  const k = c.getContext('2d');
  const v = k.createRadialGradient(g / 2, g / 2, 4, g / 2, g / 2, g / 2);
  v.addColorStop(0, 'rgba(200,200,200,0.55)');
  v.addColorStop(1, 'rgba(200,200,200,0)');
  k.fillStyle = v;
  k.fillRect(0, 0, g, g);
  return new THREE.CanvasTexture(c);
}

let geteilteTexturen = null;

export function erzeugeFeuer(x, z, { felsMaterial = null, rindenMaterial = null } = {}) {
  geteilteTexturen ??= { flamme: flammenTextur(), rauch: rauchTextur() };
  const y = hoeheBei(x, z);
  const gruppe = new THREE.Group();
  gruppe.position.set(x, y, z);
  gruppe.name = 'feuer';
  const zz = zufall(Math.round(x * 31 + z * 17));

  // Steinkreis
  const stein = new THREE.DodecahedronGeometry(0.13, 1);
  const steinMat = felsMaterial ?? new THREE.MeshStandardMaterial({ color: 0x77736a, roughness: 0.95 });
  const steine = new THREE.InstancedMesh(stein, steinMat, 12);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < 12; i++) {
    const w = (i / 12) * Math.PI * 2;
    p.set(Math.cos(w) * 0.55, 0.03, Math.sin(w) * 0.55);
    q.setFromEuler(new THREE.Euler(zz() * 3, zz() * 3, zz() * 3));
    s.set(1 + zz() * 0.5, 0.7 + zz() * 0.4, 1 + zz() * 0.4);
    m.compose(p, q, s);
    steine.setMatrixAt(i, m);
  }
  steine.castShadow = true; steine.receiveShadow = true;
  gruppe.add(steine);

  // Holzscheite (kreuzweise), innen verkohlt
  const holzMat = rindenMaterial ?? new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.9 });
  const glutMat = new THREE.MeshStandardMaterial({ color: 0x1a0e08, emissive: 0xff5a1a, emissiveIntensity: 1.5, roughness: 0.9 });
  // Scheite wie ein Zelt: unten außen, oben in der Mitte
  const oben = new THREE.Vector3(0, 0.42, 0), unten = new THREE.Vector3(), richtung = new THREE.Vector3();
  for (let i = 0; i < 5; i++) {
    const w = (i / 5) * Math.PI * 2 + zz();
    unten.set(Math.cos(w) * 0.34, 0.0, Math.sin(w) * 0.34);
    richtung.subVectors(oben, unten);
    const laenge = richtung.length();
    const scheit = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, laenge, 8), i % 2 ? holzMat : glutMat);
    scheit.position.copy(unten).addScaledVector(richtung, 0.5);
    scheit.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), richtung.normalize());
    scheit.castShadow = true;
    gruppe.add(scheit);
  }
  const glut = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), new THREE.MeshBasicMaterial({ color: 0xff6a20, transparent: true, opacity: 0.85 }));
  glut.rotation.x = -Math.PI / 2;
  glut.position.y = 0.02;
  gruppe.add(glut);

  // Flammen: Partikel, die aufsteigen, schrumpfen und verblassen
  const anzahl = 46;
  const flammen = [];
  const flammenMat = new THREE.SpriteMaterial({ map: geteilteTexturen.flamme, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  for (let i = 0; i < anzahl; i++) {
    const sp = new THREE.Sprite(flammenMat.clone());
    sp.userData = { alter: zz(), tempo: 0.8 + zz() * 0.6, x: (zz() - 0.5) * 0.3, z: (zz() - 0.5) * 0.3 };
    gruppe.add(sp);
    flammen.push(sp);
  }
  // Rauch
  const rauch = [];
  const rauchMat = new THREE.SpriteMaterial({ map: geteilteTexturen.rauch, depthWrite: false, transparent: true, color: 0x8a8a8a });
  for (let i = 0; i < 18; i++) {
    const sp = new THREE.Sprite(rauchMat.clone());
    sp.userData = { alter: zz(), tempo: 0.25 + zz() * 0.2 };
    gruppe.add(sp);
    rauch.push(sp);
  }

  // Licht
  const licht = new THREE.PointLight(0xff8a3a, 6, 14, 1.6);
  licht.position.set(0, 0.6, 0);
  gruppe.add(licht);

  let t = 0;
  function aktualisiere(dt, windRichtung, hell = 1) {
    t += dt;
    for (const f of flammen) {
      const d = f.userData;
      d.alter += dt * d.tempo * 1.6;
      if (d.alter > 1) { d.alter -= 1; d.x = (zz() - 0.5) * 0.3; d.z = (zz() - 0.5) * 0.3; }
      const a = d.alter;
      f.position.set(d.x * (1 - a) + windRichtung.x * a * 0.15, 0.08 + a * 0.75, d.z * (1 - a) + windRichtung.y * a * 0.15);
      const g = (1 - a) * 0.55 + 0.1;
      f.scale.set(g * 0.8, g * 1.2, 1);
      f.material.opacity = Math.sin(a * Math.PI) * 0.85;
      f.material.rotation = a * 2 + d.x * 10;
    }
    for (const r of rauch) {
      const d = r.userData;
      d.alter += dt * d.tempo * 0.35;
      if (d.alter > 1) d.alter -= 1;
      const a = d.alter;
      r.position.set(windRichtung.x * a * 2.2, 1 + a * 4.5, windRichtung.y * a * 2.2);
      r.scale.setScalar(0.5 + a * 2.6);
      r.material.opacity = Math.sin(a * Math.PI) * 0.35;
      r.material.color.setScalar(0.12 + 0.45 * hell + (1 - a) * 0.15); // nachts dunkler Rauch, unten vom Feuer angeleuchtet
    }
    licht.intensity = 5 + Math.sin(t * 13) * 0.7 + Math.sin(t * 7.3) * 0.9 + Math.sin(t * 23) * 0.4;
    glut.material.opacity = 0.75 + Math.sin(t * 3) * 0.1;
  }

  return { objekt: gruppe, aktualisiere, ort: new THREE.Vector3(x, y, z) };
}
