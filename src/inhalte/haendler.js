// Händler: was sie verkaufen und wofür sie besonders gut zahlen. Preise ergeben sich aus dem Wert
// eines Gegenstands (src/inhalte/gegenstaende.js), der Ausstrahlung des Spielers und dem Angebot:
// Wer viel vom Gleichen an einem Tag verkauft, bekommt für jedes weitere Stück etwas weniger.
//
//   name, titel   – wie er heißt und was er ist
//   waren         – ids, die er verkauft (unbegrenzt vorrätig)
//   kauftGut      – Bedingung für Dinge, für die er mehr zahlt (z. B. der Fischer für Fisch)
export const HAENDLER = {
  marta: {
    name: 'Marta', titel: 'Händlerin',
    waren: ['brot', 'angelrute', 'schnur', 'fackel', 'heilsalbe', 'kamillentee', 'lederwams', 'steinmesser'],
  },
  jost: {
    name: 'Jost', titel: 'Fischer',
    waren: ['angelrute', 'gebratener_fisch'],
    kauftGut: (g) => !!g.fisch,
  },
};

// Kaufen kostet mehr, als Verkaufen bringt; wer gut reden kann (Ausstrahlung), zahlt weniger.
export const AUFSCHLAG = 1.4; // Kaufpreis = Wert × Aufschlag × Preisfaktor
export const ANKAUF = 0.5; // Verkaufspreis = Wert × Ankauf ÷ Preisfaktor
export const ANKAUF_GUT = 0.8; // beim Fachhändler (Fisch beim Fischer)
export const SAETTIGUNG = 0.07; // je schon verkauftem Stück des Tages 7 % weniger, höchstens die Hälfte
