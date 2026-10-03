// Einstiegspunkt: baut die Welt, wartet auf die Figurenwahl und startet das Spiel.
import * as THREE from 'three';
import { erzeugeTempoWaechter, merkeStufe, naechsteStufe, startStufe, STUFEN } from './qualitaet.js';
import { erzeugeGelaende, hoeheBei, wasserspiegel } from './welt/gelaende.js';
import { erzeugeHimmel } from './welt/himmel.js';
import { erzeugeGras } from './welt/gras.js';
import { erzeugeBaeume } from './welt/baeume.js';
import { erzeugeNatur } from './welt/natur.js';
import { erzeugeWasser } from './welt/wasser.js';
import { erzeugeFeuer, erzeugeFeuerlichter } from './welt/feuer.js';
import { erzeugeSammeln } from './welt/sammeln.js';
import { erzeugeMarkierung } from './welt/markierung.js';
import { erzeugeRaeuberlager } from './welt/raeuberlager.js';
import { inDieHand } from './welt/waffen.js';
import { entferneHindernis, hindernis } from './welt/kollision.js';
import { wind, windSchritt } from './welt/wind.js';
import { SEKUNDEN_JE_STUNDE, tageszeitSchritt, uhrzeitText, zeit } from './welt/tageszeit.js';
import { LAGER, RAEUBERLAGER, START } from './welt/orte.js';
import { ladeFigur } from './spieler/figur.js';
import { erzeugeSteuerung } from './spieler/steuerung.js';
import { erzeugeInventar } from './spieler/inventar.js';
import { erfahrungFuer, erzeugeFortschritt } from './spieler/fortschritt.js';
import { erzeugeHerstellen } from './spieler/herstellen.js';
import { erzeugeBenutzen } from './spieler/benutzen.js';
import { erzeugeEinsiedler } from './figuren/einsiedler.js';
import { erzeugeEreignisse } from './ereignisse/ereignisse.js';
import { erzeugeAufgaben } from './ereignisse/aufgaben.js';
import { erzeugeGegner } from './kampf/gegner.js';
import { erzeugeKampf } from './kampf/kampf.js';
import { erzeugeUeberleben } from './ueberleben/werte.js';
import { erzeugeOberflaeche } from './ui/oberflaeche.js';
import { erzeugeBeruehrung } from './ui/beruehrung.js';
import { erzeugeMenue } from './ui/menue.js';
import { erzeugeKampfanzeige } from './ui/kampfanzeige.js';
import { erzeugeNachbearbeitung } from './nachbearbeitung.js';
import { BERUFE } from './inhalte/berufe.js';
import { gegenstand } from './inhalte/gegenstaende.js';
import { REZEPTE } from './inhalte/rezepte.js';
import { ladeSpielstand, loescheSpielstand, speichereSpielstand } from './spielstand.js';

const atmen = () => new Promise((r) => setTimeout(r, 0));
const flaeche = document.getElementById('welt');
const oberflaeche = erzeugeOberflaeche();
const nachricht = (t) => oberflaeche.nachricht(t);
const gewinn = (t, art) => oberflaeche.gewinn(t, art);
const amHandy = () => document.documentElement.classList.contains('beruehrung');
let pausiert = false; // Menü offen: Die Welt steht still
// Die Wahl gilt ab sofort, auch während die Welt noch entsteht
const wahl = oberflaeche.warteAufStart();
let qualitaet = startStufe();
oberflaeche.zeigeQualitaet(qualitaet.name);

