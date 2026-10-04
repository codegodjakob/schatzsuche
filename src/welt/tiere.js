// Tiere: Füchse streifen durch den Wald. Sie schnuppern, gehen ein Stück, schnuppern wieder; kommt man ihnen
// zu nahe, rennen sie davon. Mit Pfeil und Bogen (oder einer Waffe, wenn man nah genug herankommt) kann man
// sie jagen. Was sie hergeben, steht bei jeder Art. Erlegte Tiere kommen nach ein paar Tagen wieder.
//
// Modell: Fuchs aus den glTF-Beispielen der Khronos Group (Modell PixelMannen, CC0; Bewegungen tomkranis,
// Umwandlung @AsoboStudio und @scurest, CC-BY 4.0), siehe docs/QUELLEN.md.
import * as THREE from 'three';
import { clone as klonen } from 'three/addons/utils/SkeletonUtils.js';
import { ladeModell } from '../modelle.js';
import { hoeheBei, waldDichte, wasserspiegel } from './gelaende.js';
import { schiebeHinaus } from './kollision.js';
import { zeit } from './tageszeit.js';
import { zufall as saatZufall } from './zufall.js';

export const ARTEN = {
  fuchs: {
    name: 'Fuchs', datei: 'fuchs.glb', massstab: 0.0105, leben: 14, scheu: 14, tempo: { gehen: 0.9, rennen: 6.5 },
    bewegungen: { stehen: 'Survey', gehen: 'Walk', rennen: 'Run' },
    beute: { fleisch: 1, fell: 1 }, erfahrung: 15, wiederkehr: 2, anzahl: 18,
  },
};

const jetzt = () => zeit.tag + zeit.stunde / 24;
const SICHT = 90;

