// Die Karte oben rechts: die ganze Welt, Norden oben. Zu Beginn ist alles unerkundet, wie leeres
// Pergament; wo man hingeht, zeichnet sich das Land ein: Wiesen, Wald, Felsen, Wasser, Moor, Wege und die
// Orte mit ihren Namen. Taste M oder ein Tipp auf die Karte macht sie groß.
import { hoeheBei, maskeBei, waldDichte, wasserspiegel, wegLinien, WELT_GROESSE } from '../welt/gelaende.js';
import {
  DORF, GRAUFURT, HRODGARD, JURTENLAGER, LAGER, MOOR, MOORSEE, RAEUBERLAGER, SCHILFSEE, TEICH, THING, WALDSEE, WEIHER,
} from '../welt/orte.js';

const BILD = 384; // Kantenlänge des gezeichneten Landes in Pixeln
const NEBEL = 96; // Feinheit dessen, was als erkundet gilt (je Zelle gut 9 Meter)
const SICHT = 75; // so weit um sich herum erkundet man (Meter)

// Orte, die auf der Karte stehen, sobald man sie gesehen hat
const ORTE = [
  { name: 'Erlenbach', ...DORF, art: 'dorf' },
  { name: 'Graufurt', ...GRAUFURT, art: 'dorf' },
  { name: 'Hrodgard', ...HRODGARD, art: 'dorf' },
  { name: 'Jurtenlager', ...JURTENLAGER, art: 'dorf' },
  { name: 'Die Steppe', x: 380, z: -70, art: 'gebiet' },
  { name: 'Thing-Platz', x: THING.x, z: THING.z + 6, art: 'gebiet' },
  { name: 'Lichtung des Alten', ...LAGER, art: 'lager' },
  { name: 'Räuberlager', ...RAEUBERLAGER, art: 'gefahr' },
  { name: 'Das Moor', x: MOOR.x - 8, z: MOOR.z + 36, art: 'gebiet' },
  { name: 'Waldsee', ...WALDSEE, art: 'see' },
  { name: 'Schilfsee', ...SCHILFSEE, art: 'see' },
  { name: 'Moorsee', ...MOORSEE, art: 'see' },
  { name: 'Teich', ...TEICH, art: 'see' },
  { name: 'Weiher', ...WEIHER, art: 'see' },
];

const zuPixel = (w) => (w / WELT_GROESSE + 0.5) * BILD;

// Das Land einmal malen, in Kartenfarben (wie auf altem Papier, aber erkennbar)
function maleLand() {
  const c = document.createElement('canvas');
  c.width = c.height = BILD;
  const k = c.getContext('2d');
  const bild = k.createImageData(BILD, BILD);
  const wsp = wasserspiegel();
  const schritt = WELT_GROESSE / BILD;
  for (let py = 0; py < BILD; py++) {
    for (let px = 0; px < BILD; px++) {
      const x = (px + 0.5) * schritt - WELT_GROESSE / 2, z = (py + 0.5) * schritt - WELT_GROESSE / 2;
      const h = hoeheBei(x, z);
      // Licht von Nordwesten: Hügel bekommen eine helle und eine dunkle Seite
      const schatten = (hoeheBei(x - schritt, z - schritt) - h) * 0.9;
      let r, g, b;
      if (h < wsp) {
        const tief = Math.min(1, (wsp - h) / 1.5);
        [r, g, b] = [92 - 30 * tief, 128 - 30 * tief, 140 - 20 * tief];
      } else {
        const m = maskeBei(x, z);
        const wald = waldDichte(x, z);
        const moor = 1 - Math.min(1, Math.max(0, (Math.hypot(x - MOOR.x, z - MOOR.z) - MOOR.radius * 0.5) / (MOOR.radius * 0.5)));
        [r, g, b] = [168, 166, 112]; // Wiese
        const mische = (f, [r2, g2, b2]) => { r += (r2 - r) * f; g += (g2 - g) * f; b += (b2 - b) * f; };
        mische(Math.min(1, wald * 1.3), [78, 98, 62]); // Wald
        mische(m.erde * 0.7, [150, 128, 92]);
        mische(moor * 0.85, [96, 86, 60]);
        mische(Math.min(1, m.fels * 1.2), [138, 134, 126]);
        mische(m.ufer * 0.6, [124, 118, 92]);
        const licht = Math.max(-28, Math.min(28, schatten * 22));
        r += licht; g += licht; b += licht;
      }
      const i = (py * BILD + px) * 4;
      bild.data[i] = r; bild.data[i + 1] = g; bild.data[i + 2] = b; bild.data[i + 3] = 255;
    }
  }
  k.putImageData(bild, 0, 0);
  // Wege und Straßen
  k.strokeStyle = 'rgba(206, 180, 128, 0.95)';
  k.lineWidth = 1.6; k.lineJoin = k.lineCap = 'round';
  for (const punkte of wegLinien()) {
    k.beginPath();
    punkte.forEach((p, i) => (i ? k.lineTo : k.moveTo).call(k, zuPixel(p.x), zuPixel(p.z)));
    k.stroke();
  }
  return c;
}

