// Wald mit EZ-Tree (MIT, Daniel Greenheck): echte Äste, Rinden- und Blatttexturen.
// Drei Entfernungen:
//   nah    – feine Bäume mit Schatten und Wind
//   mittel – vereinfachte Bäume
//   fern   – vorgerenderte Bilder der Bäume (immer zur Kamera gedreht), damit tausende möglich sind
import * as THREE from 'three';
import { Tree } from '../../vendor/ez-tree/tree.js';
import { hoeheBei, neigungBei, waldDichte, wasserspiegel, WELT_GROESSE } from './gelaende.js';
import { ALTER_BAUM, BEERENSTRAEUCHER, START } from './orte.js';
import { WIND_GLSL, windUniforms } from './wind.js';
import { zufall } from './zufall.js';

const MASSSTAB = 0.1; // EZ-Tree rechnet in Dezimetern
const RASTER = 4.4; // mittlerer Baumabstand im dichten Wald (Meter)
let NAH = 45, MITTEL = 95;

// Jede Saat ist eine eigene Wuchsform; mehr Saaten = mehr Abwechslung (bis 32 Formen passen in den Bildatlas)
const ARTEN = [
  { name: 'eiche', vorlage: 'Oak Medium', saaten: [11, 23, 37, 41, 58], massstab: [0.8, 1.9], gebiet: 'laub' },
  { name: 'eiche-jung', vorlage: 'Oak Small', saaten: [4, 15], massstab: [0.9, 1.5], gebiet: 'laub' },
  { name: 'eiche-gross', vorlage: 'Oak Large', saaten: [5, 29], massstab: [1.1, 1.6], gebiet: 'laub' },
  { name: 'esche', vorlage: 'Ash Medium', saaten: [7, 19, 31], massstab: [0.9, 1.9], gebiet: 'laub' },
  { name: 'esche-gross', vorlage: 'Ash Large', saaten: [12, 44], massstab: [0.9, 1.4], gebiet: 'laub' },
  { name: 'birke', vorlage: 'Aspen Medium', saaten: [8, 21, 33], massstab: [0.9, 1.5], gebiet: 'laub', rinde: 'birch' },
  { name: 'espe', vorlage: 'Aspen Medium', saaten: [3], massstab: [1.0, 1.6], gebiet: 'laub', selten: true },
  { name: 'kiefer', vorlage: 'Pine Medium', saaten: [2, 13, 26], massstab: [1.8, 3.0], gebiet: 'nadel' },
  { name: 'kiefer-gross', vorlage: 'Pine Large', saaten: [17, 39], massstab: [1.8, 2.7], gebiet: 'nadel' },
  { name: 'busch', vorlage: 'Bush 1', saaten: [4, 8], massstab: [0.5, 0.8], gebiet: 'busch' },
  { name: 'busch2', vorlage: 'Bush 2', saaten: [6], massstab: [0.5, 0.7], gebiet: 'busch' },
  { name: 'busch3', vorlage: 'Bush 3', saaten: [9], massstab: [0.5, 0.8], gebiet: 'busch' },
];

const lader = new THREE.TextureLoader();
const texturen = new Map();
function textur(datei, farbe = true) {
  if (!texturen.has(datei)) {
    const t = lader.load(new URL(`../../assets/baeume/${datei}`, import.meta.url).href);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    if (farbe) t.colorSpace = THREE.SRGBColorSpace;
    texturen.set(datei, t);
  }
  return texturen.get(datei);
}
function texturGeladen(datei) {
  const t = textur(datei);
  return new Promise((r) => {
    const pruefe = () => (t.image && t.image.complete !== false ? r(t) : setTimeout(pruefe, 30));
    pruefe();
  });
}

