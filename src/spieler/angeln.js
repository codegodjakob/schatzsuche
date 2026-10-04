// Angeln: Mit einer Angelrute am Ufer „Benutzen“, und die Figur wirft aus: Sie holt mit der Rute aus,
// lässt sie nach vorn schnellen, und der Schwimmer fliegt in hohem Bogen aufs Wasser. Dort treibt er,
// bis er zuckt (Biss!). Dann schnell noch einmal „Benutzen“, und ein Fisch hängt am Haken.
// Wer zu früh oder zu spät zieht, geht leer aus; wer losläuft, holt die Angel ein.
import * as THREE from 'three';
import { benenne } from '../inhalte/gegenstaende.js';
import { hoeheBei, wasserspiegel } from '../welt/gelaende.js';
import { baueForm } from '../welt/waffen.js';

// Welche Fische wie oft anbeißen (große werden mit der Berufsstufe häufiger)
const FISCHE = [['rotauge', 50, 0], ['barsch', 30, 0.05], ['forelle', 15, 0.12], ['hecht', 5, 0.2]];
const zufall = (a, b) => a + Math.random() * (b - a);
const RUTE = 2.0; // Länge vom Griff bis zur Spitze (wie die Form in src/welt/waffen.js)
const RUHE = 0.6; // so steil hält man die Rute beim Warten (Bogenmaß über der Waagerechten)
const FLUG = [0.8, 1.25]; // wann der Schwimmer durch die Luft fliegt (Sekunden nach dem Auswerfen)
const ZIEHEN = 0.6; // so lange dauert das Hochreißen nach einem Fang
const OBEN = new THREE.Vector3(0, 1, 0);
const glatt = (a, b, t) => THREE.MathUtils.lerp(a, b, THREE.MathUtils.smootherstep(t, 0, 1));

// Wie steil die Rute beim Auswerfen steht (über π/2 zeigt sie nach hinten): ausholen, nach vorn
// schnellen, zur Ruhe kommen. Passt zum Hieb, den die Figur dabei macht.
function wurfNeigung(t) {
  if (t < 0.5) return glatt(RUHE, 1.9, t / 0.5);
  if (t < 0.8) return glatt(1.9, 0.15, (t - 0.5) / 0.3);
  if (t < 1.1) return glatt(0.15, RUHE, (t - 0.8) / 0.3);
  return RUHE;
}

