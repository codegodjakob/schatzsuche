// Lädt ein 3D-Modell (glTF als Binärdatei, .glb) und meldet dabei, wie viel schon da ist.
//
// In der Vorschau auf claude.ai liegt jedes Modell als Text vor (.glb.txt, Base64). Dort werden nur
// eigene Dateien bestimmter Arten ausgeliefert, und Nachladen über data:- oder blob:-Adressen per
// fetch ist gesperrt. Darum wird die Datei hier selbst geholt und entpackt, und die Bilder im
// Modell werden über ein <img> geladen statt über fetch. Das Spiel selbst lädt die .glb direkt.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const lader = new GLTFLoader();
const textLader = new GLTFLoader().register((parser) => {
  parser.textureLoader = new THREE.TextureLoader(parser.options.manager);
  return { name: 'bilder_ueber_img' };
});

// beiFortschritt(geladen, gesamt): Bytes bisher und insgesamt (gesamt 0, wenn der Server es nicht sagt)
export async function ladeModell(url, beiFortschritt) {
  const antwort = await fetch(url);
  if (!antwort.ok) throw new Error(`${url} nicht gefunden (${antwort.status})`);
  const gesamt = Number(antwort.headers.get('content-length')) || 0;
  const teile = [];
  let geladen = 0;
  const leser = antwort.body?.getReader();
  if (leser) {
    for (;;) {
      const { done, value } = await leser.read();
      if (done) break;
      teile.push(value);
      geladen += value.length;
      beiFortschritt?.(geladen, gesamt);
    }
  } else {
    teile.push(new Uint8Array(await antwort.arrayBuffer()));
  }
  let daten = new Uint8Array(teile.reduce((summe, teil) => summe + teil.length, 0));
  let ort = 0;
  for (const teil of teile) { daten.set(teil, ort); ort += teil.length; }
  const basis = url.slice(0, url.lastIndexOf('/') + 1);
  if (!url.endsWith('.txt')) return lader.parseAsync(daten.buffer, basis);
  const roh = atob(new TextDecoder().decode(daten));
  daten = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) daten[i] = roh.charCodeAt(i);
  return textLader.parseAsync(daten.buffer, basis);
}
