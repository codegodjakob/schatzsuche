// Feste Orte in der Welt, auf die sich Gelände, Natur und Ereignisse beziehen.
// Neue Orte hier eintragen, dann kennen alle Teile dieselben Koordinaten.
export const START = { x: 0, z: 0 };
export const ALTER_BAUM = { x: -18, z: 14 };
export const TEICH = { x: 34, z: -28, radius: 11, tiefe: 1.6 };
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
// Die Straße nach Osten: von der Wiese am Räuberlager vorbei Richtung Erlenbach
export const STRASSE = [
  [10, -3], [30, -4], [52, -2], [74, -4], [96, 0], [112, 2], [134, 2], [160, 6],
];
