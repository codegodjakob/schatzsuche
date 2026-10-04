// Alle Rezepte. Ein neues Rezept ist ein neuer Eintrag hier.
//
//   id         – eindeutig (meist wie das Ergebnis)
//   ergebnis   – id aus gegenstaende.js, oder bauwerk: 'lagerfeuer' für etwas, das in der Welt entsteht
//   menge      – wie viele entstehen (ohne Angabe 1)
//   zutaten    – { id: anzahl }, wird verbraucht
//   werkzeug   – ids, von denen man eines dabeihaben muss (wird nicht verbraucht)
//   ort        – 'hand' (überall) oder 'feuer' (an einem brennenden Feuer)
//   beruf      – welcher Beruf dabei lernt; stufe – Mindeststufe in diesem Beruf
//   erfahrung  – Erfahrungspunkte fürs Herstellen
//   merker     – nur, wer das schon gelernt hat (z. B. Feuermachen beim Einsiedler)
export const REZEPTE = [
  { id: 'schnur', ergebnis: 'schnur', zutaten: { fasern: 3 }, ort: 'hand', beruf: 'handwerk', stufe: 1, erfahrung: 4 },
  { id: 'speer', ergebnis: 'speer', zutaten: { ast: 1 }, werkzeug: ['feuerstein', 'steinmesser'], ort: 'hand', beruf: 'handwerk', stufe: 1, erfahrung: 6 },
  { id: 'steinmesser', ergebnis: 'steinmesser', zutaten: { stein: 1, ast: 1, schnur: 1 }, werkzeug: ['feuerstein'], ort: 'hand', beruf: 'handwerk', stufe: 1, erfahrung: 12 },
  { id: 'steinaxt', ergebnis: 'steinaxt', zutaten: { stein: 2, ast: 1, schnur: 2 }, werkzeug: ['feuerstein', 'steinmesser'], ort: 'hand', beruf: 'handwerk', stufe: 2, erfahrung: 18 },
  { id: 'schaufel', ergebnis: 'schaufel', zutaten: { holzscheit: 2, schnur: 1 }, werkzeug: ['steinmesser'], ort: 'hand', beruf: 'handwerk', stufe: 1, erfahrung: 10 },
  { id: 'spitzhacke', ergebnis: 'spitzhacke', zutaten: { stein: 2, holzscheit: 1, schnur: 2 }, werkzeug: ['steinmesser'], ort: 'hand', beruf: 'handwerk', stufe: 2, erfahrung: 16 },
  { id: 'lederwams', ergebnis: 'lederwams', zutaten: { lederfetzen: 4, schnur: 2 }, werkzeug: ['steinmesser'], ort: 'hand', beruf: 'handwerk', stufe: 2, erfahrung: 20 },
  { id: 'keule', ergebnis: 'keule', zutaten: { holzscheit: 2, schnur: 1 }, werkzeug: ['steinmesser'], ort: 'hand', beruf: 'handwerk', stufe: 2, erfahrung: 10 },
  { id: 'lagerfeuer', bauwerk: 'lagerfeuer', zutaten: { ast: 3 }, werkzeug: ['feuerstein'], ort: 'hand', beruf: 'handwerk', stufe: 1, erfahrung: 8, merker: 'kann-feuer' },
  { id: 'fackel', ergebnis: 'fackel', menge: 2, zutaten: { ast: 1, fasern: 2 }, ort: 'hand', beruf: 'handwerk', stufe: 1, erfahrung: 3 },
  // Bauen: Man stellt es nicht her, sondern setzt es in die Welt (Vorschau vor der Figur, Benutzen setzt es hin)
  { id: 'erdwall', bauwerk: 'erdwall', zutaten: { erde: 4 }, ort: 'hand', beruf: 'handwerk', stufe: 1, erfahrung: 5 },
  { id: 'zaun', bauwerk: 'zaun', zutaten: { ast: 6, schnur: 1 }, ort: 'hand', beruf: 'handwerk', stufe: 1, erfahrung: 6 },
  { id: 'standfackel', bauwerk: 'standfackel', zutaten: { fackel: 1, ast: 1 }, ort: 'hand', beruf: 'handwerk', stufe: 1, erfahrung: 2 },
  { id: 'palisade', bauwerk: 'palisade', zutaten: { holzscheit: 4, schnur: 1 }, ort: 'hand', beruf: 'handwerk', stufe: 2, erfahrung: 10 },
  { id: 'steinmauer', bauwerk: 'steinmauer', zutaten: { stein: 6, lehm: 2 }, ort: 'hand', beruf: 'handwerk', stufe: 2, erfahrung: 12 },
  { id: 'unterstand', bauwerk: 'unterstand', zutaten: { holzscheit: 4, ast: 8, schnur: 2 }, ort: 'hand', beruf: 'handwerk', stufe: 2, erfahrung: 20 },
  { id: 'gebratene_pilze', ergebnis: 'gebratene_pilze', zutaten: { steinpilz: 2 }, ort: 'feuer', beruf: 'kochen', stufe: 1, erfahrung: 8 },
  { id: 'fisch_rotauge', ergebnis: 'gebratener_fisch', zutaten: { rotauge: 1 }, ort: 'feuer', beruf: 'kochen', stufe: 1, erfahrung: 5 },
  { id: 'fisch_barsch', ergebnis: 'gebratener_fisch', zutaten: { barsch: 1 }, ort: 'feuer', beruf: 'kochen', stufe: 1, erfahrung: 5 },
  { id: 'gebratene_forelle', ergebnis: 'gebratene_forelle', zutaten: { forelle: 1, kamille: 1 }, ort: 'feuer', beruf: 'kochen', stufe: 2, erfahrung: 12 },
  { id: 'kamillentee', ergebnis: 'kamillentee', zutaten: { kamille: 3 }, ort: 'feuer', beruf: 'kochen', stufe: 1, erfahrung: 6 },
  { id: 'heilsalbe', ergebnis: 'heilsalbe', zutaten: { johanniskraut: 3 }, werkzeug: ['steinmesser'], ort: 'hand', beruf: 'kraeuterkunde', stufe: 2, erfahrung: 14 },
];

