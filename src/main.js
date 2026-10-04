// Einstiegspunkt: baut die Welt, wartet auf die Figurenwahl und startet das Spiel.
import * as THREE from 'three';
import { erzeugeTempoWaechter, merkeStufe, naechsteStufe, startStufe, STUFEN } from './qualitaet.js';
import { aendereBoden, erzeugeGelaende, hoeheBei, neigungBei, pfadAbstand, waldDichte, wasserspiegel } from './welt/gelaende.js';
import { erzeugeBauen } from './welt/bauen.js';
import { druecke } from './welt/bodenspuren.js';
import { erzeugeHimmel } from './welt/himmel.js';
import { erzeugeGras } from './welt/gras.js';
import { erzeugeBaeume } from './welt/baeume.js';
import { erzeugeNatur } from './welt/natur.js';
import { erzeugeUnterholz } from './welt/unterholz.js';
import { erzeugeFeen } from './welt/feen.js';
import { erzeugeTiere } from './welt/tiere.js';
import { baueForm } from './welt/waffen.js';
import { erzeugeWasser } from './welt/wasser.js';
import { erzeugeFeuer, erzeugeFeuerlichter, erzeugeFlamme } from './welt/feuer.js';
import { erzeugeSammeln } from './welt/sammeln.js';
import { erzeugeMarkierung } from './welt/markierung.js';
import { AUFWACHSEN, AUSTREIBEN, erzeugeFaellen } from './welt/faellen.js';
import { erzeugeRaeuberlager } from './welt/raeuberlager.js';
import { erzeugeDorf, erzeugeGraufurt } from './welt/dorf.js';
import { inDieHand } from './welt/waffen.js';
import { entferneHindernis, hindernis, kreisFrei } from './welt/kollision.js';
import { wind, windSchritt } from './welt/wind.js';
import { SEKUNDEN_JE_STUNDE, tageszeitSchritt, uhrzeitText, zeit } from './welt/tageszeit.js';
import { DOERFLER_GRAUFURT, DORF, GRAUFURT, LAGER, RAEUBERLAGER, START } from './welt/orte.js';
import { BAUWERKE } from './inhalte/rezepte.js';
import { ladeFigur } from './spieler/figur.js';
import { erzeugeSteuerung } from './spieler/steuerung.js';
import { erzeugeInventar } from './spieler/inventar.js';
import { erfahrungFuer, erzeugeFortschritt } from './spieler/fortschritt.js';
import { erzeugeHerstellen } from './spieler/herstellen.js';
import { erzeugeBenutzen } from './spieler/benutzen.js';
import { erzeugeHandel } from './spieler/handel.js';
import { erzeugeAngeln } from './spieler/angeln.js';
import { erzeugeEinsiedler } from './figuren/einsiedler.js';
import { erzeugeDoerfler } from './figuren/doerfler.js';
import { erzeugeEreignisse } from './ereignisse/ereignisse.js';
import { erzeugeAufgaben } from './ereignisse/aufgaben.js';
import { erzeugeBegegnungen } from './ereignisse/begegnungen.js';
import { erzeugeGegner } from './kampf/gegner.js';
import { erzeugeKampf } from './kampf/kampf.js';
import { erzeugeUeberleben } from './ueberleben/werte.js';
import { erzeugeOberflaeche } from './ui/oberflaeche.js';
import { erzeugeBeruehrung } from './ui/beruehrung.js';
import { erzeugeMenue } from './ui/menue.js';
import { erzeugeKampfanzeige } from './ui/kampfanzeige.js';
import { erzeugeEditor } from './ui/editor.js';
import { erzeugeKarte } from './ui/karte.js';
import { ergaenze, wachse, wendeAn } from './spieler/aussehen.js';
import { erzeugeNachbearbeitung } from './nachbearbeitung.js';
import { BERUFE } from './inhalte/berufe.js';
import { benenne, gegenstand } from './inhalte/gegenstaende.js';
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
for (const h of natur.hindernisse) h.griff = hindernis(h.x, h.z, h.radius);
const unterholz = erzeugeUnterholz(qualitaet, { rinde: baeume.rinde, baeume: baeume.hindernisse });
szene.add(unterholz.objekt);
const sammeln = erzeugeSammeln({ natur, baeume });
szene.add(sammeln.objekt);
const markierung = erzeugeMarkierung();
szene.add(markierung.objekt);
const faellen = erzeugeFaellen({ szene, baeume });
const bauen = erzeugeBauen({ szene, rinde: baeume.rinde, felsMaterial: natur.felsMaterial, spielStunde: () => spielStunde() });

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
oberflaeche.laden('Das Dorf Erlenbach …');
await atmen();
const dorf = erzeugeDorf();
szene.add(dorf.objekt);
const graufurt = erzeugeGraufurt();
szene.add(graufurt.objekt);
const feuerstellen = [
  { feuer: lagerfeuer, ort: lagerfeuer.ort, brennt: () => true },
  { feuer: raeuberfeuer, ort: raeuberfeuer.ort, brennt: () => true },
  graufurt.esse,
];
const feuerlichter = erzeugeFeuerlichter(3);
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
  .then(() => tiere.lade())
  .then(() => window.notiere?.('Tiere geladen'))
  .catch((e) => window.zeigeFehler?.(`Die Räuber konnten nicht geladen werden (${e.message})`));

