// Unterholz: Farne und Totholz am Waldboden, Schilf an den Ufern, damit der Wald nicht aussieht wie ein aufgeräumter Obstgarten.
// Farne wachsen in Flecken, wo der Wald dicht ist (nicht auf Wegen und nicht im Wasser); umgestürzte, bemooste
// Stämme liegen kreuz und quer. Alles in Feldern zu 48 Metern, damit die Grafikkarte nur nahe Felder zeichnet.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bachLinie, hoeheBei, neigungBei, pfadAbstand, waldDichte, wasserspiegel, WELT_GROESSE } from './gelaende.js';
import { GEWAESSER } from './orte.js';
import { zufall } from './zufall.js';

const FELD = 48;
const SICHT = { farn: 70, totholz: 120, schilf: 110 };

// Ein Farnwedel als Bild: Mittelrippe mit Fiederblättchen, nach oben kleiner
function farnBild() {
  const b = 64, h = 256, c = document.createElement('canvas');
  c.width = b; c.height = h;
  const k = c.getContext('2d');
  k.strokeStyle = '#3d5a22';
  k.lineWidth = 3;
  k.beginPath(); k.moveTo(b / 2, h); k.lineTo(b / 2, 4); k.stroke();
  for (let y = h - 14; y > 8; y -= 9) {
    const t = y / h; // unten 1, oben 0
    const l = (b / 2 - 3) * Math.min(1, t * 1.6) * (0.75 + 0.25 * Math.sin(y));
    for (const s of [-1, 1]) {
      k.fillStyle = `hsl(${84 + Math.random() * 16}, ${48 + Math.random() * 14}%, ${38 + (1 - t) * 10 + Math.random() * 8}%)`;
      k.beginPath();
      k.moveTo(b / 2, y);
      k.quadraticCurveTo(b / 2 + s * l * 0.6, y - 9, b / 2 + s * l, y - 4);
      k.quadraticCurveTo(b / 2 + s * l * 0.5, y + 2, b / 2, y + 3);
      k.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Ein Farn: sieben gebogene Wedel aus der Mitte, nach außen überhängend
function farnForm(wedel = 9, segmente = 5) {
  const teile = [];
  for (let i = 0; i < wedel; i++) {
    const w = (i / wedel) * Math.PI * 2 + (i % 2) * 0.3;
    const laenge = 0.85 + (i % 3) * 0.12, breite = 0.42;
    const pos = [], uv = [], idx = [];
    for (let s = 0; s <= segmente; s++) {
      const t = s / segmente;
      // aufsteigen, dann überhängen
      const r = t * laenge, y = Math.sin(t * Math.PI * 0.75) * 0.7 * laenge - t * t * 0.12;
      const bx = Math.cos(w), bz = Math.sin(w), qx = -bz, qz = bx;
      const bb = breite * (1 - t * 0.6);
      pos.push(bx * r - qx * bb / 2, y, bz * r - qz * bb / 2, bx * r + qx * bb / 2, y, bz * r + qz * bb / 2);
      uv.push(0, 1 - t, 1, 1 - t);
      if (s < segmente) { const a = s * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    teile.push(g);
  }
  const geo = mergeGeometries(teile);
  geo.computeVertexNormals();
  // Normalen nach oben biegen: Farne wirken sonst von unten beleuchtet dunkel
  const n = geo.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, n.getX(i) * 0.3, Math.abs(n.getY(i)) * 0.7 + 0.5, n.getZ(i) * 0.3);
  return geo;
}

// Schilf: dünne, hohe Halme mit brauner Rispe, als Bild auf zwei gekreuzten Flächen
function schilfBild() {
  const b = 128, h = 256, c = document.createElement('canvas');
  c.width = b; c.height = h;
  const k = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const x = 10 + Math.random() * (b - 20), oben = 20 + Math.random() * 80, neig = (Math.random() - 0.5) * 30;
    k.strokeStyle = `hsl(${70 + Math.random() * 20}, ${30 + Math.random() * 15}%, ${30 + Math.random() * 12}%)`;
    k.lineWidth = 2 + Math.random() * 1.5;
    k.beginPath(); k.moveTo(x, h); k.quadraticCurveTo(x, (h + oben) / 2, x + neig, oben); k.stroke();
    if (Math.random() < 0.6) {
      k.fillStyle = `hsl(25, 35%, ${22 + Math.random() * 10}%)`;
      k.beginPath(); k.ellipse(x + neig, oben + 10, 3.5, 14, neig * 0.01, 0, Math.PI * 2); k.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function kreuzForm(breite, hoehe) {
  const a = new THREE.PlaneGeometry(breite, hoehe); a.translate(0, hoehe / 2, 0);
  const b = a.clone(); b.rotateY(Math.PI / 2);
  const geo = mergeGeometries([a, b]);
  const n = geo.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); // von oben beleuchtet wie Gras
  return geo;
}

function nimmPlatz(x, z, wsp) {
  if (pfadAbstand(x, z) < 2) return false;
  if (hoeheBei(x, z) < wsp + 0.25 || neigungBei(x, z) > 0.7) return false;
  for (const g of GEWAESSER) if (Math.hypot(x - g.x, z - g.z) < g.radius * 1.5) return false;
  return true;
}

export function erzeugeUnterholz(qualitaet, { rinde, baeume = [] } = {}) {
  const gruppe = new THREE.Group();
  gruppe.name = 'unterholz';
  const z = zufall(777);
  const wsp = wasserspiegel();
  const felder = new Map(); // "ix,iz" -> { farne: [], totholz: [] }
  const feld = (x, zz) => {
    const k = `${Math.floor(x / FELD)},${Math.floor(zz / FELD)}`;
    if (!felder.has(k)) felder.set(k, { farne: [], totholz: [] });
    return felder.get(k);
  };
  const rand = WELT_GROESSE / 2 - 30;
  const menge = Math.max(0.35, qualitaet.baeume ?? 1);

  // Farne: in Gruppen um die Bäume herum, wo der Wald dicht ist (dort ist der Boden feucht und schattig)
  for (const b of baeume) {
    if (b.art !== 'baum' || z() > 0.8 * menge) continue;
    const w = waldDichte(b.x, b.z);
    if (w < 0.25) continue;
    const fleck = Math.sin(b.x * 0.11 + Math.sin(b.z * 0.07) * 2) * Math.cos(b.z * 0.09 + Math.sin(b.x * 0.05) * 2);
    const n = Math.round((2 + fleck * 4) * w * 2.2);
    for (let i = 0; i < n; i++) {
      const r = 1 + z() * 3.5, ww = z() * 6.28;
      const x = b.x + Math.cos(ww) * r, zz = b.z + Math.sin(ww) * r;
      if (!nimmPlatz(x, zz, wsp)) continue;
      feld(x, zz).farne.push({ x, z: zz, y: hoeheBei(x, zz), s: 0.9 + z() * 0.8, w: z() * 6.28 });
    }
  }
  // Totholz: umgestürzte Stämme
  const versucheHolz = Math.round(5000 * menge);
  for (let i = 0; i < versucheHolz; i++) {
    const x = (z() - 0.5) * 2 * rand, zz = (z() - 0.5) * 2 * rand;
    if (waldDichte(x, zz) < 0.45 || z() > 0.35) continue;
    if (!nimmPlatz(x, zz, wsp)) continue;
    feld(x, zz).totholz.push({ x, z: zz, laenge: 2 + z() * 4, r: 0.1 + z() * 0.16, w: z() * 6.28, kipp: (z() - 0.5) * 0.2 });
  }

  // Schilf an den Ufern der Seen und am Bach, wo der Boden knapp über dem Wasser liegt
  const ufer = [];
  for (const g of GEWAESSER) {
    const n = Math.round(g.radius * 9 * menge);
    for (let i = 0; i < n; i++) { const w = z() * 6.28, r = g.radius * (0.9 + z() * 0.9); ufer.push([g.x + Math.cos(w) * r, g.z + Math.sin(w) * r]); }
  }
  for (const p of bachLinie()) for (let i = 0; i < 2; i++) ufer.push([p.x + (z() - 0.5) * 7, p.z + (z() - 0.5) * 7]);
  for (const [x, zz] of ufer) {
    const y = hoeheBei(x, zz);
    if (y < wsp - 0.35 || y > wsp + 0.5 || pfadAbstand(x, zz) < 1.5) continue;
    (feld(x, zz).schilf ??= []).push({ x, z: zz, y, s: 0.8 + z() * 0.6, w: z() * 6.28 });
  }

  const farnMat = new THREE.MeshStandardMaterial({ map: farnBild(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 });
  const farnGeo = farnForm();
  const schilfMat = new THREE.MeshStandardMaterial({ map: schilfBild(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 });
  const schilfGeo = kreuzForm(1.3, 1.9);
  const holzMat = rinde ?? new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.95 });
  const holzGeo = new THREE.CylinderGeometry(1, 1.1, 1, 9, 1);
  holzGeo.rotateZ(Math.PI / 2); // liegend entlang x
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const netze = [];
  for (const f of felder.values()) {
    if (f.farne.length) {
      const mesh = new THREE.InstancedMesh(farnGeo, farnMat, f.farne.length);
      f.farne.forEach((o, i) => {
        e.set((z() - 0.5) * 0.15, o.w, (z() - 0.5) * 0.15);
        m.compose(p.set(o.x, o.y - 0.03, o.z), q.setFromEuler(e), s.setScalar(o.s));
        mesh.setMatrixAt(i, m);
      });
      mesh.computeBoundingSphere();
      mesh.receiveShadow = true;
      mesh.userData.sicht = SICHT.farn;
      netze.push(mesh);
    }
    if (f.schilf?.length) {
      const mesh = new THREE.InstancedMesh(schilfGeo, schilfMat, f.schilf.length);
      f.schilf.forEach((o, i) => {
        m.compose(p.set(o.x, o.y - 0.05, o.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), o.w), s.set(o.s, o.s * (0.9 + (i % 5) * 0.08), o.s));
        mesh.setMatrixAt(i, m);
      });
      mesh.computeBoundingSphere();
      mesh.receiveShadow = true;
      mesh.userData.sicht = SICHT.schilf;
      netze.push(mesh);
    }
    if (f.totholz.length) {
      const mesh = new THREE.InstancedMesh(holzGeo, holzMat, f.totholz.length);
      f.totholz.forEach((o, i) => {
        e.set(0, o.w, o.kipp);
        // Mitte eines Stamms, der auf dem Boden liegt: Höhe aus beiden Enden
        const dx = Math.cos(o.w) * o.laenge / 2, dz = -Math.sin(o.w) * o.laenge / 2;
        const y = (hoeheBei(o.x + dx, o.z + dz) + hoeheBei(o.x - dx, o.z - dz)) / 2 + o.r * 0.6;
        m.compose(p.set(o.x, y, o.z), q.setFromEuler(e), s.set(o.laenge, o.r, o.r));
        mesh.setMatrixAt(i, m);
      });
      mesh.computeBoundingSphere();
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.sicht = SICHT.totholz;
      netze.push(mesh);
    }
  }
  gruppe.add(...netze);

  // Nur nahe Felder zeichnen
  let uhr = 0;
  function aktualisiere(dt, ort) {
    uhr -= dt;
    if (uhr > 0) return;
    uhr = 0.5;
    for (const n of netze) n.visible = n.boundingSphere.center.distanceTo(ort) < n.userData.sicht + n.boundingSphere.radius;
  }

  return { objekt: gruppe, aktualisiere, anzahl: { farne: [...felder.values()].reduce((a, f) => a + f.farne.length, 0), totholz: [...felder.values()].reduce((a, f) => a + f.totholz.length, 0) } };
}
