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
//   wiederholbar  – true: ein Auftrag, den man immer wieder annehmen kann; zuruecksetzen(s) räumt
//                   dann auf, was der letzte Durchgang hinterlassen hat
//
// Was s kann, steht in src/ereignisse/liste.js.
import { DOERFLER, LAGER, MARKTSTAND, RAEUBERLAGER, STEG, TEICH, WEIHER } from '../welt/orte.js';

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
      { text: 'Besiege den Räuberhauptmann an der Straße nach Osten und nimm ihm das Kartenteil ab', fertig: (s) => s.hat('kartenteil_1') || s.weiss('kartenteil-gezeigt'), ort: RAEUBERLAGER },
      { text: 'Zeig dem Einsiedler das Kartenteil', fertig: (s) => s.weiss('kartenteil-gezeigt'), ort: LAGER },
      { text: 'Folg der Straße nach Erlenbach und zeig Gerold, dem Kartenleser, die Karte', fertig: (s) => s.weiss('gerold-gelesen'), ort: DOERFLER.gerold },
      { text: 'Zieh nach Norden in die Graufels-Berge (kommt in einer späteren Etappe)', fertig: () => false },
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
    beschreibung: '„Gutes Messer. Jetzt bau dir eine Axt, fäll einen Baum und hack mir Holz. Der Winter kommt früher, als du denkst.“',
    schritte: [
      { text: 'Stelle eine Steinaxt her (braucht Handwerk Stufe 2)', fertig: (s) => s.hergestellt('steinaxt') > 0 || s.hat('steinaxt') },
      { text: (s) => `Fälle einen Baum und zerteile den Stamm in Holzscheite (${bis(s.anzahl('holzscheit'), 5)}/5)`, fertig: (s) => s.anzahl('holzscheit') >= 5 || s.weiss('holz-gebracht') },
      { text: 'Bring dem Einsiedler fünf Holzscheite', fertig: (s) => s.weiss('holz-gebracht'), ort: LAGER },
    ],
    belohnung: { erfahrung: 70, muenzen: 12 },
  },
  {
    id: 'raeuber',
    titel: 'Räuber an der Straße',
    beschreibung: 'An der Straße nach Osten lauern Räuber. Wer dort entlanggeht, verliert alles, manchmal mehr.',
    schritte: [
      { text: (s) => `Besiege drei Räuber (${bis(s.besiegt('raeuber'), 3)}/3)`, fertig: (s) => s.besiegt('raeuber') >= 3, ort: RAEUBERLAGER },
    ],
    belohnung: { erfahrung: 60, muenzen: 15 },
  },
  {
    id: 'wams',
    titel: 'Ein Wams aus Leder',
    beschreibung: 'Die Räuber tragen Leder bei sich. Vier Fetzen und zwei Schnüre ergeben ein Wams, das Schläge abfängt.',
    schritte: [
      { text: (s) => `Sammle Lederfetzen (${bis(s.anzahl('lederfetzen') + 4 * s.hergestellt('lederwams'), 4)}/4)`, fertig: (s) => s.anzahl('lederfetzen') >= 4 || s.hergestellt('lederwams') > 0 },
      { text: 'Näh dir ein Lederwams (Menü, Herstellen; braucht Handwerk Stufe 2)', fertig: (s) => s.hergestellt('lederwams') > 0 },
    ],
    belohnung: { erfahrung: 40 },
  },
  {
    id: 'auftrag_fische',
    titel: 'Fisch für Jost',
    geber: 'Jost',
    wiederholbar: true,
    beschreibung: '„Die Leute wollen Fisch, und ich komme mit dem Fangen nicht nach. Bring mir fünf, egal welche, dann leg ich zwanzig Kupfer obendrauf.“',
    schritte: [
      { text: (s) => `Fang fünf Fische (${bis(s.fische(), 5)}/5)`, fertig: (s) => s.fische() >= 5 || s.weiss('abgegeben-fische'), ort: WEIHER },
      { text: 'Bring sie Jost am Steg', fertig: (s) => s.weiss('abgegeben-fische'), ort: STEG },
    ],
    belohnung: { erfahrung: 30, muenzen: 20 },
    zuruecksetzen: (s) => s.vergiss('abgegeben-fische'),
  },
  {
    id: 'auftrag_holz',
    titel: 'Holz für Martas Ofen',
    geber: 'Marta',
    wiederholbar: true,
    beschreibung: '„Mein Ofen frisst Holz wie ein Bär Honig. Acht Scheite, und du bekommst achtzehn Kupfer.“',
    schritte: [
      { text: (s) => `Hacke Holz mit der Axt (${bis(s.anzahl('holzscheit'), 8)}/8)`, fertig: (s) => s.anzahl('holzscheit') >= 8 || s.weiss('abgegeben-holz') },
      { text: 'Bring es Marta auf den Markt', fertig: (s) => s.weiss('abgegeben-holz'), ort: MARKTSTAND },
    ],
    belohnung: { erfahrung: 25, muenzen: 18 },
    zuruecksetzen: (s) => s.vergiss('abgegeben-holz'),
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
