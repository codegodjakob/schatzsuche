// Handytest: Startet das Spiel wie auf einem Handy (Touchscreen, schmaler Bildschirm) und bedient
// es nur mit dem Finger: Figur wählen, Ereignis antippen, mit dem Stick laufen und rennen,
// wischend umsehen, Knöpfe drücken. Bildschirmfotos landen in test-ergebnisse/.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { starteServer } from '../scripts/server.mjs';

const ORDNER = new URL('../test-ergebnisse/', import.meta.url);
await mkdir(ORDNER, { recursive: true });
const foto = (name) => new URL(`${name}.png`, ORDNER).pathname;

const { server, url } = await starteServer();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const kontext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const seite = await kontext.newPage();
await seite.addInitScript(() => { window.SCHATZSUCHE_QUALITAET = 'niedrig'; });
await seite.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const fehler = [];
seite.on('pageerror', (e) => fehler.push(e.message));
seite.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) fehler.push(m.text()); });
const finger = await kontext.newCDPSession(seite);

let ok = true;
function pruefe(bedingung, text) {
  console.log(`${bedingung ? '✓' : '✗'} ${text}`);
  if (!bedingung) ok = false;
}
const warte = (fn, arg, sekunden = 120) => seite.waitForFunction(fn, arg, { timeout: sekunden * 1000, polling: 200 });
const spiel = (fn, arg) => seite.evaluate(fn, arg);
const beruehre = (type, punkte) => finger.send('Input.dispatchTouchEvent', { type, touchPoints: punkte });
// Ein paar Bilder abwarten (im Test-Browser ohne Grafikkarte dauert ein Bild lange)
const bilder = async (n) => {
  const b = await spiel(() => window.spiel.bilder);
  await warte((z) => window.spiel.bilder >= z, b + n, 300);
};

try {
  await seite.goto(url);
  // Gleich tippen, noch während die Welt entsteht: Die Wahl muss gemerkt werden
  await seite.tap('#wahl-sie', { timeout: 120000 });
  const frueh = await spiel(() => !window.spiel?.geladen);
  pruefe(await spiel(() => document.documentElement.classList.contains('beruehrung')), 'Handy erkannt: Fingersteuerung eingeschaltet');
  pruefe(await spiel(() => document.getElementById('wahl-sie').classList.contains('gewaehlt')), 'Antippen zeigt sofort die Wahl');
  await warte(() => window.spiel?.ereignisse?.aktuell === 'erwachen', null, 400);
  pruefe(true, `Spiel beginnt von selbst${frueh ? ' (getippt, bevor die Welt fertig war)' : ''}`);
  await seite.screenshot({ path: foto('handy-1-erwachen'), timeout: 300000 });
  await seite.tap('#ereignis-optionen .option', { timeout: 60000 });
  await warte(() => !window.spiel.ereignisse.aktuell, null, 60);
  pruefe(true, 'Ereignis lässt sich antippen');
  pruefe(await spiel(() => !document.getElementById('beruehrung').hidden), 'Stick und Knöpfe sind zu sehen');

  // Laufstick: unten links aufsetzen und ganz nach oben ziehen (= vorwärts rennen)
  const vorher = await spiel(() => window.spiel.steuerung.zustand.gelaufen);
  await beruehre('touchStart', [{ x: 90, y: 740, id: 1 }]);
  await beruehre('touchMove', [{ x: 90, y: 660, id: 1 }]);
  await warte(() => window.spiel.steuerung.zustand.gelaufen > 1.5, null, 300).catch(() => {});
  const tempo = await spiel(() => window.spiel.steuerung.zustand.tempo);
  await seite.screenshot({ path: foto('handy-2-laufen'), timeout: 300000 });
  await beruehre('touchEnd', []);
  const strecke = (await spiel(() => window.spiel.steuerung.zustand.gelaufen)) - vorher;
  pruefe(strecke > 1, `Mit dem Stick laufen (${strecke.toFixed(1)} m)`);
  pruefe(tempo > 2, `Ganz ausgelenkt wird gerannt (${tempo.toFixed(1)} m/s)`);
  // Die Figur bremst weich ab; sie muss nach dem Loslassen von selbst stehen bleiben
  const steht = await warte(() => window.spiel.steuerung.zustand.tempo < 0.3, null, 180).then(() => true, () => false);
  pruefe(steht, 'Stick loslassen hält an');

  // Umsehen: rechts wischen
  const seiteVorher = await spiel(() => window.spiel.steuerung.zustand.blickSeite);
  await beruehre('touchStart', [{ x: 300, y: 420, id: 2 }]);
  await beruehre('touchMove', [{ x: 220, y: 420, id: 2 }]);
  await beruehre('touchEnd', []);
  const seiteNachher = await spiel(() => window.spiel.steuerung.zustand.blickSeite);
  pruefe(Math.abs(seiteNachher - seiteVorher) > 0.2, 'Wischen dreht den Blick');

  // Knöpfe
  await seite.tap('[data-taste="KeyV"]');
  pruefe(await spiel(() => window.spiel.steuerung.zustand.ichSicht), 'Knopf „Blick“ wechselt in die Ich-Sicht');
  await seite.tap('[data-taste="KeyV"]');
  await seite.tap('[data-taste="KeyI"]');
  pruefe(await spiel(() => !document.getElementById('inventar').hidden), 'Knopf „Inventar“ öffnet das Inventar');
  await seite.tap('[data-taste="KeyI"]');
  await seite.tap('[data-taste="KeyF"]');
  pruefe(await spiel(() => [...document.querySelectorAll('.nachricht')].some((n) => n.textContent.includes('Feuer'))), 'Knopf „Feuer“ antwortet');
  await bilder(1);
  await seite.screenshot({ path: foto('handy-3-knoepfe'), timeout: 300000 });
  const passt = await spiel(() => document.documentElement.scrollWidth <= innerWidth);
  pruefe(passt, 'Nichts ragt über den Bildschirmrand');
} catch (e) {
  pruefe(false, `Abbruch: ${e.message.split('\n')[0]}`);
  await seite.screenshot({ path: foto('handy-fehler') }).catch(() => {});
} finally {
  pruefe(fehler.length === 0, `Keine Fehler im Browser${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
  await browser.close();
  server.close();
}
console.log(ok ? '\nAlles in Ordnung.' : '\nEtwas stimmt nicht – siehe oben.');
process.exit(ok ? 0 : 1);
