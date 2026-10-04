// Das Dorf Erlenbach: Fachwerkhäuser mit Strohdach, ein Brunnen auf dem Dorfplatz, Martas Marktstand
// und Josts Steg am Weiher. Alles aus einfachen Formen; je Material wird es zu einem Netz
// zusammengefasst, damit das ganze Dorf nur wenige Zeichenaufrufe kostet.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hoeheBei, wasserspiegel } from './gelaende.js';
import { rauchBild } from './feuer.js';
import { hindernis, laufflaeche } from './kollision.js';
import { BRUNNEN, DORF, HAEUSER, MARKTSTAND, STEG, WEIHER } from './orte.js';

// ---------------------------------------------------------------- Texturen (gemalt im Browser)

function leinwand(groesse, malen) {
  const c = document.createElement('canvas');
  c.width = c.height = groesse;
  malen(c.getContext('2d'), groesse);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const putzTextur = () => leinwand(256, (k, g) => {
  k.fillStyle = '#d9cfb8';
  k.fillRect(0, 0, g, g);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * g, y = Math.random() * g, r = 2 + Math.random() * 14;
    k.fillStyle = `rgba(${120 + Math.random() * 60}, ${105 + Math.random() * 50}, ${80 + Math.random() * 40}, ${0.04 + Math.random() * 0.06})`;
    k.beginPath(); k.arc(x, y, r, 0, Math.PI * 2); k.fill();
  }
  // unten Spritzer vom Regen
  const verlauf = k.createLinearGradient(0, g, 0, g * 0.75);
  verlauf.addColorStop(0, 'rgba(70, 55, 40, 0.45)');
  verlauf.addColorStop(1, 'rgba(70, 55, 40, 0)');
  k.fillStyle = verlauf;
  k.fillRect(0, g * 0.75, g, g * 0.25);
});

const strohTextur = () => leinwand(256, (k, g) => {
  k.fillStyle = '#8f7445';
  k.fillRect(0, 0, g, g);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * g, y = Math.random() * g, l = 10 + Math.random() * 26;
    const hell = 110 + Math.random() * 80;
    k.strokeStyle = `rgba(${hell + 30}, ${hell}, ${hell * 0.55}, ${0.35 + Math.random() * 0.4})`;
    k.lineWidth = 1 + Math.random() * 1.5;
    k.beginPath(); k.moveTo(x, y); k.lineTo(x + (Math.random() - 0.5) * 4, y + l); k.stroke();
  }
});

const streifenTextur = () => leinwand(128, (k, g) => {
  for (let i = 0; i < 8; i++) {
    k.fillStyle = i % 2 ? '#e9e1cf' : '#9e3a2c';
    k.fillRect((i * g) / 8, 0, g / 8, g);
  }
});

// ---------------------------------------------------------------- Bausteine

// Ein Quader von a nach b (Ecken), optional gedreht, als Geometrie in Weltlage
function quader(sx, sy, sz, x, y, z, dreh = null) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  if (dreh) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(dreh));
  g.translate(x, y, z);
  return g;
}

// Ein Balken zwischen zwei Punkten (in der Wandebene), quadratischer Querschnitt
function balken(a, b, dicke = 0.14) {
  const d = new THREE.Vector3().subVectors(b, a);
  const l = d.length();
  const g = new THREE.BoxGeometry(dicke, l, dicke);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  g.applyQuaternion(q);
  const m = a.clone().add(b).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g;
}

