// Bäume, Felsen und Blumen. Alles zufällig verteilt, aber mit fester Saat,
// damit die Welt bei jedem Start gleich aussieht.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hoeheBei, wasserspiegel, TEICH } from './gelaende.js';
import { ALTER_BAUM } from './orte.js';

// Kleiner Zufallsgenerator mit Saat (gleiche Saat = gleiche Welt)
export function zufall(saat) {
  let a = saat >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Verformt eine Kugel unregelmäßig. Der Versatz hängt nur vom Ort des Eckpunkts ab,
// damit aneinanderstoßende Flächen zusammenbleiben (keine Risse).
function beulen(geo, staerke, z) {
  const pos = geo.attributes.position;
  const saat = z() * 100;
  for (let i = 0; i < pos.count; i++) {
    const h = Math.sin(pos.getX(i) * 12.9898 + pos.getY(i) * 78.233 + pos.getZ(i) * 37.719 + saat) * 43758.5453;
    const f = 1 + (h - Math.floor(h) - 0.5) * staerke;
    pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f, pos.getZ(i) * f);
  }
  geo.computeVertexNormals();
  return geo;
}

function laubbaum(z) {
  const stamm = new THREE.CylinderGeometry(0.18, 0.32, 4.2, 7).translate(0, 2.1, 0);
  const kronen = [];
  for (let i = 0; i < 6; i++) {
    const r = 1.4 + z() * 1.1;
    const k = beulen(new THREE.IcosahedronGeometry(r, 1), 0.25, z);
    k.translate((z() - 0.5) * 2.6, 4.4 + z() * 2.2, (z() - 0.5) * 2.6);
    kronen.push(k);
  }
  return { stamm, krone: mergeGeometries(kronen) };
}

function nadelbaum(z) {
  const stamm = new THREE.CylinderGeometry(0.12, 0.26, 3, 6).translate(0, 1.5, 0);
  const stufen = [];
  for (let i = 0; i < 5; i++) {
    const r = 2.3 - i * 0.4;
    stufen.push(new THREE.ConeGeometry(r, 2.6, 8).translate(0, 2.4 + i * 1.5, 0));
  }
  return { stamm, krone: mergeGeometries(stufen) };
}

function platziere(mesh, orte) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  orte.forEach((o, i) => {
    p.set(o.x, o.y, o.z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), o.drehung);
    s.setScalar(o.groesse);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

// Bäume stehen in Gruppen (Waldstücke), nicht gleichmäßig verstreut
function baumOrte(z, anzahl, abstandMin, abstandMax) {
  const orte = [];
  const haine = Array.from({ length: 14 }, () => {
    const w = z() * Math.PI * 2, r = abstandMin + z() * (abstandMax - abstandMin);
    return { x: Math.cos(w) * r, z: Math.sin(w) * r };
  });
  while (orte.length < anzahl) {
    const h = haine[Math.floor(z() * haine.length)];
    const x = h.x + (z() - 0.5) * 50, zz = h.z + (z() - 0.5) * 50;
    if (Math.hypot(x, zz) < abstandMin) continue;
    if (Math.hypot(x - TEICH.x, zz - TEICH.z) < TEICH.radius * 1.8) continue;
    orte.push({ x, y: hoeheBei(x, zz) - 0.2, z: zz, drehung: z() * 6.28, groesse: 0.8 + z() * 0.6 });
  }
  return orte;
}

export function erzeugeNatur() {
  const z = zufall(4242);
  const gruppe = new THREE.Group();
  gruppe.name = 'natur';

  const rinde = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1 });
  const laub = new THREE.MeshStandardMaterial({ color: 0x3f6224, roughness: 0.9, flatShading: true });
  const nadeln = new THREE.MeshStandardMaterial({ color: 0x2b4526, roughness: 0.9, flatShading: true });

  // Laubbäume näher an der Wiese, Nadelbäume weiter draußen an den Hängen
  const arten = [
    { bau: laubbaum, laub, anzahl: 70, von: 35, bis: 140 },
    { bau: nadelbaum, laub: nadeln, anzahl: 160, von: 110, bis: 330 },
  ];
  for (const art of arten) {
    const { stamm, krone } = art.bau(z);
    const orte = baumOrte(z, art.anzahl, art.von, art.bis);
    const st = new THREE.InstancedMesh(stamm, rinde, orte.length);
    const kr = new THREE.InstancedMesh(krone, art.laub, orte.length);
    platziere(st, orte);
    platziere(kr, orte);
    gruppe.add(st, kr);
  }

  // Ein einzelner alter Baum am Rand der Wiese – ein Orientierungspunkt
  const alt = laubbaum(zufall(7));
  const einzel = new THREE.Group();
  einzel.add(new THREE.Mesh(alt.stamm, rinde), new THREE.Mesh(alt.krone, laub));
  einzel.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  einzel.scale.setScalar(1.5);
  einzel.position.set(ALTER_BAUM.x, hoeheBei(ALTER_BAUM.x, ALTER_BAUM.z) - 0.2, ALTER_BAUM.z);
  einzel.name = 'alter-baum';
  gruppe.add(einzel);

  // Felsen
  const felsGeo = beulen(new THREE.IcosahedronGeometry(1, 1), 0.45, z);
  const felsMat = new THREE.MeshStandardMaterial({ color: 0x86837b, roughness: 0.95, flatShading: true });
  const felsOrte = [];
  while (felsOrte.length < 60) {
    const w = z() * 6.28, r = 12 + z() * 200;
    const x = Math.cos(w) * r, zz = Math.sin(w) * r;
    felsOrte.push({ x, y: hoeheBei(x, zz) - 0.3, z: zz, drehung: z() * 6.28, groesse: 0.3 + z() ** 3 * 2.5 });
  }
  const felsen = new THREE.InstancedMesh(felsGeo, felsMat, felsOrte.length);
  platziere(felsen, felsOrte);
  gruppe.add(felsen);

  // Wildblumen auf der Wiese
  const bluete = new THREE.SphereGeometry(0.045, 6, 4).translate(0, 0.32, 0);
  const blumen = new THREE.InstancedMesh(bluete, new THREE.MeshStandardMaterial({ roughness: 0.7 }), 2500);
  const tone = [0xf3f0e6, 0xe8c64a, 0x8f6fc4, 0xd8574a];
  const m = new THREE.Matrix4(), c = new THREE.Color(), wsp = wasserspiegel();
  for (let i = 0; i < blumen.count; i++) {
    let x, zz, y;
    do {
      const w = z() * 6.28, r = Math.sqrt(z()) * 60;
      x = Math.cos(w) * r; zz = Math.sin(w) * r; y = hoeheBei(x, zz);
    } while (y < wsp + 0.1);
    m.makeTranslation(x, y + z() * 0.15, zz);
    blumen.setMatrixAt(i, m);
    blumen.setColorAt(i, c.setHex(tone[Math.floor(z() ** 1.6 * tone.length)]));
  }
  gruppe.add(blumen);

  return gruppe;
}
