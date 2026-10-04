// Gemeinsame Hilfen für die Browser-Prüfungen: Server und unsichtbaren Browser starten, Fehler im Browser
// sammeln, warten, Tasten drücken, Erzähltafeln beantworten, Bildschirmfotos (in test-ergebnisse/).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { starteServer } from '../scripts/server.mjs';

const ORDNER = new URL('../test-ergebnisse/', import.meta.url);

// handy: Touchscreen und schmaler Bildschirm. schritt: längster Zeitschritt je Bild (siehe src/main.js);
// ohne Grafikkarte entstehen nur wenige Bilder je Sekunde, größere Schritte halten die Spielzeit in Gang.
export async function starteSpiel({ handy = false, schritt = 0.15 } = {}) {
  await mkdir(ORDNER, { recursive: true });
  const { server, url } = await starteServer();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const kontext = await browser.newContext(handy
    ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }
    : { viewport: { width: 1280, height: 720 } });
  const seite = await kontext.newPage();
  // Im unsichtbaren Test-Browser gibt es keine Grafikkarte: niedrigste Qualität
  await seite.addInitScript((s) => {
    window.SCHATZSUCHE_QUALITAET = 'niedrig';
    if (s) window.SCHATZSUCHE_SCHRITT = s;
  }, schritt);
  // Schriften kommen aus dem Internet; die Prüfung braucht sie nicht
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
  const foto = (name) => seite.screenshot({ path: new URL(`${name}.png`, ORDNER).pathname, timeout: 300000 });

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

  // Schließt offene Erzähltafeln, die gerade nicht dran sind: mit Q („Später“), wenn es das gibt, sonst mit E
  async function tafelnWeg() {
    for (let i = 0; i < 10 && await spiel(() => window.spiel.ereignisse.aktuell); i++) {
      const tasten = await spiel(() => [...document.querySelectorAll('#ereignis-optionen kbd')].map((k) => k.textContent));
      await taste(tasten.includes('Q') ? 'KeyQ' : 'KeyE');
      await seite.waitForTimeout(300);
    }
  }

  // Klicken (am Handy: tippen) mit viel Geduld: Ohne Grafikkarte entsteht nur etwa ein Bild je Sekunde, und
  // Playwright wartet, bis ein Knopf über zwei Bilder hinweg ruhig steht
  const drueck = (wahl, handy = false) => (handy ? seite.tap(wahl, { timeout: 180000 }) : seite.click(wahl, { timeout: 180000 }));

  // Bricht die Prüfung nach einem Fehler ab (mit Bildschirmfoto)
  async function abbruch(e, name = 'fehler') {
    pruefe(false, `Abbruch: ${e.message.split('\n')[0]}`);
    await seite.screenshot({ path: new URL(`${name}.png`, ORDNER).pathname }).catch(() => {});
  }

  // Zum Schluss: Fehler im Browser melden, alles schließen, Ergebnis ausgeben
  async function ende() {
    pruefe(fehler.length === 0, `Keine Fehler im Browser${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
    await browser.close();
    server.close();
    console.log(ok ? '\nAlles in Ordnung.' : '\nEtwas stimmt nicht – siehe oben.');
    process.exit(ok ? 0 : 1);
  }

  return { seite, kontext, url, fehler, pruefe, warte, spiel, taste, foto, ereignis, tafelnWeg, abbruch, ende, drueck };
}
