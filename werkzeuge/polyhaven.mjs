// Lädt Texturen und Modelle von Poly Haven (alles CC0) und legt sie einbaufertig ab.
//   node werkzeuge/polyhaven.mjs textur reed_roof_04 [1k]   -> assets/bauten/reed_roof_04_{diff,nor_gl,rough}_1k.jpg
//   node werkzeuge/polyhaven.mjs modell wooden_bucket_01 [1k] -> assets/requisiten/wooden_bucket_01.glb
// Modelle kommen als glTF mit einzelnen Dateien und werden mit gltf-pipeline zu einer .glb gepackt.
// Wer etwas Neues lädt, trägt es in docs/QUELLEN.md ein.
// In der Cloud-Umgebung geht Node nur über den Netzwerk-Umweg ins Netz; dann so aufrufen:
//   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node werkzeuge/polyhaven.mjs …
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const [art, id, aufloesung = '1k'] = process.argv.slice(2);
if (!['textur', 'modell'].includes(art) || !id) {
  console.log('Aufruf: node werkzeuge/polyhaven.mjs textur|modell <name> [1k|2k]');
  process.exit(1);
}
const WURZEL = new URL('../', import.meta.url).pathname;

async function hole(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

const dateien = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();

if (art === 'textur') {
  const ziel = join(WURZEL, 'assets/bauten');
  await mkdir(ziel, { recursive: true });
  for (const teil of ['Diffuse', 'nor_gl', 'Rough']) {
    const url = dateien[teil]?.[aufloesung]?.jpg?.url;
    if (!url) { console.log(`  ${teil}: gibt es nicht`); continue; }
    const name = url.split('/').pop();
    await writeFile(join(ziel, name), await hole(url));
    console.log(`  ${name}`);
  }
} else {
  const g = dateien.gltf?.[aufloesung]?.gltf;
  if (!g) throw new Error(`${id}: kein glTF in ${aufloesung}`);
  const ordner = await mkdtemp(join(tmpdir(), 'polyhaven-'));
  const haupt = join(ordner, g.url.split('/').pop());
  await writeFile(haupt, await hole(g.url));
  for (const [pfad, d] of Object.entries(g.include)) {
    await mkdir(dirname(join(ordner, pfad)), { recursive: true });
    await writeFile(join(ordner, pfad), await hole(d.url));
  }
  const ziel = join(WURZEL, 'assets/requisiten');
  await mkdir(ziel, { recursive: true });
  execFileSync('npx', ['-y', 'gltf-pipeline@4', '-i', haupt, '-o', join(ziel, `${id}.glb`)], { stdio: 'inherit' });
  await rm(ordner, { recursive: true });
  console.log(`  assets/requisiten/${id}.glb`);
}
