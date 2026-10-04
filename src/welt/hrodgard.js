// Hrodgard, das Dorf des Eberstamms: ein germanisches Dorf auf einer Waldlichtung. Langhäuser aus gespaltenen
// Stämmen mit tief heruntergezogenen Reetdächern und gekreuzten Giebelbrettern, die große Halle des Häuptlings,
// ein Grubenhaus, ein Speicher auf Pfählen, ein Pferch mit Flechtzaun, der Thing-Platz aus aufrechten Steinen
// und ein Stammespfahl mit Eberschädel; alles hinter einer Palisade aus zugespitzten Stämmen mit Tor nach Osten.
// Dach-, Wand- und Rindentexturen sowie Fässer, Eimer, Körbe, Spinnrad und anderes: Poly Haven (CC0).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ladeModell } from '../modelle.js';
import { kaminRauch, quader, rechteckHindernis } from './dorf.js';
import { hoeheBei } from './gelaende.js';
import { hindernis } from './kollision.js';
import { GRUBENHAUS, HRODGARD, LANGHAEUSER, PLATZ_HRODGARD, SPEICHER, THING } from './orte.js';
import { zufall as saatZufall } from './zufall.js';

const BAUTEN = new URL('../../assets/bauten/', import.meta.url).href;
const REQUISITEN = new URL('../../assets/requisiten/', import.meta.url).href;
const lader = new THREE.TextureLoader();

