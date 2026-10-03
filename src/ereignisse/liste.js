// Alle Ereignisse der Welt. Hier wächst das Spiel.
//
// Ein Ereignis hat:
//   id       – eindeutiger Name, kleingeschrieben
//   wann(s)  – ab wann es auftaucht. s weiß: s.gelaufen (Meter), s.nahe(x, z, radius),
//              s.hat('Ding'), s.erledigt('id')
//   text     – was der Spieler liest
//   optionen – Entscheidungen, jede mit Taste, Text und optional:
//              folge(s)   – was passiert: s.gib('Ding'), s.nimm('Ding'), s.sage('Nachricht')
//              braucht    – ein Ding, ohne das die Option nicht geht
//              spaeter    – true: das Ereignis kommt nach einer Weile wieder
//
// Reihenfolge zählt: Treffen mehrere zu, kommt das obere zuerst.
import { TEICH } from '../welt/gelaende.js';
import { ALTER_BAUM } from '../welt/orte.js';

export const EREIGNISSE = [
  {
    id: 'erwachen',
    wann: () => true,
    text: 'Du wachst im hohen Gras auf. Die Sonne steht schon über den Hügeln. '
      + 'Außer einem Lendenschurz trägst du nichts, und du weißt nicht, wie du hierhergekommen bist.',
    optionen: [
      { taste: 'E', text: 'Aufstehen', folge: (s) => s.sage('Sieh dich um. Irgendwo muss es Spuren geben.') },
    ],
  },
  {
    id: 'feuerstein',
    wann: (s) => s.gelaufen > 20,
    text: 'Zwischen den Halmen glänzt etwas Scharfkantiges: ein Feuerstein, so groß wie deine Faust.',
    optionen: [
      { taste: 'E', text: 'Aufheben', folge: (s) => s.gib('Feuerstein') },
      { taste: 'Q', text: 'Liegen lassen' },
    ],
  },
  {
    id: 'teich',
    wann: (s) => s.nahe(TEICH.x, TEICH.z, TEICH.radius + 5),
    text: 'Ein kleiner Teich. Das Wasser ist klar und kalt. Im Schlamm am Ufer sind Spuren von Tieren.',
    optionen: [
      { taste: 'E', text: 'Trinken', folge: (s) => s.sage('Du trinkst. Das Wasser schmeckt nach Erde und Stein.') },
      { taste: 'Q', text: 'Weitergehen' },
    ],
  },
  {
    id: 'ast',
    wann: (s) => s.nahe(ALTER_BAUM.x, ALTER_BAUM.z, 8),
    text: 'Unter dem alten Baum liegt ein gerader, abgebrochener Ast, fast so lang wie du.',
    optionen: [
      { taste: 'E', text: 'Mitnehmen', folge: (s) => s.gib('Ast') },
      { taste: 'Q', text: 'Liegen lassen' },
    ],
  },
  {
    id: 'speer',
    wann: (s) => s.hat('Feuerstein') && s.hat('Ast'),
    text: 'Mit der scharfen Kante des Feuersteins könntest du den Ast anspitzen. Es wäre dein erstes Werkzeug.',
    optionen: [
      {
        taste: 'E', text: 'Speer schnitzen', braucht: 'Ast',
        folge: (s) => { s.nimm('Ast'); s.gib('Einfacher Speer'); s.sage('Nach einer Weile hältst du einen groben Speer in der Hand.'); },
      },
      { taste: 'Q', text: 'Später', spaeter: true },
    ],
  },
];