// Ein Haus in eigener Lage (Tür nach +Z, Mitte im Ursprung); legt seine Teile in die Sammeltöpfe.
// Gibt die Oberkante des Schornsteins zurück (oder null), damit dort Rauch aufsteigen kann.
function haus({ breite, tiefe, schornstein, scheune }, toepfe) {
  const wand = scheune ? 3.4 : 2.7;
  const neigung = scheune ? 0.65 : 0.78;
  const b = breite / 2, t = tiefe / 2;
  const giebel = b * Math.tan(neigung);
  // Wände
  toepfe.putz.push(quader(breite, wand, tiefe, 0, wand / 2, 0));
  // Giebeldreiecke vorne und hinten
  for (const z of [t, -t]) {
    const g = new THREE.BufferGeometry();
    const vorne = z > 0;
    const p = vorne ? [-b, wand, z, b, wand, z, 0, wand + giebel, z] : [b, wand, z, -b, wand, z, 0, wand + giebel, z];
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
    g.computeVertexNormals();
    toepfe.putz.push(g);
  }
  // Dach: zwei Strohflächen mit Überstand
  const ueber = 0.45, laenge = tiefe + 1.0;
  const schraeg = (b + ueber) / Math.cos(neigung);
  for (const seite of [-1, 1]) {
    const g = new THREE.BoxGeometry(schraeg, 0.22, laenge);
    g.applyMatrix4(new THREE.Matrix4().makeRotationZ(-seite * neigung));
    const mx = seite * (b + ueber) / 2;
    const my = wand + giebel - ((b + ueber) / 2) * Math.tan(neigung) + 0.1;
    g.translate(mx, my, 0);
    toepfe.stroh.push(g);
  }
  // Fachwerk: Schwelle, Rähm, Riegel, Pfosten, Streben – vorne, hinten und an den Seiten
  const aussen = 0.04;
  const holz = toepfe.balken;
  const ecken = [[-b, -t], [b, -t], [b, t], [-b, t]];
  for (let i = 0; i < 4; i++) {
    const [x1, z1] = ecken[i], [x2, z2] = ecken[(i + 1) % 4];
    const nx = Math.sign(x1 + x2) * (Math.abs(x1 + x2) > 0.01 ? 1 : 0), nz = Math.sign(z1 + z2) * (Math.abs(z1 + z2) > 0.01 ? 1 : 0);
    const off = (x, y, z) => new THREE.Vector3(x + nx * aussen, y, z + nz * aussen);
    for (const y of [0.12, wand * 0.5, wand - 0.08]) holz.push(balken(off(x1, y, z1), off(x2, y, z2)));
    const l = Math.hypot(x2 - x1, z2 - z1);
    const felder = Math.max(2, Math.round(l / 1.6));
    for (let k = 0; k <= felder; k++) {
      const f = k / felder;
      const x = x1 + (x2 - x1) * f, z = z1 + (z2 - z1) * f;
      holz.push(balken(off(x, 0, z), off(x, wand, z)));
      // Streben im ersten und letzten Feld
      if (k === 0 || k === felder - 1) {
        const f2 = (k + 1) / felder;
        const xb = x1 + (x2 - x1) * f2, zb = z1 + (z2 - z1) * f2;
        const unten = k === 0;
        holz.push(balken(off(x, unten ? 0.15 : wand * 0.5, z), off(xb, unten ? wand * 0.5 : 0.15, zb), 0.11));
      }
    }
  }
  // Tür vorne (bei der Scheune ein großes Tor)
  const tuerB = scheune ? 2.6 : 1.0, tuerH = scheune ? 2.6 : 1.95;
  toepfe.tuer.push(quader(tuerB, tuerH, 0.08, 0, tuerH / 2, t + 0.05));
  // Fenster mit Läden an den Seiten und vorne
  if (!scheune) {
    for (const [x, z, drehY] of [[-b * 0.55, t, 0], [b * 0.55, t, 0], [b, 0, Math.PI / 2], [-b, 0, Math.PI / 2], [0, -t, 0]]) {
      const e = new THREE.Euler(0, drehY, 0);
      const vorZ = drehY ? 0 : Math.sign(z) * 0.06, vorX = drehY ? Math.sign(x) * 0.06 : 0;
      toepfe.glas.push(quader(0.7, 0.62, 0.04, x + vorX, 1.55, z + vorZ, e));
      for (const s of [-1, 1]) {
        const lx = drehY ? 0 : s * 0.55, lz = drehY ? s * 0.55 : 0;
        toepfe.tuer.push(quader(0.36, 0.7, 0.04, x + vorX * 1.2 + lx, 1.55, z + vorZ * 1.2 + lz, e));
      }
    }
  }
  if (!schornstein) return null;
  toepfe.stein.push(quader(0.55, 1.6, 0.55, b * 0.45, wand + giebel * 0.6, -t * 0.3));
  return new THREE.Vector3(b * 0.45, wand + giebel * 0.6 + 0.8, -t * 0.3);
}

// Rauch aus einem Kamin: Schwaden steigen langsam auf, werden größer und verwehen mit dem Wind
function kaminRauch(ort, versatz) {
  const gruppe = new THREE.Group();
  gruppe.position.copy(ort);
  const mat = new THREE.SpriteMaterial({ map: rauchBild(), depthWrite: false, transparent: true, color: 0x9a9a9a });
  const schwaden = [];
  for (let i = 0; i < 10; i++) {
    const sp = new THREE.Sprite(mat.clone());
    sp.userData.alter = (i / 10 + versatz) % 1;
    gruppe.add(sp);
    schwaden.push(sp);
  }
  function aktualisiere(dt, wind, hell) {
    for (const sp of schwaden) {
      const d = sp.userData;
      d.alter = (d.alter + dt * 0.07) % 1;
      const a = d.alter;
      sp.position.set(wind.x * a * 3.5, a * 6, wind.y * a * 3.5);
      sp.scale.setScalar(0.35 + a * 2.6);
      sp.material.opacity = Math.sin(a * Math.PI) * 0.26;
      sp.material.color.setScalar(0.18 + 0.5 * hell);
    }
  }
  return { objekt: gruppe, aktualisiere };
}

