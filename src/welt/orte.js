// Feste Orte in der Welt, auf die sich Gelände, Natur und Ereignisse beziehen.
// Neue Orte hier eintragen, dann kennen alle Teile dieselben Koordinaten.
export const START = { x: 0, z: 0 };
export const ALTER_BAUM = { x: -18, z: 14 };
export const TEICH = { x: 34, z: -28, radius: 11, tiefe: 1.6 };
// Der Weiher am Nordrand von Erlenbach (zum Angeln); alle Gewässer in einer Liste
export const WEIHER = { x: 196, z: 72, radius: 9, tiefe: 1.6 };
// Weitere Seen draußen in der Welt. becken: Das Land ringsum senkt sich zu einer Mulde, damit der See auf
// derselben Höhe liegt wie die anderen (alle Gewässer teilen sich einen Wasserspiegel).
export const WALDSEE = { x: -112, z: 18, radius: 15, tiefe: 1.6, becken: true };
export const SCHILFSEE = { x: 74, z: -82, radius: 13, tiefe: 1.6, becken: true };
export const MOORSEE = { x: -48, z: -114, radius: 10, tiefe: 1.4, becken: true };
// Das Moor rund um den Moorsee: dunkler, nasser Torfboden mit Pfützen. Hier leben die Feen (src/welt/feen.js).
export const MOOR = { x: -52, z: -118, radius: 40 };
export const GEWAESSER = [TEICH, WEIHER, WALDSEE, SCHILFSEE, MOORSEE];
// Der Erlbach fließt vom Teich zum Schilfsee (Stützpunkte, wird geglättet)
export const BACH = [[38, -38], [44, -48], [52, -56], [58, -64], [66, -72], [72, -78]];
// Das Dorf Erlenbach am Ende der Straße: Dorfplatz in der Mitte, Häuser (Tür zum Platz), Brunnen,
// Martas Marktstand, Josts Steg am Weiher, und wo die Dörfler stehen
export const DORF = { x: 200, z: 40, radius: 26 };
export const HAEUSER = [
  { name: 'gerold', x: 184, z: 47, breite: 6.5, tiefe: 5.5, schornstein: true },
  { name: 'marta', x: 213, z: 31, breite: 6, tiefe: 5 },
  { name: 'jost', x: 186, z: 59, breite: 5, tiefe: 4.5 },
  { name: 'haus4', x: 215, z: 57, breite: 6, tiefe: 5, schornstein: true },
  { name: 'haus5', x: 224, z: 41, breite: 5.5, tiefe: 5 },
  { name: 'haus6', x: 198, z: 21, breite: 6, tiefe: 5.5 },
  { name: 'scheune', x: 179, z: 30, breite: 8, tiefe: 6, scheune: true },
];
export const BRUNNEN = { x: 204, z: 36 };
export const MARKTSTAND = { x: 196, z: 44 };
export const STEG = { x: 196, z: 60 }; // Anfang am Südufer des Weihers
export const DOERFLER = {
  gerold: { x: 188.5, z: 44.5 }, // vor seinem Haus
  marta: { x: 195.2, z: 45.6, reichweite: 3.8 }, // hinter dem Marktstand: man spricht über den Tresen
  jost: { x: 197.6, z: 58.4 }, // am Steg
};
// Graufurt: ein Steindorf im Norden, am Weg zu den Graufels-Bergen. Rauer als Erlenbach: Häuser aus
// Bruchstein mit Schieferdach, eine Schmiede, ein Gasthaus. Die Straße nach Norden führt von der Wiese hin.
export const GRAUFURT = { x: -15, z: -222, radius: 22 };
export const HAEUSER_GRAUFURT = [
  { name: 'schmiede', x: -2, z: -210, breite: 7, tiefe: 6, schornstein: true, schmiede: true },
  { name: 'gasthaus', x: -32, z: -214, breite: 9, tiefe: 7, schornstein: true },
  { name: 'gf3', x: -28, z: -236, breite: 6, tiefe: 5 },
  { name: 'gf4', x: 2, z: -236, breite: 6, tiefe: 5.5, schornstein: true },
  { name: 'gf5', x: -15, z: -244, breite: 5.5, tiefe: 5 },
];
export const ESSE = { x: -2, z: -203 }; // die offene Esse vor der Schmiede
export const STRASSE_NORD = [[-2, -12], [-6, -60], [-3, -110], [-10, -160], [-14, -200]];
export const DOERFLER_GRAUFURT = {
  bertram: { x: -1.5, z: -204.5, reichweite: 3 }, // Schmied, an seiner Esse
  ida: { x: -30, z: -209.5 }, // Wirtin, vor dem Gasthaus
};
// Hrodgard: das Dorf des Eberstamms, ein germanisches Dorf auf einer Waldlichtung im Westen. Langhäuser mit
// tief heruntergezogenen Reetdächern, eine große Halle des Häuptlings, ein Grubenhaus, ein Speicher auf Pfählen,
// ein Thing-Platz aus Steinen, alles hinter einer Palisade mit Tor nach Osten. Die Westerstraße führt vom
// Lager des Einsiedlers hin.
export const HRODGARD = { x: -215, z: 115, radius: 33, palisade: 31 };
export const PLATZ_HRODGARD = { x: -205, z: 115 }; // der Platz mit dem Herdfeuer
// laenge: entlang des Firsts; die Tür zeigt zum Platz
export const LANGHAEUSER = [
  { name: 'halle', x: -228, z: 115, laenge: 24, breite: 9 },
  { name: 'nordhaus', x: -206, z: 96, laenge: 17, breite: 7 },
  { name: 'suedhaus', x: -206, z: 134, laenge: 16, breite: 7 },
];
export const GRUBENHAUS = { x: -193, z: 102 };
export const SPEICHER = { x: -193, z: 131 };
export const THING = { x: -224, z: 138, radius: 3.4 };
export const WESTERSTRASSE = [[-60, 90], [-84, 98], [-112, 104], [-140, 110], [-165, 114], [-182, 115], [-196, 115]];
export const DOERFLER_HRODGARD = {
  hrodgar: { x: -222, z: 115, reichweite: 3.5 }, // vor seiner Halle
  sigrun: { x: -205, z: 102.5 }, // an ihrem Spinnrad vor dem Nordhaus
};

