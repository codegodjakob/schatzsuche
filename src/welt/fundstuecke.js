// Dinge, die in der Welt liegen und aufgehoben werden können (trockene Äste, Feuersteine …).
// Jedes Fundstück hat einen Ort, ein Aussehen und eine Ereignis-ID in src/ereignisse/liste.js.
import * as THREE from 'three';
import { hoeheBei } from './gelaende.js';
import { zufall } from './zufall.js';

export const FUNDE = [
  { id: 'ast-1', ding: 'Ast', x: -30, z: 58 }, { id: 'ast-2', ding: 'Ast', x: -46, z: 70 },
  { id: 'ast-3', ding: 'Ast', x: -66, z: 74 }, { id: 'ast-4', ding: 'Ast', x: -20, z: 47 },
  { id: 'ast-5', ding: 'Ast', x: 18, z: 38 }, { id: 'ast-6', ding: 'Ast', x: -48, z: 98 },
  { id: 'ast-7', ding: 'Ast', x: 40, z: 30 },
];

function astGeometrie(z) {
  // ein krummer, trockener Ast mit zwei Seitenzweigen
  const kurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.55, 0.03, 0), new THREE.Vector3(-0.2, 0.05, (z() - 0.5) * 0.1),
    new THREE.Vector3(0.15, 0.04, (z() - 0.5) * 0.12), new THREE.Vector3(0.55, 0.03, 0.02),
  ]);
  const teile = [new THREE.TubeGeometry(kurve, 12, 0.025, 6, false)];
  for (const t of [0.3, 0.65]) {
    const a = kurve.getPoint(t);
    const b = a.clone().add(new THREE.Vector3(0.12, 0.02, (z() - 0.5) * 0.3 + 0.12));
    teile.push(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 2, 0.012, 5, false));
  }
  return teile;
}

export function erzeugeFundstuecke(rindenMaterial) {
  const z = zufall(77);
  const gruppe = new THREE.Group();
  gruppe.name = 'fundstuecke';
  const mat = rindenMaterial ?? new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95 });
  const objekte = new Map();
  for (const f of FUNDE) {
    const g = new THREE.Group();
    for (const geo of astGeometrie(z)) {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      g.add(m);
    }
    g.position.set(f.x, hoeheBei(f.x, f.z), f.z);
    g.rotation.y = z() * Math.PI * 2;
    gruppe.add(g);
    objekte.set(f.id, g);
  }
  return {
    objekt: gruppe,
    entferne(id) { const g = objekte.get(id); if (g) { g.visible = false; } },
    zuruecklegen(id) { const g = objekte.get(id); if (g) g.visible = true; },
    liegtNoch: (id) => objekte.get(id)?.visible ?? false,
  };
}
