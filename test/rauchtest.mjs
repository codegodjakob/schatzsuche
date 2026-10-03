// Rauchtest: Startet das Spiel in einem unsichtbaren Browser und prüft,
// ob es ohne Fehler läuft, die Figur sich bewegt und Ereignisse kommen.
// Bildschirmfotos landen in test-ergebnisse/ (nicht im Projekt gespeichert).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { starteServer } from '../scripts/server.mjs';

const ORDNER = new URL('../test-ergebnisse/', import.meta.url);
await mkdir(ORDNER, { recursive: true });
const foto = (name) => new URL(`${name}.png`, ORDNER).pathname;

const { server, url } = await starteServer();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const seite = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const fehler = [];
seite.on('pageerror', (e) => fehler.push(e.message));
// Schriften kommen aus dem Internet; der Test braucht sie nicht
await seite.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
seite.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) fehler.push(m.text()); });
seite.on('response', (r) => { if (r.status() >= 400) fehler.push(`Nicht geladen (${r.status()}): ${r.url()}`); });
seite.on('requestfailed', (r) => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) fehler.push(`Nicht geladen: ${r.url()}`); });

let ok = true;
function pruefe(bedingung, text) {
  console.log(`${bedingung ? '✓' : '✗'} ${text}`);
  if (!bedingung) ok = false;
}

try {
  await seite.goto(url);
  await seite.waitForFunction(() => window.spiel?.bereit, null, { timeout: 60000 });
  await seite.screenshot({ path: foto('1-start') });
  pruefe(true, 'Welt wird gezeichnet');

  await seite.click('#wahl-er');
  await seite.waitForFunction(() => window.spiel.ereignisse?.aktuell === 'erwachen', null, { timeout: 10000 });
  pruefe(true, 'Erstes Ereignis „erwachen“ erscheint');
  await seite.screenshot({ path: foto('2-erwachen') });

  await seite.keyboard.press('KeyE');
  const vorher = await seite.evaluate(() => ({ ...window.spiel.steuerung.zustand.ort }));
  await seite.keyboard.down('ShiftLeft');
  await seite.keyboard.down('KeyW');
  // Der Test-Browser zeichnet ohne Grafikkarte, also langsam: warten, bis die Figur vorankommt
  await seite.waitForFunction((y) => window.spiel.steuerung.zustand.gelaufen > 3, null, { timeout: 60000 }).catch(() => {});
  await seite.keyboard.up('KeyW');
  await seite.keyboard.up('ShiftLeft');
  const nachher = await seite.evaluate(() => ({ ...window.spiel.steuerung.zustand.ort }));
  const strecke = Math.hypot(nachher.x - vorher.x, nachher.z - vorher.z);
  pruefe(strecke > 1, `Figur bewegt sich (${strecke.toFixed(1)} m)`);
  await seite.screenshot({ path: foto('3-laufen') });

  await seite.keyboard.press('KeyV');
  await seite.waitForTimeout(300);
  await seite.screenshot({ path: foto('4-ich-sicht') });
  pruefe(await seite.evaluate(() => window.spiel.steuerung.zustand.ichSicht), 'Blickwinkel wechselt mit V');
} catch (e) {
  pruefe(false, `Abbruch: ${e.message}`);
} finally {
  pruefe(fehler.length === 0, `Keine Fehler im Browser${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
  await browser.close();
  server.close();
}
console.log(ok ? '\nAlles in Ordnung.' : '\nEtwas stimmt nicht – siehe oben.');
process.exit(ok ? 0 : 1);