// Die Steppe im Osten, hinter Erlenbach: offenes, sanft gewelltes Grasland ohne Wald, das Gras trocken und golden.
// Hier zieht das Reitervolk mit seinen Jurten umher (ein wenig wie die Hunnen). Die Oststraße führt von Erlenbach hin.
export const STEPPE = { von: 262, bis: 305, zInnen: 115, zAussen: 165 }; // ab x = von beginnt sie, ab bis ist sie ganz da
export const JURTENLAGER = { x: 362, z: 8, radius: 28 };
// r: Radius der Jurte; die Tür zeigt nach Süden (wie bei den Steppenvölkern)
export const JURTEN = [
  { name: 'khan', x: 362, z: -6, r: 4.6 },
  { name: 'j2', x: 348, z: 2, r: 3.4 },
  { name: 'j3', x: 376, z: 1, r: 3.4 },
  { name: 'j4', x: 340, z: 16, r: 3.0 },
  { name: 'j5', x: 384, z: 15, r: 3.1 },
  { name: 'j6', x: 352, z: 26, r: 2.8 },
];
export const FEUER_LAGER = { x: 362, z: 12 };
export const ZIELSCHEIBE = { x: 392, z: 34, mitte: 1.25 }; // Bogenschießen: die Scheibe, geschossen wird vom Pflock 18 m westlich
export const PFLOCK = { x: 374, z: 34 };
export const PFERDELEINE = { x: 338, z: 32, laenge: 14 };
export const OSTSTRASSE = [[214, 48], [240, 44], [268, 36], [298, 28], [326, 20], [348, 14]];
export const DOERFLER_JURTEN = {
  uldin: { x: 362, z: 0.2, reichweite: 3.5 }, // vor seiner Jurte
  bleda: { x: 372.5, z: 34.5 }, // am Schießpflock
};

export const LAGER = { x: -58, z: 86, radius: 9 }; // Lichtung des Einsiedlers am Waldrand
export const BEERENSTRAEUCHER = [
  { x: 24, z: 44 }, { x: 28, z: 47 }, { x: -36, z: 38 }, { x: -40, z: 41 }, { x: 52, z: 6 },
];
// Trampelpfad von der Wiese zum Lager (Stützpunkte, wird geglättet)
export const PFAD = [
  [4, 6], [-4, 22], [-14, 36], [-26, 50], [-38, 64], [-50, 78], [-58, 86],
];
// Lichtung der Räuber an der Straße nach Osten
export const RAEUBERLAGER = { x: 112, z: -10, radius: 11 };
// Die Straße nach Osten: von der Wiese am Räuberlager vorbei nach Erlenbach
export const STRASSE = [
  [10, -3], [30, -4], [52, -2], [74, -4], [96, 0], [112, 2], [134, 2], [158, 8], [176, 18], [190, 30], [200, 40], [212, 46],
];
