// Rauchtest: Startet das Spiel in einem unsichtbaren Browser und spielt die wichtigsten Abläufe durch:
// Start, Laufen, Blickwechsel, Trinken, Einsiedler, Äste sammeln, Feuer machen, Sterben, Nacht.
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
// Im unsichtbaren Test-Browser gibt es keine Grafikkarte: niedrigste Qualität
await seite.addInitScript(() => { window.SCHATZSUCHE_QUALITAET = 'niedrig'; });
// Schriften kommen aus dem Internet; der Test braucht sie nicht
await seite.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const fehler = [];
seite.on('pageerror', (e) => fehler.push(e.message));
seite.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) fehler.push(m.text()); });
seite.on('response', (r) => { if (r.status() >= 400) fehler.push(`Nicht geladen (${r.status()}): ${r.url()}`); });
seite.on('requestfailed', (r) => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) fehler.push(`Nicht geladen: ${r.url()}`); });

let ok = true;
function pruefe(bedingung, text) {
  console.log(`${bedingung ? '✓' : '✗'} ${text}`);
  if (!bedingung) ok = false;
}
const warte = (fn, arg, sekunden = 120) => seite.waitForFunction(fn, arg, { timeout: sekunden * 1000, polling: 200 });
const spiel = (fn, arg) => seite.evaluate(fn, arg);
const taste = (code) => seite.keyboard.press(code);
// Wartet, bis ein bestimmtes Ereignis erscheint, und wählt dann eine Taste.
// Andere Ereignisse, die dazwischenkommen, werden mit E bestätigt.
async function ereignis(id, wahl = 'KeyE', sekunden = 180) {
  const ende = Date.now() + sekunden * 1000;
  while (Date.now() < ende) {
    const aktuell = await spiel(() => window.spiel.ereignisse.aktuell);
    if (aktuell === id) {
      await taste(wahl);
      await warte((i) => window.spiel.ereignisse.aktuell !== i, id, 30);
      return;
    }
    if (aktuell) await taste('KeyE');
    await seite.waitForTimeout(400);
  }
  throw new Error(`Ereignis „${id}“ ist nicht erschienen`);
}

