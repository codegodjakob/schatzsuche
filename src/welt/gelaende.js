// Das Gelände. Die Höhen werden einmal in ein Raster gerechnet; Boden, Gras, Bäume und der
// Spieler fragen alle dasselbe Raster ab (hoeheBei). Dazu kommen Bodenarten-Masken:
// Gras, Erde (Pfad, Waldboden), Fels (steil), Ufer.
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { DORF, GEWAESSER, HAEUSER, LAGER, PFAD, RAEUBERLAGER, START, STEG, STRASSE } from './orte.js';

export const WELT_GROESSE = 900;
export const RASTER = 512;
const ZELLE = WELT_GROESSE / (RASTER - 1);
const HALB = WELT_GROESSE / 2;

const rauschen = new ImprovedNoise();
const SAAT = 7.31;

function fbm(x, z, oktaven, saat = SAAT) {
  let summe = 0, amp = 1, freq = 1, norm = 0;
  for (let i = 0; i < oktaven; i++) {
    summe += amp * rauschen.noise(x * freq, z * freq, saat + i * 11.7);
    norm += amp; amp *= 0.5; freq *= 2;
  }
  return summe / norm;
}
const weich = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

// Trampelpfade in Erlenbach: vom Rand des Dorfplatzes zu jeder Haustür und zum Steg, leicht geschwungen.
// bis = wie weit vor dem Ziel der Pfad endet (negativ: darüber hinaus)
function dorfweg(ziel, bis) {
  const dx = ziel.x - DORF.x, dz = ziel.z - DORF.z, l = Math.hypot(dx, dz);
  const ux = dx / l, uz = dz / l;
  const von = [DORF.x + ux * 8, DORF.z + uz * 8];
  const ende = [ziel.x - ux * bis, ziel.z - uz * bis];
  return [von, [(von[0] + ende[0]) / 2 - uz * 0.8, (von[1] + ende[1]) / 2 + ux * 0.8], ende];
}
const DORFWEGE = [...HAEUSER.map((h) => dorfweg(h, h.tiefe / 2 - 0.2)), dorfweg(STEG, -0.5)];

// Pfad zum Einsiedler, Straße nach Osten und die Wege im Dorf als dichte Punktfolgen (Catmull-Rom geglättet)
const wege = [[PFAD, 160], [STRASSE, 140], ...DORFWEGE.map((w) => [w, 30])].map(([stuetzen, anzahl]) => {
  const punkte = new THREE.CatmullRomCurve3(stuetzen.map(([x, z]) => new THREE.Vector3(x, 0, z))).getSpacedPoints(anzahl);
  return { punkte, box: new THREE.Box3().setFromPoints(punkte).expandByScalar(12) };
});
export function pfadAbstand(x, z) {
  let best = Infinity;
  for (const { punkte, box } of wege) {
    if (x < box.min.x || x > box.max.x || z < box.min.z || z > box.max.z) continue;
    for (const p of punkte) best = Math.min(best, (p.x - x) ** 2 + (p.z - z) ** 2);
  }
  return best === Infinity ? 99 : Math.sqrt(best);
}

// Wald: Haine in Ringen um die Wiese, mit Lücken. Wird auch für die Baumverteilung benutzt.
export function waldDichte(x, z) {
  const d = Math.hypot(x - START.x, z - START.z);
  const ring = weich(32, 70, d);
  const flecken = fbm(x * 0.012 + 5, z * 0.012 - 3, 4) * 0.5 + 0.5;
  let w = ring * weich(0.36, 0.62, flecken + (d > 140 ? 0.12 : 0));
  w *= weich(LAGER.radius * 0.9, LAGER.radius * 1.4, Math.hypot(x - LAGER.x, z - LAGER.z));
  w *= weich(RAEUBERLAGER.radius * 0.9, RAEUBERLAGER.radius * 1.4, Math.hypot(x - RAEUBERLAGER.x, z - RAEUBERLAGER.z));
  w *= weich(2.5, 6, pfadAbstand(x, z));
  for (const g of GEWAESSER) w *= weich(g.radius * 1.4, g.radius * 2.2, Math.hypot(x - g.x, z - g.z));
  w *= weich(DORF.radius * 0.9, DORF.radius * 1.3, Math.hypot(x - DORF.x, z - DORF.z));
  // kein Baum in oder dicht an einem Haus am Dorfrand
  for (const h of HAEUSER) w *= weich(h.breite * 0.75, h.breite * 0.75 + 4, Math.hypot(x - h.x, z - h.z));
  return w;
}

