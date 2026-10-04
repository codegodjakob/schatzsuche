// Das Lager des Reitervolks in der Steppe: runde Jurten aus hellem Filz mit roten Gurten, bemalten Türen und
// einem Rauchring oben, Pferdeschweif-Standarten, Kibitka-Wagen mit Filzhütte, eine Pferdeleine, ein Gestell mit
// trocknenden Häuten und eine Zielscheibe, an der Bleda die Fremden schießen lässt.
// Filz- und Ledertexturen: Poly Haven (CC0). Formen: selbst gebaut.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kaminRauch, quader, rechteckHindernis } from './dorf.js';
import { hoeheBei } from './gelaende.js';
import { hindernis } from './kollision.js';
import { JURTEN, PFERDELEINE, PFLOCK, ZIELSCHEIBE } from './orte.js';

const BAUTEN = new URL('../../assets/bauten/', import.meta.url).href;
const lader = new THREE.TextureLoader();

function pbr(name, extra = {}) {
  const lade = (teil, farbe) => {
    const t = lader.load(`${BAUTEN}${name}_${teil}_1k.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (farbe) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return new THREE.MeshStandardMaterial({ map: lade('diff', true), normalMap: lade('nor_gl'), roughnessMap: lade('rough'), roughness: 1, ...extra });
}

function leinwand(b, h, malen) {
  const c = document.createElement('canvas');
  c.width = b; c.height = h;
  malen(c.getContext('2d'), b, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Bemalte Jurtentür: Orange und Rot mit einem Rahmen aus Knotenmustern
const tuerBild = () => leinwand(128, 192, (k, b, h) => {
  k.fillStyle = '#b8461e'; k.fillRect(0, 0, b, h);
  k.fillStyle = '#e08a2a'; k.fillRect(10, 10, b - 20, h - 20);
  k.strokeStyle = '#2c4a7a'; k.lineWidth = 4;
  k.strokeRect(18, 18, b - 36, h - 36);
  k.strokeStyle = '#f4e0b0'; k.lineWidth = 3;
  for (let y = 40; y < h - 30; y += 46) {
    k.beginPath();
    k.moveTo(b / 2, y); k.lineTo(b / 2 + 18, y + 14); k.lineTo(b / 2, y + 28); k.lineTo(b / 2 - 18, y + 14); k.closePath();
    k.stroke();
  }
});

// Zielscheibe: Strohgelb mit Ringen
const scheibeBild = () => leinwand(128, 128, (k, b) => {
  const m = b / 2;
  for (const [r, f] of [[62, '#d8c278'], [48, '#f0ead8'], [36, '#2a5aa0'], [24, '#c8301c'], [11, '#f2c230']]) {
    k.fillStyle = f; k.beginPath(); k.arc(m, m, r, 0, Math.PI * 2); k.fill();
  }
});

// Texturkoordinaten für Zylinder und Kegel: u rundherum, v nach oben (in Metern)
function rundUV(g, kachel) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    uv[i * 2] = (Math.atan2(z, x) * Math.max(r, 1)) / kachel;
    uv[i * 2 + 1] = (y - r * 0.4) / kachel;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// Eine Jurte mit Radius r, Tür nach +z. Gibt den Ort für den Rauch zurück.
function jurte(t, r) {
  const wand = 1.7, dach = r * 0.42;
  t.filz.push(rundUV(new THREE.CylinderGeometry(r, r * 1.01, wand, 32, 1, true).translate(0, wand / 2, 0), 1.6));
  t.filz.push(rundUV(new THREE.CylinderGeometry(0.66, r * 1.07, dach, 32, 1, true).translate(0, wand - 0.06 + dach / 2, 0), 1.6));
  // Gurten um die Wand und am Dachrand
  for (const y of [0.42, 1.0, 1.55]) t.band.push(new THREE.TorusGeometry(r * 1.012 + 0.015, 0.03, 4, 40).rotateX(Math.PI / 2).translate(0, y, 0));
  t.band.push(new THREE.TorusGeometry(r * 1.05, 0.04, 4, 40).rotateX(Math.PI / 2).translate(0, wand - 0.02, 0));
  // Seile über das Dach
  for (let i = 0; i < 8; i++) {
    const w = (i / 8) * Math.PI * 2 + 0.2;
    const lang = Math.hypot(r * 1.07 - 0.66, dach);
    const seil = new THREE.CylinderGeometry(0.02, 0.02, lang, 4).rotateZ(Math.atan2(r * 1.07 - 0.66, dach));
    seil.translate((r * 1.07 + 0.66) / 2, wand - 0.04 + dach / 2, 0).rotateY(w);
    t.band.push(seil);
  }
  // Rauchring (Toono) oben
  t.holz.push(new THREE.TorusGeometry(0.62, 0.07, 6, 20).rotateX(Math.PI / 2).translate(0, wand + dach - 0.02, 0));
  for (let i = 0; i < 4; i++) t.holz.push(quader(1.2, 0.05, 0.05, 0, wand + dach - 0.02, 0, new THREE.Euler(0, (i * Math.PI) / 4, 0)));
  // Bemalte Tür mit Rahmen und Schwelle
  t.tuer.push(new THREE.PlaneGeometry(0.95, 1.42).translate(0, 0.78, r + 0.04));
  t.holz.push(quader(0.12, 1.6, 0.12, -0.54, 0.8, r + 0.02), quader(0.12, 1.6, 0.12, 0.54, 0.8, r + 0.02), quader(1.2, 0.12, 0.14, 0, 1.6, r + 0.02), quader(1.2, 0.1, 0.18, 0, 0.05, r + 0.03));
  return new THREE.Vector3(0, wand + dach, 0);
}

// Standarte mit Pferdeschweif (Tug): Stange, Speerspitze, schwarzer Schweif darunter
function standarte(t) {
  t.holz.push(new THREE.CylinderGeometry(0.05, 0.07, 4.6, 6).translate(0, 2.3, 0));
  t.eisen.push(new THREE.ConeGeometry(0.07, 0.45, 6).translate(0, 4.82, 0), new THREE.CylinderGeometry(0.22, 0.22, 0.04, 12).translate(0, 4.4, 0));
  for (let i = 0; i < 9; i++) {
    const w = (i / 9) * Math.PI * 2;
    t.haar.push(new THREE.ConeGeometry(0.07, 1.1, 4).rotateX(Math.PI).rotateZ(Math.cos(w) * 0.25).rotateX(Math.sin(w) * 0.25).translate(Math.cos(w) * 0.12, 3.85, Math.sin(w) * 0.12));
  }
}

// Kibitka: zweirädriger Wagen mit einer kleinen Filzhütte darauf (Länge entlang x)
function kibitka(t) {
  for (const s of [-1, 1]) {
    t.holz.push(new THREE.TorusGeometry(0.75, 0.07, 6, 20).translate(0, 0.78, s * 1.05));
    for (let i = 0; i < 6; i++) t.holz.push(quader(0.05, 1.45, 0.05, 0, 0.78, s * 1.05, new THREE.Euler(0, 0, (i * Math.PI) / 6)));
  }
  t.holz.push(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 6).rotateX(Math.PI / 2).translate(0, 0.78, 0));
  t.holz.push(quader(3.2, 0.12, 2.0, 0, 1.15, 0));
  t.holz.push(quader(2.6, 0.08, 0.08, 2.9, 0.9, -0.35, new THREE.Euler(0, 0, -0.12)), quader(2.6, 0.08, 0.08, 2.9, 0.9, 0.35, new THREE.Euler(0, 0, -0.12)));
  // die Hütte: Wände aus Filz, ein gewölbtes Dach
  t.filz.push(rundUV(new THREE.BoxGeometry(2.6, 1.2, 1.8).translate(0, 1.8, 0), 1.6));
  t.filz.push(rundUV(new THREE.CylinderGeometry(0.95, 0.95, 2.6, 14, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.55, 1).translate(0, 2.4, 0), 1.6));
  t.tuer.push(new THREE.PlaneGeometry(0.6, 0.9).rotateY(-Math.PI / 2).translate(-1.31, 1.75, 0));
}

// Gestell mit trocknenden Häuten und Fleischstreifen
function trockengestell(t) {
  for (const x of [-1.6, 1.6]) t.holz.push(new THREE.CylinderGeometry(0.05, 0.06, 2.1, 5).translate(x, 1.05, 0));
  t.holz.push(new THREE.CylinderGeometry(0.04, 0.04, 3.4, 5).rotateZ(Math.PI / 2).translate(0, 2.0, 0));
  for (const [x, b, h] of [[-0.9, 0.9, 1.2], [0.2, 1.0, 1.35], [1.1, 0.7, 1.0]]) t.leder.push(new THREE.PlaneGeometry(b, h, 2, 2).translate(x, 2.0 - h / 2, 0));
  for (let i = 0; i < 5; i++) t.fleisch.push(quader(0.08, 0.5, 0.02, -1.4 + i * 0.12, 1.72, 0.08));
}

function aufGelaende(liste, x, z, drehung, bau) {
  const lokal = Object.fromEntries(Object.keys(liste).map((k) => [k, []]));
  const rueck = bau(lokal);
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, hoeheBei(x, z), z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), drehung), new THREE.Vector3(1, 1, 1));
  for (const [k, l] of Object.entries(lokal)) for (const g of l) liste[k].push(g.applyMatrix4(m));
  return rueck?.isVector3 ? rueck.applyMatrix4(m) : null;
}

export function erzeugeJurtenlager() {
  const teile = { filz: [], band: [], holz: [], tuer: [], eisen: [], haar: [], leder: [], fleisch: [], scheibe: [], stroh: [] };
  const rauchOrte = [];
  for (const j of JURTEN) {
    rauchOrte.push(aufGelaende(teile, j.x, j.z, 0, (t) => jurte(t, j.r)));
    hindernis(j.x, j.z, j.r + 0.15);
  }
  // Standarten vor der Jurte des Khans und am Eingang des Lagers
  for (const [x, z] of [[358.4, 0.6], [365.6, 0.6], [346, 9], [378, 9]]) {
    aufGelaende(teile, x, z, 0, standarte);
    hindernis(x, z, 0.25);
  }
  // Zwei Kibitka-Wagen
  for (const [x, z, w] of [[330, 2, 0.4], [393, -3, 2.6]]) {
    aufGelaende(teile, x, z, w, kibitka);
    rechteckHindernis(x, z, 3.4, 2.4, w);
  }
  // Pferdeleine: zwei Pfosten, ein Seil dazwischen
  const pl = PFERDELEINE;
  aufGelaende(teile, pl.x, pl.z, 0, (t) => {
    for (const s of [-1, 1]) t.holz.push(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 6).translate(s * pl.laenge / 2, 0.8, 0));
    t.band.push(new THREE.CylinderGeometry(0.02, 0.02, pl.laenge, 4).rotateZ(Math.PI / 2).translate(0, 1.35, 0));
  });
  hindernis(pl.x - pl.laenge / 2, pl.z, 0.3); hindernis(pl.x + pl.laenge / 2, pl.z, 0.3);
  // Trockengestell hinter den Jurten
  aufGelaende(teile, 372, -14, 0.3, trockengestell);
  rechteckHindernis(372, -14, 3.4, 0.8, 0.3);
  // Zielscheibe auf einem Gestell (zeigt nach Westen, zum Pflock) und der Pflock, von dem aus man schießt
  const zs = ZIELSCHEIBE;
  aufGelaende(teile, zs.x, zs.z, -Math.PI / 2, (t) => {
    t.scheibe.push(new THREE.CircleGeometry(0.75, 32).translate(0, zs.mitte, 0.14));
    t.stroh.push(new THREE.CylinderGeometry(0.76, 0.76, 0.26, 32, 1, true).rotateX(Math.PI / 2).translate(0, zs.mitte, 0));
    for (const s of [-1, 1]) t.holz.push(quader(0.08, 1.9, 0.08, s * 0.6, 0.85, -0.25, new THREE.Euler(0.25, 0, 0)));
  });
  hindernis(zs.x, zs.z, 0.7);
  aufGelaende(teile, PFLOCK.x, PFLOCK.z, 0, (t) => {
    t.holz.push(new THREE.CylinderGeometry(0.05, 0.06, 0.8, 5).translate(0, 0.4, 0));
    t.band.push(quader(0.04, 0.3, 0.16, 0.06, 0.62, 0));
  });

  const materialien = {
    filz: pbr('leather_white', { color: 0xfff1d6, side: THREE.DoubleSide }),
    leder: pbr('brown_leather', { side: THREE.DoubleSide }),
    band: new THREE.MeshStandardMaterial({ color: 0x8a2a18, roughness: 0.9 }),
    holz: new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: 0.85 }),
    tuer: new THREE.MeshStandardMaterial({ map: tuerBild(), roughness: 0.7, side: THREE.DoubleSide }),
    eisen: new THREE.MeshStandardMaterial({ color: 0x8a8c90, roughness: 0.35, metalness: 0.85 }),
    haar: new THREE.MeshStandardMaterial({ color: 0x15100c, roughness: 0.8 }),
    fleisch: new THREE.MeshStandardMaterial({ color: 0x5a1e14, roughness: 0.7 }),
    scheibe: new THREE.MeshStandardMaterial({ map: scheibeBild(), roughness: 0.95 }),
    stroh: new THREE.MeshStandardMaterial({ color: 0xc8b06a, roughness: 1 }),
  };
  const gruppe = new THREE.Group();
  gruppe.name = 'jurtenlager';
  for (const [k, liste] of Object.entries(teile)) {
    if (!liste.length) continue;
    const gleich = liste.map((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
      if (!n.attributes.normal) n.computeVertexNormals();
      for (const name of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(name)) n.deleteAttribute(name);
      return n;
    });
    const netz = new THREE.Mesh(mergeGeometries(gleich), materialien[k]);
    netz.castShadow = true;
    netz.receiveShadow = true;
    gruppe.add(netz);
  }
  const rauch = rauchOrte.slice(0, 3).filter(Boolean).map((ort, i) => kaminRauch(ort, i * 0.29));
  for (const r of rauch) gruppe.add(r.objekt);

  // Trifft ein Pfeil die Scheibe? von, richtung (Länge 1), bis (Meter) -> { abstand, ring } oder null
  // ring: 0 = genau in der Mitte, 1 = am Rand
  const mitte = new THREE.Vector3(zs.x - 0.14, hoeheBei(zs.x, zs.z) + zs.mitte, zs.z);
  function trifftScheibe(von, richtung, bis) {
    if (richtung.x <= 0.01) return null; // die Scheibe zeigt nach Westen, man muss nach Osten schießen
    const s = (mitte.x - von.x) / richtung.x;
    if (s < 0 || s > bis) return null;
    const y = von.y + richtung.y * s, z = von.z + richtung.z * s;
    const d = Math.hypot(y - mitte.y, z - mitte.z);
    return d <= 0.75 ? { abstand: s, ring: d / 0.75 } : null;
  }

  function aktualisiere(dt, wind, hell) {
    for (const r of rauch) r.aktualisiere(dt, wind, hell);
  }
  return { objekt: gruppe, aktualisiere, trifftScheibe, scheibenMitte: mitte };
}