export function erzeugeAngeln({ szene, steuerung, inventar, fortschritt, figur, nachricht = () => {}, gewinn = () => {}, beiBiss = () => {}, beiWurf = () => {} }) {
  const wsp = wasserspiegel();
  // Die Rute hängt nicht starr an der Hand wie eine Waffe, sondern zeigt schräg nach vorn übers Wasser
  const rute = baueForm('angelrute');
  rute.visible = false;
  szene.add(rute);
  const schwimmer = new THREE.Group();
  const halb = (oben, farbe) => new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, oben ? 0 : Math.PI / 2, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.4 }),
  );
  schwimmer.add(halb(true, 0xc8322a), halb(false, 0xf0eeea));
  schwimmer.visible = false;
  szene.add(schwimmer);
  // Ringe auf dem Wasser: einmal, wenn der Schwimmer landet, und immer wieder, solange ein Fisch zieht
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.09, 0.12, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  szene.add(ring);
  function zeigeRing(anteil) {
    ring.visible = anteil < 1;
    ring.position.set(schwimmer.position.x, wsp + 0.006, schwimmer.position.z);
    ring.scale.setScalar(1 + anteil * 6);
    ring.material.opacity = (1 - anteil) * 0.55;
  }
  // Die Schnur von der Rutenspitze zum Schwimmer
  const schnurGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const schnur = new THREE.Line(schnurGeo, new THREE.LineBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.6 }));
  schnur.visible = false;
  schnur.frustumCulled = false;
  szene.add(schnur);

  let zustand = 'aus'; // aus | wartet | biss | zieht (nach einem Fang: Rute hochreißen)
  let uhr = 0, wurfUhr = 0, bissNach = 0, fenster = 0;
  const start = new THREE.Vector3();
  const ziel = new THREE.Vector3();
  const griff = new THREE.Vector3();
  const richtung = new THREE.Vector3();
  const spitze = new THREE.Vector3();
  const flugVon = new THREE.Vector3();
  const stufe = () => fortschritt.berufsStufe('fischen');

  // Wo landet der Schwimmer? Ein Stück vor der Figur, wo das Wasser tief genug ist
  function wurfziel(ort, wohin) {
    for (let d = 2.5; d <= 8; d += 0.5) {
      const x = ort.x + Math.sin(wohin) * d, z = ort.z + Math.cos(wohin) * d;
      if (hoeheBei(x, z) < wsp - 0.25) return new THREE.Vector3(x, wsp + 0.01, z);
    }
    return null;
  }

  // Zum Wasser hin auswerfen: in Blickrichtung, sonst dorthin, wo die Figur schaut
  function wasserVorn() {
    const z = steuerung.zustand;
    return wurfziel(z.ort, z.blickSeite + Math.PI) ?? (figur() ? wurfziel(z.ort, figur().objekt.rotation.y) : null);
  }

  // Die Rute in der rechten Hand, schräg nach vorn (etwas nach außen), mit der gegebenen Neigung
  function halteRute(neigung) {
    const f = figur();
    if (!f?.rechteHand) return;
    f.rechteHand.getWorldPosition(griff);
    const dreh = f.objekt.rotation.y + 0.15;
    richtung.set(Math.sin(dreh) * Math.cos(neigung), Math.sin(neigung), Math.cos(dreh) * Math.cos(neigung));
    rute.position.copy(griff);
    rute.quaternion.setFromUnitVectors(OBEN, richtung);
    spitze.copy(griff).addScaledVector(richtung, RUTE);
  }

  function wirfAus() {
    const f = figur();
    if (!f || zustand !== 'aus') return false;
    const z = steuerung.zustand;
    const wohin = wasserVorn();
    if (!wohin) { nachricht('Hier ist das Wasser zu flach. Stell dich ans Ufer und schau aufs Wasser.'); return false; }
    ziel.copy(wohin);
    steuerung.dreheZu(Math.atan2(ziel.x - z.ort.x, ziel.z - z.ort.z), 0.6);
    f.spiele('hieb', { tempo: 0.75, ein: 0.15, aus: 0.3 });
    rute.visible = true;
    schwimmer.visible = true;
    schnur.visible = true;
    start.copy(z.ort);
    zustand = 'wartet';
    uhr = 0;
    wurfUhr = 0;
    bissNach = Math.max(2, zufall(3, 9) * (1 - 0.04 * (stufe() - 1)));
    halteRute(RUHE);
    beiWurf(true);
    return true;
  }

  function einholen() {
    zustand = 'aus';
    rute.visible = false;
    schwimmer.visible = false;
    schnur.visible = false;
    ring.visible = false;
    beiWurf(false);
  }

  function fang() {
    const extra = stufe() - 1;
    const gewichte = FISCHE.map(([id, w, plus]) => [id, w * (1 + plus * extra * 3)]);
    let r = Math.random() * gewichte.reduce((s, [, w]) => s + w, 0);
    for (const [id, w] of gewichte) { r -= w; if (r <= 0) return id; }
    return 'rotauge';
  }

  // „Benutzen“ beim Angeln: ziehen
  function ziehe() {
    if (zustand === 'wartet') {
      nachricht('Zu früh gezogen! Der Schwimmer hatte sich noch nicht bewegt.');
      einholen();
      return false;
    }
    if (zustand !== 'biss') return false;
    const id = fang();
    if (inventar.gib(id, 1, { leise: true }) < 1) { einholen(); return false; }
    gewinn(`+${benenne(id)}`, id);
    gewinn(`+${fortschritt.gibErfahrung(id === 'hecht' ? 14 : id === 'forelle' ? 9 : 5, 'fischen')} Erfahrung`, 'erfahrung');
    // Die Rute hochreißen; der Schwimmer kommt aus dem Wasser geflogen
    zustand = 'zieht';
    uhr = 0;
    flugVon.copy(schwimmer.position);
    ring.visible = false;
    return true;
  }

  function zeichneSchnur() {
    schnurGeo.attributes.position.setXYZ(0, spitze.x, spitze.y, spitze.z);
    schnurGeo.attributes.position.setXYZ(1, schwimmer.position.x, schwimmer.position.y + 0.04, schwimmer.position.z);
    schnurGeo.attributes.position.needsUpdate = true;
  }

  function schritt(dt) {
    if (zustand === 'aus') return;
    uhr += dt;
    if (zustand === 'zieht') {
      const t = Math.min(1, uhr / ZIEHEN);
      halteRute(glatt(RUHE, 1.45, Math.min(1, t * 2.5)));
      schwimmer.position.lerpVectors(flugVon, spitze, t).y += Math.sin(t * Math.PI) * 0.8;
      zeichneSchnur();
      if (t >= 1) einholen();
      return;
    }
    const vorher = wurfUhr;
    wurfUhr += dt;
    const z = steuerung.zustand;
    if (Math.hypot(z.ort.x - start.x, z.ort.z - start.z) > 0.6) { nachricht('Du holst die Angel ein.'); einholen(); return; }
    halteRute(wurfNeigung(wurfUhr));
    if (wurfUhr < FLUG[0]) {
      // Beim Ausholen baumelt der Schwimmer an der Spitze
      schwimmer.position.copy(spitze).y -= 0.35;
    } else if (wurfUhr < FLUG[1]) {
      // im Bogen von der Spitze aufs Wasser
      if (vorher < FLUG[0]) flugVon.copy(spitze);
      const t = (wurfUhr - FLUG[0]) / (FLUG[1] - FLUG[0]);
      schwimmer.position.lerpVectors(flugVon, ziel, t).y += Math.sin(t * Math.PI) * 1.2;
    } else {
      // Auf dem Wasser: Der Schwimmer schaukelt; beim Biss taucht er ruckartig unter
      let y = wsp + 0.01 + Math.sin(uhr * 2.2) * 0.006;
      if (zustand === 'wartet' && uhr >= bissNach) {
        zustand = 'biss';
        uhr = 0;
        fenster = 1.0 + 0.06 * (stufe() - 1);
        beiBiss();
      }
      if (zustand === 'biss') {
        y -= 0.05 + Math.abs(Math.sin(uhr * 18)) * 0.04;
        if (uhr > fenster) { nachricht('Zu spät! Der Fisch hat den Köder geschnappt und ist weg.'); einholen(); return; }
        zeigeRing((uhr * 1.7) % 1);
      } else {
        zeigeRing(Math.min(1, (wurfUhr - FLUG[1]) / 0.9));
      }
      schwimmer.position.set(ziel.x, y, ziel.z);
    }
    zeichneSchnur();
  }

  return {
    wirfAus, ziehe, einholen, schritt, rute,
    get aktiv() { return zustand === 'wartet' || zustand === 'biss'; },
    get biss() { return zustand === 'biss'; },
    // Solange die Rute zu sehen ist, bleibt die Waffenhand leer
    get haeltRute() { return zustand !== 'aus'; },
    kannAngeln: () => inventar.hat('angelrute'),
    // Ginge hier ein Wurf? (Für den Knopf „Angel auswerfen“)
    kannWerfen: () => zustand === 'aus' && inventar.hat('angelrute') && !!wasserVorn(),
  };
}