function hoeheRoh(x, z) {
  const d = Math.hypot(x, z);
  let h = fbm(x * 0.012, z * 0.012, 4) * 2.2;
  h += Math.max(0, fbm(x * 0.0045 + 3, z * 0.0045, 5) + 0.15) * 70 * weich(70, 320, d);
  for (const g of GEWAESSER) {
    const dt = Math.hypot(x - g.x, z - g.z);
    h -= g.tiefe * 1.6 * (1 - weich(g.radius * 0.4, g.radius * 1.5, dt));
  }
  // Lichtung des Lagers etwas eingeebnet
  const dl = Math.hypot(x - LAGER.x, z - LAGER.z);
  const lagerHoehe = fbm(LAGER.x * 0.012, LAGER.z * 0.012, 4) * 2.2;
  h += (lagerHoehe - h) * (1 - weich(LAGER.radius, LAGER.radius * 2, dl)) * 0.8;
  return h;
}

// --- Raster der Höhen ---
export const hoehen = new Float32Array(RASTER * RASTER);
for (let j = 0; j < RASTER; j++) {
  for (let i = 0; i < RASTER; i++) {
    hoehen[j * RASTER + i] = hoeheRoh(-HALB + i * ZELLE, -HALB + j * ZELLE);
  }
}

export function hoeheBei(x, z) {
  const fx = Math.min(Math.max((x + HALB) / ZELLE, 0), RASTER - 1.001);
  const fz = Math.min(Math.max((z + HALB) / ZELLE, 0), RASTER - 1.001);
  const i = Math.floor(fx), j = Math.floor(fz);
  const tx = fx - i, tz = fz - j;
  const a = hoehen[j * RASTER + i], b = hoehen[j * RASTER + i + 1];
  const c = hoehen[(j + 1) * RASTER + i], d = hoehen[(j + 1) * RASTER + i + 1];
  // Dreieck wie im Geländenetz, damit Füße und Gras genau auf dem Boden stehen
  if (tx + tz <= 1) return a + (b - a) * tx + (c - a) * tz;
  return d + (c - d) * (1 - tx) + (b - d) * (1 - tz);
}

export function neigungBei(x, z) {
  const e = 0.8;
  return Math.hypot(hoeheBei(x + e, z) - hoeheBei(x - e, z), hoeheBei(x, z + e) - hoeheBei(x, z - e)) / (2 * e);
}

// Der Wasserspiegel liegt knapp unter der tiefsten Stelle des Uferrands, sonst liefe der Teich über
let spiegel;
export function wasserspiegel() {
  if (spiegel === undefined) {
    let tiefste = Infinity;
    for (const g of GEWAESSER) {
      for (let a = 0; a < 96; a++) {
        const w = (a / 96) * Math.PI * 2;
        tiefste = Math.min(tiefste, hoeheRoh(g.x + Math.cos(w) * g.radius * 1.3, g.z + Math.sin(w) * g.radius * 1.3));
      }
    }
    spiegel = tiefste - 0.12;
  }
  return spiegel;
}

// --- Bodenarten-Masken (R Gras, G Erde, B Fels, A Ufer) ---
export const masken = new Uint8Array(RASTER * RASTER * 4);
{
  const wsp = wasserspiegel();
  for (let j = 0; j < RASTER; j++) {
    for (let i = 0; i < RASTER; i++) {
      const x = -HALB + i * ZELLE, z = -HALB + j * ZELLE;
      const h = hoehen[j * RASTER + i];
      const steil = neigungBei(x, z);
      const fels = Math.min(1, weich(0.5, 0.85, steil) + weich(48, 70, h) * 0.6);
      const ufer = (1 - weich(wsp - 0.05, wsp + 0.6, h));
      const pfad = 1 - weich(0.6, 1.9, pfadAbstand(x, z) + (fbm(x * 0.4, z * 0.4, 2) * 0.8));
      const lager = Math.max(1 - weich(LAGER.radius * 0.35, LAGER.radius * 0.8, Math.hypot(x - LAGER.x, z - LAGER.z)),
        1 - weich(RAEUBERLAGER.radius * 0.3, RAEUBERLAGER.radius * 0.75, Math.hypot(x - RAEUBERLAGER.x, z - RAEUBERLAGER.z)),
        1 - weich(7, 12, Math.hypot(x - DORF.x, z - DORF.z))); // Dorfplatz
      const wald = waldDichte(x, z) * 0.85;
      const flecken = weich(0.66, 0.82, fbm(x * 0.05 + 9, z * 0.05, 3) * 0.5 + 0.5) * 0.3;
      const erde = Math.min(1, Math.max(pfad, lager * 0.9, wald, flecken) * (1 - fels));
      const gras = Math.max(0, 1 - fels - erde - ufer);
      const k = (j * RASTER + i) * 4;
      masken[k] = gras * 255; masken[k + 1] = erde * 255; masken[k + 2] = fels * 255; masken[k + 3] = ufer * 255;
    }
  }
}