function brunnen(toepfe) {
  const ring = new THREE.CylinderGeometry(0.95, 1.0, 0.85, 20, 1, true);
  ring.translate(0, 0.42, 0);
  toepfe.stein.push(ring);
  const rand = new THREE.TorusGeometry(0.97, 0.1, 6, 20);
  rand.rotateX(Math.PI / 2);
  rand.translate(0, 0.86, 0);
  toepfe.stein.push(rand);
  const wasser = new THREE.CircleGeometry(0.9, 20);
  wasser.rotateX(-Math.PI / 2);
  wasser.translate(0, 0.25, 0);
  toepfe.dunkel.push(wasser);
  for (const x of [-0.85, 0.85]) toepfe.balken.push(quader(0.14, 2.2, 0.14, x, 1.1, 0));
  toepfe.balken.push(quader(1.9, 0.12, 0.12, 0, 1.9, 0));
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(1.3, 0.08, 1.6);
    g.applyMatrix4(new THREE.Matrix4().makeRotationZ(-s * 0.6));
    g.translate(s * 0.5, 2.35, 0);
    toepfe.stroh.push(g);
  }
  const eimer = new THREE.CylinderGeometry(0.15, 0.12, 0.25, 10);
  eimer.translate(0.25, 1.35, 0);
  toepfe.balken.push(eimer);
}

function marktstand(toepfe) {
  toepfe.balken.push(quader(2.4, 0.08, 0.9, 0, 0.85, 0));
  for (const [x, z] of [[-1.15, -0.45], [1.15, -0.45], [-1.15, 0.45], [1.15, 0.45]]) toepfe.balken.push(quader(0.08, 0.85, 0.08, x, 0.42, z));
  for (const [x, z] of [[-1.25, -0.6], [1.25, -0.6], [-1.25, 0.6], [1.25, 0.6]]) toepfe.balken.push(quader(0.1, 2.3, 0.1, x, 1.15, z));
  const dach = new THREE.BoxGeometry(2.9, 0.04, 1.7);
  dach.applyMatrix4(new THREE.Matrix4().makeRotationX(0.18));
  dach.translate(0, 2.3, 0);
  toepfe.markise.push(dach);
  // Waren: Kisten, Säcke, Äpfel
  toepfe.balken.push(quader(0.5, 0.35, 0.4, -0.8, 1.06, 0), quader(0.45, 0.3, 0.38, 0.75, 1.04, -0.1));
  for (const [x, z] of [[-1.6, 0.3], [-1.75, -0.2]]) {
    const sack = new THREE.SphereGeometry(0.3, 8, 6);
    sack.scale(1, 1.3, 1);
    sack.translate(x, 0.38, z);
    toepfe.sack.push(sack);
  }
  for (let i = 0; i < 9; i++) {
    const apfel = new THREE.SphereGeometry(0.05, 6, 5);
    apfel.translate(-0.1 + (i % 3) * 0.12, 0.95, -0.12 + Math.floor(i / 3) * 0.12);
    toepfe.apfel.push(apfel);
  }
}

function steg(toepfe, y0) {
  // Bohlen über dem Wasser, getragen von Pfählen
  for (let i = 0; i < 11; i++) toepfe.balken.push(quader(1.5, 0.07, 0.5, 0, y0, 0.3 + i * 0.55));
  for (const z of [0.5, 3.0, 5.6]) for (const x of [-0.7, 0.7]) toepfe.balken.push(quader(0.14, 1.8, 0.14, x, y0 - 0.85, z));
}

// Setzt Teile an einen Ort (Drehung um die Senkrechte, Höhe aus dem Gelände); gibt die Lage zurück
function versetze(toepfe, bau, x, z, drehung, hoehe) {
  const lokal = {};
  for (const k of Object.keys(toepfe)) lokal[k] = [];
  bau(lokal);
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, hoehe, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), drehung), new THREE.Vector3(1, 1, 1));
  for (const [k, liste] of Object.entries(lokal)) for (const g of liste) toepfe[k].push(g.applyMatrix4(m));
  return m;
}

// Kreise als Hindernisse, die eine rechteckige Grundfläche abdecken
function rechteckHindernis(x, z, breite, tiefe, drehung) {
  const c = Math.cos(drehung), s = Math.sin(drehung);
  for (let i = -breite / 2 + 0.7; i <= breite / 2 - 0.7 + 0.01; i += 1.1) {
    for (let j = -tiefe / 2 + 0.7; j <= tiefe / 2 - 0.7 + 0.01; j += 1.1) {
      hindernis(x + i * c + j * s, z - i * s + j * c, 0.85);
    }
  }
}

