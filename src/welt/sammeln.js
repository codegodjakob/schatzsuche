// Alles, was man in der Welt aufheben, pflücken oder abbauen kann: Äste, Steine, Pilze, Blumen,
// Beeren und Bäume. Jede Stelle hat einen festen Namen (für den Spielstand), einen Ort und eine
// Art aus src/inhalte/sammelstellen.js. Was genommen wurde, verschwindet und wächst nach einigen
// Spieltagen nach. Was man dafür bekommt, entscheidet src/spieler/benutzen.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SAMMELSTELLEN } from '../inhalte/sammelstellen.js';
import { hoeheBei, maskeBei, neigungBei, waldDichte, wasserspiegel } from './gelaende.js';
import { felsForm } from './natur.js';
import { druecke } from './bodenspuren.js';
import { erzeugeFunkeln } from './funkeln.js';
import { ALTER_BAUM, BEERENSTRAEUCHER, GEWAESSER, LAGER, START } from './orte.js';
import { zeit } from './tageszeit.js';
import { zufall } from './zufall.js';

const ZELLE = 4; // Raster zum schnellen Finden naher Stellen (Meter)
// So nah muss man herankommen (Meter, von der Mitte der Figur aus)
const REICHWEITE = { ast: 1.5, stein: 1.4, pilz: 1.4, kamille: 1.3, johanniskraut: 1.3, flachs: 1.3, beeren: 2.2 };

// Äste, die schon immer am Weg zum Lager lagen (die ersten drei braucht man für den Einsiedler)
const ALTE_AESTE = [[-30, 58], [-46, 70], [-66, 74], [-20, 47], [18, 38], [-48, 98], [40, 30]];

const AM_BODEN = new Set(['ast', 'stein', 'pilz']);

const jetzt = () => zeit.tag + zeit.stunde / 24;

// ---------------------------------------------------------------- Aussehen

function astGeometrie(z) {
  // ein krummer, trockener Ast mit zwei Seitenzweigen
  const kurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.55, 0.03, 0), new THREE.Vector3(-0.2, 0.05, (z() - 0.5) * 0.1),
    new THREE.Vector3(0.15, 0.04, (z() - 0.5) * 0.12), new THREE.Vector3(0.55, 0.03, 0.02),
  ]);
  const teile = [new THREE.TubeGeometry(kurve, 12, 0.032, 6, false)];
  for (const t of [0.3, 0.65]) {
    const a = kurve.getPoint(t);
    const b = a.clone().add(new THREE.Vector3(0.12, 0.02, (z() - 0.5) * 0.3 + 0.12));
    teile.push(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 2, 0.016, 5, false));
  }
  return mergeGeometries(teile);
}

// Steinpilz: dicker, heller Stiel, brauner Hut, darunter gelblicher Schwamm
function pilzGeometrie() {
  const profil = (punkte) => punkte.map(([r, y]) => new THREE.Vector2(r, y));
  const stiel = new THREE.LatheGeometry(profil([
    [0.0, 0.0], [0.026, 0.0], [0.033, 0.012], [0.034, 0.03], [0.03, 0.055], [0.024, 0.08], [0.021, 0.095],
  ]), 12);
  const hut = new THREE.LatheGeometry(profil([
    [0.018, 0.09], [0.04, 0.089], [0.058, 0.094], [0.066, 0.103], [0.064, 0.115], [0.052, 0.128], [0.03, 0.137], [0.0, 0.14],
  ]), 16);
  const faerbe = (geo, farbe) => {
    const n = geo.attributes.normal, liste = [];
    for (let i = 0; i < n.count; i++) liste.push(...farbe(n.getY(i)));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(liste, 3));
  };
  faerbe(stiel, () => [0.78, 0.72, 0.6]);
  faerbe(hut, (ny) => (ny < -0.2 ? [0.78, 0.7, 0.45] : [0.36, 0.21, 0.11]));
  return mergeGeometries([stiel, hut]);
}