// Die Leute von Erlenbach laden erst, wenn man sich dem Dorf nähert: Das spart am Handy
// Speicher und Datenvolumen. Bis man dort ist, stehen sie längst an ihrem Platz.
// Beide Dörfer laden ihre Leute erst, wenn man in die Nähe kommt; für Benutzen und Anzeigen zählen sie zusammen
let doerfler = null;
const dorfLeute = [];
const geladeneDoerfer = new Set();
function doerflerPruefen(ort) {
  for (const [name, mitte, liste] of [['erlenbach', DORF, undefined], ['graufurt', GRAUFURT, DOERFLER_GRAUFURT]]) {
    if (geladeneDoerfer.has(name) || Math.hypot(ort.x - mitte.x, ort.z - mitte.z) > 160) continue;
    geladeneDoerfer.add(name);
    erzeugeDoerfler(liste, mitte).then((d) => {
      dorfLeute.push(d);
      for (const p of d.leute) szene.add(p.objekt);
      doerfler = {
        leute: dorfLeute.flatMap((x) => x.leute),
        aktualisiere: (dt, o) => { for (const x of dorfLeute) x.aktualisiere(dt, o); },
        naechster: (o) => dorfLeute.map((x) => x.naechster(o)).find(Boolean) ?? null,
      };
      window.spiel.doerfler = doerfler;
      window.notiere?.(`Dorfbewohner geladen (${name})`);
    }).catch((e) => window.zeigeFehler?.(`Die Leute im Dorf konnten nicht geladen werden (${e.message})`));
  }
}

window.spiel.geladen = true;
oberflaeche.laden('Bereit. Wähle deine Figur.');

// ---------------------------------------------------------------- Spieler und Regeln
const steuerung = erzeugeSteuerung({ kamera, flaeche });
erzeugeBeruehrung({ flaeche, steuerung });
const editor = erzeugeEditor({ kamera, flaeche });
let figur = null;
let figurArt = null;
let spielLaeuft = false;
let aussehen = null; // Gesicht, Haare, Körper (src/spieler/aussehen.js); wächst im Spiel mit
// Das Aussehen auf die eigene Figur (Muskeln hängen auch an der Stärke)
const zeigeAussehen = () => {
  if (figur && aussehen) wendeAn(figur, aussehen, { staerke: fortschritt.zustand.werte.staerke, wams: inventar.hat('lederwams') });
};

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
const inventar = erzeugeInventar({ nachricht, beiAenderung: () => { waffeNeu = true; zeigeAussehen(); } });
const ueberleben = erzeugeUeberleben({
  beiTod: sterben,
  beiWarnung: nachricht,
  zehrFaktor: () => fortschritt.wirkung.zehrFaktor(),
  kaelteSchutz: () => inventar.kleidungsWaerme(),
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
    oberflaeche.band('Geschafft', `${a.titel}${teile.length ? ` · ${teile.join(', ')}` : ''}`, 'aufgabe');
    window.notiere?.(`Aufgabe erfüllt: ${a.id}`);
    speichereBald();
  },
});
welt.herstellen = herstellen;
welt.aufgaben = aufgaben;
const handel = erzeugeHandel({ inventar, fortschritt, nachricht, gewinn });
let aktionTakt = 0;
const angeln = erzeugeAngeln({
  szene, steuerung, inventar, fortschritt, figur: () => figur, nachricht, gewinn,
  beiBiss: () => { aktionTakt = 0; nachricht('Biss! Jetzt ziehen!'); },
  beiWurf: () => { waffeNeu = true; aktionTakt = 0; },
});
// Ab dieser Wassermenge wirft man am Ufer die Angel aus, statt zu trinken
const DURSTIG = 70;
const benutzen = erzeugeBenutzen({
  sammeln, inventar, fortschritt, ueberleben, nachricht, gewinn,
  merke: (m) => ereignisse.merker.add(m),
  beiErnte: (regel, stelle) => {
    if (aussehen && regel.beruf === 'holzfaellen') aussehen.arbeit += 1;
    // Was am Boden liegt oder wächst, hebt man gebückt auf
    if (stelle && stelle.art !== 'baum' && stelle.art !== 'beeren' && figur) {
      steuerung.dreheZu(Math.atan2(stelle.x - steuerung.zustand.ort.x, stelle.z - steuerung.zustand.ort.z), 0.6);
      figur.buecke();
    }
  },
  zusatz: [
    // Beim Bauen heißt „Benutzen“: hier hinsetzen
    () => {
      const plan = bauen.plan;
      if (!plan) return null;
      const name = BAUWERKE[plan.art].name;
      if (bauen.grund) return { text: bauen.grund, kurz: 'Geht nicht', tue: () => { nachricht(bauen.grund); return false; } };
      return { text: plan.auf ? `${name} aufschütten` : `${name} hier bauen`, kurz: 'Bauen', tue: setzeBauwerk };
    },
    // Beim Angeln heißt „Benutzen“: ziehen
    () => (angeln.aktiv
      ? (angeln.biss ? { text: 'Jetzt ziehen!', kurz: 'Ziehen', tue: angeln.ziehe } : { text: 'Angel einholen', kurz: 'Einholen', tue: angeln.ziehe })
      : null),
    // Jemanden ansprechen
    (ort) => {
      const p = doerfler?.naechster(ort);
      return p ? { text: `Mit ${p.name} sprechen`, kurz: 'Sprechen', tue: () => ereignisse.zeige(`gespraech-${p.art}`) } : null;
    },
    // Mit der Angel am Ufer (wer Durst hat, trinkt zuerst)
    () => (ueberleben.werte.wasser >= DURSTIG && angeln.kannWerfen() ? { text: 'Angel auswerfen', kurz: 'Angeln', tue: angeln.wirfAus } : null),
    // Mit der Axt: einen liegenden Baum entästen und zerteilen …
    (ort) => {
      if (inventar.werkzeugStufe('axt') <= 0) return null;
      const v = faellen.vorschlag(ort);
      return v ? { ...v, tue: () => arbeiteAmStamm(v.liegend) } : null;
    },
    // … oder einen stehenden fällen
    (ort, blickSeite) => {
      if (inventar.werkzeugStufe('axt') <= 0) return null;
      const st = sammeln.naechste(ort, blickSeite);
      if (st?.art !== 'baum') return null;
      const nr = Number(st.id.slice(5));
      if (faellen.istJung(nr)) return { text: 'Der Baum ist noch zu jung', kurz: 'Zu jung', stelle: st, tue: () => { nachricht('Der Baum ist noch zu jung zum Fällen. Lass ihn wachsen.'); return false; } };
      const k = faellen.kerbe(nr);
      return { text: k ? `Baum fällen (${k}/${faellen.noetig(nr)})` : 'Baum fällen', kurz: 'Fällen', stelle: st, tue: () => faelleSchlag(st, nr) };
    },
    // Mit der Spitzhacke: Steine aus einem Felsen brechen
    (ort) => {
      if (inventar.werkzeugStufe('hacke') <= 0) return null;
      const f = naechsterFels(ort);
      return f ? { text: 'Fels abbauen', kurz: 'Abbauen', tue: () => baueFelsAb(f) } : null;
    },
    // Nachts am Feuer: schlafen bis zum Morgen
    () => (kannSchlafen() ? { text: amFeuer() ? 'Am Feuer schlafen' : 'Im Unterstand schlafen', kurz: 'Schlafen', tue: schlafe } : null),
  ],
  danach: [
    // Mit der Schaufel: überall auf freiem Boden graben
    (ort) => (inventar.werkzeugStufe('schaufel') > 0 && grabStelle(ort) ? { text: 'Graben', kurz: 'Graben', tue: grabe } : null),
  ],
});

