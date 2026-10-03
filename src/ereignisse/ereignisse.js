// Prüft laufend, ob ein Ereignis aus liste.js zutrifft, zeigt es an
// und führt die gewählte Option aus. Inhalte gehören in liste.js, nicht hierher.
import { EREIGNISSE } from './liste.js';

const WIEDERKEHR = 30; // Sekunden, bis ein „Später“-Ereignis wiederkommt

export function erzeugeEreignisse({ steuerung, oberflaeche }) {
  const inventar = new Map();
  const erledigt = new Set();
  const spaeter = new Map(); // id -> Zeitpunkt, ab dem es wieder darf
  let aktuell = null;
  let uhr = 0, pruefTakt = 0;

  const s = {
    get gelaufen() { return steuerung.zustand.gelaufen; },
    nahe: (x, z, r) => Math.hypot(steuerung.zustand.ort.x - x, steuerung.zustand.ort.z - z) < r,
    hat: (ding) => (inventar.get(ding) ?? 0) > 0,
    erledigt: (id) => erledigt.has(id),
    gib: (ding, n = 1) => {
      inventar.set(ding, (inventar.get(ding) ?? 0) + n);
      oberflaeche.zeigeInventar(inventar);
      oberflaeche.nachricht(`${ding} ins Inventar gelegt`);
    },
    nimm: (ding, n = 1) => {
      const rest = (inventar.get(ding) ?? 0) - n;
      if (rest > 0) inventar.set(ding, rest); else inventar.delete(ding);
      oberflaeche.zeigeInventar(inventar);
    },
    sage: (text) => oberflaeche.nachricht(text),
  };

  function waehle(option) {
    if (!aktuell) return;
    if (option.braucht && !s.hat(option.braucht)) return;
    const ereignis = aktuell;
    aktuell = null;
    oberflaeche.versteckeEreignis();
    if (option.spaeter) spaeter.set(ereignis.id, uhr + WIEDERKEHR);
    else erledigt.add(ereignis.id);
    option.folge?.(s);
  }

  addEventListener('keydown', (e) => {
    if (!aktuell || e.repeat) return;
    const option = aktuell.optionen.find((o) => `Key${o.taste}` === e.code);
    if (option) waehle(option);
  });

  function schritt(dt) {
    uhr += dt;
    pruefTakt -= dt;
    if (aktuell || !steuerung.zustand.aktiv || pruefTakt > 0) return;
    pruefTakt = 0.25;
    const naechstes = EREIGNISSE.find((e) => !erledigt.has(e.id) && !((spaeter.get(e.id) ?? 0) > uhr) && e.wann(s));
    if (naechstes) {
      aktuell = naechstes;
      oberflaeche.zeigeEreignis(naechstes, (o) => waehle(o), (o) => !o.braucht || s.hat(o.braucht));
    }
  }

  return {
    schritt,
    inventar,
    get aktuell() { return aktuell?.id ?? null; },
    erledigt,
  };
}
