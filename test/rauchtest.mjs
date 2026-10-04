// Rauchtest: Startet das Spiel in einem unsichtbaren Browser und spielt die wichtigsten Abläufe durch:
// Start, Laufen, Blickwechsel, Trinken, Einsiedler und Pergament, Sammeln mit „Benutzen“,
// Feuer lernen, Herstellen im Menü, Stufenaufstieg, Punkte verteilen, Feuer machen, Kampf gegen
// Räuber und Hauptmann, Spielstand speichern und weiterspielen, Nacht, Sterben.
// Bildschirmfotos landen in test-ergebnisse/ (nicht im Projekt gespeichert).
import { starteSpiel } from './helfer.mjs';

const { seite, url, pruefe, warte, spiel, taste, foto, ereignis, tafelnWeg, abbruch, ende, drueck } = await starteSpiel();
const anzahl = (id) => spiel((i) => window.spiel.inventar.anzahl(i), id);

// Geht zur nächsten freien Stelle einer Art (Ast, Stein, Flachs …) und nimmt sie mit „Benutzen“ (E).
// Taucht dabei eine Erzähltafel auf, wird sie geschlossen und es noch einmal versucht.
async function sammle(art, wo, mal = 1) {
  for (let n = 0; n < mal; n++) {
    const stelle = await spiel(([a, o]) => {
      const s = window.spiel.sammeln.findeArt(a, o);
      return s && { x: s.x, z: s.z, id: s.id };
    }, [art, wo]);
    if (!stelle) throw new Error(`Keine Stelle „${art}“ mehr frei`);
    await spiel((s) => window.spiel.teleport(s.x + 0.5, s.z), stelle);
    let genommen = false;
    for (let versuch = 0; versuch < 12 && !genommen; versuch++) {
      await tafelnWeg();
      await taste('KeyE');
      genommen = await warte((id) => !window.spiel.sammeln.istDa(window.spiel.sammeln.stelle(id)), stelle.id, 15).then(() => true, () => false);
    }
    if (!genommen) throw new Error(`„${art}“ ließ sich nicht nehmen`);
  }
}

// Stellt im Menü (Reiter Herstellen) etwas her, per Klick wie ein Spieler
async function stelleHer(rezept) {
  await tafelnWeg();
  await taste('KeyK');
  await seite.locator(`.rezept[data-rezept="${rezept}"] button`).click({ timeout: 30000 });
  if (await spiel(() => !document.getElementById('menue').hidden)) await taste('Escape');
}

