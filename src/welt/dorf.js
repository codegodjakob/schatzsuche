// Das Dorf Erlenbach: Fachwerkhäuser mit Strohdach, ein Brunnen auf dem Dorfplatz, Martas Marktstand
// und Josts Steg am Weiher. Alles aus einfachen Formen; je Material wird es zu einem Netz
// zusammengefasst, damit das ganze Dorf nur wenige Zeichenaufrufe kostet.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hoeheBei, wasserspiegel } from './gelaende.js';
import { rauchBild } from './feuer.js';
import { hindernis, laufflaeche } from './kollision.js';
import { BRUNNEN, DORF, ESSE, GRAUFURT, HAEUSER, HAEUSER_GRAUFURT, MARKTSTAND, STEG, WEIHER } from './orte.js';

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

const schindelTextur = () => leinwand(256, (k, g) => {
  k.fillStyle = '#4a3a2c';
  k.fillRect(0, 0, g, g);
  const reihen = 10, h = g / reihen;
  for (let r = 0; r < reihen; r++) {
    const versatz = (r % 2) * 12;
    for (let x = -versatz; x < g; x += 18 + Math.random() * 10) {
      const b = 16 + Math.random() * 10, ton = 70 + Math.random() * 45;
      k.fillStyle = `rgb(${ton + 20}, ${ton}, ${ton * 0.75})`;
      k.fillRect(x + 1, r * h + 1, b - 2, h - 1);
      k.fillStyle = 'rgba(0,0,0,0.35)';
      k.fillRect(x + 1, r * h + h - 4, b - 2, 3);
    }
  }
});

// Bruchstein: unregelmäßige Steine in Reihen, mit dunklen Fugen
const bruchsteinTextur = () => leinwand(256, (k, g) => {
  k.fillStyle = '#4a463e';
  k.fillRect(0, 0, g, g);
  let y = 0;
  while (y < g) {
    const h = 14 + Math.random() * 14;
    let x = -Math.random() * 20;
    while (x < g) {
      const b = 18 + Math.random() * 30, ton = 105 + Math.random() * 60;
      k.fillStyle = `rgb(${ton}, ${ton * 0.97}, ${ton * 0.9})`;
      k.beginPath();
      k.roundRect(x + 2, y + 2, b - 4, h - 4, 5);
      k.fill();
      k.fillStyle = 'rgba(255,255,255,0.08)';
      k.fillRect(x + 4, y + 3, b - 10, 3);
      x += b;
    }
    y += h;
  }
});
const schieferTextur = () => leinwand(256, (k, g) => {
  k.fillStyle = '#23262b';
  k.fillRect(0, 0, g, g);
  const h = g / 12;
  for (let r = 0; r < 12; r++) {
    for (let x = -(r % 2) * 10; x < g; x += 20) {
      const ton = 50 + Math.random() * 28;
      k.fillStyle = `rgb(${ton}, ${ton + 3}, ${ton + 8})`;
      k.fillRect(x + 1, r * h + 1, 18, h - 2);
    }
  }
});

const streifenTextur = () => leinwand(128, (k, g) => {
  for (let i = 0; i < 8; i++) {
    k.fillStyle = i % 2 ? '#e9e1cf' : '#9e3a2c';
    k.fillRect((i * g) / 8, 0, g / 8, g);
  }
});

// ---------------------------------------------------------------- Bausteine

