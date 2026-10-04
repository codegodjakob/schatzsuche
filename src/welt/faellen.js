// Bäume fällen: Mit der Axt schlägt man eine Kerbe in den Stamm. Nach genug Schlägen (dicke Bäume brauchen
// mehr) kippt der Baum, erst langsam, dann immer schneller, vom Spieler weg, und schlägt auf. Dann liegt er da:
// Erst hackt man die Äste ab (gibt Äste), dann zerteilt man den Stamm (gibt Holzscheite). Zurück bleibt ein
// Stumpf. Nach zwei Spieltagen treibt dort ein junger Baum aus, der in fünf Tagen groß wird.
import * as THREE from 'three';
import { hoeheBei } from './gelaende.js';
import { druecke } from './bodenspuren.js';
import { zeit } from './tageszeit.js';

const jetzt = () => zeit.tag + zeit.stunde / 24;
export const AUSTREIBEN = 2; // Tage, bis aus dem Stumpf ein junger Baum treibt
export const AUFWACHSEN = 5; // Tage, bis er wieder groß ist
const ASTSCHLAEGE = 2; // so oft „Äste abhacken“
const STAMMSCHLAEGE = 3; // so oft „Stamm zerteilen“

// Jahresringe für die Schnittflächen
let ringBild = null;
function jahresringe() {
  if (ringBild) return ringBild;
  const g = 128, c = document.createElement('canvas');
  c.width = c.height = g;
  const k = c.getContext('2d');
  k.fillStyle = '#c9a777';
  k.fillRect(0, 0, g, g);
  for (let r = 4; r < g / 2; r += 3 + Math.random() * 3) {
    k.strokeStyle = `rgba(120, 82, 45, ${0.25 + Math.random() * 0.3})`;
    k.lineWidth = 1 + Math.random();
    k.beginPath();
    k.ellipse(g / 2, g / 2, r, r * (0.95 + Math.random() * 0.08), Math.random(), 0, Math.PI * 2);
    k.stroke();
  }
  const rand = k.createRadialGradient(g / 2, g / 2, g * 0.42, g / 2, g / 2, g / 2);
  rand.addColorStop(0, 'rgba(70, 48, 30, 0)');
  rand.addColorStop(1, 'rgba(70, 48, 30, 1)');
  k.fillStyle = rand;
  k.fillRect(0, 0, g, g);
  ringBild = new THREE.CanvasTexture(c);
  ringBild.colorSpace = THREE.SRGBColorSpace;
  return ringBild;
}

// Wie dick ist der Stamm unten? (aus der Rindenform: die Punkte nahe am Boden)
function stammRadius(form) {
  const pos = form.rinde.getAttribute('position');
  let r = 0, n = 0;
  for (let i = 0; i < pos.count; i += 3) {
    const y = pos.getY(i);
    if (y > 0.5 && y < 4) { r += Math.hypot(pos.getX(i), pos.getZ(i)); n++; }
  }
  return Math.max(0.06, Math.min(0.5, (n ? r / n : 1.5) * form.s));
}

