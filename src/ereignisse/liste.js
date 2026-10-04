// Alle Ereignisse der Welt: was erzählt wird, und wer einem Aufgaben gibt. Hier wächst das Spiel.
// Gegenstände, Rezepte und Aufgaben selbst stehen in src/inhalte/.
//
// Ein Ereignis hat:
//   id          – eindeutiger Name, kleingeschrieben
//   wann(s)     – ab wann es auftaucht
//   text        – was der Spieler liest (oder text(s), wenn es von der Lage abhängt)
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
//   s.hergestellt('id'), s.stelleHer('rezept'), s.besiegt('raeuber')
//   s.erledigt('ereignis'), s.weiss('merker'), s.merke('merker'), s.sage('Text')
//   s.esse(n), s.trinke(n), s.waerme(n), s.winke(), s.einsiedlerDa
//   s.starteAufgabe('id'), s.aufgabeAktiv('id'), s.aufgabeErledigt('id'), s.schrittVon('id')
//   s.vergiss('merker'), s.fische(), s.gibFischeAb(n), s.handel('marta')
//
// Gespräche (gespraech-…) erscheinen nicht von selbst, sondern wenn man jemanden anspricht
// (Benutzen in seiner Nähe).
//
// Reihenfolge zählt: Treffen mehrere zu, kommt das obere zuerst.
import { ALTER_BAUM, DORF, GRAUFURT, LAGER, MOOR, RAEUBERLAGER, TEICH } from '../welt/orte.js';
import { BEGEGNUNGEN } from './begegnungen.js';

const beimLager = (s, r = 6) => s.nahe(LAGER.x, LAGER.z, r);
const amFeuerDesAlten = (s) => s.erledigt('einsiedler-gruss') && beimLager(s, 7);

