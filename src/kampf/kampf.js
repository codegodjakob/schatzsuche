// Der Spieler kämpft: Zuschlagen (Maus, Taste X oder der Knopf „Schlagen“) mit der stärksten Waffe,
// die er dabeihat, sonst mit den Fäusten. Die Figur dreht sich zum nächsten Gegner, holt aus, und im
// schnellsten Moment der Bewegung trifft der Schlag alle Gegner im Bogen vor ihr.
import { FAUST } from '../inhalte/gegner.js';
import { gegenstand } from '../inhalte/gegenstaende.js';

// Wann der Schlag in der Bewegung trifft (Sekunden der Aufnahme, siehe werkzeuge/figuren/baue_figuren.py)
const TREFFZEIT = { hieb: 0.6, schlag: 0.4 };

export function erzeugeKampf({ steuerung, inventar, fortschritt, gegner, figur }) {
  let pause = 0; // bis zum nächsten Schlag
  let offen = null; // ein Schlag, der gleich trifft

  function waffe() {
    const id = inventar.besteWaffe();
    return { id, ...(id ? gegenstand(id).waffe : FAUST), bewegung: id ? 'hieb' : 'schlag' };
  }

  function schlage() {
    const f = figur();
    if (!f || pause > 0 || !steuerung.zustand.aktiv) return false;
    const w = waffe();
    const z = steuerung.zustand;
    // zum nächsten Gegner in Reichweite drehen, sonst in Blickrichtung schlagen
    const ziel = gegner.naechster(z.ort, w.reichweite + 1.5);
    const richtung = ziel
      ? Math.atan2(ziel.objekt.position.x - z.ort.x, ziel.objekt.position.z - z.ort.z)
      : z.ichSicht ? z.blickSeite + Math.PI : f.objekt.rotation.y;
    steuerung.dreheZu(richtung, 0.5);
    f.spiele(w.bewegung, { tempo: w.tempo, ein: 0.1, aus: 0.2 });
    const dauer = f.dauer(w.bewegung) / w.tempo;
    pause = dauer * 0.85;
    offen = { nach: TREFFZEIT[w.bewegung] / w.tempo, w, richtung };
    steuerung.bremse(dauer * 0.8);
    return true;
  }

  function schritt(dt) {
    pause = Math.max(0, pause - dt);
    if (!offen) return;
    offen.nach -= dt;
    if (offen.nach > 0) return;
    const { w, richtung } = offen;
    offen = null;
    const volltreffer = Math.random() < fortschritt.wirkung.volltreffer();
    const streuung = 0.85 + Math.random() * 0.3;
    const schaden = Math.max(1, Math.round(w.schaden * fortschritt.wirkung.schlagFaktor() * streuung * (volltreffer ? 2 : 1)));
    gegner.treffe({ ort: steuerung.zustand.ort, richtung, reichweite: w.reichweite, schaden, volltreffer });
  }

  return { schlage, schritt, waffe, get bereit() { return pause <= 0; } };
}