export function erzeugeDorf() {
  const toepfe = { putz: [], stroh: [], balken: [], tuer: [], glas: [], stein: [], dunkel: [], markise: [], sack: [], apfel: [] };
  const kamine = [];
  for (const h of HAEUSER) {
    // Tür zum Dorfplatz
    const drehung = Math.atan2(DORF.x - h.x, DORF.z - h.z);
    // Häuser stehen eben: auf der tiefsten Stelle der Grundfläche, ein Sockel gleicht aus
    const boden = Math.min(...[[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]].map(([a, b]) => hoeheBei(h.x + a * h.breite / 2, h.z + b * h.tiefe / 2)));
    let kamin = null;
    const lage = versetze(toepfe, (t) => { kamin = haus(h, t); t.stein.push(quader(h.breite + 0.3, 0.6, h.tiefe + 0.3, 0, -0.25, 0)); }, h.x, h.z, drehung, boden);
    if (kamin) kamine.push(kamin.applyMatrix4(lage));
    rechteckHindernis(h.x, h.z, h.breite, h.tiefe, drehung);
  }
  versetze(toepfe, brunnen, BRUNNEN.x, BRUNNEN.z, 0.3, hoeheBei(BRUNNEN.x, BRUNNEN.z));
  hindernis(BRUNNEN.x, BRUNNEN.z, 1.1);
  versetze(toepfe, marktstand, MARKTSTAND.x, MARKTSTAND.z, Math.atan2(DORF.x - MARKTSTAND.x, DORF.z - MARKTSTAND.z), hoeheBei(MARKTSTAND.x, MARKTSTAND.z));
  hindernis(MARKTSTAND.x, MARKTSTAND.z, 1.2);
  // Steg nach Norden in den Weiher
  const stegRichtung = Math.atan2(WEIHER.x - STEG.x, WEIHER.z - STEG.z);
  versetze(toepfe, (t) => steg(t, 0), STEG.x, STEG.z, stegRichtung, wasserspiegel() + 0.35);
  // Auf dem Steg kann man bis über das tiefe Wasser hinausgehen (zum Angeln)
  laufflaeche(STEG.x, STEG.z, stegRichtung, 1.5, 6.05, wasserspiegel() + 0.385);

  const materialien = {
    putz: new THREE.MeshStandardMaterial({ map: putzTextur(), roughness: 0.95 }),
    stroh: new THREE.MeshStandardMaterial({ map: strohTextur(), roughness: 1 }),
    balken: new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.9 }),
    tuer: new THREE.MeshStandardMaterial({ color: 0x4f3622, roughness: 0.85 }),
    // Fenster: tagsüber dunkel, abends leuchtet drinnen ein Herdfeuer (siehe aktualisiere)
    glas: new THREE.MeshStandardMaterial({ color: 0x1a1d1f, roughness: 0.2, metalness: 0.1, emissive: 0xffa040, emissiveIntensity: 0 }),
    stein: new THREE.MeshStandardMaterial({ color: 0x77736b, roughness: 0.95, side: THREE.DoubleSide }),
    dunkel: new THREE.MeshStandardMaterial({ color: 0x0c1412, roughness: 0.3 }),
    markise: new THREE.MeshStandardMaterial({ map: streifenTextur(), roughness: 0.9, side: THREE.DoubleSide }),
    sack: new THREE.MeshStandardMaterial({ color: 0xa08a64, roughness: 1 }),
    apfel: new THREE.MeshStandardMaterial({ color: 0x9c2a1c, roughness: 0.5 }),
  };
  materialien.stroh.map.repeat.set(2, 2);
  const gruppe = new THREE.Group();
  gruppe.name = 'dorf';
  for (const [k, liste] of Object.entries(toepfe)) {
    if (!liste.length) continue;
    // Alle Teile auf dieselben Eigenschaften bringen, dann zu einem Netz verschmelzen
    const gleich = liste.map((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((n.attributes.position.count) * 2), 2));
      if (!n.attributes.normal) n.computeVertexNormals();
      for (const name of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(name)) n.deleteAttribute(name);
      return n;
    });
    const netz = new THREE.Mesh(mergeGeometries(gleich), materialien[k]);
    netz.castShadow = k !== 'dunkel' && k !== 'glas';
    netz.receiveShadow = true;
    gruppe.add(netz);
  }
  const rauch = kamine.map((ort, i) => kaminRauch(ort, i * 0.37));
  for (const r of rauch) gruppe.add(r.objekt);

  // wind: Windrichtung (x, y), hell: 1 am Tag, 0 in der Nacht
  function aktualisiere(dt, wind, hell) {
    for (const r of rauch) r.aktualisiere(dt, wind, hell);
    materialien.glas.emissiveIntensity = THREE.MathUtils.smoothstep(1 - hell, 0.45, 0.85) * 1.6;
  }
  return { objekt: gruppe, aktualisiere };
}
