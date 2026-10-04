// Der Charakter-Editor: nach der Wahl „Mann“ oder „Frau“, vor dem Erwachen. Die Figur steht auf der Wiese,
// die Kamera schaut ihr ins Gesicht (bei „Körper“ auf die ganze Figur); daneben, am Handy darunter, die Regler.
// Wie bei den Mii-Figuren der Wii: wenige klare Entscheidungen, sofort zu sehen, „Würfeln“ für Unentschlossene.
// Ziehen im Bild dreht die Figur.
import * as THREE from 'three';
import { HAARFARBEN, HAUTTOENE, KOPFFORMEN, REGLER, VOELKER, wendeAn, wuerfle } from '../spieler/aussehen.js';
import { zeit } from '../welt/tageszeit.js';

// So sehen die Hauttöne im Editor aus (gemalter Grundton mal Faktor)
const HAUT_GRUND = { er: [0.70, 0.53, 0.43], sie: [0.77, 0.59, 0.49] };
const css = ([r, g, b]) => `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;

function el(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function erzeugeEditor({ kamera, flaeche, beiAenderung = () => {} }) {
  const tafel = document.getElementById('editor');
  const inhalt = document.getElementById('editor-inhalt');
  const name = document.getElementById('editor-name');
  let figur = null, art = 'er', a = null, reiter = 'gesicht', fertig = null, aktiv = false;
  let drehung = 0, zielDrehung = 0, blickWinkel = 0, alterWinkel = 60;
  let frei = 1; // Anteil der Bildhöhe, den die Tafel frei lässt (am Handy liegt sie unten)
  const ort = new THREE.Vector3();
  const kopf = new THREE.Vector3();
  const zielBlick = new THREE.Vector3(), blick = new THREE.Vector3();
  const zielKamera = new THREE.Vector3();
  const blickpunkt = new THREE.Vector3();

  function anwenden() {
    wendeAn(figur, a);
    beiAenderung(a);
  }

  // ---------------------------------------------------------------- Bausteine
  function regler({ titel, wert, von, bis, schritt = 0.05, enden, anzeige, aendere }) {
    const r = el('div', 'regler');
    const kopfZeile = el('div', 'regler-kopf');
    const zahl = el('span', '', anzeige ? anzeige(wert) : '');
    kopfZeile.append(el('b', '', titel), zahl);
    const feld = document.createElement('input');
    Object.assign(feld, { type: 'range', min: von, max: bis, step: schritt, value: wert });
    feld.setAttribute('aria-label', titel);
    feld.addEventListener('input', () => {
      aendere(Number(feld.value));
      if (anzeige) zahl.textContent = anzeige(Number(feld.value));
      anwenden();
    });
    const endenZeile = el('div', 'regler-enden');
    endenZeile.append(el('span', '', enden[0]), el('span', '', enden[1]));
    r.append(kopfZeile, feld, endenZeile);
    return r;
  }

  function auswahl(titel, eintraege, gewaehlt, waehle, { farben = false } = {}) {
    const wrap = el('div');
    wrap.append(el('p', 'feld-titel', titel));
    const liste = el('div', 'auswahl');
    eintraege.forEach((e, i) => {
      const k = el('button', farben ? 'farbe' : '', farben ? '' : e.name);
      k.type = 'button';
      if (farben) { k.style.background = e.css; k.title = e.name; k.setAttribute('aria-label', e.name); }
      k.setAttribute('aria-pressed', String(i === gewaehlt));
      k.addEventListener('click', () => {
        waehle(i);
        for (const b of liste.children) b.setAttribute('aria-pressed', String(b === k));
        anwenden();
      });
      liste.append(k);
    });
    wrap.append(liste);
    return wrap;
  }

  const zentimeter = (m) => `${Math.round(m * 100)} cm`;
  const haarText = (m) => (m <= 0 ? 'kahl' : m < 0.012 ? 'Stoppeln' : zentimeter(m));
  const bartText = (m) => (m <= 0 ? 'glatt rasiert' : m < 0.008 ? 'Stoppeln' : zentimeter(m));

  // ---------------------------------------------------------------- Reiter
  function zeichne() {
    for (const k of tafel.querySelectorAll('[data-editor-reiter]')) k.setAttribute('aria-selected', String(k.dataset.editorReiter === reiter));
    const teile = [];
    if (reiter === 'gesicht') {
      teile.push(auswahl('Kopfform', KOPFFORMEN, KOPFFORMEN.findIndex((k) => k.id === a.kopf), (i) => { a.kopf = KOPFFORMEN[i].id; }));
      for (const r of REGLER) {
        teile.push(regler({
          titel: r.titel, wert: a.regler[r.id] ?? 0, von: r.ziele[0] ? -1 : 0, bis: 1, enden: r.enden,
          aendere: (v) => { a.regler[r.id] = v; },
        }));
      }
    } else if (reiter === 'haare') {
      teile.push(auswahl('Haarfarbe', HAARFARBEN.map((h) => ({ name: h.name, css: css(h.farbe) })), a.haar, (i) => { a.haar = i; }, { farben: true }));
      teile.push(regler({
        titel: 'Haarlänge', wert: a.haarLaenge, von: 0, bis: 0.4, schritt: 0.005, enden: ['kahl', 'lang'],
        anzeige: haarText, aendere: (v) => { a.haarLaenge = v; },
      }));
      if (art !== 'sie') {
        teile.push(regler({
          titel: 'Bart', wert: a.bartLaenge, von: 0, bis: 0.15, schritt: 0.002, enden: ['glatt', 'lang'],
          anzeige: bartText, aendere: (v) => { a.bartLaenge = v; },
        }));
      }
      teile.push(el('p', 'editor-tipp', 'Haare und Bart wachsen im Spiel nach. Schneiden kannst du sie mit einem Messer (Menü, Figur).'));
    } else {
      teile.push(auswahl('Volk', VOELKER, Math.max(0, VOELKER.findIndex((v) => v.id === a.volk)), (i) => {
        a.volk = VOELKER[i].id;
        VOELKER[i].setze(a, art);
        queueMicrotask(zeichne); // Regler zeigen die neuen Werte
      }));
      teile.push(auswahl('Hautfarbe', HAUTTOENE.map((h) => ({ name: h.name, css: css(HAUT_GRUND[art].map((x, i) => Math.min(1, x * h.faktor[i]))) })), a.haut, (i) => { a.haut = i; }, { farben: true }));
      teile.push(regler({ titel: 'Größe', wert: a.groesse, von: 0.92, bis: 1.08, schritt: 0.01, enden: ['klein', 'groß'], aendere: (v) => { a.groesse = v; } }));
      teile.push(regler({ titel: 'Statur', wert: a.statur, von: 0, bis: 1, enden: ['schmal', 'kräftig'], aendere: (v) => { a.statur = v; } }));
      teile.push(regler({ titel: 'Gewicht', wert: a.gewicht, von: -0.6, bis: 0.8, enden: ['dünn', 'rund'], aendere: (v) => { a.gewicht = v; } }));
      teile.push(el('p', 'editor-tipp', 'Im Spiel wachsen Muskeln mit Stärke und schwerer Arbeit; wer viel isst, wird runder.'));
    }
    inhalt.replaceChildren(...teile);
  }

  for (const k of tafel.querySelectorAll('[data-editor-reiter]')) {
    k.addEventListener('click', () => { reiter = k.dataset.editorReiter; zeichne(); });
  }
  document.getElementById('editor-wuerfeln').addEventListener('click', () => {
    // im selben Objekt, damit alle, die es kennen (Spiel, Spielstand), die neuen Werte sehen
    Object.assign(a, wuerfle(art), { name: a.name });
    zeichne();
    anwenden();
  });
  document.getElementById('editor-fertig').addEventListener('click', () => schliesse());
  name.addEventListener('input', () => { a.name = name.value.trim().slice(0, 20); });

  // Ziehen im Bild dreht die Figur
  let ziehen = null;
  flaeche.addEventListener('pointerdown', (e) => { if (aktiv) ziehen = e.clientX; });
  addEventListener('pointermove', (e) => {
    if (!aktiv || ziehen === null) return;
    zielDrehung += (e.clientX - ziehen) * 0.012;
    ziehen = e.clientX;
  });
  addEventListener('pointerup', () => { ziehen = null; });

  // ---------------------------------------------------------------- Öffnen, Schließen, Kamera
  function zeige(f, figurArt, aussehen, platz) {
    figur = f; art = figurArt; a = aussehen;
    reiter = 'gesicht';
    name.value = a.name ?? '';
    // Die Figur schaut zur Sonne, damit das Gesicht im Licht ist; die Kamera steht vor ihr
    blickWinkel = Math.atan2(zeit.sonne.x, zeit.sonne.z) + 0.35;
    drehung = zielDrehung = 0;
    ort.copy(platz);
    figur.objekt.position.copy(ort);
    figur.objekt.rotation.y = blickWinkel;
    figur.kopfSichtbar(true);
    anwenden();
    zeichne();
    document.getElementById('start').hidden = true;
    tafel.hidden = false;
    aktiv = true;
    // Ein Porträt-Objektiv (enger Bildwinkel) zeigt das Gesicht groß und ohne Verzerrung
    alterWinkel = kamera.fov;
    kamera.fov = 30;
    kamera.updateProjectionMatrix();
    setzeVersatz();
    // Kamera gleich an den richtigen Platz (nicht erst vom Kameraflug herüberschwenken)
    figur.bewege(0, 0);
    ziele();
    kamera.position.copy(zielKamera);
    blick.copy(zielBlick);
    kamera.lookAt(blick);
    return new Promise((r) => { fertig = r; });
  }

  function schliesse() {
    if (!aktiv) return;
    aktiv = false;
    tafel.hidden = true;
    kamera.clearViewOffset();
    kamera.fov = alterWinkel;
    kamera.updateProjectionMatrix();
    fertig?.(a);
  }

  // Die Figur steht in der freien Bildhälfte: neben der Tafel (Rechner) oder darüber (Handy)
  function setzeVersatz() {
    if (!aktiv) return;
    const b = flaeche.clientWidth, h = flaeche.clientHeight;
    const unten = tafel.getBoundingClientRect().top > h * 0.3;
    frei = unten ? tafel.getBoundingClientRect().top / h : 1;
    if (unten) kamera.setViewOffset(b, h, 0, (h - tafel.getBoundingClientRect().top) / 2, b, h);
    else kamera.setViewOffset(b, h, (b - tafel.getBoundingClientRect().left) / 2, 0, b, h);
  }
  addEventListener('resize', () => setzeVersatz());

  // Wohin die Kamera soll: nah ans Gesicht (Gesicht, Haare) oder auf die ganze Figur (Körper)
  function ziele() {
    figur.objekt.updateMatrixWorld(true);
    const nah = reiter !== 'koerper';
    figur.objekt.getObjectByName('head')?.getWorldPosition(kopf);
    if (nah) zielBlick.copy(kopf).add(new THREE.Vector3(0, 0.06, 0));
    else zielBlick.set(ort.x, ort.y + 0.95 * a.groesse, ort.z);
    // So weit weg, dass Gesicht (0,42 m) oder ganze Figur (2,3 m) in den freien Teil des Bildes passen
    const abstand = (nah ? 0.42 : 2.3) / (2 * Math.tan(THREE.MathUtils.degToRad(kamera.fov / 2)) * frei);
    zielKamera.set(zielBlick.x + Math.sin(blickWinkel) * abstand, zielBlick.y + (nah ? 0.03 : 0.25), zielBlick.z + Math.cos(blickWinkel) * abstand);
  }

  function schritt(dt) {
    if (!aktiv) return;
    drehung += (zielDrehung - drehung) * Math.min(1, dt * 8);
    figur.objekt.rotation.y = blickWinkel + drehung;
    figur.bewege(dt, 0);
    ziele();
    const k = Math.min(1, dt * 5);
    kamera.position.lerp(zielKamera, k);
    blick.lerp(zielBlick, k);
    kamera.lookAt(blick);
    blickpunkt.copy(ort);
  }

  return {
    zeige, schritt, schliesse,
    get aktiv() { return aktiv; },
    blickpunkt,
  };
}
