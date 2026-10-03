// Alle Gegenstände des Spiels. Neue Dinge sind ein neuer Eintrag hier, sonst nichts.
//
// Schlüssel: kurze id in Kleinbuchstaben (wird im Spielstand gespeichert, also nicht umbenennen)
//   name          – wie es im Spiel heißt
//   bild          – ein Zeichen fürs Inventar (bis es gezeichnete Bilder gibt)
//   art           – waffe | werkzeug | material | nahrung | kraut | wertvoll | aufgabe
//   wert          – Preis in Kupfermünzen (Händler zahlen beim Ankauf etwa die Hälfte)
//   beschreibung  – ein, zwei Sätze, die im Inventar stehen
//   stapel        – so viele passen auf einen Platz (ohne Angabe 99)
//   hoechstens    – nur für sehr Schweres: so viele kann man höchstens tragen
//   werkzeug      – { art: 'messer' | 'axt' | …, stufe } – womit man abbauen kann
//   waffe         – { schaden } – für den Kampf (kommt in Etappe M1 Stufe 2)
//   essen         – { saettigung, wasser, leben, waerme } – was Essen bewirkt
//   gebraucht     – true: wird beim Herstellen nicht verbraucht, wenn es als Werkzeug dient
export const GEGENSTAENDE = {
  // --- Materialien ---
  ast: { name: 'Ast', bild: '🥢', art: 'material', wert: 1, beschreibung: 'Trockenes Holz. Brennt gut und lässt sich schnitzen.' },
  stein: { name: 'Stein', bild: '🪨', art: 'material', wert: 1, beschreibung: 'Ein handlicher Stein. Gut für Werkzeug.' },
  feuerstein: { name: 'Feuerstein', bild: '✨', art: 'material', wert: 4, beschreibung: 'Scharfkantig. Schlägt Funken und schneidet Holz.' },
  fasern: { name: 'Flachsfasern', bild: '🌾', art: 'material', wert: 1, beschreibung: 'Zähe Fasern aus den blau blühenden Flachspflanzen.' },
  schnur: { name: 'Schnur', bild: '🧵', art: 'material', wert: 3, beschreibung: 'Aus Fasern gedreht. Hält Werkzeug zusammen.' },
  holzscheit: { name: 'Holzscheit', bild: '🪵', art: 'material', wert: 2, beschreibung: 'Frisch gehacktes Holz.' },
  baumstamm: { name: 'Baumstamm', bild: '🌲', art: 'material', wert: 12, hoechstens: 3, beschreibung: 'Schwer. Mehr als drei trägt niemand.' },

  // --- Kräuter ---
  johanniskraut: { name: 'Johanniskraut', bild: '🌻', art: 'kraut', wert: 3, beschreibung: 'Gelbe Blüten. Lindert Schmerzen und heilt Wunden.' },
  kamille: { name: 'Kamille', bild: '🌼', art: 'kraut', wert: 2, beschreibung: 'Weiße Blüten mit gelbem Herz. Duftet nach Sommer.' },

  // --- Nahrung ---
  brombeeren: { name: 'Brombeeren', bild: '🫐', art: 'nahrung', wert: 1, essen: { saettigung: 8, wasser: 2 }, beschreibung: 'Süß und saftig.' },
  steinpilz: { name: 'Steinpilz', bild: '🍄', art: 'nahrung', wert: 3, essen: { saettigung: 6 }, beschreibung: 'Roh essbar, gebraten viel besser.' },
  gebratene_pilze: { name: 'Gebratene Pilze', bild: '🍳', art: 'nahrung', wert: 8, essen: { saettigung: 28, waerme: 5 }, beschreibung: 'Würzig und warm.' },
  kamillentee: { name: 'Kamillentee', bild: '🍵', art: 'nahrung', wert: 5, essen: { wasser: 30, waerme: 15, leben: 5 }, beschreibung: 'Wärmt von innen.' },

  // --- Werkzeug und Waffen ---
  speer: { name: 'Einfacher Speer', bild: '🔱', art: 'waffe', wert: 6, stapel: 1, waffe: { schaden: 8 }, beschreibung: 'Ein angespitzter Ast. Besser als nichts.' },
  steinmesser: { name: 'Steinmesser', bild: '🔪', art: 'werkzeug', wert: 10, stapel: 1, werkzeug: { art: 'messer', stufe: 1 }, waffe: { schaden: 5 }, beschreibung: 'Schneidet Fasern und Kräuter sauber ab: mehr Ertrag.' },
  steinaxt: { name: 'Steinaxt', bild: '🪓', art: 'werkzeug', wert: 16, stapel: 1, werkzeug: { art: 'axt', stufe: 1 }, waffe: { schaden: 7 }, beschreibung: 'Damit lässt sich Holz von Bäumen hacken.' },
  keule: { name: 'Holzkeule', bild: '🏏', art: 'waffe', wert: 8, stapel: 1, waffe: { schaden: 10 }, beschreibung: 'Schwer und grob. Wer trifft, hat recht.' },
  fackel: { name: 'Fackel', bild: '🔥', art: 'werkzeug', wert: 4, beschreibung: 'Brennt nachts von selbst, solange du sie dabeihast, jede etwa zwei Spielstunden lang.' },

  // --- Heilmittel ---
  heilsalbe: { name: 'Heilsalbe', bild: '🧴', art: 'nahrung', wert: 12, essen: { leben: 35 }, beschreibung: 'Aus Johanniskraut. Heilt Wunden.' },

  // --- Wertvolles und Aufgaben ---
  pergament: { name: 'Zerrissenes Pergament', bild: '📜', art: 'aufgabe', wert: 0, stapel: 1, beschreibung: 'Seltsame Zeichen und Linien. Es steckte in deinem Lendenschurz.' },
};

// Reihenfolge und Namen der Arten, wie sie im Inventar erscheinen
export const ARTEN = {
  waffe: 'Waffen',
  werkzeug: 'Werkzeug',
  nahrung: 'Essen und Heilmittel',
  kraut: 'Kräuter',
  material: 'Material',
  wertvoll: 'Wertvolles',
  aufgabe: 'Für Aufgaben',
};

export function gegenstand(id) {
  const g = GEGENSTAENDE[id];
  if (!g) throw new Error(`Unbekannter Gegenstand: ${id}`);
  return g;
}

// „2 × Ast“, „Ast“
export function benenne(id, n = 1) {
  return n === 1 ? gegenstand(id).name : `${n} × ${gegenstand(id).name}`;
}
