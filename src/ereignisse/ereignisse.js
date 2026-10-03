// Prüft laufend, ob ein Ereignis aus liste.js zutrifft, zeigt es an
// und führt die gewählte Option aus. Inhalte gehören in liste.js, nicht hierher.
import { alleEreignisse } from './liste.js';
import { zeit } from '../welt/tageszeit.js';

const WIEDERKEHR = 30; // Sekunden, bis ein „Später“-Ereignis wiederkommt

export function erzeugeEreignisse({ steuerung, oberflaeche, welt }) {
  const EREIGNISSE = alleEreignisse();
  const inventar = new Map();
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
    nahe: (x, z, r) => Math.hypot(steuerung.zustand.ort.x - x, steuerung.zustand.ort.z - z) < r,
    hat: (ding, n = 1) => (inventar.get(ding) ?? 0) >= n,
    anzahl: (ding) => inventar.get(ding) ?? 0,
    erledigt: (id) => erledigt.has(id),
    weiss: (m) => merker.has(m),
    merke: (m) => merker.add(m),
    gib: (ding, n = 1) => {
      inventar.set(ding, (inventar.get(ding) ?? 0) + n);
      oberflaeche.zeigeInventar(inventar);
      oberflaeche.nachricht(n > 1 ? `${n} × ${ding} ins Inventar gelegt` : `${ding} ins Inventar gelegt`);
    },
    nimm: (ding, n = 1) => {
      const rest = (inventar.get(ding) ?? 0) - n;
      if (rest > 0) inventar.set(ding, rest); else inventar.delete(ding);
      oberflaeche.zeigeInventar(inventar);
    },
    sage: (text) => oberflaeche.nachricht(text),
    esse: (n) => welt.ueberleben.esse(n),
    trinke: (n) => welt.ueberleben.trinke(n),
    waerme: (n) => welt.ueberleben.waerme(n),
    liegt: (id) => welt.fundstuecke.liegtNoch(id),
    hebeAuf: (id) => welt.fundstuecke.entferne(id),
    beerenDa: (i) => !welt.beerenGepflueckt.has(i),
    pfluecke: (i) => { welt.beerenGepflueckt.set(i, zeit.tag + zeit.stunde / 24 + 1); welt.natur.beeren.pfluecke(i); },
    winke: () => welt.einsiedler?.winke(),
    get einsiedlerDa() { return !!welt.einsiedler; },
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

  addEventListener('keydown', (e) => {
    if (!aktuell || e.repeat) return;
    const option = aktuell.optionen.find((o) => `Key${o.taste}` === e.code);
    if (option) waehle(option);
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

  function vergissInventar() {
    inventar.clear();
    oberflaeche.zeigeInventar(inventar);
    if (aktuell) { aktuell = null; oberflaeche.versteckeEreignis(); }
  }

  return {
    schritt,
    inventar,
    s,
    vergissInventar,
    get aktuell() { return aktuell?.id ?? null; },
    erledigt,
    merker,
  };
}
