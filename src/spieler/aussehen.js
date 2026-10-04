// Das Aussehen der eigenen Figur: Gesicht, Körper, Haut, Haare und Bart (Charakter-Editor).
// Die Spielerfiguren bringen dafür Formziele mit (gebaut von werkzeuge/figuren/formen.py). Hier werden sie
// gemischt und die Farben gesetzt. Mit der Zeit wachsen Haare und Bart, Muskeln kommen mit Stärke und
// schwerer Arbeit, das Gewicht folgt dem Essen.
import * as THREE from 'three';

// Regler im Editor (−1 … 1): nach links mischt das erste Formziel dazu, nach rechts das zweite
export const REGLER = [
  { id: 'nase', titel: 'Nase', ziele: ['nase_klein', 'nase_gross'], enden: ['klein', 'groß'] },
  { id: 'nasenform', titel: 'Nasenform', ziele: ['nase_stups', 'nase_hoecker'], enden: ['Stupsnase', 'Höcker'] },
  { id: 'augen', titel: 'Augen', ziele: ['augen_klein', 'augen_gross'], enden: ['klein', 'groß'] },
  { id: 'brauen', titel: 'Augenbrauen', ziele: ['brauen_tief', 'brauen_hoch'], enden: ['tief', 'hoch'] },
  { id: 'mund', titel: 'Mund', ziele: ['mund_schmal', 'mund_breit'], enden: ['schmal', 'breit'] },
  { id: 'lippen', titel: 'Lippen', ziele: [null, 'lippen_voll'], enden: ['schmal', 'voll'] },
  { id: 'wangen', titel: 'Wangen', ziele: ['wangen_voll', 'wangen_hoch'], enden: ['rund', 'kantig'] },
  { id: 'kinn', titel: 'Kinn', ziele: ['kinn_zart', 'kinn_kraeftig'], enden: ['zart', 'kräftig'] },
  { id: 'ohren', titel: 'Ohren', ziele: ['ohren_klein', 'ohren_gross'], enden: ['klein', 'groß'] },
  { id: 'ohrform', titel: 'Ohrform', ziele: [null, 'ohren_spitz'], enden: ['rund', 'spitz'] },
];

export const KOPFFORMEN = [
  { id: 'normal', name: 'Normal', ziel: null },
  { id: 'rund', name: 'Rund', ziel: 'kopf_rund' },
  { id: 'eckig', name: 'Eckig', ziel: 'kopf_eckig' },
  { id: 'oval', name: 'Oval', ziel: 'kopf_oval' },
];

// Hauttöne: Faktor auf die gemalte Haut (1 = wie gebaut), Haarfarben: so sehen die Haare aus (sRGB 0 … 1)
export const HAUTTOENE = [
  { name: 'Sehr hell', faktor: [1.1, 1.08, 1.06] },
  { name: 'Hell', faktor: [1, 1, 1] },
  { name: 'Mittel', faktor: [0.88, 0.82, 0.76] },
  { name: 'Oliv', faktor: [0.76, 0.69, 0.58] },
  { name: 'Braun', faktor: [0.6, 0.5, 0.42] },
  { name: 'Dunkel', faktor: [0.44, 0.35, 0.29] },
];
export const HAARFARBEN = [
  { name: 'Schwarz', farbe: [0.05, 0.045, 0.04] },
  { name: 'Dunkelbraun', farbe: [0.16, 0.11, 0.08] },
  { name: 'Braun', farbe: [0.3, 0.19, 0.11] },
  { name: 'Kastanie', farbe: [0.42, 0.2, 0.09] },
  { name: 'Rot', farbe: [0.6, 0.25, 0.1] },
  { name: 'Blond', farbe: [0.72, 0.58, 0.36] },
  { name: 'Hellblond', farbe: [0.86, 0.77, 0.56] },
  { name: 'Grau', farbe: [0.6, 0.58, 0.55] },
];

