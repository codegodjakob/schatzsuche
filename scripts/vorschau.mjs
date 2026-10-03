// Bereitet eine Vorschau vor, die Claude als Artifact veröffentlichen kann
// (ein Link, den man im Browser öffnet und sofort spielt).
// Ergebnis: ein Ordner (Standard: vorschau/, sonst der erste Aufrufwert) mit index.html,
// allen Dateien, die mitmüssen, und dateien.json (die Liste für das Artifact-Werkzeug).
//
// Artifacts liefern keine .glb-Dateien aus. Darum werden die Modelle hier in .gltf.json
// umgewandelt (dasselbe Modell als Text, die Binärdaten eingebettet) und die Verweise im
// kopierten Spielcode angepasst. Das Spiel selbst bleibt bei .glb.
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const ZIEL = resolve(process.argv[2] ?? join(WURZEL, 'vorschau'));

// Grenzen des Artifact-Werkzeugs (pro Datei, pro Veröffentlichung)
const MAX_DATEI = 15e6, MAX_GESAMT = 64e6, MAX_ANZAHL = 255;

const ENDUNGEN = ['.js', '.glb', '.jpg', '.png', '.webp'];
async function alleDateien(ordner) {
  const eintraege = await readdir(join(WURZEL, ordner), { withFileTypes: true, recursive: true });
  return eintraege.filter((e) => e.isFile() && ENDUNGEN.some((n) => e.name.endsWith(n)))
    .map((e) => relative(WURZEL, join(e.parentPath ?? e.path, e.name)));
}

// .glb → glTF als Text: Der Binärteil wird als data:-Adresse in den ersten Puffer eingebettet.
function glbZuGltf(glb) {
  const ansicht = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  if (ansicht.getUint32(0, true) !== 0x46546c67) throw new Error('keine GLB-Datei');
  let ort = 12, json, bin;
  while (ort < glb.byteLength) {
    const laenge = ansicht.getUint32(ort, true), art = ansicht.getUint32(ort + 4, true);
    const inhalt = glb.subarray(ort + 8, ort + 8 + laenge);
    if (art === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(inhalt));
    else if (art === 0x004e4942) bin = inhalt;
    ort += 8 + laenge;
  }
  if (bin) json.buffers[0].uri = `data:application/octet-stream;base64,${Buffer.from(bin).toString('base64')}`;
  return JSON.stringify(json);
}

// Das Artifact setzt den Rahmen (doctype, html, head, body) selbst – also weglassen
const html = (await readFile(join(WURZEL, 'index.html'), 'utf8'))
  .replace(/<!doctype html>\s*/i, '')
  .replace(/<\/?html[^>]*>\s*/gi, '')
  .replace(/<\/?head>\s*/gi, '')
  .replace(/<\/?body>\s*/gi, '')
  .replace(/<meta charset[^>]*>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '');

await rm(ZIEL, { recursive: true, force: true });
await mkdir(ZIEL, { recursive: true });
await writeFile(join(ZIEL, 'index.html'), html);

const dateien = {};
let gesamt = 0;
for (const quelle of [...await alleDateien('src'), ...await alleDateien('vendor'), ...await alleDateien('assets')]) {
  let ziel = quelle, inhalt = await readFile(join(WURZEL, quelle));
  if (quelle.endsWith('.glb')) {
    ziel = quelle.replace(/\.glb$/, '.gltf.json');
    inhalt = Buffer.from(glbZuGltf(inhalt));
  } else if (quelle.startsWith('src') && quelle.endsWith('.js')) {
    inhalt = Buffer.from(inhalt.toString('utf8').replaceAll('.glb', '.gltf.json'));
  }
  if (inhalt.length > MAX_DATEI) throw new Error(`${ziel} ist mit ${(inhalt.length / 1e6).toFixed(1)} MB zu groß für die Vorschau`);
  await mkdir(dirname(join(ZIEL, ziel)), { recursive: true });
  await writeFile(join(ZIEL, ziel), inhalt);
  dateien[ziel] = ziel;
  gesamt += inhalt.length;
}
await writeFile(join(ZIEL, 'dateien.json'), JSON.stringify(dateien, null, 2));

const anzahl = Object.keys(dateien).length;
console.log(`Vorschau bereit in ${ZIEL}: index.html + ${anzahl} Dateien (${(gesamt / 1e6).toFixed(1)} MB), Liste in dateien.json`);
if (anzahl > MAX_ANZAHL || gesamt > MAX_GESAMT) {
  console.log(`Achtung: Mehr als ${MAX_ANZAHL} Dateien oder ${MAX_GESAMT / 1e6} MB – in mehreren Schritten veröffentlichen.`);
}