// Eine Geometrie einfärben (Ecken-Farbe; das Material multipliziert sie mit seinem Bild)
function faerbe(g, farbe) {
  const n = g.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([farbe.r, farbe.g, farbe.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

// Jedes Haus anders: aus seinem Namen berechnet, damit es bei jedem Start gleich aussieht
const PUTZ = [0xf2ead8, 0xe6d3a8, 0xead2c4, 0xd8d6cc, 0xf0e2b8, 0xdcc9a6].map((h) => new THREE.Color(h));
const HOLZ = [0x3b2a1c, 0x5a2e1e, 0x2e2620, 0x4a3420].map((h) => new THREE.Color(h));
const LAEDEN = [0x2f5a3a, 0x3a4f6e, 0x7a3a2a, 0x5a4a32, 0x4a6a6a].map((h) => new THREE.Color(h));
const BLUMEN = [0xc0392b, 0xe67e22, 0xd4a2c8, 0xf1c40f].map((h) => new THREE.Color(h));
function spielart(h) {
  let w = 0;
  for (const z of h.name) w = (w * 31 + z.charCodeAt(0)) >>> 0;
  const r = (k) => { const t = Math.sin(w * 0.001 + k * 91.7) * 43758.5453; return t - Math.floor(t); };
  const wahl = (liste, k) => liste[Math.floor(r(k) * liste.length)];
  return {
    putz: wahl(PUTZ, 1), holz: wahl(HOLZ, 2), laden: wahl(LAEDEN, 3), blume: wahl(BLUMEN, 4),
    schindel: !h.scheune && r(5) < 0.4, stock: !h.scheune && r(6) < 0.45 ? 2 : 1,
    kaesten: r(7) < 0.6, anbau: r(8) < 0.5, holzstapel: r(9) < 0.6, neigung: 0.68 + r(10) * 0.2,
  };
}

// Ein Quader von a nach b (Ecken), optional gedreht, als Geometrie in Weltlage
export function quader(sx, sy, sz, x, y, z, dreh = null) {
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
function haus({ breite, tiefe, schornstein, scheune }, toepfe, art) {
  const wand = scheune ? 3.4 : art.stock === 2 ? 4.7 : 2.7;
  const neigung = scheune ? 0.65 : art.neigung;
  const dach = art.stein ? toepfe.schiefer : art.schindel ? toepfe.schindel : toepfe.stroh;
  const mauer = art.stein ? toepfe.bruchstein : toepfe.putz;
  const nachher = { putz: toepfe.putz.length, balken: toepfe.balken.length, tuer: toepfe.tuer.length };
  const b = breite / 2, t = tiefe / 2;
  const giebel = b * Math.tan(neigung);
  // Wände
  mauer.push(quader(breite, wand, tiefe, 0, wand / 2, 0));
  // Giebeldreiecke vorne und hinten
  for (const z of [t, -t]) {
    const g = new THREE.BufferGeometry();
    const vorne = z > 0;
    const p = vorne ? [-b, wand, z, b, wand, z, 0, wand + giebel, z] : [b, wand, z, -b, wand, z, 0, wand + giebel, z];
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
    g.computeVertexNormals();
    mauer.push(g);
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
    dach.push(g);
  }
  // Fachwerk: Schwelle, Rähm, Riegel, Pfosten, Streben – vorne, hinten und an den Seiten
  const aussen = 0.04;
  const holz = toepfe.balken;
  const ecken = [[-b, -t], [b, -t], [b, t], [-b, t]];
  for (let i = 0; i < (art.stein ? 0 : 4); i++) { // Steinhäuser haben kein Fachwerk
    const [x1, z1] = ecken[i], [x2, z2] = ecken[(i + 1) % 4];
    const nx = Math.sign(x1 + x2) * (Math.abs(x1 + x2) > 0.01 ? 1 : 0), nz = Math.sign(z1 + z2) * (Math.abs(z1 + z2) > 0.01 ? 1 : 0);
    const off = (x, y, z) => new THREE.Vector3(x + nx * aussen, y, z + nz * aussen);
    const riegel = art.stock === 2 ? [0.12, 1.35, 2.7, 3.7, wand - 0.08] : [0.12, wand * 0.5, wand - 0.08];
    for (const y of riegel) holz.push(balken(off(x1, y, z1), off(x2, y, z2)));
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
  // Fenster mit Läden an den Seiten und vorne (im Obergeschoss noch eine Reihe), darunter Blumenkästen
  if (!scheune) {
    const reihen = art.stock === 2 ? [1.55, 3.75] : [1.55];
    for (const fy of reihen) {
      for (const [x, z, drehY] of [[-b * 0.55, t, 0], [b * 0.55, t, 0], [b, 0, Math.PI / 2], [-b, 0, Math.PI / 2], [0, -t, 0]]) {
        const e = new THREE.Euler(0, drehY, 0);
        const vorZ = drehY ? 0 : Math.sign(z) * 0.06, vorX = drehY ? Math.sign(x) * 0.06 : 0;
        toepfe.glas.push(quader(0.7, 0.62, 0.04, x + vorX, fy, z + vorZ, e));
        for (const s of [-1, 1]) {
          const lx = drehY ? 0 : s * 0.55, lz = drehY ? s * 0.55 : 0;
          toepfe.tuer.push(faerbe(quader(0.36, 0.7, 0.04, x + vorX * 1.2 + lx, fy, z + vorZ * 1.2 + lz, e), art.laden));
        }
        if (art.kaesten && fy < 2) {
          const kx = drehY ? Math.sign(x) * 0.2 : 0, kz = drehY ? 0 : Math.sign(z) * 0.2;
          toepfe.tuer.push(faerbe(quader(0.8, 0.2, 0.22, x + vorX + kx, fy - 0.45, z + vorZ + kz, e), art.holz));
          for (let i = -3; i <= 3; i++) {
            const bx = drehY ? 0 : i * 0.11, bz = drehY ? i * 0.11 : 0;
            toepfe.blume.push(faerbe(quader(0.09, 0.09, 0.09, x + vorX + kx + bx, fy - 0.3 + (i % 2) * 0.04, z + vorZ + kz + bz, e), i % 3 ? art.blume : new THREE.Color(0x3f6a2a)));
          }
        }
      }
    }
    // Anbau: ein Schuppen mit Pultdach an der Seite
    if (art.anbau) {
      toepfe.putz.push(quader(1.8, 2.0, tiefe * 0.6, -b - 0.9, 1.0, -t * 0.2));
      const pult = new THREE.BoxGeometry(2.3, 0.15, tiefe * 0.6 + 0.4);
      pult.applyMatrix4(new THREE.Matrix4().makeRotationZ(-0.35));
      pult.translate(-b - 0.95, 2.3, -t * 0.2);
      dach.push(pult);
    }
    // Holzstapel an der Wand
    if (art.holzstapel) {
      for (let r = 0; r < 4; r++) {
        for (let i = 0; i < 7 - r; i++) {
          const g = new THREE.CylinderGeometry(0.09, 0.09, 0.8, 6);
          g.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
          g.translate(b + 0.25, 0.1 + r * 0.16, -t * 0.6 + i * 0.19 + r * 0.095);
          toepfe.scheit.push(g);
        }
      }
    }
  }
  // Farben dieses Hauses auf seine Wände und Balken
  for (const g of toepfe.putz.slice(nachher.putz)) faerbe(g, art.putz);
  for (const g of toepfe.balken.slice(nachher.balken)) faerbe(g, art.holz);
  for (const g of toepfe.tuer.slice(nachher.tuer)) if (!g.attributes.color) faerbe(g, art.holz.clone().lerp(new THREE.Color(1, 1, 1), 0.25));
  if (!schornstein) return null;
  toepfe.stein.push(quader(0.55, 1.6, 0.55, b * 0.45, wand + giebel * 0.6, -t * 0.3));
  return new THREE.Vector3(b * 0.45, wand + giebel * 0.6 + 0.8, -t * 0.3);
}

// Rauch aus einem Kamin: Schwaden steigen langsam auf, werden größer und verwehen mit dem Wind
export function kaminRauch(ort, versatz) {
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
export function rechteckHindernis(x, z, breite, tiefe, drehung) {
  const c = Math.cos(drehung), s = Math.sin(drehung);
  for (let i = -breite / 2 + 0.7; i <= breite / 2 - 0.7 + 0.01; i += 1.1) {
    for (let j = -tiefe / 2 + 0.7; j <= tiefe / 2 - 0.7 + 0.01; j += 1.1) {
      hindernis(x + i * c + j * s, z - i * s + j * c, 0.85);
    }
  }
}

// Ein Ort aus Häusern um einen Platz. artVon(h): wie ein Haus aussieht (spielart oder steinart);
// extras(toepfe): was der Ort sonst noch hat (Brunnen, Marktstand, Steg, Schmiede …)
function baueOrt(haeuser, mitte, artVon, extras) {
  const toepfe = { putz: [], bruchstein: [], stroh: [], schindel: [], schiefer: [], balken: [], tuer: [], glas: [], stein: [], dunkel: [], markise: [], sack: [], apfel: [], blume: [], scheit: [], glut: [], eisen: [] };
  const kamine = [];
  for (const h of haeuser) {
    // Tür zum Dorfplatz
    const drehung = Math.atan2(mitte.x - h.x, mitte.z - h.z);
    // Häuser stehen eben: auf der tiefsten Stelle der Grundfläche, ein Sockel gleicht aus
    const boden = Math.min(...[[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]].map(([a, b]) => hoeheBei(h.x + a * h.breite / 2, h.z + b * h.tiefe / 2)));
    let kamin = null;
    const lage = versetze(toepfe, (t) => { kamin = haus(h, t, artVon(h)); t.stein.push(quader(h.breite + 0.3, 0.6, h.tiefe + 0.3, 0, -0.25, 0)); }, h.x, h.z, drehung, boden);
    if (kamin) kamine.push(kamin.applyMatrix4(lage));
    rechteckHindernis(h.x, h.z, h.breite, h.tiefe, drehung);
  }
  const mehr = extras(toepfe, kamine) ?? {};

  const materialien = {
    putz: new THREE.MeshStandardMaterial({ map: putzTextur(), roughness: 0.95, vertexColors: true }),
    bruchstein: new THREE.MeshStandardMaterial({ map: bruchsteinTextur(), roughness: 0.95 }),
    schiefer: new THREE.MeshStandardMaterial({ map: schieferTextur(), roughness: 0.7 }),
    glut: new THREE.MeshStandardMaterial({ color: 0x2a1208, emissive: 0xff5a14, emissiveIntensity: 2.2, roughness: 0.9 }),
    eisen: new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.45, metalness: 0.8 }),
    stroh: new THREE.MeshStandardMaterial({ map: strohTextur(), roughness: 1 }),
    schindel: new THREE.MeshStandardMaterial({ map: schindelTextur(), roughness: 0.9 }),
    balken: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, vertexColors: true }),
    tuer: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, vertexColors: true }),
    blume: new THREE.MeshStandardMaterial({ roughness: 0.8, vertexColors: true }),
    scheit: new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.95 }),
    // Fenster: tagsüber dunkel, abends leuchtet drinnen ein Herdfeuer (siehe aktualisiere)
    glas: new THREE.MeshStandardMaterial({ color: 0x1a1d1f, roughness: 0.2, metalness: 0.1, emissive: 0xffa040, emissiveIntensity: 0 }),
    stein: new THREE.MeshStandardMaterial({ color: 0x77736b, roughness: 0.95, side: THREE.DoubleSide }),
    dunkel: new THREE.MeshStandardMaterial({ color: 0x0c1412, roughness: 0.3 }),
    markise: new THREE.MeshStandardMaterial({ map: streifenTextur(), roughness: 0.9, side: THREE.DoubleSide }),
    sack: new THREE.MeshStandardMaterial({ color: 0xa08a64, roughness: 1 }),
    apfel: new THREE.MeshStandardMaterial({ color: 0x9c2a1c, roughness: 0.5 }),
  };
  materialien.stroh.map.repeat.set(2, 2);
  materialien.schindel.map.repeat.set(2, 2);
  materialien.schiefer.map.repeat.set(2, 2);
  materialien.bruchstein.map.repeat.set(2, 1);
  // Was keine eigene Farbe hat (Brunnen, Marktstand, Steg), bekommt die alte Holzfarbe
  const STANDARD = { balken: 0x3b2a1c, tuer: 0x4f3622 };
  const gruppe = new THREE.Group();
  gruppe.name = 'dorf';
  for (const [k, liste] of Object.entries(toepfe)) {
    if (!liste.length) continue;
    // Alle Teile auf dieselben Eigenschaften bringen, dann zu einem Netz verschmelzen
    const gleich = liste.map((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((n.attributes.position.count) * 2), 2));
      if (!n.attributes.normal) n.computeVertexNormals();
      const behalten = materialien[k].vertexColors ? ['position', 'normal', 'uv', 'color'] : ['position', 'normal', 'uv'];
      if (materialien[k].vertexColors && !n.attributes.color) faerbe(n, new THREE.Color(STANDARD[k] ?? 0xffffff));
      for (const name of Object.keys(n.attributes)) if (!behalten.includes(name)) n.deleteAttribute(name);
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
  return { objekt: gruppe, aktualisiere, ...mehr };
}

