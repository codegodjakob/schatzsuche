// Das Menü: Inventar, Herstellen, Figur und Aufgaben. Öffnet mit I, K, C, J (auf dem Handy mit dem
// Knopf „Menü“), schließt mit Esc, derselben Taste oder dem Kreuz. Solange es offen ist, steht das
// Spiel still (darum kümmert sich main.js über beiOffen). Beim Handeln kommt ein fünfter Reiter dazu.
import { ARTEN, gegenstand } from '../inhalte/gegenstaende.js';
import { aufgabe } from '../inhalte/aufgaben.js';
import { BERUFE, WERTE } from '../inhalte/berufe.js';
import { berufsErfahrungFuer, erfahrungFuer } from '../spieler/fortschritt.js';
import { PLAETZE } from '../spieler/inventar.js';
import { symbol } from './symbole.js';

const REITER = [
  { id: 'inventar', taste: 'KeyI' },
  { id: 'herstellen', taste: 'KeyK' },
  { id: 'figur', taste: 'KeyC' },
  { id: 'aufgaben', taste: 'KeyJ' },
  { id: 'handel', taste: null },
];
const WERKZEUGNAMEN = { messer: 'Messer', axt: 'Axt' };

// Element mit Klasse und Text
function el(tag, klasse = '', text = null) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text != null) e.textContent = text;
  return e;
}
// Gezeichnetes Symbol eines Gegenstands (src/ui/symbole.js)
function bild(id, klasse = 'bild') {
  const e = el('span', klasse);
  e.innerHTML = symbol(id);
  return e;
}

function knopf(text, beiKlick, klasse = 'knopf-text') {
  const k = el('button', klasse, text);
  k.type = 'button';
  k.addEventListener('click', beiKlick);
  return k;
}
function balken(anteil, klasse = '') {
  const b = el('div', `balken ${klasse}`);
  const i = el('i');
  i.style.width = `${Math.round(Math.min(1, Math.max(0, anteil)) * 100)}%`;
  b.append(i);
  return b;
}

// Was Essen bewirkt, in Worten
function wirkungen(essen) {
  const namen = { saettigung: 'Sättigung', wasser: 'Wasser', waerme: 'Wärme', leben: 'Leben' };
  return Object.entries(essen).filter(([, n]) => n).map(([k, n]) => `+${n} ${namen[k]}`);
}
function essWort(g) {
  if ((g.essen.wasser ?? 0) > (g.essen.saettigung ?? 0)) return 'Trinken';
  if (g.essen.leben && !g.essen.saettigung) return 'Auftragen';
  return 'Essen';
}
function belohnungText(id) {
  const b = aufgabe(id).belohnung ?? {};
  const teile = [];
  if (b.erfahrung) teile.push(`${b.erfahrung} Erfahrung`);
  if (b.muenzen) teile.push(`${b.muenzen} Kupfer`);
  for (const [ding, n] of Object.entries(b.gegenstaende ?? {})) teile.push(`${n} × ${gegenstand(ding).name}`);
  return teile.join(', ');
}

