// Was man in der Welt mit „Benutzen“ nehmen kann, und was es bringt.
//
//   aktion       – was der Knopf anzeigt
//   gibt         – { id: anzahl } ins Inventar
//   selten       – { id: wahrscheinlichkeit } zusätzlich, mit etwas Glück
//   mitMesser    – so viel mehr, wenn man ein Messer dabeihat
//   beruf        – welcher Beruf dabei lernt; erfahrung – Erfahrungspunkte
//   nachwachsen  – nach wie vielen Spieltagen es wieder da ist
//   mitWerkzeug  – mit diesem Werkzeug geht stattdessen etwas anderes
export const SAMMELSTELLEN = {
  ast: { aktion: 'Ast aufheben', gibt: { ast: 1 }, beruf: 'sammeln', erfahrung: 3, nachwachsen: 1 },
  stein: { aktion: 'Stein aufheben', gibt: { stein: 1 }, selten: { feuerstein: 0.15 }, beruf: 'sammeln', erfahrung: 3, nachwachsen: 1.5 },
  flachs: { aktion: 'Flachs pflücken', gibt: { fasern: 2 }, mitMesser: 1, beruf: 'sammeln', erfahrung: 2, nachwachsen: 1 },
  johanniskraut: { aktion: 'Johanniskraut pflücken', gibt: { johanniskraut: 1 }, mitMesser: 1, beruf: 'kraeuterkunde', erfahrung: 4, nachwachsen: 1.5 },
  kamille: { aktion: 'Kamille pflücken', gibt: { kamille: 1 }, mitMesser: 1, beruf: 'kraeuterkunde', erfahrung: 3, nachwachsen: 1 },
  pilz: { aktion: 'Steinpilz pflücken', gibt: { steinpilz: 1 }, beruf: 'sammeln', erfahrung: 4, nachwachsen: 2 },
  beeren: { aktion: 'Brombeeren pflücken', gibt: { brombeeren: 4 }, beruf: 'sammeln', erfahrung: 3, nachwachsen: 1 },
  // Mit einer Axt fällt man den Baum stattdessen (siehe src/welt/faellen.js)
  baum: { aktion: 'Ast abbrechen', gibt: { ast: 1 }, beruf: 'sammeln', erfahrung: 2, nachwachsen: 1 },
};