// Wie schnell Haare und Bart wachsen (Meter je Spieltag)
export const WACHSTUM = { haare: 0.012, bart: 0.006 };

export function standard(art) {
  return {
    name: '',
    regler: {}, // id -> −1 … 1
    kopf: 'normal',
    haut: 1, // Index in HAUTTOENE
    haar: art === 'sie' ? 2 : 1, // Index in HAARFARBEN
    haarLaenge: art === 'sie' ? 0.3 : 0.05, // Meter; 0 = kahl
    bartLaenge: art === 'sie' ? 0 : 0.004, // 0 = glatt rasiert
    groesse: 1, // 0.92 … 1.08
    statur: 0, // im Editor: 0 … 1 (wie kräftig man anfängt); dazu kommen später Muskeln aus Stärke und Arbeit
    gewicht: 0, // −1 (dürr) … 1 (rund), folgt im Spiel dem Essen
    arbeit: 0, // schwere Arbeit (Holz hacken, Kämpfen) baut Muskeln auf
  };
}

// Ältere Spielstände ohne Aussehen, oder mit fehlenden Feldern: auffüllen
export function ergaenze(a, art) {
  return { ...standard(art), ...(a ?? {}), regler: { ...(a?.regler ?? {}) } };
}

const srgb = ([r, g, b]) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

// Anteile der Längen-Formziele: stufen = [l1 … ln]; für l1 … l(n−1) gibt es Ziele, ln ist die Grundform
function laengenAnteile(laenge, stufen) {
  const n = stufen.length - 1;
  const anteile = new Array(n).fill(0);
  if (laenge <= stufen[0]) { anteile[0] = 1; return anteile; }
  for (let i = 0; i < n; i++) {
    if (laenge <= stufen[i + 1]) {
      const t = (laenge - stufen[i]) / (stufen[i + 1] - stufen[i]);
      anteile[i] = 1 - t;
      if (i + 1 < n) anteile[i + 1] = t;
      return anteile;
    }
  }
  return anteile;
}

// Muskeln: aus der Statur, die man sich aussucht, plus Stärke und schwerer Arbeit
export function muskeln(a, staerke = 1) {
  return THREE.MathUtils.clamp(a.statur * 0.6 + (staerke - 1) * 0.05 + Math.min(0.35, a.arbeit * 0.0015), 0, 1);
}