// Unerkundetes: altes, fleckiges Pergament
function malePergament() {
  const c = document.createElement('canvas');
  c.width = c.height = BILD;
  const k = c.getContext('2d');
  k.fillStyle = '#c9b88f';
  k.fillRect(0, 0, BILD, BILD);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * BILD, y = Math.random() * BILD, r = 4 + Math.random() * 26;
    const g = k.createRadialGradient(x, y, 0, x, y, r);
    const dunkel = Math.random() < 0.5;
    g.addColorStop(0, dunkel ? 'rgba(120,96,60,0.10)' : 'rgba(240,226,190,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    k.fillStyle = g;
    k.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return c;
}

export function erzeugeKarte({ huelle }) {
  const flaeche = document.createElement('canvas');
  flaeche.width = flaeche.height = BILD;
  flaeche.setAttribute('role', 'img');
  flaeche.setAttribute('aria-label', 'Karte der Welt');
  huelle.append(flaeche);
  const k = flaeche.getContext('2d');
  let land = null, pergament = null;
  const erkundet = new Uint8Array(NEBEL * NEBEL);
  const nebelBild = document.createElement('canvas');
  nebelBild.width = nebelBild.height = NEBEL;
  const nk = nebelBild.getContext('2d');
  const nebelDaten = nk.createImageData(NEBEL, NEBEL);
  const misch = document.createElement('canvas');
  misch.width = misch.height = BILD;
  const mk = misch.getContext('2d');
  let geaendert = true, zuletzt = -Infinity, gross = false;
  let spieler = { x: 0, z: 0, blick: 0 };

  function erkunde(x, z) {
    const zelle = WELT_GROESSE / NEBEL;
    const cx = (x / WELT_GROESSE + 0.5) * NEBEL, cz = (z / WELT_GROESSE + 0.5) * NEBEL, r = SICHT / zelle;
    for (let j = Math.floor(cz - r); j <= Math.ceil(cz + r); j++) {
      for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++) {
        if (i < 0 || j < 0 || i >= NEBEL || j >= NEBEL) continue;
        const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cz) / r;
        if (d > 1) continue;
        const wert = Math.round(255 * Math.min(1, (1 - d) * 2.5));
        if (wert > erkundet[j * NEBEL + i]) { erkundet[j * NEBEL + i] = wert; geaendert = true; }
      }
    }
  }
  const istErkundet = (x, z) => {
    const i = Math.floor((x / WELT_GROESSE + 0.5) * NEBEL), j = Math.floor((z / WELT_GROESSE + 0.5) * NEBEL);
    return i >= 0 && j >= 0 && i < NEBEL && j < NEBEL && erkundet[j * NEBEL + i] > 120;
  };

  function zeichne() {
    if (!land) { land = maleLand(); pergament = malePergament(); }
    if (geaendert) {
      for (let n = 0; n < erkundet.length; n++) {
        nebelDaten.data[n * 4 + 3] = 255 - erkundet[n];
      }
      nk.putImageData(nebelDaten, 0, 0);
      geaendert = false;
    }
    k.drawImage(land, 0, 0);
    // Pergament nur dort, wo noch nichts erkundet ist (weicher Rand)
    mk.globalCompositeOperation = 'source-over';
    mk.clearRect(0, 0, BILD, BILD);
    mk.imageSmoothingEnabled = true;
    mk.drawImage(nebelBild, 0, 0, BILD, BILD);
    mk.globalCompositeOperation = 'source-in';
    mk.drawImage(pergament, 0, 0);
    k.drawImage(misch, 0, 0);

    // Orte, die man kennt (klein angezeigt braucht alles doppelte Größe, um lesbar zu sein)
    const f = gross ? 1 : 2;
    k.textAlign = 'center';
    for (const o of ORTE) {
      if (!istErkundet(o.x, o.z)) continue;
      const px = zuPixel(o.x), py = zuPixel(o.z);
      if (o.art === 'dorf') {
        k.fillStyle = '#5b3a1e';
        for (const [dx, dy] of [[-4, 0], [3, -3], [2, 4]]) {
          const hx = px + dx * f, hy = py + dy * f;
          k.fillRect(hx - 2.5 * f, hy - 2 * f, 5 * f, 4 * f);
          k.beginPath(); k.moveTo(hx - 3.5 * f, hy - 2 * f); k.lineTo(hx, hy - 5.5 * f); k.lineTo(hx + 3.5 * f, hy - 2 * f); k.fill();
        }
      } else if (o.art === 'lager' || o.art === 'gefahr') {
        k.fillStyle = o.art === 'gefahr' ? '#8a2a1c' : '#5b3a1e';
        k.beginPath(); k.moveTo(px - 5 * f, py + 4 * f); k.lineTo(px, py - 5 * f); k.lineTo(px + 5 * f, py + 4 * f); k.closePath(); k.fill();
      }
      if (!gross && o.art !== 'dorf') continue; // klein: nur die Dörfer beim Namen
      k.font = `${o.art === 'dorf' ? 600 : 400} ${gross ? 11 : 26}px "Alegreya Sans", system-ui, sans-serif`;
      if (o.art === 'see' || o.art === 'gebiet') k.font = `italic ${k.font}`;
      const ty = py + (o.art === 'see' || o.art === 'gebiet' ? 4 : 13 * f + 4);
      // am Rand nicht abschneiden
      const halb = k.measureText(o.name).width / 2 + 3 * f;
      const tx = Math.min(BILD - halb, Math.max(halb, px));
      k.lineWidth = 3 * f; k.strokeStyle = 'rgba(236,226,200,0.85)'; k.strokeText(o.name, tx, ty);
      k.fillStyle = o.art === 'see' ? '#2c4a5a' : '#2b2015'; k.fillText(o.name, tx, ty);
    }

    // Man selbst: ein Pfeil in Blickrichtung
    const px = zuPixel(spieler.x), py = zuPixel(spieler.z);
    const w = Math.atan2(-Math.cos(spieler.blick), -Math.sin(spieler.blick));
    k.save();
    k.translate(px, py); k.rotate(w); k.scale(f, f);
    k.beginPath(); k.moveTo(9, 0); k.lineTo(-6, -6); k.lineTo(-3, 0); k.lineTo(-6, 6); k.closePath();
    k.fillStyle = '#b8261a'; k.strokeStyle = '#fff6e0'; k.lineWidth = 2; k.stroke(); k.fill();
    k.restore();

    // Windrose: Norden oben
    k.font = `700 ${16 * f}px "IM Fell English SC", Georgia, serif`;
    k.fillStyle = '#3a2a18'; k.textAlign = 'center';
    k.fillText('N', BILD - 18 * f, 22 * f);
  }

  function schalteGross(an = !gross) {
    gross = an;
    huelle.classList.toggle('gross', gross);
    zeichne();
  }
  huelle.addEventListener('click', () => schalteGross());

  return {
    // ort: { x, z }, blick: Blickrichtung (wie steuerung.zustand.blickSeite)
    schritt(ort, blick) {
      spieler = { x: ort.x, z: ort.z, blick };
      erkunde(ort.x, ort.z);
      // höchstens viermal je Sekunde neu zeichnen (nach echter Zeit, damit sie auch bei wenigen Bildern erscheint)
      const jetzt = performance.now();
      if (huelle.hidden || jetzt - zuletzt < 250) return;
      zuletzt = jetzt;
      zeichne();
    },
    schalteGross,
    get gross() { return gross; },
    istErkundet,
    // Wie viel der Welt man schon kennt (0 … 1)
    anteil: () => erkundet.reduce((n, w) => n + (w > 120 ? 1 : 0), 0) / erkundet.length,
    speichern() {
      // kurz: je Zelle ein Zeichen (erkundet oder nicht), lauflängenkodiert
      let s = '', letzter = -1, anzahl = 0;
      for (const w of erkundet) {
        const b = w > 120 ? 1 : 0;
        if (b === letzter) anzahl++;
        else { if (letzter >= 0) s += `${letzter}${anzahl},`; letzter = b; anzahl = 1; }
      }
      s += `${letzter}${anzahl}`;
      return { nebel: NEBEL, erkundet: s };
    },
    laden(d) {
      erkundet.fill(0);
      if (d?.nebel === NEBEL && typeof d.erkundet === 'string') {
        let n = 0;
        for (const teil of d.erkundet.split(',')) {
          const b = teil[0] === '1' ? 255 : 0, anzahl = Number(teil.slice(1));
          erkundet.fill(b, n, n + anzahl);
          n += anzahl;
        }
      }
      geaendert = true;
    },
  };
}