// Ganze Baum-Schwankung (abhängig von der Höhe im Baum) + Flattern der Blätter
const WIND_VERTEX = /* glsl */ `
  #ifdef USE_INSTANCING
    vec3 baumOrt = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  #else
    vec3 baumOrt = vec3(modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2]);
  #endif
  float hoeheImBaum = max(position.y, 0.0) * uMassstab;
  float boe = windBoe(baumOrt.xz);
  float schwanken = (sin(uZeit * 0.9 + baumOrt.x * 0.3) * 0.5 + 0.5) * 0.5 + boe;
  vec2 versatz = uWindRichtung * schwanken * uWindStaerke * 0.012 * hoeheImBaum * hoeheImBaum;
  transformed.xz += versatz / max(uMassstab, 0.001);
  #ifdef BLAETTER
    float flattern = sin(uZeit * 6.0 + dot(position, vec3(0.7, 1.3, 0.9))) * 0.6 + boe;
    transformed += normal * flattern * 0.6 * uWindStaerke * uv.y;
  #endif
`;

// Laub und Äste direkt vor der Kamera gerastert ausblenden. Sonst schaut man durch eine Wand aus
// Blättern, wenn man unter einem tiefen Ast steht oder sich durch einen Busch bewegt.
const NAH_AUSBLENDEN = /* glsl */ `
  {
    float sicht = smoothstep(0.6, 1.3, vViewPosition.z);
    float raster = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    if (sicht < raster) discard;
  }
`;

function windMaterial(mat, blaetter) {
  const uniforms = windUniforms({ uMassstab: { value: MASSSTAB }, uLichtDurch: { value: new THREE.Color() } });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = (blaetter ? '#define BLAETTER\n' : '') + 'uniform float uMassstab;\n' + WIND_GLSL +
      shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND_VERTEX);
    // Nur beim Zeichnen fürs Auge, nicht beim Schattenwurf (der hat keine Kamera-Entfernung)
    const fuersAuge = shader.fragmentShader.includes('#include <opaque_fragment>');
    if (fuersAuge) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + NAH_AUSBLENDEN);
    }
    if (blaetter && fuersAuge) {
      shader.fragmentShader = 'uniform vec3 uLichtDurch;\n' + shader.fragmentShader.replace('#include <opaque_fragment>', /* glsl */ `
        outgoingLight += diffuseColor.rgb * uLichtDurch * 0.6; // Gegenlicht schimmert durch die Blätter
        #include <opaque_fragment>
      `);
    }
  };
  mat.customProgramCacheKey = () => (blaetter ? 'baum-blatt' : 'baum-rinde');
  return uniforms;
}

function erzeugeArt(art, saat, grob) {
  const baum = new Tree();
  baum.loadPreset(art.vorlage);
  baum.options.seed = saat;
  if (art.rinde) baum.options.bark.type = art.rinde;
  if (grob) {
    for (const ebene of Object.keys(baum.options.branch.sections)) {
      baum.options.branch.sections[ebene] = Math.max(3, Math.round(baum.options.branch.sections[ebene] * 0.45));
      baum.options.branch.segments[ebene] = Math.max(3, Math.round(baum.options.branch.segments[ebene] * 0.5));
    }
    baum.options.leaves.count = Math.max(1, Math.round(baum.options.leaves.count * 0.5));
    baum.options.leaves.size *= 1.4;
  }
  baum.generate();
  return { rinde: baum.branchesMesh.geometry, blaetter: baum.leavesMesh.geometry, optionen: baum.options };
}

function materialien(optionen) {
  const typ = optionen.bark.type;
  const skala = optionen.bark.textureScale;
  const farbe = textur(`${typ}_color_1k.jpg`).clone();
  const normal = textur(`${typ}_normal_1k.jpg`, false).clone();
  const rauh = textur(`${typ}_roughness_1k.jpg`, false).clone();
  for (const t of [farbe, normal, rauh]) { t.repeat.set(skala.x, 1 / skala.y); t.needsUpdate = true; }
  const rinde = new THREE.MeshStandardMaterial({
    map: farbe, normalMap: normal, roughnessMap: rauh, color: new THREE.Color(optionen.bark.tint).multiplyScalar(0.85),
  });
  const blatt = new THREE.MeshStandardMaterial({
    map: textur(`blatt_${optionen.leaves.type}.png`), color: new THREE.Color(optionen.leaves.tint),
    side: THREE.DoubleSide, alphaTest: 0.5, roughness: 0.7,
  });
  const tiefe = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blatt.map, alphaTest: 0.5 });
  return { rinde, blatt, tiefe, blattDatei: `blatt_${optionen.leaves.type}.png`, rindenDatei: `${typ}_color_1k.jpg` };
}

