// Bereitet eine Vorschau vor, die Claude als Artifact veröffentlichen kann
// (ein Link, den man im Browser öffnet und sofort spielt).
// Ergebnis: vorschau/index.html plus die Liste aller Dateien, die mitmüssen.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));

async function alleDateien(ordner) {
  const eintraege = await readdir(join(WURZEL, ordner), { withFileTypes: true, recursive: true });
  return eintraege.filter((e) => e.isFile() && e.name.endsWith('.js'))
    .map((e) => relative(WURZEL, join(e.parentPath ?? e.path, e.name)));
}

// Das Artifact setzt den Rahmen (doctype, html, head, body) selbst – also weglassen
const html = (await readFile(join(WURZEL, 'index.html'), 'utf8'))
  .replace(/<!doctype html>\s*/i, '')
  .replace(/<\/?html[^>]*>\s*/gi, '')
  .replace(/<\/?head>\s*/gi, '')
  .replace(/<\/?body>\s*/gi, '')
  .replace(/<meta charset[^>]*>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '');

await mkdir(join(WURZEL, 'vorschau'), { recursive: true });
await writeFile(join(WURZEL, 'vorschau/index.html'), html);

const dateien = Object.fromEntries([...await alleDateien('src'), ...await alleDateien('vendor')].map((d) => [d, d]));
await writeFile(join(WURZEL, 'vorschau/dateien.json'), JSON.stringify(dateien, null, 2));
console.log(`Vorschau bereit: vorschau/index.html (+ ${Object.keys(dateien).length} Dateien, Liste in vorschau/dateien.json)`);
