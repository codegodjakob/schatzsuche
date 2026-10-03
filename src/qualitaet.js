// Grafik-Qualitätsstufen. „hoch“ ist das Ziel, „niedrig“ läuft auch auf schwachen Rechnern
// (und in den automatischen Prüfungen). Die Stufe passt sich an, wenn das Bild ruckelt.
export const STUFEN = {
  hoch: { name: 'hoch', pixel: 1.5, schatten: 4096, gras: 1.0, baeume: 1.0, nachbearbeitung: true, verdeckung: true, kantenglaettung: true },
  mittel: { name: 'mittel', pixel: 1.0, schatten: 2048, gras: 0.55, baeume: 0.75, nachbearbeitung: true, verdeckung: false, kantenglaettung: true },
  niedrig: { name: 'niedrig', pixel: 0.75, schatten: 1024, gras: 0.22, baeume: 0.45, nachbearbeitung: false, verdeckung: false, kantenglaettung: false },
};
const REIHE = ['hoch', 'mittel', 'niedrig'];

function gespeichert() {
  try { return localStorage.getItem('schatzsuche.qualitaet'); } catch { return null; }
}

export function startStufe() {
  const vorgabe = window.SCHATZSUCHE_QUALITAET ?? gespeichert();
  if (vorgabe && STUFEN[vorgabe]) return STUFEN[vorgabe];
  const handy = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
  return handy ? STUFEN.niedrig : STUFEN.hoch;
}

export function naechsteStufe(stufe) {
  return STUFEN[REIHE[(REIHE.indexOf(stufe.name) + 1) % REIHE.length]];
}

export function merkeStufe(stufe) {
  try { localStorage.setItem('schatzsuche.qualitaet', stufe.name); } catch { /* egal */ }
}

// Misst die Bildrate und meldet, wenn eine niedrigere Stufe nötig ist.
export function erzeugeTempoWaechter(beiZuLangsam) {
  let zeit = 0, bilder = 0, pause = 4, runter = 0;
  const fest = window.SCHATZSUCHE_QUALITAET != null || gespeichert() != null;
  return {
    schritt(dt) {
      if (fest || runter >= 2) return;
      if (pause > 0) { pause -= dt; return; }
      zeit += dt; bilder += 1;
      if (zeit >= 3) {
        const bps = bilder / zeit;
        zeit = 0; bilder = 0;
        if (bps < 28) { runter += 1; pause = 4; beiZuLangsam(bps); }
      }
    },
  };
}
