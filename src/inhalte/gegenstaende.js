// Alle Gegenstände des Spiels. Neue Dinge sind ein neuer Eintrag hier, sonst nichts.
//
// Schlüssel: kurze id in Kleinbuchstaben (wird im Spielstand gespeichert, also nicht umbenennen)
//   name          – wie es im Spiel heißt
//   bild          – ein Zeichen fürs Inventar (bis es gezeichnete Bilder gibt)
//   art           – waffe | ruestung | werkzeug | material | nahrung | kraut | wertvoll | aufgabe
//   wert          – Preis in Kupfermünzen (Händler zahlen beim Ankauf etwa die Hälfte)
//   beschreibung  – ein, zwei Sätze, die im Inventar stehen
//   stapel        – so viele passen auf einen Platz (ohne Angabe 99)
//   hoechstens    – nur für sehr Schweres: so viele kann man höchstens tragen
//   werkzeug      – { art: 'messer' | 'axt' | …, stufe } – womit man abbauen kann
//   waffe         – { schaden, reichweite (Meter), tempo (wie schnell der Hieb ist, 1 = normal) }
//   schutz        – (Rüstung) Anteil des Schadens, den sie abhält; getragen wird die beste
//   kleidung      – { teil: 'oben' | 'unten' | 'mantel' | 'fuesse', warm } – getragen wird je Teil das Wärmste
//   essen         – { saettigung, wasser, leben, waerme } – was Essen bewirkt
//   gebraucht     – true: wird beim Herstellen nicht verbraucht, wenn es als Werkzeug dient
//   fisch         – true: zählt für Aufträge als Fisch
export const GEGENSTAENDE = {
  // --- Materialien ---
  ast: { name: 'Ast', bild: '🥢', art: 'material', wert: 1, beschreibung: 'Trockenes Holz. Brennt gut und lässt sich schnitzen.' },
  stein: { name: 'Stein', bild: '🪨', art: 'material', wert: 1, beschreibung: 'Ein handlicher Stein. Gut für Werkzeug.' },
  feuerstein: { name: 'Feuerstein', bild: '✨', art: 'material', wert: 4, beschreibung: 'Scharfkantig. Schlägt Funken und schneidet Holz.' },
  fasern: { name: 'Flachsfasern', bild: '🌾', art: 'material', wert: 1, beschreibung: 'Zähe Fasern aus den blau blühenden Flachspflanzen.' },
  schnur: { name: 'Schnur', bild: '🧵', art: 'material', wert: 3, beschreibung: 'Aus Fasern gedreht. Hält Werkzeug zusammen.' },
  holzscheit: { name: 'Holzscheit', bild: '🪵', art: 'material', wert: 2, beschreibung: 'Frisch gehacktes Holz.' },
  baumstamm: { name: 'Baumstamm', bild: '🌲', art: 'material', wert: 12, hoechstens: 3, beschreibung: 'Schwer. Mehr als drei trägt niemand.' },
  erde: { name: 'Erde', bild: '🟤', art: 'material', wert: 0, stapel: 20, beschreibung: 'Ausgegraben mit der Schaufel. Zu einem Wall aufgeschüttet hält sie Wind und Feinde ab.' },
  lehm: { name: 'Lehm', bild: '🧱', art: 'material', wert: 2, stapel: 20, beschreibung: 'Zäher, feuchter Boden vom Ufer. Hält Steine in einer Mauer zusammen.' },
  fell: { name: 'Fuchsfell', bild: '🦊', art: 'material', wert: 8, beschreibung: 'Weich und dicht. Daraus näht man warme Sachen.' },
  lederfetzen: { name: 'Lederfetzen', bild: '🟫', art: 'material', wert: 3, beschreibung: 'Gegerbtes Leder, abgerissen und fleckig. Taugt noch für Riemen und ein Wams.' },

  // --- Kräuter ---
  johanniskraut: { name: 'Johanniskraut', bild: '🌻', art: 'kraut', wert: 3, beschreibung: 'Gelbe Blüten. Lindert Schmerzen und heilt Wunden.' },
  kamille: { name: 'Kamille', bild: '🌼', art: 'kraut', wert: 2, beschreibung: 'Weiße Blüten mit gelbem Herz. Duftet nach Sommer.' },

  // --- Nahrung ---
  brombeeren: { name: 'Brombeeren', bild: '🫐', art: 'nahrung', wert: 1, essen: { saettigung: 8, wasser: 2 }, beschreibung: 'Süß und saftig.' },
  steinpilz: { name: 'Steinpilz', bild: '🍄', art: 'nahrung', wert: 3, essen: { saettigung: 6 }, beschreibung: 'Roh essbar, gebraten viel besser.' },
  gebratene_pilze: { name: 'Gebratene Pilze', bild: '🍳', art: 'nahrung', wert: 8, essen: { saettigung: 28, waerme: 5 }, beschreibung: 'Würzig und warm.' },
  brot: { name: 'Brot', bild: '🍞', art: 'nahrung', wert: 4, essen: { saettigung: 25 }, beschreibung: 'Hart und trocken, aber es macht satt. Aus dem Vorrat der Räuber.' },
  rotauge: { name: 'Rotauge', bild: '🐟', art: 'nahrung', wert: 3, fisch: true, essen: { saettigung: 6 }, beschreibung: 'Ein kleiner Weißfisch mit roten Augen. Gebraten schmeckt er besser.' },
  barsch: { name: 'Barsch', bild: '🐟', art: 'nahrung', wert: 6, fisch: true, essen: { saettigung: 8 }, beschreibung: 'Gestreift und stachelig. Jost zahlt gut dafür.' },
  forelle: { name: 'Forelle', bild: '🐟', art: 'nahrung', wert: 10, fisch: true, essen: { saettigung: 10 }, beschreibung: 'Gepunktet und flink. Gebraten ein Festessen.' },
  hecht: { name: 'Hecht', bild: '🐟', art: 'nahrung', wert: 22, fisch: true, essen: { saettigung: 14 }, beschreibung: 'Ein Räuber unter den Fischen, lang wie ein Arm. Selten und viel wert.' },
  gebratener_fisch: { name: 'Gebratener Fisch', bild: '🍢', art: 'nahrung', wert: 9, essen: { saettigung: 30, waerme: 5 }, beschreibung: 'Knusprig über dem Feuer gebraten.' },
  gebratene_forelle: { name: 'Gebratene Forelle', bild: '🍽️', art: 'nahrung', wert: 18, essen: { saettigung: 45, waerme: 8, leben: 10 }, beschreibung: 'Zart und duftend. Macht lange satt und stärkt.' },
  kamillentee: { name: 'Kamillentee', bild: '🍵', art: 'nahrung', wert: 5, essen: { wasser: 30, waerme: 15, leben: 5 }, beschreibung: 'Wärmt von innen.' },

  fleisch: { name: 'Rohes Fleisch', bild: '🥩', art: 'nahrung', wert: 3, essen: { saettigung: 6 }, beschreibung: 'Roh kaum zu genießen. Am Feuer gebraten macht es lange satt.' },
  gebratenes_fleisch: { name: 'Gebratenes Fleisch', bild: '🍖', art: 'nahrung', wert: 10, essen: { saettigung: 40, waerme: 6 }, beschreibung: 'Saftig, rauchig, kräftig.' },

  // --- Werkzeug und Waffen ---
  speer: { name: 'Einfacher Speer', bild: '🔱', art: 'waffe', wert: 6, stapel: 1, waffe: { schaden: 8, reichweite: 2.3, tempo: 1.35 }, beschreibung: 'Ein angespitzter Ast. Reicht weit, aber trifft nicht hart.' },
  steinmesser: { name: 'Steinmesser', bild: '🔪', art: 'werkzeug', wert: 10, stapel: 1, werkzeug: { art: 'messer', stufe: 1 }, waffe: { schaden: 5, reichweite: 1.5, tempo: 1.8 }, beschreibung: 'Schneidet Fasern und Kräuter sauber ab: mehr Ertrag. Im Kampf schnell, aber kurz.' },
  steinaxt: { name: 'Steinaxt', bild: '🪓', art: 'werkzeug', wert: 16, stapel: 1, werkzeug: { art: 'axt', stufe: 1 }, waffe: { schaden: 7, reichweite: 1.8, tempo: 1.4 }, beschreibung: 'Damit lässt sich Holz von Bäumen hacken.' },
  schaufel: { name: 'Holzschaufel', bild: '🪏', art: 'werkzeug', wert: 9, stapel: 1, werkzeug: { art: 'schaufel', stufe: 1 }, beschreibung: 'Damit gräbst du überall Erde aus (Benutzen auf freiem Boden). Am Ufer findest du Lehm.' },
  spitzhacke: { name: 'Spitzhacke', bild: '⛏️', art: 'werkzeug', wert: 18, stapel: 1, werkzeug: { art: 'hacke', stufe: 1 }, waffe: { schaden: 6, reichweite: 1.7, tempo: 1.2 }, beschreibung: 'Bricht Steine aus großen Felsen, manchmal auch Feuerstein.' },
  bogen: { name: 'Jagdbogen', bild: '🏹', art: 'waffe', wert: 20, stapel: 1, fernkampf: { schaden: 12, weite: 45 }, beschreibung: 'Aus Eschenholz, mit Flachsschnur bespannt. Taste R (am Handy „Schießen“) schießt einen Pfeil dorthin, wohin du schaust.' },
  pfeil: { name: 'Pfeil', bild: '🪶', art: 'waffe', wert: 1, stapel: 40, beschreibung: 'Mit Feuersteinspitze. Was trifft, steckt; was danebengeht, ist meist verloren.' },
  eisenaxt: { name: 'Eisenaxt', bild: '🪓', art: 'werkzeug', wert: 45, stapel: 1, werkzeug: { art: 'axt', stufe: 2 }, waffe: { schaden: 11, reichweite: 1.9, tempo: 1.35 }, beschreibung: 'Vom Schmied in Graufurt. Fällt einen Baum in der Hälfte der Hiebe.' },
  eisenmesser: { name: 'Eisenmesser', bild: '🔪', art: 'werkzeug', wert: 30, stapel: 1, werkzeug: { art: 'messer', stufe: 2 }, waffe: { schaden: 8, reichweite: 1.5, tempo: 1.9 }, beschreibung: 'Scharf und handlich. Schneidet Kräuter, Fasern und Felle sauber.' },
  kurzschwert: { name: 'Kurzschwert', bild: '🗡️', art: 'waffe', wert: 70, stapel: 1, waffe: { schaden: 16, reichweite: 2.0, tempo: 1.4 }, beschreibung: 'Bertrams Meisterstück: schnell, ausgewogen, tödlich.' },
  keule: { name: 'Holzkeule', bild: '🏏', art: 'waffe', wert: 8, stapel: 1, waffe: { schaden: 10, reichweite: 1.8, tempo: 1.3 }, beschreibung: 'Schwer und grob. Wer trifft, hat recht.' },
  eisenkeule: { name: 'Eisenbeschlagene Keule', bild: '🔨', art: 'waffe', wert: 40, stapel: 1, waffe: { schaden: 15, reichweite: 1.9, tempo: 1.15 }, beschreibung: 'Die Keule des Räuberhauptmanns, mit Eisen beschlagen. Langsam, aber verheerend.' },

  // --- Rüstung (getragen wird von selbst die beste, die man dabeihat) ---
  lederwams: { name: 'Lederwams', bild: '🦺', art: 'ruestung', wert: 30, stapel: 1, schutz: 0.2, beschreibung: 'Aus Lederfetzen genäht. Hält ein Fünftel jedes Schlags ab.' },
  angelrute: { name: 'Angelrute', bild: '🎣', art: 'werkzeug', wert: 10, stapel: 1, werkzeug: { art: 'angel', stufe: 1 }, beschreibung: 'Haselstock, Schnur und Haken. Damit fängst du am Ufer Fische (Benutzen am Wasser).' },
  fackel: { name: 'Fackel', bild: '🔥', art: 'werkzeug', wert: 4, beschreibung: 'Nachts trägst du sie von selbst in der linken Hand, sie leuchtet weit. Taste T: wegstecken oder anzünden. Jede brennt etwa drei Spielstunden.' },

  // --- Kleidung (hält warm: Anteil der Kälte, der nicht durchkommt; man trägt von selbst das Wärmste je Teil) ---
  leinenhemd: { name: 'Leinenhemd', bild: '👕', art: 'kleidung', wert: 9, stapel: 1, kleidung: { teil: 'oben', warm: 0.15 }, beschreibung: 'Grob gewebt, aber besser als nackte Haut. Hält etwas Kälte ab.' },
  fellmantel: { name: 'Fellmantel', bild: '🧥', art: 'kleidung', wert: 40, stapel: 1, kleidung: { teil: 'mantel', warm: 0.45 }, beschreibung: 'Aus Fuchsfellen genäht. Das Wärmste, was man tragen kann.' },
  wollmantel: { name: 'Wollmantel', bild: '🧥', art: 'kleidung', wert: 28, stapel: 1, kleidung: { teil: 'mantel', warm: 0.35 }, beschreibung: 'Schwer und warm. Mit ihm übersteht man eine kalte Nacht auch fern vom Feuer.' },
  lederstiefel: { name: 'Lederstiefel', bild: '🥾', art: 'kleidung', wert: 16, stapel: 1, kleidung: { teil: 'fuesse', warm: 0.1 }, beschreibung: 'Feste Sohlen. Keine kalten Füße mehr.' },
  hose: { name: 'Leinenhose', bild: '👖', art: 'kleidung', wert: 8, stapel: 1, kleidung: { teil: 'unten', warm: 0.1 }, beschreibung: 'Bis zu den Knöcheln. Wer friert schon gern an den Beinen?' },

  // --- Heilmittel ---
  heilsalbe: { name: 'Heilsalbe', bild: '🧴', art: 'nahrung', wert: 12, essen: { leben: 35 }, beschreibung: 'Aus Johanniskraut. Heilt Wunden.' },

  // --- Wertvolles und Aufgaben ---
  eberzahn: { name: 'Eberzahn-Amulett', bild: '🦷', art: 'wertvoll', wert: 30, stapel: 1, beschreibung: 'Ein gebogener Eberhauer an einer Lederschnur. Wer ihn trägt, ist ein Freund des Eberstamms.' },
  feentau: { name: 'Feentau', bild: '💧', art: 'nahrung', wert: 15, essen: { wasser: 20, leben: 40 }, beschreibung: 'Ein Fläschchen, das im Dunkeln schwach grün schimmert. Ein Geschenk der Moorfeen; es heilt Wunden.' },
  ring: { name: 'Alter Silberring', bild: '💍', art: 'wertvoll', wert: 40, stapel: 1, beschreibung: 'Fein graviert, mit einem Zeichen, das wie auf deinem Pergament aussieht. Ein Händler zahlt gut dafür.' },
  brief: { name: 'Versiegelter Brief', bild: '✉️', art: 'aufgabe', wert: 0, stapel: 1, beschreibung: 'Von Brida, der Reisenden, für Gerold in Erlenbach. Das Siegel zeigt eine Krone.' },
  pergament: { name: 'Zerrissenes Pergament', bild: '📜', art: 'aufgabe', wert: 0, stapel: 1, beschreibung: 'Seltsame Zeichen und Linien. Es steckte in deinem Lendenschurz.' },
  kartenteil_1: { name: 'Kartenteil (1 von 7)', bild: '🗺️', art: 'aufgabe', wert: 0, stapel: 1, beschreibung: 'Ein Stück Pergament mit denselben Zeichen wie deins. Der Räuberhauptmann trug es bei sich.' },
};

// Reihenfolge und Namen der Arten, wie sie im Inventar erscheinen
export const ARTEN = {
  waffe: 'Waffen',
  ruestung: 'Rüstung',
  kleidung: 'Kleidung',
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