// ---------------------------------------------------------------- Bauen, Graben, Felsen
function setzeBauwerk() {
  const plan = bauen.plan;
  if (!plan) return false;
  const art = plan.art;
  const fehlt = herstellen.fehlt(herstellen.rezept(art));
  if (fehlt.length) { nachricht(`Dafür fehlt dir: ${fehlt.join(', ')}.`); bauen.abbrechen(); return false; }
  bauBestaetigt = true;
  const ok = herstellen.stelleHer(herstellen.rezept(art));
  bauBestaetigt = false;
  if (!ok) return false;
  figur?.buecke(1.0);
  ereignisse.merker.add(`gebaut-${art}`);
  speichereBald();
  // Gleich weiterbauen (eine lange Mauer), solange das Material reicht
  if (!herstellen.fehlt(herstellen.rezept(art)).length) bauen.beginne(art);
  else nachricht(`${BAUWERKE[art].name} steht. Für ein weiteres Stück fehlt das Material.`);
  return true;
}

// Wo man gräbt: etwas vor der Figur. Nicht auf Wegen, im Dorf, in Lagern, an Bäumen, Felsen oder Gebautem.
const gegraben = []; // [x, z] für den Spielstand
// Frisch aufgegrabene Erde: eine dunkle, feuchte Scheibe, die sich in die Grube legt
const grubenMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
const gruben = [];
function zeigeGrube(x, z) {
  let g = gruben.find((o) => Math.hypot(o.userData.x - x, o.userData.z - z) < 0.6);
  if (!g) {
    g = new THREE.Mesh(new THREE.CircleGeometry(1, 20), grubenMat);
    g.geometry.rotateX(-Math.PI / 2);
    g.userData = { x, z, rand: Array.from({ length: 21 }, () => 0.75 + Math.random() * 0.35) };
    g.receiveShadow = true;
    szene.add(g);
    gruben.push(g);
  }
  // an den Boden anschmiegen (der Rand wellig wie ausgestochen)
  const pos = g.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const w = Math.atan2(pos.getZ(i), pos.getX(i));
    const r = Math.hypot(pos.getX(i), pos.getZ(i));
    const f = r > 0.01 ? g.userData.rand[Math.round(((w + Math.PI) / (2 * Math.PI)) * 20)] / r : 0;
    const px = pos.getX(i) * f * 1.05, pz = pos.getZ(i) * f * 1.05;
    pos.setXYZ(i, px, hoeheBei(x + px, z + pz) + 0.03, pz);
  }
  pos.needsUpdate = true;
  g.geometry.computeVertexNormals();
}
function grabStelle(ort) {
  const w = steuerung.zustand.blickSeite + Math.PI; // dorthin, wohin man schaut
  const x = ort.x + Math.sin(w) * 1.1, z = ort.z + Math.cos(w) * 1.1;
  if (pfadAbstand(x, z) < 2.2) return null;
  if (Math.hypot(x - DORF.x, z - DORF.z) < DORF.radius + 6 || Math.hypot(x - LAGER.x, z - LAGER.z) < LAGER.radius + 1 || Math.hypot(x - RAEUBERLAGER.x, z - RAEUBERLAGER.z) < RAEUBERLAGER.radius) return null;
  if (neigungBei(x, z) > 0.8 || !kreisFrei(x, z, 1.4)) return null;
  if (hoeheBei(x, z) < wasserspiegel() - 0.3) return null;
  return { x, z };
}
function grabe() {
  const st = grabStelle(steuerung.zustand.ort);
  if (!st) return false;
  const amUfer = hoeheBei(st.x, st.z) < wasserspiegel() + 0.9;
  const tiefe = aendereBoden(st.x, st.z, 0.3, 1.6);
  if (tiefe < 0.02) { nachricht('Tiefer kommst du hier nicht. Unten ist fester Fels.'); return false; }
  gegraben.push([+st.x.toFixed(2), +st.z.toFixed(2)]);
  druecke(st.x, st.z, 1.3, 1);
  zeigeGrube(st.x, st.z);
  figur?.buecke(1.1);
  const fund = amUfer ? 'lehm' : 'erde';
  if (inventar.gib(fund, 1, { leise: true })) gewinn(`+${gegenstand(fund).name}`, fund);
  // Ab und zu kommt beim Graben etwas zum Vorschein
  const r = Math.random();
  if (r < 0.12) { if (inventar.gib('stein', 1, { leise: true })) gewinn('+Stein', 'stein'); }
  else if (r < 0.14) { inventar.gibMuenzen(3); gewinn('+3 Kupfer', 'muenzen'); nachricht('Da glänzt etwas in der Erde: eine alte Kupfermünze, noch aus der Zeit der Alten Könige.'); }
  gewinn(`+${fortschritt.gibErfahrung(1, 'sammeln')} Erfahrung`, 'erfahrung');
  if (aussehen) aussehen.arbeit += 0.5;
  speichereBald();
  return true;
}

