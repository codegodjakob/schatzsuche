// Alles, was über dem Spielbild liegt: Startbildschirm, Ereignisse, Nachrichten, Überlebenswerte,
// Stufe und Erfahrung, die verfolgte Aufgabe, was man gerade benutzen kann, Gewinne, Uhr, Tod.
// Das Menü (Inventar, Herstellen, Figur, Aufgaben) steht in menue.js.
const $ = (id) => document.getElementById(id);

export function erzeugeOberflaeche() {
  const ereignis = $('ereignis');
  const nachrichten = $('nachrichten');

  // sichtbar: Optionen, deren Bedingung nicht zutrifft, erscheinen gar nicht (z. B. „Holz abgeben“
  // ohne Auftrag); moeglich: was erscheint, aber gerade nicht geht, ist ausgegraut
  function zeigeEreignis(e, waehle, moeglich, sichtbar = () => true) {
    $('ereignis-text').textContent = e.text;
    const optionen = $('ereignis-optionen');
    optionen.replaceChildren(...e.optionen.filter(sichtbar).map((o) => {
      const knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = 'option';
      knopf.disabled = !moeglich(o);
      const taste = document.createElement('kbd');
      taste.textContent = o.taste;
      knopf.append(taste, document.createTextNode(o.text));
      // Nur Klicks, die auf diesem Knopf begonnen haben: Wer am Handy „Benutzen“ antippt und damit ein Gespräch
      // öffnet, dessen Finger landet sonst gleich auf der Antwort, die jetzt an derselben Stelle erscheint.
      let gedrueckt = false;
      knopf.addEventListener('pointerdown', () => { gedrueckt = true; });
      knopf.addEventListener('click', (ev) => {
        if (gedrueckt || ev.detail === 0) waehle(o); // detail 0: per Tastatur ausgelöst
        gedrueckt = false;
      });
      return knopf;
    }));
    ereignis.hidden = false;
    document.body.classList.add('tafel-offen');
  }

  function versteckeEreignis() {
    ereignis.hidden = true;
    document.body.classList.remove('tafel-offen');
  }

  function nachricht(text) {
    const el = document.createElement('p');
    el.className = 'nachricht';
    el.textContent = text;
    nachrichten.append(el);
    while (nachrichten.children.length > 4) nachrichten.firstElementChild.remove();
    setTimeout(() => el.classList.add('weg'), 4200);
    setTimeout(() => el.remove(), 5000);
  }

  // Kurze Zeilen, die in der Bildmitte aufsteigen: „+1 Ast“, „+3 Erfahrung“
  function gewinn(text, art = '') {
    const liste = $('gewinne');
    const el = document.createElement('p');
    el.className = `gewinn ${art === 'erfahrung' ? 'ep' : art === 'muenzen' ? 'geld' : ''}`;
    el.textContent = text;
    liste.append(el);
    while (liste.children.length > 5) liste.firstElementChild.remove();
    setTimeout(() => el.remove(), 1900);
  }

  // Großes Band in der Bildmitte (Stufenaufstieg, erfüllte Aufgabe). Kommen mehrere auf einmal,
  // erscheinen sie nacheinander.
  const baender = [];
  let bandLaeuft = false;
  function band(titel, text, art = '') {
    baender.push({ titel, text, art });
    if (!bandLaeuft) naechstesBand();
  }
  function naechstesBand() {
    const naechstes = baender.shift();
    const b = $('band');
    if (!naechstes) { bandLaeuft = false; return; }
    bandLaeuft = true;
    $('band-titel').textContent = naechstes.titel;
    $('band-text').textContent = naechstes.text;
    b.className = `tafel ${naechstes.art}`;
    b.hidden = false;
    void b.offsetWidth; // Übergang neu starten
    b.classList.add('zeigen');
    setTimeout(() => {
      b.classList.remove('zeigen');
      setTimeout(() => { b.hidden = true; naechstesBand(); }, 550);
    }, baender.length ? 2600 : 3600);
  }

  // Was man gerade benutzen kann (v: { text, kurz } oder null)
  let letzteAktion = '';
  function zeigeAktion(v) {
    const text = v?.text ?? '';
    if (text === letzteAktion) return;
    letzteAktion = text;
    $('aktion').hidden = !v;
    $('aktion-text').textContent = text;
    const knopf = $('knopf-benutzen');
    knopf.textContent = v ? v.text : 'Benutzen';
    knopf.classList.toggle('bereit', !!v);
  }

  // Stufe, Erfahrung, Münzen, offene Statuspunkte
  function zeigeFortschritt({ stufe, anteil, muenzen, punkte }) {
    $('hud-stufe').textContent = `Stufe ${stufe}`;
    $('hud-ep').style.width = `${Math.round(anteil * 100)}%`;
    $('hud-muenzen').textContent = `${muenzen} Kupfer`;
    const p = $('hud-punkte');
    p.hidden = punkte <= 0;
    p.textContent = `+${punkte}`;
  }

  // Die verfolgte Aufgabe; pfeil: Richtung zum Ziel (Bogenmaß, 0 = geradeaus), meter: Entfernung
  function zeigeZiel(a, pfeil = null, meter = null) {
    const z = $('ziel');
    z.hidden = !a;
    if (!a) return;
    $('ziel-titel').textContent = a.titel;
    const schritt = a.schritte.at(-1);
    $('ziel-schritt').textContent = schritt?.text ?? '';
    const p = $('ziel-pfeil');
    p.hidden = pfeil == null;
    if (pfeil != null) p.style.transform = `rotate(${pfeil}rad)`;
    $('ziel-weite').textContent = meter == null ? '' : meter < 8 ? 'hier' : `${Math.round(meter)} m`;
  }

  // notieren: in den Startbericht schreiben (nicht bei jeder Prozentzahl)
  function laden(text, notieren = true) {
    $('laden').textContent = text;
    if (notieren) window.notiere?.(text);
  }

  // Startbildschirm: Die Knöpfe nimmt schon das kleine Skript in index.html entgegen, damit ein
  // Klick nie verloren geht, auch bevor dieses Programm geladen ist. Gibt 'er' oder 'sie' zurück.
  function warteAufStart() {
    return new Promise((fertig) => {
      if (window.startWahl) fertig(window.startWahl);
      else window.beiWahl = fertig;
    });
  }

  function spielBeginnt() {
    $('start').hidden = true;
    for (const id of ['hinweise', 'werte', 'uhr', 'beruehrung']) $(id).hidden = false;
  }

  function zeigeWerte(w) {
    for (const name of ['saettigung', 'wasser', 'waerme', 'leben']) {
      const el = $(`wert-${name}`);
      el.querySelector('i').style.width = `${Math.round(w[name])}%`;
      el.classList.toggle('knapp', w[name] < 35 && w[name] >= 12);
      el.classList.toggle('leer', w[name] < 12);
    }
  }

  function zeigeUhr(text) { $('uhr').textContent = text; }
  function zeigeQualitaet(name) {
    for (const el of document.querySelectorAll('.qualitaet-name')) el.textContent = name;
  }

  function tod(grund, text) {
    const t = $('tod');
    $('tod-titel').textContent = `Du bist ${grund}`;
    if (text) $('tod-text').textContent = text;
    t.hidden = false;
    t.style.opacity = '1';
  }
  function todVorbei() {
    const t = $('tod');
    t.style.opacity = '0';
    setTimeout(() => { t.hidden = true; }, 1500);
  }

  return {
    zeigeEreignis, versteckeEreignis, nachricht, gewinn, band, zeigeAktion, zeigeFortschritt, zeigeZiel,
    warteAufStart, laden, spielBeginnt, zeigeWerte, zeigeUhr, zeigeQualitaet, tod, todVorbei,
  };
}
