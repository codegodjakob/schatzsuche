// Die Leute von Erlenbach: Gerold, Marta und Jost. Jeder steht an seinem Platz, schaut einen an,
// wenn man näher kommt, und winkt zur Begrüßung. Ansprechen geht über „Benutzen“ (src/spieler/benutzen.js).
import { ladeFigur } from '../spieler/figur.js';
import { hoeheBei } from '../welt/gelaende.js';
import { beweglichesHindernis } from '../welt/kollision.js';
import { DOERFLER, DORF } from '../welt/orte.js';

export const NAMEN = { gerold: 'Gerold', marta: 'Marta', jost: 'Jost', bertram: 'Bertram', ida: 'Ida', hrodgar: 'Hrodgar', sigrun: 'Sigrun', uldin: 'Uldin', bleda: 'Bleda' };

// liste: { art: ort } – wer wo steht; mitte: der Dorfplatz, auf den sie schauen
export async function erzeugeDoerfler(liste = DOERFLER, mitte = DORF) {
  const leute = [];
  for (const [art, ort] of Object.entries(liste)) {
    const figur = await ladeFigur(art);
    const o = figur.objekt;
    o.position.set(ort.x, hoeheBei(ort.x, ort.z), ort.z);
    const ruhe = Math.atan2(mitte.x - ort.x, mitte.z - ort.z); // schaut auf den Dorfplatz
    o.rotation.y = ruhe;
    beweglichesHindernis(o, 0.4);
    leute.push({ art, name: NAMEN[art], figur, objekt: o, ruhe, blick: ruhe, gegruesst: false, reichweite: ort.reichweite });
  }

  function aktualisiere(dt, spielerOrt) {
    for (const p of leute) {
      const o = p.objekt;
      const d = Math.hypot(spielerOrt.x - o.position.x, spielerOrt.z - o.position.z);
      if (d > 90) { o.visible = false; continue; }
      o.visible = true;
      const ziel = d < 8 ? Math.atan2(spielerOrt.x - o.position.x, spielerOrt.z - o.position.z) : p.ruhe;
      let diff = ziel - p.blick;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      p.blick += diff * Math.min(1, dt * 2.5);
      o.rotation.y = p.blick;
      if (d < 6 && !p.gegruesst) { p.gegruesst = true; figur(p).spiele('winken'); }
      if (d > 14) p.gegruesst = false;
      p.figur.bewege(dt, 0);
    }
  }
  const figur = (p) => p.figur;

  // Wer steht in Reichweite zum Ansprechen? (Wer hinter einem Tresen steht, ist weiter weg erreichbar.)
  function naechster(ort, bis = 2.6) {
    let beste = null, anteil = 1;
    for (const p of leute) {
      const e = Math.hypot(p.objekt.position.x - ort.x, p.objekt.position.z - ort.z) / (p.reichweite ?? bis);
      if (e < anteil) { anteil = e; beste = p; }
    }
    return beste;
  }

  return { leute, aktualisiere, naechster };
}