export function erzeugeFaellen({ szene, baeume, holzMaterial }) {
  const gruppe = new THREE.Group();
  gruppe.name = 'faellen';
  szene.add(gruppe);
  const ringMat = new THREE.MeshStandardMaterial({ map: jahresringe(), roughness: 0.9 });
  const kerben = new Map(); // nr -> Schläge bisher
  const stuempfe = new Map(); // nr -> { objekt, seit, radius }
  const liegend = []; // umgestürzte Bäume
  const spaene = [];
  const spanGeo = new THREE.BoxGeometry(0.04, 0.012, 0.025);
  const spanMat = new THREE.MeshStandardMaterial({ color: 0xcfae7c, roughness: 0.9 });

  const noetig = (nr) => THREE.MathUtils.clamp(Math.round(baeume.form(nr).s * 22), 3, 8);

  function stumpf(nr, radius, seit) {
    const f = baeume.form(nr);
    const g = new THREE.Group();
    const hoehe = 0.35 + radius * 0.6;
    const rinde = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.92, radius * 1.15, hoehe, 12, 1, true), holzMaterial ?? f.rindenMat);
    rinde.position.y = hoehe / 2 - 0.05;
    const schnitt = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.92, 16), ringMat);
    schnitt.rotation.x = -Math.PI / 2;
    schnitt.rotation.z = 0.25; // schräg wie ein echter Axtschnitt
    schnitt.position.y = hoehe - 0.05;
    for (const m of [rinde, schnitt]) { m.castShadow = true; m.receiveShadow = true; }
    g.add(rinde, schnitt);
    g.position.set(f.x, hoeheBei(f.x, f.z), f.z);
    gruppe.add(g);
    stuempfe.set(nr, { objekt: g, seit, radius });
  }

  function spaeneFliegen(ort, richtung) {
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(spanGeo, spanMat);
      m.position.copy(ort);
      const v = new THREE.Vector3(richtung.x * 1.5 + (Math.random() - 0.5) * 2, 1.2 + Math.random() * 1.5, richtung.z * 1.5 + (Math.random() - 0.5) * 2);
      m.userData = { v, dreh: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12), alter: 0 };
      gruppe.add(m);
      spaene.push(m);
    }
  }

  // Ein Axtschlag gegen einen stehenden Baum. von: wo man steht. Ergebnis: { schlaege, noetig, faellt }
  function hacke(nr, von) {
    const f = baeume.form(nr);
    const n = (kerben.get(nr) ?? 0) + 1;
    kerben.set(nr, n);
    const zuMir = new THREE.Vector3(von.x - f.x, 0, von.z - f.z).normalize();
    spaeneFliegen(new THREE.Vector3(f.x, f.y + 0.7, f.z).addScaledVector(zuMir, stammRadius(f)), zuMir);
    const max = noetig(nr);
    if (n < max) return { schlaege: n, noetig: max, faellt: false };
    kerben.delete(nr);
    kippe(nr, zuMir.clone().negate());
    return { schlaege: n, noetig: max, faellt: true };
  }

  // Der Baum kippt in Richtung richtung (waagrecht, Länge 1)
  function kippe(nr, richtung) {
    const f = baeume.form(nr);
    const radius = stammRadius(f);
    baeume.setzeZustand(nr, { weg: true });
    stumpf(nr, radius, null);
    // Drehpunkt am Boden; der Baum selbst hängt darin mit seiner Drehung und Größe
    const dreh = new THREE.Group();
    dreh.position.set(f.x, f.y + 0.3, f.z);
    const baum = new THREE.Group();
    baum.rotation.y = f.drehung;
    baum.scale.setScalar(f.s);
    baum.position.y = -0.3;
    const rinde = new THREE.Mesh(f.rinde, f.rindenMat);
    const blaetter = new THREE.Mesh(f.blaetter, f.blattMat);
    blaetter.customDepthMaterial = f.tiefe;
    for (const m of [rinde, blaetter]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; }
    baum.add(rinde, blaetter);
    dreh.add(baum);
    gruppe.add(dreh);
    const achse = new THREE.Vector3(richtung.z, 0, -richtung.x); // waagrecht, quer zur Fallrichtung
    // Wie weit er fällt, bis er aufliegt: am Hang weniger oder mehr als 90°
    const weit = 6;
    const boden = hoeheBei(f.x + richtung.x * weit, f.z + richtung.z * weit) - hoeheBei(f.x, f.z);
    const ende = Math.PI / 2 - Math.atan2(boden, weit) - 0.04;
    liegend.push({ nr, dreh, baum, rinde, blaetter, achse, richtung, winkel: 0.015, tempo: 0, ende, liegt: false, aeste: 0, stamm: 0, form: f, radius, aufprall: 0 });
  }

  // Wo liegt der Stamm? (für „Benutzen“: auf der Linie vom Stumpf in Fallrichtung)
  function naechsterLiegender(ort) {
    let beste = null, bd = Infinity;
    for (const l of liegend) {
      if (!l.liegt) continue;
      const lang = l.stamm > 0 ? 4 : 7 * Math.min(1.4, l.form.s * 6);
      const dx = ort.x - l.form.x, dz = ort.z - l.form.z;
      const t = THREE.MathUtils.clamp(dx * l.richtung.x + dz * l.richtung.z, 0.5, lang);
      const d = Math.hypot(dx - l.richtung.x * t, dz - l.richtung.z * t);
      if (d < 1.8 && d < bd) { bd = d; beste = l; }
    }
    return beste;
  }

  // Was man an einem liegenden Baum tun kann: { text, kurz, art: 'aeste'|'stamm', liegend } oder null
  function vorschlag(ort) {
    const l = naechsterLiegender(ort);
    if (!l) return null;
    return l.aeste < ASTSCHLAEGE
      ? { text: 'Äste abhacken', kurz: 'Abhacken', art: 'aeste', liegend: l }
      : { text: 'Stamm zerteilen', kurz: 'Zerteilen', art: 'stamm', liegend: l };
  }

  // Ein Schlag am liegenden Baum. Gibt zurück, was dabei abfällt: { ast } oder { holzscheit }
  function bearbeite(l, von) {
    const mitte = new THREE.Vector3(l.form.x, 0, l.form.z).addScaledVector(l.richtung, l.aeste < ASTSCHLAEGE ? 4 : 2);
    mitte.y = hoeheBei(mitte.x, mitte.z) + 0.3;
    spaeneFliegen(mitte, new THREE.Vector3(von.x - mitte.x, 0, von.z - mitte.z).normalize());
    if (l.aeste < ASTSCHLAEGE) {
      l.aeste++;
      if (l.aeste === ASTSCHLAEGE) zumStamm(l);
      return { ast: 2 };
    }
    l.stamm++;
    if (l.stamm >= STAMMSCHLAEGE) {
      gruppe.remove(l.dreh);
      liegend.splice(liegend.indexOf(l), 1);
      wurdeLeer(l);
    } else {
      // Der Stamm wird kürzer
      l.klotz.scale.y = 1 - l.stamm / STAMMSCHLAEGE * 0.6;
    }
    return { holzscheit: 2 };
  }

  // Nach dem Abhacken der Äste bleibt ein nackter Stamm liegen
  function zumStamm(l) {
    l.baum.visible = false;
    const lang = Math.min(6, 2.5 + l.form.s * 14);
    const r = l.radius * 0.9;
    const klotz = new THREE.Group();
    const mantel = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r, lang, 12, 1, true), holzMaterial ?? l.form.rindenMat);
    mantel.position.y = lang / 2;
    const unten = new THREE.Mesh(new THREE.CircleGeometry(r, 14), ringMat);
    unten.rotation.x = Math.PI / 2;
    const oben = new THREE.Mesh(new THREE.CircleGeometry(r * 0.75, 14), ringMat);
    oben.rotation.x = -Math.PI / 2;
    oben.position.y = lang;
    for (const m of [mantel, unten, oben]) { m.castShadow = true; m.receiveShadow = true; }
    klotz.add(mantel, unten, oben);
    l.dreh.add(klotz);
    l.klotz = klotz;
  }

  let wurdeLeer = () => {};

  function schritt(dt) {
    for (const l of liegend) {
      if (l.liegt) continue;
      // Ein kippender Baum ist wie ein umfallender Stab: je schräger, desto schneller
      l.tempo += Math.sin(l.winkel + 0.05) * 2.2 * dt;
      l.winkel += l.tempo * dt;
      if (l.winkel >= l.ende) {
        l.winkel = l.ende;
        if (l.tempo > 0.4 && l.aufprall < 1) { l.tempo = -l.tempo * 0.18; l.aufprall++; } // federt einmal nach
        else { l.liegt = true; druecke(l.form.x + l.richtung.x * 4, l.form.z + l.richtung.z * 4, 3, 0.6); }
      }
      l.dreh.quaternion.setFromAxisAngle(l.achse, l.winkel);
    }
    for (let i = spaene.length - 1; i >= 0; i--) {
      const m = spaene[i], d = m.userData;
      d.alter += dt;
      d.v.y -= 9.8 * dt;
      m.position.addScaledVector(d.v, dt);
      m.rotation.x += d.dreh.x * dt; m.rotation.y += d.dreh.y * dt; m.rotation.z += d.dreh.z * dt;
      const boden = hoeheBei(m.position.x, m.position.z) + 0.01;
      if (m.position.y < boden) { m.position.y = boden; d.v.set(0, 0, 0); d.dreh.set(0, 0, 0); }
      if (d.alter > 6) { gruppe.remove(m); spaene.splice(i, 1); }
    }
  }

  // Einmal je Spielstunde: Aus Stümpfen treiben junge Bäume, junge Bäume wachsen
  function wachsen() {
    const t = jetzt();
    for (const [nr, st] of stuempfe) {
      if (st.seit === null) st.seit = t;
      const alter = t - st.seit - AUSTREIBEN;
      if (alter < 0) continue;
      if (st.objekt.parent) gruppe.remove(st.objekt);
      const w = Math.min(1, 0.12 + 0.88 * alter / AUFWACHSEN);
      baeume.setzeZustand(nr, { weg: false, wuchs: w });
      if (w >= 1) stuempfe.delete(nr);
    }
  }

  return {
    objekt: gruppe,
    hacke, vorschlag, bearbeite, schritt, wachsen, noetig,
    istGefaellt: (nr) => stuempfe.has(nr) && baeume.baum(nr).weg,
    // Ein Baum, der gerade nachwächst, ist noch zu jung zum Fällen
    istJung: (nr) => baeume.baum(nr).wuchs < 0.6,
    kerbe: (nr) => kerben.get(nr) ?? 0,
    beiLeer(fn) { wurdeLeer = fn; },
    speichern: () => ({ stuempfe: [...stuempfe].map(([nr, st]) => [nr, st.seit ?? jetzt(), Math.round(st.radius * 1000) / 1000]) }),
    laden(daten) {
      for (const l of liegend) gruppe.remove(l.dreh);
      liegend.length = 0;
      for (const [nr, st] of stuempfe) { gruppe.remove(st.objekt); baeume.setzeZustand(nr, { weg: false, wuchs: 1 }); }
      stuempfe.clear();
      kerben.clear();
      for (const [nr, seit, radius] of daten?.stuempfe ?? []) {
        baeume.setzeZustand(nr, { weg: true });
        stumpf(nr, radius, seit);
      }
      wachsen();
    },
  };
}
