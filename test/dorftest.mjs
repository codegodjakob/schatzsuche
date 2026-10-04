// Dorftest: Spielt Erlenbach durch. Ankommen, mit Gerold, Marta und Jost sprechen, Gerold die Karte lesen
// lassen, bei Marta eine Angelrute kaufen und ihren Holz-Auftrag erledigen, vom Steg aus angeln, bei Jost
// Fische abgeben und verkaufen. Der Kampf davor (das Kartenteil vom Räuberhauptmann) steht im Rauchtest;
// hier bekommt man es geschenkt. Bildschirmfotos landen in test-ergebnisse/.
import { starteSpiel } from './helfer.mjs';
import { DORF, STEG, WEIHER } from '../src/welt/orte.js';

const { seite, url, pruefe, warte, spiel, taste, foto, ereignis, tafelnWeg, abbruch, ende, drueck } = await starteSpiel();
const kupfer = () => spiel(() => window.spiel.inventar.muenzen);

// Drückt „Benutzen“ (E), sobald es das Erwartete anbietet, bis „fertig“ eintritt. Erzähltafeln, die
// dazwischenkommen (sie bekommen die Taste zuerst), werden geschlossen, dann geht es von vorn los.
async function benutze(text, fertig, arg) {
  for (let versuch = 0; versuch < 6; versuch++) {
    await tafelnWeg();
    const bereit = await warte((t) => {
      const z = window.spiel.steuerung.zustand;
      return !window.spiel.ereignisse.aktuell && window.spiel.benutzen.bereit && window.spiel.benutzen.vorschlag(z.ort, z.blickSeite)?.text === t;
    }, text, 60).then(() => true, () => false);
    if (!bereit) continue;
    await taste('KeyE');
    if (await warte(fertig, arg, 20).then(() => true, () => false)) return;
  }
  throw new Error(`„${text}“ hat nicht geklappt`);
}

// Geht zu einem Dorfbewohner (von der Seite des Dorfplatzes her), schaut ihn an und spricht ihn an
async function sprich(art, abstand = 1.6) {
  await spiel(([a, d, platz]) => {
    const p = window.spiel.doerfler.leute.find((x) => x.art === a).objekt.position;
    const dx = platz.x - p.x, dz = platz.z - p.z, l = Math.hypot(dx, dz);
    window.spiel.teleport(p.x + (dx / l) * d, p.z + (dz / l) * d);
    window.spiel.blick(Math.atan2(dx, dz), -0.1);
  }, [art, abstand, DORF]);
  const name = { gerold: 'Gerold', marta: 'Marta', jost: 'Jost' }[art];
  await benutze(`Mit ${name} sprechen`, (a) => window.spiel.ereignisse.aktuell === `gespraech-${a}`, art);
}

// Wählt im offenen Gespräch eine Antwort und wartet, bis die Tafel zu ist
async function antworte(code) {
  await taste(code);
  await warte(() => !window.spiel.ereignisse.aktuell?.startsWith('gespraech-'), null, 30);
}

const handelZeile = (teil, name) => seite.locator('.handel section.karte').nth(teil).locator('.handel-zeile', { hasText: name });