export function maskeBei(x, z) {
  const i = Math.round(Math.min(Math.max((x + HALB) / ZELLE, 0), RASTER - 1));
  const j = Math.round(Math.min(Math.max((z + HALB) / ZELLE, 0), RASTER - 1));
  const k = (j * RASTER + i) * 4;
  return { gras: masken[k] / 255, erde: masken[k + 1] / 255, fels: masken[k + 2] / 255, ufer: masken[k + 3] / 255 };
}

// Texturen für die Shader (Gras und Boden lesen daraus)
export function rasterTexturen() {
  const hoeheHalb = new Uint16Array(RASTER * RASTER);
  for (let k = 0; k < hoehen.length; k++) hoeheHalb[k] = THREE.DataUtils.toHalfFloat(hoehen[k]);
  const hoehe = new THREE.DataTexture(hoeheHalb, RASTER, RASTER, THREE.RedFormat, THREE.HalfFloatType);
  hoehe.magFilter = hoehe.minFilter = THREE.LinearFilter;
  hoehe.needsUpdate = true;
  const maske = new THREE.DataTexture(masken, RASTER, RASTER, THREE.RGBAFormat);
  maske.magFilter = maske.minFilter = THREE.LinearFilter;
  maske.needsUpdate = true;
  return { hoehe, maske, groesse: WELT_GROESSE, raster: RASTER };
}

