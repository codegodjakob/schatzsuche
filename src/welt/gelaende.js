// Das Gelände: eine Wiese in der Mitte, Hügel nach außen, ein kleiner Teich.
// hoeheBei(x, z) ist die eine Wahrheit über die Bodenhöhe – alles, was auf dem
// Boden steht (Gras, Bäume, Spieler), fragt hier nach.
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

export const WELT_GROESSE = 900; // Meter Kantenlänge
export const TEICH = { x: 34, z: -28, radius: 11, tiefe: 1.6 };

const rauschen = new ImprovedNoise();
const SAAT = 7.31;

function fbm(x, z, oktaven) {
  let summe = 0, amp = 1, freq = 1, norm = 0;
  for (let i = 0; i < oktaven; i++) {
    summe += amp * rauschen.noise(x * freq, z * freq, SAAT + i * 11.7);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return summe / norm;
}

function weich(a, b, t) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

export function hoeheBei(x, z) {
  const d = Math.hypot(x, z);
  // Sanfte Bodenwellen überall, damit die Wiese nicht wie ein Tisch wirkt
  let h = fbm(x * 0.012, z * 0.012, 4) * 2.2;
  // Hügel und Berge erst außerhalb der Startwiese
  h += Math.max(0, fbm(x * 0.0045 + 3, z * 0.0045, 5) + 0.15) * 70 * weich(70, 320, d);
  // Teich: eine weiche Mulde
  const dt = Math.hypot(x - TEICH.x, z - TEICH.z);
  h -= TEICH.tiefe * 1.6 * (1 - weich(TEICH.radius * 0.4, TEICH.radius * 1.5, dt));
  return h;
}

export function wasserspiegel() {
  return hoeheBei(TEICH.x + TEICH.radius * 1.15, TEICH.z) - 0.05;
}

export function erzeugeGelaende() {
  const teile = 300;
  const geo = new THREE.PlaneGeometry(WELT_GROESSE, WELT_GROESSE, teile, teile);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const farben = new Float32Array(pos.count * 3);
  const gras = new THREE.Color(0x4f7a2c);
  const grasHell = new THREE.Color(0x7d9a3e);
  const erde = new THREE.Color(0x6b5236);
  const fels = new THREE.Color(0x7a776f);
  const ufer = new THREE.Color(0x5d5038);
  const c = new THREE.Color();
  const wsp = wasserspiegel();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = hoeheBei(x, z);
    pos.setY(i, h);
    // Steilheit aus Nachbarhöhen
    const e = 1.5;
    const steil = Math.hypot(hoeheBei(x + e, z) - hoeheBei(x - e, z), hoeheBei(x, z + e) - hoeheBei(x, z - e)) / (2 * e);
    const flecken = fbm(x * 0.05, z * 0.05, 3) * 0.5 + 0.5;
    c.copy(gras).lerp(grasHell, flecken * 0.8);
    c.lerp(erde, weich(0.35, 0.7, steil));
    c.lerp(fels, weich(0.7, 1.1, steil) + weich(45, 70, h) * 0.6);
    c.lerp(ufer, 1 - weich(wsp - 0.1, wsp + 0.5, h));
    farben.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(farben, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'gelaende';
  return mesh;
}

export function erzeugeTeich() {
  const geo = new THREE.CircleGeometry(TEICH.radius * 1.6, 64);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2e4d55, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.82,
  });
  const wasser = new THREE.Mesh(geo, mat);
  wasser.position.set(TEICH.x, wasserspiegel(), TEICH.z);
  wasser.name = 'teich';
  return wasser;
}
