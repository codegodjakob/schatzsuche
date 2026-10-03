// Fotografiert Figuren zur Prüfung: node werkzeuge/figuren/foto.mjs er:vorne er:seite:gehen:0.25 ...
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { starteServer } from '../../scripts/server.mjs';
const ORDNER = new URL('./ausgabe-pruefung/', import.meta.url);
await mkdir(ORDNER, { recursive: true });
const { server, url } = await starteServer();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 700, height: 900 } });
seite.on('pageerror', (e) => console.log('Fehler:', e.message));
for (const auftrag of process.argv.slice(2)) {
  const [figur, blick = 'vorne', bewegung = '', zeit = '0', nah = ''] = auftrag.split(':');
  await seite.goto(`${url}werkzeuge/figuren/ansicht.html?figur=${figur}&blick=${blick}&bewegung=${bewegung}&zeit=${zeit}&nah=${nah}`);
  await seite.waitForFunction(() => window.fertig, null, { timeout: 60000 });
  const info = await seite.evaluate(() => ({ fehler: window.fehler, clips: window.clips }));
  if (info.fehler) console.log(auftrag, info.fehler);
  const datei = new URL(`${auftrag.replaceAll(':', '_')}.png`, ORDNER).pathname;
  await seite.screenshot({ path: datei });
  console.log(datei, info.clips ? info.clips.join(' ') : '');
}
await browser.close();
server.close();
