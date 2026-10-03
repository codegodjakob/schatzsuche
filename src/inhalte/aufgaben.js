// Alle Aufgaben (Quests). Eine neue Aufgabe ist ein neuer Eintrag hier; gestartet wird sie von
// einem Ereignis (s.starteAufgabe('id')) oder von einer anderen Aufgabe (danach).
//
//   id, titel     – eindeutig / wie sie im Aufgabenbuch heißt
//   geber         – wer sie gestellt hat (oder leer)
//   haupt         – true: gehört zur Hauptgeschichte
//   beschreibung  – worum es geht
//   schritte      – der Reihe nach; jeder mit
//                     text(s) oder text  – was zu tun ist (gern mit Zähler, z. B. „2/3“)
//                     fertig(s)          – wann der Schritt geschafft ist
//                     ort                – { x, z }: wohin der Hinweis in der Welt zeigt
//   belohnung     – { erfahrung, muenzen, gegenstaende: { id: anzahl } }
//   danach        – ids von Aufgaben, die nach dieser beginnen
//
// Was s kann, steht in src/ereignisse/liste.js.
import { LAGER, TEICH } from '../welt/orte.js';

const bis = (n, max) => Math.min(n, max);

export const AUFGABEN = [
  {
    id: 'schatzsuche',
    titel: 'Die Schatzsuche',
    haupt: true,
    beschreibung: 'In deinem Lendenschurz steckte ein zerrissenes Pergament mit seltsamen Zeichen. '
      + 'Vielleicht weiß jemand, was es bedeutet.',
    schritte: [
      { text: 'Folge dem Rauch und zeig jemandem das Pergament', fertig: (s) => s.weiss('pergament-erkannt'), ort: LAGER },
      { text: (s) => `Werde stärker: Erreiche Stufe 3 (jetzt ${s.stufe})`, fertig: (s) => s.stufe >= 3 },
      { text: 'Frag den Einsiedler nach dem Weg', fertig: (s) => s.weiss('weg-nach-erlenbach'), ort: LAGER },
      { text: 'Reise nach Erlenbach im Osten (das Dorf wird gerade gebaut)', fertig: () => false },
    ],
    belohnung: { erfahrung: 0 },
  },
  {
    id: 'durst',
    titel: 'Durst',
    beschreibung: 'Dein Mund ist trocken. Irgendwo in der Nähe muss es Wasser geben.',
    schritte: [
      { text: 'Finde Wasser und trink', fertig: (s) => s.weiss('getrunken'), ort: TEICH },
    ],
    belohnung: { erfahrung: 20 },
  },
  {
    id: 'feuer',
    titel: 'Feuer für die Nacht',
    geber: 'Einsiedler',
    beschreibung: '„Die Nächte hier draußen sind kalt. Bring mir drei trockene Äste, dann zeige ich dir, wie man ein Feuer macht.“',
    schritte: [
      { text: (s) => `Sammle trockene Äste (${bis(s.anzahl('ast'), 3)}/3)`, fertig: (s) => s.anzahl('ast') >= 3 || s.weiss('kann-feuer') },
      { text: 'Bring sie dem Einsiedler', fertig: (s) => s.weiss('kann-feuer'), ort: LAGER },
    ],
    belohnung: { erfahrung: 40 },
  },
  {
    id: 'werkzeug',
    titel: 'Das erste Werkzeug',
    geber: 'Einsiedler',
    beschreibung: '„Ohne Messer bist du hier draußen verloren. Fasern von den blauen Blumen, ein Stein, ein Ast. Mehr brauchst du nicht.“',
    schritte: [
      { text: (s) => `Sammle Flachsfasern an den blauen Blumen (${bis(s.anzahl('fasern'), 3)}/3)`, fertig: (s) => s.anzahl('fasern') >= 3 || s.hergestellt('schnur') > 0 },
      { text: 'Dreh eine Schnur (Menü, Herstellen)', fertig: (s) => s.hergestellt('schnur') > 0 },
      { text: 'Such einen Stein und stelle ein Steinmesser her', fertig: (s) => s.hergestellt('steinmesser') > 0 },
    ],
    belohnung: { erfahrung: 50, muenzen: 5 },
    danach: ['holz'],
  },
  {
    id: 'kraeuter',
    titel: 'Heilkräuter für den Alten',
    geber: 'Einsiedler',
    beschreibung: '„Mein Knie macht mir zu schaffen. Johanniskraut hilft, die gelben Blumen auf der Wiese.“',
    schritte: [
      { text: (s) => `Sammle Johanniskraut (${bis(s.anzahl('johanniskraut'), 3)}/3)`, fertig: (s) => s.anzahl('johanniskraut') >= 3 || s.weiss('kraeuter-gebracht') },
      { text: 'Bring es dem Einsiedler', fertig: (s) => s.weiss('kraeuter-gebracht'), ort: LAGER },
    ],
    belohnung: { erfahrung: 35, muenzen: 3 },
  },
  {
    id: 'holz',
    titel: 'Holz für den Winter',
    geber: 'Einsiedler',
    beschreibung: '„Gutes Messer. Jetzt bau dir eine Axt, und hack mir Holz. Der Winter kommt früher, als du denkst.“',
    schritte: [
      { text: 'Stelle eine Steinaxt her (braucht Handwerk Stufe 2)', fertig: (s) => s.hergestellt('steinaxt') > 0 || s.hat('steinaxt') },
      { text: (s) => `Hacke Holz an einem Baum (${bis(s.anzahl('holzscheit'), 5)}/5)`, fertig: (s) => s.anzahl('holzscheit') >= 5 || s.weiss('holz-gebracht') },
      { text: 'Bring dem Einsiedler fünf Holzscheite', fertig: (s) => s.weiss('holz-gebracht'), ort: LAGER },
    ],
    belohnung: { erfahrung: 70, muenzen: 12 },
  },
  {
    id: 'pilze',
    titel: 'Waldpilze',
    beschreibung: 'Am Waldrand wachsen Steinpilze. Roh sind sie zäh, gebraten ein Festessen.',
    schritte: [
      { text: (s) => `Sammle Steinpilze (${bis(s.anzahl('steinpilz') + 2 * s.hergestellt('gebratene_pilze'), 2)}/2)`, fertig: (s) => s.anzahl('steinpilz') >= 2 || s.hergestellt('gebratene_pilze') > 0 },
      { text: 'Brate sie an einem Feuer (Menü, Herstellen)', fertig: (s) => s.hergestellt('gebratene_pilze') > 0 },
    ],
    belohnung: { erfahrung: 30 },
  },
];

export function aufgabe(id) {
  const a = AUFGABEN.find((x) => x.id === id);
  if (!a) throw new Error(`Unbekannte Aufgabe: ${id}`);
  return a;
}
