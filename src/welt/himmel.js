// Himmel mit Tageslauf: Streulicht der Atmosphäre (Sky), Wolken, Sterne, Mond,
// Sonnen- bzw. Mondlicht mit Schatten und ein Umgebungslicht, das zur Tageszeit passt.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { zeit, lichtFuerZeit } from './tageszeit.js';
import { wind } from './wind.js';

const WOLKEN_VERTEX = /* glsl */ `
varying vec3 vRichtung;
void main() {
  vRichtung = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const WOLKEN_FRAGMENT = /* glsl */ `
varying vec3 vRichtung;
uniform vec3 uSonne;
uniform vec3 uLichtFarbe;
uniform vec3 uSchattenFarbe;
uniform float uZeit;
uniform vec2 uWind;
uniform float uBedeckung;
uniform float uHelligkeit;
float h2(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
float r2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), u.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) { s += a * r2(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return s;
}
void main() {
  vec3 d = normalize(vRichtung);
  if (d.y < -0.02) discard;
  vec2 uv = d.xz / (max(d.y, 0.0) + 0.1) * 1.4;
  vec2 w = uWind * uZeit * 0.006;
  float n = fbm(uv + w);
  float form = fbm(uv * 0.35 - w * 0.5);
  float bed = uBedeckung + (form - 0.5) * 0.25;
  float dichte = smoothstep(bed, bed + 0.13, n);
  vec2 zurSonne2 = normalize(uSonne.xz + 1e-4) * 0.06;
  float n2 = fbm(uv + w + zurSonne2);
  float schatten = clamp((n2 - n) * 4.0 + 0.45, 0.0, 1.0);
  vec3 farbe = mix(uLichtFarbe, uSchattenFarbe, clamp(schatten * 0.8 + dichte * 0.35, 0.0, 1.0));
  float zur = max(dot(d, normalize(uSonne)), 0.0);
  farbe += uLichtFarbe * pow(zur, 10.0) * (1.0 - dichte) * 2.0;
  float horizont = smoothstep(-0.02, 0.18, d.y);
  gl_FragColor = vec4(farbe * uHelligkeit, dichte * horizont * 0.97);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const STERNE_VERTEX = /* glsl */ `
attribute float groesse;
attribute float hell;
varying float vHell;
uniform float uZeit;
void main() {
  vHell = hell * (0.75 + 0.25 * sin(uZeit * (1.5 + hell * 3.0) + position.x));
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
  gl_PointSize = groesse;
}`;
const STERNE_FRAGMENT = /* glsl */ `
varying float vHell;
uniform float uSichtbar;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(c));
  gl_FragColor = vec4(vec3(0.9, 0.93, 1.0) * vHell * 2.0, a * uSichtbar);
}`;

function mondTextur() {
  const g = 128, c = document.createElement('canvas');
  c.width = c.height = g;
  const k = c.getContext('2d');
  const verlauf = k.createRadialGradient(g / 2, g / 2, g * 0.2, g / 2, g / 2, g / 2);
  verlauf.addColorStop(0, 'rgba(255,250,235,1)');
  verlauf.addColorStop(0.36, 'rgba(240,236,222,1)');
  verlauf.addColorStop(0.4, 'rgba(200,210,255,0.35)');
  verlauf.addColorStop(1, 'rgba(160,180,255,0)');
  k.fillStyle = verlauf;
  k.fillRect(0, 0, g, g);
  // Mare (dunkle Flecken)
  k.globalCompositeOperation = 'multiply';
  for (const [x, y, r] of [[0.42, 0.4, 0.09], [0.56, 0.46, 0.07], [0.5, 0.58, 0.06], [0.4, 0.55, 0.05]]) {
    k.fillStyle = 'rgba(170,165,160,0.8)';
    k.beginPath(); k.arc(x * g, y * g, r * g, 0, Math.PI * 2); k.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function erzeugeHimmel(szene, renderer, qualitaet) {
  // --- Streulicht der Atmosphäre ---
  const himmel = new Sky();
  himmel.scale.setScalar(4500);
  const u = himmel.material.uniforms;
  u.turbidity.value = 2.4;
  u.rayleigh.value = 1.9;
  u.mieCoefficient.value = 0.0035;
  u.mieDirectionalG.value = 0.86;
  himmel.renderOrder = -10;
  // Die Atmosphäre ist sehr hell; gedämpft bleibt der Himmel nach der Farbumrechnung blau statt weiß
  u.uHimmelHelligkeit = { value: 0.5 };
  himmel.material.fragmentShader = 'uniform float uHimmelHelligkeit;\n' + himmel.material.fragmentShader.replace(
    'gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( retColor * uHimmelHelligkeit, 1.0 );');
  himmel.material.needsUpdate = true;
  szene.add(himmel);

  // --- Sterne ---
  const anzahl = 4000;
  const pos = new Float32Array(anzahl * 3), groesse = new Float32Array(anzahl), hell = new Float32Array(anzahl);
  for (let i = 0; i < anzahl; i++) {
    const v = new THREE.Vector3().randomDirection();
    v.y = Math.abs(v.y);
    v.multiplyScalar(4000);
    pos.set([v.x, v.y, v.z], i * 3);
    const r = Math.random();
    groesse[i] = 1 + r ** 6 * 3;
    hell[i] = 0.3 + r ** 3 * 0.7;
  }
  const sternGeo = new THREE.BufferGeometry();
  sternGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sternGeo.setAttribute('groesse', new THREE.BufferAttribute(groesse, 1));
  sternGeo.setAttribute('hell', new THREE.BufferAttribute(hell, 1));
  const sterne = new THREE.Points(sternGeo, new THREE.ShaderMaterial({
    vertexShader: STERNE_VERTEX, fragmentShader: STERNE_FRAGMENT,
    uniforms: { uSichtbar: { value: 0 }, uZeit: wind.zeit },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  sterne.renderOrder = -9;
  sterne.frustumCulled = false;
  szene.add(sterne);

  // --- Mond ---
  const mond = new THREE.Sprite(new THREE.SpriteMaterial({ map: mondTextur(), fog: false, depthWrite: false, transparent: true }));
  mond.scale.setScalar(260);
  mond.renderOrder = -8;
  szene.add(mond);

  // --- Wolken ---
  const wolkenMat = new THREE.ShaderMaterial({
    vertexShader: WOLKEN_VERTEX, fragmentShader: WOLKEN_FRAGMENT,
    uniforms: {
      uSonne: { value: new THREE.Vector3() }, uLichtFarbe: { value: new THREE.Color() },
      uSchattenFarbe: { value: new THREE.Color() }, uZeit: wind.zeit, uWind: { value: new THREE.Vector2(1, 0.4) },
      uBedeckung: { value: 0.6 }, uHelligkeit: { value: 1 },
    },
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
  });
  const wolken = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), wolkenMat);
  wolken.renderOrder = -7;
  wolken.frustumCulled = false;
  szene.add(wolken);

  // --- Licht ---
  const sonne = new THREE.DirectionalLight(0xffffff, 3);
  sonne.castShadow = true;
  const groesseSchatten = qualitaet.schatten;
  sonne.shadow.mapSize.set(groesseSchatten, groesseSchatten);
  const RAND = 38;
  Object.assign(sonne.shadow.camera, { left: -RAND, right: RAND, top: RAND, bottom: -RAND, near: 1, far: 500 });
  sonne.shadow.bias = -0.0002;
  sonne.shadow.normalBias = 0.035;
  szene.add(sonne, sonne.target);
  const fuellLicht = new THREE.HemisphereLight(0xbcd6ef, 0x3a4424, 0.25);
  szene.add(fuellLicht);

  szene.fog = new THREE.FogExp2(0xb9cbd6, 0.0014);

  // --- Umgebungslicht (Spiegelungen, indirektes Licht) aus Himmel + Wolken + Boden ---
  const pmrem = new THREE.PMREMGenerator(renderer);
  const umgebung = new THREE.Scene();
  const himmelKopie = new Sky();
  himmelKopie.material = himmel.material;
  himmelKopie.scale.setScalar(400);
  const wolkenKopie = new THREE.Mesh(new THREE.SphereGeometry(390, 32, 16), wolkenMat);
  const bodenMat = new THREE.MeshBasicMaterial({ color: 0x2c3318, side: THREE.BackSide });
  const boden = new THREE.Mesh(new THREE.SphereGeometry(380, 32, 16, 0, Math.PI * 2, Math.PI / 2 + 0.02, Math.PI / 2), bodenMat);
  umgebung.add(himmelKopie, wolkenKopie, boden);
  let umgebungsZiel = null, umgebungsUhr = 0;

  const licht = { farbe: new THREE.Color(), staerke: 1, richtung: new THREE.Vector3() };
  const himmelFarbe = new THREE.Color(), nebel = new THREE.Color();
  const TAG_NEBEL = new THREE.Color(0xb4c6d2), ABEND_NEBEL = new THREE.Color(0xd8a684), NACHT_NEBEL = new THREE.Color(0x0e1424);
  const raster = new THREE.Vector3();

  function aktualisiere(dt, ort) {
    lichtFuerZeit(licht);
    u.sunPosition.value.copy(zeit.sonne);
    // Sterne und Mond
    sterne.material.uniforms.uSichtbar.value = 1 - THREE.MathUtils.smoothstep(zeit.sonne.y, -0.16, -0.02);
    sterne.position.copy(ort);
    mond.position.copy(ort).addScaledVector(zeit.mond, 3800);
    mond.material.opacity = THREE.MathUtils.smoothstep(zeit.mond.y, -0.05, 0.05) * (1 - zeit.hell);
    mond.visible = mond.material.opacity > 0.01;
    wolken.position.copy(ort);

    // Farben je Tageszeit
    nebel.copy(TAG_NEBEL).lerp(ABEND_NEBEL, zeit.daemmerung * 0.75).lerp(NACHT_NEBEL, 1 - zeit.hell);
    szene.fog.color.copy(nebel);
    const wu = wolkenMat.uniforms;
    wu.uSonne.value.copy(zeit.sonne.y > -0.05 ? zeit.sonne : zeit.mond);
    wu.uLichtFarbe.value.copy(licht.farbe).multiplyScalar(zeit.sonne.y > -0.05 ? 0.9 : 0.25);
    himmelFarbe.copy(nebel).multiplyScalar(0.85);
    wu.uSchattenFarbe.value.copy(himmelFarbe);
    wu.uHelligkeit.value = 0.25 + 0.75 * zeit.hell;
    wu.uWind.value.copy(wind.richtung.value);

    fuellLicht.color.copy(nebel);
    fuellLicht.groundColor.setRGB(0.12, 0.13, 0.07).multiplyScalar(0.3 + zeit.hell);
    fuellLicht.intensity = 0.08 + 0.12 * zeit.hell;
    bodenMat.color.setRGB(0.10, 0.12, 0.05).multiplyScalar(0.15 + 0.85 * zeit.hell);

    // Sonne/Mond als ein Schattenlicht, das mit dem Spieler wandert (auf Schatten-Texel eingerastet)
    sonne.color.copy(licht.farbe);
    sonne.intensity = licht.staerke;
    const texel = (2 * RAND) / groesseSchatten;
    raster.set(Math.round(ort.x / texel) * texel, ort.y, Math.round(ort.z / texel) * texel);
    sonne.target.position.copy(raster);
    sonne.position.copy(raster).addScaledVector(licht.richtung, 220);

    umgebungsUhr -= dt;
    if (umgebungsUhr <= 0) {
      umgebungsUhr = 2.0;
      const alt = umgebungsZiel;
      umgebungsZiel = pmrem.fromScene(umgebung, 0, 1, 1000);
      szene.environment = umgebungsZiel.texture;
      alt?.dispose();
    }
    szene.environmentIntensity = 0.45 + 0.75 * zeit.hell;
  }

  return { aktualisiere, sonne, licht };
}
