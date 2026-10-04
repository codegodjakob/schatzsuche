// Feen im Moor: kleine leuchtende Wesen mit schimmernden Flügeln. Tagsüber sieht man nur ein paar, die sich
// im Schilf verstecken; in der Dämmerung und nachts tanzen sie als Lichter über Torf und Wasser. Kommt man
// ihnen nahe, umkreisen sie einen neugierig. Was man mit ihnen erlebt, steht in src/ereignisse/liste.js.
import * as THREE from 'three';
import { hoeheBei, wasserspiegel } from './gelaende.js';
import { MOOR } from './orte.js';
import { zeit } from './tageszeit.js';
import { zufall as saatZufall } from './zufall.js';

const FARBEN = [0xb8ffd0, 0xa8e8ff, 0xffe9a0, 0xe0c8ff];
const ANZAHL = 16;
const SICHT = 140;

// Weicher Lichtpunkt (für Schein und Kern)
function leuchtTextur() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const k = c.getContext('2d');
  const g = k.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  k.fillStyle = g;
  k.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Ein Flügel wie bei einer Libelle: zarte Haut mit Adern
function fluegelTextur() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const k = c.getContext('2d');
  k.translate(32, 120);
  const haut = k.createLinearGradient(0, 0, 0, -115);
  haut.addColorStop(0, 'rgba(255,255,255,0.55)');
  haut.addColorStop(1, 'rgba(200,240,255,0.15)');
  k.fillStyle = haut;
  k.beginPath();
  k.moveTo(0, 0);
  k.bezierCurveTo(-30, -40, -26, -100, 0, -116);
  k.bezierCurveTo(26, -100, 30, -40, 0, 0);
  k.fill();
  k.strokeStyle = 'rgba(255,255,255,0.7)';
  k.lineWidth = 1.2;
  for (const w of [-0.5, -0.2, 0.15, 0.45]) {
    k.beginPath();
    k.moveTo(0, -4);
    k.quadraticCurveTo(w * 30, -60, w * 22, -105);
    k.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function erzeugeFeen({ szene }) {
  const gruppe = new THREE.Group();
  gruppe.name = 'feen';
  szene.add(gruppe);
  const licht = leuchtTextur();
  const fluegelBild = fluegelTextur();
  const fluegelGeo = new THREE.PlaneGeometry(0.11, 0.22).translate(0, 0.11, 0);
  const z = saatZufall(4711);
  const wsp = wasserspiegel();
  const alle = [];

  for (let i = 0; i < ANZAHL; i++) {
    const w = z() * Math.PI * 2, r = Math.sqrt(z()) * MOOR.radius * 0.75;
    const heimat = { x: MOOR.x + Math.sin(w) * r, z: MOOR.z + Math.cos(w) * r };
    const farbe = new THREE.Color(FARBEN[i % FARBEN.length]);
    const fee = new THREE.Group();
    const schein = new THREE.Sprite(new THREE.SpriteMaterial({ map: licht, color: farbe, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    schein.scale.setScalar(0.9);
    const kern = new THREE.Sprite(new THREE.SpriteMaterial({ map: licht, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    kern.scale.setScalar(0.12);
    const fluegelMat = new THREE.MeshBasicMaterial({ map: fluegelBild, color: farbe, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const fluegel = [-1, 1].map((seite) => {
      const halter = new THREE.Group();
      const f = new THREE.Mesh(fluegelGeo, fluegelMat);
      f.rotation.z = seite * -0.9; // schräg nach oben und zur Seite
      halter.add(f);
      halter.userData.seite = seite;
      fee.add(halter);
      return halter;
    });
    fee.add(schein, kern);
    gruppe.add(fee);
    alle.push({
      fee, schein, kern, fluegel, fluegelMat, heimat,
      phase: z() * 100, tempo: 0.35 + z() * 0.3, weite: 2.5 + z() * 4,
      // tagsüber bleiben nur ein paar draußen
      tagaktiv: i % 4 === 0,
      blick: 0, nah: 0,
    });
  }

  // Ein einziges echtes Licht, bei der Fee, die einem am nächsten ist
  const lampe = new THREE.PointLight(0xc8ffe0, 0, 9, 1.6);
  gruppe.add(lampe);

  let uhr = 0;
  const ziel = new THREE.Vector3();

  function schritt(dt, ort) {
    uhr += dt;
    const nacht = 1 - THREE.MathUtils.smoothstep(zeit.hell, 0.15, 0.6); // 0 am Tag … 1 nachts
    const imSicht = Math.hypot(ort.x - MOOR.x, ort.z - MOOR.z) < MOOR.radius + SICHT;
    gruppe.visible = imSicht;
    if (!imSicht) { lampe.intensity = 0; return; }
    let naechste = null, nd = Infinity;
    for (const f of alle) {
      const sichtbar = f.tagaktiv || nacht > 0.05;
      f.fee.visible = sichtbar;
      if (!sichtbar) continue;
      const t = uhr * f.tempo + f.phase;
      // Schwebt in Schleifen um ihren Platz; nachts weiter und höher
      ziel.set(
        f.heimat.x + Math.sin(t) * f.weite + Math.sin(t * 2.3) * 0.6,
        0,
        f.heimat.z + Math.cos(t * 0.8) * f.weite + Math.cos(t * 3.1) * 0.5,
      );
      // Neugierig: Ist man nah, kreisen sie um einen herum
      const d = Math.hypot(ort.x - ziel.x, ort.z - ziel.z);
      f.nah += ((d < 9 && nacht > 0.3 ? 1 : 0) - f.nah) * Math.min(1, dt * 0.8);
      if (f.nah > 0.01) {
        const k = t * 1.7;
        ziel.x += (ort.x + Math.sin(k) * 1.8 - ziel.x) * f.nah;
        ziel.z += (ort.z + Math.cos(k) * 1.8 - ziel.z) * f.nah;
      }
      const boden = Math.max(hoeheBei(ziel.x, ziel.z), wsp);
      ziel.y = boden + 0.7 + nacht * 0.9 + Math.sin(t * 2.7) * 0.25 + f.nah * 0.6;
      if (f.fee.position.lengthSq() === 0) f.fee.position.copy(ziel);
      f.fee.position.lerp(ziel, Math.min(1, dt * 2.5));
      // Flügelschlag und Leuchten (ein leises Flackern)
      const schlag = Math.sin(uhr * 38 + f.phase) * 0.9;
      for (const h of f.fluegel) h.rotation.y = h.userData.seite * (0.4 + schlag);
      f.fee.rotation.y = Math.atan2(ziel.x - f.fee.position.x, ziel.z - f.fee.position.z);
      const flackern = 0.85 + 0.15 * Math.sin(uhr * 9 + f.phase * 3);
      f.schein.material.opacity = (0.18 + 0.82 * nacht) * flackern;
      f.schein.scale.setScalar(0.6 + nacht * 0.6);
      f.kern.material.opacity = 0.6 + 0.4 * nacht;
      f.fluegelMat.opacity = 0.5 + 0.3 * nacht;
      const e = f.fee.position.distanceTo(ziel.set(ort.x, ort.y ?? f.fee.position.y, ort.z));
      if (e < nd) { nd = e; naechste = f; }
    }
    if (naechste && nd < 40) {
      lampe.position.copy(naechste.fee.position);
      lampe.intensity = 2.5 * nacht;
    } else lampe.intensity = 0;
  }

  // Wie nah ist die nächste sichtbare Fee? (für Ereignisse)
  function abstand(ort) {
    let d = Infinity;
    for (const f of alle) if (f.fee.visible) d = Math.min(d, Math.hypot(f.fee.position.x - ort.x, f.fee.position.z - ort.z));
    return d;
  }

  return { objekt: gruppe, schritt, abstand, get alle() { return alle; } };
}