export function erzeugeDorf() {
  return baueOrt(HAEUSER, DORF, spielart, (toepfe) => {
    versetze(toepfe, brunnen, BRUNNEN.x, BRUNNEN.z, 0.3, hoeheBei(BRUNNEN.x, BRUNNEN.z));
    hindernis(BRUNNEN.x, BRUNNEN.z, 1.1);
    versetze(toepfe, marktstand, MARKTSTAND.x, MARKTSTAND.z, Math.atan2(DORF.x - MARKTSTAND.x, DORF.z - MARKTSTAND.z), hoeheBei(MARKTSTAND.x, MARKTSTAND.z));
    hindernis(MARKTSTAND.x, MARKTSTAND.z, 1.2);
    // Steg nach Norden in den Weiher
    const stegRichtung = Math.atan2(WEIHER.x - STEG.x, WEIHER.z - STEG.z);
    versetze(toepfe, (t) => steg(t, 0), STEG.x, STEG.z, stegRichtung, wasserspiegel() + 0.35);
    // Auf dem Steg kann man bis über das tiefe Wasser hinausgehen (zum Angeln)
    laufflaeche(STEG.x, STEG.z, stegRichtung, 1.5, 6.05, wasserspiegel() + 0.385);
  });
}

// Graufurt: Steinhäuser mit Schieferdach, kleine Fenster, kaum Blumen. Die Schmiede hat vorn eine offene Esse.
function steinart(h) {
  return { ...spielart(h), stein: true, schindel: false, stock: h.name === 'gasthaus' ? 2 : 1, kaesten: h.name === 'gasthaus', anbau: h.name === 'gf4', holzstapel: true, neigung: 0.62 };
}

