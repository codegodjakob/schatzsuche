// Einzelne Grashalme, die sich im Wind wiegen.
// Ein Halm wird einmal gebaut und zehntausendfach wiederverwendet (Instanzen),
// sonst würde der Rechner das nicht schaffen.
import * as THREE from 'three';
import { hoeheBei, wasserspiegel } from './gelaende.js';

const ANZAHL = 90000;
const RADIUS = 70; // Meter um den Startpunkt

function halmGeometrie() {
  // Ein schmaler, nach oben spitzer Streifen aus drei Abschnitten, Höhe 0..1
  const b = 0.05;
  const punkte = [
    [-b, 0], [b, 0],
    [-b * 0.8, 0.35], [b * 0.8, 0.35],
    [-b * 0.5, 0.7], [b * 0.5, 0.7],
    [0, 1],
  ];
  const pos = [], farbe = [], normale = [];
  const unten = new THREE.Color(0x2c4a17), oben = new THREE.Color(0x9bb552);
  for (const [x, y] of punkte) {
    pos.push(x, y, 0);
    const c = unten.clone().lerp(oben, y);
    farbe.push(c.r, c.g, c.b);
    normale.push(0, 1, 0.25); // nach oben gekippt: Wiesen wirken so weicher
  }
  const index = [0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(farbe, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normale, 3));
  geo.setIndex(index);
  return geo;
}

export function erzeugeGras(zeit) {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, side: THREE.DoubleSide, roughness: 0.85, metalness: 0,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uZeit = zeit;
    shader.vertexShader = 'uniform float uZeit;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec2 halmOrt = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      float biegung = position.y * position.y;
      float boe = sin(uZeit * 1.3 + halmOrt.x * 0.08 + halmOrt.y * 0.05) * 0.5 + 0.5;
      float zittern = sin(uZeit * 4.1 + halmOrt.x * 1.7 + halmOrt.y * 1.3) * 0.08;
      transformed.x += (boe * 0.28 + zittern) * biegung;
      transformed.z += (boe * 0.12 + zittern * 0.5) * biegung;`,
    );
  };

  const gras = new THREE.InstancedMesh(halmGeometrie(), mat, ANZAHL);
  gras.frustumCulled = false;
  gras.receiveShadow = true;
  gras.name = 'gras';

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const neigung = new THREE.Euler();
  const farbe = new THREE.Color();
  const wsp = wasserspiegel();
  let n = 0;
  while (n < ANZAHL) {
    // Dichter in der Mitte, zum Rand hin lichter
    const r = RADIUS * Math.sqrt(Math.random()) ** 0.85;
    const w = Math.random() * Math.PI * 2;
    const x = Math.cos(w) * r, z = Math.sin(w) * r;
    const y = hoeheBei(x, z);
    if (y < wsp + 0.08) continue; // kein Gras im Wasser
    p.set(x, y, z);
    neigung.set((Math.random() - 0.5) * 0.35, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.35);
    q.setFromEuler(neigung);
    const hoehe = 0.35 + Math.random() ** 2 * 0.55;
    s.set(0.8 + Math.random() * 0.6, hoehe, 1);
    m.compose(p, q, s);
    gras.setMatrixAt(n, m);
    farbe.setHSL(0.18 + Math.random() * 0.08, 0.25 + Math.random() * 0.25, 0.72 + Math.random() * 0.18);
    gras.setColorAt(n, farbe);
    n++;
  }
  return gras;
}
