// Eine Figur aus assets/figuren/*.glb (gebaut mit werkzeuge/figuren): MakeHuman-Körper,
// gemalte Haut, Haare, Kleidung und aufgezeichnete Bewegungen.
// Hier: Materialien veredeln (Licht unter der Haut) und Bewegungen nach Tempo überblenden.
// Von einer geladenen Vorlage lassen sich viele Figuren machen (z. B. mehrere Räuber); sie teilen
// sich Netze und Bilder, jede hat ihr eigenes Skelett und ihre eigenen Bewegungen.
import * as THREE from 'three';
import { clone as klonen } from 'three/addons/utils/SkeletonUtils.js';
import { ladeModell } from '../modelle.js';

// Bewegungen, die einmal ablaufen statt im Takt der Schritte (Winken, Schläge)
const EINMALIG = new Set(['winken', 'hieb', 'schlag', 'tritt']);

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
  // Aufgemalte Haare (Brauen, Haaransatz, Bartschatten) bekommen die Haarfarbe aus dem Editor: Die Maske steht im
  // B-Kanal des ORM-Bilds (werkzeuge/figuren/haut.py). Ohne Editor sind beide Farben schwarz, dann ändert sich nichts.
  m.userData.haarAlt = { value: new THREE.Color(0, 0, 0) };
  m.userData.haarNeu = { value: new THREE.Color(0, 0, 0) };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uHaarAlt = m.userData.haarAlt;
    shader.uniforms.uHaarNeu = m.userData.haarNeu;
    shader.fragmentShader = 'uniform vec3 uHaarAlt;\nuniform vec3 uHaarNeu;\n' + shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      #ifdef USE_ROUGHNESSMAP
        float haarMaske = texture2D( roughnessMap, vRoughnessMapUv ).b;
        diffuseColor.rgb += haarMaske * ( uHaarNeu - diffuse * uHaarAlt );
      #endif`,
    );
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
      o.material.roughness = 0.68; // matter: sonst ein heller Glanzfleck auf dem Kopf
    }
    if (name === 'hornhaut') {
      o.material.depthWrite = false;
      o.castShadow = false;
    }
    if (name === 'leder' || name === 'wolle') o.material.side = THREE.DoubleSide;
  });
}

export async function ladeVorlage(art, beiFortschritt) {
  const gltf = await ladeModell(new URL(`../../assets/figuren/${art}.glb`, import.meta.url).href, beiFortschritt);
  veredle(gltf.scene);
  let benutzt = false;
  return {
    // Die erste Figur bekommt das Original, jede weitere einen Klon
    erzeuge() {
      const wurzel = benutzt ? klonen(gltf.scene) : gltf.scene;
      benutzt = true;
      return belebe(wurzel, gltf.animations, art);
    },
  };
}

export async function ladeFigur(art, beiFortschritt) {
  return (await ladeVorlage(art, beiFortschritt)).erzeuge();
}

