// „Benutzen“ (Taste E oder der große Knopf): das Naheliegende tun – jemanden ansprechen, angeln,
// aufheben, pflücken, Holz hacken, trinken. Was eine Stelle hergibt, steht in src/inhalte/sammelstellen.js.
// Weitere Möglichkeiten (Gespräche, Angeln) kommen als „zusatz“ herein; sie gehen den Sammelstellen vor.
import { SAMMELSTELLEN } from '../inhalte/sammelstellen.js';
import { benenne } from '../inhalte/gegenstaende.js';
import { hoeheBei, wasserspiegel } from '../welt/gelaende.js';

const PAUSE = 0.3; // Sekunden zwischen zwei Benutzungen

// „Kamille pflücken“ → „Pflücken“ (für den Knopf)
const kurz = (aktion) => {
  const wort = aktion.split(' ').at(-1);
  return wort[0].toUpperCase() + wort.slice(1);
};

export function erzeugeBenutzen({ sammeln, inventar, fortschritt, ueberleben, merke, nachricht = () => {}, gewinn = () => {}, zusatz = [], beiErnte = () => {} }) {
  const wsp = wasserspiegel();
  let warten = 0;

  // Mit dem passenden Werkzeug geht an manchen Stellen etwas anderes (z. B. mit der Axt Holz hacken)
  function regel(stelle) {
    const r = SAMMELSTELLEN[stelle.art];
    if (r.mitWerkzeug && inventar.werkzeugStufe(r.mitWerkzeug.art) > 0) return { ...r, ...r.mitWerkzeug };
    return r;
  }

  // Steht man am Ufer? (Ein Punkt direkt vor einem liegt unter dem Wasserspiegel)
  function amWasser(ort) {
    for (const [dx, dz] of [[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]]) {
      if (hoeheBei(ort.x + dx, ort.z + dz) < wsp - 0.02) return true;
    }
    return false;
  }

  function ernte(stelle) {
    const r = regel(stelle);
    const beute = { ...r.gibt };
    const erstes = Object.keys(beute)[0];
    if (r.mitMesser && inventar.werkzeugStufe('messer') > 0) beute[erstes] += r.mitMesser;
    if (Math.random() < fortschritt.wirkung.mehrErtrag(r.beruf)) beute[erstes] += 1;
    for (const [id, chance] of Object.entries(r.selten ?? {})) if (Math.random() < chance) beute[id] = (beute[id] ?? 0) + 1;
    const bekommen = [];
    for (const [id, n] of Object.entries(beute)) {
      const k = inventar.gib(id, n, { leise: true });
      if (k > 0) bekommen.push([id, k]);
    }
    if (!bekommen.length) return false; // kein Platz; das Inventar hat es schon gesagt
    sammeln.nimm(stelle, r.nachwachsen);
    for (const [id, k] of bekommen) gewinn(`+${benenne(id, k)}`, id);
    const ep = fortschritt.gibErfahrung(r.erfahrung, r.beruf);
    gewinn(`+${ep} Erfahrung`, 'erfahrung');
    beiErnte(r);
    return true;
  }

  function trinke() {
    if (ueberleben.werte.wasser > 97) { nachricht('Du hast keinen Durst.'); return false; }
    ueberleben.trinke(35);
    merke('getrunken');
    gewinn('+35 Wasser', 'wasser');
    return true;
  }

  // Was ginge hier gerade? { text, kurz, tue() } oder null
  function vorschlag(ort, blickSeite) {
    for (const quelle of zusatz) {
      const v = quelle(ort, blickSeite);
      if (v) return v;
    }
    if (amWasser(ort)) return { text: 'Wasser trinken', kurz: 'Trinken', tue: trinke };
    const stelle = sammeln.naechste(ort, blickSeite);
    if (!stelle) return null;
    const r = regel(stelle);
    return { text: r.aktion, kurz: kurz(r.aktion), stelle, tue: () => ernte(stelle) };
  }

  return {
    vorschlag,
    amWasser,
    schritt(dt) { warten = Math.max(0, warten - dt); },
    // Ist die kurze Pause nach dem letzten Benutzen vorbei?
    get bereit() { return warten <= 0; },
    // Führt den Vorschlag aus (wenn gerade einer da ist)
    benutze(ort, blickSeite) {
      if (warten > 0) return false;
      const v = vorschlag(ort, blickSeite);
      if (!v) return false;
      warten = PAUSE;
      return v.tue();
    },
  };
}