function pbr(name, kachel, extra = {}) {
  const lade = (teil, farbe) => {
    const t = lader.load(`${BAUTEN}${name}_${teil}_1k.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (farbe) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return new THREE.MeshStandardMaterial({
    map: lade('diff', true), normalMap: lade('nor_gl'), roughnessMap: lade('rough'), roughness: 1, ...extra,
  });
}

// Texturkoordinaten in Metern, je nach Richtung der Fläche (für Kästen und Wände)
function weltUV(g, kachel) {
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    const [u, v] = ny > 0.7 ? [p.getX(i), p.getZ(i)] : nx > 0.7 ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u / kachel; uv[i * 2 + 1] = v / kachel;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
const wandKasten = (sx, sy, sz, x, y, z) => weltUV(new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z), 2.2);

// Ein Walmdach mit dicker Reetkante. ex/ez: halbe Ausdehnung an der Traufe, e: Traufhöhe, r: Firsthöhe,
// walm: wie weit die Enden abgeschrägt sind (0 = Giebel, 1 = ringsum gleich steil)
function dach(ex, ez, e, r, walm, dicke = 0.38, kachel = 2.4) {
  const rx = Math.max(0.3, ex - ez * walm);
  const A = [-ex, e, ez], B = [ex, e, ez], C = [ex, e, -ez], D = [-ex, e, -ez], P = [-rx, r, 0], Q = [rx, r, 0];
  const pos = [], uv = [];
  // u entlang der Traufe, v den Hang hinauf (in Metern)
  const langUV = ([x, y, z]) => [x / kachel, Math.hypot(ez - Math.abs(z), y - e) / kachel];
  const endUV = ([x, y, z]) => [z / kachel, Math.hypot(ex - Math.abs(x), y - e) / kachel];
  const drei = (a, b, c, f) => { for (const v of [a, b, c]) { pos.push(...v); uv.push(...f(v)); } };
  const flaechen = (unten) => {
    const y = (v) => (unten ? [v[0], v[1] - dicke, v[2]] : v);
    const tri = (a, b, c, f) => (unten ? drei(y(a), y(c), y(b), f) : drei(a, b, c, f));
    tri(A, B, Q, langUV); tri(A, Q, P, langUV);
    tri(C, D, P, langUV); tri(C, P, Q, langUV);
    tri(B, C, Q, endUV); tri(D, A, P, endUV);
  };
  flaechen(false);
  flaechen(true);
  // die dicke Kante an der Traufe
  const rand = [A, B, C, D, A];
  let u = 0;
  for (let i = 0; i < 4; i++) {
    const a = rand[i], b = rand[i + 1], l = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const a2 = [a[0], a[1] - dicke, a[2]], b2 = [b[0], b[1] - dicke, b[2]];
    const k = (v, uu) => { pos.push(...v); uv.push(uu / kachel, v[1] < e - 0.01 ? 0 : dicke / kachel); };
    k(a, u); k(a2, u); k(b, u + l); k(b, u + l); k(a2, u); k(b2, u + l);
    u += l;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return { g, rx };
}

// Dreieckige Giebelwand (für das Grubenhaus)
function giebel(b, unten, oben, x) {
  const g = new THREE.BufferGeometry();
  const pos = [x, unten, -b, x, unten, b, x, oben, 0];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([-b / 2.2, unten / 2.2, b / 2.2, unten / 2.2, 0, oben / 2.2], 2));
  g.computeVertexNormals();
  return g;
}

// Gekreuzte Giebelbretter mit geschnitzten Pferdeköpfen, an beiden Enden des Firsts
function giebelzier(t, x, r) {
  for (const s of [-1, 1]) {
    const dreh = new THREE.Euler(s * 0.62, 0, 0);
    t.balken.push(quader(0.08, 2.0, 0.16, x, r + 0.35, 0, dreh));
    // der Kopf: ein kleiner, nach außen geneigter Block am oberen Ende
    t.balken.push(quader(0.08, 0.28, 0.42, x, r + 1.15, s * -0.72, new THREE.Euler(s * -0.4, 0, 0)));
  }
}

// Ein Langhaus: Länge entlang x, Tür auf der +z-Seite (zum Platz). Gibt den Ort für den Rauch zurück.
function langhaus(t, h) {
  const L = h.laenge, Bh = h.breite / 2, W = 2.5, o = 0.95, e = 1.95;
  // Sockel aus Feldsteinen, Wände aus gespaltenen Stämmen
  t.stein.push(quader(L + 0.5, 0.35, h.breite + 0.5, 0, 0.0, 0));
  t.wand.push(wandKasten(L, W, 0.28, 0, W / 2, Bh), wandKasten(L, W, 0.28, 0, W / 2, -Bh));
  t.wand.push(wandKasten(0.28, W, h.breite, L / 2, W / 2, 0), wandKasten(0.28, W, h.breite, -L / 2, W / 2, 0));
  // Ständer an den Ecken und alle drei Meter
  for (let x = -L / 2; x <= L / 2 + 0.01; x += L / Math.round(L / 3)) {
    for (const z of [-Bh - 0.12, Bh + 0.12]) t.balken.push(quader(0.26, W, 0.26, x, W / 2, z));
  }
  // Tür mit Rahmen und Schwelle, daneben eine zweite kleine Tür
  for (const [tx, b, hh] of [[0, 1.4, 1.85], [L * 0.32, 0.9, 1.6]]) {
    t.dunkel.push(quader(b, hh, 0.06, tx, hh / 2 + 0.17, Bh + 0.15));
    t.balken.push(quader(0.18, hh + 0.2, 0.22, tx - b / 2 - 0.09, (hh + 0.2) / 2 + 0.17, Bh + 0.17));
    t.balken.push(quader(0.18, hh + 0.2, 0.22, tx + b / 2 + 0.09, (hh + 0.2) / 2 + 0.17, Bh + 0.17));
    t.balken.push(quader(b + 0.5, 0.2, 0.24, tx, hh + 0.27, Bh + 0.17));
  }
  const ez = Bh + o, r = e + ez * 1.18;
  const { g, rx } = dach(L / 2 + o, ez, e, r, 0.72);
  t.stroh.push(g);
  // Firstbalken und Giebelzier
  t.balken.push(new THREE.CylinderGeometry(0.2, 0.2, rx * 2 + 0.4, 8).rotateZ(Math.PI / 2).translate(0, r - 0.05, 0));
  giebelzier(t, rx + 0.1, r);
  giebelzier(t, -rx - 0.1, r);
  return new THREE.Vector3(rx * 0.4, r + 0.1, 0);
}

// Grubenhaus: halb in die Erde gesenkt, das Satteldach reicht bis zum Boden
function grubenhaus(t) {
  const { g } = dach(2.9, 2.3, 0.05, 2.9, 0, 0.3, 2.0);
  t.stroh.push(g);
  t.wand.push(giebel(2.0, 0, 2.55, 2.75), giebel(2.0, 0, 2.55, -2.75));
  t.dunkel.push(quader(0.06, 1.3, 0.85, 2.8, 0.65, 0));
  t.balken.push(quader(0.12, 1.5, 0.12, 2.82, 0.75, -0.5), quader(0.12, 1.5, 0.12, 2.82, 0.75, 0.5), quader(0.12, 0.12, 1.1, 2.82, 1.45, 0));
}

// Speicher auf Pfählen (gegen Mäuse und Nässe) mit Leiter
function speicher(t) {
  for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [1.2, 1.2], [-1.2, 1.2]]) t.balken.push(new THREE.CylinderGeometry(0.15, 0.17, 1.3, 8).translate(x, 0.65, z));
  t.balken.push(quader(3.0, 0.14, 3.0, 0, 1.35, 0));
  t.wand.push(wandKasten(2.7, 1.5, 0.16, 0, 2.15, 1.27), wandKasten(2.7, 1.5, 0.16, 0, 2.15, -1.27));
  t.wand.push(wandKasten(0.16, 1.5, 2.7, 1.27, 2.15, 0), wandKasten(0.16, 1.5, 2.7, -1.27, 2.15, 0));
  t.dunkel.push(quader(0.7, 1.0, 0.05, 0, 2.0, 1.36));
  const { g } = dach(1.95, 1.95, 2.75, 4.6, 1, 0.3, 2.0);
  t.stroh.push(g);
  // Leiter
  for (const s of [-0.25, 0.25]) t.balken.push(quader(0.07, 1.7, 0.07, s, 0.75, 2.0, new THREE.Euler(-0.35, 0, 0)));
  for (let i = 0; i < 4; i++) t.balken.push(quader(0.55, 0.05, 0.05, 0, 0.25 + i * 0.36, 2.25 - i * 0.13));
}

// Ein Pferch mit Flechtzaun: Pfosten, dazwischen gebogene Ruten
function flechtzaun(t, punkte) {
  for (let i = 0; i < punkte.length - 1; i++) {
    const [ax, az] = punkte[i], [bx, bz] = punkte[i + 1];
    const l = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(l / 0.7));
    const w = Math.atan2(bx - ax, bz - az);
    for (let k = 0; k <= n; k++) {
      const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n;
      t.balken.push(new THREE.CylinderGeometry(0.045, 0.05, 1.1, 5).translate(x, 0.55, z));
    }
    for (const y of [0.25, 0.42, 0.59, 0.76, 0.93]) {
      const rute = new THREE.CylinderGeometry(0.035, 0.035, l, 5).rotateX(Math.PI / 2).rotateY(w);
      rute.translate((ax + bx) / 2, y, (az + bz) / 2);
      t.rute.push(rute);
    }
  }
}

function aufGelaende(liste, x, z, drehung, bau, tiefe = 0) {
  const lokal = { stroh: [], wand: [], balken: [], stein: [], dunkel: [], rinde: [], rute: [], knochen: [] };
  const rueck = bau(lokal);
  const y = hoeheBei(x, z) - tiefe;
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), drehung), new THREE.Vector3(1, 1, 1));
  for (const [k, l] of Object.entries(lokal)) for (const g of l) liste[k].push(g.applyMatrix4(m));
  return rueck?.isVector3 ? rueck.applyMatrix4(m) : rueck;
}

export function erzeugeHrodgard() {
  const teile = { stroh: [], wand: [], balken: [], stein: [], dunkel: [], rinde: [], rute: [], knochen: [] };
  const z = saatZufall(1234);
  const rauchOrte = [];
  const zumPlatz = (x, zz) => Math.atan2(PLATZ_HRODGARD.x - x, PLATZ_HRODGARD.z - zz);

  // Langhäuser: Tür zum Platz, der First quer dazu
  for (const h of LANGHAEUSER) {
    const drehung = zumPlatz(h.x, h.z);
    rauchOrte.push(aufGelaende(teile, h.x, h.z, drehung, (t) => langhaus(t, h)));
    rechteckHindernis(h.x, h.z, h.laenge, h.breite, drehung);
  }
  aufGelaende(teile, GRUBENHAUS.x, GRUBENHAUS.z, zumPlatz(GRUBENHAUS.x, GRUBENHAUS.z) - Math.PI / 2, grubenhaus, 0.15);
  rechteckHindernis(GRUBENHAUS.x, GRUBENHAUS.z, 5.4, 4.4, zumPlatz(GRUBENHAUS.x, GRUBENHAUS.z) - Math.PI / 2);
  aufGelaende(teile, SPEICHER.x, SPEICHER.z, zumPlatz(SPEICHER.x, SPEICHER.z), speicher);
  hindernis(SPEICHER.x, SPEICHER.z, 1.9);

  // Pferch mit Flechtzaun zwischen Tor und Speicher
  aufGelaende(teile, -197, 123.5, 0, (t) => flechtzaun(t, [[-3, -2], [3, -2], [3, 2], [-3, 2], [-3, 0.2]]));
  for (const [x, zz] of [[-200, 121.5], [-197, 121.5], [-194, 121.5], [-194, 125.5], [-197, 125.5], [-200, 125.5]]) hindernis(x, zz, 0.9);

  // Thing-Platz: aufrechte Steine im Kreis, in der Mitte der flache Stein des Häuptlings
  aufGelaende(teile, THING.x, THING.z, 0, (t) => {
    for (let i = 0; i < 9; i++) {
      const w = (i / 9) * Math.PI * 2, hoch = 1.1 + z() * 0.7;
      const stein = new THREE.DodecahedronGeometry(0.5, 0).scale(0.7 + z() * 0.3, hoch, 0.5 + z() * 0.2);
      stein.rotateY(w).translate(Math.sin(w) * THING.radius, hoch * 0.42, Math.cos(w) * THING.radius);
      t.stein.push(stein);
    }
    t.stein.push(new THREE.CylinderGeometry(0.9, 1.0, 0.45, 9).translate(0, 0.2, 0));
  });
  for (let i = 0; i < 9; i++) {
    const w = (i / 9) * Math.PI * 2;
    hindernis(THING.x + Math.sin(w) * THING.radius, THING.z + Math.cos(w) * THING.radius, 0.5);
  }

  // Stammespfahl mit Querholz und Eberschädel am Platz
  aufGelaende(teile, PLATZ_HRODGARD.x - 4.5, PLATZ_HRODGARD.z - 4.5, 0.7, (t) => {
    t.balken.push(new THREE.CylinderGeometry(0.17, 0.24, 5.2, 8).translate(0, 2.6, 0));
    t.balken.push(quader(1.6, 0.18, 0.18, 0, 4.2, 0));
    t.knochen.push(new THREE.SphereGeometry(0.22, 8, 6).scale(1, 0.8, 1.5).translate(0, 4.6, 0.12));
    t.knochen.push(new THREE.ConeGeometry(0.05, 0.4, 5).rotateZ(-1.2).translate(0.22, 4.55, 0.3), new THREE.ConeGeometry(0.05, 0.4, 5).rotateZ(1.2).translate(-0.22, 4.55, 0.3));
  });
  hindernis(PLATZ_HRODGARD.x - 4.5, PLATZ_HRODGARD.z - 4.5, 0.4);

  // Palisade: zugespitzte Stämme im Kreis, ein Tor nach Osten (zur Westerstraße)
  const tor = 0; // Richtung des Tors (Winkel um die Mitte, 0 = Osten)
  const umfang = 2 * Math.PI * HRODGARD.palisade;
  const stamm = new THREE.CylinderGeometry(0.17, 0.19, 1, 7, 1);
  const spitze = new THREE.ConeGeometry(0.17, 0.45, 7);
  const n = Math.round(umfang / 0.36);
  for (let i = 0; i < n; i++) {
    const w = (i / n) * Math.PI * 2;
    const abTor = Math.abs(Math.atan2(Math.sin(w - tor), Math.cos(w - tor))) * HRODGARD.palisade;
    if (abTor < 2.6) continue;
    const x = HRODGARD.x + Math.cos(w) * HRODGARD.palisade, zz = HRODGARD.z + Math.sin(w) * HRODGARD.palisade;
    const hoch = 3.1 + z() * 0.6, y = hoeheBei(x, zz) - 0.5;
    const neig = new THREE.Euler((z() - 0.5) * 0.05, 0, (z() - 0.5) * 0.05);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, zz), new THREE.Quaternion().setFromEuler(neig), new THREE.Vector3(1, 1, 1));
    teile.rinde.push(stamm.clone().scale(1, hoch, 1).translate(0, hoch / 2, 0).applyMatrix4(m));
    teile.balken.push(spitze.clone().translate(0, hoch + 0.22, 0).applyMatrix4(m));
  }
  for (let d = 0; d < umfang; d += 1.05) {
    const w = d / HRODGARD.palisade;
    const abTor = Math.abs(Math.atan2(Math.sin(w - tor), Math.cos(w - tor))) * HRODGARD.palisade;
    if (abTor < 2.3) continue;
    hindernis(HRODGARD.x + Math.cos(w) * HRODGARD.palisade, HRODGARD.z + Math.sin(w) * HRODGARD.palisade, 0.6);
  }
  // Das Tor: zwei hohe Pfosten, ein Querbalken mit Eberschädel, zwei offene Torflügel
  const tx = HRODGARD.x + HRODGARD.palisade, tz = HRODGARD.z;
  aufGelaende(teile, tx, tz, Math.PI / 2, (t) => {
    for (const s of [-1, 1]) {
      t.rinde.push(new THREE.CylinderGeometry(0.28, 0.3, 5.2, 8).translate(s * 2.6, 2.1, 0));
      // offener Torflügel, nach innen geschwenkt
      const fluegel = quader(2.3, 2.9, 0.12, 0, 0, 0);
      fluegel.translate(-s * 1.15, 1.5, 0).rotateY(s * 1.25).translate(s * 2.45, 0, -0.1);
      t.wand.push(weltUV(fluegel, 2.2));
    }
    t.balken.push(quader(6.2, 0.36, 0.4, 0, 4.4, 0));
    t.knochen.push(new THREE.SphereGeometry(0.26, 8, 6).scale(1, 0.8, 1.5).translate(0, 4.85, 0.2));
  }, 0.5);
  hindernis(tx, tz - 2.6, 0.5); hindernis(tx, tz + 2.6, 0.5);

  // Material und Netze
  const materialien = {
    stroh: pbr('reed_roof_04', 2.4, { side: THREE.DoubleSide }),
    wand: pbr('wood_trunk_wall', 2.2, { side: THREE.DoubleSide }),
    rinde: pbr('pine_bark', 1),
    balken: new THREE.MeshStandardMaterial({ color: 0x3e2c1d, roughness: 0.92 }),
    stein: new THREE.MeshStandardMaterial({ color: 0x7a766c, roughness: 0.95 }),
    dunkel: new THREE.MeshStandardMaterial({ color: 0x0b0c0a, roughness: 0.9, emissive: 0xff8a30, emissiveIntensity: 0 }),
    rute: new THREE.MeshStandardMaterial({ color: 0x6a5238, roughness: 0.95 }),
    knochen: new THREE.MeshStandardMaterial({ color: 0xd9cfb8, roughness: 0.7 }),
  };
  materialien.rinde.map.repeat.set(1, 3);
  const gruppe = new THREE.Group();
  gruppe.name = 'hrodgard';
  for (const [k, liste] of Object.entries(teile)) {
    if (!liste.length) continue;
    const gleich = liste.map((g) => {
      const n2 = g.index ? g.toNonIndexed() : g;
      if (!n2.attributes.uv) n2.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n2.attributes.position.count * 2), 2));
      if (!n2.attributes.normal) n2.computeVertexNormals();
      for (const name of Object.keys(n2.attributes)) if (!['position', 'normal', 'uv'].includes(name)) n2.deleteAttribute(name);
      return n2;
    });
    const netz = new THREE.Mesh(mergeGeometries(gleich), materialien[k]);
    netz.castShadow = k !== 'dunkel';
    netz.receiveShadow = true;
    gruppe.add(netz);
  }
  const rauch = rauchOrte.filter(Boolean).map((ort, i) => kaminRauch(ort, i * 0.31));
  for (const r of rauch) gruppe.add(r.objekt);

  // Requisiten von Poly Haven: erst laden, wenn man in die Nähe kommt
  const REQ = [
    // [Datei, x, z, Drehung, Maßstab, Hindernis-Radius]
    ['wooden_barrels_01', -222.6, 108.5, 0.4, 1, 0.9],
    ['wooden_bucket_01', -222.4, 122.3, 0, 1, 0],
    ['wooden_crate_01', -195.5, 134.2, 0.3, 1, 0.6],
    ['wooden_crate_01', -194.6, 135.4, 1.1, 1, 0.6],
    ['wicker_basket_01', -203.8, 102.2, 0, 1, 0],
    ['spinning_wheel_01', -206.4, 101.6, 2.6, 1, 0.5],
    ['wooden_stool_01', -205.2, 101.2, 0.3, 1, 0],
    ['tree_stump_01', -199.5, 108.5, 0, 0.45, 0.4],
    ['wooden_axe', -199.5, 108.5, 0.8, 1, 0],
    ['wooden_bucket_01', -196.4, 120.8, 0.6, 1, 0],
  ];
  let geladen = false;
  async function ladeRequisiten() {
    if (geladen) return;
    geladen = true;
    const cache = new Map();
    let stumpfOben = 0;
    for (const [datei, x, zz, dreh, s, r] of REQ) {
      if (!cache.has(datei)) cache.set(datei, ladeModell(`${REQUISITEN}${datei}.glb`));
      const gltf = await cache.get(datei);
      const o = gltf.scene.clone(true);
      o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      o.scale.setScalar(s);
      o.rotation.y = dreh;
      // auf den Boden stellen; die Axt steckt oben im Hackklotz
      if (datei === 'wooden_axe') o.rotation.z = 0.5;
      const box = new THREE.Box3().setFromObject(o);
      o.position.set(x, (datei === 'wooden_axe' ? stumpfOben - 0.12 : hoeheBei(x, zz)) - box.min.y, zz);
      if (datei === 'tree_stump_01') stumpfOben = new THREE.Box3().setFromObject(o).max.y;
      gruppe.add(o);
      if (r) hindernis(x, zz, r);
    }
  }

  // wind: Windrichtung (x, y); hell: 1 am Tag, 0 in der Nacht; ort: wo der Spieler ist
  function aktualisiere(dt, wind, hell, ort) {
    for (const r of rauch) r.aktualisiere(dt, wind, hell);
    // nachts glimmt in den Türen das Herdfeuer
    materialien.dunkel.emissiveIntensity = THREE.MathUtils.smoothstep(1 - hell, 0.45, 0.85) * 0.5;
    if (!geladen && ort && Math.hypot(ort.x - HRODGARD.x, ort.z - HRODGARD.z) < 120) {
      ladeRequisiten().catch((e) => window.zeigeFehler?.(`Hrodgard: ${e.message}`));
    }
  }
  return { objekt: gruppe, aktualisiere, ladeRequisiten };
}
