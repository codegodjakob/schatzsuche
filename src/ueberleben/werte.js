// Überleben (Issue #3): Sättigung, Wasser, Wärme, Leben. Alles in Prozent (0..100).
// Hunger und Durst wachsen mit der Zeit (beim Rennen schneller), nachts wird es kalt,
// am Feuer warm. Ist ein Wert leer, schwindet das Leben. Bei 0 stirbt man.
import { zeit } from '../welt/tageszeit.js';

export const START_WERTE = { saettigung: 80, wasser: 75, waerme: 100, leben: 100 };

// Prozent je echter Sekunde
const HUNGER = 100 / (40 * 60);
const DURST = 100 / (25 * 60);
const AUSKUEHLEN = 100 / (6 * 60);

// zehrFaktor / heilFaktor: wie schnell Hunger, Durst und Kälte zehren und das Leben heilt (Ausdauer)
export function erzeugeUeberleben({ beiTod, beiWarnung, zehrFaktor = () => 1, heilFaktor = () => 1, kaelteSchutz = () => 0 }) {
  const w = { ...START_WERTE };
  const warnungen = new Set();
  let waermequellen = [];
  let tot = false;

  function warne(schluessel, text, bedingung) {
    if (bedingung && !warnungen.has(schluessel)) { warnungen.add(schluessel); beiWarnung(text); }
    if (!bedingung) warnungen.delete(schluessel);
  }

  function amFeuer(ort) {
    return waermequellen.some((f) => f.brennt() && f.ort.distanceTo(ort) < 4.5);
  }

  function schritt(dt, { ort, tempo }) {
    if (tot) return;
    const anstrengung = (tempo > 3 ? 1.8 : tempo > 0.5 ? 1.15 : 1) * zehrFaktor();
    w.saettigung = Math.max(0, w.saettigung - HUNGER * anstrengung * dt);
    w.wasser = Math.max(0, w.wasser - DURST * anstrengung * dt);
    const feuer = amFeuer(ort);
    const nacht = 1 - zeit.hell;
    if (feuer) w.waerme = Math.min(100, w.waerme + 4 * dt);
    else if (nacht > 0.4) w.waerme = Math.max(0, w.waerme - AUSKUEHLEN * nacht * (tempo > 0.5 ? 0.7 : 1) * zehrFaktor() * (1 - kaelteSchutz()) * dt);
    else w.waerme = Math.min(100, w.waerme + 0.6 * dt);

    const leer = (w.saettigung <= 0) + (w.wasser <= 0) + (w.waerme <= 0);
    if (leer) w.leben = Math.max(0, w.leben - 0.55 * leer * dt);
    else if (w.saettigung > 30 && w.wasser > 30 && w.waerme > 30) w.leben = Math.min(100, w.leben + 0.25 * heilFaktor() * dt);

    warne('hunger', 'Dein Magen knurrt. Du solltest etwas essen.', w.saettigung < 25);
    warne('durst', 'Deine Kehle ist trocken. Du brauchst Wasser.', w.wasser < 25);
    warne('kalt', 'Dir ist kalt. Such ein Feuer.', w.waerme < 40);
    warne('leben', 'Du wirst schwach …', w.leben < 30);

    if (w.leben <= 0) {
      tot = true;
      const grund = w.wasser <= 0 ? 'verdurstet' : w.saettigung <= 0 ? 'verhungert' : 'erfroren';
      beiTod(grund);
    }
  }

  return {
    werte: w,
    schritt,
    get tot() { return tot; },
    erschoepft: () => w.saettigung < 15 || w.wasser < 15 || w.waerme < 15 || w.leben < 30,
    esse: (n) => { w.saettigung = Math.min(100, w.saettigung + n); },
    trinke: (n) => { w.wasser = Math.min(100, w.wasser + n); },
    waerme: (n) => { w.waerme = Math.min(100, w.waerme + n); },
    heile: (n) => { w.leben = Math.min(100, w.leben + n); },
    // Schaden von außen (Schläge); grund steht auf dem Bildschirm: „Du bist …“
    verletze(n, grund = 'gestorben') {
      if (tot) return;
      w.leben = Math.max(0, w.leben - n);
      warne('leben', 'Du wirst schwach …', w.leben < 30);
      if (w.leben <= 0) { tot = true; beiTod(grund); }
    },
    // Aus dem Spielstand
    setze(werte) { for (const k of Object.keys(w)) if (Number.isFinite(werte?.[k])) w[k] = Math.min(100, Math.max(1, werte[k])); },
    setzeWaermequellen: (liste) => { waermequellen = liste; },
    amFeuer,
    neuBeginn() {
      Object.assign(w, { saettigung: 60, wasser: 60, waerme: 100, leben: 100 });
      warnungen.clear();
      tot = false;
    },
  };
}
