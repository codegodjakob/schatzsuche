// Bild-Nachbearbeitung: Umgebungsverdeckung (Ecken und Kontaktstellen dunkler), leichtes
// Überstrahlen heller Stellen, Kantenglättung, Farbumrechnung. Je nach Qualitätsstufe.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Farbabstimmung wie im Film: etwas mehr Sättigung und Kontrast, warme Lichter, kühle Schatten,
// leicht abgedunkelte Ränder. Läuft nach der Umrechnung in Bildschirmfarben.
const FARBE = {
  uniforms: { tDiffuse: { value: null }, uSaettigung: { value: 1.12 }, uKontrast: { value: 1.07 }, uRand: { value: 0.22 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uSaettigung, uKontrast, uRand;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSaettigung);
      c = (c - 0.5) * uKontrast + 0.5;
      c *= mix(vec3(0.97, 0.99, 1.04), vec3(1.04, 1.0, 0.95), smoothstep(0.2, 0.8, l));
      float rand = smoothstep(0.85, 0.25, length(vUv - 0.5));
      c *= mix(1.0 - uRand, 1.0, rand);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

// Umgebungsverdeckung aus der Tiefe des fertigen Bildes. Von Haus aus zeichnet GTAOPass die Welt
// ein zweites Mal mit einem Einheitsmaterial: Blätter wären dort volle Rechtecke (eckige Schatten im
// Himmel zwischen den Blättern), Gras und ferne Bäume lägen auf einem Haufen, und alles kostete
// doppelt. Mit der echten Tiefe stimmt die Verdeckung mit dem Bild überein und der zweite Durchgang
// entfällt. (Der Pass bekommt die Tiefe erst hier, weil setGBuffer im Konstruktor mit fremder Tiefe
// an einem fehlenden Ziel scheitert.)
class Verdeckung extends GTAOPass {
  render(renderer, writeBuffer, readBuffer, ...rest) {
    const tiefe = readBuffer.depthTexture;
    if (this.depthTexture !== tiefe) {
      const ersterWechsel = this._renderGBuffer;
      this.setGBuffer(tiefe);
      if (ersterWechsel) this.gtaoMaterial.needsUpdate = this.pdMaterial.needsUpdate = true;
    }
    super.render(renderer, writeBuffer, readBuffer, ...rest);
  }
}

export function erzeugeNachbearbeitung(renderer, szene, kamera) {
  const ziel = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 0, depthTexture: new THREE.DepthTexture(1, 1) });
  const komponist = new EffectComposer(renderer, ziel);
  const render = new RenderPass(szene, kamera);
  const verdeckung = new Verdeckung(szene, kamera, 1, 1);
  verdeckung.output = GTAOPass.OUTPUT.Default;
  verdeckung.blendIntensity = 0.6;
  verdeckung.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: 12 });
  verdeckung.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
  const leuchten = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.18, 0.5, 0.92);
  const ausgabe = new OutputPass();
  const farbe = new ShaderPass(FARBE);
  const kanten = new SMAAPass(1, 1);
  komponist.addPass(render);
  komponist.addPass(verdeckung);
  komponist.addPass(leuchten);
  komponist.addPass(ausgabe);
  komponist.addPass(farbe);
  komponist.addPass(kanten);

  let aktiv = true;
  function setzeQualitaet(stufe) {
    aktiv = stufe.nachbearbeitung;
    verdeckung.enabled = stufe.verdeckung;
    kanten.enabled = stufe.kantenglaettung;
  }
  function groesse(b, h, pixel) {
    komponist.setPixelRatio(pixel);
    komponist.setSize(b, h);
  }
  function zeichne() {
    if (aktiv) komponist.render();
    else renderer.render(szene, kamera);
  }
  return { setzeQualitaet, groesse, zeichne };
}
