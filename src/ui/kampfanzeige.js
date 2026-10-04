// Was man im Kampf sieht: Lebensbalken über den Köpfen der Gegner, aufsteigende Schadenszahlen,
// ein großer Balken für Bosse und ein roter Rand, wenn man selbst getroffen wird.
import * as THREE from 'three';

const KOPFHOEHE = { raeuber: 2.0, hauptmann: 2.25 };

export function erzeugeKampfanzeige(kamera) {
  const ebene = document.getElementById('kampf');
  const boss = document.getElementById('boss');
  const rot = document.getElementById('rot');
  const balken = new Map(); // Gegner-id -> Element
  const v = new THREE.Vector3();

  // Weltort -> Bildschirm; null, wenn hinter der Kamera
  function aufSchirm(ort, hoehe = 0) {
    v.set(ort.x, ort.y + hoehe, ort.z).project(kamera);
    if (v.z > 1) return null;
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }

  function zahl(ort, text, art = '', hoehe = 1.9) {
    const p = aufSchirm(ort, hoehe);
    if (!p) return;
    const el = document.createElement('span');
    el.className = `schadenszahl ${art}`;
    el.textContent = text;
    el.style.left = `${p.x + (Math.random() - 0.5) * 30}px`;
    el.style.top = `${p.y}px`;
    ebene.append(el);
    setTimeout(() => el.remove(), 950);
  }

  let rotUhr = null;
  function blitzen() {
    rot.classList.add('an');
    clearTimeout(rotUhr);
    rotUhr = setTimeout(() => rot.classList.remove('an'), 120);
  }

  // Jedes Bild: Balken über den Köpfen der Gegner, die kämpfen oder verletzt sind
  function aktualisiere(gegner, spielerOrt) {
    let bossZeigen = null;
    for (const g of gegner) {
      const o = g.objekt;
      let el = balken.get(g.id);
      const d = Math.hypot(o.position.x - spielerOrt.x, o.position.z - spielerOrt.z);
      const kaempft = g.zustand === 'jagen' || g.zustand === 'ausholen' || g.zustand === 'getroffen';
      const zeigen = g.zustand !== 'tot' && o.visible && d < 30 && (kaempft || g.leben < g.def.leben);
      if (g.def.boss && zeigen && kaempft) bossZeigen = g;
      const p = zeigen && !g.def.boss ? aufSchirm(o.position, KOPFHOEHE[g.art] ?? 2) : null;
      if (!p) { if (el) el.hidden = true; continue; }
      if (!el) {
        el = document.createElement('div');
        el.className = 'feind-balken';
        el.append(document.createElement('i'));
        ebene.append(el);
        balken.set(g.id, el);
      }
      el.hidden = false;
      el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      el.firstChild.style.width = `${Math.max(0, g.leben / g.def.leben) * 100}%`;
    }
    // Balken von Gegnern, die es nicht mehr gibt (Wegelagerer, die fort sind), entfernen
    for (const [id, el] of balken) {
      if (gegner.some((g) => g.id === id)) continue;
      el.remove();
      balken.delete(id);
    }
    boss.hidden = !bossZeigen;
    if (bossZeigen) {
      document.getElementById('boss-name').textContent = bossZeigen.def.name;
      boss.querySelector('i').style.width = `${Math.max(0, bossZeigen.leben / bossZeigen.def.leben) * 100}%`;
    }
  }

  return { zahl, blitzen, aktualisiere, kopfhoehe: (art) => KOPFHOEHE[art] ?? 2 };
}
