// Erfahrung, Stufen, Statuspunkte und Berufe. Hier steht auch, was die Werte bewirken.
import { BERUFE, BERUFSRAENGE, WERTE } from '../inhalte/berufe.js';

// Erfahrung für den Schritt von Stufe n auf n + 1: die ersten Stufen kommen schnell, dann langsamer
export const erfahrungFuer = (stufe) => Math.round(40 * stufe ** 1.7);
// Berufe: Erfahrung für den Schritt von Berufsstufe n auf n + 1
export const berufsErfahrungFuer = (stufe) => Math.round(18 * stufe ** 1.5);
const PUNKTE_JE_STUFE = 3;

export function erzeugeFortschritt({ beiStufe = () => {}, beiBerufsstufe = () => {}, beiAenderung = () => {} } = {}) {
  const z = {
    stufe: 1,
    erfahrung: 0, // innerhalb der aktuellen Stufe
    punkte: 0, // noch zu verteilende Statuspunkte
    werte: Object.fromEntries(Object.keys(WERTE).map((w) => [w, 1])),
    berufe: Object.fromEntries(Object.keys(BERUFE).map((b) => [b, { stufe: 1, erfahrung: 0 }])),
    hergestellt: {}, // id -> wie oft
    besiegt: {}, // Gegnerart -> wie oft
  };

  // Wirkungen der Werte (jeder Punkt über 1 zählt)
  const ueber = (w) => z.werte[w] - 1;
  const wirkung = {
    erfahrungsFaktor: () => 1 + 0.05 * ueber('verstand'),
    zehrFaktor: () => Math.max(0.5, 1 - 0.04 * ueber('ausdauer')),
    heilFaktor: () => 1 + 0.1 * ueber('ausdauer'),
    mehrErtrag: (beruf) => {
      // Chance auf ein Stück mehr beim Sammeln
      const staerke = beruf === 'holzfaellen' || beruf === 'sammeln' ? 0.04 * ueber('staerke') : 0;
      return Math.min(0.6, staerke + 0.03 * (berufsStufe(beruf) - 1));
    },
    mehrHergestellt: () => Math.min(0.4, 0.04 * ueber('geschick')),
    // Kampf: Stärke macht Schläge härter, Geschick bringt Volltreffer (doppelter Schaden)
    schlagFaktor: () => 1 + 0.08 * ueber('staerke'),
    volltreffer: () => Math.min(0.4, 0.05 + 0.025 * ueber('geschick')),
    preisFaktor: () => Math.max(0.7, 1 - 0.03 * ueber('ausstrahlung')),
  };

  function gibErfahrung(n, beruf) {
    const echt = Math.max(1, Math.round(n * wirkung.erfahrungsFaktor()));
    z.erfahrung += echt;
    while (z.erfahrung >= erfahrungFuer(z.stufe)) {
      z.erfahrung -= erfahrungFuer(z.stufe);
      z.stufe += 1;
      z.punkte += PUNKTE_JE_STUFE;
      beiStufe(z.stufe);
    }
    if (beruf && z.berufe[beruf]) {
      const b = z.berufe[beruf];
      b.erfahrung += echt;
      while (b.erfahrung >= berufsErfahrungFuer(b.stufe)) {
        b.erfahrung -= berufsErfahrungFuer(b.stufe);
        b.stufe += 1;
        beiBerufsstufe(beruf, b.stufe);
      }
    }
    beiAenderung();
    return echt;
  }

  function verteile(wert) {
    if (z.punkte <= 0 || !(wert in z.werte)) return false;
    z.punkte -= 1;
    z.werte[wert] += 1;
    beiAenderung();
    return true;
  }

  function berufsStufe(beruf) { return z.berufe[beruf]?.stufe ?? 1; }
  function berufsRang(beruf) {
    const s = berufsStufe(beruf);
    return [...BERUFSRAENGE].reverse().find((r) => s >= r.ab).name;
  }

  function merkeHergestellt(id, n = 1) {
    z.hergestellt[id] = (z.hergestellt[id] ?? 0) + n;
  }
  function merkeBesiegt(art) {
    z.besiegt[art] = (z.besiegt[art] ?? 0) + 1;
    beiAenderung();
  }

  return {
    zustand: z,
    wirkung,
    gibErfahrung, verteile, berufsStufe, berufsRang, merkeHergestellt, merkeBesiegt,
    hergestellt: (id) => z.hergestellt[id] ?? 0,
    besiegt: (art) => z.besiegt[art] ?? 0,
    get stufe() { return z.stufe; },
    speichern: () => JSON.parse(JSON.stringify(z)),
    laden(daten) {
      if (!daten) return;
      z.stufe = daten.stufe ?? 1;
      z.erfahrung = daten.erfahrung ?? 0;
      z.punkte = daten.punkte ?? 0;
      for (const w of Object.keys(z.werte)) z.werte[w] = daten.werte?.[w] ?? 1;
      for (const b of Object.keys(z.berufe)) z.berufe[b] = { stufe: daten.berufe?.[b]?.stufe ?? 1, erfahrung: daten.berufe?.[b]?.erfahrung ?? 0 };
      z.hergestellt = { ...(daten.hergestellt ?? {}) };
      z.besiegt = { ...(daten.besiegt ?? {}) };
      beiAenderung();
    },
  };
}
