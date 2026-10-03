// Handytest: Startet das Spiel wie auf einem Handy (Touchscreen, schmaler Bildschirm) und bedient
// es nur mit dem Finger: Figur wählen, Ereignis antippen, mit dem Stick laufen und rennen,
// wischend umsehen, mit „Benutzen“ etwas aufheben, zuschlagen, das Menü öffnen. Bildschirmfotos landen in
// test-ergebnisse/.
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
  await seite.goto(url, { timeout: 300000 });
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

  // „Benutzen“: zu einem Ast gehen, der Knopf zeigt, was geht, Antippen hebt ihn auf
  const ast = await spiel(() => { const a = window.spiel.sammeln.findeArt('ast', { x: 18, z: 38 }); return { x: a.x, z: a.z, id: a.id }; });
  await spiel((a) => window.spiel.teleport(a.x + 0.5, a.z), ast);
  let beschriftet = false;
  for (let i = 0; i < 20 && !beschriftet; i++) {
    if (await spiel(() => window.spiel.ereignisse.aktuell)) await seite.tap('#ereignis-optionen .option:last-child');
    beschriftet = await warte(() => document.getElementById('knopf-benutzen').textContent === 'Ast aufheben', null, 10).then(() => true, () => false);
  }
  pruefe(beschriftet, 'Knopf „Benutzen“ zeigt „Ast aufheben“');
  await bilder(1);
  await seite.screenshot({ path: foto('handy-3-benutzen'), timeout: 300000 });
  let genommen = false;
  for (let i = 0; i < 6 && !genommen; i++) {
    if (await spiel(() => window.spiel.ereignisse.aktuell)) await seite.tap('#ereignis-optionen .option:last-child');
    await seite.tap('#knopf-benutzen');
    genommen = await warte((id) => !window.spiel.sammeln.istDa(window.spiel.sammeln.stelle(id)), ast.id, 15).then(() => true, () => false);
  }
  pruefe(genommen && await spiel(() => window.spiel.inventar.hat('ast')), 'Antippen von „Benutzen“ hebt den Ast auf');

  // „Schlagen“: ohne Waffe ein Faustschlag
  await seite.tap('#knopf-schlagen');
  const schlaegt = await warte(() => ['schlag', 'hieb'].includes(window.spiel.figur.spielt), null, 30).then(() => true, () => false);
  pruefe(schlaegt, 'Knopf „Schlagen“ lässt die Figur zuschlagen');

  // Menü: öffnen, Reiter wechseln, schließen
  await seite.tap('[data-taste="KeyI"]');
  pruefe(await spiel(() => !document.getElementById('menue').hidden), 'Knopf „Menü“ öffnet das Menü');
  await seite.tap('[data-reiter="herstellen"]');
  pruefe(await spiel(() => document.querySelector('[data-reiter="herstellen"]').getAttribute('aria-selected') === 'true' && !!document.querySelector('.rezept')), 'Reiter „Herstellen“ zeigt das Rezeptbuch');
  await seite.screenshot({ path: foto('handy-4-menue'), timeout: 300000 });
  const menuePasst = await spiel(() => document.documentElement.scrollWidth <= innerWidth);
  pruefe(menuePasst, 'Das Menü passt auf den Bildschirm');
  await seite.tap('#menue-zu');
  pruefe(await spiel(() => document.getElementById('menue').hidden && window.spiel.steuerung.zustand.aktiv), 'Kreuz schließt das Menü, das Spiel läuft weiter');
  await bilder(1);
  await seite.screenshot({ path: foto('handy-5-knoepfe'), timeout: 300000 });
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
