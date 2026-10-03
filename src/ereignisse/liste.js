// Alle Ereignisse der Welt: was erzählt wird, und wer einem Aufgaben gibt. Hier wächst das Spiel.
// Gegenstände, Rezepte und Aufgaben selbst stehen in src/inhalte/.
//
// Ein Ereignis hat:
//   id          – eindeutiger Name, kleingeschrieben
//   wann(s)     – ab wann es auftaucht
//   text        – was der Spieler liest
//   optionen    – Entscheidungen, jede mit Taste, Text und optional:
//                 folge(s)      – was passiert
//                 braucht/menge – ein Gegenstand (id) und wie viele, ohne die die Option nicht geht
//                 bedingung(s)  – sonstige Voraussetzung
//                 spaeter       – true: das Ereignis kommt nach einer Weile wieder
//   wiederholbar – true: kommt immer wieder (nach „sperre“ Sekunden)
//   bleibt(s)    – solange wahr, bleibt die Tafel offen; geht man weg, verschwindet sie
//   beimZeigen(s)– passiert, sobald das Ereignis erscheint (z. B. der Einsiedler winkt)
//
// Was s alles kann:
//   s.gelaufen, s.nahe(x, z, radius), s.nacht, s.stunde, s.stufe, s.werte.saettigung/wasser/waerme/leben
//   s.hat('id', n), s.anzahl('id'), s.gib('id', n), s.nimm('id', n), s.gibMuenzen(n), s.gibErfahrung(n)
//   s.hergestellt('id'), s.stelleHer('rezept')
//   s.erledigt('ereignis'), s.weiss('merker'), s.merke('merker'), s.sage('Text')
//   s.esse(n), s.trinke(n), s.waerme(n), s.winke(), s.einsiedlerDa
//   s.starteAufgabe('id'), s.aufgabeAktiv('id'), s.aufgabeErledigt('id'), s.schrittVon('id')
//
// Reihenfolge zählt: Treffen mehrere zu, kommt das obere zuerst.
import { ALTER_BAUM, LAGER, TEICH } from '../welt/orte.js';

const beimLager = (s, r = 6) => s.nahe(LAGER.x, LAGER.z, r);
const amFeuerDesAlten = (s) => s.erledigt('einsiedler-gruss') && beimLager(s, 7);