// ---------------------------------------------------------------- Bilder für ferne Bäume

const ATLAS_SPALTEN = 8, ATLAS_ZEILEN = 4, ZELLE_B = 256, ZELLE_H = 512;
// Leerer Rand um jedes Bild (Seitenverhältnis bleibt 1:2). Ohne ihn verschwimmen die Bilder aus der
// Ferne mit ihren Nachbarn, und vom Stamm des Baums darüber landen dunkle Pünktchen im Himmel.
const RAND_B = 24, RAND_H = 48, MAX_STUFE = 4.0;

async function backeAtlas(renderer, varianten) {
  const dateien = new Set(varianten.flatMap((v) => [v.mat.blattDatei, v.mat.rindenDatei]));
  await Promise.all([...dateien].map(texturGeladen));
  const ziel = new THREE.WebGLRenderTarget(ATLAS_SPALTEN * ZELLE_B, ATLAS_ZEILEN * ZELLE_H, {
    generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter,
  });
  const szene = new THREE.Scene();
  szene.add(new THREE.HemisphereLight(0xdfe9f2, 0x3a3326, 1.6));
  const sonne = new THREE.DirectionalLight(0xfff1df, 2.2);
  sonne.position.set(0.4, 1, 1.2);
  szene.add(sonne);
  const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  const alteFarbe = renderer.getClearColor(new THREE.Color()), alteDeckung = renderer.getClearAlpha();
  const alteZiel = renderer.getRenderTarget();
  const alterViewport = renderer.getViewport(new THREE.Vector4());
  renderer.setRenderTarget(ziel);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.setScissorTest(true);
  varianten.forEach((v, i) => {
    const gruppe = new THREE.Group();
    gruppe.add(new THREE.Mesh(v.grob.rinde, v.mat.rinde), new THREE.Mesh(v.grob.blaetter, v.mat.blatt));
    szene.add(gruppe);
    const box = new THREE.Box3().setFromObject(gruppe);
    const breite = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    const hoehe = box.max.y - box.min.y;
    const halb = Math.max(breite / 2, hoehe / 4) * 1.02;
    kamera.left = -halb; kamera.right = halb; kamera.bottom = box.min.y; kamera.top = box.min.y + halb * 4;
    kamera.position.set(0, 0, 150); kamera.lookAt(0, 0, 0);
    kamera.updateProjectionMatrix();
    const sp = i % ATLAS_SPALTEN, ze = Math.floor(i / ATLAS_SPALTEN);
    ziel.viewport.set(sp * ZELLE_B + RAND_B, ze * ZELLE_H + RAND_H, ZELLE_B - 2 * RAND_B, ZELLE_H - 2 * RAND_H);
    ziel.scissor.set(sp * ZELLE_B + RAND_B, ze * ZELLE_H + RAND_H, ZELLE_B - 2 * RAND_B, ZELLE_H - 2 * RAND_H);
    ziel.scissorTest = true;
    renderer.setRenderTarget(ziel);
    renderer.render(szene, kamera);
    v.bild = { zelle: i, breite: halb * 2, hoehe: halb * 4, unten: box.min.y };
    szene.remove(gruppe);
  });
  ziel.viewport.set(0, 0, ziel.width, ziel.height);
  ziel.scissor.set(0, 0, ziel.width, ziel.height);
  ziel.scissorTest = false;
  renderer.setScissorTest(false);
  renderer.setRenderTarget(alteZiel);
  renderer.setClearColor(alteFarbe, alteDeckung);
  renderer.setViewport(alterViewport);
  return ziel.texture;
}

