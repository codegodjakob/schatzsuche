// Lädt ein 3D-Modell (glTF als Binärdatei, .glb).
//
// In der Vorschau auf claude.ai liegt jedes Modell als Text vor (.glb.txt, Base64). Dort werden nur
// eigene Dateien bestimmter Arten ausgeliefert, und Nachladen über data:- oder blob:-Adressen per
// fetch ist gesperrt. Darum wird die Datei als Text geholt und hier entpackt, und die Bilder im
// Modell werden über ein <img> geladen statt über fetch. Das Spiel selbst lädt die .glb direkt.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const lader = new GLTFLoader();
const textLader = new GLTFLoader().register((parser) => {
  parser.textureLoader = new THREE.TextureLoader(parser.options.manager);
  return { name: 'bilder_ueber_img' };
});

export async function ladeModell(url) {
  if (!url.endsWith('.txt')) return lader.loadAsync(url);
  const antwort = await fetch(url);
  if (!antwort.ok) throw new Error(`${url} nicht gefunden (${antwort.status})`);
  const roh = atob(await antwort.text());
  const daten = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) daten[i] = roh.charCodeAt(i);
  return textLader.parseAsync(daten.buffer, url.slice(0, url.lastIndexOf('/') + 1));
}