function belebe(wurzel, animationen, art) {
  const tempo = wurzel.children[0]?.userData?.tempo ?? wurzel.userData?.tempo ?? {};
  const mischer = new THREE.AnimationMixer(wurzel);
  const aktionen = {};
  for (const clip of animationen) {
    const a = mischer.clipAction(clip);
    a.play();
    a.setEffectiveWeight(0);
    a.timeScale = 0; // die Zeit setzen wir selbst (gleicher Schritt-Takt für alle Gangarten)
    aktionen[clip.name] = { aktion: a, dauer: clip.duration, tempo: tempo[clip.name] || 0 };
  }
  const kopf = wurzel.getObjectByName('head');
  const hals = wurzel.getObjectByName('neck_01');

  // Arme in eine Haltung bringen (über die Bewegungen gelegt), z. B. eine Fackel vor sich halten.
  // Richtungen im Raum der Figur: x = links, y = oben, z = vorn. Wirkt im Raum, nicht über Knochenachsen,
  // darum passt es zu jeder Figur mit diesem Skelett.
  const arme = {};
  for (const seite of ['l', 'r']) {
    const ober = wurzel.getObjectByName(`upperarm_${seite}`), unter = wurzel.getObjectByName(`lowerarm_${seite}`), hand = wurzel.getObjectByName(`hand_${seite}`);
    if (ober && unter && hand) arme[seite] = { ober, unter, hand, ziel: null, letztes: null, w: 0 };
  }
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
  const _qd = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qw = new THREE.Quaternion();
  function richte(knochen, kind, richtung, w) {
    knochen.updateWorldMatrix(true, true);
    knochen.getWorldPosition(_a);
    kind.getWorldPosition(_b);
    _b.sub(_a).normalize();
    _d.copy(richtung).applyQuaternion(wurzel.getWorldQuaternion(_qw)).normalize();
    _qd.setFromUnitVectors(_b, _d);
    knochen.getWorldQuaternion(_qb);
    knochen.parent.getWorldQuaternion(_qp);
    const neu = _qp.invert().multiply(_qd).multiply(_qb);
    knochen.quaternion.slerp(neu, w);
  }
  function haltungAnwenden(dt) {
    for (const arm of Object.values(arme)) {
      arm.w = THREE.MathUtils.damp(arm.w, arm.ziel ? 1 : 0, 6, dt);
      const z = arm.ziel ?? arm.letztes;
      if (!z || arm.w < 0.005) continue;
      richte(arm.ober, arm.unter, z.oberarm, arm.w);
      richte(arm.unter, arm.hand, z.unterarm, arm.w);
    }
  }
  // Bücken (zum Aufheben): Der Rücken neigt sich nach vorn, der rechte Arm greift zum Boden. Ein kurzer
  // Ablauf von dauer Sekunden: hinunter, kurz unten, wieder hoch.
  const ruecken = ['spine_01', 'spine_02', 'spine_03'].map((n) => wurzel.getObjectByName(n)).filter(Boolean);
  const _quer = new THREE.Vector3(), _qa = new THREE.Quaternion();
  let buecken = null;
  const GREIFEN = { oberarm: new THREE.Vector3(-0.1, -0.75, 0.65), unterarm: new THREE.Vector3(-0.05, -0.8, 0.6) };
  function neige(knochen, winkel) {
    knochen.updateWorldMatrix(true, false);
    _quer.set(1, 0, 0).applyQuaternion(wurzel.getWorldQuaternion(_qw)); // Achse quer durch die Figur
    _qa.setFromAxisAngle(_quer, winkel);
    knochen.getWorldQuaternion(_qb);
    knochen.parent.getWorldQuaternion(_qp);
    knochen.quaternion.copy(_qp.invert().multiply(_qa).multiply(_qb));
  }
  function bueckenAnwenden(dt) {
    if (!buecken) return;
    buecken.zeit += dt;
    const t = buecken.zeit / buecken.dauer;
    if (t >= 1) { buecken = null; return; }
    const w = Math.sin(Math.min(1, t * 1.15) * Math.PI) ** 0.7; // schnell hinunter, kurz halten, hoch
    for (const k of ruecken) neige(k, (0.45 / ruecken.length) * 1.6 * w);
    if (arme.r) { richte(arme.r.ober, arme.r.unter, GREIFEN.oberarm, w); richte(arme.r.unter, arme.r.hand, GREIFEN.unterarm, w); }
  }
  function buecke(dauer = 0.9) { buecken = { zeit: 0, dauer }; }

  // seite 'l' oder 'r'; ziel { oberarm: Vector3, unterarm: Vector3 } oder null (Arm wieder frei)
  function setzeArm(seite, ziel) {
    const arm = arme[seite];
    if (!arm) return;
    arm.ziel = ziel;
    if (ziel) arm.letztes = ziel;
  }

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
      if (EINMALIG.has(n)) { a.aktion.setEffectiveWeight(0); continue; }
      a.aktion.setEffectiveWeight(gewicht[n] ?? 0);
      a.aktion.time = n === 'stehen' ? stehZeit % a.dauer : phase * a.dauer;
    }
    if (einmal) {
      einmal.zeit += dt * einmal.tempo;
      const a = aktionen[einmal.name];
      const w = Math.min(1, einmal.zeit / einmal.ein, (a.dauer - einmal.zeit) / einmal.aus);
      a.aktion.setEffectiveWeight(Math.max(0, w));
      a.aktion.time = Math.min(einmal.zeit, a.dauer - 0.001);
      for (const [n, b] of Object.entries(aktionen)) if (n !== einmal.name && !EINMALIG.has(n)) b.aktion.setEffectiveWeight((gewicht[n] ?? 0) * (1 - Math.max(0, w)));
      if (einmal.zeit >= a.dauer) einmal = null;
    }
    mischer.update(0);
    bueckenAnwenden(dt);
    haltungAnwenden(dt);
  }

  // Eine Bewegung einmal abspielen; tempo > 1 = schneller, ein/aus = Überblendzeit (in Clip-Sekunden)
  function spiele(name, { tempo: t = 1, ein = 0.4, aus = 0.5 } = {}) {
    if (aktionen[name]) einmal = { name, zeit: 0, tempo: t, ein, aus };
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
  return {
    objekt: wurzel, bewege, spiele, kopfSichtbar, augenOrt, tempo, art,
    rechteHand: wurzel.getObjectByName('hand_r'),
    linkeHand: wurzel.getObjectByName('hand_l'),
    setzeArm, buecke,
    hat: (name) => !!aktionen[name],
    dauer: (name) => aktionen[name]?.dauer ?? 0,
    get spielt() { return einmal?.name ?? null; },
  };
}
