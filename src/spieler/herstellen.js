// Herstellen nach Rezept: prüft, was fehlt, verbraucht Zutaten, gibt Ergebnis und Erfahrung.
import { BAUWERKE, ORTE, REZEPTE } from '../inhalte/rezepte.js';
import { BERUFE } from '../inhalte/berufe.js';
import { benenne, gegenstand } from '../inhalte/gegenstaende.js';

export function erzeugeHerstellen({ inventar, fortschritt, weiss, amFeuer, baue, nachricht = () => {}, gewinn = () => {} }) {
  // Kennt man das Rezept überhaupt? (Manche lernt man erst, z. B. Feuer beim Einsiedler)
  const bekannt = (r) => !r.merker || weiss(r.merker);

  // Was fehlt noch? Leere Liste = man kann es herstellen
  function fehlt(r) {
    const liste = [];
    for (const [id, n] of Object.entries(r.zutaten)) {
      const hat = inventar.anzahl(id);
      if (hat < n) liste.push(`${n - hat} × ${gegenstand(id).name}`);
    }
    if (r.werkzeug && !r.werkzeug.some((id) => inventar.hat(id))) {
      liste.push(r.werkzeug.map((id) => gegenstand(id).name).join(' oder '));
    }
    if (r.ort === 'feuer' && !amFeuer()) liste.push('ein Feuer in der Nähe');
    const stufe = fortschritt.berufsStufe(r.beruf);
    if (stufe < r.stufe) liste.push(`${BERUFE[r.beruf].name} Stufe ${r.stufe} (jetzt ${stufe})`);
    if (r.ergebnis && inventar.passt(r.ergebnis, r.menge ?? 1) < 1) liste.push('Platz im Inventar');
    return liste;
  }

  function stelleHer(r) {
    if (!bekannt(r) || fehlt(r).length) return false;
    // Ein Bauwerk entsteht in der Welt; geht das hier nicht (z. B. im Wasser), wird nichts verbraucht
    if (r.bauwerk && baue(r.bauwerk) === false) return false;
    for (const [id, n] of Object.entries(r.zutaten)) inventar.nimm(id, n);
    if (!r.bauwerk) {
      let menge = r.menge ?? 1;
      if ((gegenstand(r.ergebnis).stapel ?? 99) > 1 && Math.random() < fortschritt.wirkung.mehrHergestellt()) menge += 1;
      inventar.gib(r.ergebnis, menge, { leise: true });
      nachricht(`Hergestellt: ${benenne(r.ergebnis, menge)}`);
      gewinn(`+${benenne(r.ergebnis, menge)}`, r.ergebnis);
    }
    fortschritt.merkeHergestellt(r.ergebnis ?? r.bauwerk);
    gewinn(`+${fortschritt.gibErfahrung(r.erfahrung, r.beruf)} Erfahrung`, 'erfahrung');
    return true;
  }

  // Für das Rezeptbuch: bekannte Rezepte, die herstellbaren zuerst
  function liste() {
    return REZEPTE.filter(bekannt)
      .map((r) => {
        const was = r.ergebnis ? gegenstand(r.ergebnis) : BAUWERKE[r.bauwerk];
        return { ...r, name: was.name, bild: was.bild, beschreibung: was.beschreibung, setzen: !!was.setzen, fehlt: fehlt(r), ortName: ORTE[r.ort] };
      })
      .sort((a, b) => (a.fehlt.length > 0) - (b.fehlt.length > 0) || a.stufe - b.stufe);
  }

  return { liste, stelleHer, fehlt, rezept: (id) => REZEPTE.find((r) => r.id === id) };
}