const GESCHICHTE = [
  {
    id: 'erwachen',
    wann: () => true,
    text: 'Du wachst im hohen Gras auf. Die Sonne steht schon über den Hügeln. '
      + 'Außer einem Lendenschurz trägst du nichts, und du weißt nicht, wie du hierhergekommen bist. '
      + 'Im Bund steckt ein zerrissenes Pergament voller seltsamer Zeichen. Dein Mund ist trocken, dein Magen leer.',
    optionen: [
      {
        taste: 'E', text: 'Aufstehen',
        folge: (s) => {
          s.gib('pergament');
          s.starteAufgabe('schatzsuche');
          s.starteAufgabe('durst');
          s.sage('Sieh dich um. Irgendwo muss es Wasser geben, und vielleicht Menschen.');
        },
      },
    ],
  },
  {
    id: 'rauch',
    wann: (s) => s.gelaufen > 8 && !s.erledigt('einsiedler-gruss'),
    text: 'Über dem Waldrand steigt eine dünne Rauchsäule auf. Dort brennt ein Feuer. Ein Trampelpfad führt hin.',
    optionen: [
      { taste: 'E', text: 'Merken', folge: (s) => s.sage('Folge dem Pfad zum Rauch.') },
    ],
  },
  {
    id: 'feuerstein',
    wann: (s) => s.gelaufen > 20,
    text: 'Zwischen den Halmen glänzt etwas Scharfkantiges: ein Feuerstein, so groß wie deine Faust.',
    optionen: [
      { taste: 'E', text: 'Aufheben', folge: (s) => s.gib('feuerstein') },
      { taste: 'Q', text: 'Liegen lassen', spaeter: true },
    ],
  },
  {
    id: 'teich',
    wann: (s) => s.nahe(TEICH.x, TEICH.z, TEICH.radius + 5),
    text: 'Ein kleiner Teich. Das Wasser ist klar und kalt. Im Schlamm am Ufer sind Spuren von Tieren.',
    optionen: [
      {
        taste: 'E', text: 'Trinken',
        folge: (s) => { s.trinke(60); s.merke('getrunken'); s.sage('Du trinkst gierig. Am Ufer kannst du jederzeit wieder trinken.'); },
      },
      { taste: 'Q', text: 'Weitergehen' },
    ],
  },
  {
    id: 'alter-baum',
    wann: (s) => s.nahe(ALTER_BAUM.x, ALTER_BAUM.z, 9),
    text: 'Eine riesige, uralte Eiche. In ihrem Schatten liegen trockene Äste. '
      + 'Geh nah heran und tippe auf „Benutzen“ (oder drück E), dann hebst du sie auf.',
    optionen: [
      { taste: 'E', text: 'Verstanden' },
    ],
  },
  {
    id: 'speer',
    wann: (s) => s.hat('feuerstein') && s.hat('ast') && !s.hergestellt('speer') && (!s.aufgabeAktiv('feuer') || s.anzahl('ast') > 3),
    text: 'Mit der scharfen Kante des Feuersteins könntest du einen Ast anspitzen. Es wäre dein erstes Werkzeug. '
      + 'Was du sonst noch bauen kannst, steht im Menü unter „Herstellen“.',
    optionen: [
      {
        taste: 'E', text: 'Speer schnitzen', braucht: 'ast',
        folge: (s) => { if (s.stelleHer('speer')) s.sage('Nach einer Weile hältst du einen groben Speer in der Hand.'); },
      },
      { taste: 'Q', text: 'Später', spaeter: true },
    ],
  },
  {
    id: 'pilz-fund',
    wann: (s) => s.hat('steinpilz') && !s.aufgabeAktiv('pilze') && !s.aufgabeErledigt('pilze'),
    text: 'Ein Steinpilz, fest und duftend. Roh ist er zäh, aber über einem Feuer gebraten wäre er ein Festessen.',
    optionen: [
      { taste: 'E', text: 'Gute Idee', folge: (s) => s.starteAufgabe('pilze') },
    ],
  },

  // --- Der Einsiedler ---
  {
    id: 'einsiedler-sehen',
    wann: (s) => s.einsiedlerDa && beimLager(s, 26),
    text: 'Auf einer kleinen Lichtung brennt ein Feuer. Daneben steht ein alter Mann in einer groben Wollkutte. '
      + 'Er hat dich längst bemerkt.',
    optionen: [
      { taste: 'E', text: 'Näher gehen' },
      { taste: 'Q', text: 'Abstand halten', spaeter: true },
    ],
  },
  {
    id: 'einsiedler-gruss',
    wann: (s) => beimLager(s, 6),
    beimZeigen: (s) => s.winke(),
    text: '„Sieh an, ein Nackter im Wald.“ Der Alte mustert dich. „Du siehst aus, als hättest du seit Tagen nichts gegessen. '
      + 'Setz dich ans Feuer.“',
    optionen: [
      {
        taste: 'E', text: 'Sich ans Feuer setzen',
        folge: (s) => { s.esse(45); s.waerme(100); s.merke('einsiedler-freund'); s.sage('Er reicht dir ein Stück gebratenen Fisch. Es ist das Beste, was du je gegessen hast.'); },
      },
      { taste: 'Q', text: 'Misstrauisch bleiben', folge: (s) => s.sage('„Wie du willst. Das Feuer brennt auch für Misstrauische.“') },
      {
        taste: 'R', text: 'Ihn mit dem Speer bedrohen', braucht: 'speer',
        folge: (s) => { s.merke('einsiedler-bedroht'); s.sage('Er sieht dich ruhig an. „Damit fängst du nicht einmal einen Fisch.“ Du senkst den Speer.'); },
      },
    ],
  },
  {
    id: 'einsiedler-pergament',
    wann: (s) => amFeuerDesAlten(s) && s.hat('pergament') && !s.weiss('pergament-erkannt'),
    bleibt: (s) => beimLager(s, 10),
    text: 'Du zeigst dem Alten das Pergament. Er wird still und fährt mit dem Finger die Linien nach. '
      + '„Das ist die Schrift der Alten Könige“, murmelt er. „Es heißt, sie hätten ihren Schatz in sieben Teilen versteckt, '
      + 'über das ganze Land verstreut. Wer alle findet …“ Er sieht dich lange an. '
      + '„Werd erst einmal stärker. Hier draußen überlebst du sonst keinen Winter. Dann reden wir weiter.“',
    optionen: [
      { taste: 'E', text: 'Das Pergament einstecken', folge: (s) => { s.merke('pergament-erkannt'); s.gibErfahrung(25); } },
    ],
  },
  {
    id: 'einsiedler-aufgabe',
    wann: (s) => amFeuerDesAlten(s),
    bleibt: (s) => beimLager(s, 10),
    text: '„Die Nächte hier draußen sind kalt“, sagt der Alte. „Ohne Feuer erfrierst du. '
      + 'Bring mir drei trockene Äste, dann zeige ich dir, wie man eins macht.“',
    optionen: [
      { taste: 'E', text: 'Ich bringe sie', folge: (s) => { s.merke('aufgabe-aeste'); s.starteAufgabe('feuer'); } },
      { taste: 'Q', text: 'Später', spaeter: true },
    ],
  },
  {
    id: 'einsiedler-feuer-lernen',
    wann: (s) => s.aufgabeAktiv('feuer') && beimLager(s, 7) && s.hat('ast', 3),
    bleibt: (s) => beimLager(s, 10),
    text: '„Gut. Schau genau hin.“ Er schlägt seinen Feuerstein gegen einen Stein, die Funken fallen in ein Nest aus trockenem Gras. '
      + 'Er bläst vorsichtig, bis eine kleine Flamme aufzüngelt.',
    optionen: [
      {
        taste: 'E', text: 'Zusehen und lernen', braucht: 'ast', menge: 3,
        folge: (s) => {
          s.nimm('ast', 3);
          s.merke('kann-feuer');
          s.sage('Du kannst jetzt Feuer machen: im Menü unter „Herstellen“ oder mit F. Du brauchst drei Äste und einen Feuerstein.');
          if (!s.hat('feuerstein')) { s.gib('feuerstein'); s.sage('„Nimm den hier, ich habe noch einen.“'); }
        },
      },
    ],
  },
  {
    id: 'einsiedler-werkzeug',
    wann: (s) => s.aufgabeErledigt('feuer') && beimLager(s, 8),
    bleibt: (s) => beimLager(s, 11),
    text: '„Feuer allein macht nicht satt. Du brauchst Werkzeug.“ Er zeigt dir sein Messer aus Stein. '
      + '„Dreh eine Schnur aus den Fasern der blauen Blumen und bind einen scharfen Stein an einen Ast. '
      + 'Und wenn du schon unterwegs bist: Mein Knie macht mir zu schaffen. Johanniskraut hilft, die gelben Blumen auf der Wiese.“',
    optionen: [
      { taste: 'E', text: 'Ich kümmere mich darum', folge: (s) => { s.starteAufgabe('werkzeug'); s.starteAufgabe('kraeuter'); } },
      { taste: 'Q', text: 'Später', spaeter: true },
    ],
  },
  {
    id: 'einsiedler-kraeuter',
    wann: (s) => s.aufgabeAktiv('kraeuter') && beimLager(s, 7) && s.hat('johanniskraut', 3),
    bleibt: (s) => beimLager(s, 10),
    text: '„Johanniskraut! Du hast ein gutes Auge.“ Er zerreibt die Blüten zwischen den Fingern und streicht sie auf sein Knie. '
      + '„Ah, das tut gut. Hier, für deine Mühe.“',
    optionen: [
      {
        taste: 'E', text: 'Gern geschehen', braucht: 'johanniskraut', menge: 3,
        folge: (s) => { s.nimm('johanniskraut', 3); s.merke('kraeuter-gebracht'); },
      },
    ],
  },
  {
    id: 'einsiedler-holz',
    wann: (s) => s.aufgabeAktiv('holz') && beimLager(s, 7) && s.hat('holzscheit', 5),
    bleibt: (s) => beimLager(s, 10),
    text: '„So viel Holz!“ Der Alte stapelt die Scheite neben dem Feuer. '
      + '„Damit komme ich durch den halben Winter. Aus dir wird noch ein richtiger Waldläufer.“',
    optionen: [
      {
        taste: 'E', text: 'Gern', braucht: 'holzscheit', menge: 5,
        folge: (s) => { s.nimm('holzscheit', 5); s.merke('holz-gebracht'); },
      },
    ],
  },
  {
    id: 'einsiedler-erlenbach',
    wann: (s) => s.aufgabeAktiv('schatzsuche') && s.schrittVon('schatzsuche') === 2 && beimLager(s, 7),
    bleibt: (s) => beimLager(s, 10),
    text: '„Du bist stärker geworden. Gut.“ Der Alte zeichnet mit einem Stock eine Karte in den Staub. '
      + '„Geh nach Osten, über die Hügel, bis du Rauch über Dächern siehst. Das ist Erlenbach. Dort lebt Gerold, der Kartenleser. '
      + 'Zeig ihm dein Pergament. Und pass auf dich auf: Auf der Straße treiben sich Räuber herum.“',
    optionen: [
      { taste: 'E', text: 'Danke, Alter', folge: (s) => { s.merke('weg-nach-erlenbach'); s.gibErfahrung(20); } },
    ],
  },
  {
    id: 'einsiedler-nacht',
    wiederholbar: true,
    sperre: 120,
    wann: (s) => s.erledigt('einsiedler-gruss') && beimLager(s, 6) && s.nacht,
    bleibt: (s) => beimLager(s, 9),
    text: 'Der Alte schiebt ein Scheit ins Feuer. „Bleib, bis es hell wird. Die Kälte draußen ist kein Spaß.“',
    optionen: [
      { taste: 'E', text: 'Am Feuer bleiben', folge: (s) => { s.waerme(100); s.sage('Die Wärme kriecht dir in die Glieder.'); } },
    ],
  },
];

export function alleEreignisse() {
  return GESCHICHTE;
}