// Felsen: Mit jedem Schlag wird der Fels kleiner, bis nichts mehr übrig ist
const FELS_KLEINSTER = 0.4;
const abgebaut = new Map(); // "x,z" -> Größe
const felsSchluessel = (f) => `${Math.round(f.x)},${Math.round(f.z)}`;
function naechsterFels(ort) {
  let beste = null, d = Infinity;
  for (const h of natur.hindernisse) {
    if (!h.griff || h.fels.s < FELS_KLEINSTER) continue;
    const di = Math.hypot(h.x - ort.x, h.z - ort.z) - h.radius;
    if (di < 1.0 && di < d) { d = di; beste = h; }
  }
  return beste;
}
function setzeFels(h, groesse) {
  natur.setzeFelsGroesse(h.fels, groesse < FELS_KLEINSTER ? 0 : groesse);
  abgebaut.set(felsSchluessel(h.fels), +groesse.toFixed(3));
  if (groesse < FELS_KLEINSTER) { entferneHindernis(h.griff); h.griff = null; } else h.griff.radius = groesse * 0.95;
}
function baueFelsAb(h) {
  axthieb(h.x, h.z);
  setzeFels(h, h.fels.s - 0.14);
  const n = 1 + (Math.random() < 0.5 ? 1 : 0);
  if (inventar.gib('stein', n, { leise: true })) gewinn(`+${benenne('stein', n)}`, 'stein');
  if (Math.random() < 0.12 && inventar.gib('feuerstein', 1, { leise: true })) gewinn('+Feuerstein', 'feuerstein');
  gewinn(`+${fortschritt.gibErfahrung(3, 'sammeln')} Erfahrung`, 'erfahrung');
  if (!h.griff) nachricht('Vom Felsen ist nichts mehr übrig.');
  speichereBald();
  return true;
}

// ---------------------------------------------------------------- Holzfällen
// Jeder Schlag ist ein sichtbarer Axthieb zum Baum hin. Der letzte lässt ihn fallen.
function axthieb(x, z) {
  const o = steuerung.zustand.ort;
  steuerung.dreheZu(Math.atan2(x - o.x, z - o.z), 0.7);
  figur?.spiele('hieb', { tempo: 1.1, ein: 0.12, aus: 0.25 });
  if (aussehen) aussehen.arbeit += 1;
}
function faelleSchlag(stelle, nr) {
  axthieb(stelle.x, stelle.z);
  const r = faellen.hacke(nr, steuerung.zustand.ort, inventar.werkzeugStufe('axt'));
  gewinn(`+${fortschritt.gibErfahrung(2, 'holzfaellen')} Erfahrung`, 'erfahrung');
  if (r.faellt) {
    sammeln.nimm(stelle, AUSTREIBEN + AUFWACHSEN * 0.55); // erst ein halbwüchsiger Baum lässt sich wieder nutzen
    nachricht('Der Baum kippt … und schlägt krachend auf!');
    gewinn(`+${fortschritt.gibErfahrung(10, 'holzfaellen')} Erfahrung`, 'erfahrung');
    ereignisse.merker.add('baum-gefaellt');
    speichereBald();
  }
  return true;
}
function arbeiteAmStamm(liegend) {
  const o = steuerung.zustand.ort;
  axthieb(liegend.form.x + liegend.richtung.x * 3, liegend.form.z + liegend.richtung.z * 3);
  const beute = faellen.bearbeite(liegend, o);
  for (const [id, n] of Object.entries(beute)) {
    const k = inventar.gib(id, n, { leise: true });
    if (k > 0) gewinn(`+${benenne(id, k)}`, id);
  }
  gewinn(`+${fortschritt.gibErfahrung(3, 'holzfaellen')} Erfahrung`, 'erfahrung');
  return true;
}

// ---------------------------------------------------------------- Schlafen
// Nachts an einem brennenden Feuer kann man schlafen. Man wacht bei Sonnenaufgang auf: ausgeruht und
// warm, aber hungriger und durstiger. Solange Feinde in der Nähe sind, findet man keine Ruhe.
const istNacht = () => zeit.stunde >= 20 || zeit.stunde < 5;
let schlaeft = false;
function kannSchlafen() {
  return istNacht() && !schlaeft && (amFeuer() || !!bauen.unterstandBei(steuerung.zustand.ort)) && !gegner.imKampf().length;
}
// imBett: im Gasthaus (dort geht es ohne Feuer)
function schlafe(imBett = false) {
  if (imBett !== true && !kannSchlafen()) return false;
  schlaeft = true;
  steuerung.zustand.aktiv = false;
  const vorhang = document.getElementById('schlaf');
  vorhang.textContent = imBett === true ? 'Du schläfst in einem weichen Bett …' : amFeuer() ? 'Du schläfst am Feuer …' : 'Du schläfst im Unterstand …';
  vorhang.classList.add('zu');
  setTimeout(() => {
    const stunden = (24 + 6.5 - zeit.stunde) % 24;
    if (zeit.stunde >= 20) zeit.tag += 1;
    zeit.stunde = 6.5;
    tageszeitSchritt(0);
    const w = ueberleben.werte;
    w.saettigung = Math.max(5, w.saettigung - stunden * 2);
    w.wasser = Math.max(5, w.wasser - stunden * 2.5);
    w.waerme = 100;
    ueberleben.heile(60);
    vorhang.textContent = 'Der Morgen graut.';
    setTimeout(() => {
      vorhang.classList.remove('zu');
      steuerung.zustand.aktiv = !ueberleben.tot;
      schlaeft = false;
      nachricht(`Du hast ${Math.round(stunden)} Stunden geschlafen. ${uhrzeitText()}.`);
      speichereBald();
    }, 1600);
  }, 1600);
  return true;
}