// Viele gleiche Dinge mit einem einzigen Zeichenaufruf; einzelne lassen sich ausblenden
function instanzen(geo, mat, matrizen, schatten = true) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, matrizen.length));
  mesh.count = matrizen.length;
  matrizen.forEach((m, k) => mesh.setMatrixAt(k, m));
  mesh.castShadow = schatten;
  mesh.receiveShadow = true;
  const leer = new THREE.Matrix4().makeScale(0, 0, 0);
  return {
    mesh,
    zeige(k, sichtbar) {
      mesh.setMatrixAt(k, sichtbar ? matrizen[k] : leer);
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------- Wo was liegt

// Sucht Plätze nach einer Regel; liegt einer in einem Stamm, wird er verworfen. (Nur Bäume zählen,
// nicht die Felsen: deren Zahl hängt von der Grafikstufe ab, die Plätze sollen es nicht.)
function suche(z, anzahl, passt, frei, versuche = anzahl * 60) {
  const plaetze = [];
  const wsp = wasserspiegel();
  for (let i = 0; i < versuche && plaetze.length < anzahl; i++) {
    const w = z() * Math.PI * 2, r = z();
    const x = START.x + Math.cos(w) * r * 130, zz = START.z + Math.sin(w) * r * 130;
    if (!passt(x, zz, z)) continue;
    if (hoeheBei(x, zz) < wsp + 0.15 || neigungBei(x, zz) > 0.6 || !frei(x, zz)) continue;
    plaetze.push({ x, z: zz });
  }
  return plaetze;
}

// Liegt ein Punkt frei, also in keinem Stamm und keinem Busch?
function freiVonBaeumen(hindernisse) {
  const zellen = new Map();
  for (const h of hindernisse) {
    const k = `${Math.floor(h.x / ZELLE)},${Math.floor(h.z / ZELLE)}`;
    if (!zellen.has(k)) zellen.set(k, []);
    zellen.get(k).push(h);
  }
  return (x, z) => {
    const ix = Math.floor(x / ZELLE), iz = Math.floor(z / ZELLE);
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        for (const h of zellen.get(`${ix + a},${iz + b}`) ?? []) if (Math.hypot(h.x - x, h.z - z) < h.radius + 0.25) return false;
      }
    }
    return true;
  };
}

const abstand = (x, z, ort) => Math.hypot(x - ort.x, z - ort.z);
const nichtAmTeich = (x, z) => GEWAESSER.every((g) => abstand(x, z, g) > g.radius + 3);
const nichtImLager = (x, z) => abstand(x, z, LAGER) > 3;

function astPlaetze(frei) {
  const z = zufall(501);
  const neue = suche(z, 60, (x, zz) => {
    const d = abstand(x, zz, START);
    const w = waldDichte(x, zz);
    return d > 20 && d < 125 && w > 0.12 && nichtImLager(x, zz) && nichtAmTeich(x, zz);
  }, frei);
  // ein paar unter dem alten Baum
  const unterBaum = [[2.6, 0.8], [-1.8, 2.4], [0.9, -2.9]].map(([dx, dz]) => ({ x: ALTER_BAUM.x + dx, z: ALTER_BAUM.z + dz }));
  return [...ALTE_AESTE.map(([x, zz]) => ({ x, z: zz })), ...unterBaum, ...neue];
}

function steinPlaetze(frei) {
  const z = zufall(502);
  return suche(z, 55, (x, zz) => {
    const d = abstand(x, zz, START);
    const boden = maskeBei(x, zz);
    return d > 6 && d < 120 && (boden.erde > 0.3 || boden.fels > 0.15 || z() < 0.12) && nichtAmTeich(x, zz) && nichtImLager(x, zz);
  }, frei);
}

function pilzPlaetze(frei) {
  const z = zufall(503);
  const kerne = suche(z, 22, (x, zz) => {
    const d = abstand(x, zz, START);
    return d > 35 && d < 130 && waldDichte(x, zz) > 0.4 && nichtImLager(x, zz);
  }, frei);
  // Pilze wachsen gern zu zweit oder zu dritt
  const plaetze = [];
  for (const k of kerne) {
    plaetze.push(k);
    const mehr = Math.floor(z() * 3);
    for (let i = 0; i < mehr; i++) plaetze.push({ x: k.x + (z() - 0.5) * 1.4, z: k.z + (z() - 0.5) * 1.4 });
  }
  return plaetze;
}