const renderer = new THREE.WebGLRenderer({ canvas: flaeche, antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;
{
  const gl = renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  window.notiere?.(`Grafikkarte: ${info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)} · Stufe ${qualitaet.name}`);
}

const szene = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(60, 1, 0.05, 5000);
const nach = erzeugeNachbearbeitung(renderer, szene, kamera);
nach.setzeQualitaet(qualitaet);

function groesse() {
  const b = flaeche.clientWidth, h = flaeche.clientHeight;
  const pixel = Math.min(devicePixelRatio, qualitaet.pixel);
  renderer.setPixelRatio(pixel);
  renderer.setSize(b, h, false);
  nach.groesse(b, h, pixel);
  kamera.aspect = b / h;
  kamera.updateProjectionMatrix();
}
// Bei offenem Menü wird sonst nicht gezeichnet; nach dem Drehen des Geräts das stehende Bild erneuern
addEventListener('resize', () => { groesse(); if (pausiert) nach.zeichne(); });
groesse();

// Für automatische Prüfungen und zum Ausprobieren in der Browser-Konsole
window.spiel = { szene, kamera, zeit, bereit: false, geladen: false };

// ---------------------------------------------------------------- Welt aufbauen
oberflaeche.laden('Himmel und Gelände …');
await atmen();
const himmel = erzeugeHimmel(szene, renderer, qualitaet);
szene.add(erzeugeGelaende(), erzeugeWasser());

oberflaeche.laden('Gras …');
await atmen();
const gras = erzeugeGras(qualitaet, himmel.licht);
szene.add(gras.objekt);

oberflaeche.laden('Wald …');
await atmen();
const baeume = await erzeugeBaeume(qualitaet, renderer);
szene.add(baeume.objekt);
for (const h of baeume.hindernisse) hindernis(h.x, h.z, h.radius, h.art);

oberflaeche.laden('Felsen und Blumen …');
await atmen();
const natur = await erzeugeNatur(qualitaet, baeume.beerenBusch);
szene.add(natur.objekt);
for (const h of natur.hindernisse) hindernis(h.x, h.z, h.radius);
const sammeln = erzeugeSammeln({ natur, baeume });
szene.add(sammeln.objekt);
const markierung = erzeugeMarkierung();
szene.add(markierung.objekt);

oberflaeche.laden('Das Lager am Waldrand …');
await atmen();
const lagerfeuer = erzeugeFeuer(LAGER.x, LAGER.z, { felsMaterial: natur.felsMaterial, rindenMaterial: baeume.rinde });
szene.add(lagerfeuer.objekt);
hindernis(LAGER.x, LAGER.z, 0.75);
const raeuberlager = erzeugeRaeuberlager({ rindenMaterial: baeume.rinde });
szene.add(raeuberlager.objekt);
const raeuberfeuer = erzeugeFeuer(RAEUBERLAGER.x, RAEUBERLAGER.z, { felsMaterial: natur.felsMaterial, rindenMaterial: baeume.rinde });
szene.add(raeuberfeuer.objekt);
hindernis(RAEUBERLAGER.x, RAEUBERLAGER.z, 0.75);
const feuerstellen = [
  { feuer: lagerfeuer, ort: lagerfeuer.ort, brennt: () => true },
  { feuer: raeuberfeuer, ort: raeuberfeuer.ort, brennt: () => true },
];
const feuerlichter = erzeugeFeuerlichter();
szene.add(feuerlichter.objekt);

// Die Figuren zuerst, damit der Start schnell geht. Der Einsiedler lädt danach nebenher;
// bis man beim Lager ist, steht er längst dort.
const ladestand = { er: [0, 0], sie: [0, 0] };
const figurenLaden = {
  er: ladeFigur('er', (geladen, gesamt) => { ladestand.er = [geladen, gesamt]; }),
  sie: ladeFigur('sie', (geladen, gesamt) => { ladestand.sie = [geladen, gesamt]; }),
};
figurenLaden.er.catch(() => {});
figurenLaden.sie.catch(() => {});
let einsiedler = null;
Promise.allSettled([figurenLaden.er, figurenLaden.sie]).then(() => erzeugeEinsiedler()).then((e) => {
  einsiedler = e;
  welt.einsiedler = e;
  szene.add(e.objekt);
  window.notiere?.('Einsiedler geladen');
}).catch((e) => window.zeigeFehler?.(`Der Einsiedler konnte nicht geladen werden (${e.message})`))
  .then(() => gegner.lade())
  .then(() => window.notiere?.('Räuber geladen'))
  .catch((e) => window.zeigeFehler?.(`Die Räuber konnten nicht geladen werden (${e.message})`));

window.spiel.geladen = true;
oberflaeche.laden('Bereit. Wähle deine Figur.');

// ---------------------------------------------------------------- Spieler und Regeln
const steuerung = erzeugeSteuerung({ kamera, flaeche });
erzeugeBeruehrung({ flaeche, steuerung });
let figur = null;
let figurArt = null;
let spielLaeuft = false;

const fortschritt = erzeugeFortschritt({
  beiStufe: (stufe) => {
    const p = fortschritt.zustand.punkte;
    oberflaeche.band(`Stufe ${stufe}`, `Du hast ${p} Punkte zu verteilen: ${amHandy() ? 'Menü, Figur' : 'Taste C'}.`, 'stufe');
    window.notiere?.(`Stufe ${stufe}`);
    speichereBald();
  },
  beiBerufsstufe: (beruf, stufe) => nachricht(`${BERUFE[beruf].name}: jetzt Stufe ${stufe}.`),
});
let waffeNeu = true; // die Waffe in der Hand muss neu bestimmt werden
const inventar = erzeugeInventar({ nachricht, beiAenderung: () => { waffeNeu = true; } });
const ueberleben = erzeugeUeberleben({
  beiTod: sterben,
  beiWarnung: nachricht,
  zehrFaktor: () => fortschritt.wirkung.zehrFaktor(),
  heilFaktor: () => fortschritt.wirkung.heilFaktor(),
});
ueberleben.setzeWaermequellen(feuerstellen);
const amFeuer = () => ueberleben.amFeuer(steuerung.zustand.ort);

// welt: was Ereignisse und Aufgaben brauchen (aufgaben und einsiedler kommen gleich dazu)
const welt = { ueberleben, inventar, fortschritt, herstellen: null, aufgaben: null, einsiedler };
const ereignisse = erzeugeEreignisse({ steuerung, oberflaeche, welt });
const herstellen = erzeugeHerstellen({
  inventar, fortschritt, amFeuer, baue, nachricht, gewinn,
  weiss: (m) => ereignisse.merker.has(m),
});
const aufgaben = erzeugeAufgaben({
  s: ereignisse.s, inventar, fortschritt, nachricht,
  beiErfuellt: (a, teile) => {
    oberflaeche.band('Aufgabe erfüllt', `${a.titel}${teile.length ? ` · ${teile.join(', ')}` : ''}`, 'aufgabe');
    window.notiere?.(`Aufgabe erfüllt: ${a.id}`);
    speichereBald();
  },
});
welt.herstellen = herstellen;
welt.aufgaben = aufgaben;
const benutzen = erzeugeBenutzen({
  sammeln, inventar, fortschritt, ueberleben, nachricht, gewinn,
  merke: (m) => ereignisse.merker.add(m),
});

// ---------------------------------------------------------------- Kampf
const anzeige = erzeugeKampfanzeige(kamera);
const zufallZwischen = (a, b) => Math.round(a + Math.random() * (b - a));
const gegner = erzeugeGegner({
  szene,
  istAktiv: () => steuerung.zustand.aktiv && spielLaeuft,
  beiAlarm: (g) => {
    if (g.def.boss) nachricht(`Der ${g.def.name} hat dich gesehen!`);
    tipp('kampf', amHandy() ? 'Tippe auf „Schlagen“, um zuzuschlagen. Iss zwischendurch, wenn das Leben knapp wird.' : 'Linksklick oder X: zuschlagen. Iss zwischendurch, wenn das Leben knapp wird.');
  },
  beiWarnung: (g, text) => {
    nachricht(`Der ${g.def.name} ${text}! Geh aus dem Weg!`);
    anzeige.zahl(g.objekt.position, '!', 'warnung', anzeige.kopfhoehe(g.art) + 0.3);
  },
  beiAngriff: (g, schaden) => {
    const echt = Math.max(1, Math.round(schaden * (1 - inventar.schutz())));
    anzeige.blitzen();
    anzeige.zahl(steuerung.zustand.ort, `−${echt}`, 'spieler', 1.7);
    ueberleben.verletze(echt, 'erschlagen worden');
    if (ueberleben.werte.leben < 45) tipp('heilen', 'Das Leben wird knapp: Zieh dich zurück und iss etwas, oder trag Heilsalbe auf (Menü, Inventar).');
  },
  beiTreffer: (g, schaden, volltreffer) => {
    anzeige.zahl(g.objekt.position, volltreffer ? `${schaden}!` : `${schaden}`, volltreffer ? 'voll' : '', anzeige.kopfhoehe(g.art) - 0.2);
  },
  beiSieg: (g) => {
    const def = g.def;
    fortschritt.merkeBesiegt(g.art);
    const ep = fortschritt.gibErfahrung(def.erfahrung);
    gewinn(`+${ep} Erfahrung`, 'erfahrung');
    const muenzen = zufallZwischen(...def.beute.muenzen);
    inventar.gibMuenzen(muenzen);
    gewinn(`+${muenzen} Kupfer`, 'muenzen');
    for (const [id, chance, n] of def.beute.gegenstaende) {
      if (Math.random() < chance && inventar.gib(id, n, { leise: true })) gewinn(`+${n > 1 ? `${n} × ` : ''}${gegenstand(id).name}`, id);
    }
    for (const [id, n] of Object.entries(def.einmalig ?? {})) {
      if (ereignisse.merker.has(`beute-${id}`)) continue;
      ereignisse.merker.add(`beute-${id}`);
      inventar.gib(id, n, { leise: true });
      gewinn(`+${gegenstand(id).name}`, id);
    }
    if (def.boss) oberflaeche.band(`${def.name} besiegt`, 'Er trug ein Stück Pergament bei sich: ein Teil der Karte!', 'aufgabe');
    else nachricht(`${def.name} besiegt.`);
    window.notiere?.(`Besiegt: ${g.id}`);
    speichereBald();
  },
});
const kampf = erzeugeKampf({ steuerung, inventar, fortschritt, gegner, figur: () => figur });

// ---------------------------------------------------------------- Feuer
const spielStunde = () => zeit.tag * 24 + zeit.stunde;

function entzuende(x, z, bis) {
  const feuer = erzeugeFeuer(x, z, { felsMaterial: natur.felsMaterial, rindenMaterial: baeume.rinde });
  szene.add(feuer.objekt);
  const stelle = { feuer, ort: feuer.ort, bis, eigenes: true, brennt: () => spielStunde() < bis, hindernis: hindernis(x, z, 0.7) };
  feuerstellen.push(stelle);
  return stelle;
}

// Abgebrannte Feuer verschwinden ganz
function loescheAus() {
  for (let i = feuerstellen.length - 1; i >= 0; i--) {
    const f = feuerstellen[i];
    if (!f.eigenes || f.brennt()) continue;
    szene.remove(f.feuer.objekt);
    entferneHindernis(f.hindernis);
    feuerstellen.splice(i, 1);
  }
}

// Bauwerke aus dem Rezeptbuch entstehen vor der Figur
function baue(was) {
  if (was !== 'lagerfeuer' || !figur) return false;
  const fig = figur.objekt;
  const x = fig.position.x + Math.sin(fig.rotation.y) * 1.3, z = fig.position.z + Math.cos(fig.rotation.y) * 1.3;
  if (hoeheBei(x, z) < wasserspiegel() + 0.05) { nachricht('Im Wasser brennt kein Feuer.'); return false; }
  entzuende(x, z, spielStunde() + 4); // brennt vier Spielstunden
  nachricht('Funken fallen ins trockene Gras. Das Feuer brennt.');
  return true;
}

function machFeuer() {
  const rezept = herstellen.rezept('lagerfeuer');
  if (!ereignisse.merker.has('kann-feuer')) { nachricht('Du weißt noch nicht, wie man Feuer macht.'); return; }
  const fehlt = herstellen.fehlt(rezept);
  if (fehlt.length) { nachricht(`Für ein Feuer fehlt dir: ${fehlt.join(', ')}.`); return; }
  herstellen.stelleHer(rezept);
}

// Nachts brennt eine Fackel von selbst, wenn man eine dabeihat; jede hält zwei Spielstunden.
// Ihr Licht kommt aus demselben festen Vorrat wie das der Lagerfeuer.
const FACKEL_STUNDEN = 2;
let fackelAn = false, fackelStunden = 0, fackelLicht = 0, fackelUhr = 0;
const fackel = { ort: new THREE.Vector3(), brennt: () => fackelAn, feuer: { helligkeit: () => fackelLicht } };
function fackelSchritt(dt) {
  const soll = spielLaeuft && !ueberleben.tot && zeit.hell < 0.35 && inventar.hat('fackel');
  if (soll && !fackelAn) nachricht('Du zündest eine Fackel an.');
  fackelAn = soll;
  if (!fackelAn) return;
  if (!pausiert) {
    fackelStunden += dt / SEKUNDEN_JE_STUNDE;
    if (fackelStunden >= FACKEL_STUNDEN) {
      fackelStunden = 0;
      inventar.nimm('fackel', 1);
      nachricht(inventar.hat('fackel') ? 'Die Fackel ist heruntergebrannt. Du zündest die nächste an.' : 'Deine letzte Fackel ist heruntergebrannt.');
    }
  }
  fackelUhr += dt;
  fackelLicht = 2.4 + Math.sin(fackelUhr * 11) * 0.3 + Math.sin(fackelUhr * 6.7) * 0.25;
  const o = steuerung.zustand.ort;
  fackel.ort.set(o.x, o.y + 1.0, o.z);
}

// ---------------------------------------------------------------- Essen, Menü, Hinweise
// Wer besser kocht, dessen Mahlzeiten wirken stärker (je Kochstufe fünf Prozent)
const gekocht = new Set(REZEPTE.filter((r) => r.beruf === 'kochen').map((r) => r.ergebnis));
function iss(id) {
  const g = gegenstand(id);
  if (!g.essen || !inventar.hat(id)) return false;
  inventar.nimm(id, 1);
  const faktor = gekocht.has(id) ? 1 + 0.05 * (fortschritt.berufsStufe('kochen') - 1) : 1;
  const e = Object.fromEntries(Object.entries(g.essen).map(([k, n]) => [k, Math.round(n * faktor)]));
  if (e.saettigung) { ueberleben.esse(e.saettigung); gewinn(`+${e.saettigung} Sättigung`); }
  if (e.wasser) { ueberleben.trinke(e.wasser); gewinn(`+${e.wasser} Wasser`); }
  if (e.waerme) { ueberleben.waerme(e.waerme); gewinn(`+${e.waerme} Wärme`); }
  if (e.leben) { ueberleben.heile(e.leben); gewinn(`+${e.leben} Leben`); }
  return true;
}

let neuStarten = false;
const menue = erzeugeMenue({
  inventar, fortschritt, herstellen, aufgaben, amFeuer, iss,
  wirfWeg: (id, n) => inventar.nimm(id, n),
  wechsleGrafik: () => { wechsleGrafik(); nach.zeichne(); }, // ein Bild in der neuen Stufe, auch bei offenem Menü
  grafikName: () => qualitaet.name,
  neuBeginnen: () => { neuStarten = true; loescheSpielstand(); location.reload(); },
  darfOeffnen: () => spielLaeuft && !ueberleben.tot,
  beiOffen: (offen) => {
    pausiert = offen;
    steuerung.zustand.aktiv = !offen && spielLaeuft && !ueberleben.tot;
    // Die Bildratenmessung für den Startbericht beginnt nach dem Menü von vorn
    if (!messung.fertig) { messung.ab = null; messung.bilder = 0; }
  },
});
document.getElementById('ziel').addEventListener('click', () => { if (spielLaeuft && !ueberleben.tot) menue.oeffne('aufgaben'); });
document.getElementById('hud-punkte').addEventListener('click', () => { if (spielLaeuft && !ueberleben.tot) menue.oeffne('figur'); });

// Einmalige Tipps, wenn etwas zum ersten Mal möglich ist
function tipp(id, text) {
  if (ereignisse.merker.has(`tipp-${id}`)) return;
  ereignisse.merker.add(`tipp-${id}`);
  nachricht(`Tipp: ${text}`);
}
function tippsPruefen() {
  if (inventar.belegt > 1) tipp('inventar', amHandy() ? 'Unter „Menü“ siehst du alles, was du gesammelt hast.' : 'Mit I öffnest du dein Inventar.');
  if (herstellen.liste().some((r) => !r.fehlt.length)) tipp('herstellen', amHandy() ? 'Du kannst etwas herstellen: Menü, dann „Herstellen“.' : 'Du kannst etwas herstellen: Taste K.');
  if (ueberleben.werte.saettigung < 50 && inventar.liste().some((d) => d.essen?.saettigung)) {
    tipp('essen', 'Hunger? Öffne das Inventar, tippe auf etwas Essbares und dann auf „Essen“.');
  }
}

Object.assign(window.spiel, {
  steuerung, ereignisse, ueberleben, inventar, fortschritt, herstellen, aufgaben, sammeln, benutzen, menue, gegner, kampf,
  speichere: () => speichereJetzt(),
  fackelBrennt: () => fackelAn,
  // Prüfhilfen (für werkzeuge/foto_spiel.mjs und die Browser-Konsole)
  setzeZeit: (h) => { zeit.stunde = h; tageszeitSchritt(0); },
  teleport: (x, z) => steuerung.setzeOrt(x, z),
  blick: (seite, hoehe = -0.1) => { steuerung.zustand.blickSeite = seite; steuerung.zustand.blickHoehe = hoehe; },
});

// ---------------------------------------------------------------- Spielstand
function spielstand() {
  const z = steuerung.zustand;
  return {
    figur: figurArt,
    kurz: `${figurArt === 'sie' ? 'Sie' : 'Er'} · Stufe ${fortschritt.stufe} · Tag ${zeit.tag}`,
    ort: { x: z.ort.x, z: z.ort.z },
    blick: z.blickSeite,
    ichSicht: z.ichSicht,
    zeit: { tag: zeit.tag, stunde: zeit.stunde },
    werte: { ...ueberleben.werte },
    inventar: inventar.speichern(),
    fortschritt: fortschritt.speichern(),
    aufgaben: aufgaben.speichern(),
    ereignisse: ereignisse.speichern(),
    sammeln: sammeln.speichern(),
    gegner: gegner.speichern(),
    feuer: feuerstellen.filter((f) => f.eigenes && f.brennt()).map((f) => ({ x: f.ort.x, z: f.ort.z, bis: f.bis })),
  };
}

let speicherUhr = 15;
function speichereJetzt() {
  if (!spielLaeuft || ueberleben.tot || neuStarten) return false;
  speicherUhr = 15;
  return speichereSpielstand(spielstand());
}
function speichereBald() { speicherUhr = Math.min(speicherUhr, 1); }
addEventListener('visibilitychange', () => { if (document.hidden) speichereJetzt(); });
addEventListener('pagehide', () => speichereJetzt());

function ladeStand(st) {
  zeit.tag = st.zeit?.tag ?? 1;
  zeit.stunde = st.zeit?.stunde ?? 8.5;
  tageszeitSchritt(0);
  steuerung.setzeOrt(st.ort?.x ?? START.x, st.ort?.z ?? START.z);
  if (Number.isFinite(st.blick)) steuerung.zustand.blickSeite = st.blick;
  ueberleben.setze(st.werte);
  inventar.laden(st.inventar);
  fortschritt.laden(st.fortschritt);
  ereignisse.laden(st.ereignisse);
  aufgaben.laden(st.aufgaben);
  sammeln.laden(st.sammeln);
  gegner.laden(st.gegner);
  for (const f of st.feuer ?? []) if (f.bis > spielStunde()) entzuende(f.x, f.z, f.bis);
}

// ---------------------------------------------------------------- Start
wahl.then(async (art) => {
  oberflaeche.laden('Deine Figur wird geladen …');
  const anzeige = setInterval(() => {
    const [geladen, gesamt] = ladestand[art];
    const wieviel = gesamt && geladen <= gesamt ? ` ${Math.floor((geladen / gesamt) * 100)} %` : geladen ? ` ${(geladen / 1e6).toFixed(1)} MB` : '';
    oberflaeche.laden(`Deine Figur wird geladen …${wieviel}`, false);
  }, 250);
  try {
    figur = await figurenLaden[art];
  } catch (e) {
    window.zeigeFehler?.(`Die Figur konnte nicht geladen werden (${e.message})`);
    return;
  } finally {
    clearInterval(anzeige);
  }
  figurArt = art;
  const stand = window.weiterspielen ? ladeSpielstand() : null;
  if (stand) {
    steuerung.zustand.ichSicht = !!stand.ichSicht;
    ladeStand(stand);
    window.notiere?.(`Spielstand geladen: ${stand.kurz}`);
  } else {
    steuerung.setzeOrt(START.x, START.z);
  }
  window.notiere?.('Figur geladen, Spiel beginnt');
  szene.add(figur.objekt);
  steuerung.setzeFigur(figur);
  oberflaeche.spielBeginnt();
  steuerung.zustand.aktiv = true;
  spielLaeuft = true;
  window.spiel.figur = figur;
  if (stand) nachricht(`Willkommen zurück. ${uhrzeitText()}.`);
  if (ereignisse.merker.has('hilfe-aus')) document.getElementById('hinweise').hidden = true;
  speichereJetzt();
});

function sterben(grund) {
  steuerung.zustand.aktiv = false;
  menue.schliesse();
  ereignisse.vergiss();
  gegner.zurueck();
  // Was man bei sich trägt, ist fort. Was man gelernt hat, bleibt, und das Pergament auch.
  for (const d of inventar.liste()) if (d.art !== 'aufgabe') inventar.nimm(d.id, d.anzahl);
  inventar.zahle(inventar.muenzen);
  oberflaeche.tod(grund, 'Was du bei dir hattest, ist fort. Was du gelernt hast, bleibt.');
  window.notiere?.(`Tod: ${grund}`);
  setTimeout(() => {
    if (zeit.stunde > 6.5) zeit.tag += 1;
    zeit.stunde = 6.6;
    steuerung.setzeOrt(START.x, START.z);
    ueberleben.neuBeginn();
    oberflaeche.todVorbei();
    steuerung.zustand.aktiv = true;
    nachricht(inventar.hat('pergament')
      ? 'Du wachst wieder im Gras auf. Deine Sachen sind fort, nur das Pergament steckt noch im Bund.'
      : 'Du wachst wieder im Gras auf. Alles, was du bei dir hattest, ist fort.');
    speichereJetzt();
  }, 4500);
}

// ---------------------------------------------------------------- Tasten
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyH') {
    const h = document.getElementById('hinweise');
    if (spielLaeuft) h.hidden = !h.hidden;
    return;
  }
  if (!steuerung.zustand.aktiv) return;
  if (e.code === 'KeyE' && !ereignisse.aktuell) benutzen.benutze(steuerung.zustand.ort, steuerung.zustand.blickSeite);
  if (e.code === 'KeyF') machFeuer();
  if (e.code === 'KeyX') kampf.schlage();
  if (e.code === 'KeyG') {
    wechsleGrafik();
    nachricht(`Grafik: ${qualitaet.name}`);
  }
});