// --- Geländenetz und Material ---
const lader = new THREE.TextureLoader();
function textur(pfad, srgb = true) {
  const t = lader.load(new URL(`../../assets/boden/${pfad}`, import.meta.url).href);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const BODEN_GLSL_KOPF = /* glsl */ `
uniform sampler2D uMaske;
uniform sampler2D uGrasFarbe;
uniform sampler2D uErdeFarbe;
uniform sampler2D uErdeNormal;
uniform sampler2D uFelsFarbe;
uniform sampler2D uFelsNormal;
uniform float uWeltGroesse;
uniform float uWasserspiegel;
varying vec3 vWelt;
varying vec3 vWeltNormal;
float bHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float bRauschen(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(bHash(i), bHash(i + vec2(1, 0)), u.x), mix(bHash(i + vec2(0, 1)), bHash(i + vec2(1, 1)), u.x), u.y);
}
// Gegen sichtbare Kachelung: zwei Maßstäbe, leicht gedreht, mit Rauschen gemischt
vec4 ohneKacheln(sampler2D t, vec2 uv) {
  vec4 a = texture2D(t, uv);
  vec2 uv2 = mat2(0.8, -0.6, 0.6, 0.8) * uv * 0.37 + 0.31;
  vec4 b = texture2D(t, uv2);
  float m = smoothstep(0.3, 0.7, bRauschen(uv * 0.21));
  return mix(a, b, m);
}
vec3 dreiseitig(sampler2D t, vec3 p, vec3 n, float massstab) {
  vec3 w = pow(abs(n), vec3(4.0));
  w /= (w.x + w.y + w.z);
  return texture2D(t, p.zy * massstab).rgb * w.x + texture2D(t, p.xz * massstab).rgb * w.y + texture2D(t, p.xy * massstab).rgb * w.z;
}
`;

export function erzeugeGelaende() {
  const geo = new THREE.PlaneGeometry(WELT_GROESSE, WELT_GROESSE, RASTER - 1, RASTER - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let k = 0; k < pos.count; k++) pos.setY(k, hoeheBei(pos.getX(k), pos.getZ(k)));
  geo.computeVertexNormals();

  const { maske } = rasterTexturen();
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uMaske: { value: maske },
      uGrasFarbe: { value: textur('grasboden.jpg') },
      uErdeFarbe: { value: textur('erde_farbe.jpg') },
      uErdeNormal: { value: textur('erde_normal.jpg', false) },
      uFelsFarbe: { value: textur('fels_farbe.jpg') },
      uFelsNormal: { value: textur('fels_normal.jpg', false) },
      uWeltGroesse: { value: WELT_GROESSE },
      uWasserspiegel: { value: wasserspiegel() },
    });
    shader.vertexShader = 'varying vec3 vWelt;\nvarying vec3 vWeltNormal;\n' + shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vWelt = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vWeltNormal = normalize(mat3(modelMatrix) * objectNormal);`,
    );
    shader.fragmentShader = BODEN_GLSL_KOPF + shader.fragmentShader
      .replace('#include <map_fragment>', /* glsl */ `
        vec2 rasterUv = (vWelt.xz + uWeltGroesse * 0.5) / uWeltGroesse;
        vec4 m = texture2D(uMaske, rasterUv);
        float gross = bRauschen(vWelt.xz * 0.02);
        float mittel = bRauschen(vWelt.xz * 0.11 + 7.0);
        // Übergänge mit Rauschen auflockern
        float erdeW = clamp(m.g + (mittel - 0.5) * 0.35 * m.g, 0.0, 1.0);
        float felsW = clamp(m.b * 1.15, 0.0, 1.0);
        float uferW = m.a;
        vec3 gras = ohneKacheln(uGrasFarbe, vWelt.xz * 0.42).rgb;
        gras *= mix(vec3(1.0), vec3(1.18, 1.08, 0.78), smoothstep(0.55, 0.85, gross)); // trockene Stellen
        gras *= 0.85 + 0.3 * mittel;
        // Aus der Ferne sieht man nicht den Boden, sondern die Halme: dorthin mischen
        float fern = smoothstep(25.0, 75.0, distance(vWelt, cameraPosition));
        vec3 grasFern = mix(vec3(0.17, 0.25, 0.06), vec3(0.34, 0.33, 0.13), smoothstep(0.5, 0.9, gross)) * (0.85 + 0.3 * mittel);
        gras = mix(gras, grasFern, fern * 0.8);
        vec3 erde = ohneKacheln(uErdeFarbe, vWelt.xz * 0.33).rgb;
        erde = mix(erde, vec3(dot(erde, vec3(0.33))), 0.35) * vec3(1.0, 0.97, 0.9) * 1.25; // weniger rötlich, etwas heller (Laubstreu)
        vec3 fels = dreiseitig(uFelsFarbe, vWelt, normalize(vWeltNormal), 0.18);
        vec3 schlamm = erde * vec3(0.55, 0.52, 0.5);
        vec3 farbe = gras;
        farbe = mix(farbe, erde, erdeW);
        farbe = mix(farbe, schlamm, uferW);
        farbe = mix(farbe, fels, felsW);
        // nasser, dunkler Rand am Wasser
        float nass = 1.0 - smoothstep(uWasserspiegel, uWasserspiegel + 0.35, vWelt.y);
        farbe *= 1.0 - 0.35 * nass;
        diffuseColor.rgb *= farbe;
      `)
      .replace('#include <roughnessmap_fragment>', /* glsl */ `
        float roughnessFactor = mix(0.95, 0.88, erdeW);
        roughnessFactor = mix(roughnessFactor, 0.82, felsW);
        roughnessFactor = mix(roughnessFactor, 0.35, nass);
      `)
      .replace('#include <normal_fragment_maps>', /* glsl */ `
        {
          vec3 nW = normalize(vWeltNormal);
          vec3 t = normalize(vec3(1.0, 0.0, 0.0) - nW * nW.x);
          vec3 b = normalize(cross(t, nW));
          vec3 nErde = texture2D(uErdeNormal, vWelt.xz * 0.33).xyz * 2.0 - 1.0;
          vec3 nFels = texture2D(uFelsNormal, (abs(nW.x) > abs(nW.z) ? vWelt.zy : vWelt.xy) * 0.18).xyz * 2.0 - 1.0;
          vec3 nT = normalize(mix(mix(vec3(0.0, 0.0, 1.0), nErde, erdeW * 0.8 + uferW * 0.5), nFels, felsW * 0.9));
          vec3 neu = normalize(t * nT.x + b * nT.y + nW * nT.z);
          normal = normalize((viewMatrix * vec4(neu, 0.0)).xyz);
        }
      `);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'gelaende';
  return mesh;
}
