// Alle Ereignisse der Welt. Hier wächst das Spiel.
//
// Ein Ereignis hat:
//   id          – eindeutiger Name, kleingeschrieben
//   wann(s)     – ab wann es auftaucht
//   text        – was der Spieler liest
//   optionen    – Entscheidungen, jede mit Taste, Text und optional:
//                 folge(s)      – was passiert
//                 braucht/menge – ein Ding (und wie viele), ohne das die Option nicht geht
//                 bedingung(s)  – sonstige Voraussetzung
//                 spaeter       – true: das Ereignis kommt nach einer Weile wieder
//   wiederholbar – true: kommt immer wieder (nach „sperre“ Sekunden), z. B. Trinken
//   bleibt(s)    – solange wahr, bleibt die Tafel offen; geht man weg, verschwindet sie
//   beimZeigen(s)– passiert, sobald das Ereignis erscheint (z. B. der Einsiedler winkt)
//
// Was s alles kann:
//   s.gelaufen, s.nahe(x, z, radius), s.hat('Ding', n), s.anzahl('Ding'), s.erledigt('id'),
//   s.weiss('merker'), s.merke('merker'), s.gib('Ding', n), s.nimm('Ding', n), s.sage('Text'),
//   s.werte.saettigung/wasser/waerme/leben, s.esse(n), s.trinke(n), s.waerme(n), s.nacht, s.stunde,
//   s.liegt('fund-id'), s.hebeAuf('fund-id'), s.beerenDa(i), s.pfluecke(i), s.winke()
//
// Reihenfolge zählt: Treffen mehrere zu, kommt das obere zuerst.
import { ALTER_BAUM, BEERENSTRAEUCHER, LAGER, TEICH } from '../welt/orte.js';
import { FUNDE } from '../welt/fundstuecke.js';

const beimLager = (s, r = 6) => s.nahe(LAGER.x, LAGER.z, r);

