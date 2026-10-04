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
  { id: 'lederwams', ergebnis: 'lederwams', zutaten: { lederfetzen: 4, schnur: 2 }, werkzeug: ['steinmesser'], ort: 'hand', beruf: 'handwerk', stufe: 2, erfahrung: 20 },
  { id: 'keule', ergebnis: 'keule', zutaten: { holzscheit: 2, schnur: 1 }, werkzeug: ['steinmesser'], ort: 'hand', beruf: 'handwerk', stufe: 2, erfahrung: 10 },
  { id: 'lagerfeuer', bauwerk: 'lagerfeuer', zutaten: { ast: 3 }, werkzeug: ['feuerstein'], ort: 'hand', beruf: 'handwerk', stufe: 1, erfahrung: 8, merker: 'kann-feuer' },
  { id: 'fackel', ergebnis: 'fackel', zutaten: { ast: 1, fasern: 2 }, ort: 'feuer', beruf: 'handwerk', stufe: 1, erfahrung: 3 },
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
};

export const ORTE = {
  hand: 'überall',
  feuer: 'an einem Feuer',
};
