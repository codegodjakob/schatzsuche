// Prüft eine fertige Vorschau (npm run vorschau -- <ordner>) unter denselben Sperren wie auf
// claude.ai, bevor sie veröffentlicht wird. Dort ist fast alles blockiert, was nicht direkt eine
// eigene Datei ist. Ein Modell, das über eine data:-Adresse nachgeladen wird, bleibt dort hängen,
// obwohl es lokal läuft. Genau das fängt diese Prüfung ab.
// Aufruf: node scripts/pruefe-vorschau.mjs [ordner]   (ohne Angabe: vorschau/)
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const ORDNER = resolve(process.argv[2] ?? join(WURZEL, 'vorschau'));
// Die Regeln aus dem Artifact-Vertrag: Skripte nur von hier und einigen Code-Verteilern, Schriften
// nur von Google, Bilder auch aus data:/blob:, Nachladen per fetch nur von eigenen Dateien
const REGELN = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://cdn.tailwindcss.com https://code.jquery.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
].join('; ');
const ARTEN = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.txt': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

const server = createServer(async (anfrage, antwort) => {
  const pfad = normalize(decodeURIComponent(new URL(anfrage.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  try {
    if (!pfad || pfad === '.' || pfad === 'index.html') {
      // Wie auf claude.ai: Der Rahmen (doctype, head, body) kommt von außen
      const seite = await readFile(join(ORDNER, 'index.html'), 'utf8');
      antwort.writeHead(200, { 'content-type': 'text/html', 'content-security-policy': REGELN });
      return antwort.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>${seite}</body></html>`);
    }
    const art = ARTEN[extname(pfad)];
    if (!art) { antwort.writeHead(415).end(); return; } // diese Art liefert claude.ai nicht aus
    antwort.writeHead(200, { 'content-type': art });
    antwort.end(await readFile(join(ORDNER, pfad)));
  } catch {
    antwort.writeHead(404).end();
  }
}).listen(0, '127.0.0.1');
await new Promise((fertig) => server.once('listening', fertig));

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const seite = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await seite.addInitScript(() => {
  window.SCHATZSUCHE_QUALITAET = 'niedrig';
  window.__gesperrt = [];
  addEventListener('securitypolicyviolation', (e) => window.__gesperrt.push(`${e.violatedDirective}: ${e.blockedURI.slice(0, 80)}`));
});
const fehler = [];
seite.on('pageerror', (e) => fehler.push(e.message));
// Fehler, und die eigenen Warnungen, wenn etwas nicht geladen werden konnte
seite.on('console', (m) => {
  const text = m.text();
  if ((m.type() === 'error' && !/Failed to load resource/.test(text)) || (m.type() === 'warning' && /konnte nicht/.test(text))) fehler.push(text.slice(0, 200));
});

let ok = true;
function pruefe(bedingung, text) {
  console.log(`${bedingung ? '✓' : '✗'} ${text}`);
  if (!bedingung) ok = false;
}

try {
  await seite.goto(`http://127.0.0.1:${server.address().port}/`);
  await seite.waitForFunction(() => window.spiel?.geladen && window.spiel?.bereit, null, { timeout: 600000, polling: 500 });
  pruefe(true, 'Welt lädt');
  await seite.click('#wahl-sie', { timeout: 120000 });
  await seite.waitForFunction(() => (window.spiel.figur && window.spiel.steuerung.zustand.aktiv) || !document.getElementById('fehler').hidden,
    null, { timeout: 300000, polling: 500 });
  pruefe(await seite.evaluate(() => !!window.spiel.figur), 'Figur lädt');
} catch (e) {
  pruefe(false, `Abbruch: ${e.message.split('\n')[0]}`);
} finally {
  const gesperrt = await seite.evaluate(() => window.__gesperrt).catch(() => []);
  pruefe(gesperrt.length === 0, `Nichts gesperrt${gesperrt.length ? `: ${[...new Set(gesperrt)].join(' | ')}` : ''}`);
  const meldung = await seite.evaluate(() => (document.getElementById('fehler').hidden ? '' : document.getElementById('fehler-text').textContent)).catch(() => '');
  pruefe(!meldung, `Keine Fehlermeldung im Spiel${meldung ? `: ${meldung}` : ''}`);
  pruefe(fehler.length === 0, `Keine Fehler im Browser${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
  await browser.close();
  server.close();
}
console.log(ok ? '\nDie Vorschau kann veröffentlicht werden.' : '\nNicht veröffentlichen – siehe oben.');
process.exit(ok ? 0 : 1);