// ---------------------------------------------------------------- Begegnungen unterwegs
// Wegelagerer, Mitfahren mit einer Karawane, ein Sturm, der einen Baum umwirft (src/ereignisse/begegnungen.js)
welt.schlafeImBett = () => schlafe(true);
welt.ueberfall = (n) => gegner.ueberfall(steuerung.zustand.ort, n);
welt.reise = (x, z, stunden, text) => {
  steuerung.zustand.aktiv = false;
  const vorhang = document.getElementById('schlaf');
  vorhang.textContent = text;
  vorhang.classList.add('zu');
  setTimeout(() => {
    steuerung.setzeOrt(x, z);
    zeit.stunde += stunden;
    if (zeit.stunde >= 24) { zeit.stunde -= 24; zeit.tag += 1; }
    tageszeitSchritt(0);
    setTimeout(() => { vorhang.classList.remove('zu'); steuerung.zustand.aktiv = !ueberleben.tot; speichereBald(); }, 1400);
  }, 1800);
};
welt.sturm = () => {
  const o = steuerung.zustand.ort;
  let beste = -1, d = Infinity;
  baeume.hindernisse.forEach((h, nr) => {
    if (h.art !== 'baum' || baeume.baum(nr).weg || baeume.baum(nr).wuchs < 1) return;
    const e = Math.hypot(h.x - o.x, h.z - o.z);
    if (e > 9 && e < 30 && e < d) { d = e; beste = nr; }
  });
  if (beste < 0) return;
  const h = baeume.hindernisse[beste];
  // vom Spieler weg fallen lassen
  const r = new THREE.Vector3(h.x - o.x, 0, h.z - o.z).normalize();
  faellen.stuerzeUm(beste, r);
  const st = sammeln.stelle(`baum-${beste}`);
  if (st) sammeln.nimm(st, AUSTREIBEN + AUFWACHSEN * 0.55);
};
const begegnungen = erzeugeBegegnungen({
  ereignisse,
  darf: () => !window.SCHATZSUCHE_OHNE_BEGEGNUNGEN && spielLaeuft && !pausiert && !schlaeft && steuerung.zustand.aktiv && !ereignisse.aktuell && !gegner.imKampf().length && !bauen.plan && !angeln.aktiv,
  lage: () => {
    const o = steuerung.zustand.ort;
    return {
      imDorf: Math.hypot(o.x - DORF.x, o.z - DORF.z) < DORF.radius + 20,
      anStrasse: pfadAbstand(o.x, o.z) < 6,
      imWald: waldDichte(o.x, o.z) > 0.4,
      nacht: zeit.hell < 0.35,
    };
  },
});

