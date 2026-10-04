// Handytest: Startet das Spiel wie auf einem Handy (Touchscreen, schmaler Bildschirm) und bedient
// es nur mit dem Finger: Figur wählen, Ereignis antippen, mit dem Stick laufen und rennen,
// wischend umsehen, mit „Benutzen“ etwas aufheben, zuschlagen, das Menü öffnen, bei Marta handeln. Bildschirmfotos landen in
// test-ergebnisse/.
import { starteSpiel } from './helfer.mjs';
import { DOERFLER } from '../src/welt/orte.js';

const { seite, kontext, url, pruefe, warte, spiel, foto, abbruch, ende } = await starteSpiel({ handy: true, schritt: null });
const finger = await kontext.newCDPSession(seite);
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
  await foto('handy-1-erwachen');
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
  await foto('handy-2-laufen');
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
  await foto('handy-3-benutzen');
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
  await foto('handy-4-menue');
  const menuePasst = await spiel(() => document.documentElement.scrollWidth <= innerWidth);
  pruefe(menuePasst, 'Das Menü passt auf den Bildschirm');
  await seite.tap('#menue-zu');
  pruefe(await spiel(() => document.getElementById('menue').hidden && window.spiel.steuerung.zustand.aktiv), 'Kreuz schließt das Menü, das Spiel läuft weiter');
  await bilder(1);
  await foto('handy-5-knoepfe');
  const passt = await spiel(() => document.documentElement.scrollWidth <= innerWidth);
  pruefe(passt, 'Nichts ragt über den Bildschirmrand');

  // Handeln per Finger: zu Marta, „Benutzen“ antippen, im Gespräch „Handeln“, eine Angelrute kaufen
  await spiel(([p, m]) => {
    window.spiel.inventar.gibMuenzen(20);
    window.spiel.teleport(p.x, p.z);
    window.spiel.blick(Math.atan2(p.x - m.x, p.z - m.z), -0.1);
  }, [{ x: DOERFLER.marta.x + 2.2, z: DOERFLER.marta.z - 2.6 }, DOERFLER.marta]);
  await warte(() => window.spiel.doerfler, null, 300);
  let angesprochen = false;
  for (let i = 0; i < 10 && !angesprochen; i++) {
    if (await spiel(() => window.spiel.ereignisse.aktuell)) await seite.tap('#ereignis-optionen .option:last-child');
    if (!await warte(() => document.getElementById('knopf-benutzen').textContent === 'Mit Marta sprechen', null, 15).then(() => true, () => false)) continue;
    await seite.tap('#knopf-benutzen');
    angesprochen = await warte(() => window.spiel.ereignisse.aktuell === 'gespraech-marta', null, 15).then(() => true, () => false);
  }
  pruefe(angesprochen, 'Knopf „Mit Marta sprechen“ beginnt das Gespräch');
  await seite.locator('#ereignis-optionen .option', { hasText: 'Handeln' }).tap({ timeout: 30000 });
  await warte(() => window.spiel.menue.reiter === 'handel' && !document.getElementById('menue').hidden, null, 30);
  await seite.locator('.handel section.karte').nth(0).locator('.handel-zeile', { hasText: 'Angelrute' }).getByRole('button').tap({ timeout: 30000 });
  pruefe(await spiel(() => window.spiel.inventar.hat('angelrute')), 'Im Handel eine Angelrute gekauft');
  await foto('handy-6-handel');
  pruefe(await spiel(() => document.documentElement.scrollWidth <= innerWidth), 'Der Handel passt auf den Bildschirm');
  await seite.tap('#menue-zu');
} catch (e) {
  await abbruch(e, 'handy-fehler');
}
await ende();