try {
  await seite.goto(url);
  await warte(() => window.spiel?.geladen && window.spiel?.bereit, null, 300);
  await seite.waitForTimeout(1500);
  await seite.screenshot({ path: foto('1-start'), timeout: 300000 });
  pruefe(true, 'Welt wird gezeichnet');

  await seite.click('#wahl-er', { timeout: 120000 });
  await warte(() => window.spiel.ereignisse?.aktuell === 'erwachen', null, 120);
  pruefe(true, 'Erstes Ereignis „erwachen“ erscheint');
  await seite.screenshot({ path: foto('2-erwachen'), timeout: 300000 });
  await taste('KeyE');

  // Laufen
  const vorher = await spiel(() => ({ ...window.spiel.steuerung.zustand.ort }));
  await seite.keyboard.down('ShiftLeft');
  await seite.keyboard.down('KeyW');
  await warte(() => window.spiel.steuerung.zustand.gelaufen > 3, null, 120).catch(() => {});
  await seite.keyboard.up('KeyW');
  await seite.keyboard.up('ShiftLeft');
  const nachher = await spiel(() => ({ ...window.spiel.steuerung.zustand.ort }));
  const strecke = Math.hypot(nachher.x - vorher.x, nachher.z - vorher.z);
  pruefe(strecke > 1, `Figur bewegt sich (${strecke.toFixed(1)} m)`);
  await seite.screenshot({ path: foto('3-laufen'), timeout: 300000 });

  await taste('KeyV');
  await seite.waitForTimeout(300);
  await seite.screenshot({ path: foto('4-ich-sicht'), timeout: 300000 });
  pruefe(await spiel(() => window.spiel.steuerung.zustand.ichSicht), 'Blickwinkel wechselt mit V');
  await taste('KeyV');

  // Trinken am Teich
  await spiel(() => { window.spiel.ueberleben.werte.wasser = 40; window.spiel.teleport(24, -18); window.spiel.blick(2.4, -0.15); });
  await ereignis('teich', 'KeyE');
  const wasser = await spiel(() => window.spiel.ueberleben.werte.wasser);
  pruefe(wasser > 90, `Trinken am Teich füllt Wasser auf (${wasser.toFixed(0)} %)`);
  await seite.screenshot({ path: foto('5-teich'), timeout: 300000 });

  // Der Einsiedler
  await spiel(() => window.spiel.teleport(-58 + 3.5, 86 - 3.5));
  await ereignis('einsiedler-sehen', 'KeyE');
  await ereignis('einsiedler-gruss', 'KeyE');
  pruefe(await spiel(() => window.spiel.ereignisse.merker.has('einsiedler-freund')), 'Einsiedler begrüßt und gibt zu essen');
  await seite.screenshot({ path: foto('6-einsiedler'), timeout: 300000 });
  await ereignis('einsiedler-aufgabe', 'KeyE');
  pruefe(await spiel(() => window.spiel.ereignisse.merker.has('aufgabe-aeste')), 'Aufgabe: drei Äste bringen');

  // Äste sammeln
  for (const [x, z, id] of [[-30, 58, 'ast-1'], [-46, 70, 'ast-2'], [-20, 47, 'ast-4']]) {
    await spiel(([x, z]) => window.spiel.teleport(x + 0.8, z), [x, z]);
    await ereignis(id, 'KeyE');
  }
  const aeste = await spiel(() => window.spiel.ereignisse.inventar.get('Ast') ?? 0);
  pruefe(aeste >= 3, `Drei Äste gesammelt (${aeste})`);

  await spiel(() => window.spiel.teleport(-58 + 3, 86 - 3));
  await ereignis('einsiedler-feuer-lernen', 'KeyE');
  pruefe(await spiel(() => window.spiel.ereignisse.merker.has('kann-feuer')), 'Feuer machen gelernt');

  // Selbst Feuer machen: Äste holen, dann F
  for (const [x, z, id] of [[-66, 74, 'ast-3'], [18, 38, 'ast-5'], [40, 30, 'ast-7']]) {
    await spiel(([x, z]) => window.spiel.teleport(x + 0.8, z), [x, z]);
    await ereignis(id, 'KeyE');
  }
  const feuerVorher = await spiel(() => window.spiel.szene.children.filter((o) => o.name === 'feuer').length);
  await taste('KeyF');
  await seite.waitForTimeout(500);
  const feuerNachher = await spiel(() => window.spiel.szene.children.filter((o) => o.name === 'feuer').length);
  pruefe(feuerNachher === feuerVorher + 1, 'Mit F brennt ein eigenes Feuer');
  await seite.screenshot({ path: foto('7-eigenes-feuer'), timeout: 300000 });

  // Nacht
  await spiel(() => { window.spiel.teleport(-54, 80); window.spiel.blick(3.4, 0.05); window.spiel.setzeZeit(23); });
  await seite.waitForTimeout(2500);
  await seite.screenshot({ path: foto('8-nacht'), timeout: 300000 });
  pruefe(await spiel(() => window.spiel.zeit.hell < 0.2), 'Es wird Nacht');

  // Sterben und wieder aufwachen
  await spiel(() => { window.spiel.setzeZeit(12); const w = window.spiel.ueberleben.werte; w.wasser = 0; w.leben = 0.02; });
  await warte(() => !document.getElementById('tod').hidden, null, 300);
  pruefe(true, 'Tod wird angezeigt');
  await warte(() => window.spiel.steuerung.zustand.aktiv && window.spiel.ueberleben.werte.leben >= 99, null, 300);
  const inventarLeer = await spiel(() => window.spiel.ereignisse.inventar.size === 0);
  pruefe(inventarLeer, 'Nach dem Tod: wieder auf der Wiese, Inventar weg');
} catch (e) {
  pruefe(false, `Abbruch: ${e.message.split('\n')[0]}`);
  await seite.screenshot({ path: foto('fehler') }).catch(() => {});
} finally {
  pruefe(fehler.length === 0, `Keine Fehler im Browser${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
  await browser.close();
  server.close();
}
console.log(ok ? '\nAlles in Ordnung.' : '\nEtwas stimmt nicht – siehe oben.');
process.exit(ok ? 0 : 1);
