// Gemeinsamer Wind für Gras, Bäume, Wolken, Feuer. Ein Wert, überall gleich.
import * as THREE from 'three';

export const wind = {
  zeit: { value: 0 },
  richtung: { value: new THREE.Vector2(0.8, 0.6).normalize() },
  staerke: { value: 0.55 },
};

// Böen: langsam schwankende Stärke
export function windSchritt(dt) {
  wind.zeit.value += dt;
  const t = wind.zeit.value;
  wind.staerke.value = 0.45 + 0.25 * Math.sin(t * 0.13) + 0.15 * Math.sin(t * 0.37 + 1.7);
}

// GLSL: Rauschen für Wind (wird in mehrere Shader eingesetzt)
export const WIND_GLSL = /* glsl */ `
uniform float uZeit;
uniform vec2 uWindRichtung;
uniform float uWindStaerke;
float windHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float windRauschen(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(windHash(i), windHash(i + vec2(1, 0)), u.x), mix(windHash(i + vec2(0, 1)), windHash(i + vec2(1, 1)), u.x), u.y);
}
// Böe an einem Ort: wandert mit dem Wind über das Land
float windBoe(vec2 ort) {
  vec2 p = ort * 0.035 - uWindRichtung * uZeit * 0.6;
  return windRauschen(p) * 0.7 + windRauschen(p * 2.7 + 3.1) * 0.3;
}
`;

export function windUniforms(ziel) {
  ziel.uZeit = wind.zeit;
  ziel.uWindRichtung = wind.richtung;
  ziel.uWindStaerke = wind.staerke;
  return ziel;
}
