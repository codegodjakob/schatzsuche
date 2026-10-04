// Begegnungen: Unterwegs passiert immer wieder etwas von selbst, nicht nach Liste, sondern je nach Ort,
// Tageszeit und dem, was man schon erlebt hat. Jemand spricht einen an, Wegelagerer treten aus dem Gebüsch,
// eine Karawane zieht vorbei, ein Sturm reißt einen Baum um. Aus manchen Begegnungen entstehen Vorhaben
// (src/inhalte/aufgaben.js), die man annehmen kann oder nicht.
//
// Jede Begegnung ist ein Ereignis wie in liste.js, mit dazu:
//   gewicht(s, lage) – wie wahrscheinlich sie gerade ist (0 = gar nicht); lage: { imDorf, anStrasse, imWald, nacht }
//   einmal           – true: nur ein einziges Mal im ganzen Spiel
//   ruhe             – Sekunden, bis dieselbe Begegnung wieder kommen darf (sonst 20 Minuten)
import { DORF } from '../welt/orte.js';

export const BEGEGNUNGEN = [
  {
    id: 'b-wegelagerer',
    gewicht: (s, l) => (l.imDorf || s.stufe < 2 ? 0 : l.anStrasse ? 3 : 1.5) * (l.nacht ? 1.5 : 1),
    ruhe: 900,
    text: 'Zwei Gestalten treten aus dem Gebüsch, Knüppel in der Hand. „Hübsch langsam, Wanderer. Dein Geld oder dein Leben!“',
    optionen: [
      { taste: 'E', text: 'Kämpfen', folge: (s) => { s.ueberfall(2); s.sage('Sie stürmen auf dich zu!'); } },
      {
        taste: 'R', text: 'Zehn Kupfer geben', bedingung: (s) => s.muenzen >= 10,
        folge: (s) => { s.zahle(10); s.sage('Sie lachen, stecken das Geld ein und verschwinden im Wald.'); },
      },
      { taste: 'Q', text: 'Weglaufen', folge: (s) => { s.ueberfall(2); s.sage('Lauf! Sie sind dir auf den Fersen.'); } },
    ],
  },
  {
    id: 'b-hausierer',
    gewicht: (s, l) => (l.imDorf || l.nacht ? 0 : l.anStrasse ? 2.5 : 1),
    ruhe: 1500,
    text: 'Ein Mann mit einem riesigen Bündel auf dem Rücken pfeift ein Lied. „Ulf, Hausierer! Hemden, Hosen, Stiefel, '
      + 'Schnur, alles, was der Wanderer braucht. Und glänzende Sachen kaufe ich gut.“',
    optionen: [
      { taste: 'E', text: 'Handeln', folge: (s) => s.handel('hausierer') },
      { taste: 'Q', text: 'Weitergehen' },
    ],
  },
  {
    id: 'b-brida',
    einmal: true,
    gewicht: (s, l) => (l.imDorf || l.nacht || s.weiss('brief-abgegeben') ? 0 : 2),
    text: 'Am Wegrand sitzt eine Frau und reibt sich den Knöchel. „Brida, Botin. Mein Fuß ist hin, ich komme heute nicht weiter. '
      + 'Bringst du einen Brief nach Erlenbach? Zu Gerold, dem Kartenleser. Es ist wichtig.“',
    optionen: [
      {
        taste: 'E', text: 'Den Brief nehmen',
        folge: (s) => { s.gib('brief'); s.starteAufgabe('brief_gerold'); s.sage('„Danke. Und sag ihm, dass die Krone wieder unterwegs ist. Er wird verstehen.“'); },
      },
      { taste: 'Q', text: 'Keine Zeit', folge: (s) => s.sage('Sie nickt müde. Vielleicht triffst du sie noch einmal.') },
    ],
  },
  {
    id: 'b-karawane',
    gewicht: (s, l) => (l.anStrasse && !l.nacht ? 3 : 0),
    ruhe: 1200,
    text: (s) => `Drei Ochsenkarren rumpeln die Straße entlang, beladen mit Fässern und Ballen. Der Karawanenführer hebt die Hand. `
      + `„Ansgar, aus dem Süden. Wir ziehen nach Erlenbach. Für sechs Kupfer nehmen wir dich mit, schneller als zu Fuß ist es allemal.“`
      + (s.weiss('geruecht-krone') ? ' Er senkt die Stimme: „Man erzählt, ein Fürst mit einer Krone im Wappen lässt nach alten Karten suchen.“' : ''),
    optionen: [
      {
        taste: 'E', text: 'Mitfahren nach Erlenbach (6 Kupfer)', bedingung: (s) => s.muenzen >= 6 && !s.nahe(DORF.x, DORF.z, 60),
        folge: (s) => { s.zahle(6); s.reise(DORF.x - 6, DORF.z - 22, 3, 'Die Karren rumpeln über die Straße. Am Abend seid ihr in Erlenbach.'); },
      },
      { taste: 'R', text: 'Ihre Waren ansehen', folge: (s) => s.handel('karawane') },
      { taste: 'Q', text: 'Weiterziehen' },
    ],
  },
  {
    id: 'b-sturm',
    gewicht: (s, l) => (l.imWald ? 1.2 : 0),
    ruhe: 2400,
    text: 'Der Wind frischt auf, die Kronen rauschen, Äste fliegen. Ein Sturm fegt durch den Wald. Ganz in der Nähe kracht und splittert es.',
    beimZeigen: (s) => s.sturm(),
    optionen: [{ taste: 'E', text: 'Den Kopf einziehen', folge: (s) => s.sage('Ein Baum ist umgestürzt. Mit einer Axt hättest du jetzt reichlich Holz.') }],
  },
  {
    id: 'b-hilde',
    einmal: true,
    gewicht: (s, l) => (l.imDorf || l.nacht ? 0 : l.imWald ? 2 : 1),
    text: 'Eine alte Frau mit einem Korb voller Kräuter richtet sich auf. „Hilde. Ich suche Kamille, aber meine Augen wollen nicht mehr. '
      + 'Ein Junge im Dorf hat Fieber. Würdest du mir fünf Blüten bringen? Gib sie meiner Schwester Marta auf dem Markt.“',
    optionen: [
      { taste: 'E', text: 'Ich helfe dir', folge: (s) => { s.starteAufgabe('kamille_marta'); s.sage('Kamille hat weiße Blüten mit gelbem Herz.'); } },
      { taste: 'Q', text: 'Ein andermal' },
    ],
  },
  {
    id: 'b-rabe',
    einmal: true,
    gewicht: (s, l) => (l.imWald && !l.nacht ? 0.8 : 0),
    text: 'Ein Rabe beäugt dich von einem Ast, krächzt dreimal und lässt etwas fallen. Es klimpert im Laub: ein alter Ring, '
      + 'graviert mit einem Zeichen wie auf deinem Pergament.',
    optionen: [{ taste: 'E', text: 'Aufheben', folge: (s) => { s.gib('ring'); s.merke('ring-gefunden'); } }],
  },
  {
    id: 'b-pilgerin',
    gewicht: (s, l) => (l.nacht || l.imDorf ? 0 : 1),
    ruhe: 3000,
    text: (s) => (s.weiss('geruecht-graufels')
      ? '„Du wieder!“ Die Pilgerin lächelt. „Im Graufels gibt es eine Höhle, aus der im Winter warme Luft kommt. Die Zwerge, sagt man, schmieden dort noch immer.“'
      : 'Eine Pilgerin in grauem Umhang setzt sich zu dir. „Ich war im Norden, in den Graufels-Bergen. Dort stehen Ruinen der Alten Könige, '
        + 'halb im Fels versunken. Und Zwerge sollen dort leben. Ich habe keinen gesehen, aber ihre Hämmer gehört.“'),
    optionen: [{ taste: 'E', text: 'Ihr danken', folge: (s) => { s.merke('geruecht-graufels'); s.gibErfahrung(10); } }],
  },
];

