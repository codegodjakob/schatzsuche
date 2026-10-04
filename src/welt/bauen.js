// Bauen: Erdwall, Zaun, Palisade, Steinmauer, Standfackel, Unterstand. Man wählt im Menü (Herstellen) ein
// Bauwerk; dann steht eine durchscheinende Vorschau vor der Figur, quer zur Blickrichtung. „Benutzen“ setzt es
// hin (erst dann werden die Zutaten verbraucht), Esc oder B bricht ab. Ein Erdwall auf einem Erdwall macht ihn
// höher, wie aufgeschüttete Erde eben. Alles Gebaute steht im Spielstand und ist fest (man läuft nicht hindurch).
import * as THREE from 'three';
import { hoeheBei, wasserspiegel } from './gelaende.js';
import { hindernis, entferneHindernis, kreisFrei } from './kollision.js';
import { erzeugeFlamme } from './feuer.js';
import { zufall } from './zufall.js';
import { zeit } from './tageszeit.js';

const lader = new THREE.TextureLoader();
function textur(datei, wiederholen = 1) {
  const t = lader.load(new URL(`../../assets/boden/${datei}`, import.meta.url).href);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(wiederholen, wiederholen);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Länge (entlang der Wand), Tiefe, wie weit vor der Figur, Höhe
export const MASSE = {
  erdwall: { lang: 2.4, tief: 2.2, vor: 2.4, hoehe: 0.6, stufe: 0.5, max: 1.6 },
  zaun: { lang: 2.0, tief: 0.3, vor: 1.8, hoehe: 1.0 },
  palisade: { lang: 2.0, tief: 0.4, vor: 1.8, hoehe: 2.1 },
  steinmauer: { lang: 2.0, tief: 0.6, vor: 1.9, hoehe: 1.0 },
  standfackel: { lang: 0.3, tief: 0.3, vor: 1.4, hoehe: 1.6 },
  unterstand: { lang: 2.6, tief: 2.0, vor: 2.6, hoehe: 1.9 },
};
const FACKEL_STUNDEN = 72; // eine Standfackel reicht für drei Nächte (tagsüber brennt sie nicht)

export function erzeugeBauen({ szene, rinde, felsMaterial, spielStunde }) {
  const gruppe = new THREE.Group();
  gruppe.name = 'bauwerke';
  szene.add(gruppe);
  const mat = {
    erde: new THREE.MeshStandardMaterial({ map: textur('erde_farbe.jpg', 1.5), color: 0x9a7a5a, roughness: 1 }),
    holz: rinde ?? new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 }),
    hell: new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.85 }),
    stein: felsMaterial ?? new THREE.MeshStandardMaterial({ color: 0x8a867c, roughness: 0.9 }),
    lehm: new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 1 }),
    blatt: new THREE.MeshStandardMaterial({ color: 0x5c7a34, roughness: 0.9, side: THREE.DoubleSide }),
    pech: new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.95 }),
  };
  const geist = new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.35, depthWrite: false });
  const geistRot = new THREE.MeshBasicMaterial({ color: 0xff7060, transparent: true, opacity: 0.35, depthWrite: false });

  const bauwerke = []; // { art, x, z, dreh, hoehe, objekt, hindernisse, bis }
  const fackeln = []; // Standfackeln als Lichtquellen (wie Feuerstellen)

  // ---------------------------------------------------------------- Formen
  function erdwallForm(h, saat) {
    const m = MASSE.erdwall;
    const geo = new THREE.BoxGeometry(m.lang, 1, m.tief, 18, 1, 14);
    const pos = geo.attributes.position;
    const z = zufall(saat);
    const rauschen = Array.from({ length: 64 }, () => z());
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / (m.lang / 2), q = pos.getZ(i) / (m.tief / 2);
      // Querschnitt: oben gewölbt, an den Enden flach auslaufend
      // Aufgeschüttete Erde: flache Böschung (Glockenform), an den Enden ausgerundet
      const profil = Math.max(0, 1 - q * q) ** 1.7 * (1 - THREE.MathUtils.smoothstep(Math.abs(x), 0.35, 1.05) * 0.85);
      const r = rauschen[(i * 7) % 64] * 0.08;
      if (pos.getY(i) > 0) pos.setY(i, h * profil + r * h);
      else pos.setY(i, -0.3);
      pos.setZ(i, pos.getZ(i) * (1 + 0.15 * (1 - Math.abs(q))));
    }
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, mat.erde);
  }

  function pfahl(x, unten, oben, r, material, spitze = false) {
    const g = new THREE.Group();
    const stamm = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, oben - unten, 7), material);
    stamm.position.set(x, (unten + oben) / 2, 0);
    g.add(stamm);
    if (spitze) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(r, r * 3, 7), mat.hell);
      s.position.set(x, oben + r * 1.5, 0);
      g.add(s);
    }
    return g;
  }

  function quer(laenge, y, r, material, z = 0, neigung = 0) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r, laenge, 6), material);
    s.rotation.z = Math.PI / 2 + neigung;
    s.position.set(0, y, z);
    return s;
  }

  const FORMEN = {
    erdwall: (b) => erdwallForm(b.hoehe, Math.round(b.x * 13 + b.z * 7)),
    zaun: () => {
      const g = new THREE.Group();
      for (const x of [-0.95, -0.32, 0.32, 0.95]) g.add(pfahl(x, -0.2, 1.0, 0.035, mat.holz));
      for (const y of [0.3, 0.55, 0.8]) g.add(quer(2.0, y, 0.022, mat.holz, (y * 10) % 2 ? 0.03 : -0.03, (y - 0.5) * 0.04));
      return g;
    },
    palisade: (b) => {
      const g = new THREE.Group();
      const z = zufall(Math.round(b.x * 3 + b.z * 5));
      for (let i = 0; i < 9; i++) g.add(pfahl(-0.9 + i * 0.225, -0.3, 1.8 + z() * 0.25, 0.1, mat.holz, true));
      g.add(quer(2.0, 0.6, 0.03, mat.hell, 0.11), quer(2.0, 1.4, 0.03, mat.hell, 0.11));
      return g;
    },
    steinmauer: (b) => {
      const g = new THREE.Group();
      const z = zufall(Math.round(b.x * 11 + b.z * 3));
      const stein = new THREE.DodecahedronGeometry(0.5, 0);
      for (let reihe = 0; reihe < 4; reihe++) {
        for (let i = 0; i < 5; i++) {
          const s = new THREE.Mesh(stein, mat.stein);
          s.scale.set(0.42 + z() * 0.1, 0.26 + z() * 0.06, 0.55 + z() * 0.1);
          s.position.set(-0.8 + i * 0.4 + (reihe % 2) * 0.2 - (reihe % 2 && i === 4 ? 0.2 : 0), 0.1 + reihe * 0.24, (z() - 0.5) * 0.05);
          s.rotation.set(z() * 0.3, z() * 3, z() * 0.3);
          g.add(s);
        }
      }
      // Lehm in den Fugen, hinter den Steinen
      const fuge = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.8, 0.22), mat.lehm);
      fuge.position.y = 0.38;
      g.add(fuge);
      return g;
    },
    standfackel: () => {
      const g = new THREE.Group();
      g.add(pfahl(0, -0.3, 1.45, 0.025, mat.holz));
      const kopf = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.16, 8), mat.pech);
      kopf.position.y = 1.5;
      g.add(kopf);
      return g;
    },
    unterstand: () => {
      // Pultdach auf vier Pfosten: vorn hoch, hinten niedrig, mit Ästen und Laub gedeckt
      const g = new THREE.Group();
      for (const [x, z, h] of [[-1.15, -0.85, 1.9], [1.15, -0.85, 1.9], [-1.15, 0.85, 1.1], [1.15, 0.85, 1.1]]) {
        const p = pfahl(x, -0.3, h, 0.06, mat.holz);
        p.position.z = z;
        g.add(p);
      }
      const dach = new THREE.Group();
      dach.position.set(0, 1.5, 0);
      dach.rotation.x = Math.atan2(0.8, 1.7);
      for (let i = 0; i < 12; i++) {
        const ast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 2.1, 5), mat.holz);
        ast.rotation.x = Math.PI / 2;
        ast.position.x = -1.25 + i * (2.5 / 11);
        dach.add(ast);
      }
      const laub = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.2, 6, 4), mat.blatt);
      laub.rotation.x = -Math.PI / 2;
      laub.position.y = 0.05;
      const lp = laub.geometry.attributes.position;
      const z = zufall(5);
      for (let i = 0; i < lp.count; i++) lp.setZ(i, (z() - 0.5) * 0.08);
      laub.geometry.computeVertexNormals();
      dach.add(laub);
      g.add(dach);
      return g;
    },
  };

  function baueObjekt(b) {
    const o = FORMEN[b.art](b);
    o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    o.position.set(b.x, hoeheBei(b.x, b.z), b.z);
    o.rotation.y = b.dreh;
    return o;
  }

  // Wo die Wand Kreise zum Anstoßen braucht (entlang ihrer Länge)
  function stoss(b) {
    const m = MASSE[b.art];
    if (b.art === 'standfackel') return [hindernis(b.x, b.z, 0.12)];
    if (b.art === 'unterstand') {
      // nur die Pfosten; darunter kann man stehen und liegen
      return [[-1.15, -0.85], [1.15, -0.85], [-1.15, 0.85], [1.15, 0.85]].map(([lx, lz]) => {
        const c = Math.cos(b.dreh), s = Math.sin(b.dreh);
        return hindernis(b.x + lx * c + lz * s, b.z - lx * s + lz * c, 0.12);
      });
    }
    const liste = [];
    const n = Math.ceil(m.lang / 0.45);
    for (let i = 0; i <= n; i++) {
      const t = -m.lang / 2 + (m.lang * i) / n;
      liste.push(hindernis(b.x + Math.cos(b.dreh) * t, b.z - Math.sin(b.dreh) * t, Math.max(0.22, m.tief / 2)));
    }
    return liste;
  }

  function stelleAuf(b) {
    b.objekt = baueObjekt(b);
    gruppe.add(b.objekt);
    b.hindernisse = stoss(b);
    if (b.art === 'standfackel') {
      const flamme = erzeugeFlamme();
      gruppe.add(flamme.objekt);
      const ort = new THREE.Vector3(b.x, hoeheBei(b.x, b.z) + 1.56, b.z);
      let t = Math.random() * 10, hell = 0;
      b.fackel = {
        ort, brennt: () => spielStunde() < b.bis && zeit.hell < 0.6, // tagsüber ausgeblasen, nachts an
        feuer: {
          helligkeit: () => hell,
          aktualisiere(dt, wind) {
            t += dt;
            hell = 3.2 + Math.sin(t * 11) * 0.4 + Math.sin(t * 6.7) * 0.3;
            flamme.aktualisiere(dt, ort, wind);
          },
        },
        flamme,
      };
      fackeln.push(b.fackel);
    }
    bauwerke.push(b);
  }

  function reisseAb(b) {
    gruppe.remove(b.objekt);
    for (const h of b.hindernisse) entferneHindernis(h);
    if (b.fackel) { gruppe.remove(b.fackel.flamme.objekt); fackeln.splice(fackeln.indexOf(b.fackel), 1); }
    bauwerke.splice(bauwerke.indexOf(b), 1);
  }

  // ---------------------------------------------------------------- Planen und Setzen
  let plan = null; // { art, objekt (Vorschau), x, z, dreh, grund (warum nicht) , auf (Erdwall, der höher wird) }

  function beginne(art) {
    abbrechen();
    const objekt = FORMEN[art]({ art, x: 0, z: 0, dreh: 0, hoehe: MASSE[art].hoehe });
    objekt.traverse((m) => { if (m.isMesh) m.material = geist; });
    gruppe.add(objekt);
    plan = { art, objekt, x: 0, z: 0, dreh: 0, grund: 'Einen Augenblick …', auf: null, steht: false };
  }

  function abbrechen() {
    if (plan) gruppe.remove(plan.objekt);
    plan = null;
  }

  // Vorschau vor die Figur stellen. ort: Füße, blick: Drehung der Figur (wohin sie schaut)
  function schritt(dt, ort, blick) {
    if (!plan) return;
    const m = MASSE[plan.art];
    let x = ort.x + Math.sin(blick) * m.vor, z = ort.z + Math.cos(blick) * m.vor;
    let dreh = blick; // die Wand steht quer zur Blickrichtung
    // Auf einen nahen Erdwall schütten: Vorschau rastet auf ihm ein
    plan.auf = null;
    if (plan.art === 'erdwall') {
      const da = bauwerke.find((b) => b.art === 'erdwall' && Math.hypot(b.x - x, b.z - z) < 1.1);
      if (da) { plan.auf = da; x = da.x; z = da.z; dreh = da.dreh; }
    }
    plan.x = x; plan.z = z; plan.dreh = dreh; plan.steht = true;
    plan.grund = pruefe(plan);
    plan.objekt.position.set(x, hoeheBei(x, z) + (plan.auf ? plan.auf.hoehe * 0.7 : 0), z);
    plan.objekt.rotation.y = dreh;
    plan.objekt.traverse((o) => { if (o.isMesh) o.material = plan.grund ? geistRot : geist; });
  }

  function pruefe(p) {
    const m = MASSE[p.art];
    if (p.auf) return p.auf.hoehe + m.stufe > m.max + 0.01 ? 'Höher geht der Wall nicht.' : null;
    const wsp = wasserspiegel();
    const punkte = [];
    for (const t of [-0.5, 0, 0.5]) punkte.push([p.x + Math.cos(p.dreh) * t * m.lang, p.z - Math.sin(p.dreh) * t * m.lang]);
    if (punkte.some(([x, z]) => hoeheBei(x, z) < wsp + 0.05)) return 'Im Wasser kann man nicht bauen.';
    const hoehen = punkte.map(([x, z]) => hoeheBei(x, z));
    if (Math.max(...hoehen) - Math.min(...hoehen) > 0.9) return 'Hier ist es zu steil.';
    if (!kreisFrei(p.x, p.z, Math.min(m.lang, m.tief) / 2 + 0.1)) return 'Hier steht etwas im Weg.';
    return null;
  }

  // Setzt das geplante Bauwerk. Gibt true zurück, wenn es steht.
  function setze() {
    if (!plan || !plan.steht || plan.grund) return false;
    if (plan.auf) {
      const b = plan.auf;
      b.hoehe = Math.min(MASSE.erdwall.max, b.hoehe + MASSE.erdwall.stufe);
      gruppe.remove(b.objekt);
      b.objekt = baueObjekt(b);
      gruppe.add(b.objekt);
    } else {
      stelleAuf({ art: plan.art, x: plan.x, z: plan.z, dreh: plan.dreh, hoehe: MASSE[plan.art].hoehe, bis: spielStunde() + FACKEL_STUNDEN });
    }
    abbrechen();
    return true;
  }

  // Abgebrannte Standfackeln: Der Stab bleibt stehen, die Flamme ist aus
  function schrittFackeln() {
    for (const f of fackeln) f.flamme.objekt.visible = f.brennt();
  }

  return {
    objekt: gruppe,
    beginne, abbrechen, schritt, setze, schrittFackeln,
    fackeln,
    get plan() { return plan; },
    get grund() { return plan?.grund ?? null; },
    alle: () => bauwerke,
    // Ein Unterstand in der Nähe (darunter schläft man auch ohne Feuer)
    unterstandBei: (ort) => bauwerke.find((b) => b.art === 'unterstand' && Math.hypot(b.x - ort.x, b.z - ort.z) < 2.6),
    speichern: () => bauwerke.map((b) => ({ art: b.art, x: +b.x.toFixed(2), z: +b.z.toFixed(2), dreh: +b.dreh.toFixed(3), hoehe: b.hoehe, bis: b.bis })),
    laden(liste) {
      for (const b of [...bauwerke]) reisseAb(b);
      for (const b of liste ?? []) if (FORMEN[b.art]) stelleAuf({ ...b });
    },
  };
}
