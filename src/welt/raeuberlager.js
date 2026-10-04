// Das Lager der Räuber an der Straße nach Osten: drei schäbige Zelte aus Leinen, Stämme zum Sitzen
// und ein Feuer in der Mitte. Wer dort wohnt, steht in src/inhalte/gegner.js.
import * as THREE from 'three';
import { hoeheBei } from './gelaende.js';
import { hindernis } from './kollision.js';
import { RAEUBERLAGER } from './orte.js';

const leinen = new THREE.MeshStandardMaterial({ color: 0x8a7b62, roughness: 0.95, side: THREE.DoubleSide });
const flicken = new THREE.MeshStandardMaterial({ color: 0x5f5444, roughness: 0.95, side: THREE.DoubleSide });

// Ein Giebelzelt: zwei schräge Bahnen und eine Rückwand, vorne offen
function zelt(breite, tiefe, hoehe, mat) {
  const b = breite / 2, t = tiefe / 2;
  const punkte = [
    // linke Bahn
    -b, 0, -t, 0, hoehe, -t, 0, hoehe, t, -b, 0, -t, 0, hoehe, t, -b, 0, t,
    // rechte Bahn
    b, 0, -t, b, 0, t, 0, hoehe, t, b, 0, -t, 0, hoehe, t, 0, hoehe, -t,
    // Rückwand
    -b, 0, -t, b, 0, -t, 0, hoehe, -t,
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(punkte, 3));
  geo.computeVertexNormals();
  const netz = new THREE.Mesh(geo, mat);
  netz.castShadow = true;
  netz.receiveShadow = true;
  const g = new THREE.Group();
  g.add(netz);
  // zwei Stangen vorne und hinten
  for (const z of [-t, t]) {
    const stange = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, hoehe + 0.15, 6), new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.9 }));
    stange.position.set(0, (hoehe + 0.15) / 2, z);
    stange.castShadow = true;
    g.add(stange);
  }
  return g;
}

export function erzeugeRaeuberlager({ rindenMaterial } = {}) {
  const gruppe = new THREE.Group();
  gruppe.name = 'raeuberlager';
  const { x: mx, z: mz } = RAEUBERLAGER;
  const stamm = rindenMaterial ? rindenMaterial.clone() : new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95 });

  // Zelte im Halbkreis hinter dem Feuer, Öffnung zur Mitte
  for (const [dx, dz, b, t, h, mat] of [[-6, -5, 2.2, 2.6, 1.5, leinen], [6.5, -4, 2.0, 2.4, 1.4, flicken], [1, -11, 2.8, 3.2, 1.9, leinen]]) {
    const z = zelt(b, t, h, mat);
    const x = mx + dx, zz = mz + dz;
    z.position.set(x, hoehe(x, zz) - 0.05, zz);
    z.rotation.y = Math.atan2(-dx, -dz); // die offene Seite (+Z) zeigt zum Feuer
    gruppe.add(z);
    hindernis(x, zz, Math.max(b, t) * 0.45);
  }
  // Stämme zum Sitzen rund ums Feuer
  for (const [dx, dz, dreh] of [[-2.4, 1.2, 0.4], [2.6, 1.0, -0.3], [0.2, 2.8, 1.5]]) {
    const geo = new THREE.CylinderGeometry(0.18, 0.2, 1.8, 10);
    geo.rotateZ(Math.PI / 2);
    const s = new THREE.Mesh(geo, stamm);
    const x = mx + dx, zz = mz + dz;
    s.position.set(x, hoehe(x, zz) + 0.15, zz);
    s.rotation.y = dreh;
    s.castShadow = true;
    s.receiveShadow = true;
    gruppe.add(s);
  }
  return { objekt: gruppe, feuerOrt: { x: mx, z: mz } };
}

const hoehe = (x, z) => hoeheBei(x, z);