// ---------------------------------------------------------------- Das Register

export function erzeugeSammeln({ natur, baeume }) {
  const gruppe = new THREE.Group();
  gruppe.name = 'sammeln';
  const stellen = [];
  const nachName = new Map();
  const raster = new Map();
  const genommen = new Map(); // Stelle -> Spielzeit, ab der sie wieder da ist

  // Was am Boden liegt, soll man sehen: Dort steht das Gras niedrig, und ab und zu blitzt es auf
  const funkelPunkte = [];
  let funkeln = null;
  function neueStelle(id, art, x, z, zeige = null, reichweite = REICHWEITE[art]) {
    if (AM_BODEN.has(art)) {
      druecke(x, z, art === 'ast' ? 0.9 : 0.55);
      const i = funkelPunkte.length;
      funkelPunkte.push({ x, y: hoeheBei(x, z) + 0.12, z });
      const nurZeigen = zeige;
      zeige = (ja) => { nurZeigen?.(ja); funkeln?.zeige(i, ja); };
    }
    const stelle = { id, art, x, z, reichweite, zeige };
    stellen.push(stelle);
    nachName.set(id, stelle);
    const k = `${Math.floor(x / ZELLE)},${Math.floor(z / ZELLE)}`;
    if (!raster.has(k)) raster.set(k, []);
    raster.get(k).push(stelle);
    return stelle;
  }

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const z = zufall(504);
  const frei = freiVonBaeumen(baeume.hindernisse);

  // Äste: drei verschiedene Formen
  {
    const formen = [astGeometrie(z), astGeometrie(z), astGeometrie(z)];
    const mat = baeume.rinde ? baeume.rinde.clone() : new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95 });
    const proForm = formen.map(() => []);
    const zuordnung = astPlaetze(frei).map((pl, i) => {
      const f = i % formen.length;
      e.set(0, z() * Math.PI * 2, (z() - 0.5) * 0.1);
      m.compose(p.set(pl.x, hoeheBei(pl.x, pl.z), pl.z), q.setFromEuler(e), s.setScalar(1.15 + z() * 0.35));
      proForm[f].push(m.clone());
      return { pl, f, k: proForm[f].length - 1 };
    });
    const netze = formen.map((geo, f) => instanzen(geo, mat, proForm[f]));
    for (const n of netze) gruppe.add(n.mesh);
    zuordnung.forEach(({ pl, f, k }, i) => neueStelle(`ast-${i}`, 'ast', pl.x, pl.z, (ja) => netze[f].zeige(k, ja)));
  }

  // Steine: zwei Formen, klein genug für die Hand
  if (natur.felsMaterial) {
    const formen = [felsForm(11, 2), felsForm(12, 2)];
    const proForm = formen.map(() => []);
    const zuordnung = steinPlaetze(frei).map((pl, i) => {
      const f = i % formen.length;
      const groesse = 0.11 + z() * 0.06;
      e.set((z() - 0.5) * 0.5, z() * Math.PI * 2, (z() - 0.5) * 0.5);
      m.compose(p.set(pl.x, hoeheBei(pl.x, pl.z) + groesse * 0.05, pl.z), q.setFromEuler(e), s.setScalar(groesse));
      proForm[f].push(m.clone());
      return { pl, f, k: proForm[f].length - 1 };
    });
    const netze = formen.map((geo, f) => instanzen(geo, natur.felsMaterial, proForm[f]));
    for (const n of netze) gruppe.add(n.mesh);
    zuordnung.forEach(({ pl, f, k }, i) => neueStelle(`stein-${i}`, 'stein', pl.x, pl.z, (ja) => netze[f].zeige(k, ja)));
  }

  // Steinpilze
  {
    const matrizen = [];
    const plaetze = pilzPlaetze(frei);
    for (const pl of plaetze) {
      e.set((z() - 0.5) * 0.25, z() * Math.PI * 2, (z() - 0.5) * 0.25);
      m.compose(p.set(pl.x, hoeheBei(pl.x, pl.z) - 0.01, pl.z), q.setFromEuler(e), s.setScalar(1.3 + z() * 0.7));
      matrizen.push(m.clone());
    }
    const netz = instanzen(pilzGeometrie(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), matrizen);
    gruppe.add(netz.mesh);
    plaetze.forEach((pl, k) => neueStelle(`pilz-${k}`, 'pilz', pl.x, pl.z, (ja) => netz.zeige(k, ja)));
  }

  // Blumen: Kamille, Johanniskraut, Flachs (aus natur.js)
  for (const art of natur.blumen?.arten ?? []) {
    art.plaetze.forEach((b, k) => {
      if (b.pflueckbar) neueStelle(`${art.art}-${b.nummer}`, art.art, b.x, b.z, (ja) => art.zeige(k, ja));
    });
  }

  // Beerensträucher
  BEERENSTRAEUCHER.forEach((b, i) => {
    neueStelle(`beeren-${i}`, 'beeren', b.x, b.z, (ja) => (ja ? natur.beeren.wachse(i) : natur.beeren.pfluecke(i)));
  });

  // Bäume: Äste abbrechen, mit der Axt Holz hacken. Sie verschwinden dabei nicht.
  baeume.hindernisse.forEach((h, i) => {
    if (h.art === 'baum') neueStelle(`baum-${i}`, 'baum', h.x, h.z, null, h.radius + 1.0);
  });

  funkeln = erzeugeFunkeln(funkelPunkte);
  gruppe.add(funkeln.objekt);

  // Die nächste freie Stelle in Reichweite; was vor einem liegt, zählt etwas mehr
  function naechste(ort, blickSeite = null) {
    const vx = blickSeite == null ? 0 : -Math.sin(blickSeite), vz = blickSeite == null ? 0 : -Math.cos(blickSeite);
    const ix = Math.floor(ort.x / ZELLE), iz = Math.floor(ort.z / ZELLE);
    let beste = null, besteWertung = Infinity;
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        for (const st of raster.get(`${ix + a},${iz + b}`) ?? []) {
          if (genommen.has(st)) continue;
          const dx = st.x - ort.x, dz = st.z - ort.z;
          const d = Math.hypot(dx, dz);
          if (d > st.reichweite) continue;
          const vorne = d > 0.01 ? (dx * vx + dz * vz) / d : 0;
          const wertung = d / st.reichweite - 0.3 * vorne;
          if (wertung < besteWertung) { besteWertung = wertung; beste = st; }
        }
      }
    }
    return beste;
  }

  function nimm(stelle, tage = SAMMELSTELLEN[stelle.art]?.nachwachsen ?? 1) {
    genommen.set(stelle, jetzt() + tage);
    stelle.zeige?.(false);
  }

  function wachsen() {
    const t = jetzt();
    for (const [stelle, bis] of genommen) {
      if (t >= bis) { genommen.delete(stelle); stelle.zeige?.(true); }
    }
  }

  // Für Prüfungen: die nächste freie Stelle einer Art, von einem Ort aus gesehen
  function findeArt(art, ort = START) {
    let beste = null, d = Infinity;
    for (const st of stellen) {
      if (st.art !== art || genommen.has(st)) continue;
      const di = Math.hypot(st.x - ort.x, st.z - ort.z);
      if (di < d) { d = di; beste = st; }
    }
    return beste;
  }

  return {
    objekt: gruppe,
    stellen,
    aktualisiere: (dt, hell, pixel) => funkeln.aktualisiere(dt, hell, pixel),
    naechste, nimm, wachsen, findeArt,
    stelle: (id) => nachName.get(id),
    istDa: (stelle) => !genommen.has(stelle),
    speichern: () => ({ genommen: [...genommen].map(([st, bis]) => [st.id, Math.round(bis * 1000) / 1000]) }),
    laden(daten) {
      for (const st of genommen.keys()) st.zeige?.(true);
      genommen.clear();
      for (const [id, bis] of daten?.genommen ?? []) {
        const st = nachName.get(id);
        if (st) { genommen.set(st, bis); st.zeige?.(false); }
      }
    },
  };
}
