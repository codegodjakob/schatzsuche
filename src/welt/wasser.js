// Der Teich: spiegelt den Himmel, kräuselt sich im Wind, wird zum Ufer hin flach und durchsichtig.
import * as THREE from 'three';
import { rasterTexturen, wasserspiegel } from './gelaende.js';
import { TEICH } from './orte.js';
import { WIND_GLSL, windUniforms } from './wind.js';

export function erzeugeWasser() {
  const { hoehe, groesse } = rasterTexturen();
  const geo = new THREE.CircleGeometry(TEICH.radius * 1.45, 96, 0, Math.PI * 2);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x1d3530, roughness: 0.05, metalness: 0, transparent: true, depthWrite: false,
    envMapIntensity: 1.2, specularIntensity: 1, ior: 1.33,
  });
  const uniforms = windUniforms({ uHoehe: { value: hoehe }, uWeltGroesse: { value: groesse }, uSpiegel: { value: wasserspiegel() } });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = 'varying vec3 vWelt;\n' + shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      vWelt = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = 'varying vec3 vWelt;\nuniform sampler2D uHoehe;\nuniform float uWeltGroesse;\nuniform float uSpiegel;\n' + WIND_GLSL +
      shader.fragmentShader
        .replace('#include <normal_fragment_maps>', /* glsl */ `
          {
            // Wellen: einige wandernde Sinuswellen plus feines Kräuseln
            vec2 p = vWelt.xz;
            vec2 d1 = uWindRichtung, d2 = normalize(vec2(-uWindRichtung.y, uWindRichtung.x) + uWindRichtung * 0.6);
            float t = uZeit;
            vec2 g = vec2(0.0);
            g += d1 * cos(dot(p, d1) * 2.1 - t * 1.9) * 0.06;
            g += d2 * cos(dot(p, d2) * 3.4 - t * 2.6) * 0.04;
            g += vec2(windRauschen(p * 3.0 + t * 0.8) - 0.5, windRauschen(p * 3.0 - t * 0.7 + 9.0) - 0.5) * 0.12;
            g *= 0.4 + uWindStaerke;
            vec3 nW = normalize(vec3(-g.x, 1.0, -g.y));
            normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
          }`)
        .replace('#include <opaque_fragment>', /* glsl */ `
          vec2 rasterUv = (vWelt.xz + uWeltGroesse * 0.5) / uWeltGroesse;
          float tiefe = uSpiegel - texture2D(uHoehe, rasterUv).r;
          float durchsicht = smoothstep(0.0, 0.9, tiefe);
          vec3 blickW = normalize(vWelt - cameraPosition);
          float fresnel = pow(1.0 - max(dot(-blickW, vec3(0.0, 1.0, 0.0)), 0.0), 4.0);
          diffuseColor.a = clamp(mix(0.25, 0.92, durchsicht) + fresnel * 0.4, 0.0, 1.0) * smoothstep(-0.02, 0.06, tiefe);
          #include <opaque_fragment>
        `);
  };
  const wasser = new THREE.Mesh(geo, mat);
  wasser.position.set(TEICH.x, wasserspiegel(), TEICH.z);
  wasser.renderOrder = 2;
  wasser.name = 'teich';
  return wasser;
}
