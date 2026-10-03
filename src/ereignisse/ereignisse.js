// Prüft laufend, ob ein Ereignis aus liste.js zutrifft, zeigt es an
// und führt die gewählte Option aus. Inhalte gehören in liste.js, nicht hierher.
import { alleEreignisse } from './liste.js';
import { zeit } from '../welt/tageszeit.js';

const WIEDERKEHR = 30; // Sekunden, bis ein „Später“-Ereignis wiederkommt

// welt: { ueberleben, inventar, fortschritt, herstellen, aufgaben, einsiedler } – aufgaben und
// einsiedler kommen erst später dazu, darum wird immer frisch nachgeschlagen.
export function erzeugeEreignisse({ steuerung, oberflaeche, welt }) {
  const EREIGNISSE = alleEreignisse();
  const erledigt = new Set();
  const merker = new Set();
  const sperre = new Map(); // id -> Zeitpunkt, ab dem es wieder darf
  let aktuell = null;
  let uhr = 0, pruefTakt = 0;

  const s = {
    get gelaufen() { return steuerung.zustand.gelaufen; },
    get werte() { return welt.ueberleben.werte; },
    get stunde() { return zeit.stunde; },
    get nacht() { return zeit.hell < 0.3; },
    get stufe() { return welt.fortschritt.stufe; },
    nahe: (x, z, r) => Math.hypot(steuerung.zustand.ort.x - x, steuerung.zustand.ort.z - z) < r,
    hat: (id, n = 1) => welt.inventar.hat(id, n),
    anzahl: (id) => welt.inventar.anzahl(id),
    gib: (id, n = 1) => welt.inventar.gib(id, n),
    nimm: (id, n = 1) => welt.inventar.nimm(id, n),
    gibMuenzen: (n) => { welt.inventar.gibMuenzen(n); oberflaeche.gewinn(`+${n} Kupfer`, 'muenzen'); },
    gibErfahrung: (n) => { oberflaeche.gewinn(`+${welt.fortschritt.gibErfahrung(n)} Erfahrung`, 'erfahrung'); },
    hergestellt: (id) => welt.fortschritt.hergestellt(id),
    stelleHer: (rezeptId) => welt.herstellen.stelleHer(welt.herstellen.rezept(rezeptId)),
    erledigt: (id) => erledigt.has(id),
    weiss: (m) => merker.has(m),
    merke: (m) => merker.add(m),
    sage: (text) => oberflaeche.nachricht(text),
    esse: (n) => welt.ueberleben.esse(n),
    trinke: (n) => welt.ueberleben.trinke(n),
    waerme: (n) => welt.ueberleben.waerme(n),
    winke: () => welt.einsiedler?.winke(),
    get einsiedlerDa() { return !!welt.einsiedler; },
    starteAufgabe: (id) => welt.aufgaben.starte(id),
    aufgabeAktiv: (id) => welt.aufgaben.istAktiv(id),
    aufgabeErledigt: (id) => welt.aufgaben.istErledigt(id),
    schrittVon: (id) => welt.aufgaben.schrittVon(id),
  };

  function schliesse(ereignis, option) {
    aktuell = null;
    oberflaeche.versteckeEreignis();
    if (option?.spaeter || ereignis.wiederholbar) sperre.set(ereignis.id, uhr + (ereignis.sperre ?? WIEDERKEHR));
    else erledigt.add(ereignis.id);
  }

  function waehle(option) {
    if (!aktuell) return;
    if (!moeglich(option)) return;
    const ereignis = aktuell;
    schliesse(ereignis, option);
    option.folge?.(s);
  }

  function moeglich(o) {
    if (o.braucht && !s.hat(o.braucht, o.menge ?? 1)) return false;
    if (o.bedingung && !o.bedingung(s)) return false;
    return true;
  }

  // Eine offene Tafel bekommt ihre Tasten zuerst; „Benutzen“ (auch E) geht dann leer aus
  addEventListener('keydown', (e) => {
    if (!aktuell || e.repeat) return;
    const option = aktuell.optionen.find((o) => `Key${o.taste}` === e.code);
    if (!option) return;
    e.stopImmediatePropagation();
    waehle(option);
  });

  function schritt(dt) {
    uhr += dt;
    pruefTakt -= dt;
    // Wer weggeht, lässt das Ereignis hinter sich (es kommt später wieder)
    if (aktuell && aktuell.bleibt && !aktuell.bleibt(s)) {
      const e = aktuell;
      aktuell = null;
      oberflaeche.versteckeEreignis();
      sperre.set(e.id, uhr + 3);
    }
    if (aktuell || !steuerung.zustand.aktiv || pruefTakt > 0) return;
    pruefTakt = 0.25;
    const naechstes = EREIGNISSE.find((e) => !erledigt.has(e.id) && !((sperre.get(e.id) ?? 0) > uhr) && e.wann(s));
    if (naechstes) {
      aktuell = naechstes;
      naechstes.beimZeigen?.(s);
      oberflaeche.zeigeEreignis(naechstes, (o) => waehle(o), moeglich);
    }
  }

  // Schließt eine offene Tafel (z. B. beim Tod); sie kommt später wieder
  function vergiss() {
    if (!aktuell) return;
    sperre.set(aktuell.id, uhr + 3);
    aktuell = null;
    oberflaeche.versteckeEreignis();
  }

  return {
    schritt,
    s,
    vergiss,
    get aktuell() { return aktuell?.id ?? null; },
    erledigt,
    merker,
    speichern: () => ({ erledigt: [...erledigt], merker: [...merker] }),
    laden(daten) {
      erledigt.clear();
      merker.clear();
      for (const id of daten?.erledigt ?? []) erledigt.add(id);
      for (const m of daten?.merker ?? []) merker.add(m);
    },
  };
}