// Esse und Amboss vor der Schmiede: Steinblock mit Glut, Rauchfang, daneben der Amboss auf einem Holzklotz
function schmiede(toepfe) {
  toepfe.bruchstein.push(quader(1.4, 0.9, 1.0, 0, 0.45, 0));
  toepfe.glut.push(quader(0.9, 0.08, 0.6, 0, 0.93, 0));
  const fang = new THREE.CylinderGeometry(0.25, 0.7, 0.9, 4, 1, true);
  fang.rotateY(Math.PI / 4);
  fang.translate(0, 1.9, 0);
  toepfe.bruchstein.push(fang, quader(0.4, 1.4, 0.4, 0, 3.0, 0));
  toepfe.balken.push(new THREE.CylinderGeometry(0.28, 0.32, 0.6, 10).translate(1.6, 0.3, 0.2));
  toepfe.eisen.push(quader(0.55, 0.22, 0.24, 1.6, 0.72, 0.2), quader(0.25, 0.12, 0.18, 1.95, 0.76, 0.2));
  // Ein Gestell mit Werkzeug
  toepfe.balken.push(quader(1.2, 0.08, 0.3, -1.6, 1.3, -0.3), quader(0.08, 1.3, 0.08, -2.15, 0.65, -0.3), quader(0.08, 1.3, 0.08, -1.05, 0.65, -0.3));
  for (let i = 0; i < 4; i++) toepfe.eisen.push(quader(0.05, 0.5, 0.05, -2.0 + i * 0.25, 1.05, -0.2));
}