try {
  await seite.goto(url, { timeout: 300000 });
  await warte(() => window.spiel?.geladen && window.spiel?.bereit, null, 300);
  await seite.waitForTimeout(1500);
  await foto('1-start');
  pruefe(true, 'Welt wird gezeichnet');
  const stellen = await spiel(() => {
    const n = {};
    for (const s of window.spiel.sammeln.stellen) n[s.art] = (n[s.art] ?? 0) + 1;
    return n;
  });
  pruefe(stellen.ast > 30 && stellen.stein > 30 && stellen.pilz > 20 && stellen.flachs > 30 && stellen.kamille > 30 && stellen.johanniskraut > 30 && stellen.baum > 1000,
    `Überall liegt etwas zum Sammeln (${Object.entries(stellen).map(([a, n]) => `${n} ${a}`).join(', ')})`);

  await seite.click('#wahl-er', { timeout: 120000 });
  // Charakter-Editor: würfeln, einen Regler verschieben, dann los
  await warte(() => window.spiel.editor?.aktiv, null, 300);
  pruefe(true, 'Nach der Wahl öffnet sich der Charakter-Editor');
  await drueck('#editor-wuerfeln');
  await drueck('[data-editor-reiter="haare"]');
  await seite.locator('#editor-inhalt input[type="range"]').first().fill('0.2');
  await seite.fill('#editor-name', 'Rauch');
  await seite.waitForTimeout(1500);
  await foto('1b-editor');
  const gewaehlt = await spiel(() => ({ ...window.spiel.aussehen }));
  pruefe(gewaehlt.haarLaenge === 0.2 && gewaehlt.name === 'Rauch', `Editor: Name und Haarlänge eingestellt (${gewaehlt.haarLaenge * 100} cm)`);
  await drueck('#editor-fertig');
  await warte(() => window.spiel.ereignisse?.aktuell === 'erwachen', null, 120);
  const lang = await spiel(() => { let v = null; window.spiel.figur.objekt.traverse((o) => { if (o.name.endsWith('-haare_lang')) v = o.visible; }); return v; });
  pruefe(lang === true, 'Die Figur im Spiel hat die gewählten langen Haare');
  pruefe(true, 'Erstes Ereignis „erwachen“ erscheint');
  await foto('2-erwachen');
  await taste('KeyE');
  await warte(() => window.spiel.inventar.hat('pergament'), null, 30);
  const aufgaben = await spiel(() => window.spiel.aufgaben.aktive().map((a) => a.id));
  pruefe(aufgaben.includes('schatzsuche') && aufgaben.includes('durst'), `Pergament im Inventar, Aufgaben beginnen (${aufgaben.join(', ')})`);

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
  await foto('3-laufen');

  await taste('KeyV');
  await seite.waitForTimeout(300);
  await foto('4-ich-sicht');
  pruefe(await spiel(() => window.spiel.steuerung.zustand.ichSicht), 'Blickwinkel wechselt mit V');
  await taste('KeyV');

  // Trinken am Teich: erfüllt die erste Aufgabe
  await spiel(() => { window.spiel.ueberleben.werte.wasser = 40; window.spiel.teleport(24, -18); window.spiel.blick(2.4, -0.15); });
  await ereignis('teich', 'KeyE');
  const wasser = await spiel(() => window.spiel.ueberleben.werte.wasser);
  pruefe(wasser > 90, `Trinken am Teich füllt Wasser auf (${wasser.toFixed(0)} %)`);
  await warte(() => window.spiel.aufgaben.istErledigt('durst'), null, 60);
  pruefe(await spiel(() => window.spiel.fortschritt.zustand.erfahrung >= 20), 'Aufgabe „Durst“ erfüllt, Erfahrung bekommen');
  await foto('5-teich');

  // Der Einsiedler erkennt das Pergament und gibt die erste Aufgabe
  await spiel(() => window.spiel.teleport(-58 + 3.5, 86 - 3.5));
  await ereignis('einsiedler-sehen', 'KeyE');
  await ereignis('einsiedler-gruss', 'KeyE');
  pruefe(await spiel(() => window.spiel.ereignisse.merker.has('einsiedler-freund')), 'Einsiedler begrüßt und gibt zu essen');
  await foto('6-einsiedler');
  await ereignis('einsiedler-pergament', 'KeyE');
  pruefe(await spiel(() => window.spiel.ereignisse.merker.has('pergament-erkannt')), 'Einsiedler erkennt das Pergament (Hauptgeschichte geht weiter)');
  await ereignis('einsiedler-aufgabe', 'KeyE');
  pruefe(await spiel(() => window.spiel.aufgaben.istAktiv('feuer')), 'Aufgabe: drei Äste bringen');

  // Äste sammeln mit „Benutzen“
  await spiel(() => window.spiel.teleport(-30.5, 58));
  await seite.waitForTimeout(1500);
  await foto('7-benutzen');
  await sammle('ast', { x: -30, z: 58 }, 3);
  const aeste = await anzahl('ast');
  pruefe(aeste >= 3, `Drei Äste mit „Benutzen“ aufgehoben (${aeste})`);

  await spiel(() => window.spiel.teleport(-58 + 3, 86 - 3));
  await ereignis('einsiedler-feuer-lernen', 'KeyE');
  pruefe(await spiel(() => window.spiel.ereignisse.merker.has('kann-feuer')), 'Feuer machen gelernt');
  await warte(() => window.spiel.aufgaben.istErledigt('feuer'), null, 60);
  await ereignis('einsiedler-werkzeug', 'KeyE');
  pruefe(await spiel(() => window.spiel.aufgaben.istAktiv('werkzeug') && window.spiel.aufgaben.istAktiv('kraeuter')), 'Neue Aufgaben: Werkzeug und Heilkräuter');

  // Das erste Werkzeug: Flachs pflücken, Schnur drehen, Stein suchen, Messer bauen
  await sammle('flachs', { x: 0, z: 0 }, 2);
  pruefe((await anzahl('fasern')) >= 3, `Flachs gepflückt (${await anzahl('fasern')} Fasern)`);
  await stelleHer('schnur');
  pruefe((await anzahl('schnur')) >= 1, 'Im Menü eine Schnur gedreht');
  await sammle('stein', { x: 0, z: 0 }, 1);
  await sammle('ast', { x: 0, z: 0 }, 1);
  await taste('KeyK');
  await seite.waitForTimeout(500);
  await foto('8-herstellen');
  await taste('Escape');
  await stelleHer('steinmesser');
  pruefe(await spiel(() => window.spiel.inventar.hat('steinmesser')), 'Steinmesser hergestellt');
  await warte(() => window.spiel.aufgaben.istErledigt('werkzeug'), null, 60);
  const lohn = await spiel(() => ({ stufe: window.spiel.fortschritt.stufe, muenzen: window.spiel.inventar.muenzen }));
  pruefe(lohn.stufe >= 2 && lohn.muenzen >= 5, `Aufgabe „Werkzeug“ erfüllt: Stufe ${lohn.stufe}, ${lohn.muenzen} Kupfer`);
  pruefe(await spiel(() => window.spiel.aufgaben.istAktiv('holz')), 'Danach beginnt „Holz für den Winter“');

  // Statuspunkte im Menü verteilen
  await taste('KeyC');
  await seite.waitForTimeout(500);
  await foto('9-figur');
  const staerke = await spiel(() => window.spiel.fortschritt.zustand.werte.staerke);
  await seite.click('.wert-zeile:has-text("Stärke") .plus');
  pruefe(await spiel((s) => window.spiel.fortschritt.zustand.werte.staerke === s + 1, staerke), 'Stärke um einen Punkt erhöht');
  await taste('Escape');
  pruefe(await spiel(() => document.getElementById('menue').hidden && window.spiel.steuerung.zustand.aktiv), 'Menü schließt, Spiel läuft weiter');

  // Selbst Feuer machen: Äste holen, dann F
  await sammle('ast', { x: 0, z: 0 }, 3);
  await tafelnWeg();
  const feuerVorher = await spiel(() => window.spiel.szene.children.filter((o) => o.name === 'feuer').length);
  await taste('KeyF');
  await warte((n) => window.spiel.szene.children.filter((o) => o.name === 'feuer').length > n, feuerVorher, 30).catch(() => {});
  const feuerNachher = await spiel(() => window.spiel.szene.children.filter((o) => o.name === 'feuer').length);
  pruefe(feuerNachher === feuerVorher + 1, 'Mit F brennt ein eigenes Feuer');
  await foto('10-eigenes-feuer');

  // Kampf: mit der Keule des Hauptmanns gegen einen Räuber an der Straße
  await warte(() => window.spiel.gegner.alle.length === 5, null, 300);
  await spiel(() => window.spiel.inventar.gib('eisenkeule', 1));
  // Gegen einen Gegner kämpfen: dicht heran, zu ihm schauen, zuschlagen, bis er fällt
  async function kaempfe(nummer, sekunden = 240) {
    const ende = Date.now() + sekunden * 1000;
    while (Date.now() < ende) {
      const g = await spiel((n) => { const g = window.spiel.gegner.alle[n]; return { x: g.objekt.position.x, z: g.objekt.position.z, tot: g.zustand === 'tot' }; }, nummer);
      if (g.tot) return true;
      await spiel((p) => {
        const o = window.spiel.steuerung.zustand.ort;
        if (Math.hypot(o.x - p.x, o.z - p.z) > 2.2) window.spiel.teleport(p.x - 1.6, p.z);
        window.spiel.blick(Math.atan2(-(p.x - o.x), -(p.z - o.z)), -0.1);
      }, g);
      await tafelnWeg();
      await taste('KeyX');
      await seite.waitForTimeout(400);
    }
    return false;
  }
  const vorKampf = await spiel(() => ({ ep: window.spiel.fortschritt.zustand.erfahrung + 1000 * window.spiel.fortschritt.stufe, muenzen: window.spiel.inventar.muenzen }));
  const gesiegt = await kaempfe(0);
  await foto('11-kampf');
  const nachKampf = await spiel(() => ({ ep: window.spiel.fortschritt.zustand.erfahrung + 1000 * window.spiel.fortschritt.stufe, muenzen: window.spiel.inventar.muenzen, besiegt: window.spiel.fortschritt.besiegt('raeuber') }));
  pruefe(gesiegt && nachKampf.besiegt >= 1, 'Ein Räuber ist im Kampf besiegt');
  pruefe(nachKampf.ep > vorKampf.ep && nachKampf.muenzen > vorKampf.muenzen, `Sieg bringt Erfahrung und Kupfer (+${nachKampf.muenzen - vorKampf.muenzen} Kupfer)`);
  pruefe(await spiel(() => window.spiel.aufgaben.istAktiv('raeuber') || window.spiel.aufgaben.istErledigt('raeuber')), 'Aufgabe „Räuber an der Straße“ läuft');
  // Der Hauptmann (für den Test geschwächt) trägt das erste Kartenteil
  await spiel(() => { const h = window.spiel.gegner.alle[4]; h.leben = 12; });
  const bossBesiegt = await kaempfe(4);
  pruefe(bossBesiegt && await spiel(() => window.spiel.inventar.hat('kartenteil_1')), 'Räuberhauptmann besiegt, das Kartenteil ist im Inventar');

  // Spielstand: speichern, Seite neu laden, weiterspielen
  const stand = await spiel(() => ({ stufe: window.spiel.fortschritt.stufe, messer: window.spiel.inventar.hat('steinmesser'), holz: window.spiel.aufgaben.istAktiv('holz') }));
  await spiel(() => window.spiel.speichere());
  await seite.reload({ timeout: 300000 });
  await warte(() => window.spiel?.geladen && window.spiel?.bereit, null, 300);
  pruefe(await spiel(() => !document.getElementById('weiter').hidden), `Nach dem Neuladen: „Weiterspielen“ (${await spiel(() => document.getElementById('weiter-info').textContent)})`);
  await seite.click('#weiter');
  await warte(() => window.spiel.figur && window.spiel.steuerung.zustand.aktiv, null, 300);
  const geladen = await spiel(() => ({ stufe: window.spiel.fortschritt.stufe, messer: window.spiel.inventar.hat('steinmesser'), holz: window.spiel.aufgaben.istAktiv('holz') }));
  pruefe(geladen.stufe === stand.stufe && geladen.messer && geladen.holz, 'Spielstand geladen: Stufe, Inventar und Aufgaben sind wieder da');
  const nachLaden = await spiel(() => ({ ...window.spiel.aussehen }));
  pruefe(nachLaden.name === 'Rauch' && nachLaden.haarLaenge >= 0.2 && nachLaden.kopf === gewaehlt.kopf, `Das Aussehen ist nach dem Neuladen dasselbe (Haare ${Math.round(nachLaden.haarLaenge * 100)} cm, sie wachsen)`);
  await seite.waitForTimeout(3000);
  pruefe(await spiel(() => window.spiel.ereignisse.aktuell !== 'erwachen'), 'Beim Weiterspielen beginnt die Geschichte nicht von vorn');
  await warte(() => window.spiel.gegner.alle.length === 5, null, 300);
  pruefe(await spiel(() => window.spiel.gegner.alle[4].zustand === 'tot'), 'Der besiegte Hauptmann bleibt nach dem Neuladen besiegt');

  // Nacht, mit einer Fackel
  await spiel(() => { window.spiel.inventar.gib('fackel', 1); window.spiel.teleport(-54, 80); window.spiel.blick(3.4, 0.05); window.spiel.setzeZeit(23); });
  await seite.waitForTimeout(2500);
  await foto('12-nacht');
  pruefe(await spiel(() => window.spiel.zeit.hell < 0.2), 'Es wird Nacht');
  pruefe(await warte(() => window.spiel.fackelBrennt(), null, 60).then(() => true, () => false), 'Nachts brennt die Fackel von selbst');

  // Sterben und wieder aufwachen: Sachen weg, Gelerntes und das Pergament bleiben
  await spiel(() => { window.spiel.setzeZeit(12); const w = window.spiel.ueberleben.werte; w.wasser = 0; w.leben = 0.02; });
  await warte(() => !document.getElementById('tod').hidden, null, 300);
  pruefe(true, 'Tod wird angezeigt');
  await warte(() => window.spiel.steuerung.zustand.aktiv && window.spiel.ueberleben.werte.leben >= 99, null, 300);
  const nachTod = await spiel(() => ({
    dinge: window.spiel.inventar.liste().map((d) => [d.id, d.art]), stufe: window.spiel.fortschritt.stufe,
  }));
  pruefe(nachTod.dinge.every(([, art]) => art === 'aufgabe') && nachTod.dinge.some(([id]) => id === 'pergament') && nachTod.stufe === stand.stufe,
    `Nach dem Tod: nur Pergament und Kartenteil bleiben (${nachTod.dinge.map(([id]) => id).join(', ')}), Stufe ${nachTod.stufe} bleibt`);
} catch (e) {
  await abbruch(e);
}
await ende();
