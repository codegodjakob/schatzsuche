// Kaufen und Verkaufen bei den Händlern (src/inhalte/haendler.js). Wer gut reden kann (Ausstrahlung),
// zahlt weniger und bekommt mehr. Wer an einem Tag viel vom Gleichen verkauft, bekommt für jedes weitere
// Stück etwas weniger, höchstens halb so viel.
import { ANKAUF, ANKAUF_GUT, AUFSCHLAG, HAENDLER, SAETTIGUNG } from '../inhalte/haendler.js';
import { gegenstand } from '../inhalte/gegenstaende.js';
import { zeit } from '../welt/tageszeit.js';

export function erzeugeHandel({ inventar, fortschritt, nachricht = () => {}, gewinn = () => {} }) {
  const verkauft = new Map(); // "händler:id" -> Stück heute
  let tag = zeit.tag;
  const heute = () => { if (zeit.tag !== tag) { verkauft.clear(); tag = zeit.tag; } };

  const kaufpreis = (h, id) => Math.max(1, Math.ceil(gegenstand(id).wert * AUFSCHLAG * fortschritt.wirkung.preisFaktor()));

  function verkaufspreis(h, id) {
    heute();
    const g = gegenstand(id);
    if (g.art === 'aufgabe' || !g.wert) return 0;
    const satz = HAENDLER[h].kauftGut?.(g) ? ANKAUF_GUT : ANKAUF;
    const schon = verkauft.get(`${h}:${id}`) ?? 0;
    return Math.max(1, Math.floor((g.wert * satz / fortschritt.wirkung.preisFaktor()) * Math.max(0.5, 1 - SAETTIGUNG * schon)));
  }

  function kaufe(h, id) {
    const preis = kaufpreis(h, id);
    if (inventar.muenzen < preis) { nachricht('Dafür reicht dein Kupfer nicht.'); return false; }
    if (inventar.passt(id, 1) < 1) { nachricht('Dafür ist kein Platz mehr im Inventar.'); return false; }
    inventar.zahle(preis);
    inventar.gib(id, 1, { leise: true });
    gewinn(`+${gegenstand(id).name}`, id);
    gewinn(`−${preis} Kupfer`, 'muenzen');
    return true;
  }

  function verkaufe(h, id, n = 1) {
    let summe = 0, stueck = 0;
    for (; stueck < n && inventar.hat(id); stueck++) {
      const preis = verkaufspreis(h, id);
      if (!preis) break;
      inventar.nimm(id, 1);
      inventar.gibMuenzen(preis);
      summe += preis;
      verkauft.set(`${h}:${id}`, (verkauft.get(`${h}:${id}`) ?? 0) + 1);
    }
    if (stueck) gewinn(`+${summe} Kupfer`, 'muenzen');
    return summe;
  }

  return { kaufpreis, verkaufspreis, kaufe, verkaufe, haendler: (h) => HAENDLER[h] };
}
