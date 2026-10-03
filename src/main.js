// Einstiegspunkt: baut die Welt, wartet auf die Figurenwahl und startet das Spiel.
import * as THREE from 'three';
import { erzeugeTempoWaechter, merkeStufe, naechsteStufe, startStufe, STUFEN } from './qualitaet.js';
import { erzeugeGelaende, hoeheBei } from './welt/gelaende.js';
import { erzeugeHimmel } from './welt/himmel.js';
import { erzeugeGras } from './welt/gras.js';
import { erzeugeBaeume } from './welt/baeume.js';
import { erzeugeNatur } from './welt/natur.js';
import { erzeugeWasser } from './welt/wasser.js';
import { erzeugeFeuer, erzeugeFeuerlichter } from './welt/feuer.js';
import { erzeugeFundstuecke } from './welt/fundstuecke.js';
import { hindernis } from './welt/kollision.js';
import { wind, windSchritt } from './welt/wind.js';
import { tageszeitSchritt, uhrzeitText, zeit } from './welt/tageszeit.js';
import { LAGER, START } from './welt/orte.js';
import { ladeFigur } from './spieler/figur.js';
import { erzeugeSteuerung } from './spieler/steuerung.js';
import { erzeugeEinsiedler } from './figuren/einsiedler.js';
import { erzeugeEreignisse } from './ereignisse/ereignisse.js';
import { erzeugeUeberleben } from './ueberleben/werte.js';
import { erzeugeOberflaeche } from './ui/oberflaeche.js';
import { erzeugeBeruehrung } from './ui/beruehrung.js';
import { erzeugeNachbearbeitung } from './nachbearbeitung.js';

const atmen = () => new Promise((r) => setTimeout(r, 0));
const flaeche = document.getElementById('welt');
const oberflaeche = erzeugeOberflaeche();
let qualitaet = startStufe();
oberflaeche.zeigeQualitaet(qualitaet.name);