// Das Moor und seine Feen (src/welt/feen.js)
const MOOR_EREIGNISSE = [
  {
    id: 'moor',
    wann: (s) => s.nahe(MOOR.x, MOOR.z, MOOR.radius * 0.7),
    text: 'Der Boden wird weich und federt unter den Füßen. Dunkler Torf, Moospolster, Wasserlachen, in denen sich der Himmel '
      + 'spiegelt. Zwischen dem Schilf glimmt etwas, ein Licht, das sofort wieder verschwindet. Man erzählt, im Moor wohnen Feen.',
    optionen: [{ taste: 'E', text: 'Vorsichtig weitergehen', folge: (s) => s.merke('moor-gesehen') }],
  },
  {
    id: 'feen',
    wann: (s) => s.erledigt('moor') && s.nacht && s.nahe(MOOR.x, MOOR.z, MOOR.radius * 0.8),
    text: 'Lichter steigen aus dem Schilf, grün, blau und golden, und kreisen um dich. Es sind Feen, kaum größer als deine Hand, '
      + 'mit Flügeln wie Libellen. Eine schwebt vor deinem Gesicht und kichert. „Ein Großer! Tanzt du mit uns, Großer?“',
    optionen: [
      {
        taste: 'E', text: 'Mit ihnen tanzen',
        folge: (s) => {
          s.gib('feentau', 2); s.merke('feenfreund'); s.gibErfahrung(25);
          s.sage('Ihr dreht euch über Torf und Wasser, bis dir schwindlig ist. Zum Abschied drücken sie dir zwei Fläschchen Feentau in die Hand. '
            + '„Die Pferdemenschen im Osten haben wir auch einmal tanzen lassen“, flüstert eine. „Sie reiten seitdem nur noch im Kreis.“');
        },
      },
      {
        taste: 'R', text: 'Eine fangen',
        folge: (s) => {
          s.merke('feen-zorn'); s.waerme(-35);
          s.sage('Deine Hand greift ins Leere. Die Lichter locken dich kichernd tiefer ins Moor, bis du bis zu den Knien im kalten Wasser stehst. Dann sind sie fort.');
        },
      },
      { taste: 'Q', text: 'Lieber weitergehen', spaeter: true },
    ],
  },
];

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
    id: 'raeuberlager-sehen',
    wann: (s) => s.nahe(RAEUBERLAGER.x, RAEUBERLAGER.z, 34),
    text: 'Zwischen den Bäumen siehst du ein verwahrlostes Lager: schmutzige Zelte, ein qualmendes Feuer, '
      + 'Männer mit Keulen. Einer zeigt grinsend in deine Richtung.',
    optionen: [
      { taste: 'E', text: 'Dann kommt doch', folge: (s) => { s.starteAufgabe('raeuber'); s.sage('Schlag zu mit der Maus, mit X oder dem Knopf „Schlagen“.'); } },
      { taste: 'Q', text: 'Lieber zurück', folge: (s) => { s.starteAufgabe('raeuber'); s.sage('Die Räuber lachen dir hinterher.'); } },
    ],
  },
  {
    id: 'erster-lederfetzen',
    wann: (s) => s.hat('lederfetzen') && !s.aufgabeAktiv('wams') && !s.aufgabeErledigt('wams'),
    text: 'Das Leder der Räuber ist fleckig, aber zäh. Mit ein paar Fetzen mehr könntest du dir ein Wams nähen, das Schläge abfängt.',
    optionen: [
      { taste: 'E', text: 'Gute Idee', folge: (s) => s.starteAufgabe('wams') },
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
          s.gib('fackel', 2);
          s.sage('„Und zwei Fackeln für den Heimweg. Die Nacht kommt schneller, als man denkt.“ Eine Fackel machst du dir selbst aus einem Ast und Flachsfasern.');
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
      + '„Folg der Straße nach Osten, bis du Rauch über Dächern siehst. Das ist Erlenbach. Dort lebt Gerold, der Kartenleser.“ '
      + 'Er zögert. „Aber an der Straße hausen Räuber. Ihr Hauptmann prahlt mit einem Stück Pergament voller Zeichen, '
      + 'das er einem Händler abgenommen hat. Zeichen wie deine.“',
    optionen: [
      { taste: 'E', text: 'Dann hole ich es mir', folge: (s) => { s.merke('weg-nach-erlenbach'); s.gibErfahrung(20); s.starteAufgabe('raeuber'); } },
    ],
  },
  {
    id: 'einsiedler-kartenteil',
    wann: (s) => s.hat('kartenteil_1') && beimLager(s, 7) && s.erledigt('einsiedler-gruss'),
    bleibt: (s) => beimLager(s, 10),
    text: 'Du legst das Stück des Hauptmanns neben dein Pergament. Die Linien laufen ineinander über, ein Fluss, ein Berg, '
      + 'ein Kreuz. Der Alte pfeift leise. „Eine Karte. Sieben Teile, sagt man, und am Ende liegt der Schatz der Alten Könige. '
      + 'Geh nach Erlenbach. Gerold kann lesen, was ich nur ahne.“',
    optionen: [
      { taste: 'E', text: 'Ich gehe nach Erlenbach', folge: (s) => { s.merke('kartenteil-gezeigt'); s.gibErfahrung(50); } },
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

// --- Erlenbach ---
const DORF_EREIGNISSE = [
  {
    id: 'dorf-ankunft',
    wann: (s) => s.nahe(DORF.x, DORF.z, 34),
    text: 'Erlenbach: ein paar Fachwerkhäuser mit Strohdächern um einen Brunnen, Rauch steigt aus den Kaminen. '
      + 'Auf dem Markt ruft eine Händlerin ihre Waren aus, am Weiher sitzt ein Fischer auf seinem Steg.',
    optionen: [
      { taste: 'E', text: 'Ins Dorf gehen', folge: (s) => s.sage('Sprich die Leute an: geh nah heran und tippe auf „Benutzen“ (E).') },
    ],
  },
  {
    id: 'graufurt-ankunft',
    wann: (s) => s.nahe(GRAUFURT.x, GRAUFURT.z, 32),
    text: 'Graufurt: graue Steinhäuser, die sich unter Schieferdächer ducken. Hier ist es rauer als im Süden. '
      + 'Aus der Schmiede klingt der Hammer, vor dem Gasthaus „Zum Krummen Ochsen“ dampft ein Kessel. Im Norden ragen die Graufels-Berge auf.',
    optionen: [{ taste: 'E', text: 'Ins Dorf gehen' }],
  },
];

const GESPRAECHE = [
  {
    id: 'gespraech-bertram',
    wiederholbar: true, sperre: 0,
    wann: () => false,
    text: (s) => (s.weiss('bertram-kennt')
      ? 'Bertram wischt sich den Ruß von der Stirn. „Wieder da? Was brauchst du?“'
      : 'Ein Mann wie ein Eichenstamm lässt den Hammer sinken. „Bertram. Schmied. Wenn du Eisen willst statt Stein, bist du hier richtig. Gutes Werkzeug kostet, aber es hält ein Leben lang.“'),
    beimZeigen: (s) => s.merke('bertram-kennt'),
    optionen: [
      { taste: 'E', text: 'Handeln', folge: (s) => s.handel('bertram') },
      { taste: 'R', text: 'Gibt es Arbeit?', bedingung: (s) => !s.aufgabeAktiv('auftrag_steine'), folge: (s) => s.starteAufgabe('auftrag_steine') },
      {
        taste: 'T', text: '12 Steine abgeben', braucht: 'stein', menge: 12, bedingung: (s) => s.aufgabeAktiv('auftrag_steine'),
        folge: (s) => { s.nimm('stein', 12); s.merke('abgegeben-steine'); s.sage('„Gute Brocken. Daraus mauere ich die neue Esse.“'); },
      },
      {
        taste: 'F', text: 'Nach den Zwergen fragen', bedingung: (s) => s.weiss('geruecht-graufels') && !s.weiss('bertram-zwerge'),
        folge: (s) => { s.merke('bertram-zwerge'); s.sage('Bertram lacht leise. „Zwerge? Mein Großvater hat einen gesehen, sagt er. Am Eisentor, oben am Pass. Sie handeln nur mit denen, die ihnen etwas Gutes bringen.“'); },
      },
      { taste: 'Q', text: 'Bis bald' },
    ],
  },
  {
    id: 'gespraech-ida',
    wiederholbar: true, sperre: 0,
    wann: () => false,
    text: '„Willkommen im Krummen Ochsen! Eintopf, Brot, ein Bett für die Nacht. Und wer zahlt, bekommt auch die Neuigkeiten.“',
    optionen: [
      { taste: 'E', text: 'Etwas kaufen', folge: (s) => s.handel('ida') },
      {
        taste: 'R', text: 'Ein Bett für die Nacht (4 Kupfer)', bedingung: (s) => s.nacht && s.muenzen >= 4,
        folge: (s) => { s.zahle(4); s.schlafeImBett(); },
      },
      {
        taste: 'T', text: 'Neuigkeiten (1 Kupfer)', bedingung: (s) => s.muenzen >= 1,
        folge: (s) => {
          s.zahle(1);
          const neu = [
            'Auf der Nordstraße treiben sich Wegelagerer herum. Geh lieber bei Tag.',
            'Eine Karawane aus dem Süden soll diese Woche durchziehen. Die bringen Wollmäntel mit, die brauchst du hier oben.',
            'Am Moorsee sieht man nachts Lichter tanzen. Die Alten sagen, da liegt ein König begraben.',
            'Bertram sucht Steine für seine neue Esse. Er zahlt ordentlich.',
          ];
          s.sage(`Ida beugt sich vor: „${neu[Math.floor(Math.random() * neu.length)]}“`);
        },
      },
      { taste: 'Q', text: 'Auf Wiedersehen' },
    ],
  },
  {
    id: 'gespraech-gerold',
    wiederholbar: true, sperre: 0,
    wann: () => false,
    text: (s) => (s.weiss('gerold-gelesen')
      ? '„Der Norden, mein Freund. Die Graufels-Berge. Aber geh nicht ohne gutes Werkzeug und ohne Vorräte, dort oben ist es kalt.“'
      : s.hat('kartenteil_1')
        ? 'Ein alter Mann mit weißem Bart blinzelt dich an. „Man sagt, du hättest etwas, das ich lesen soll? Zeig her.“'
        : 'Ein alter Mann mit weißem Bart blinzelt dich an. „Gerold, Kartenleser. Wenn du Karten hast, die keiner versteht, bist du bei mir richtig.“'),
    optionen: [
      {
        taste: 'E', text: 'Ihm Pergament und Kartenteil zeigen',
        bedingung: (s) => s.hat('kartenteil_1') && !s.weiss('gerold-gelesen'),
        folge: (s) => {
          s.merke('gerold-gelesen');
          s.gibErfahrung(60);
          s.sage('Gerold hält beide Stücke ins Licht. „Die Schrift der Alten Könige. Das hier ist der Weiher, das die Straße, '
            + 'und diese Zacken … die Graufels-Berge im Norden. Dort, in einer Höhle, liegt das nächste Stück. Sieben sind es insgesamt.“');
        },
      },
      {
        taste: 'R', text: 'Bridas Brief übergeben', braucht: 'brief',
        folge: (s) => {
          s.nimm('brief');
          s.merke('brief-abgegeben');
          s.merke('geruecht-krone');
          s.sage('Gerold bricht das Siegel und wird blass. „Brida lebt … Sie schreibt, dass im Osten jemand die Teile der Karte sammelt. '
            + 'Einer mit einer Krone im Wappen. Sei vorsichtig, wem du dein Pergament zeigst.“');
        },
      },
      { taste: 'Q', text: 'Auf Wiedersehen' },
    ],
  },
  {
    id: 'gespraech-marta',
    wiederholbar: true, sperre: 0,
    wann: () => false,
    text: '„Willkommen auf dem Markt von Erlenbach! Brot, Schnur, Salben, eine Angelrute? Und was du nicht mehr brauchst, kaufe ich dir ab.“',
    optionen: [
      { taste: 'E', text: 'Handeln', folge: (s) => s.handel('marta') },
      { taste: 'R', text: 'Gibt es Arbeit?', bedingung: (s) => !s.aufgabeAktiv('auftrag_holz'), folge: (s) => s.starteAufgabe('auftrag_holz') },
      {
        taste: 'T', text: '8 Holzscheite abgeben', braucht: 'holzscheit', menge: 8, bedingung: (s) => s.aufgabeAktiv('auftrag_holz'),
        folge: (s) => { s.nimm('holzscheit', 8); s.merke('abgegeben-holz'); s.sage('„Damit backe ich eine Woche lang. Hier, dein Lohn.“'); },
      },
      {
        taste: 'F', text: '5 Kamille für Hilde abgeben', braucht: 'kamille', menge: 5, bedingung: (s) => s.aufgabeAktiv('kamille_marta'),
        folge: (s) => { s.nimm('kamille', 5); s.merke('kamille-abgegeben'); s.sage('„Für Hilde? Gott segne dich. Der Fuhrmann bringt sie ihr noch heute. Nimm die Salbe, sie wollte es so.“'); },
      },
      { taste: 'Q', text: 'Tschüss' },
    ],
  },
  {
    id: 'gespraech-jost',
    wiederholbar: true, sperre: 0,
    wann: () => false,
    text: (s) => (s.hat('angelrute')
      ? '„Na, beißen sie? Wirf die Angel aus und warte, bis der Schwimmer zuckt. Dann sofort ziehen!“'
      : '„Ohne Angel kein Fisch, so einfach ist das. Ich verkauf dir eine, wenn du magst. Fische kaufe ich dir besser ab als jeder andere.“'),
    optionen: [
      { taste: 'E', text: 'Handeln', folge: (s) => s.handel('jost') },
      { taste: 'R', text: 'Gibt es Arbeit?', bedingung: (s) => !s.aufgabeAktiv('auftrag_fische'), folge: (s) => s.starteAufgabe('auftrag_fische') },
      {
        taste: 'T', text: '5 Fische abgeben', bedingung: (s) => s.aufgabeAktiv('auftrag_fische') && s.fische() >= 5,
        folge: (s) => { s.gibFischeAb(5); s.merke('abgegeben-fische'); s.sage('„Prächtige Fische! Hier, wie versprochen.“'); },
      },
      { taste: 'Q', text: 'Tschüss' },
    ],
  },
];

export function alleEreignisse() {
  // Begegnungen kommen nie von selbst über wann(), sondern über src/ereignisse/begegnungen.js
  const begegnungen = BEGEGNUNGEN.map((b) => ({ wann: () => false, wiederholbar: !b.einmal, sperre: 0, ...b }));
  return [...GESCHICHTE, ...MOOR_EREIGNISSE, ...DORF_EREIGNISSE, ...GESPRAECHE, ...begegnungen];
}
