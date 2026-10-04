// Feste Orte in der Welt, auf die sich Gelände, Natur und Ereignisse beziehen.
// Neue Orte hier eintragen, dann kennen alle Teile dieselben Koordinaten.
export const START = { x: 0, z: 0 };
export const ALTER_BAUM = { x: -18, z: 14 };
export const TEICH = { x: 34, z: -28, radius: 11, tiefe: 1.6 };
// Der Weiher am Nordrand von Erlenbach (zum Angeln); alle Gewässer in einer Liste
export const WEIHER = { x: 196, z: 72, radius: 9, tiefe: 1.6 };
export const GEWAESSER = [TEICH, WEIHER];
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