// ---------------------------------------------------------------- Tiere
const feen = erzeugeFeen({ szene });
const karte = erzeugeKarte({ huelle: document.getElementById('karte') });
const tiere = erzeugeTiere({
  szene,
  beiErlegt: (t) => {
    for (const [id, n] of Object.entries(t.def.beute)) if (inventar.gib(id, n, { leise: true })) gewinn(`+${benenne(id, n)}`, id);
    gewinn(`+${fortschritt.gibErfahrung(t.def.erfahrung, 'jagen')} Erfahrung`, 'erfahrung');
    ereignisse.merker.add(`erlegt-${t.art}`);
    speichereBald();
  },
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
    if (aussehen) aussehen.arbeit += 0.5;
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
let bauBestaetigt = false;
function baue(was) {
  // Bauwerke zum Setzen: erst eine Vorschau vor der Figur; „Benutzen“ setzt es (dann wird verbraucht)
  if (BAUWERKE[was]?.setzen) {
    if (bauBestaetigt && bauen.plan?.art === was) return bauen.setze();
    bauen.beginne(was);
    tipp('bauen', amHandy() ? 'Dreh dich, bis die Vorschau richtig steht, dann tippe auf „Bauen“. Abbrechen: Menü öffnen.' : 'Dreh dich, bis die Vorschau richtig steht, dann drück E. Abbrechen: B oder Esc.');
    return false;
  }
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

// Die Fackel: Nachts nimmt man sie von selbst in die linke Hand, wenn man eine dabeihat; mit T steckt man
// sie weg oder zündet sie an (dann gilt das bis zur nächsten Dämmerung). Jede brennt drei Spielstunden.
// Sie hat ein eigenes Licht, das immer da ist und nur hell oder dunkel geschaltet wird (ein neues Licht
// zu jeder Zeit ließe die Grafikkarte alles neu übersetzen, und das Bild stünde kurz still).
const FACKEL_STUNDEN = 3;
let fackelAn = false, fackelStunden = 0, fackelUhr = 0, fackelWunsch = null, warNacht = false;
const fackelFlamme = erzeugeFlamme();
fackelFlamme.objekt.visible = false;
szene.add(fackelFlamme.objekt);
const fackelLampe = new THREE.PointLight(0xff9a48, 0, 28, 1.1);
szene.add(fackelLampe);
const fackelKopf = new THREE.Vector3();
// So hält man eine Fackel: Oberarm locker am Körper, Unterarm angewinkelt nach vorn, die Fackel aufrecht
const FACKEL_ARM = { oberarm: new THREE.Vector3(0.25, -0.85, 0.3), unterarm: new THREE.Vector3(0.18, 0.4, 0.95) };
const FACKEL_AUFRECHT = new THREE.Vector3(0.3, 1, 0.25).normalize(); // etwas nach außen, damit sie nicht vors Gesicht kommt
const _qHand = new THREE.Quaternion(), _qFig = new THREE.Quaternion(), _richtung = new THREE.Vector3();
function richteFackelAuf() {
  const hand = figur?.linkeHand, fackelForm = hand?.getObjectByName('waffe');
  if (!fackelForm) return;
  _richtung.copy(FACKEL_AUFRECHT).applyQuaternion(figur.objekt.getWorldQuaternion(_qFig));
  hand.getWorldQuaternion(_qHand).invert();
  fackelForm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _richtung).premultiply(_qHand);
}
function fackelUmschalten() {
  if (!inventar.hat('fackel')) { nachricht('Du hast keine Fackel. Mach dir eine aus einem Ast und Fasern (Herstellen).'); return; }
  fackelWunsch = !fackelAn;
}
function fackelSchritt(dt) {
  const nacht = zeit.hell < 0.35;
  if (nacht !== warNacht) { warNacht = nacht; fackelWunsch = null; }
  const soll = spielLaeuft && !ueberleben.tot && inventar.hat('fackel') && (fackelWunsch ?? nacht);
  if (soll && !fackelAn) nachricht('Du zündest eine Fackel an.');
  if (soll !== fackelAn || (soll && !figur?.linkeHand?.getObjectByName('waffe'))) {
    if (figur) {
      inDieHand(figur, soll ? 'fackel' : null, 'l');
      figur.setzeArm?.('l', soll ? FACKEL_ARM : null);
    }
  }
  fackelAn = soll;
  fackelFlamme.objekt.visible = fackelAn;
  if (!fackelAn) { fackelLampe.intensity = 0; return; }
  if (!pausiert) {
    fackelStunden += dt / SEKUNDEN_JE_STUNDE;
    if (fackelStunden >= FACKEL_STUNDEN) {
      fackelStunden = 0;
      inventar.nimm('fackel', 1);
      nachricht(inventar.hat('fackel') ? 'Die Fackel ist heruntergebrannt. Du zündest die nächste an.' : 'Deine letzte Fackel ist heruntergebrannt.');
    }
  }
  fackelUhr += dt;
  richteFackelAuf();
  const kopf = figur?.linkeHand?.getObjectByName('fackelkopf');
  if (kopf) kopf.getWorldPosition(fackelKopf);
  else fackelKopf.copy(steuerung.zustand.ort).y += 1.2;
  fackelFlamme.aktualisiere(pausiert ? 0 : dt, fackelKopf, wind.richtung.value);
  fackelLampe.position.copy(fackelKopf).y += 0.2;
  fackelLampe.intensity = 9 + Math.sin(fackelUhr * 11) * 0.9 + Math.sin(fackelUhr * 6.7) * 0.7;
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
  inventar, fortschritt, herstellen, aufgaben, amFeuer, iss, handel,
  aussehen: () => aussehen, mann: () => figurArt !== 'sie',
  wirfWeg: (id, n) => inventar.nimm(id, n),
  wechsleGrafik: () => { wechsleGrafik(); nach.zeichne(); }, // ein Bild in der neuen Stufe, auch bei offenem Menü
  grafikName: () => qualitaet.name,
  neuBeginnen: () => { neuStarten = true; loescheSpielstand(); location.reload(); },
  darfOeffnen: () => spielLaeuft && !ueberleben.tot,
  beiOffen: (offen) => {
    pausiert = offen;
    if (offen) bauen.abbrechen();
    if (!offen) zeigeAussehen();
    steuerung.zustand.aktiv = !offen && spielLaeuft && !ueberleben.tot;
    // Die Bildratenmessung für den Startbericht beginnt nach dem Menü von vorn
    if (!messung.fertig) { messung.ab = null; messung.bilder = 0; }
  },
});
welt.handel = (wer) => menue.oeffneHandel(wer);
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
  if (inventar.hat('angelrute')) {
    tipp('angeln', 'Mit der Angel ans Ufer stellen, aufs Wasser schauen und „Benutzen“: Du wirfst aus. Taucht der Schwimmer unter, sofort noch einmal „Benutzen“!');
  }
}

Object.defineProperty(window.spiel, 'aussehen', { get: () => aussehen });
Object.assign(window.spiel, {
  editor,
  steuerung, ereignisse, ueberleben, inventar, fortschritt, herstellen, aufgaben, sammeln, benutzen, menue, faellen, baeume, bauen, natur, unterholz, begegnungen, tiere, feen, karte, schiesse, gegner, kampf,
  handel, angeln, dorf, wasserspiegel: wasserspiegel(),
  speichere: () => speichereJetzt(),
  fackelBrennt: () => fackelAn,
  schlaeft: () => schlaeft,
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
    kurz: `${aussehen?.name || (figurArt === 'sie' ? 'Sie' : 'Er')} · Stufe ${fortschritt.stufe} · Tag ${zeit.tag}`,
    aussehen,
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
    faellen: faellen.speichern(),
    begegnungen: begegnungen.speichern(),
    tiere: tiere.speichern(),
    karte: karte.speichern(),
    bauwerke: bauen.speichern(),
    gegraben,
    felsen: [...abgebaut],
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
  faellen.laden(st.faellen);
  begegnungen.laden(st.begegnungen);
  tiere.laden(st.tiere);
  karte.laden(st.karte);
  bauen.laden(st.bauwerke);
  for (const [x, z] of st.gegraben ?? []) { aendereBoden(x, z, 0.3, 1.6); druecke(x, z, 1.3, 1); gegraben.push([x, z]); }
  for (const [x, z] of gegraben) zeigeGrube(x, z);
  for (const [schluessel, groesse] of st.felsen ?? []) {
    const h = natur.hindernisse.find((n) => n.griff && felsSchluessel(n.fels) === schluessel);
    if (h) setzeFels(h, groesse);
  }
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
  let geladen;
  try {
    geladen = await figurenLaden[art];
  } catch (e) {
    window.zeigeFehler?.(`Die Figur konnte nicht geladen werden (${e.message})`);
    return;
  } finally {
    clearInterval(anzeige);
  }
  figurArt = art;
  const stand = window.weiterspielen ? ladeSpielstand() : null;
  aussehen = ergaenze(stand?.aussehen, art);
  if (!stand) {
    // Neues Spiel: Erst sucht man sich das Aussehen aus (Charakter-Editor), dann erwacht man auf der Wiese
    szene.add(geladen.objekt);
    window.notiere?.('Editor offen');
    aussehen = await editor.zeige(geladen, art, aussehen, new THREE.Vector3(START.x, hoeheBei(START.x, START.z), START.z));
    window.notiere?.('Editor fertig');
  }
  figur = geladen;
  if (stand) {
    steuerung.zustand.ichSicht = !!stand.ichSicht;
    ladeStand(stand);
    window.notiere?.(`Spielstand geladen: ${stand.kurz}`);
  } else {
    steuerung.setzeOrt(START.x, START.z);
  }
  window.notiere?.('Figur geladen, Spiel beginnt');
  szene.add(figur.objekt);
  zeigeAussehen();
  letzteStunde = spielStunde();
  steuerung.setzeFigur(figur);
  oberflaeche.spielBeginnt();
  steuerung.zustand.aktiv = true;
  spielLaeuft = true;
  window.spiel.figur = figur;
  if (stand) nachricht(`Willkommen zurück${aussehen.name ? `, ${aussehen.name}` : ''}. ${uhrzeitText()}.`);
  speichereJetzt();
});

