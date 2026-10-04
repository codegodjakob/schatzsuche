// Felsen (echte Felstextur, Moos auf der Oberseite), Wildblumen und Beeren an den Sträuchern.
// Blumen und Beeren kann man pflücken (src/welt/sammeln.js); dafür gibt es hier ihre Plätze.
import * as THREE from 'three';
import { ladeModell } from '../modelle.js';
import { STUFEN } from '../qualitaet.js';
import { hoeheBei, maskeBei, neigungBei, pfadAbstand, wasserspiegel, WELT_GROESSE } from './gelaende.js';
import { DORF, GRAUFURT, LAGER, RAEUBERLAGER, START } from './orte.js';
import { zufall } from './zufall.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

const lader = new THREE.TextureLoader();
function textur(datei, farbe = true) {
  const t = lader.load(new URL(`../../assets/boden/${datei}`, import.meta.url).href);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (farbe) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- Felsen

export function felsForm(saat, feinheit = 4) {
  const geo = new THREE.IcosahedronGeometry(1, feinheit);
  const rauschen = new ImprovedNoise();
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  const streck = new THREE.Vector3(1 + (saat % 3) * 0.25, 0.55 + (saat % 2) * 0.2, 1 + ((saat + 1) % 3) * 0.2);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let r = 1;
    r += rauschen.noise(v.x * 1.3 + saat, v.y * 1.3, v.z * 1.3) * 0.35;
    r += rauschen.noise(v.x * 3.1, v.y * 3.1 + saat, v.z * 3.1) * 0.12;
    r += rauschen.noise(v.x * 7.0, v.y * 7.0, v.z * 7.0 + saat) * 0.04;
    v.multiplyScalar(r).multiply(streck);
    if (v.y < -0.15) v.y = -0.15 + (v.y + 0.15) * 0.3; // unten abgeflacht, steckt im Boden
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.deleteAttribute('uv');
  geo.computeVertexNormals();
  return geo;
}

export function felsMaterial() {
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  const farbe = textur('fels_farbe.jpg'), normal = textur('fels_normal.jpg', false), orm = textur('fels_orm.jpg', false);
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uFelsFarbe: { value: farbe }, uFelsNormal: { value: normal }, uFelsOrm: { value: orm } });
    shader.vertexShader = 'varying vec3 vObjOrt;\nvarying vec3 vObjNormale;\nvarying vec3 vWeltNormale;\nvarying mat3 vDreh;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', `#include <begin_vertex>
      vObjOrt = position;
      vObjNormale = normal;
      #ifdef USE_INSTANCING
        vDreh = mat3(instanceMatrix);
      #else
        vDreh = mat3(1.0);
      #endif
      vWeltNormale = normalize(mat3(modelMatrix) * vDreh * normal);
      vDreh = normalMatrix * vDreh; // Objekt -> Blickraum (für die Normalen im Fragment)`,
    );
    shader.fragmentShader = /* glsl */ `
      uniform sampler2D uFelsFarbe;
      uniform sampler2D uFelsNormal;
      uniform sampler2D uFelsOrm;
      varying vec3 vObjOrt;
      varying vec3 vObjNormale;
      varying vec3 vWeltNormale;
      varying mat3 vDreh;
      vec4 felsDrei(sampler2D t, vec3 p, vec3 n) {
        vec3 w = pow(abs(n), vec3(4.0)); w /= w.x + w.y + w.z;
        return texture2D(t, p.zy * 0.45) * w.x + texture2D(t, p.xz * 0.45) * w.y + texture2D(t, p.xy * 0.45) * w.z;
      }
    ` + shader.fragmentShader
      .replace('#include <map_fragment>', /* glsl */ `
        vec3 nO = normalize(vObjNormale);
        vec3 felsFarbe = felsDrei(uFelsFarbe, vObjOrt, nO).rgb;
        // Moos auf den nach oben zeigenden Flächen
        float moosFlecken = felsDrei(uFelsFarbe, vObjOrt * 0.31 + 3.7, nO).g;
        float moos = smoothstep(0.7, 0.95, normalize(vWeltNormale).y) * smoothstep(0.42, 0.6, moosFlecken);
        felsFarbe = mix(felsFarbe, vec3(0.09, 0.12, 0.04), moos * 0.7);
        diffuseColor.rgb *= felsFarbe;
      `)
      .replace('#include <roughnessmap_fragment>', `
        vec4 orm = felsDrei(uFelsOrm, vObjOrt, nO);
        float roughnessFactor = mix(orm.g, 0.95, moos);`)
      .replace('#include <aomap_fragment>', `
        reflectedLight.indirectDiffuse *= orm.r;
        #include <aomap_fragment>`)
      .replace('#include <normal_fragment_maps>', /* glsl */ `
        {
          vec3 w = pow(abs(nO), vec3(4.0)); w /= w.x + w.y + w.z;
          vec3 nx = texture2D(uFelsNormal, vObjOrt.zy * 0.45).xyz * 2.0 - 1.0;
          vec3 ny = texture2D(uFelsNormal, vObjOrt.xz * 0.45).xyz * 2.0 - 1.0;
          vec3 nz = texture2D(uFelsNormal, vObjOrt.xy * 0.45).xyz * 2.0 - 1.0;
          // Whiteout-Mischung der drei Projektionen (im Objektraum)
          vec3 bx = normalize(vec3(nx.xy + nO.zy, abs(nx.z) * nO.x));
          vec3 by = normalize(vec3(ny.xy + nO.xz, abs(ny.z) * nO.y));
          vec3 bz = normalize(vec3(nz.xy + nO.xy, abs(nz.z) * nO.z));
          vec3 nObj = normalize(bx.zyx * w.x + by.xzy * w.y + bz.xyz * w.z);
          nObj = normalize(mix(nObj, nO, moos * 0.6));
          normal = normalize(vDreh * nObj);
        }`);
  };
  return mat;
}

