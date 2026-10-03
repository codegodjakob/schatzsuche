// Felsen (echte Felstextur, Moos auf der Oberseite), Wildblumen und Beeren an den Sträuchern.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { hoeheBei, maskeBei, neigungBei, wasserspiegel, WELT_GROESSE } from './gelaende.js';
import { START } from './orte.js';
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

function felsForm(saat) {
  const geo = new THREE.IcosahedronGeometry(1, 4);
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

function felsMaterial() {
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
    const gross = z() ** 3;
    plaetze[n % formen.length].push({ x, y, z: zz, s: 0.25 + gross * 2.6, dreh: z() * 6.28, kipp: (z() - 0.5) * 0.4 });
    n++;
  }
  // ein paar große Findlinge am Rand der Wiese
  for (const [x, zz, s] of [[14, 26, 1.6], [-26, -8, 1.2], [22, -14, 0.9], [-9, 31, 0.7]]) {
    plaetze[0].push({ x, y: hoeheBei(x, zz), z: zz, s, dreh: x, kipp: 0.1 });
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  gruppe.userData.hindernisse = plaetze.flat().filter((f) => f.s > 0.45).map((f) => ({ x: f.x, z: f.z, radius: f.s * 0.95 }));
  gruppe.userData.material = mat;
  formen.forEach((geo, i) => {
    const liste = plaetze[i];
    const mesh = new THREE.InstancedMesh(geo, mat, liste.length);
    liste.forEach((f, k) => {
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
  return gruppe;
}

// ---------------------------------------------------------------- Wildblumen

async function erzeugeBlumen(z, qualitaet) {
  const gruppe = new THREE.Group();
  const lader = new GLTFLoader();
  const dateien = ['flower_white.glb', 'flower_yellow.glb', 'flower_blue.glb'];
  const modelle = await Promise.all(dateien.map((d) => lader.loadAsync(new URL(`../../assets/natur/${d}`, import.meta.url).href)));
  const wsp = wasserspiegel();
  const anzahl = Math.round(1800 * qualitaet.gras + 200);
  // Blumen wachsen in Grüppchen
  const gruppen = Array.from({ length: 70 }, () => {
    const w = z() * 6.28, r = 6 + Math.sqrt(z()) * 70;
    return { x: START.x + Math.cos(w) * r, z: START.z + Math.sin(w) * r, art: Math.floor(z() * 3) };
  });
  const plaetze = [[], [], []];
  for (let i = 0; i < anzahl; i++) {
    const g = gruppen[i % gruppen.length];
    const x = g.x + (z() - 0.5) * 7, zz = g.z + (z() - 0.5) * 7;
    if (maskeBei(x, zz).gras < 0.6) continue;
    const y = hoeheBei(x, zz);
    if (y < wsp + 0.2) continue;
    plaetze[z() < 0.8 ? g.art : Math.floor(z() * 3)].push({ x, y, z: zz, s: 0.8 + z() * 0.5, dreh: z() * 6.28 });
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  modelle.forEach((modell, i) => {
    const box = new THREE.Box3().setFromObject(modell.scene);
    const massstab = 0.38 / (box.max.y - box.min.y);
    modell.scene.updateMatrixWorld(true);
    modell.scene.traverse((o) => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((mat) => { mat.side = THREE.DoubleSide; });
      const mesh = new THREE.InstancedMesh(geo, o.material, plaetze[i].length);
      plaetze[i].forEach((b, k) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.dreh);
        s.setScalar(massstab * b.s);
        p.set(b.x, b.y - 0.02, b.z);
        m.compose(p, q, s);
        mesh.setMatrixAt(k, m);
      });
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      gruppe.add(mesh);
    });
  });
  return gruppe;
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
  try {
    gruppe.add(await erzeugeBlumen(z, qualitaet));
  } catch (e) {
    console.warn('Blumen konnten nicht geladen werden', e);
  }
  return { objekt: gruppe, beeren, hindernisse: felsen.userData.hindernisse, felsMaterial: felsen.userData.material };
}