const GESCHICHTE = [
  {
    id: 'erwachen',
    wann: () => true,
    text: 'Du wachst im hohen Gras auf. Die Sonne steht schon über den Hügeln. '
      + 'Außer einem Lendenschurz trägst du nichts, und du weißt nicht, wie du hierhergekommen bist. '
      + 'Dein Mund ist trocken, dein Magen leer.',
    optionen: [
      { taste: 'E', text: 'Aufstehen', folge: (s) => s.sage('Sieh dich um. Irgendwo muss es Wasser geben, und vielleicht Menschen.') },
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
      { taste: 'E', text: 'Aufheben', folge: (s) => s.gib('Feuerstein') },
      { taste: 'Q', text: 'Liegen lassen', spaeter: true },
    ],
  },
  {
    id: 'teich',
    wann: (s) => s.nahe(TEICH.x, TEICH.z, TEICH.radius + 5),
    text: 'Ein kleiner Teich. Das Wasser ist klar und kalt. Im Schlamm am Ufer sind Spuren von Tieren.',
    optionen: [
      { taste: 'E', text: 'Trinken', folge: (s) => { s.trinke(60); s.sage('Du trinkst gierig. Das Wasser schmeckt nach Erde und Stein.'); } },
      { taste: 'Q', text: 'Weitergehen' },
    ],
  },
  {
    id: 'trinken',
    wiederholbar: true,
    sperre: 20,
    wann: (s) => s.erledigt('teich') && s.nahe(TEICH.x, TEICH.z, TEICH.radius + 4) && s.werte.wasser < 85,
    bleibt: (s) => s.nahe(TEICH.x, TEICH.z, TEICH.radius + 7),
    text: 'Das Wasser des Teichs glitzert. Du hast Durst.',
    optionen: [
      { taste: 'E', text: 'Trinken', folge: (s) => { s.trinke(60); s.sage('Das kalte Wasser tut gut.'); } },
      { taste: 'Q', text: 'Nicht jetzt', spaeter: true },
    ],
  },
  {
    id: 'ast',
    wann: (s) => s.nahe(ALTER_BAUM.x, ALTER_BAUM.z, 8),
    bleibt: (s) => s.nahe(ALTER_BAUM.x, ALTER_BAUM.z, 11),
    text: 'Unter dem alten Baum liegt ein gerader, abgebrochener Ast, fast so lang wie du.',
    optionen: [
      { taste: 'E', text: 'Mitnehmen', folge: (s) => s.gib('Ast') },
      { taste: 'Q', text: 'Liegen lassen', spaeter: true },
    ],
  },
  {
    id: 'speer',
    wann: (s) => s.hat('Feuerstein') && s.hat('Ast') && (!s.weiss('aufgabe-aeste') || s.anzahl('Ast') > 3),
    text: 'Mit der scharfen Kante des Feuersteins könntest du einen Ast anspitzen. Es wäre dein erstes Werkzeug.',
    optionen: [
      {
        taste: 'E', text: 'Speer schnitzen', braucht: 'Ast',
        folge: (s) => { s.nimm('Ast'); s.gib('Einfacher Speer'); s.sage('Nach einer Weile hältst du einen groben Speer in der Hand.'); },
      },
      { taste: 'Q', text: 'Später', spaeter: true },
    ],
  },

  // --- Der Einsiedler (Issue #2) ---
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
        taste: 'R', text: 'Ihn mit dem Speer bedrohen', braucht: 'Einfacher Speer',
        folge: (s) => { s.merke('einsiedler-bedroht'); s.sage('Er sieht dich ruhig an. „Damit fängst du nicht einmal einen Fisch.“ Du senkst den Speer.'); },
      },
    ],
  },
  {
    id: 'einsiedler-aufgabe',
    wann: (s) => s.erledigt('einsiedler-gruss') && beimLager(s, 7),
    bleibt: (s) => beimLager(s, 10),
    text: '„Die Nächte hier draußen sind kalt“, sagt der Alte. „Ohne Feuer erfrierst du. '
      + 'Bring mir drei trockene Äste, dann zeige ich dir, wie man eins macht.“',
    optionen: [
      { taste: 'E', text: 'Ich bringe sie', folge: (s) => { s.merke('aufgabe-aeste'); s.sage('Trockene Äste liegen am Waldrand und am Pfad.'); } },
      { taste: 'Q', text: 'Später', spaeter: true },
    ],
  },
  {
    id: 'einsiedler-feuer-lernen',
    wann: (s) => s.weiss('aufgabe-aeste') && beimLager(s, 7) && s.hat('Ast', 3),
    bleibt: (s) => beimLager(s, 10),
    text: '„Gut. Schau genau hin.“ Er schlägt seinen Feuerstein gegen einen Stein, die Funken fallen in ein Nest aus trockenem Gras. '
      + 'Er bläst vorsichtig, bis eine kleine Flamme aufzüngelt.',
    optionen: [
      {
        taste: 'E', text: 'Zusehen und lernen', braucht: 'Ast', menge: 3,
        folge: (s) => {
          s.nimm('Ast', 3);
          s.merke('kann-feuer');
          s.sage('Du kannst jetzt Feuer machen: Taste F (mit drei Ästen und einem Feuerstein).');
          if (!s.hat('Feuerstein')) { s.gib('Feuerstein'); s.sage('„Nimm den hier, ich habe noch einen.“'); }
        },
      },
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

// Ein Ereignis je Fundstück (Äste usw.)
function fundEreignisse() {
  return FUNDE.map((f) => ({
    id: f.id,
    wann: (s) => s.liegt(f.id) && s.nahe(f.x, f.z, 2.2),
    bleibt: (s) => s.nahe(f.x, f.z, 4),
    text: f.ding === 'Ast' ? 'Ein trockener Ast liegt im Gras. Gutes Feuerholz.' : `Hier liegt: ${f.ding}.`,
    optionen: [
      { taste: 'E', text: 'Aufheben', folge: (s) => { s.hebeAuf(f.id); s.gib(f.ding); } },
      { taste: 'Q', text: 'Liegen lassen', spaeter: true },
    ],
  }));
}

// Ein Ereignis je Beerenstrauch (wiederholbar, die Beeren wachsen nach)
function beerenEreignisse() {
  return BEERENSTRAEUCHER.map((b, i) => ({
    id: `beeren-${i}`,
    wiederholbar: true,
    sperre: 8,
    wann: (s) => s.beerenDa(i) && s.nahe(b.x, b.z, 2.6),
    bleibt: (s) => s.nahe(b.x, b.z, 4.5),
    text: 'Ein Strauch voller dunkler Brombeeren. Sie sind reif und süß.',
    optionen: [
      { taste: 'E', text: 'Pflücken und essen', folge: (s) => { s.pfluecke(i); s.esse(22); s.sage('Die Beeren sind süß und saftig.'); } },
      { taste: 'Q', text: 'Weitergehen', spaeter: true },
    ],
  }));
}

export function alleEreignisse() {
  return [...GESCHICHTE, ...beerenEreignisse(), ...fundEreignisse()];
}
