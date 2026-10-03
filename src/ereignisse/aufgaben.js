// Führt die Aufgaben aus src/inhalte/aufgaben.js: starten, Schritte abhaken, belohnen.
// Eine Aufgabe wird immer „verfolgt“: ihr nächster Schritt steht am Bildschirmrand.
import { AUFGABEN, aufgabe } from '../inhalte/aufgaben.js';
import { benenne } from '../inhalte/gegenstaende.js';

export function erzeugeAufgaben({ s, inventar, fortschritt, nachricht = () => {}, beiErfuellt = null, beiAenderung = () => {} }) {
  const aktiv = new Map(); // id -> Index des aktuellen Schritts (Reihenfolge = Startreihenfolge)
  const erledigt = new Set();
  let verfolgt = null;

  function waehleVerfolgte() {
    const offen = [...aktiv.keys()];
    // Die neueste Nebenaufgabe zuerst, sonst die Hauptgeschichte
    verfolgt = offen.filter((id) => !aufgabe(id).haupt).at(-1) ?? offen.at(-1) ?? null;
  }

  function starte(id, { leise = false } = {}) {
    if (aktiv.has(id) || erledigt.has(id)) return;
    aufgabe(id); // wirft bei Tippfehlern
    aktiv.set(id, 0);
    if (!leise) nachricht(`Neue Aufgabe: ${aufgabe(id).titel}`);
    waehleVerfolgte();
    pruefe();
    beiAenderung();
  }

  function schliesseAb(id) {
    const a = aufgabe(id);
    aktiv.delete(id);
    erledigt.add(id);
    const b = a.belohnung ?? {};
    const teile = [];
    if (b.erfahrung) teile.push(`+${fortschritt.gibErfahrung(b.erfahrung)} Erfahrung`);
    if (b.muenzen) { inventar.gibMuenzen(b.muenzen); teile.push(`+${b.muenzen} Kupfer`); }
    for (const [ding, n] of Object.entries(b.gegenstaende ?? {})) { inventar.gib(ding, n, { leise: true }); teile.push(benenne(ding, n)); }
    if (beiErfuellt) beiErfuellt(a, teile);
    else nachricht(`Aufgabe erfüllt: ${a.titel}${teile.length ? ` (${teile.join(', ')})` : ''}`);
    for (const weiter of a.danach ?? []) starte(weiter);
    waehleVerfolgte();
  }

  // Hakt erledigte Schritte ab; wird regelmäßig aufgerufen
  function pruefe() {
    let geaendert = false;
    for (const [id, index] of [...aktiv]) {
      const a = aufgabe(id);
      let i = index;
      while (i < a.schritte.length && a.schritte[i].fertig(s)) i += 1;
      if (i === index) continue;
      geaendert = true;
      if (i >= a.schritte.length) schliesseAb(id);
      else aktiv.set(id, i);
    }
    if (geaendert) beiAenderung();
  }

  const text = (schritt) => (typeof schritt.text === 'function' ? schritt.text(s) : schritt.text);

  // Für die Anzeige
  function ansicht(id) {
    const a = aufgabe(id);
    const index = erledigt.has(id) ? a.schritte.length : aktiv.get(id) ?? 0;
    return {
      id, titel: a.titel, geber: a.geber, haupt: !!a.haupt, beschreibung: a.beschreibung,
      erledigt: erledigt.has(id),
      schritte: a.schritte.slice(0, index + 1).map((st, k) => ({ text: text(st), fertig: k < index })),
      ort: a.schritte[index]?.ort ?? null,
    };
  }

  return {
    starte, pruefe, ansicht,
    aktive: () => [...aktiv.keys()].map(ansicht),
    erledigte: () => [...erledigt].map(ansicht),
    istAktiv: (id) => aktiv.has(id),
    istErledigt: (id) => erledigt.has(id),
    schrittVon: (id) => aktiv.get(id) ?? -1,
    get verfolgt() { return verfolgt ? ansicht(verfolgt) : null; },
    verfolge(id) { if (aktiv.has(id)) { verfolgt = id; beiAenderung(); } },
    speichern: () => ({ aktiv: [...aktiv], erledigt: [...erledigt], verfolgt }),
    laden(daten) {
      aktiv.clear();
      erledigt.clear();
      // Aufgaben, die es nicht mehr gibt (älterer Spielstand), werden übergangen
      const gibt = (id) => AUFGABEN.some((a) => a.id === id);
      for (const [id, i] of daten?.aktiv ?? []) if (gibt(id)) aktiv.set(id, Math.min(Math.max(0, i | 0), aufgabe(id).schritte.length - 1));
      for (const id of daten?.erledigt ?? []) if (gibt(id)) erledigt.add(id);
      verfolgt = aktiv.has(daten?.verfolgt) ? daten.verfolgt : null;
      if (!verfolgt) waehleVerfolgte();
      beiAenderung();
    },
  };
}