// Würfelt alle paar Minuten, ob gerade etwas passiert. ort(): wo der Spieler steht; lage(): siehe oben
export function erzeugeBegegnungen({ ereignisse, darf, lage }) {
  const zuletzt = new Map(); // id -> Spielsekunde, ab der sie wieder darf
  let uhr = 0;
  let naechste = 150 + Math.random() * 120; // die erste nach ein paar Minuten
  const ABSTAND = [180, 360]; // Sekunden zwischen zwei Begegnungen

  function waehle() {
    const s = ereignisse.s, l = lage();
    const kandidaten = BEGEGNUNGEN
      .filter((b) => !(b.einmal && ereignisse.erledigt.has(b.id)) && (zuletzt.get(b.id) ?? 0) <= uhr)
      .map((b) => [b, b.gewicht(s, l)])
      .filter(([, g]) => g > 0);
    const summe = kandidaten.reduce((n, [, g]) => n + g, 0);
    if (!summe) return null;
    let r = Math.random() * summe;
    for (const [b, g] of kandidaten) { r -= g; if (r <= 0) return b; }
    return kandidaten.at(-1)[0];
  }

  return {
    schritt(dt) {
      uhr += dt;
      if (uhr < naechste || !darf()) return;
      naechste = uhr + ABSTAND[0] + Math.random() * (ABSTAND[1] - ABSTAND[0]);
      const b = waehle();
      if (!b) return;
      zuletzt.set(b.id, uhr + (b.ruhe ?? 1200));
      ereignisse.zeige(b.id);
    },
    // Für Prüfungen: eine bestimmte Begegnung sofort
    erzwinge: (id) => ereignisse.zeige(id),
    speichern: () => ({ uhr: Math.round(uhr), zuletzt: [...zuletzt] }),
    laden(d) {
      zuletzt.clear();
      for (const [id, t] of d?.zuletzt ?? []) zuletzt.set(id, t - (d.uhr ?? 0));
      uhr = 0;
    },
  };
}