try {
  await seite.goto(url, { timeout: 300000 });
  await warte(() => window.spiel?.geladen && window.spiel?.bereit, null, 300);
  await seite.click('#wahl-sie', { timeout: 120000 });
  await warte(() => window.spiel.editor?.aktiv, null, 300);
  await drueck('#editor-fertig');
  await warte(() => window.spiel.ereignisse?.aktuell === 'erwachen', null, 300);
  // Ein Lederwams im Gepäck: Die Figur trägt es sichtbar
  await spiel(() => window.spiel.inventar.gib('lederwams', 1));
  const wams = await warte(() => { let v = false; window.spiel.figur.objekt.traverse((o) => { if (o.name.endsWith('-wams')) v = o.visible; }); return v; }, null, 30).then(() => true, () => false);
  pruefe(wams, 'Ein Lederwams im Inventar sieht man an der Figur');
  await taste('KeyE');
  await warte(() => window.spiel.inventar.hat('pergament'), null, 30);
  // Wie nach dem Sieg über den Räuberhauptmann: Stufe 3, das erste Kartenteil ist dabei, der Einsiedler
  // hat es gesehen und schickt einen nach Erlenbach
  await spiel(() => {
    const { fortschritt, inventar, ereignisse } = window.spiel;
    while (fortschritt.stufe < 3) fortschritt.gibErfahrung(100);
    inventar.gib('kartenteil_1', 1);
    for (const m of ['pergament-erkannt', 'weg-nach-erlenbach', 'beute-kartenteil_1', 'kartenteil-gezeigt']) ereignisse.merker.add(m);
  });
  const schrittJetzt = () => spiel(() => window.spiel.aufgaben.ansicht('schatzsuche').schritte.at(-1).text);
  const zuGerold = await warte(() => /Gerold/.test(window.spiel.aufgaben.ansicht('schatzsuche').schritte.at(-1).text), null, 60).then(() => true, () => false);
  pruefe(zuGerold, `Die Hauptgeschichte schickt einen zu Gerold („${await schrittJetzt()}“)`);

  // Ankunft auf der Straße: Erlenbach liegt vor einem
  await spiel((d) => { window.spiel.teleport(d.x - 11, d.z - 10); window.spiel.blick(Math.atan2(-11, -10), -0.05); }, DORF);
  await ereignis('dorf-ankunft', 'KeyE');
  pruefe(true, 'Ankunft in Erlenbach');
  await warte(() => window.spiel.doerfler?.leute.length === 3, null, 300);
  pruefe(true, 'Gerold, Marta und Jost stehen im Dorf');
  await seite.waitForTimeout(2000);
  await foto('dorf-1-ankunft');

  // Gerold, der Kartenleser
  await sprich('gerold');
  pruefe(await spiel(() => document.getElementById('ereignis-text').textContent.includes('Zeig her')), 'Gerold spricht einen auf die Karte an');
  await foto('dorf-2-gerold');
  await antworte('KeyE');
  pruefe(await spiel(() => window.spiel.ereignisse.merker.has('gerold-gelesen')), 'Gerold liest die Karte: Das nächste Stück liegt in den Graufels-Bergen');
  const weiter = await warte(() => /Graufels/.test(window.spiel.aufgaben.ansicht('schatzsuche').schritte.at(-1).text), null, 60).then(() => true, () => false);
  pruefe(weiter, `Die Hauptgeschichte führt weiter („${await schrittJetzt()}“)`);

  // Marta: kaufen und verkaufen
  await spiel(() => { window.spiel.inventar.gibMuenzen(30); window.spiel.inventar.gib('steinpilz', 3); });
  await sprich('marta', 3.4);
  await antworte('KeyE');
  await warte(() => !document.getElementById('menue').hidden && window.spiel.menue.reiter === 'handel', null, 30);
  pruefe(true, 'Bei Marta öffnet „Handeln“ den Handel');
  await foto('dorf-3-handel');
  const vorKauf = await kupfer();
  const preis = await spiel(() => window.spiel.handel.kaufpreis('marta', 'angelrute'));
  await handelZeile(0, 'Angelrute').getByRole('button', { name: 'Kaufen' }).click({ timeout: 30000 });
  pruefe(await spiel(() => window.spiel.inventar.hat('angelrute')) && (await kupfer()) === vorKauf - preis, `Angelrute gekauft (${preis} Kupfer)`);
  const vorVerkauf = await kupfer();
  await handelZeile(1, 'Steinpilz').getByRole('button', { name: 'Verkaufen' }).click({ timeout: 30000 });
  pruefe((await kupfer()) > vorVerkauf && (await spiel(() => window.spiel.inventar.anzahl('steinpilz'))) === 2, `Einen Steinpilz verkauft (+${(await kupfer()) - vorVerkauf} Kupfer)`);
  await taste('Escape');
  await warte(() => document.getElementById('menue').hidden, null, 30);

  // Martas Auftrag: acht Holzscheite
  await sprich('marta', 3.4);
  await antworte('KeyR');
  pruefe(await spiel(() => window.spiel.aufgaben.istAktiv('auftrag_holz')), 'Marta gibt Arbeit: „Holz für Martas Ofen“');
  await spiel(() => window.spiel.inventar.gib('holzscheit', 8));
  const vorHolz = await kupfer();
  await sprich('marta', 3.4);
  await antworte('KeyT');
  await warte(() => window.spiel.aufgaben.erledigte().some((a) => a.id === 'auftrag_holz'), null, 60);
  pruefe((await kupfer()) === vorHolz + 18 && (await spiel(() => window.spiel.inventar.anzahl('holzscheit'))) === 0, 'Holz abgegeben, 18 Kupfer Lohn');

  // Mit der Axt einen Baum fällen, entästen und zerteilen
  await spiel(() => window.spiel.inventar.gib('steinaxt', 1));
  const baum = await spiel(() => {
    const st = window.spiel.sammeln.findeArt('baum', window.spiel.steuerung.zustand.ort);
    const nr = Number(st.id.slice(5));
    const h = window.spiel.baeume.hindernisse[nr];
    window.spiel.teleport(st.x + h.radius + 0.7, st.z);
    window.spiel.blick(Math.PI / 2, -0.1); // nach Westen, zum Baum
    return { nr, x: st.x, z: st.z };
  });
  const holzVorher = await spiel(() => window.spiel.inventar.anzahl('holzscheit'));
  for (let i = 0; i < 12 && !(await spiel((nr) => window.spiel.baeume.baum(nr).weg, baum.nr)); i++) {
    await tafelnWeg();
    await warte(() => { const z = window.spiel.steuerung.zustand; return window.spiel.benutzen.bereit && window.spiel.benutzen.vorschlag(z.ort, z.blickSeite)?.kurz === 'Fällen'; }, null, 60);
    await taste('KeyE');
    await seite.waitForTimeout(600);
  }
  pruefe(await spiel((nr) => window.spiel.baeume.baum(nr).weg, baum.nr), 'Mit der Axt gefällt: Der Baum ist umgefallen');
  // Abwarten, bis er aufgeschlagen ist und daliegt (ohne Grafikkarte dauert das Fallen eine Weile)
  await warte((nr) => window.spiel.faellen.liegender(nr)?.liegt, baum.nr, 240);
  await foto('dorf-baum-gefaellt');
  // Zum liegenden Stamm gehen (er fiel vom Spieler weg), falls man ihn nicht schon von hier aus erreicht
  await spiel((nr) => {
    const z = window.spiel.steuerung.zustand;
    if (['Abhacken', 'Zerteilen'].includes(window.spiel.benutzen.vorschlag(z.ort, z.blickSeite)?.kurz)) return;
    const l = window.spiel.faellen.liegender(nr);
    window.spiel.teleport(l.x, l.z);
  }, baum.nr);
  for (let i = 0; i < 10; i++) {
    await tafelnWeg();
    const v = await warte(() => { const z = window.spiel.steuerung.zustand; const v = window.spiel.benutzen.vorschlag(z.ort, z.blickSeite); return window.spiel.benutzen.bereit && v && ['Abhacken', 'Zerteilen'].includes(v.kurz) ? v.kurz : false; }, null, 30).then((h) => h.jsonValue(), () => null);
    if (!v) break;
    await taste('KeyE');
    await seite.waitForTimeout(600);
  }
  const holzNachher = await spiel(() => window.spiel.inventar.anzahl('holzscheit'));
  pruefe(holzNachher - holzVorher === 6, `Stamm zerteilt: ${holzNachher - holzVorher} Holzscheite`);
  pruefe(await spiel(() => !window.spiel.faellen.vorschlag(window.spiel.steuerung.zustand.ort)), 'Vom Baum ist nur der Stumpf geblieben');

  // Graben und einen Erdwall aufschütten (zweimal: Er wird höher)
  await spiel(() => { window.spiel.inventar.gib('schaufel', 1); window.spiel.teleport(6, -10); window.spiel.blick(Math.PI, -0.3); });
  const erdeVorher = await spiel(() => window.spiel.inventar.anzahl('erde') + window.spiel.inventar.anzahl('lehm'));
  for (let i = 0; i < 2; i++) {
    await tafelnWeg();
    await warte(() => { const z = window.spiel.steuerung.zustand; return window.spiel.benutzen.bereit && window.spiel.benutzen.vorschlag(z.ort, z.blickSeite)?.text === 'Graben'; }, null, 60);
    await taste('KeyE');
    await seite.waitForTimeout(800);
  }
  pruefe(await spiel((n) => window.spiel.inventar.anzahl('erde') + window.spiel.inventar.anzahl('lehm') >= n + 2, erdeVorher), 'Mit der Schaufel gegraben: Erde oder Lehm im Inventar');
  await spiel(() => { window.spiel.inventar.gib('erde', 8); window.spiel.teleport(12, -6); window.spiel.blick(Math.PI / 2, -0.2); });
  for (let i = 0; i < 2; i++) {
    await spiel(() => window.spiel.herstellen.stelleHer(window.spiel.herstellen.rezept('erdwall')));
    await tafelnWeg();
    await warte(() => { const z = window.spiel.steuerung.zustand; const v = window.spiel.benutzen.vorschlag(z.ort, z.blickSeite); return window.spiel.benutzen.bereit && v?.kurz === 'Bauen'; }, null, 60);
    await taste('KeyE');
    await seite.waitForTimeout(800);
  }
  await taste('KeyB');
  const waelle = await spiel(() => window.spiel.bauen.alle().filter((b) => b.art === 'erdwall').map((b) => b.hoehe));
  pruefe(waelle.length === 1 && waelle[0] > 1, `Erdwall gebaut und höher aufgeschüttet (${waelle.join(', ')} m)`);
  await foto('dorf-erdwall');

  // Angeln vom Steg aus
  await spiel(([s, w]) => {
    window.spiel.ueberleben.werte.wasser = 100;
    window.spiel.teleport(s.x, s.z + 5.5);
    window.spiel.blick(Math.atan2(-(w.x - s.x), -(w.z - s.z)), -0.25);
  }, [STEG, WEIHER]);
  await seite.waitForTimeout(1000);
  const aufDemSteg = await spiel(() => window.spiel.steuerung.zustand.ort.y > window.spiel.wasserspiegel);
  pruefe(aufDemSteg, 'Auf dem Steg steht man über dem Wasser');
  await benutze('Angel auswerfen', () => window.spiel.angeln.aktiv);
  pruefe(true, 'Angel ausgeworfen');
  const haelt = await warte(() => window.spiel.angeln.rute.visible && !window.spiel.figur.rechteHand.getObjectByName('waffe'), null, 30).then(() => true, () => false);
  pruefe(haelt, 'Die Figur hält die Angelrute (und keine Waffe)');
  await seite.waitForTimeout(1500);
  await foto('dorf-4-angeln');
  const fischerVorher = await spiel(() => window.spiel.fortschritt.zustand.berufe.fischen.erfahrung);
  await warte(() => window.spiel.angeln.biss && window.spiel.benutzen.bereit, null, 300);
  await tafelnWeg();
  await taste('KeyE');
  await warte(() => !window.spiel.angeln.aktiv, null, 30);
  const fang = await spiel(() => window.spiel.inventar.liste().filter((d) => d.fisch).map((d) => d.id));
  pruefe(fang.length === 1, `Ein Fisch gefangen (${fang.join(', ')})`);
  const fischer = await spiel(() => window.spiel.fortschritt.zustand.berufe.fischen);
  pruefe(fischer.stufe > 1 || fischer.erfahrung > fischerVorher, 'Der Fang bringt Erfahrung im Beruf Fischen');

  // Zu früh gezogen: kein Fisch
  await benutze('Angel auswerfen', () => window.spiel.angeln.aktiv);
  await benutze('Angel einholen', () => !window.spiel.angeln.aktiv);
  pruefe((await spiel(() => window.spiel.inventar.liste().filter((d) => d.fisch).length)) === 1, 'Zu früh gezogen: kein Fisch');

  // Jost zahlt für Fisch mehr als Marta
  const preise = await spiel((id) => ({ jost: window.spiel.handel.verkaufspreis('jost', id), marta: window.spiel.handel.verkaufspreis('marta', id) }), fang[0]);
  pruefe(preise.jost > preise.marta, `Jost zahlt für Fisch mehr (${preise.jost} statt ${preise.marta} Kupfer)`);

  // Josts Auftrag: fünf Fische
  await sprich('jost');
  await antworte('KeyR');
  pruefe(await spiel(() => window.spiel.aufgaben.istAktiv('auftrag_fische')), 'Jost gibt Arbeit: „Fisch für Jost“');
  await spiel(() => window.spiel.inventar.gib('rotauge', 4));
  const vorFisch = await kupfer();
  await sprich('jost');
  await antworte('KeyT');
  await warte(() => window.spiel.aufgaben.erledigte().some((a) => a.id === 'auftrag_fische'), null, 60);
  pruefe((await kupfer()) === vorFisch + 20 && (await spiel(() => window.spiel.inventar.liste().filter((d) => d.fisch).length)) === 0, 'Fünf Fische abgegeben, 20 Kupfer Lohn');

  // Bei Jost Fisch verkaufen
  await spiel(() => window.spiel.inventar.gib('barsch', 2));
  await sprich('jost');
  await antworte('KeyE');
  await warte(() => !document.getElementById('menue').hidden && window.spiel.menue.reiter === 'handel', null, 30);
  const barschPreis = await spiel(() => window.spiel.handel.verkaufspreis('jost', 'barsch'));
  const vorBarsch = await kupfer();
  await handelZeile(1, 'Barsch').getByRole('button', { name: 'Alle' }).click({ timeout: 30000 });
  const erloes = (await kupfer()) - vorBarsch;
  pruefe(!(await spiel(() => window.spiel.inventar.hat('barsch'))) && erloes >= barschPreis, `Zwei Barsche an Jost verkauft (+${erloes} Kupfer)`);
  await foto('dorf-5-jost');
  await taste('Escape');
} catch (e) {
  await abbruch(e, 'dorf-fehler');
}
await ende();