const FERN_VERTEX = /* glsl */ `
attribute vec4 baum;   // x, y, z, Maßstab
attribute vec4 bild;   // Atlas-Spalte, -Zeile, Breite, Höhe (in Baum-Einheiten)
attribute float unten;
uniform vec3 uKamera;
uniform float uAb;
varying vec2 vUv;
varying float vBlende;
#include <fog_pars_vertex>
void main() {
  float d = distance(baum.xz, uKamera.xz);
  vBlende = smoothstep(uAb - 4.0, uAb + 8.0, d);
  vec3 zurKamera = uKamera - baum.xyz;
  zurKamera.y = 0.0;
  vec3 rechts = normalize(cross(vec3(0.0, 1.0, 0.0), zurKamera + vec3(1e-4, 0.0, 0.0)));
  float b = bild.z * baum.w, h = bild.w * baum.w;
  vec3 ort = baum.xyz + rechts * position.x * b + vec3(0.0, position.y * h + unten * baum.w, 0.0);
  if (vBlende <= 0.0) ort = vec3(0.0, -1e5, 0.0);
  vec2 zelle = vec2(${ZELLE_B.toFixed(1)}, ${ZELLE_H.toFixed(1)}), rand = vec2(${RAND_B.toFixed(1)}, ${RAND_H.toFixed(1)});
  vec2 imBild = vec2(position.x + 0.5, position.y);
  vUv = (vec2(bild.x, bild.y) * zelle + rand + imBild * (zelle - 2.0 * rand)) / (zelle * vec2(${ATLAS_SPALTEN.toFixed(1)}, ${ATLAS_ZEILEN.toFixed(1)}));
  vec4 mvPosition = viewMatrix * vec4(ort, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FERN_FRAGMENT = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uLicht;
varying vec2 vUv;
varying float vBlende;
#include <fog_pars_fragment>
float raster(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() {
  // Verschwimmstufe begrenzen: weiter weg als bis zum leeren Rand darf nichts verschmieren
  vec2 t = vUv * vec2(${(ATLAS_SPALTEN * ZELLE_B).toFixed(1)}, ${(ATLAS_ZEILEN * ZELLE_H).toFixed(1)});
  float stufe = 0.5 * log2(max(dot(dFdx(t), dFdx(t)), dot(dFdy(t), dFdy(t))));
  vec4 f = textureLod(uAtlas, vUv, clamp(stufe, 0.0, ${MAX_STUFE.toFixed(1)}));
  if (f.a < 0.45) discard;
  if (raster(gl_FragCoord.xy) > vBlende) discard; // weich einblenden (gerastert)
  gl_FragColor = vec4(f.rgb / max(f.a, 0.001) * uLicht, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

// ---------------------------------------------------------------- Verteilung

// Zufällig gestreut (kein Raster, sonst stehen die Bäume in Reihen wie in einer Plantage),
// mit Mindestabstand, damit sich Stämme nicht berühren. Dazu Gruppen und Lücken durch Rauschen.
function waldPlaetze(z) {
  const plaetze = [];
  const wsp = wasserspiegel();
  const rand = WELT_GROESSE / 2 - 25;
  const versuche = Math.round(((2 * rand) ** 2 / (RASTER * RASTER)) * 1.6);
  const belegt = new Map();
  const MIN = 2.6;
  const frei = (x, zz) => {
    const ix = Math.floor(x / MIN), iz = Math.floor(zz / MIN);
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        const p = belegt.get((ix + a) * 100000 + iz + b);
        if (p && Math.hypot(p.x - x, p.z - zz) < MIN) return false;
      }
    }
    return true;
  };
  for (let i = 0; i < versuche; i++) {
    const x = (z() - 0.5) * 2 * rand, zz = (z() - 0.5) * 2 * rand;
    const w = waldDichte(x, zz);
    if (z() > w * 0.74) continue; // dichter Wald: mehr Bäume als früher (Jakob: „nicht richtig gefüllt“)
    if (!frei(x, zz)) continue;
    if (neigungBei(x, zz) > 0.75) continue;
    const y = hoeheBei(x, zz);
    if (y < wsp + 0.4) continue;
    const d = Math.hypot(x - START.x, zz - START.z);
    const nadel = THREE.MathUtils.smoothstep(d, 140, 220) * 0.85 + (y > 22 ? 0.35 : 0);
    const p = { x, y, z: zz, nadel: z() < nadel, drehung: z() * Math.PI * 2, wahl: z(), groesse: z() };
    belegt.set(Math.floor(x / MIN) * 100000 + Math.floor(zz / MIN), p);
    plaetze.push(p);
  }
  return plaetze;
}

export async function erzeugeBaeume(qualitaet, renderer) {
  const z = zufall(4242);
  const gruppe = new THREE.Group();
  gruppe.name = 'baeume';
  const alleUniforms = [];

  const varianten = [];
  for (const art of ARTEN) {
    for (const saat of art.saaten) {
      const fein = erzeugeArt(art, saat, false);
      const grob = erzeugeArt(art, saat, true);
      const mat = materialien(fein.optionen);
      alleUniforms.push(windMaterial(mat.rinde, false), windMaterial(mat.blatt, true));
      windMaterial(mat.tiefe, true);
      varianten.push({ art, fein, grob, mat, plaetze: [] });
    }
  }
  const laub = varianten.filter((v) => v.art.gebiet === 'laub' && !v.art.selten);
  const selten = varianten.filter((v) => v.art.selten);
  const nadel = varianten.filter((v) => v.art.gebiet === 'nadel');
  const busch = varianten.filter((v) => v.art.gebiet === 'busch');

  const alle = [];
  const setze = (v, p, s) => {
    // weg: gefällt (nur der Stumpf steht noch); wuchs: wie groß er gerade ist (ein nachwachsender Baum ist erst klein)
    // Jeder Baum ein bisschen anders: Laubfarbe, Wuchs in die Höhe, leichte Neigung (aus dem Ort berechnet,
    // damit die Zufallsfolge der Plätze gleich bleibt)
    const h = (k) => { const t = Math.sin(p.x * 12.9898 + p.z * 78.233 + k * 37.719) * 43758.5453; return t - Math.floor(t); };
    const farbe = new THREE.Color().setHSL(0, 0, 1).offsetHSL((h(1) - 0.5) * 0.05, (h(2) - 0.5) * 0.25, (h(3) - 0.5) * 0.18);
    const baum = { x: p.x, y: p.y, z: p.z, drehung: p.drehung, v, s, nr: alle.length, weg: false, wuchs: 1,
      farbe, streck: 0.9 + h(4) * 0.22, neigX: (h(5) - 0.5) * 0.08, neigZ: (h(6) - 0.5) * 0.08 };
    v.plaetze.push(baum);
    alle.push(baum);
  };
  for (const p of waldPlaetze(z)) {
    const liste = p.nadel ? nadel : (p.wahl > 0.95 ? selten : laub);
    const v = liste[Math.floor(p.wahl * 997) % liste.length];
    const [a, b] = v.art.massstab;
    // am Waldrand eher junge, kleinere Bäume; innen alte, große
    const w = waldDichte(p.x, p.z);
    const alter = Math.min(1, p.groesse * 0.7 + w * 0.5);
    setze(v, p, (a + (b - a) * alter) * MASSSTAB);
    // Unterholz: Büsche, am Waldrand mehr
    const buschChance = w < 0.7 ? 0.75 : 0.5;
    for (let k = 0; k < 2; k++) {
      if (z() > buschChance) continue;
      const bx = p.x + (z() - 0.5) * 4, bz = p.z + (z() - 0.5) * 4;
      const vb = busch[Math.floor(z() * busch.length)];
      setze(vb, { x: bx, y: hoeheBei(bx, bz), z: bz, drehung: z() * 6.28 }, (0.45 + z() * 0.45) * MASSSTAB);
    }
  }
  const beerenPlaetze = BEERENSTRAEUCHER.map((o, i) => ({ x: o.x, y: hoeheBei(o.x, o.z), z: o.z, drehung: i * 1.7, s: 0.75 * MASSSTAB }));
  for (const p of beerenPlaetze) setze(busch[0], p, p.s);
  const alt = varianten.find((v) => v.art.name === 'eiche-gross');
  setze(alt, { x: ALTER_BAUM.x, y: hoeheBei(ALTER_BAUM.x, ALTER_BAUM.z), z: ALTER_BAUM.z, drehung: 0.6 }, 1.45 * MASSSTAB);

  // Raster zum schnellen Finden naher Bäume
  const ZELLE = 24;
  const zellen = new Map();
  for (const b of alle) {
    const k = `${Math.floor(b.x / ZELLE)},${Math.floor(b.z / ZELLE)}`;
    if (!zellen.has(k)) zellen.set(k, []);
    zellen.get(k).push(b);
  }

  // Nah und mittel: wiederverwendete Netze je Variante
  const stufen = new Map();
  for (const v of varianten) {
    const n = Math.max(1, Math.min(v.plaetze.length, 700));
    const eintrag = {};
    for (const [name, form] of [['fein', v.fein], ['grob', v.grob]]) {
      const rinde = new THREE.InstancedMesh(form.rinde, v.mat.rinde, n);
      const blatt = new THREE.InstancedMesh(form.blaetter, v.mat.blatt, n);
      blatt.customDepthMaterial = v.mat.tiefe;
      for (const mesh of [rinde, blatt]) {
        mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
        mesh.castShadow = name === 'fein';
        mesh.receiveShadow = true;
        mesh.count = 0;
        mesh.frustumCulled = false;
        gruppe.add(mesh);
      }
      eintrag[name] = { rinde, blatt, max: n };
    }
    stufen.set(v, eintrag);
  }

  // Fern: Bilder aller Bäume (außer Büschen) in einem Netz
  const atlas = await backeAtlas(renderer, varianten);
  const ferne = alle.filter((b) => b.v.art.gebiet !== 'busch');
  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]);
  const baumAttr = new Float32Array(ferne.length * 4), bildAttr = new Float32Array(ferne.length * 4), untenAttr = new Float32Array(ferne.length);
  ferne.forEach((b, i) => {
    b.fernNr = i;
    baumAttr.set([b.x, b.y - 0.15, b.z, b.s], i * 4);
    const bi = b.v.bild;
    bildAttr.set([bi.zelle % ATLAS_SPALTEN, Math.floor(bi.zelle / ATLAS_SPALTEN), bi.breite, bi.hoehe], i * 4);
    untenAttr[i] = bi.unten;
  });
  quad.setAttribute('baum', new THREE.InstancedBufferAttribute(baumAttr, 4));
  quad.setAttribute('bild', new THREE.InstancedBufferAttribute(bildAttr, 4));
  quad.setAttribute('unten', new THREE.InstancedBufferAttribute(untenAttr, 1));
  quad.instanceCount = ferne.length;
  const fernUniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uKamera: { value: new THREE.Vector3() }, uAb: { value: MITTEL }, uLicht: { value: new THREE.Color(1, 1, 1) },
  }]);
  fernUniforms.uAtlas = { value: atlas };
  const fernMat = new THREE.ShaderMaterial({ vertexShader: FERN_VERTEX, fragmentShader: FERN_FRAGMENT, uniforms: fernUniforms, fog: true, side: THREE.DoubleSide });
  const fern = new THREE.Mesh(quad, fernMat);
  fern.frustumCulled = false;
  gruppe.add(fern);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const achse = new THREE.Vector3(0, 1, 0);
  const neigung = new THREE.Euler(), rindenFarbe = new THREE.Color(), weiss = new THREE.Color(1, 1, 1);
  let uhr = 0;
  const letzter = new THREE.Vector3(1e9, 0, 0);

  function verteile(ort) {
    for (const e of stufen.values()) for (const st of [e.fein, e.grob]) { st.rinde.count = 0; st.blatt.count = 0; }
    const r = Math.ceil((MITTEL + 10) / ZELLE);
    const cx = Math.floor(ort.x / ZELLE), cz = Math.floor(ort.z / ZELLE);
    for (let a = -r; a <= r; a++) {
      for (let c = -r; c <= r; c++) {
        const liste = zellen.get(`${cx + a},${cz + c}`);
        if (!liste) continue;
        for (const b of liste) {
          const d = Math.hypot(b.x - ort.x, b.z - ort.z);
          const istBusch = b.v.art.gebiet === 'busch';
          if (d > (istBusch ? Math.min(35, MITTEL * 0.6) : MITTEL + 8)) continue;
          if (b.weg) continue;
          const e = stufen.get(b.v);
          const ziel = d < NAH ? e.fein : e.grob;
          if (ziel.rinde.count >= ziel.max) continue;
          p.set(b.x, b.y - 0.15, b.z);
          q.setFromEuler(neigung.set(b.neigX, b.drehung, b.neigZ));
          s.set(b.s * b.wuchs, b.s * b.wuchs * b.streck, b.s * b.wuchs);
          m.compose(p, q, s);
          ziel.rinde.setColorAt(ziel.rinde.count, rindenFarbe.copy(b.farbe).lerp(weiss, 0.6));
          ziel.blatt.setColorAt(ziel.blatt.count, b.farbe);
          ziel.rinde.setMatrixAt(ziel.rinde.count++, m);
          ziel.blatt.setMatrixAt(ziel.blatt.count++, m);
        }
      }
    }
    for (const e of stufen.values()) {
      for (const st of [e.fein, e.grob]) {
        for (const mesh of [st.rinde, st.blatt]) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
      }
    }
  }

  function aktualisiere(dt, ort, licht, kamera, hell) {
    uhr -= dt;
    if (uhr <= 0 || letzter.distanceTo(ort) > 10) {
      uhr = 0.5;
      if (letzter.distanceTo(ort) > 2) { letzter.copy(ort); verteile(ort); }
    }
    for (const u of alleUniforms) u.uLichtDurch.value.copy(licht.farbe).multiplyScalar(licht.staerke * 0.12);
    fernUniforms.uKamera.value.copy(ort);
    fernUniforms.uLicht.value.setScalar(0.1 + 0.9 * hell);
  }

  function setzeQualitaet(stufe) {
    NAH = stufe.name === 'niedrig' ? 14 : stufe.name === 'mittel' ? 20 : 28;
    MITTEL = stufe.name === 'niedrig' ? 38 : stufe.name === 'mittel' ? 50 : 65;
    fernUniforms.uAb.value = MITTEL;
    letzter.set(1e9, 0, 0);
  }
  setzeQualitaet(qualitaet);

  const hindernisse = alle.map((b) => ({
    x: b.x, z: b.z, art: b.v.art.gebiet === 'busch' ? 'busch' : 'baum',
    radius: b.v.art.gebiet === 'busch' ? 0.45 : Math.min(0.6, 0.22 + b.s * 1.6),
  }));
  const beerenBusch = { geometrie: busch[0].fein.blaetter, plaetze: beerenPlaetze };

  // Fällen und Nachwachsen: Ein gefällter Baum verschwindet aus allen drei Entfernungen; ein nachwachsender
  // steht erst klein da. Die Nummer ist dieselbe wie die der Hindernisse (und der Sammelstellen „baum-…“).
  const fernBaum = quad.getAttribute('baum');
  function erneuere(b) {
    if (b.fernNr !== undefined) {
      fernBaum.array[b.fernNr * 4 + 3] = b.weg ? 0 : b.s * b.wuchs;
      fernBaum.needsUpdate = true;
    }
    letzter.set(1e9, 0, 0); // beim nächsten Bild neu verteilen
  }
  function setzeZustand(nr, { weg = alle[nr].weg, wuchs = alle[nr].wuchs } = {}) {
    const b = alle[nr];
    if (b.weg === weg && b.wuchs === wuchs) return;
    b.weg = weg;
    b.wuchs = wuchs;
    erneuere(b);
  }
  // Was man braucht, um den Baum als eigenes Netz umfallen zu lassen
  function form(nr) {
    const b = alle[nr];
    return { rinde: b.v.fein.rinde, blaetter: b.v.fein.blaetter, rindenMat: b.v.mat.rinde, blattMat: b.v.mat.blatt, tiefe: b.v.mat.tiefe,
      x: b.x, y: b.y - 0.15, z: b.z, drehung: b.drehung, s: b.s * b.wuchs, art: b.v.art.name, nadel: b.v.art.gebiet === 'nadel' };
  }
  const rinde = varianten.find((v) => v.art.name === 'eiche')?.mat.rinde;
  return { objekt: gruppe, aktualisiere, setzeQualitaet, anzahl: alle.length, beerenBusch, hindernisse, rinde, setzeZustand, form, baum: (nr) => alle[nr] };
}
