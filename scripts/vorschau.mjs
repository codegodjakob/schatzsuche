// Bereitet eine Vorschau vor, die Claude als Artifact veröffentlichen kann
// (ein Link, den man im Browser öffnet und sofort spielt).
// Ergebnis: ein Ordner (Standard: vorschau/, sonst der erste Aufrufwert) mit index.html,
// allen Dateien, die mitmüssen, und dateien.json (die Liste für das Artifact-Werkzeug).
//
// Artifacts liefern keine .glb-Dateien aus, und Nachladen über data:-Adressen ist dort gesperrt.
// Darum wird jedes Modell als Text abgelegt (.glb.txt, Base64), die Verweise im kopierten
// Spielcode werden angepasst, und src/modelle.js entpackt den Text beim Laden. Das Spiel selbst
// bleibt bei .glb.
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

// Das Artifact setzt den Rahmen (doctype, html, head, body) selbst – also weglassen
const html = (await readFile(join(WURZEL, 'index.html'), 'utf8'))
  .replace(/<!doctype html>\s*/i, '')
  .replace(/<\/?html[^>]*>\s*/gi, '')
  .replace(/<\/?head>\s*/gi, '')
  .replace(/<\/?body>\s*/gi, '')
  .replace(/<meta charset[^>]*>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '')
  // Stand der Vorschau sichtbar machen, damit klar ist, welche Fassung jemand gerade sieht
  .replace('<!--STAND-->', ` · Stand ${new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date())} Uhr`);

await rm(ZIEL, { recursive: true, force: true });
await mkdir(ZIEL, { recursive: true });
await writeFile(join(ZIEL, 'index.html'), html);

const dateien = {};
let gesamt = 0;
for (const quelle of [...await alleDateien('src'), ...await alleDateien('vendor'), ...await alleDateien('assets')]) {
  let ziel = quelle, inhalt = await readFile(join(WURZEL, quelle));
  if (quelle.endsWith('.glb')) {
    ziel = `${quelle}.txt`;
    inhalt = Buffer.from(inhalt.toString('base64'));
  } else if (quelle.startsWith('src') && quelle.endsWith('.js')) {
    inhalt = Buffer.from(inhalt.toString('utf8').replaceAll('.glb`', '.glb.txt`').replaceAll(".glb'", ".glb.txt'"));
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
