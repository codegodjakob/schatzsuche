// Das Inventar: viele Plätze, Gleiches stapelt sich, kein Gewicht. Nur sehr schwere Dinge
// (z. B. Baumstämme) sind begrenzt. Dazu kommen das Geld und das, was man in der Hand hält.
import { ARTEN, GEGENSTAENDE, benenne, gegenstand } from '../inhalte/gegenstaende.js';

export const PLAETZE = 48;

export function erzeugeInventar({ beiAenderung = () => {}, nachricht = () => {} } = {}) {
  const dinge = new Map(); // id -> anzahl
  let muenzen = 0;
  let inHand = null; // id eines Werkzeugs oder einer Waffe

  const stapel = (id) => gegenstand(id).stapel ?? 99;
  const belegt = () => [...dinge].reduce((summe, [id, n]) => summe + Math.ceil(n / stapel(id)), 0);

  // Wie viele davon passen noch hinein?
  function passt(id, n) {
    const g = gegenstand(id);
    const hat = dinge.get(id) ?? 0;
    let moeglich = n;
    if (g.hoechstens != null) moeglich = Math.min(moeglich, Math.max(0, g.hoechstens - hat));
    const frei = PLAETZE - belegt();
    const rest = hat % stapel(id) === 0 ? 0 : stapel(id) - (hat % stapel(id)); // Platz im angebrochenen Stapel
    return Math.min(moeglich, rest + frei * stapel(id));
  }

  // Legt bis zu n Stück hinein. Gibt zurück, wie viele es wirklich waren.
  function gib(id, n = 1, { leise = false } = {}) {
    const k = passt(id, n);
    if (k > 0) {
      dinge.set(id, (dinge.get(id) ?? 0) + k);
      if (!leise) nachricht(`Ins Inventar: ${benenne(id, k)}`);
      beiAenderung();
    }
    if (k < n) {
      const g = gegenstand(id);
      nachricht(g.hoechstens != null && (dinge.get(id) ?? 0) >= g.hoechstens
        ? `Mehr als ${g.hoechstens} × ${g.name} kannst du nicht tragen.`
        : `Kein Platz mehr im Inventar für ${g.name}.`);
    }
    return k;
  }

  function nimm(id, n = 1) {
    const hat = dinge.get(id) ?? 0;
    const k = Math.min(hat, n);
    if (hat - k > 0) dinge.set(id, hat - k); else dinge.delete(id);
    if (inHand === id && !dinge.has(id)) inHand = null;
    if (k) beiAenderung();
    return k;
  }

  function gibMuenzen(n) { muenzen += n; beiAenderung(); }
  function zahle(n) {
    if (muenzen < n) return false;
    muenzen -= n;
    beiAenderung();
    return true;
  }

  function nimmInDieHand(id) {
    if (id && !dinge.has(id)) return;
    inHand = id;
    beiAenderung();
  }

  // Für die Anzeige: nach Arten sortiert, Stapel aufgeteilt
  function liste() {
    const reihenfolge = Object.keys(ARTEN);
    return [...dinge]
      .sort(([a], [b]) => reihenfolge.indexOf(gegenstand(a).art) - reihenfolge.indexOf(gegenstand(b).art)
        || gegenstand(a).name.localeCompare(gegenstand(b).name, 'de'))
      .map(([id, anzahl]) => ({ id, anzahl, ...gegenstand(id) }));
  }

  // Bester Werkzeugwert einer Art, den man dabeihat (0 = keins)
  function werkzeugStufe(art) {
    let beste = 0;
    for (const id of dinge.keys()) {
      const w = GEGENSTAENDE[id]?.werkzeug;
      if (w?.art === art) beste = Math.max(beste, w.stufe);
    }
    return beste;
  }

  // Die stärkste Waffe, die man dabeihat (id oder null = Fäuste)
  function besteWaffe() {
    let beste = null, schaden = 0;
    for (const id of dinge.keys()) {
      const w = GEGENSTAENDE[id]?.waffe;
      if (w && w.schaden > schaden) { schaden = w.schaden; beste = id; }
    }
    return beste;
  }

  // Die beste Rüstung schützt (Anteil des Schadens, der abgehalten wird)
  function schutz() {
    let beste = 0;
    for (const id of dinge.keys()) beste = Math.max(beste, GEGENSTAENDE[id]?.schutz ?? 0);
    return beste;
  }

  // Wie warm hält die Kleidung? Je Teil (oben, unten, Mantel, Füße) zählt das wärmste Stück, zusammen höchstens 70 %
  function kleidungsWaerme() {
    const teile = {};
    for (const id of dinge.keys()) {
      const k = GEGENSTAENDE[id]?.kleidung;
      if (k) teile[k.teil] = Math.max(teile[k.teil] ?? 0, k.warm);
    }
    return Math.min(0.7, Object.values(teile).reduce((a, b) => a + b, 0));
  }

  function leeren() {
    dinge.clear();
    inHand = null;
    beiAenderung();
  }

  return {
    gib, nimm, passt, liste, leeren, werkzeugStufe, besteWaffe, schutz, kleidungsWaerme, gibMuenzen, zahle, nimmInDieHand,
    hat: (id, n = 1) => (dinge.get(id) ?? 0) >= n,
    anzahl: (id) => dinge.get(id) ?? 0,
    get muenzen() { return muenzen; },
    get inHand() { return inHand; },
    get belegt() { return belegt(); },
    speichern: () => ({ dinge: [...dinge], muenzen, inHand }),
    laden(daten) {
      dinge.clear();
      for (const [id, n] of daten?.dinge ?? []) if (GEGENSTAENDE[id] && n > 0) dinge.set(id, n);
      muenzen = daten?.muenzen ?? 0;
      inHand = dinge.has(daten?.inHand) ? daten.inHand : null;
      beiAenderung();
    },
  };
}