flaeche.addEventListener('mousedown', (e) => {
  if (e.button === 0 && document.pointerLockElement === flaeche && steuerung.zustand.aktiv) kampf.schlage();
});

function wechsleGrafik() {
  qualitaet = naechsteStufe(qualitaet);
  merkeStufe(qualitaet);
  waechter.festhalten();
  setzeQualitaet(qualitaet);
  window.notiere?.(`Grafik gewechselt: ${qualitaet.name}`);
}

function setzeQualitaet(stufe) {
  qualitaet = stufe;
  nach.setzeQualitaet(stufe);
  gras.setzeQualitaet(stufe);
  baeume.setzeQualitaet(stufe);
  himmel.sonne.shadow.mapSize.set(stufe.schatten, stufe.schatten);
  himmel.sonne.shadow.map?.dispose();
  himmel.sonne.shadow.map = null;
  oberflaeche.zeigeQualitaet(stufe.name);
  groesse();
}
const waechter = erzeugeTempoWaechter((bps) => {
  const neu = qualitaet.name === 'hoch' ? 'mittel' : 'niedrig';
  if (neu === qualitaet.name) return;
  setzeQualitaet(STUFEN[neu]);
  window.notiere?.(`Grafik heruntergestellt: ${neu} (${Math.round(bps)} Bilder/s)`);
  nachricht(`Das Bild ruckelte (${Math.round(bps)} Bilder/s). Grafik auf „${qualitaet.name}“ gestellt – ${amHandy() ? 'im Menü unter Figur' : 'G'} änderst du das.`);
});

