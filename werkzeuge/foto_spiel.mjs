// Fotografiert das Spiel an bestimmten Orten und Uhrzeiten (zur Prüfung der Grafik).
// node werkzeuge/foto_spiel.mjs hoch "name:x:z:blickSeite:blickHoehe:stunde[:ich]" ...
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { starteServer } from '../scripts/server.mjs';

const [qualitaet = 'hoch', ...auftraege] = process.argv.slice(2);
const ORDNER = new URL('./figuren/ausgabe-pruefung/', import.meta.url);
await mkdir(ORDNER, { recursive: true });
const { server, url } = await starteServer();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const seite = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await seite.addInitScript((q) => { window.SCHATZSUCHE_QUALITAET = q; }, qualitaet);
await seite.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
seite.on('pageerror', (e) => console.log('Fehler:', e.message));
seite.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text().slice(0, 300)); });
const t0 = Date.now();
await seite.goto(url);
await seite.waitForFunction(() => window.spiel?.geladen && window.spiel?.bereit, null, { timeout: 600000 });
console.log('geladen nach', ((Date.now() - t0) / 1000).toFixed(1), 's');
await seite.click('#wahl-er', { timeout: 900000 });
await seite.waitForFunction(() => window.spiel.figur, null, { timeout: 120000 });
await seite.keyboard.press('KeyE');
for (const auftrag of auftraege) {
  const [name, x, z, bs, bh, stunde, ich] = auftrag.split(':');
  await seite.evaluate(([x, z, bs, bh, stunde, ich]) => {
    window.spiel.teleport(Number(x), Number(z));
    window.spiel.blick(Number(bs), Number(bh));
    window.spiel.setzeZeit(Number(stunde));
    if ((ich === '1') !== window.spiel.steuerung.zustand.ichSicht) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyV' }));
    }
    document.getElementById('ereignis').hidden = true;
    document.getElementById('hinweise').hidden = true;
  }, [x, z, bs, bh, stunde, ich]);
  // ein paar Bilder laufen lassen (Bäume einsortieren, Umgebungslicht, Kamera)
  const start = await seite.evaluate(() => window.spiel.bilder);
  await seite.waitForFunction((n) => window.spiel.bilder >= n + 4, start, { timeout: 900000, polling: 500 });
  const datei = new URL(`spiel_${name}.png`, ORDNER).pathname;
  const t1 = Date.now();
  await seite.screenshot({ path: datei, timeout: 900000 });
  console.log('  Bildzeit ca.', ((Date.now() - t1) / 1000).toFixed(1), 's');
  console.log(datei);
}
await browser.close();
server.close();