// Das Gasthaus bekommt ein Schild über der Tür
function gasthausSchild(toepfe, h) {
  toepfe.balken.push(quader(0.08, 0.08, 1.0, 0, 2.6, h.tiefe / 2 + 0.5));
  toepfe.tuer.push(quader(0.9, 0.6, 0.06, 0, 2.15, h.tiefe / 2 + 0.9));
}

export function erzeugeGraufurt() {
  return baueOrt(HAEUSER_GRAUFURT, GRAUFURT, steinart, (toepfe) => {
    versetze(toepfe, brunnen, GRAUFURT.x + 1, GRAUFURT.z - 1, 0.8, hoeheBei(GRAUFURT.x + 1, GRAUFURT.z - 1));
    hindernis(GRAUFURT.x + 1, GRAUFURT.z - 1, 1.1);
    const zurMitte = Math.atan2(GRAUFURT.x - ESSE.x, GRAUFURT.z - ESSE.z);
    const yEsse = hoeheBei(ESSE.x, ESSE.z);
    versetze(toepfe, schmiede, ESSE.x, ESSE.z, zurMitte, yEsse);
    hindernis(ESSE.x, ESSE.z, 0.9);
    const gasthaus = HAEUSER_GRAUFURT.find((h) => h.name === 'gasthaus');
    versetze(toepfe, (t) => gasthausSchild(t, gasthaus), gasthaus.x, gasthaus.z, Math.atan2(GRAUFURT.x - gasthaus.x, GRAUFURT.z - gasthaus.z), hoeheBei(gasthaus.x, gasthaus.z));
    // Die Glut der Esse wärmt und leuchtet wie ein Feuer
    let t = 0, hell = 3;
    const ort = new THREE.Vector3(ESSE.x, yEsse + 0.9, ESSE.z);
    return {
      esse: { ort, brennt: () => true, feuer: { helligkeit: () => hell, aktualisiere(dt) { t += dt; hell = 2.6 + Math.sin(t * 7) * 0.4 + Math.sin(t * 13) * 0.2; } } },
    };
  });
}