// Was beim Herstellen nicht ins Inventar kommt, sondern in der Welt entsteht
export const BAUWERKE = {
  lagerfeuer: { name: 'Lagerfeuer', bild: '🏕️', beschreibung: 'Wärmt, spendet Licht, und man kann daran kochen. Brennt vier Stunden.' },
  erdwall: { name: 'Erdwall', bild: '⛰️', setzen: true, beschreibung: 'Zwei Meter aufgeschüttete Erde. Auf einen Wall geschüttet, wird er höher (bis mannshoch).' },
  zaun: { name: 'Zaun', bild: '🚧', setzen: true, beschreibung: 'Zwei Meter Flechtzaun aus Ästen. Hält Tiere fern.' },
  standfackel: { name: 'Standfackel', bild: '🕯️', setzen: true, beschreibung: 'Eine Fackel auf einem Stab, in den Boden gesteckt. Brennt nachts von selbst, drei Nächte lang.' },
  palisade: { name: 'Palisade', bild: '🪵', setzen: true, beschreibung: 'Zwei Meter angespitzte Pfähle, mannshoch. Da kommt niemand durch.' },
  steinmauer: { name: 'Steinmauer', bild: '🧱', setzen: true, beschreibung: 'Zwei Meter Trockenmauer, mit Lehm gefügt. Hält ewig.' },
  unterstand: { name: 'Unterstand', bild: '⛺', setzen: true, beschreibung: 'Ein schräges Dach aus Holz und Ästen. Darunter schläft man nachts auch ohne Feuer.' },
};

export const ORTE = {
  hand: 'überall',
  feuer: 'an einem Feuer',
};
