// Gras, das überall wächst, wo man hinläuft (Issue #1).
// Die Halme werden ganz auf der Grafikkarte verteilt: Ein Raster wandert mit dem Spieler mit,
// jeder Halm bekommt seinen Platz aus seiner Weltzelle (deshalb „springt“ beim Laufen nichts).
// Höhe und Grasdichte kommen aus den Geländetexturen. Drei Ringe: nah dicht, weiter weg lichter.
import * as THREE from 'three';
import { rasterTexturen } from './gelaende.js';
import { WIND_GLSL, windUniforms } from './wind.js';

const RINGE = [
  { abstand: 0.072, innen: 0, aussen: 9, breite: 0.016, hoehe: 1.0 },
  { abstand: 0.15, innen: 7.5, aussen: 26, breite: 0.028, hoehe: 1.0 },
  { abstand: 0.42, innen: 22, aussen: 62, breite: 0.075, hoehe: 0.85 },
];

// Ein Büschel aus drei Halmen (Breite 1, Höhe 1; im Shader skaliert). Jeder Halm hat eigene
// Richtung, Länge und Neigung; das Attribut „halm“ trägt (Winkel, Längenfaktor, Neigung).
function bueschel(segmente = 5) {
  const pos = [], idx = [], halmAttr = [];
  const halme = [[0.0, 1.0, 0.0], [2.1, 0.78, 0.28], [4.2, 0.62, 0.42]];
  for (const [w, l, n] of halme) {
    const basis = pos.length / 3;
    for (let i = 0; i <= segmente; i++) {
      const y = i / segmente;
      const b = (1 - y ** 1.4) * 0.5;
      if (i < segmente) { pos.push(-b, y, 0, b, y, 0); halmAttr.push(w, l, n, w, l, n); }
      else { pos.push(0, 1, 0); halmAttr.push(w, l, n); }
    }
    for (let i = 0; i < segmente - 1; i++) {
      const a = basis + i * 2;
      idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
    const l2 = basis + (segmente - 1) * 2;
    idx.push(l2, l2 + 1, l2 + 2);
  }
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  geo.setAttribute('halm', new THREE.Float32BufferAttribute(halmAttr, 3));
  geo.setIndex(idx);
  return geo;
}

const KOPF = /* glsl */ `
uniform vec3 uMitte;
uniform vec3 uSpieler;
uniform float uAbstand;
uniform float uRasterN;
uniform float uInnen;
uniform float uAussen;
uniform float uBreite;
uniform float uHoehenFaktor;
uniform sampler2D uHoehe;
uniform sampler2D uMaske;
uniform float uWeltGroesse;
varying float vHoeheImHalm;
varying vec3 vGrasFarbe;
varying float vDurchscheinen;
attribute vec3 halm;
float gHash(vec2 p) { return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453); }
vec2 gHash2(vec2 p) { return vec2(gHash(p), gHash(p + 17.31)); }
` + WIND_GLSL;

const PLATZ = /* glsl */ `
  float n = uRasterN;
  float ix = mod(float(gl_InstanceID), n);
  float iz = floor(float(gl_InstanceID) / n);
  vec2 zelle = floor(uMitte.xz / uAbstand) + vec2(ix, iz) - floor(n * 0.5);
  vec2 zuf = gHash2(zelle);
  vec2 ort = (zelle + zuf) * uAbstand;
  float abstandZumMittelpunkt = distance(ort, uMitte.xz);
  float ring = smoothstep(uInnen, uInnen + 1.5, abstandZumMittelpunkt) * (1.0 - smoothstep(uAussen * 0.82, uAussen, abstandZumMittelpunkt));
  if (uInnen <= 0.0) ring = 1.0 - smoothstep(uAussen * 0.82, uAussen, abstandZumMittelpunkt);
  vec2 rasterUv = (ort + uWeltGroesse * 0.5) / uWeltGroesse;
  float bodenHoehe = texture(uHoehe, rasterUv).r;
  vec4 maske = texture(uMaske, rasterUv);
  float flecken = windRauschen(ort * 0.08) * 0.6 + windRauschen(ort * 0.6) * 0.4;
  float dichte = maske.r * (0.75 + 0.5 * flecken);
  float da = step(gHash(zelle + 3.7), dichte);
  float buesche = step(0.93, gHash(zelle * 0.37 + 4.0)); // vereinzelt hohe Büschel
  float wuchs = mix(0.35, 0.95, smoothstep(0.2, 0.8, flecken)) * (0.5 + 0.6 * pow(gHash(zelle + 9.1), 1.5)) + buesche * 0.45;
  wuchs *= mix(0.45, 1.0, maske.r);
  float groesse = ring * da * wuchs * uHoehenFaktor;
  float gier = gHash(zelle + 5.3) * 6.2831 + halm.x;
  vec2 blatt = vec2(cos(gier), sin(gier));
  vec2 krumm = (gHash2(zelle + 1.9 + halm.x) - 0.5) * (1.0 + halm.z * 2.0);
  groesse *= halm.y;
  float hy = position.y;
  vHoeheImHalm = hy;
  // Wind: Böen wandern übers Land, dazu feines Zittern
  float boe = windBoe(ort);
  float zittern = sin(uZeit * 3.7 + gHash(zelle) * 30.0) * 0.06;
  vec2 neigung = uWindRichtung * (boe * 0.9 + 0.15) * uWindStaerke + krumm * 0.5 + zittern * blatt;
  // dem Spieler ausweichen
  vec2 weg = ort - uSpieler.xz;
  float nah = 1.0 - smoothstep(0.25, 0.9, length(weg));
  neigung += normalize(weg + 1e-4) * nah * 1.4 * step(abs(uSpieler.y - bodenHoehe), 1.5);
  float biegung = hy * hy * (1.0 + halm.z);
  float halmHoehe = 0.58 * groesse;
  vec3 seite = vec3(blatt.x, 0.0, blatt.y);
  vec3 grasOrt = vec3(ort.x, bodenHoehe, ort.y);
  grasOrt += seite * position.x * uBreite * (0.7 + 0.6 * gHash(zelle + 2.2)) * step(0.001, groesse);
  grasOrt += vec3(cos(halm.x * 1.7 + gier), 0.0, sin(halm.x * 1.7 + gier)) * halm.z * uAbstand * 0.35;
  vec3 kipp = vec3(neigung.x, 0.0, neigung.y) * biegung * halmHoehe * 0.55;
  grasOrt += vec3(0.0, hy * halmHoehe * (1.0 - 0.25 * dot(neigung, neigung) * biegung), 0.0) + kipp;
  // Farbe: Wurzel dunkel, Spitze hell, einzelne Halme trockener
  float trocken = smoothstep(0.55, 0.9, windRauschen(ort * 0.045 + 31.0)) * 0.7 + gHash(zelle + 4.4) * 0.25;
  float art = gHash(zelle + 8.8);
  float flaeche2 = windRauschen(ort * 0.18 + 11.0);
  vec3 gruen = mix(vec3(0.09, 0.17, 0.035), mix(vec3(0.19, 0.30, 0.06), vec3(0.24, 0.33, 0.09), flaeche2), hy);
  gruen = mix(gruen, gruen * vec3(1.15, 1.05, 0.7), step(0.7, art)); // andere Grasart, gelblicher
  vec3 gelb = mix(vec3(0.20, 0.19, 0.07), vec3(0.42, 0.40, 0.18), hy);
  vGrasFarbe = mix(gruen, gelb, trocken * 0.45) * (0.78 + 0.4 * gHash(zelle + 6.6 + halm.x));
  vGrasFarbe *= mix(0.45, 1.0, smoothstep(0.0, 0.45, hy)); // Schatten im dichten Gras am Boden
  vDurchscheinen = hy;
  // Normale: abgerundet (Mischung aus Halmfläche und oben), wirkt wie ein gewölbter Halm
  vec3 flaeche = normalize(vec3(-blatt.y, 0.0, blatt.x));
  vec3 grasNormale = normalize(mix(vec3(0.0, 1.0, 0.0), flaeche * sign(position.x + 1e-4), 0.55) + vec3(neigung.x, 0.0, neigung.y) * 0.2);
`;

export function erzeugeGras(qualitaet, sonnenLicht) {
  const { hoehe, maske, groesse } = rasterTexturen();
  const gruppe = new THREE.Group();
  gruppe.name = 'gras';
  const mitte = { value: new THREE.Vector3() };
  const spieler = { value: new THREE.Vector3(0, -100, 0) };
  const sonnenRichtung = { value: new THREE.Vector3() };
  const sonnenFarbe = { value: new THREE.Color() };
  const teile = [];

  for (const ring of RINGE) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.6 });
    const uniforms = windUniforms({
      uMitte: mitte, uSpieler: spieler, uAbstand: { value: 0 }, uRasterN: { value: 0 },
      uInnen: { value: ring.innen }, uAussen: { value: ring.aussen }, uBreite: { value: ring.breite },
      uHoehenFaktor: { value: ring.hoehe }, uHoehe: { value: hoehe }, uMaske: { value: maske },
      uWeltGroesse: { value: groesse }, uSonnenRichtung: sonnenRichtung, uSonnenFarbe: sonnenFarbe,
    });
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = KOPF + shader.vertexShader
        .replace('#include <beginnormal_vertex>', PLATZ + '\nvec3 objectNormal = grasNormale;')
        .replace('#include <begin_vertex>', 'vec3 transformed = grasOrt;');
      shader.fragmentShader = /* glsl */ `
        varying float vHoeheImHalm;
        varying vec3 vGrasFarbe;
        varying float vDurchscheinen;
        uniform vec3 uSonnenRichtung;
        uniform vec3 uSonnenFarbe;
      ` + shader.fragmentShader
        .replace('#include <color_fragment>', 'diffuseColor.rgb *= vGrasFarbe;')
        .replace('#include <opaque_fragment>', /* glsl */ `
          // Licht, das von hinten durch die Halme scheint
          vec3 blick = normalize(vViewPosition);
          float gegen = pow(max(dot(blick, normalize(uSonnenRichtung)), 0.0), 3.0);
          outgoingLight += uSonnenFarbe * diffuseColor.rgb * gegen * vDurchscheinen * 0.35;
          #include <opaque_fragment>
        `);
    };
    const geo = bueschel(ring.innen === 0 ? 5 : ring.aussen < 30 ? 3 : 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    gruppe.add(mesh);
    teile.push({ ring, mesh, geo, uniforms });
  }

  function setzeQualitaet(stufe) {
    for (const { ring, geo, uniforms } of teile) {
      const abstand = ring.abstand / Math.sqrt(stufe.gras);
      const n = Math.ceil((2 * ring.aussen) / abstand);
      uniforms.uAbstand.value = abstand;
      uniforms.uRasterN.value = n;
      geo.instanceCount = n * n;
    }
  }
  setzeQualitaet(qualitaet);

  function aktualisiere(ort, kamera) {
    mitte.value.copy(ort);
    spieler.value.copy(ort);
    // Sonnenrichtung im Blickraum (für das Durchscheinen)
    sonnenRichtung.value.copy(sonnenLicht.richtung).transformDirection(kamera.matrixWorldInverse).negate();
    sonnenFarbe.value.copy(sonnenLicht.farbe).multiplyScalar(sonnenLicht.staerke * 0.35);
  }

  return { objekt: gruppe, aktualisiere, setzeQualitaet };
}
