// Das Menü: Inventar, Herstellen, Figur und Aufgaben. Öffnet mit I, K, C, J (auf dem Handy mit dem
// Knopf „Menü“), schließt mit Esc, derselben Taste oder dem Kreuz. Solange es offen ist, steht das
// Spiel still (darum kümmert sich main.js über beiOffen).
import { ARTEN, gegenstand } from '../inhalte/gegenstaende.js';
import { aufgabe } from '../inhalte/aufgaben.js';
import { BERUFE, WERTE } from '../inhalte/berufe.js';
import { berufsErfahrungFuer, erfahrungFuer } from '../spieler/fortschritt.js';
import { PLAETZE } from '../spieler/inventar.js';

const REITER = [
  { id: 'inventar', taste: 'KeyI' },
  { id: 'herstellen', taste: 'KeyK' },
  { id: 'figur', taste: 'KeyC' },
  { id: 'aufgaben', taste: 'KeyJ' },
];
const WERKZEUGNAMEN = { messer: 'Messer', axt: 'Axt' };

// Element mit Klasse und Text
function el(tag, klasse = '', text = null) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text != null) e.textContent = text;
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
  inventar, fortschritt, herstellen, aufgaben, amFeuer, iss, wirfWeg, wechsleGrafik, grafikName, neuBeginnen,
  darfOeffnen = () => true, beiOffen = () => {},
}) {
  const menue = document.getElementById('menue');
  const inhalt = document.getElementById('menue-inhalt');
  let reiter = 'inventar';
  let auswahl = null; // gewählter Gegenstand im Inventar
  let offen = false;
  let neuFragen = false; // „Neu beginnen“ wartet auf Bestätigung

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
    beiOffen(false);
  }

  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Escape' && offen) { schliesse(); return; }
    const r = REITER.find((x) => x.taste === e.code);
    if (!r || (!offen && !darfOeffnen())) return;
    e.stopImmediatePropagation();
    if (offen && reiter === r.id) schliesse(); else oeffne(r.id);
  });

  function zeichne() {
    for (const k of menue.querySelectorAll('[data-reiter]')) k.setAttribute('aria-selected', String(k.dataset.reiter === reiter));
    const teil = { inventar: zeichneInventar, herstellen: zeichneHerstellen, figur: zeichneFigur, aufgaben: zeichneAufgaben }[reiter]();
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
        f.append(el('span', 'bild', d.bild ?? '•'));
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
      detail.append(el('div', 'detail-bild', g.bild ?? ''), el('h3', '', anzahl > 1 ? `${g.name} (${anzahl})` : g.name), el('p', 'klein', ARTEN[g.art]), el('p', '', g.beschreibung));
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
      kopf.append(el('span', 'rezept-bild', r.bild ?? ''), el('b', '', (r.menge ?? 1) > 1 ? `${r.menge} × ${r.name}` : r.name), el('span', 'rezept-beruf', `${BERUFE[r.beruf].name} ${r.stufe}`));
      const zutaten = el('div', 'zutaten');
      for (const [id, menge] of Object.entries(r.zutaten)) {
        const g = gegenstand(id), hat = inventar.anzahl(id);
        zutaten.append(el('span', `zutat${hat < menge ? ' fehlt' : ''}`, `${g.bild ?? ''} ${g.name} ${Math.min(hat, menge)}/${menge}`));
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
    wrap.append(stufe, werte, berufe, einstellungen);
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
    oeffne, schliesse, zeichne,
    get offen() { return offen; },
    get reiter() { return reiter; },
  };
}