const imOrt = (x, z) => Math.hypot(x - DORF.x, z - DORF.z) < DORF.radius + 6
  || Math.hypot(x - GRAUFURT.x, z - GRAUFURT.z) < GRAUFURT.radius + 6
  || Math.hypot(x - LAGER.x, z - LAGER.z) < LAGER.radius + 2
  || Math.hypot(x - RAEUBERLAGER.x, z - RAEUBERLAGER.z) < RAEUBERLAGER.radius + 2
  || pfadAbstand(x, z) < 2.5;

function erzeugeFelsen(z, qualitaet) {
  const formen = [felsForm(1), felsForm(2), felsForm(3), felsForm(4)];
  const mat = felsMaterial();
  const gruppe = new THREE.Group();
  const wsp = wasserspiegel();
  const plaetze = formen.map(() => []);
  const ziel = Math.round(420 * Math.max(qualitaet.baeume, 0.5));
  let n = 0, versuche = 0;
  while (n < ziel && versuche < ziel * 40) {
    versuche++;
    const x = (z() - 0.5) * (WELT_GROESSE - 80), zz = (z() - 0.5) * (WELT_GROESSE - 80);
    const steil = neigungBei(x, zz);
    const d = Math.hypot(x - START.x, zz - START.z);
    const chance = 0.05 + steil * 0.9 + (d > 60 ? 0.05 : 0) - (d < 14 ? 1 : 0);
    if (z() > chance) continue;
    const y = hoeheBei(x, zz);
    if (y < wsp + 0.1) continue;
    const gross = z() ** 3, dreh = z() * 6.28, kipp = (z() - 0.5) * 0.4;
    // Nicht ins Dorf, nicht in die Lager, nicht auf Wege (erst nach dem Würfeln, damit alle anderen Felsen bleiben, wo sie sind)
    if (imOrt(x, zz)) continue;
    plaetze[n % formen.length].push({ x, y, z: zz, s: 0.25 + gross * 2.6, dreh, kipp });
    n++;
  }
  // ein paar große Findlinge am Rand der Wiese
  for (const [x, zz, s] of [[14, 26, 1.6], [-26, -8, 1.2], [22, -14, 0.9], [-9, 31, 0.7]]) {
    plaetze[0].push({ x, y: hoeheBei(x, zz), z: zz, s, dreh: x, kipp: 0.1 });
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  gruppe.userData.hindernisse = plaetze.flat().filter((f) => f.s > 0.45).map((f) => ({ x: f.x, z: f.z, radius: f.s * 0.95, fels: f }));
  gruppe.userData.material = mat;
  formen.forEach((geo, i) => {
    const liste = plaetze[i];
    const mesh = new THREE.InstancedMesh(geo, mat, liste.length);
    liste.forEach((f, k) => {
      f.mesh = mesh;
      f.k = k;
      e.set(f.kipp, f.dreh, f.kipp * 0.5);
      q.setFromEuler(e);
      s.setScalar(f.s);
      p.set(f.x, f.y - f.s * 0.12, f.z);
      m.compose(p, q, s);
      mesh.setMatrixAt(k, m);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    gruppe.add(mesh);
  });
  // Mit der Spitzhacke abgebaut: Der Fels wird kleiner (s = neue Größe, 0 = ganz fort)
  gruppe.userData.setzeGroesse = (f, groesse) => {
    f.s = groesse;
    e.set(f.kipp, f.dreh, f.kipp * 0.5);
    q.setFromEuler(e);
    s.setScalar(groesse);
    p.set(f.x, f.y - groesse * 0.12, f.z);
    m.compose(p, q, s);
    f.mesh.setMatrixAt(f.k, m);
    f.mesh.instanceMatrix.needsUpdate = true;
  };
  gruppe.userData.felsen = plaetze.flat();
  return gruppe;
}

// ---------------------------------------------------------------- Wildblumen

// Welche Blume welches Kraut ist: weiß die Kamille, gelb das Johanniskraut, blau der Flachs
const BLUMEN = [
  { datei: 'flower_white.glb', art: 'kamille' },
  { datei: 'flower_yellow.glb', art: 'johanniskraut' },
  { datei: 'flower_blue.glb', art: 'flachs' },
];
// Die Plätze hängen nicht von der Grafikstufe ab: Es wird immer gleich oft gewürfelt, gezeichnet
// werden nur die ersten. Pflücken lassen sich die Blumen, die auf jeder Stufe zu sehen sind.
const BLUMEN_VERSUCHE = 2000;
const blumenAnzahl = (qualitaet) => Math.min(BLUMEN_VERSUCHE, Math.round(1800 * qualitaet.gras + 200));

async function erzeugeBlumen(qualitaet) {
  const z = zufall(4244);
  const gruppe = new THREE.Group();
  const modelle = await Promise.all(BLUMEN.map((b) => ladeModell(new URL(`../../assets/natur/${b.datei}`, import.meta.url).href)));
  const wsp = wasserspiegel();
  const anzahl = blumenAnzahl(qualitaet);
  const pflueckbar = blumenAnzahl(STUFEN.niedrig);
  // Blumen wachsen in Grüppchen
  const gruppen = Array.from({ length: 70 }, () => {
    const w = z() * 6.28, r = 6 + Math.sqrt(z()) * 70;
    return { x: START.x + Math.cos(w) * r, z: START.z + Math.sin(w) * r, art: Math.floor(z() * 3) };
  });
  const plaetze = [[], [], []];
  for (let i = 0; i < BLUMEN_VERSUCHE; i++) {
    const g = gruppen[i % gruppen.length];
    const x = g.x + (z() - 0.5) * 7, zz = g.z + (z() - 0.5) * 7;
    const s = 0.8 + z() * 0.5, dreh = z() * 6.28, misch = z(), andere = z();
    if (i >= anzahl || maskeBei(x, zz).gras < 0.6) continue;
    const y = hoeheBei(x, zz);
    if (y < wsp + 0.2) continue;
    plaetze[misch < 0.8 ? g.art : Math.floor(andere * 3)].push({ x, y, z: zz, s, dreh, nummer: i, pflueckbar: i < pflueckbar });
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const arten = modelle.map((modell, i) => {
    const box = new THREE.Box3().setFromObject(modell.scene);
    const massstab = 0.38 / (box.max.y - box.min.y);
    const matrizen = plaetze[i].map((b) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.dreh);
      s.setScalar(massstab * b.s);
      p.set(b.x, b.y - 0.02, b.z);
      return new THREE.Matrix4().compose(p, q, s);
    });
    const netze = [];
    modell.scene.updateMatrixWorld(true);
    modell.scene.traverse((o) => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((mat) => { mat.side = THREE.DoubleSide; });
      const mesh = new THREE.InstancedMesh(geo, o.material, plaetze[i].length);
      matrizen.forEach((matrix, k) => mesh.setMatrixAt(k, matrix));
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      gruppe.add(mesh);
      netze.push(mesh);
    });
    const zeige = (k, sichtbar) => {
      for (const mesh of netze) {
        mesh.setMatrixAt(k, sichtbar ? matrizen[k] : m.makeScale(0, 0, 0));
        mesh.instanceMatrix.needsUpdate = true;
      }
    };
    return { art: BLUMEN[i].art, plaetze: plaetze[i], zeige };
  });
  return { objekt: gruppe, arten };
}

// ---------------------------------------------------------------- Beeren

function erzeugeBeeren(beerenBusch) {
  const { geometrie, plaetze } = beerenBusch;
  const beere = new THREE.IcosahedronGeometry(0.011, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a0a18, roughness: 0.25, metalness: 0 });
  const je = 70;
  const mesh = new THREE.InstancedMesh(beere, mat, plaetze.length * je);
  const pos = geometrie.attributes.position;
  const z = zufall(99);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const matrizen = [];
  plaetze.forEach((pl, b) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pl.drehung);
    const welt = new THREE.Matrix4().compose(new THREE.Vector3(pl.x, pl.y - 0.15, pl.z), q, new THREE.Vector3().setScalar(pl.s));
    for (let k = 0; k < je; k++) {
      const i = Math.floor(z() * pos.count);
      p.fromBufferAttribute(pos, i).applyMatrix4(welt);
      if (p.y < pl.y + 0.25) { p.y = pl.y + 0.25 + z() * 0.4; }
      const traube = 0.8 + z() * 0.6;
      m.compose(p, q.identity(), s.setScalar(traube));
      matrizen.push(m.clone());
      mesh.setMatrixAt(b * je + k, m);
    }
  });
  mesh.castShadow = false;
  const leer = new THREE.Matrix4().makeScale(0, 0, 0);
  return {
    objekt: mesh,
    pfluecke(b) {
      for (let k = 0; k < je; k++) mesh.setMatrixAt(b * je + k, leer);
      mesh.instanceMatrix.needsUpdate = true;
    },
    wachse(b) {
      for (let k = 0; k < je; k++) mesh.setMatrixAt(b * je + k, matrizen[b * je + k]);
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

export async function erzeugeNatur(qualitaet, beerenBusch) {
  const z = zufall(4243);
  const gruppe = new THREE.Group();
  gruppe.name = 'natur';
  const felsen = erzeugeFelsen(z, qualitaet);
  gruppe.add(felsen);
  const beeren = erzeugeBeeren(beerenBusch);
  gruppe.add(beeren.objekt);
  let blumen = null;
  try {
    blumen = await erzeugeBlumen(qualitaet);
    gruppe.add(blumen.objekt);
  } catch (e) {
    console.warn('Blumen konnten nicht geladen werden', e);
  }
  return { objekt: gruppe, beeren, blumen, hindernisse: felsen.userData.hindernisse, felsMaterial: felsen.userData.material, felsen: felsen.userData.felsen, setzeFelsGroesse: felsen.userData.setzeGroesse };
}
