// Gezeichnete Symbole für Gegenstände (statt Emojis): kleine SVG-Bilder im Stil alter Holzschnitte,
// mit dunkler Kontur und wenigen warmen Farben. Jedes Bild ist 64 × 64 groß; symbol(id) gibt fertiges SVG.
// Neuer Gegenstand ohne eigenes Bild: Es erscheint ein Beutel.

const K = '#2b1d12'; // Kontur
const linie = (d, farbe = K, breite = 3) => `<path d="${d}" fill="none" stroke="${farbe}" stroke-width="${breite}" stroke-linecap="round" stroke-linejoin="round"/>`;
const flaeche = (d, farbe, breite = 2.5) => `<path d="${d}" fill="${farbe}" stroke="${K}" stroke-width="${breite}" stroke-linejoin="round"/>`;
const kreis = (x, y, r, farbe, breite = 2.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${farbe}" stroke="${K}" stroke-width="${breite}"/>`;
const glanz = (d) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="2" stroke-linecap="round"/>`;

// Wiederkehrende Teile
const stiel = (x1, y1, x2, y2, farbe = '#8a5a33') => linie(`M${x1} ${y1} L${x2} ${y2}`, K, 8) + linie(`M${x1} ${y1} L${x2} ${y2}`, farbe, 4.5);
const fisch = (koerper, bauch, flosse, flecken = '') => flaeche('M8 34 Q20 18 40 24 Q50 27 54 32 Q50 37 40 40 Q20 46 8 34 Z', koerper)
  + flaeche('M54 32 L62 24 L60 32 L62 40 Z', flosse) + `<path d="M14 36 Q26 42 42 38" fill="none" stroke="${bauch}" stroke-width="4" stroke-linecap="round"/>`
  + flecken + kreis(16, 31, 2.2, '#f4ead2', 1.5) + `<circle cx="16" cy="31" r="1" fill="${K}"/>` + flaeche('M30 24 Q34 16 40 22', flosse, 2);
const teller = (inhalt) => `<ellipse cx="32" cy="44" rx="26" ry="10" fill="#c9b48a" stroke="${K}" stroke-width="2.5"/><ellipse cx="32" cy="42" rx="18" ry="6" fill="#e2d2aa"/>${inhalt}`;

const BILDER = {
  ast: linie('M10 50 Q30 38 54 14', K, 9) + linie('M10 50 Q30 38 54 14', '#8b5e3c', 5) + linie('M30 37 L24 22', K, 6) + linie('M30 37 L24 22', '#8b5e3c', 3) + flaeche('M24 22 q-6 -4 -4 -10 q6 2 4 10z', '#6f9a4a', 2),
  stein: flaeche('M10 44 Q8 30 22 22 Q36 14 48 22 Q58 30 54 42 Q46 52 30 52 Q14 52 10 44 Z', '#8d8a80') + glanz('M20 28 Q28 22 38 23') + flaeche('M30 52 Q38 40 54 42', '#6f6c64', 2),
  feuerstein: flaeche('M14 46 L20 22 L36 12 L52 24 L48 46 L30 54 Z', '#3e4250') + linie('M20 22 L32 34 L48 46 M32 34 L36 12', '#6b7084', 2) + flaeche('M44 8 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z', '#ffd36a', 1.5),
  fasern: [16, 24, 32, 40, 48].map((x, i) => linie(`M${x} 54 Q${x + (i - 2) * 3} 30 ${x + (i - 2) * 6} 10`, '#c9b073', 3)).join('') + linie('M14 40 Q32 34 50 40', K, 4) + linie('M14 40 Q32 34 50 40', '#8a6a3c', 2),
  schnur: `<ellipse cx="32" cy="34" rx="20" ry="16" fill="#b89a62" stroke="${K}" stroke-width="2.5"/>` + [0, 1, 2, 3].map((i) => linie(`M${16 + i * 8} 22 Q${20 + i * 8} 34 ${14 + i * 8} 46`, '#7d6438', 2)).join('') + linie('M50 40 Q58 50 52 58', '#b89a62', 3),
  holzscheit: flaeche('M8 40 L40 16 L56 28 L24 52 Z', '#a8723f') + `<ellipse cx="48" cy="22" rx="8" ry="9" transform="rotate(37 48 22)" fill="#e2b77a" stroke="${K}" stroke-width="2.5"/>` + `<ellipse cx="48" cy="22" rx="3.5" ry="4" transform="rotate(37 48 22)" fill="none" stroke="#a8723f" stroke-width="1.5"/>` + linie('M14 40 L40 22 M20 46 L46 26', '#7a4e28', 1.5),
  baumstamm: flaeche('M6 36 L50 20 L58 34 L14 50 Z', '#7a5130') + `<ellipse cx="54" cy="27" rx="7" ry="8" transform="rotate(-20 54 27)" fill="#d9a96a" stroke="${K}" stroke-width="2.5"/>` + linie('M14 40 L50 27 M16 46 L52 32', '#5a3a20', 1.5),
  lederfetzen: flaeche('M10 18 Q20 10 32 16 Q44 8 54 16 Q58 32 52 46 Q40 56 30 50 Q16 56 12 44 Q6 30 10 18 Z', '#8a5a34') + linie('M16 24 Q30 30 48 22 M18 40 Q30 36 46 42', '#6b4224', 1.5),
  johanniskraut: linie('M32 58 L32 28', '#4f7a34', 3) + [0, 72, 144, 216, 288].map((w) => `<ellipse cx="32" cy="16" rx="5" ry="9" transform="rotate(${w} 32 24) translate(0 -2)" fill="#f2c52e" stroke="${K}" stroke-width="2"/>`).join('') + kreis(32, 24, 5, '#e08a1e', 2) + flaeche('M32 44 q-12 -2 -14 -10 q10 0 14 10z', '#5f8f3e', 2),
  kamille: linie('M32 58 L32 30', '#4f7a34', 3) + [0, 45, 90, 135, 180, 225, 270, 315].map((w) => `<ellipse cx="32" cy="14" rx="4" ry="9" transform="rotate(${w} 32 24)" fill="#fbf8ee" stroke="${K}" stroke-width="1.8"/>`).join('') + kreis(32, 24, 6, '#f2c52e', 2),
  brombeeren: [[24, 30], [34, 26], [40, 36], [28, 40], [36, 46]].map(([x, y]) => kreis(x, y, 7, '#3b1e3d', 2) + kreis(x - 2, y - 2, 1.6, '#9b6fa0', 0)).join('') + flaeche('M30 20 q-2 -12 10 -12 q0 10 -10 12z', '#5f8f3e', 2),
  steinpilz: flaeche('M24 56 L22 34 L42 34 L40 56 Q32 60 24 56 Z', '#efe3c4') + flaeche('M8 34 Q8 12 32 10 Q56 12 56 34 Q32 40 8 34 Z', '#8a4f24') + glanz('M16 24 Q26 14 40 15'),
  gebratene_pilze: teller(flaeche('M14 38 Q16 28 26 30 Q28 40 14 38Z', '#7a4320') + flaeche('M28 36 Q30 24 42 28 Q44 38 28 36Z', '#8a4f24') + flaeche('M38 40 Q42 30 52 34 Q52 42 38 40Z', '#6b3a1c')),
  brot: flaeche('M8 40 Q8 20 32 18 Q56 20 56 40 Q56 50 32 50 Q8 50 8 40 Z', '#c8873e') + linie('M22 24 L18 36 M32 22 L30 36 M42 24 L42 36', '#8f5520', 2.5) + glanz('M16 28 Q30 20 46 26'),
  rotauge: fisch('#a8b2b6', '#e6e2d6', '#c24a2a'),
  barsch: fisch('#7f9a52', '#e6dcb0', '#d8702a', [20, 28, 36, 44].map((x) => linie(`M${x} 24 L${x - 2} 40`, '#3e5428', 2.5)).join('')),
  forelle: fisch('#9aa48a', '#e8d8c8', '#8a8a6a', [[22, 28], [30, 26], [38, 30], [28, 34], [44, 28]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#c0392b"/>`).join('')),
  hecht: flaeche('M4 32 Q20 22 46 26 Q54 28 58 32 Q54 36 46 38 Q20 42 4 32 Z', '#6e7f3e') + flaeche('M58 32 L63 26 L62 32 L63 38 Z', '#5a6a30') + [14, 22, 30, 38].map((x) => `<ellipse cx="${x}" cy="31" rx="3" ry="1.6" fill="#c9d07a"/>`).join('') + kreis(10, 30, 1.8, '#f4ead2', 1.2),
  gebratener_fisch: teller(flaeche('M12 40 Q24 30 40 33 Q48 35 52 38 Q48 42 40 44 Q24 48 12 40 Z', '#b0702e') + linie('M18 38 L24 44 M26 36 L32 43 M34 36 L40 43', '#6b3a14', 2)),
  gebratene_forelle: teller(flaeche('M10 40 Q24 30 42 33 Q50 35 54 38 Q50 42 42 44 Q24 48 10 40 Z', '#c07a36') + flaeche('M30 30 q4 -6 8 -2 q-2 4 -8 2z', '#6f9a4a', 1.5) + kreis(46, 30, 3, '#f2c52e', 1.5)),
  kamillentee: flaeche('M14 26 L50 26 L46 52 Q32 58 18 52 Z', '#a8763e') + `<ellipse cx="32" cy="26" rx="18" ry="5" fill="#d9b04a" stroke="${K}" stroke-width="2.5"/>` + linie('M50 32 Q60 34 56 44 Q52 48 47 46', K, 3) + linie('M26 18 Q22 12 26 6 M34 18 Q30 12 34 6', '#f4ead2', 2),
  speer: stiel(10, 56, 46, 14) + flaeche('M44 16 L56 4 L52 20 Z', '#8d8a80') + linie('M42 20 L48 14', '#c9b073', 4),
  steinmesser: stiel(14, 52, 28, 38, '#5a3a20') + flaeche('M26 40 L52 10 Q54 22 34 44 Z', '#8d8a80') + linie('M28 40 L48 16', '#b8b4a8', 1.5) + linie('M24 42 L30 36', '#c9b073', 4),
  steinaxt: stiel(12, 56, 42, 14) + flaeche('M30 14 Q30 6 42 6 L54 10 Q58 20 50 28 L40 24 Z', '#8d8a80') + linie('M34 18 L42 22', '#c9b073', 4) + glanz('M44 9 L53 13'),
  keule: linie('M12 54 L38 22', K, 10) + linie('M12 54 L38 22', '#6b4426', 6) + flaeche('M30 26 Q28 10 42 8 Q56 8 54 22 Q50 34 38 32 Z', '#5a3a20') + linie('M36 14 Q44 12 48 18', '#8b5e3c', 2),
  eisenkeule: linie('M12 54 L36 24', K, 10) + linie('M12 54 L36 24', '#5a3a20', 6) + flaeche('M28 26 Q26 10 40 8 Q54 8 52 22 Q48 34 36 32 Z', '#4a3322') + linie('M30 20 L46 30 M34 12 L52 22', '#7d858c', 4) + glanz('M38 11 L48 16'),
  lederwams: flaeche('M18 10 L26 14 Q32 18 38 14 L46 10 L52 20 L48 28 L48 54 L16 54 L16 28 L12 20 Z', '#7a4e2a') + linie('M32 18 L32 54', '#4a2e18', 2) + [24, 32, 40, 48].map((y) => kreis(35, y, 1.6, '#c9a35a', 1)).join('') + linie('M16 40 L48 40', '#4a2e18', 1.5),
  angelrute: linie('M10 58 Q30 30 56 6', K, 6) + linie('M10 58 Q30 30 56 6', '#8a5a33', 3) + kreis(18, 46, 5, '#b89a62', 2) + linie('M56 6 Q60 30 50 44', '#ddd', 1.2) + flaeche('M47 44 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0', '#c8322a', 1.5),
  fackel: stiel(26, 58, 34, 26, '#6b4426') + flaeche('M28 30 L40 26 L40 32 L30 36 Z', '#b89a62', 2) + flaeche('M34 28 Q20 18 32 4 Q34 14 40 12 Q48 22 34 28 Z', '#f08a24') + flaeche('M34 26 Q28 18 33 12 Q36 18 39 18 Q40 24 34 26 Z', '#ffd36a', 1.5),
  heilsalbe: `<ellipse cx="32" cy="44" rx="20" ry="9" fill="#c9b48a" stroke="${K}" stroke-width="2.5"/>` + flaeche('M12 44 L12 30 Q32 22 52 30 L52 44', '#d8c49a') + `<ellipse cx="32" cy="30" rx="20" ry="8" fill="#9db86a" stroke="${K}" stroke-width="2.5"/>` + flaeche('M28 26 q4 -8 8 0', '#6f9a4a', 1.5),
  pergament: flaeche('M12 14 Q32 8 52 14 L50 50 Q32 56 14 50 Z', '#e8d9b0') + linie('M18 22 Q30 19 44 22 M18 30 Q28 28 40 30 M18 38 Q30 36 44 38', '#8a6a3c', 2) + flaeche('M42 44 L50 50 L46 56 Z', '#c9b48a', 1.5),
  kartenteil_1: flaeche('M10 12 L34 8 L54 16 L50 52 L28 56 L12 48 Z', '#e2cf9e') + linie('M16 40 Q24 30 34 34 Q42 38 46 26', '#8a3a24', 2.5) + linie('M20 20 l4 4 m0 -4 l-4 4', '#8a3a24', 2) + kreis(44, 24, 3, '#8a3a24', 1.5),

  lagerfeuer: [[14, 50, 50, 38], [14, 38, 50, 50]].map(([a, b, c, d]) => stiel(a, b, c, d, '#7a5130')).join('') + flaeche('M32 44 Q16 30 30 10 Q32 22 38 20 Q48 32 32 44 Z', '#f08a24') + flaeche('M32 42 Q24 32 31 22 Q34 30 38 30 Q40 38 32 42 Z', '#ffd36a', 1.5),

  // Für die nächsten Schritte (Werkzeuge, Jagd, Bauen)
  schaufel: stiel(16, 54, 40, 20) + flaeche('M36 22 L48 6 Q58 8 58 18 L44 28 Z', '#8d8a80') + linie('M12 58 L20 50', K, 7) + linie('M12 58 L20 50', '#8a5a33', 3.5),
  spitzhacke: stiel(12, 56, 34, 18) + flaeche('M14 14 Q32 4 54 20 L50 24 Q32 12 18 18 Z', '#7d7a72') + linie('M30 12 L36 20', '#c9b073', 4),
  bogen: linie('M20 6 Q52 32 20 58', K, 7) + linie('M20 6 Q52 32 20 58', '#8a5a33', 3.5) + linie('M20 6 L20 58', '#e8e0c8', 1.5),
  pfeil: linie('M10 54 L50 14', K, 5) + linie('M10 54 L50 14', '#a8723f', 2.5) + flaeche('M48 16 L58 6 L54 20 Z', '#6b7084', 2) + flaeche('M10 54 L6 46 L14 50 Z M10 54 L18 58 L14 50 Z', '#e8e0c8', 1.5),
  erde: flaeche('M8 44 Q12 28 26 30 Q34 20 44 28 Q56 28 56 44 Q44 54 30 52 Q14 54 8 44 Z', '#6e4a2c') + [[20, 40], [32, 36], [44, 42], [28, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#4a301a"/>`).join(''),
  fleisch: flaeche('M10 36 Q10 18 30 16 Q50 16 54 32 Q52 50 30 50 Q12 50 10 36 Z', '#b8443a') + linie('M18 30 Q30 24 44 30 M18 40 Q30 36 42 42', '#f0c8b8', 2.5) + kreis(50, 40, 5, '#efe3c4', 2),
  gebratenes_fleisch: flaeche('M10 36 Q10 18 30 16 Q50 16 54 32 Q52 50 30 50 Q12 50 10 36 Z', '#7a3a1c') + linie('M18 28 L26 36 M28 24 L36 32 M38 26 L46 34', '#4a200c', 2.5) + kreis(50, 40, 5, '#efe3c4', 2),
  fell: flaeche('M14 14 Q32 6 50 14 Q58 30 50 50 Q32 58 14 50 Q6 30 14 14 Z', '#9a7650') + [20, 28, 36, 44].map((x) => linie(`M${x} 18 q2 6 0 10 m0 8 q2 6 0 10`, '#6b4e30', 2)).join(''),
  setzling: flaeche('M18 50 L46 50 L42 60 L22 60 Z', '#8a5a33') + linie('M32 50 L32 22', '#5f8f3e', 3) + flaeche('M32 30 q-14 -2 -14 -14 q12 2 14 14z', '#6f9a4a', 2) + flaeche('M32 24 q12 -4 14 -16 q-12 0 -14 16z', '#7aaa4e', 2),
  brett: flaeche('M6 26 L58 18 L58 30 L6 38 Z', '#c08a50') + linie('M10 32 L54 25', '#8a5a2c', 1.5),
  lehm: flaeche('M10 42 Q8 26 26 26 Q34 16 46 24 Q58 30 54 44 Q40 54 26 50 Q12 52 10 42 Z', '#b07a52') + glanz('M18 32 Q28 26 40 28'),
  ziegel: flaeche('M8 24 L44 24 L56 32 L56 44 L20 44 L8 36 Z', '#b0542c') + linie('M8 24 L20 32 L56 32 M20 32 L20 44', K, 2),
  stroh: [12, 20, 28, 36, 44, 52].map((x, i) => linie(`M${x} 58 Q${32 + (i - 2.5) * 4} 30 ${x - 2} 6`, '#d8b860', 3)).join('') + linie('M14 34 Q32 28 50 34', '#8a6a3c', 4),
  samen: [[22, 30], [32, 24], [42, 30], [28, 40], [38, 40]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3.4" fill="#c8a060" stroke="${K}" stroke-width="2"/>`).join(''),
  laterne: flaeche('M22 18 L42 18 L46 50 L18 50 Z', '#3a3a3a') + flaeche('M24 22 L40 22 L42 46 L22 46 Z', '#ffcf6a', 1.5) + linie('M26 18 Q32 6 38 18', K, 3) + flaeche('M16 50 L48 50 L46 56 L18 56 Z', '#3a3a3a'),

  // Kleidung und Fundstücke
  leinenhemd: flaeche('M18 10 L28 14 Q32 18 36 14 L46 10 L58 22 L50 30 L46 26 L46 56 L18 56 L18 26 L14 30 L6 22 Z', '#d8ccae') + linie('M28 14 Q32 22 36 14', '#8a7a58', 2),
  wollmantel: flaeche('M18 8 L28 12 L32 24 L36 12 L46 8 L58 24 L50 30 L50 60 L14 60 L14 30 L6 24 Z', '#6a4a3a') + linie('M32 24 L32 60', '#3a2a1e', 2.5) + [32, 42, 52].map((y) => kreis(36, y, 1.8, '#c9b073', 1)).join(''),
  lederstiefel: flaeche('M14 8 L30 8 L30 40 L52 46 Q58 50 56 56 L14 56 Z', '#7a4a2a') + linie('M14 48 L56 48', '#4a2a14', 2.5) + linie('M18 16 L26 16 M18 24 L26 24', '#c9b073', 1.8),
  hose: flaeche('M18 8 L46 8 L50 58 L36 58 L32 26 L28 58 L14 58 Z', '#a8946a') + linie('M18 14 L46 14', '#6a5a3a', 2.5),
  ring: `<circle cx="32" cy="36" r="16" fill="none" stroke="${K}" stroke-width="8"/><circle cx="32" cy="36" r="16" fill="none" stroke="#c8ccd4" stroke-width="4"/>` + flaeche('M26 14 L32 6 L38 14 L32 20 Z', '#7fb6d8', 2),
  brief: flaeche('M8 18 L56 18 L56 50 L8 50 Z', '#e8dcc0') + linie('M8 18 L32 36 L56 18', '#8a7a58', 2) + kreis(32, 40, 6, '#9e2a22', 2),

  // Bauwerke
  erdwall: flaeche('M4 52 Q14 22 32 20 Q50 22 60 52 Z', '#7a5434') + linie('M14 40 Q24 34 34 36 M30 46 Q42 40 50 44', '#5a3a20', 2) + flaeche('M20 24 q4 -6 8 -2 q4 -6 8 0', '#6f9a4a', 2),
  zaun: [12, 26, 40, 54].map((x) => stiel(x, 56, x, 14, '#8a5a33')).join('') + linie('M8 26 Q32 30 58 26 M8 40 Q32 44 58 40', '#6b4a2a', 3.5),
  palisade: [10, 22, 34, 46, 58].map((x) => flaeche(`M${x - 5} 58 L${x - 5} 18 L${x} 8 L${x + 5} 18 L${x + 5} 58 Z`, '#9a6a3c', 2)).join('') + linie('M6 30 L60 30', '#c9b073', 3),
  steinmauer: [[6, 42, 22], [28, 42, 30], [50, 42, 12], [10, 28, 26], [36, 28, 22], [20, 14, 26]].map(([x, y, b]) => `<rect x="${x}" y="${y}" width="${b - 2}" height="13" rx="3" fill="#8d8a80" stroke="${K}" stroke-width="2.5"/>`).join(''),
  standfackel: stiel(32, 60, 32, 22, '#7a5130') + flaeche('M26 24 L38 24 L36 16 L28 16 Z', '#3a2a1c', 2) + flaeche('M32 18 Q20 8 30 -2 Q32 6 36 6 Q44 12 32 18 Z', '#f08a24', 2) + flaeche('M32 17 Q27 10 31 4 Q33 9 36 10 Q37 14 32 17 Z', '#ffd36a', 1.2),
  unterstand: flaeche('M6 24 L56 12 L60 22 L10 36 Z', '#9a6a3c') + stiel(14, 58, 12, 32) + stiel(52, 58, 54, 20) + linie('M10 30 L58 18', '#6f9a4a', 3) + linie('M8 58 L60 58', '#5a3a20', 3),
};

const beutel = flaeche('M16 26 Q14 52 32 56 Q50 52 48 26 Z', '#8a6a3c') + linie('M18 24 Q32 30 46 24', K, 3) + flaeche('M24 22 Q32 10 40 22', '#a8854c');

export function symbol(id) {
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${BILDER[id] ?? beutel}</svg>`;
}

export const hatSymbol = (id) => id in BILDER;