// Wendet das Aussehen auf eine Figur an (nur Spielerfiguren haben Formziele; andere bleiben, wie sie sind)
export function wendeAn(figur, a, { staerke = 1, wams = false } = {}) {
  const wurzel = figur.objekt;
  const info = wurzel.children[0]?.userData?.editor ?? wurzel.userData?.editor;
  if (!info) return;
  const netze = [];
  const teil = {};
  wurzel.traverse((o) => {
    if (o.isMesh && o.morphTargetDictionary) {
      netze.push(o);
      o.morphTargetInfluences.fill(0);
    }
    for (const t of ['haare', 'haare_lang', 'bart', 'wams']) if (o.name.endsWith(`-${t}`)) teil[t] = o;
  });
  const setze = (name, wert) => {
    if (!name || !wert) return;
    for (const m of netze) {
      const i = m.morphTargetDictionary[name];
      if (i !== undefined) m.morphTargetInfluences[i] = wert;
    }
  };

  // Gesicht
  for (const r of REGLER) {
    const v = a.regler[r.id] ?? 0;
    if (v < 0) setze(r.ziele[0], -v);
    if (v > 0) setze(r.ziele[1], v);
  }
  setze(KOPFFORMEN.find((k) => k.id === a.kopf)?.ziel, 0.8);

  // Körper
  setze('muskeln', muskeln(a, staerke));
  setze('schlank', Math.max(0, -a.gewicht));
  setze('rund', Math.max(0, a.gewicht));
  wurzel.scale.setScalar(a.groesse);

  // Kleidung, die man trägt, sieht man
  if (teil.wams) teil.wams.visible = wams;

  // Haare: bis zur mittleren Länge das kurze Netz, darüber das lange
  const [h1, h2, h3, hmax] = info.haare;
  const lang = a.haarLaenge > h3;
  if (teil.haare) teil.haare.visible = a.haarLaenge > 0 && !lang;
  if (teil.haare_lang) teil.haare_lang.visible = lang;
  if (lang) setze('haar_3', laengenAnteile(Math.min(a.haarLaenge, hmax), [h3, hmax])[0]);
  else laengenAnteile(Math.max(a.haarLaenge, h1), [h1, h2, h3]).forEach((w, i) => setze(`haar_${i + 1}`, w));
  if (teil.bart && info.bart) {
    teil.bart.visible = a.bartLaenge > 0;
    laengenAnteile(Math.min(Math.max(a.bartLaenge, info.bart[0]), info.bart.at(-1)), info.bart).forEach((w, i) => setze(`bart_${i + 1}`, w));
  }

  // Farben: Haut als Faktor, Haare auf die gewünschte Farbe (das Strähnenbild ist hell gebaut), dazu
  // Brauen, Haaransatz und Bartschatten auf der Haut (über die Maske im Material, siehe figur.js)
  const haar = srgb(HAARFARBEN[a.haar]?.farbe ?? HAARFARBEN[1].farbe);
  const bild = srgb(info.haarbild ?? [1, 1, 1]);
  wurzel.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (m.name === 'haut') {
      m.color.copy(srgb(HAUTTOENE[a.haut]?.faktor ?? [1, 1, 1]));
      m.userData.haarAlt?.value.copy(srgb(info.haarfarbe ?? [0, 0, 0]));
      m.userData.haarNeu?.value.copy(haar);
    }
    if (m.name === 'haare') m.color.setRGB(haar.r / bild.r, haar.g / bild.g, haar.b / bild.b);
  });
}

// Was die Zeit mit der Figur macht. stunden: vergangene Spielstunden; satt: Sättigung (0 … 100)
export function wachse(a, stunden, { satt = 60, mann = true } = {}) {
  const tage = stunden / 24;
  if (a.haarLaenge > 0) a.haarLaenge = Math.min(0.45, a.haarLaenge + WACHSTUM.haare * tage);
  if (mann) a.bartLaenge = Math.min(0.2, a.bartLaenge + WACHSTUM.bart * tage);
  // Wer immer satt ist, wird runder; wer hungert, dünner (sehr langsam)
  if (satt > 85) a.gewicht = Math.min(1, a.gewicht + 0.02 * tage);
  else if (satt < 30) a.gewicht = Math.max(-1, a.gewicht - 0.04 * tage);
}

// Zufälliges Aussehen (Knopf „Würfeln“ im Editor)
export function wuerfle(art) {
  const z = (a = -1, b = 1) => a + Math.random() * (b - a);
  const a = standard(art);
  for (const r of REGLER) a.regler[r.id] = Math.random() < 0.7 ? Math.round(z(-0.8, 0.8) * 20) / 20 : 0;
  a.regler.ohrform = Math.random() < 0.15 ? 1 : 0;
  a.kopf = KOPFFORMEN[Math.floor(Math.random() * KOPFFORMEN.length)].id;
  a.haut = Math.floor(Math.random() * HAUTTOENE.length);
  a.haar = Math.floor(Math.random() * (HAARFARBEN.length - 1));
  a.haarLaenge = [0, 0.006, 0.03, 0.06, 0.12, 0.2, 0.32][Math.floor(Math.random() * 7)];
  if (art !== 'sie') a.bartLaenge = [0, 0.004, 0.015, 0.04, 0.1][Math.floor(Math.random() * 5)];
  a.groesse = Math.round(z(0.94, 1.06) * 100) / 100;
  a.statur = Math.round(z(0, 0.8) * 20) / 20;
  a.gewicht = Math.round(z(-0.4, 0.5) * 20) / 20;
  return a;
}
