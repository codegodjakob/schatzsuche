// Waffen und Werkzeug, die eine Figur in der rechten Hand trägt: Speer, Messer, Axt, Keulen.
// Einfache Formen aus Holz und Stein; sie hängen am Handknochen und schwingen mit jeder Bewegung mit.
import * as THREE from 'three';

const holz = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.85 });
const dunkelHolz = new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.9 });
const stein = new THREE.MeshStandardMaterial({ color: 0x8a867c, roughness: 0.75 });
const eisen = new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.45, metalness: 0.7 });
const schnur = new THREE.MeshStandardMaterial({ color: 0x9a8a62, roughness: 1 });

// Ein Stab entlang +Y von unten bis oben, mit Radius r (unten) und r2 (oben)
function stab(unten, oben, r, r2 = r, mat = holz) {
  const geo = new THREE.CylinderGeometry(r2, r, oben - unten, 8);
  geo.translate(0, (unten + oben) / 2, 0);
  return new THREE.Mesh(geo, mat);
}

// Jede Form zeigt mit dem Griff in den Ursprung und mit dem Kopf nach +Y
const FORMEN = {
  speer: () => {
    const g = new THREE.Group();
    g.add(stab(-0.55, 1.05, 0.016, 0.014));
    const spitze = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.14, 6), holz);
    spitze.position.y = 1.12;
    g.add(spitze);
    return g;
  },
  steinmesser: () => {
    const g = new THREE.Group();
    g.add(stab(-0.06, 0.06, 0.014, 0.012, dunkelHolz));
    const klinge = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.17, 4), stein);
    klinge.scale.set(1, 1, 0.35);
    klinge.position.y = 0.145;
    g.add(klinge);
    return g;
  },
  steinaxt: () => {
    const g = new THREE.Group();
    g.add(stab(-0.12, 0.45, 0.017, 0.015));
    const kopf = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.17), stein);
    kopf.position.set(0, 0.42, 0.05);
    g.add(kopf);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 4, 10), schnur);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.36;
    g.add(band);
    return g;
  },
  keule: () => {
    const g = new THREE.Group();
    g.add(stab(-0.1, 0.55, 0.018, 0.05, dunkelHolz));
    const knauf = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), dunkelHolz);
    knauf.position.y = 0.55;
    g.add(knauf);
    return g;
  },
  eisenkeule: () => {
    const g = new THREE.Group();
    g.add(stab(-0.12, 0.62, 0.02, 0.055, dunkelHolz));
    for (const y of [0.4, 0.5, 0.6]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.008, 4, 12), eisen);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      g.add(ring);
    }
    const knauf = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eisen);
    knauf.position.y = 0.64;
    g.add(knauf);
    return g;
  },
};

FORMEN.angelrute = () => {
  const g = new THREE.Group();
  g.add(stab(-0.3, 2.0, 0.014, 0.005, holz));
  const rolle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 4, 10), schnur);
  rolle.position.y = 0.05;
  g.add(rolle);
  return g;
};

export const hatForm = (id) => id in FORMEN;

// Baut eine Form für sich (z. B. die Angelrute, die beim Angeln frei geführt wird)
export function baueForm(id) {
  const form = FORMEN[id]();
  form.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  return form;
}

// Hängt eine Waffe an die rechte Hand einer Figur (ersetzt die vorige). id = null: leere Hand.
// Der Griff liegt in der Faust, quer zur Hand, vom kleinen Finger zum Zeigefinger.
export function inDieHand(figur, id) {
  const hand = figur.rechteHand;
  if (!hand) return null;
  const alt = hand.getObjectByName('waffe');
  if (alt) hand.remove(alt);
  if (!id || !FORMEN[id]) return null;
  const waffe = baueForm(id);
  waffe.name = 'waffe';
  waffe.userData.form = id;
  const mitte = hand.getObjectByName('middle_01_r')?.position ?? new THREE.Vector3(0, -0.09, 0);
  const zeige = hand.getObjectByName('index_01_r')?.position;
  const klein = hand.getObjectByName('pinky_01_r')?.position;
  // Faust: etwas vor dem Ansatz des Mittelfingers
  waffe.position.copy(mitte).multiplyScalar(0.85);
  const achse = zeige && klein ? zeige.clone().sub(klein).normalize() : new THREE.Vector3(0, 0, 1);
  waffe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), achse);
  hand.add(waffe);
  return waffe;
}