// ---------------------------------------------------------------- Anzeigen
// Richtung zum Ziel der verfolgten Aufgabe, vom Blick aus gesehen (0 = geradeaus, + = rechts)
function zielRichtung(ort) {
  const z = steuerung.zustand;
  const zielWinkel = Math.atan2(ort.x - z.ort.x, ort.z - z.ort.z);
  const blickWinkel = Math.atan2(-Math.sin(z.blickSeite), -Math.cos(z.blickSeite));
  const d = zielWinkel - blickWinkel;
  return -Math.atan2(Math.sin(d), Math.cos(d));
}

function anzeigen() {
  oberflaeche.zeigeWerte(ueberleben.werte);
  oberflaeche.zeigeUhr(uhrzeitText());
  const f = fortschritt.zustand;
  oberflaeche.zeigeFortschritt({ stufe: f.stufe, anteil: f.erfahrung / erfahrungFuer(f.stufe), muenzen: inventar.muenzen, punkte: f.punkte });
  const ziel = aufgaben.verfolgt;
  if (ziel?.ort) {
    const o = steuerung.zustand.ort;
    oberflaeche.zeigeZiel(ziel, zielRichtung(ziel.ort), Math.hypot(ziel.ort.x - o.x, ziel.ort.z - o.z));
  } else {
    oberflaeche.zeigeZiel(ziel);
  }
}