function sterben(grund) {
  steuerung.zustand.aktiv = false;
  menue.schliesse();
  angeln.einholen();
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
// Die Steuerung steht nicht ständig im Bild: Knopf „?“ oben rechts oder Taste H klappt sie auf und zu
function hilfeUmschalten(offen) {
  const h = document.getElementById('hinweise');
  h.hidden = !(offen ?? h.hidden);
  document.getElementById('hilfe-knopf').setAttribute('aria-expanded', String(!h.hidden));
}
document.getElementById('hilfe-knopf').addEventListener('click', () => hilfeUmschalten());

addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyH') {
    if (spielLaeuft) hilfeUmschalten();
    return;
  }
  if (e.code === 'KeyM') {
    if (spielLaeuft) karte.schalteGross();
    return;
  }
  if (e.code === 'Escape' && karte.gross) { karte.schalteGross(false); return; }
  if (!steuerung.zustand.aktiv) return;
  if (e.code === 'KeyE' && !ereignisse.aktuell) benutzen.benutze(steuerung.zustand.ort, steuerung.zustand.blickSeite);
  if (e.code === 'KeyF') machFeuer();
  if (e.code === 'KeyT') fackelUmschalten();
  if (e.code === 'KeyR') schiesse();
  if ((e.code === 'KeyB' || e.code === 'Escape') && bauen.plan) bauen.abbrechen();
  if (e.code === 'KeyX') schlage();
  if (e.code === 'KeyG') {
    wechsleGrafik();
    nachricht(`Grafik: ${qualitaet.name}`);
  }
});

flaeche.addEventListener('mousedown', (e) => {
  if (e.button === 0 && document.pointerLockElement === flaeche && steuerung.zustand.aktiv) schlage();
});

// Wer zuschlägt, legt vorher die Angel weg
function schlage() {
  if (angeln.aktiv) angeln.einholen();
  if (!kampf.schlage()) return;
  // Auch ein Tier in Reichweite kann man mit der Waffe treffen (wenn man so nah herankommt)
  const w = kampf.waffe();
  setTimeout(() => {
    const t = tiere.naechstes(steuerung.zustand.ort, w.reichweite + 0.4);
    if (t) tiere.treffe(t, w.schaden * 1.5);
  }, 350);
}

