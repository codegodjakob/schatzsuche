// Die lebendige Welt: Begegnungen unterwegs (Karawane, Wegelagerer, Brida, Sturm), Kleidung gegen Kälte,
// Jagd mit Pfeil und Bogen, Feen im Moor.
import { starteSpiel } from './helfer.mjs';

const { seite, url, pruefe, warte, spiel, taste, foto, ereignis, tafelnWeg, abbruch, ende } = await starteSpiel();

try {
  await seite.goto(url, { timeout: 300000 });
  await warte(() => window.spiel?.geladen && window.spiel?.bereit, null, 600);
  await seite.click('#wahl-sie', { timeout: 300000 });
  await seite.click('#editor-fertig', { timeout: 300000 });
  await ereignis('erwachen');
  await tafelnWeg();

  // Brida gibt einen Brief: daraus wird ein Vorhaben
  await spiel(() => window.spiel.begegnungen.erzwinge('b-brida'));
  await ereignis('b-brida', 'KeyE');
  pruefe(await spiel(() => window.spiel.inventar.hat('brief') && window.spiel.aufgaben.istAktiv('brief_gerold')), 'Brida gibt einen Brief, im Tagebuch steht: Bring ihn zu Gerold');

  // Mit der Karawane nach Erlenbach
  await spiel(() => { window.spiel.inventar.gibMuenzen(20); window.spiel.teleport(60, -2); });
  await spiel(() => window.spiel.begegnungen.erzwinge('b-karawane'));
  const tagVorher = await spiel(() => window.spiel.zeit.tag * 24 + window.spiel.zeit.stunde);
  await ereignis('b-karawane', 'KeyE');
  await warte(() => window.spiel.steuerung.zustand.aktiv && Math.hypot(window.spiel.steuerung.zustand.ort.x - 194, window.spiel.steuerung.zustand.ort.z - 18) < 3, null, 120);
  const nachher = await spiel(() => window.spiel.zeit.tag * 24 + window.spiel.zeit.stunde);
  pruefe(nachher - tagVorher >= 2.9, `Mit der Karawane in Erlenbach angekommen (${(nachher - tagVorher).toFixed(1)} Stunden unterwegs)`);
  await foto('welt-1-karawane');

  // Wegelagerer: Kämpfen ruft zwei Gegner herbei, die einen verfolgen
  await spiel(() => window.spiel.teleport(70, -2));
  const vorher = await spiel(() => window.spiel.gegner.alle.length);
  await spiel(() => window.spiel.begegnungen.erzwinge('b-wegelagerer'));
  await ereignis('b-wegelagerer', 'KeyE');
  await warte((n) => window.spiel.gegner.alle.length >= n + 2, vorher, 120);
  pruefe(await spiel(() => window.spiel.gegner.alle.filter((g) => g.art === 'wegelagerer' && g.zustand !== 'tot').length === 2), 'Zwei Wegelagerer greifen an');
  await seite.waitForTimeout(1500);
  await foto('welt-2-wegelagerer');
  // Weg von ihnen, damit der Rest in Ruhe geht
  await spiel(() => { for (const g of window.spiel.gegner.alle) if (g.art === 'wegelagerer') g.weg = true; });

  // Sturm im Wald wirft einen Baum um
  await spiel(() => window.spiel.teleport(-40, 60));
  const vorSturm = await spiel(() => window.spiel.baeume.hindernisse.filter((h, nr) => window.spiel.baeume.baum(nr).weg).length);
  await spiel(() => window.spiel.begegnungen.erzwinge('b-sturm'));
  await ereignis('b-sturm', 'KeyE');
  const nachSturm = await spiel(() => window.spiel.baeume.hindernisse.filter((h, nr) => window.spiel.baeume.baum(nr).weg).length);
  pruefe(nachSturm === vorSturm + 1, 'Der Sturm hat einen Baum umgeworfen');

  // Kleidung hält warm
  const ohne = await spiel(() => window.spiel.inventar.kleidungsWaerme());
  await spiel(() => { window.spiel.inventar.gib('leinenhemd', 1); window.spiel.inventar.gib('wollmantel', 1); });
  const mit = await spiel(() => window.spiel.inventar.kleidungsWaerme());
  pruefe(ohne === 0 && mit > 0.45, `Hemd und Mantel halten ${Math.round(mit * 100)} % der Kälte ab`);

  // Jagd: zum nächsten Fuchs, Bogen und Pfeile, zielen, schießen
  await warte(() => window.spiel.tiere.alle.length > 0, null, 300);
  const fuchs = await spiel(() => {
    const t = window.spiel.tiere.alle[0];
    t.def.scheu = 0; // für die Prüfung: Er läuft nicht weg
    t.zustand = 'stehen'; t.uhr = 999;
    const p = t.objekt.position;
    window.spiel.teleport(p.x, p.z + 8);
    window.spiel.inventar.gib('bogen', 1);
    window.spiel.inventar.gib('pfeil', 10);
    return { x: p.x, z: p.z, id: t.id };
  });
  await seite.waitForTimeout(1000);
  for (let i = 0; i < 6 && !(await spiel((id) => window.spiel.tiere.alle.find((t) => t.id === id).zustand === 'tot', fuchs.id)); i++) {
    // ins Ich-Bild und genau auf den Fuchs zielen
    await spiel((f) => {
      const z = window.spiel.steuerung.zustand;
      if (!z.ichSicht) { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyV' })); }
      const t = window.spiel.tiere.alle.find((x) => x.id === f.id);
      const dx = t.objekt.position.x - z.ort.x, dz = t.objekt.position.z - z.ort.z;
      const d = Math.hypot(dx, dz);
      window.spiel.blick(Math.atan2(-dx, -dz), Math.atan2(t.objekt.position.y + 0.3 - (z.ort.y + 1.5), d));
    }, fuchs);
    await seite.waitForTimeout(800);
    await tafelnWeg();
    await taste('KeyR');
    await seite.waitForTimeout(3500);
  }
  const erlegt = await spiel((id) => window.spiel.tiere.alle.find((t) => t.id === id).zustand === 'tot', fuchs.id);
  pruefe(erlegt, 'Mit dem Bogen einen Fuchs erlegt');
  pruefe(await spiel(() => window.spiel.inventar.hat('fell') && window.spiel.inventar.hat('fleisch')), 'Beute: Fell und Fleisch');
  await foto('welt-3-jagd');

  // Das Moor bei Nacht: Feen tanzen und schenken Feentau
  await spiel(() => { window.spiel.zeit.stunde = 23; window.spiel.teleport(-52, -104); });
  await ereignis('moor', 'KeyE');
  await warte(() => window.spiel.feen.alle.filter((f) => f.fee.visible).length > 8, null, 60);
  await ereignis('feen', 'KeyE');
  pruefe(await spiel(() => window.spiel.inventar.anzahl('feentau') === 2), 'Im Moor mit den Feen getanzt: zwei Fläschchen Feentau');
  await seite.waitForTimeout(3000);
  await foto('welt-4-feen');
} catch (e) {
  await abbruch(e, 'welt-fehler');
}
await ende();