// ---------------------------------------------------------------- Schleife
const uhr = new THREE.Clock();
const blickpunkt = new THREE.Vector3();
let anzeigeTakt = 0, aktionTakt = 0, wachsTakt = 0;
const messung = { ab: null, bilder: 0, fertig: false };
// Längster Zeitschritt je Bild. Prüfungen im langsamen Test-Browser dürfen ihn vergrößern
// (window.SCHATZSUCHE_SCHRITT), damit dort die Spielzeit nicht im Schneckentempo vergeht.
const MAX_SCHRITT = window.SCHATZSUCHE_SCHRITT ?? 0.05;
let spielzeit = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(uhr.getDelta(), MAX_SCHRITT);
  // Bei offenem Menü steht das Bild still: Das spart Strom, und das Menü reagiert sofort
  if (pausiert) return;
  if (figur && !messung.fertig) {
    const jetzt = performance.now();
    messung.ab ??= jetzt + 5000;
    if (jetzt >= messung.ab) messung.bilder += 1;
    if (jetzt >= messung.ab + 5000) {
      messung.fertig = true;
      window.notiere?.(`Bilder pro Sekunde: ${(messung.bilder / 5).toFixed(1)} · Stufe ${qualitaet.name}`);
    }
  }
  windSchritt(dt);
  const imSpiel = steuerung.zustand.aktiv || ueberleben.tot;
  if (imSpiel) tageszeitSchritt(dt); else tageszeitSchritt(0);

  if (figur) {
    steuerung.zustand.erschoepft = ueberleben.erschoepft();
    steuerung.schritt(dt);
    ereignisse.schritt(dt);
    ueberleben.schritt(dt, { ort: steuerung.zustand.ort, tempo: steuerung.zustand.tempo });
    benutzen.schritt(dt);
    kampf.schritt(dt);
    gegner.schritt(dt, { ort: steuerung.zustand.ort, lebt: !ueberleben.tot });
    anzeige.aktualisiere(gegner.alle, steuerung.zustand.ort);
    if (waffeNeu) { waffeNeu = false; inDieHand(figur, inventar.besteWaffe()); }
    blickpunkt.copy(steuerung.zustand.ort);
  } else {
    // Vor dem Start: langsamer Kameraflug über die Wiese
    const w = wind.zeit.value * 0.04 + 2.2;
    kamera.position.set(Math.sin(w) * 13, hoeheBei(Math.sin(w) * 13, Math.cos(w) * 13) + 1.8, Math.cos(w) * 13);
    blickpunkt.set(0, hoeheBei(0, 0) + 0.9, 0);
    kamera.lookAt(blickpunkt);
  }
  himmel.aktualisiere(dt, blickpunkt);
  gras.aktualisiere(blickpunkt, kamera);
  baeume.aktualisiere(dt, blickpunkt, himmel.licht, kamera, zeit.hell);
  for (const f of feuerstellen) if (f.brennt()) f.feuer.aktualisiere(dt, wind.richtung.value, zeit.hell);
  fackelSchritt(dt);
  feuerlichter.verteile(fackelAn ? [...feuerstellen, fackel] : feuerstellen, blickpunkt);
  einsiedler?.aktualisiere(dt, blickpunkt);
  markierung.schritt(dt);
  // Augen gewöhnen sich an die Dunkelheit
  renderer.toneMappingExposure = THREE.MathUtils.lerp(1.05, 0.62, zeit.hell);

  if (spielLaeuft) {
    // Was man gerade benutzen könnte: Knopf beschriften, Stelle markieren
    aktionTakt -= dt;
    if (aktionTakt <= 0) {
      aktionTakt = 0.1;
      const z = steuerung.zustand;
      const v = z.aktiv && !ereignisse.aktuell ? benutzen.vorschlag(z.ort, z.blickSeite) : null;
      oberflaeche.zeigeAktion(v);
      markierung.zeige(v?.stelle ?? null);
      document.getElementById('knopf-schlagen').classList.toggle('bereit', gegner.imKampf().length > 0);
    }
    anzeigeTakt -= dt;
    if (anzeigeTakt <= 0) {
      anzeigeTakt = 0.25;
      aufgaben.pruefe();
      anzeigen();
      tippsPruefen();
    }
    wachsTakt -= dt;
    if (wachsTakt <= 0) {
      wachsTakt = 1;
      sammeln.wachsen();
      loescheAus();
    }
    spielzeit += dt;
    if (spielzeit > 240 && !ereignisse.merker.has('hilfe-aus')) {
      ereignisse.merker.add('hilfe-aus');
      if (!amHandy()) { document.getElementById('hinweise').hidden = true; nachricht('Tipp: Mit H zeigst du die Tastenhilfe wieder an.'); }
    }
    if (!ueberleben.tot) {
      speicherUhr -= dt;
      if (speicherUhr <= 0) speichereJetzt();
    }
  }
  waechter.schritt(dt);
  nach.zeichne();
  window.spiel.bilder = (window.spiel.bilder ?? 0) + 1;
  window.spiel.bereit = true;
});