export function erzeugeMenue({
  inventar, fortschritt, herstellen, aufgaben, amFeuer, iss, wirfWeg, wechsleGrafik, grafikName, neuBeginnen, handel,
  darfOeffnen = () => true, beiOffen = () => {}, aussehen = () => null, mann = () => true,
}) {
  const menue = document.getElementById('menue');
  const inhalt = document.getElementById('menue-inhalt');
  let reiter = 'inventar';
  let auswahl = null; // gewählter Gegenstand im Inventar
  let offen = false;
  let neuFragen = false; // „Neu beginnen“ wartet auf Bestätigung
  let haendler = null; // mit wem gerade gehandelt wird
  const handelReiter = menue.querySelector('[data-reiter="handel"]');

  for (const k of menue.querySelectorAll('[data-reiter]')) k.addEventListener('click', () => oeffne(k.dataset.reiter));
  document.getElementById('menue-zu').addEventListener('click', () => schliesse());

  function oeffne(welcher = reiter) {
    reiter = welcher;
    neuFragen = false;
    if (!offen) {
      offen = true;
      menue.hidden = false;
      document.exitPointerLock?.();
      beiOffen(true);
    }
    zeichne();
  }

  function schliesse() {
    if (!offen) return;
    offen = false;
    menue.hidden = true;
    if (reiter === 'handel') reiter = 'inventar';
    haendler = null;
    handelReiter.hidden = true;
    beiOffen(false);
  }

  function oeffneHandel(wer) {
    haendler = wer;
    handelReiter.hidden = false;
    handelReiter.textContent = 'Handel'; // mit wem, steht oben im Reiter
    oeffne('handel');
  }

  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Escape' && offen) { schliesse(); return; }
    const r = REITER.find((x) => x.taste && x.taste === e.code);
    if (!r || (!offen && !darfOeffnen())) return;
    e.stopImmediatePropagation();
    if (offen && reiter === r.id) schliesse(); else oeffne(r.id);
  });

  function zeichne() {
    for (const k of menue.querySelectorAll('[data-reiter]')) k.setAttribute('aria-selected', String(k.dataset.reiter === reiter));
    if (reiter === 'handel' && !haendler) reiter = 'inventar';
    const teil = { inventar: zeichneInventar, herstellen: zeichneHerstellen, figur: zeichneFigur, aufgaben: zeichneAufgaben, handel: zeichneHandel }[reiter]();
    inhalt.replaceChildren(teil);
  }

  // ---------------------------------------------------------------- Inventar
  function zeichneInventar() {
    const wrap = el('div', 'inv');
    const kopf = el('div', 'inv-kopf');
    kopf.append(el('span', '', `${inventar.belegt} von ${PLAETZE} Plätzen belegt`), el('span', 'geld', `${inventar.muenzen} Kupfer`));

    const faecher = el('div', 'faecher');
    const dinge = inventar.liste();
    if (auswahl && !inventar.hat(auswahl)) auswahl = null;
    let n = 0;
    for (const d of dinge) {
      const stapel = d.stapel ?? 99;
      for (let rest = d.anzahl; rest > 0; rest -= stapel) {
        const k = Math.min(stapel, rest);
        const f = knopf('', () => { auswahl = d.id; zeichne(); }, `fach${auswahl === d.id ? ' gewaehlt' : ''}`);
        f.title = d.name;
        f.setAttribute('aria-label', `${d.name}, ${k} Stück`);
        f.append(bild(d.id));
        if (k > 1) f.append(el('span', 'n', String(k)));
        faecher.append(f);
        n += 1;
      }
    }
    for (; n < PLAETZE; n++) faecher.append(el('div', 'fach leer'));

    const detail = el('div', 'inv-detail');
    if (auswahl) {
      const g = gegenstand(auswahl);
      const anzahl = inventar.anzahl(auswahl);
      detail.append(bild(auswahl, 'detail-bild'), el('h3', '', anzahl > 1 ? `${g.name} (${anzahl})` : g.name), el('p', 'klein', ARTEN[g.art]), el('p', '', g.beschreibung));
      const fakten = el('ul', 'fakten');
      if (g.essen) for (const w of wirkungen(g.essen)) fakten.append(el('li', '', w));
      if (g.werkzeug) fakten.append(el('li', '', `Werkzeug: ${WERKZEUGNAMEN[g.werkzeug.art] ?? g.werkzeug.art}`));
      if (g.waffe) fakten.append(el('li', '', `Schaden ${g.waffe.schaden}`), el('li', '', `Reichweite ${String(g.waffe.reichweite ?? 1.3).replace('.', ',')} m`));
      if (g.schutz) fakten.append(el('li', '', `Schutz ${Math.round(g.schutz * 100)} %`));
      if (g.hoechstens) fakten.append(el('li', '', `Schwer: höchstens ${g.hoechstens} tragbar`));
      fakten.append(el('li', '', `Wert ${g.wert} Kupfer`));
      const knoepfe = el('div', 'knoepfe-zeile');
      if (g.essen) knoepfe.append(knopf(essWort(g), () => { iss(auswahl); zeichne(); }, 'knopf-text haupt'));
      if (g.art !== 'aufgabe') {
        knoepfe.append(knopf('Eins wegwerfen', () => { wirfWeg(auswahl, 1); zeichne(); }));
        if (anzahl > 1) knoepfe.append(knopf('Alle wegwerfen', () => { wirfWeg(auswahl, anzahl); zeichne(); }));
      }
      detail.append(fakten, knoepfe);
    } else {
      detail.append(el('p', 'leer-hinweis', dinge.length ? 'Tippe auf ein Fach, um mehr zu sehen.' : 'Noch leer. Sammle Äste, Steine und Kräuter in der Welt.'));
    }
    wrap.append(kopf, detail, faecher);
    return wrap;
  }

  // ---------------------------------------------------------------- Herstellen
  function zeichneHerstellen() {
    const wrap = el('div', 'herstellen');
    const raster = el('div', 'rezepte');
    const feuer = amFeuer();
    for (const r of herstellen.liste()) {
      const kann = r.fehlt.length === 0;
      const karte = el('article', `rezept${kann ? ' kann' : ''}`);
      karte.dataset.rezept = r.id;
      const kopf = el('div', 'rezept-kopf');
      kopf.append(bild(r.ergebnis ?? r.bauwerk, 'rezept-bild'), el('b', '', (r.menge ?? 1) > 1 ? `${r.menge} × ${r.name}` : r.name), el('span', 'rezept-beruf', `${BERUFE[r.beruf].name} ${r.stufe}`));
      const zutaten = el('div', 'zutaten');
      for (const [id, menge] of Object.entries(r.zutaten)) {
        const g = gegenstand(id), hat = inventar.anzahl(id);
        const z = el('span', `zutat${hat < menge ? ' fehlt' : ''}`, ` ${g.name} ${Math.min(hat, menge)}/${menge}`);
        z.prepend(bild(id, 'zutat-bild'));
        zutaten.append(z);
      }
      if (r.werkzeug) {
        const da = r.werkzeug.some((id) => inventar.hat(id));
        zutaten.append(el('span', `zutat${da ? '' : ' fehlt'}`, `Werkzeug: ${r.werkzeug.map((id) => gegenstand(id).name).join(' oder ')}`));
      }
      if (r.ort === 'feuer') zutaten.append(el('span', `zutat${feuer ? '' : ' fehlt'}`, '🔥 an einem Feuer'));
      const stufe = fortschritt.berufsStufe(r.beruf);
      if (stufe < r.stufe) zutaten.append(el('span', 'zutat fehlt', `${BERUFE[r.beruf].name} Stufe ${r.stufe} (jetzt ${stufe})`));
      karte.append(kopf, el('p', 'klein', r.beschreibung), zutaten);
      if (r.fehlt.includes('Platz im Inventar')) karte.append(el('p', 'fehlt-text', 'Kein Platz mehr im Inventar.'));
      const k = knopf(r.bauwerk ? 'Bauen' : 'Herstellen', () => {
        if (!herstellen.stelleHer(herstellen.rezept(r.id))) return;
        if (r.bauwerk) schliesse(); else zeichne();
      }, `knopf-text${kann ? ' haupt' : ''}`);
      k.disabled = !kann;
      karte.append(k);
      raster.append(karte);
    }
    wrap.append(raster, el('p', 'klein hinweis', 'Neue Rezepte lernst du von anderen Menschen und mit höherer Berufsstufe.'));
    return wrap;
  }

  // ---------------------------------------------------------------- Figur
  function zeichneFigur() {
    const z = fortschritt.zustand;
    const wrap = el('div', 'figur');

    const stufe = el('section', 'karte');
    const noetig = erfahrungFuer(z.stufe);
    const waffeId = inventar.besteWaffe();
    const w = waffeId ? gegenstand(waffeId) : null;
    const schaden = Math.round((w?.waffe.schaden ?? 3) * fortschritt.wirkung.schlagFaktor());
    stufe.append(
      el('h3', 'gross', `Stufe ${z.stufe}`),
      balken(z.erfahrung / noetig, 'gold'),
      el('p', 'klein', `${z.erfahrung} von ${noetig} Erfahrung bis Stufe ${z.stufe + 1}`),
      el('p', 'klein', `Im Kampf: ${w ? w.name : 'Fäuste'}, Schaden ${schaden}, Volltreffer ${Math.round(fortschritt.wirkung.volltreffer() * 100)} %, Schutz ${Math.round(inventar.schutz() * 100)} %`),
      el('p', 'klein', z.stufe >= 5 ? 'Die Wahl der Klasse kommt bald.' : 'Ab Stufe 5 wählst du eine Klasse: Krieger, Waldläufer, Handwerker, Händler oder Heiler.'),
    );

    const werte = el('section', 'karte');
    werte.append(el('h3', '', 'Werte'), el('p', `klein${z.punkte > 0 ? ' hervor' : ''}`, z.punkte > 0 ? `Du hast ${z.punkte} ${z.punkte === 1 ? 'Punkt' : 'Punkte'} zu verteilen.` : 'Mit jeder Stufe bekommst du 3 Punkte zum Verteilen.'));
    for (const [id, w] of Object.entries(WERTE)) {
      const zeile = el('div', 'wert-zeile');
      const plus = knopf('+', () => { if (fortschritt.verteile(id)) zeichne(); }, 'plus');
      plus.disabled = z.punkte <= 0;
      plus.setAttribute('aria-label', `${w.name} erhöhen`);
      zeile.append(el('b', '', w.name), el('span', 'zahl', String(z.werte[id])), plus, el('p', 'klein', w.wirkung));
      werte.append(zeile);
    }

    const berufe = el('section', 'karte');
    berufe.append(el('h3', '', 'Berufe'));
    for (const [id, b] of Object.entries(BERUFE)) {
      const bz = z.berufe[id];
      const zeile = el('div', 'beruf-zeile');
      zeile.append(el('b', '', b.name), el('span', 'klein', `${fortschritt.berufsRang(id)} · Stufe ${bz.stufe}`), balken(bz.erfahrung / berufsErfahrungFuer(bz.stufe)), el('p', 'klein', b.wirkung));
      berufe.append(zeile);
    }

    // Aussehen: Haare und Bart wachsen; mit einem Messer schneidet man sie (zottelig, aber kurz)
    const a = aussehen();
    const koerper = el('section', 'karte');
    if (a) {
      const cm = (m) => (m <= 0 ? (m === 0 ? 'keine' : '') : m < 0.012 ? 'Stoppeln' : `${Math.round(m * 100)} cm`);
      koerper.append(el('h3', '', a.name || 'Aussehen'), el('p', 'klein', `Haare: ${a.haarLaenge <= 0 ? 'kahl' : cm(a.haarLaenge)}${mann() ? ` · Bart: ${a.bartLaenge <= 0 ? 'glatt rasiert' : cm(a.bartLaenge)}` : ''}`));
      const messer = inventar.werkzeugStufe('messer') > 0;
      if (!messer) koerper.append(el('p', 'klein', 'Haare und Bart wachsen jeden Tag. Zum Schneiden brauchst du ein Messer.'));
      else {
        const schnitte = [
          ['Haare', 'haarLaenge', [['ganz kurz', 0.006], ['kurz', 0.03], ['halblang', 0.1], ['schulterlang', 0.25]]],
          ...(mann() ? [['Bart', 'bartLaenge', [['ab', 0], ['Stoppeln', 0.004], ['kurz', 0.015], ['gestutzt', 0.04]]]] : []),
        ];
        for (const [titel, feld, laengen] of schnitte) {
          const moeglich = laengen.filter(([, l]) => l < a[feld] - 0.004);
          if (!moeglich.length) continue;
          const z = el('div', 'knoepfe-zeile');
          z.append(el('span', 'klein', `${titel} schneiden:`));
          for (const [name, l] of moeglich) z.append(knopf(name, () => { a[feld] = l; zeichne(); }, 'knopf-text klein'));
          koerper.append(z);
        }
      }
    }

    const einstellungen = el('section', 'karte');
    einstellungen.append(el('h3', '', 'Einstellungen'));
    const zeile = el('div', 'knoepfe-zeile');
    zeile.append(knopf(`Grafik: ${grafikName()}`, () => { wechsleGrafik(); zeichne(); }));
    if (!neuFragen) {
      zeile.append(knopf('Neu beginnen', () => { neuFragen = true; zeichne(); }));
      einstellungen.append(zeile);
    } else {
      einstellungen.append(zeile, el('p', 'fehlt-text', 'Wirklich? Dein ganzer Spielstand geht verloren.'));
      const frage = el('div', 'knoepfe-zeile');
      frage.append(knopf('Ja, neu beginnen', () => neuBeginnen(), 'knopf-text gefahr'), knopf('Abbrechen', () => { neuFragen = false; zeichne(); }));
      einstellungen.append(frage);
    }
    wrap.append(stufe, werte, ...(a ? [koerper] : []), berufe, einstellungen);
    return wrap;
  }

  // ---------------------------------------------------------------- Handel
  function zeichneHandel() {
    const h = handel.haendler(haendler);
    const wrap = el('div', 'handel');
    const kopf = el('div', 'inv-kopf');
    kopf.append(el('span', '', `${h.name}, ${h.titel}`), el('span', 'geld', `${inventar.muenzen} Kupfer`));
    const kaufen = el('section', 'karte');
    kaufen.append(el('h3', '', `${h.name} verkauft`));
    for (const id of h.waren) {
      const g = gegenstand(id), preis = handel.kaufpreis(haendler, id);
      const zeile = el('div', 'handel-zeile');
      const k = knopf('Kaufen', () => { handel.kaufe(haendler, id); zeichne(); }, 'knopf-text klein');
      k.disabled = inventar.muenzen < preis;
      zeile.append(bild(id), el('span', 'name', g.name), el('span', 'preis', `${preis} Kupfer`), k);
      kaufen.append(zeile);
    }
    const verkaufen = el('section', 'karte');
    verkaufen.append(el('h3', '', 'Du verkaufst'));
    const dinge = inventar.liste().filter((d) => d.art !== 'aufgabe' && d.wert > 0);
    if (!dinge.length) verkaufen.append(el('p', 'leer-hinweis', 'Du hast nichts, was sich verkaufen ließe.'));
    for (const d of dinge) {
      const preis = handel.verkaufspreis(haendler, d.id);
      const zeile = el('div', 'handel-zeile');
      const knoepfe = el('span', 'handel-knoepfe');
      knoepfe.append(knopf('Verkaufen', () => { handel.verkaufe(haendler, d.id, 1); zeichne(); }, 'knopf-text klein'));
      if (d.anzahl > 1) knoepfe.append(knopf('Alle', () => { handel.verkaufe(haendler, d.id, d.anzahl); zeichne(); }, 'knopf-text klein'));
      zeile.append(bild(d.id), el('span', 'name', d.anzahl > 1 ? `${d.name} (${d.anzahl})` : d.name), el('span', 'preis', `${preis} Kupfer`), knoepfe);
      verkaufen.append(zeile);
    }
    wrap.append(kopf, kaufen, verkaufen, el('p', 'klein hinweis', 'Wer an einem Tag viel vom Gleichen verkauft, bekommt dafür etwas weniger. Ausstrahlung bringt bessere Preise.'));
    return wrap;
  }

  // ---------------------------------------------------------------- Aufgaben
  function zeichneAufgaben() {
    const wrap = el('div', 'aufgaben');
    const verfolgt = aufgaben.verfolgt?.id;
    const aktive = aufgaben.aktive().sort((a, b) => b.haupt - a.haupt);
    if (!aktive.length) wrap.append(el('p', 'leer-hinweis', 'Gerade keine Aufgaben. Sprich mit den Menschen, die du triffst.'));
    for (const a of aktive) {
      const karte = el('article', `aufgabe-karte${a.id === verfolgt ? ' verfolgt' : ''}`);
      karte.append(el('h3', '', a.titel), el('p', 'klein', [a.haupt ? 'Hauptgeschichte' : 'Nebenaufgabe', a.geber ? `von ${a.geber}` : ''].filter(Boolean).join(' · ')), el('p', '', a.beschreibung));
      const schritte = el('ol', 'schritte');
      for (const st of a.schritte) schritte.append(el('li', st.fertig ? 'fertig' : 'jetzt', st.text));
      karte.append(schritte);
      const lohn = belohnungText(a.id);
      if (lohn) karte.append(el('p', 'klein', `Belohnung: ${lohn}`));
      if (a.id === verfolgt) karte.append(el('p', 'klein hervor', 'Steht am Bildschirmrand'));
      else karte.append(knopf('Verfolgen', () => { aufgaben.verfolge(a.id); zeichne(); }));
      wrap.append(karte);
    }
    const erledigte = aufgaben.erledigte();
    if (erledigte.length) {
      const liste = el('ul', 'erledigt-liste');
      for (const a of erledigte) liste.append(el('li', '', `✓ ${a.titel}`));
      wrap.append(el('h3', 'zwischentitel', 'Erledigt'), liste);
    }
    return wrap;
  }

  return {
    oeffne, schliesse, zeichne, oeffneHandel,
    get offen() { return offen; },
    get reiter() { return reiter; },
  };
}
