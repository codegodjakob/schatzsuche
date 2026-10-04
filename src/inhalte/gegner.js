// Alle Gegner: wie stark sie sind, wie sie kämpfen, was sie fallen lassen. Ein neuer Gegner ist
// ein neuer Eintrag hier (dazu eine Figur aus werkzeuge/figuren).
//
//   name, figur     – Anzeigename / Datei in assets/figuren
//   leben           – Lebenspunkte
//   schaden         – [von, bis] je Treffer
//   reichweite      – so nah (Meter) muss er heran, um zu treffen
//   tempo           – Meter je Sekunde beim Gehen und Rennen
//   angriff         – Bewegung, wie schnell sie läuft, wann (in Sekunden der Bewegung) sie trifft,
//                     Pause bis zum nächsten Angriff
//   schwer          – (Bosse) ein angekündigter schwerer Angriff, alle paar Angriffe
//   sieht, folgt    – ab welcher Entfernung er angreift / wie weit er sich vom Lager weglocken lässt
//   waffe           – was er in der Hand trägt (siehe src/welt/waffen.js)
//   erfahrung       – Erfahrungspunkte für den Sieg
//   beute           – Münzen [von, bis] und Gegenstände [id, Wahrscheinlichkeit, Anzahl]
//   einmalig        – Gegenstände, die es nur beim ersten Sieg gibt (z. B. ein Kartenteil)
//   wiederkehr      – nach so vielen Spieltagen steht er wieder da
export const GEGNER = {
  raeuber: {
    name: 'Räuber', figur: 'raeuber', leben: 40, schaden: [6, 10], reichweite: 1.7,
    tempo: { gehen: 1.3, rennen: 3.3 },
    angriff: { bewegung: 'hieb', tempo: 1.0, trifft: 0.6, pause: 1.9 },
    sieht: 10, folgt: 38, waffe: 'keule',
    erfahrung: 35,
    beute: { muenzen: [3, 9], gegenstaende: [['lederfetzen', 0.55, 1], ['brot', 0.35, 1], ['keule', 0.1, 1]] },
    wiederkehr: 1,
  },
  // Wegelagerer: tauchen unterwegs auf (Begegnungen), verfolgen weiter, kommen nicht wieder
  wegelagerer: {
    name: 'Wegelagerer', figur: 'raeuber', leben: 36, schaden: [5, 9], reichweite: 1.7,
    tempo: { gehen: 1.4, rennen: 3.4 },
    angriff: { bewegung: 'hieb', tempo: 1.0, trifft: 0.6, pause: 2.0 },
    sieht: 30, folgt: 60, waffe: 'keule',
    erfahrung: 30,
    beute: { muenzen: [2, 8], gegenstaende: [['lederfetzen', 0.5, 1], ['brot', 0.4, 1], ['schnur', 0.3, 1]] },
    wiederkehr: 0,
  },
  hauptmann: {
    name: 'Räuberhauptmann', figur: 'hauptmann', leben: 180, schaden: [12, 17], reichweite: 2.0, boss: true,
    tempo: { gehen: 1.5, rennen: 3.0 },
    angriff: { bewegung: 'hieb', tempo: 0.85, trifft: 0.6, pause: 2.2 },
    schwer: { bewegung: 'tritt', tempo: 0.8, trifft: 0.5, schaden: [20, 26], alle: 3, warnung: 'holt zum Tritt aus' },
    sieht: 9, folgt: 30, waffe: 'eisenkeule',
    erfahrung: 150,
    beute: { muenzen: [30, 40], gegenstaende: [['eisenkeule', 1, 1], ['brot', 1, 2]] },
    einmalig: { kartenteil_1: 1 },
    wiederkehr: 3,
  },
};

// Wer im Räuberlager wohnt (Orte relativ zur Mitte des Lagers, siehe RAEUBERLAGER in src/welt/orte.js).
// Zwei lauern als Wegelagerer an der Straße, zwei sitzen am Feuer, der Hauptmann hinten bei seinem Zelt.
export const BESATZUNG = [
  { art: 'raeuber', x: -16, z: 8 }, { art: 'raeuber', x: -13, z: 13 },
  { art: 'raeuber', x: -4, z: 4 }, { art: 'raeuber', x: 5, z: 5 },
  { art: 'hauptmann', x: 1, z: -7 },
];

// Ohne Waffe kämpft man mit den Fäusten
export const FAUST = { schaden: 3, reichweite: 1.3, tempo: 1.3 };