// ---------------------------------------------------------------- Jagd mit Pfeil und Bogen
// R (am Handy „Schießen“): ein Pfeil fliegt dorthin, wohin man schaut. Er trifft Tiere und Gegner.
const pfeile = [];
let bogenPause = 0;
const BOGEN_ARM_L = { oberarm: new THREE.Vector3(0.1, 0.05, 1), unterarm: new THREE.Vector3(0.05, 0.08, 1) };
const BOGEN_ARM_R = { oberarm: new THREE.Vector3(-0.3, 0.05, 0.6), unterarm: new THREE.Vector3(0.6, 0.15, 0.1) };
function schiesse() {
  if (!figur || bogenPause > 0 || !steuerung.zustand.aktiv) return;
  if (!inventar.hat('bogen')) { nachricht('Du hast keinen Bogen. Bau dir einen (Herstellen).'); return; }
  if (!inventar.hat('pfeil')) { nachricht('Keine Pfeile mehr. Aus zwei Ästen und einem Feuerstein werden fünf (Herstellen).'); return; }
  inventar.nimm('pfeil', 1);
  bogenPause = 1.1;
  // Die Figur hebt den Bogen und zieht die Sehne
  const blick = new THREE.Vector3();
  kamera.getWorldDirection(blick);
  steuerung.dreheZu(Math.atan2(blick.x, blick.z), 0.4);
  inDieHand(figur, 'bogen', 'l');
  figur.setzeArm('l', BOGEN_ARM_L);
  figur.setzeArm('r', BOGEN_ARM_R);
  setTimeout(() => {
    const start = new THREE.Vector3().copy(steuerung.zustand.ort).add(new THREE.Vector3(0, 1.5, 0)).addScaledVector(blick, 0.6);
    const weite = 45;
    const tierTreffer = tiere.aufLinie(start, blick, weite);
    let gegnerTreffer = null;
    for (const g of gegner.alle) {
      if (g.zustand === 'tot' || !g.objekt.visible) continue;
      const rel = g.objekt.position.clone().add(new THREE.Vector3(0, 1.1, 0)).sub(start);
      const s = rel.dot(blick);
      if (s > 0 && s < weite && rel.addScaledVector(blick, -s).length() < 0.5 && (!gegnerTreffer || s < gegnerTreffer.abstand)) gegnerTreffer = { g, abstand: s };
    }
    const treffer = tierTreffer && (!gegnerTreffer || tierTreffer.abstand < gegnerTreffer.abstand) ? tierTreffer : gegnerTreffer;
    const flug = treffer ? treffer.abstand : weite;
    const pfeil = baueForm('pfeil');
    pfeil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), blick);
    pfeil.position.copy(start);
    szene.add(pfeil);
    pfeile.push({ pfeil, start, blick: blick.clone(), flug, weg: 0, treffer, alter: 0 });
    figur.setzeArm('l', null);
    figur.setzeArm('r', null);
    setTimeout(() => { if (!fackelAn) inDieHand(figur, null, 'l'); }, 400);
  }, 450);
}
function pfeilSchritt(dt) {
  bogenPause = Math.max(0, bogenPause - dt);
  for (let i = pfeile.length - 1; i >= 0; i--) {
    const p = pfeile[i];
    p.alter += dt;
    if (p.weg < p.flug) {
      p.weg = Math.min(p.flug, p.weg + 45 * dt);
      p.pfeil.position.copy(p.start).addScaledVector(p.blick, p.weg);
      p.pfeil.position.y -= 0.002 * p.weg * p.weg / 10; // leichter Bogen nach unten
      if (p.weg >= p.flug && p.treffer) {
        const schaden = Math.round(12 * fortschritt.wirkung.schlagFaktor() * (0.9 + Math.random() * 0.2));
        if (p.treffer.tier) {
          const t = tiere.treffe(p.treffer.tier, schaden);
          if (t?.zustand === 'tot') nachricht(`Getroffen! Der ${t.def.name} ist erlegt.`);
          else nachricht('Getroffen! Das Tier flieht.');
        } else if (p.treffer.g) {
          gegner.treffe({ ort: p.treffer.g.objekt.position.clone().addScaledVector(p.blick, -0.8), richtung: Math.atan2(p.blick.x, p.blick.z), reichweite: 1.2, schaden, volltreffer: false });
        }
      }
    }
    if (p.alter > 8) { szene.remove(p.pfeil); pfeile.splice(i, 1); }
  }
}

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
let anzeigeTakt = 0, wachsTakt = 0, letzteStunde = 0;
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
    angeln.schritt(dt);
    kampf.schritt(dt);
    gegner.schritt(dt, { ort: steuerung.zustand.ort, lebt: !ueberleben.tot });
    anzeige.aktualisiere(gegner.alle, steuerung.zustand.ort);
    // Was gehört in die rechte Hand? Jedes Bild prüfen (billig), damit nichts Falsches darin hängen bleibt
    {
      waffeNeu = false;
      const soll = angeln.haeltRute ? null : inventar.besteWaffe();
      const ist = figur.rechteHand?.getObjectByName('waffe')?.userData.form ?? null;
      if (soll !== ist) inDieHand(figur, soll);
    }
    blickpunkt.copy(steuerung.zustand.ort);
  } else if (editor.aktiv) {
    editor.schritt(dt);
    blickpunkt.copy(editor.blickpunkt);
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
  unterholz.aktualisiere(dt, blickpunkt);
  for (const f of feuerstellen) if (f.brennt()) f.feuer.aktualisiere(dt, wind.richtung.value, zeit.hell);
  dorf.aktualisiere(dt, wind.richtung.value, zeit.hell);
  graufurt.aktualisiere(dt, wind.richtung.value, zeit.hell);
  fackelSchritt(dt);
  bauen.schritt(dt, steuerung.zustand.ort, steuerung.zustand.blickSeite + Math.PI); // dorthin, wohin man schaut
  bauen.schrittFackeln();
  for (const f of bauen.fackeln) if (f.brennt()) f.feuer.aktualisiere(pausiert ? 0 : dt, wind.richtung.value);
  feuerlichter.verteile([...feuerstellen, ...bauen.fackeln], blickpunkt);
  einsiedler?.aktualisiere(dt, blickpunkt);
  doerfler?.aktualisiere(dt, blickpunkt);
  markierung.schritt(dt);
  faellen.schritt(pausiert ? 0 : dt);
  if (!pausiert) { tiere.schritt(dt, steuerung.zustand.ort); pfeilSchritt(dt); }
  feen.schritt(pausiert ? 0 : dt, steuerung.zustand.ort);
  if (spielLaeuft) karte.schritt(dt, steuerung.zustand.ort, steuerung.zustand.blickSeite);
  if (spielLaeuft && !pausiert) begegnungen.schritt(dt);
  sammeln.aktualisiere(dt, zeit.hell, renderer.getPixelRatio());
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
      document.getElementById('knopf-schiessen').hidden = !inventar.hat('bogen');
    }
    anzeigeTakt -= dt;
    if (anzeigeTakt <= 0) {
      anzeigeTakt = 0.25;
      aufgaben.pruefe();
      anzeigen();
      tippsPruefen();
      doerflerPruefen(steuerung.zustand.ort);
    }
    wachsTakt -= dt;
    if (wachsTakt <= 0) {
      wachsTakt = 1;
      sammeln.wachsen();
      faellen.wachsen();
      loescheAus();
      // Jede Spielstunde: Haare und Bart wachsen, das Gewicht folgt dem Essen, Muskeln der Arbeit
      const jetzt = spielStunde();
      if (aussehen && jetzt - letzteStunde >= 1) {
        wachse(aussehen, jetzt - letzteStunde, { satt: ueberleben.werte.saettigung, mann: figurArt !== 'sie' });
        letzteStunde = jetzt;
        zeigeAussehen();
      }
    }
    spielzeit += dt;
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
