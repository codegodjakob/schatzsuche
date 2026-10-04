// Ein kurzes Aufblitzen über Dingen, die man aufheben kann (Äste, Steine, Pilze), wie Sonnenlicht auf
// nasser Rinde. Jedes Ding blitzt zu seiner eigenen Zeit, nur in der Nähe (bis etwa 30 Meter).
// Ein einziger Zeichenaufruf für alle; was genommen wurde, blitzt nicht mehr.
import * as THREE from 'three';

export function erzeugeFunkeln(punkte) {
  const n = Math.max(1, punkte.length);
  const ort = new Float32Array(n * 3), phase = new Float32Array(n), da = new Float32Array(n).fill(1);
  punkte.forEach((p, i) => { ort.set([p.x, p.y, p.z], i * 3); phase[i] = (i * 2.399) % (Math.PI * 2); });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(ort, 3));
  geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  const daAttr = new THREE.BufferAttribute(da, 1);
  geo.setAttribute('da', daAttr);
  geo.setDrawRange(0, punkte.length);
  const zeit = { value: 0 }, nacht = { value: 0 };
  const mat = new THREE.ShaderMaterial({
    uniforms: { uZeit: zeit, uNacht: nacht, uPixel: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float phase;
      attribute float da;
      uniform float uZeit, uPixel;
      varying float vStaerke;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float d = -mv.z;
        float blitz = pow(max(0.0, sin(uZeit * 0.9 + phase)), 18.0);
        float nahFern = smoothstep(1.2, 3.0, d) * (1.0 - smoothstep(18.0, 30.0, d));
        vStaerke = blitz * nahFern * da;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = vStaerke > 0.002 ? uPixel * (14.0 + 22.0 * blitz) * clamp(6.0 / d, 0.45, 1.6) : 0.0;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uNacht;
      varying float vStaerke;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float kern = exp(-dot(p, p) * 9.0);
        float strahl = exp(-abs(p.x) * 26.0) * (1.0 - abs(p.y)) + exp(-abs(p.y) * 26.0) * (1.0 - abs(p.x));
        float a = (kern + strahl * 0.8) * vStaerke * (1.0 - uNacht * 0.6);
        gl_FragColor = vec4(vec3(1.0, 0.94, 0.78) * a * 1.6, a);
      }`,
  });
  const objekt = new THREE.Points(geo, mat);
  objekt.frustumCulled = false;
  objekt.renderOrder = 3;
  objekt.name = 'funkeln';
  return {
    objekt,
    zeige(i, ja) { da[i] = ja ? 1 : 0; daAttr.needsUpdate = true; },
    aktualisiere(dt, hell, pixel) { zeit.value += dt; nacht.value = 1 - hell; mat.uniforms.uPixel.value = pixel; },
  };
}
