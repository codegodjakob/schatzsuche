// Die Spielfigur: ein Mensch mit nichts als einem Lendenschurz.
// Zwei Startfiguren: 'er' und 'sie'. Gebaut aus einfachen Körpern,
// bis es echte Modelle gibt (siehe docs/SPIELIDEE.md, offene Fragen).
import * as THREE from 'three';

const HAUT = { er: 0xc28f6c, sie: 0xd2a07e };
const HAAR = { er: 0x3a2a1c, sie: 0x5a3b22 };

function teil(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// Ein Gelenk: eine leere Gruppe am Drehpunkt, das Glied hängt darunter
function glied(laenge, radius, mat) {
  const gelenk = new THREE.Group();
  const geo = new THREE.CapsuleGeometry(radius, laenge - radius * 2, 4, 10);
  gelenk.add(teil(geo, mat, 0, -laenge / 2, 0));
  return gelenk;
}

export function erzeugeFigur(art = 'er') {
  const sie = art === 'sie';
  const haut = new THREE.MeshStandardMaterial({ color: HAUT[art], roughness: 0.65 });
  const haar = new THREE.MeshStandardMaterial({ color: HAAR[art], roughness: 0.9 });
  const leder = new THREE.MeshStandardMaterial({ color: 0x5b4127, roughness: 0.95 });

  const figur = new THREE.Group();
  figur.name = 'figur';
  const schulter = sie ? 0.19 : 0.22;
  const huefte = sie ? 0.11 : 0.1;

  // Rumpf
  const rumpf = new THREE.Group();
  rumpf.position.y = 0.98;
  figur.add(rumpf);
  const brust = teil(new THREE.CapsuleGeometry(sie ? 0.15 : 0.17, 0.32, 4, 12), haut, 0, 0.33, 0);
  brust.scale.set(sie ? 1.05 : 1.15, 1, 0.72);
  const becken = teil(new THREE.CapsuleGeometry(0.15, 0.08, 4, 12), haut, 0, 0.04, 0);
  becken.scale.set(sie ? 1.12 : 1.02, 1, 0.75);
  rumpf.add(brust, becken);

  // Lendenschurz: ein Gurt und zwei Lederlappen
  rumpf.add(teil(new THREE.CylinderGeometry(0.165, 0.17, 0.06, 16), leder, 0, 0.1, 0));
  const lappen = new THREE.BoxGeometry(0.2, 0.26, 0.02);
  const vorne = teil(lappen, leder, 0, -0.06, 0.12);
  const hinten = teil(lappen, leder, 0, -0.06, -0.12);
  rumpf.add(vorne, hinten);
  if (sie) rumpf.add(teil(new THREE.CylinderGeometry(0.16, 0.16, 0.09, 16).scale(1.05, 1, 0.75), leder, 0, 0.42, 0.005));

  // Kopf und Hals
  const kopf = new THREE.Group();
  kopf.position.y = 0.66;
  rumpf.add(kopf);
  kopf.add(teil(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), haut, 0, -0.02, 0));
  const schaedel = teil(new THREE.SphereGeometry(0.11, 20, 16), haut, 0, 0.12, 0);
  schaedel.scale.set(0.9, 1.08, 1);
  kopf.add(schaedel);
  const haarKappe = teil(new THREE.SphereGeometry(0.115, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), haar, 0, 0.13, -0.008);
  haarKappe.scale.set(0.93, 1.08, 1.02);
  kopf.add(haarKappe);
  if (sie) {
    const zopf = teil(new THREE.CapsuleGeometry(0.035, 0.28, 4, 8), haar, 0, -0.02, -0.11);
    zopf.rotation.x = 0.25;
    kopf.add(zopf);
  }

  // Arme und Beine mit Ellbogen und Knien
  const gliedmassen = {};
  for (const seite of [-1, 1]) {
    const oberarm = glied(0.3, 0.05, haut);
    oberarm.position.set(seite * schulter, 0.5, 0);
    const unterarm = glied(0.28, 0.042, haut);
    unterarm.position.y = -0.3;
    oberarm.add(unterarm);
    rumpf.add(oberarm);

    const oberschenkel = glied(0.44, 0.075, haut);
    oberschenkel.position.set(seite * huefte, 0, 0);
    const unterschenkel = glied(0.44, 0.055, haut);
    unterschenkel.position.y = -0.44;
    const fuss = teil(new THREE.BoxGeometry(0.08, 0.05, 0.2), haut, 0, -0.44, 0.05);
    unterschenkel.add(fuss);
    oberschenkel.add(unterschenkel);
    rumpf.add(oberschenkel);

    gliedmassen[seite] = { oberarm, unterarm, oberschenkel, unterschenkel };
  }

  // Bewegung: Gehen, Rennen, Stehen (Atmen)
  let phase = 0;
  function bewege(dt, tempo, inDerLuft) {
    const gang = Math.min(tempo / 5, 1);
    phase += dt * (3 + tempo * 1.6) * (tempo > 0.05 ? 1 : 0);
    for (const seite of [-1, 1]) {
      const g = gliedmassen[seite];
      const s = Math.sin(phase + (seite > 0 ? 0 : Math.PI));
      const schwung = tempo > 0.05 ? s * (0.35 + gang * 0.55) : 0;
      g.oberschenkel.rotation.x = inDerLuft ? -0.5 : -schwung;
      g.unterschenkel.rotation.x = inDerLuft ? 0.9 : Math.max(0, -Math.cos(phase + (seite > 0 ? 0 : Math.PI))) * (0.3 + gang * 0.9);
      g.oberarm.rotation.x = schwung * 0.8;
      g.oberarm.rotation.z = seite * 0.06;
      g.unterarm.rotation.x = -0.15 - gang * 0.9;
    }
    const atem = Math.sin(performance.now() * 0.002) * 0.006;
    rumpf.position.y = 0.98 + (tempo > 0.05 ? Math.abs(Math.cos(phase)) * 0.04 * gang : atem);
    rumpf.rotation.x = gang * 0.12;
  }

  return { objekt: figur, kopf, bewege, art };
}