export function erzeugeTiere({ szene, beiErlegt = () => {} }) {
  const gruppe = new THREE.Group();
  gruppe.name = 'tiere';
  szene.add(gruppe);
  const alle = [];
  const erlegt = new Map(); // id -> Spielzeit, ab der es wieder da ist

  async function lade() {
    const z = saatZufall(9090);
    const wsp = wasserspiegel();
    for (const [art, def] of Object.entries(ARTEN)) {
      const gltf = await ladeModell(new URL(`../../assets/tiere/${def.datei}`, import.meta.url).href);
      gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
      for (let i = 0, versuche = 0; i < def.anzahl && versuche < 4000; versuche++) {
        const x = (z() - 0.5) * 700, zz = (z() - 0.5) * 700;
        if (waldDichte(x, zz) < 0.35 || hoeheBei(x, zz) < wsp + 0.3 || Math.hypot(x, zz) < 40) continue;
        const objekt = klonen(gltf.scene);
        objekt.scale.setScalar(def.massstab);
        const mischer = new THREE.AnimationMixer(objekt);
        const aktionen = Object.fromEntries(Object.entries(def.bewegungen).map(([n, clip]) => {
          const a = mischer.clipAction(gltf.animations.find((c) => c.name === clip));
          a.play(); a.setEffectiveWeight(n === 'stehen' ? 1 : 0);
          return [n, a];
        }));
        const t = { id: `${art}-${i}`, art, def, objekt, mischer, aktionen, heimat: { x, z: zz }, ziel: null, zustand: 'stehen', uhr: z() * 4, blick: z() * 6.28, leben: def.leben, tempo: 0 };
        objekt.position.set(x, hoeheBei(x, zz), zz);
        gruppe.add(objekt);
        alle.push(t);
        if ((erlegt.get(t.id) ?? 0) > jetzt()) objekt.visible = false;
        i++;
      }
    }
  }

  function setzeBewegung(t, name) {
    for (const [n, a] of Object.entries(t.aktionen)) a.setEffectiveWeight(n === name ? 1 : 0);
  }

  function schritt(dt, spieler) {
    for (const t of alle) {
      const o = t.objekt;
      if (t.zustand === 'tot') {
        t.uhr += dt;
        if (t.uhr > 20) o.visible = false;
        if (jetzt() >= (erlegt.get(t.id) ?? Infinity) && Math.hypot(spieler.x - t.heimat.x, spieler.z - t.heimat.z) > 60) {
          erlegt.delete(t.id);
          t.zustand = 'stehen'; t.leben = t.def.leben; o.rotation.z = 0; o.visible = true;
          o.position.set(t.heimat.x, hoeheBei(t.heimat.x, t.heimat.z), t.heimat.z);
        }
        continue;
      }
      if (!o.visible && (erlegt.get(t.id) ?? 0) > jetzt()) continue;
      const dx = spieler.x - o.position.x, dz = spieler.z - o.position.z, d = Math.hypot(dx, dz);
      if (d > SICHT) { o.visible = false; continue; }
      o.visible = true;
      t.uhr -= dt;
      let tempo = 0;
      if (d < t.def.scheu && t.zustand !== 'flieht') { t.zustand = 'flieht'; t.uhr = 4 + Math.random() * 3; }
      if (t.zustand === 'flieht') {
        // weg vom Spieler, ein wenig im Zickzack
        const weg = Math.atan2(-dx, -dz) + Math.sin(t.uhr * 3) * 0.4;
        t.ziel = { x: o.position.x + Math.sin(weg) * 10, z: o.position.z + Math.cos(weg) * 10 };
        tempo = t.def.tempo.rennen;
        if (t.uhr <= 0 && d > t.def.scheu * 1.5) { t.zustand = 'stehen'; t.uhr = 2 + Math.random() * 3; }
      } else if (t.zustand === 'stehen') {
        if (t.uhr <= 0) {
          // ein Stück umherstreifen, aber in der Nähe der Heimat bleiben
          const w = Math.random() * 6.28, r = 4 + Math.random() * 12;
          t.ziel = { x: t.heimat.x + Math.sin(w) * r, z: t.heimat.z + Math.cos(w) * r };
          t.zustand = 'geht';
        }
      } else if (t.zustand === 'geht') {
        tempo = t.def.tempo.gehen;
        if (Math.hypot(t.ziel.x - o.position.x, t.ziel.z - o.position.z) < 0.6) { t.zustand = 'stehen'; t.uhr = 3 + Math.random() * 6; }
      }
      if (t.ziel && tempo > 0) {
        const rx = t.ziel.x - o.position.x, rz = t.ziel.z - o.position.z, l = Math.hypot(rx, rz) || 1;
        o.position.x += (rx / l) * tempo * dt;
        o.position.z += (rz / l) * tempo * dt;
        const soll = Math.atan2(rx, rz);
        let diff = soll - t.blick;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        t.blick += diff * Math.min(1, dt * 6);
      }
      schiebeHinaus(o.position, 0.25);
      if (hoeheBei(o.position.x, o.position.z) < wasserspiegel() + 0.1) { t.zustand = 'stehen'; t.uhr = 1; }
      o.position.y = hoeheBei(o.position.x, o.position.z);
      o.rotation.y = t.blick;
      t.tempo = tempo;
      setzeBewegung(t, tempo > 3 ? 'rennen' : tempo > 0 ? 'gehen' : 'stehen');
      t.mischer.update(dt * (tempo > 3 ? 1.1 : 1));
    }
  }

  // Ein Treffer (Pfeil oder Waffe): Schaden auf das Tier an diesem Ort. Gibt das Tier zurück, wenn eins getroffen wurde.
  function treffe(t, schaden) {
    if (!t || t.zustand === 'tot') return null;
    t.leben -= schaden;
    if (t.leben > 0) { t.zustand = 'flieht'; t.uhr = 6; return t; }
    t.zustand = 'tot';
    t.uhr = 0;
    t.objekt.rotation.z = Math.PI / 2; // liegt auf der Seite
    t.objekt.position.y += 0.08;
    setzeBewegung(t, 'stehen');
    erlegt.set(t.id, jetzt() + t.def.wiederkehr);
    beiErlegt(t);
    return t;
  }

  // Das erste Tier auf einer Linie (für Pfeile): von, richtung (Länge 1), bis (Meter)
  function aufLinie(von, richtung, bis) {
    let beste = null, bt = bis;
    const p = new THREE.Vector3();
    for (const t of alle) {
      if (t.zustand === 'tot' || !t.objekt.visible) continue;
      p.copy(t.objekt.position).y += 0.3;
      const rel = p.sub(von);
      const s = rel.dot(richtung);
      if (s < 0 || s > bt) continue;
      const nah = rel.addScaledVector(richtung, -s).length();
      if (nah < 0.45) { bt = s; beste = t; }
    }
    return beste ? { tier: beste, abstand: bt } : null;
  }

  // Für die Nahkampfwaffe: ein Tier in Reichweite vor einem
  function naechstes(ort, bis) {
    let beste = null, d = bis;
    for (const t of alle) {
      if (t.zustand === 'tot' || !t.objekt.visible) continue;
      const e = Math.hypot(t.objekt.position.x - ort.x, t.objekt.position.z - ort.z);
      if (e < d) { d = e; beste = t; }
    }
    return beste;
  }

  return {
    objekt: gruppe, lade, schritt, treffe, aufLinie, naechstes,
    get alle() { return alle; },
    speichern: () => ({ erlegt: [...erlegt] }),
    laden(d) {
      erlegt.clear();
      for (const [id, bis] of d?.erlegt ?? []) erlegt.set(id, bis);
    },
  };
}