const renderer = new THREE.WebGLRenderer({ canvas: flaeche, antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;

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
addEventListener('resize', groesse);
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
const fundstuecke = erzeugeFundstuecke(baeume.rinde);
szene.add(fundstuecke.objekt);

oberflaeche.laden('Das Lager am Waldrand …');
await atmen();
const lagerfeuer = erzeugeFeuer(LAGER.x, LAGER.z, { felsMaterial: natur.felsMaterial, rindenMaterial: baeume.rinde });
szene.add(lagerfeuer.objekt);
hindernis(LAGER.x, LAGER.z, 0.75);
const feuerstellen = [{ feuer: lagerfeuer, ort: lagerfeuer.ort, brennt: () => true }];
const feuerlichter = erzeugeFeuerlichter();
szene.add(feuerlichter.objekt);
let einsiedler = null;
try {
  einsiedler = await erzeugeEinsiedler();
  szene.add(einsiedler.objekt);
} catch (e) {
  window.zeigeFehler?.(`Der Einsiedler konnte nicht geladen werden (${e.message})`);
}

// Figuren schon vorab laden, damit der Start schnell geht
const figurenLaden = { er: ladeFigur('er'), sie: ladeFigur('sie') };
figurenLaden.er.catch(() => {});
figurenLaden.sie.catch(() => {});

window.spiel.geladen = true;
oberflaeche.laden('Bereit.', true);

// ---------------------------------------------------------------- Spiel
const steuerung = erzeugeSteuerung({ kamera, flaeche });
erzeugeBeruehrung({ flaeche, steuerung });
const beerenGepflueckt = new Map();
const ueberleben = erzeugeUeberleben({ beiTod: sterben, beiWarnung: (t) => oberflaeche.nachricht(t) });
ueberleben.setzeWaermequellen(feuerstellen);
const welt = { ueberleben, fundstuecke, natur, einsiedler, beerenGepflueckt };
const ereignisse = erzeugeEreignisse({ steuerung, oberflaeche, welt });
Object.assign(window.spiel, {
  steuerung, ereignisse, ueberleben,
  // Prüfhilfen (für werkzeuge/foto_spiel.mjs und die Browser-Konsole)
  setzeZeit: (h) => { zeit.stunde = h; tageszeitSchritt(0); },
  teleport: (x, z) => steuerung.setzeOrt(x, z),
  blick: (seite, hoehe = -0.1) => { steuerung.zustand.blickSeite = seite; steuerung.zustand.blickHoehe = hoehe; },
});
let figur = null;

oberflaeche.warteAufStart().then(async (art) => {
  oberflaeche.laden('Figur wird geladen …');
  try {
    figur = await figurenLaden[art];
  } catch (e) {
    window.zeigeFehler?.(`Die Figur konnte nicht geladen werden (${e.message})`);
    return;
  }
  szene.add(figur.objekt);
  steuerung.setzeFigur(figur);
  steuerung.setzeOrt(START.x, START.z);
  oberflaeche.spielBeginnt();
  steuerung.zustand.aktiv = true;
  window.spiel.figur = figur;
});

function sterben(grund) {
  steuerung.zustand.aktiv = false;
  oberflaeche.tod(grund);
  setTimeout(() => {
    if (zeit.stunde > 6.5) zeit.tag += 1;
    zeit.stunde = 6.6;
    steuerung.setzeOrt(START.x, START.z);
    ueberleben.neuBeginn();
    ereignisse.vergissInventar();
    oberflaeche.todVorbei();
    steuerung.zustand.aktiv = true;
    oberflaeche.nachricht('Du wachst wieder im Gras auf. Alles, was du bei dir hattest, ist fort.');
  }, 4500);
}

// Feuer machen (nachdem der Einsiedler es gezeigt hat)
addEventListener('keydown', (e) => {
  if (e.repeat || !steuerung.zustand.aktiv) return;
  if (e.code === 'KeyF') {
    const s = ereignisse.s;
    if (!s.weiss('kann-feuer')) { oberflaeche.nachricht('Du weißt noch nicht, wie man Feuer macht.'); return; }
    if (!s.hat('Ast', 3) || !s.hat('Feuerstein')) { oberflaeche.nachricht('Du brauchst drei Äste und einen Feuerstein.'); return; }
    s.nimm('Ast', 3);
    const fig = figur.objekt;
    const x = fig.position.x + Math.sin(fig.rotation.y) * 1.3, z = fig.position.z + Math.cos(fig.rotation.y) * 1.3;
    const feuer = erzeugeFeuer(x, z, { felsMaterial: natur.felsMaterial, rindenMaterial: baeume.rinde });
    szene.add(feuer.objekt);
    const bisStunde = zeit.tag * 24 + zeit.stunde + 4; // brennt vier Spielstunden
    const stelle = { feuer, ort: feuer.ort, brennt: () => zeit.tag * 24 + zeit.stunde < bisStunde, hindernis: hindernis(x, z, 0.7) };
    feuerstellen.push(stelle);
    oberflaeche.nachricht('Funken fallen ins trockene Gras. Das Feuer brennt.');
  }
  if (e.code === 'KeyG') {
    qualitaet = naechsteStufe(qualitaet);
    merkeStufe(qualitaet);
    setzeQualitaet(qualitaet);
    oberflaeche.nachricht(`Grafik: ${qualitaet.name}`);
  }
});

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
  oberflaeche.nachricht(`Das Bild ruckelte (${Math.round(bps)} Bilder/s). Grafik auf „${qualitaet.name}“ gestellt – G ändert das.`);
});

// ---------------------------------------------------------------- Schleife
const uhr = new THREE.Clock();
const blickpunkt = new THREE.Vector3();
let anzeigeTakt = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(uhr.getDelta(), 0.05);
  windSchritt(dt);
  const imSpiel = steuerung.zustand.aktiv || ueberleben.tot;
  if (imSpiel) tageszeitSchritt(dt); else tageszeitSchritt(0);

  if (figur) {
    steuerung.zustand.erschoepft = ueberleben.erschoepft();
    steuerung.schritt(dt);
    ereignisse.schritt(dt);
    ueberleben.schritt(dt, { ort: steuerung.zustand.ort, tempo: steuerung.zustand.tempo });
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
  feuerlichter.verteile(feuerstellen, blickpunkt);
  einsiedler?.aktualisiere(dt, blickpunkt);
  // Augen gewöhnen sich an die Dunkelheit
  renderer.toneMappingExposure = THREE.MathUtils.lerp(1.05, 0.62, zeit.hell);

  anzeigeTakt -= dt;
  if (anzeigeTakt <= 0 && figur) {
    anzeigeTakt = 0.25;
    oberflaeche.zeigeWerte(ueberleben.werte);
    oberflaeche.zeigeUhr(uhrzeitText());
    for (const [i, bis] of beerenGepflueckt) {
      if (zeit.tag + zeit.stunde / 24 >= bis) { natur.beeren.wachse(i); beerenGepflueckt.delete(i); }
    }
    for (const f of feuerstellen) {
      if (!f.brennt() && f.feuer.objekt.visible && f.hindernis) f.feuer.objekt.visible = false;
    }
  }
  waechter.schritt(dt);
  nach.zeichne();
  window.spiel.bilder = (window.spiel.bilder ?? 0) + 1;
  window.spiel.bereit = true;
});
