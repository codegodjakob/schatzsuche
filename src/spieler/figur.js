// Eine Figur aus assets/figuren/*.glb (gebaut mit werkzeuge/figuren): MakeHuman-Körper,
// gemalte Haut, Haare, Kleidung und aufgezeichnete Bewegungen.
// Hier: Materialien veredeln (Licht unter der Haut) und Bewegungen nach Tempo überblenden.
import * as THREE from 'three';
import { ladeModell } from '../modelle.js';

// Licht dringt etwas in die Haut ein und färbt die Schattenkante rötlich (wie bei echter Haut)
function hautMaterial(alt) {
  const m = new THREE.MeshPhysicalMaterial({
    map: alt.map, normalMap: alt.normalMap, normalScale: alt.normalScale, roughnessMap: alt.roughnessMap,
    aoMap: alt.aoMap, roughness: 1, metalness: 0,
    sheen: 0.25, sheenColor: new THREE.Color(0.9, 0.55, 0.45), sheenRoughness: 0.55,
    specularIntensity: 0.6,
  });
  m.name = 'haut';
  m.defines = { HAUT_STREUUNG: '' };
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec3 irradiance = dotNL * directLight.color;',
      `vec3 irradiance = dotNL * directLight.color;
      #ifdef HAUT_STREUUNG
        float hautRoh = dot( geometryNormal, directLight.direction );
        float gestreut = saturate( ( hautRoh + 0.5 ) / 1.5 ) - dotNL;
        reflectedLight.directDiffuse += gestreut * directLight.color * BRDF_Lambert( material.diffuseColor ) * vec3( 1.0, 0.42, 0.3 ) * 0.85;
      #endif`,
    );
  };
  return m;
}

function veredle(wurzel) {
  wurzel.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false;
    const name = o.material.name;
    if (name === 'haut') o.material = hautMaterial(o.material);
    if (name === 'haare') {
      o.material.alphaToCoverage = true;
      o.material.roughness = 0.5;
    }
    if (name === 'hornhaut') {
      o.material.depthWrite = false;
      o.castShadow = false;
    }
    if (name === 'leder' || name === 'wolle') o.material.side = THREE.DoubleSide;
  });
}

export async function ladeFigur(art) {
  const gltf = await ladeModell(new URL(`../../assets/figuren/${art}.glb`, import.meta.url).href);
  const wurzel = gltf.scene;
  veredle(wurzel);
  const tempo = wurzel.children[0]?.userData?.tempo ?? wurzel.userData?.tempo ?? {};
  const mischer = new THREE.AnimationMixer(wurzel);
  const aktionen = {};
  for (const clip of gltf.animations) {
    const a = mischer.clipAction(clip);
    a.play();
    a.setEffectiveWeight(0);
    a.timeScale = 0; // die Zeit setzen wir selbst (gleicher Schritt-Takt für alle Gangarten)
    aktionen[clip.name] = { aktion: a, dauer: clip.duration, tempo: tempo[clip.name] || 0 };
  }
  const kopf = wurzel.getObjectByName('head');
  const hals = wurzel.getObjectByName('neck_01');

  // Gewichte der Gangarten je nach Tempo
  let phase = 0, stehZeit = 0, einmal = null;
  const gewicht = {};
  function bewege(dt, v, { erschoepft = false } = {}) {
    const gehen = erschoepft && aktionen.erschoepft ? 'erschoepft' : 'gehen';
    const tGehen = aktionen[gehen]?.tempo || 1.3;
    const tRennen = aktionen.rennen?.tempo || 3.5;
    const tSprint = aktionen.sprinten?.tempo || 4.5;
    const ziel = { stehen: 0, gehen: 0, erschoepft: 0, rennen: 0, sprinten: 0 };
    if (v < 0.08 || !aktionen[gehen]) ziel.stehen = 1;
    else if (v < tGehen) { const t = THREE.MathUtils.smoothstep(v, 0.08, Math.min(0.9, tGehen)); ziel.stehen = 1 - t; ziel[gehen] = t; }
    else if (v < tRennen || !aktionen.rennen) { const t = aktionen.rennen ? THREE.MathUtils.smoothstep(v, tGehen * 1.05, tRennen) : 0; ziel[gehen] = 1 - t; ziel.rennen = t; }
    else if (aktionen.sprinten) { const t = THREE.MathUtils.smoothstep(v, tRennen, tSprint); ziel.rennen = 1 - t; ziel.sprinten = t; }
    else ziel.rennen = 1;
    // weich überblenden
    for (const n of Object.keys(ziel)) {
      gewicht[n] = THREE.MathUtils.damp(gewicht[n] ?? ziel[n], ziel[n], 10, dt);
    }
    // gemeinsamer Schritt-Takt: jede Gangart läuft so schnell, wie es zum Tempo passt
    let takt = 0, summe = 0;
    for (const n of ['gehen', 'erschoepft', 'rennen', 'sprinten']) {
      const a = aktionen[n];
      if (!a || !gewicht[n]) continue;
      const rate = a.tempo > 0 ? THREE.MathUtils.clamp(Math.max(v, 0.3) / a.tempo, 0.55, 1.6) : 1;
      takt += gewicht[n] * rate / a.dauer;
      summe += gewicht[n];
    }
    if (summe > 0.001) phase = (phase + dt * takt / summe) % 1;
    stehZeit += dt;
    for (const [n, a] of Object.entries(aktionen)) {
      if (n === 'winken') continue;
      a.aktion.setEffectiveWeight(gewicht[n] ?? 0);
      a.aktion.time = n === 'stehen' ? stehZeit % a.dauer : phase * a.dauer;
    }
    if (einmal) {
      einmal.zeit += dt;
      const a = aktionen[einmal.name];
      const w = Math.min(1, einmal.zeit / 0.4, (a.dauer - einmal.zeit) / 0.5);
      a.aktion.setEffectiveWeight(Math.max(0, w));
      a.aktion.time = Math.min(einmal.zeit, a.dauer - 0.001);
      for (const [n, b] of Object.entries(aktionen)) if (n !== einmal.name) b.aktion.setEffectiveWeight((gewicht[n] ?? 0) * (1 - Math.max(0, w)));
      if (einmal.zeit >= a.dauer) einmal = null;
    }
    mischer.update(0);
  }

  function spiele(name) {
    if (aktionen[name]) einmal = { name, zeit: 0 };
  }

  // Ich-Sicht: Kopf (mit Haaren, Augen) unsichtbar machen, Kamera an die Augen
  function kopfSichtbar(ja) {
    if (kopf) kopf.scale.setScalar(ja ? 1 : 0.001);
  }
  const augenVersatz = new THREE.Vector3(0, 0.125, 0.08);
  function augenOrt(ziel) {
    hals.updateWorldMatrix(true, false);
    return ziel.copy(augenVersatz).applyMatrix4(hals.matrixWorld);
  }

  bewege(0, 0);
  return { objekt: wurzel, bewege, spiele, kopfSichtbar, augenOrt, tempo, art };
}
