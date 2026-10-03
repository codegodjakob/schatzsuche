// Alles, was über dem Spielbild liegt: Startbildschirm, Ereignisse, Inventar, Nachrichten,
// Überlebenswerte, Uhr, Tod.
const $ = (id) => document.getElementById(id);

export function erzeugeOberflaeche() {
  const ereignis = $('ereignis');
  const inventar = $('inventar');
  const nachrichten = $('nachrichten');

  function zeigeEreignis(e, waehle, moeglich) {
    $('ereignis-text').textContent = e.text;
    const optionen = $('ereignis-optionen');
    optionen.replaceChildren(...e.optionen.map((o) => {
      const knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = 'option';
      knopf.disabled = !moeglich(o);
      const taste = document.createElement('kbd');
      taste.textContent = o.taste;
      knopf.append(taste, document.createTextNode(o.text));
      knopf.addEventListener('click', () => waehle(o));
      return knopf;
    }));
    ereignis.hidden = false;
  }

  function versteckeEreignis() { ereignis.hidden = true; }

  function zeigeInventar(dinge) {
    const liste = $('inventar-liste');
    if (!dinge.size) {
      const leer = document.createElement('li');
      leer.className = 'leer';
      leer.textContent = 'Nichts. Nur der Lendenschurz.';
      liste.replaceChildren(leer);
      return;
    }
    liste.replaceChildren(...[...dinge].map(([name, anzahl]) => {
      const li = document.createElement('li');
      const n = document.createElement('span');
      n.textContent = name;
      const a = document.createElement('span');
      a.className = 'anzahl';
      a.textContent = `× ${anzahl}`;
      li.append(n, a);
      return li;
    }));
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

  addEventListener('keydown', (e) => {
    if (e.code === 'KeyI' && $('start').hidden) inventar.hidden = !inventar.hidden;
  });

  function laden(text, fertig = false) {
    $('laden').textContent = text;
    if (fertig) document.querySelectorAll('[data-figur]').forEach((k) => { k.disabled = false; });
  }

  // Startbildschirm: Figur wählen. Gibt die Wahl ('er' / 'sie') zurück.
  function warteAufStart() {
    return new Promise((fertig) => {
      document.querySelectorAll('[data-figur]').forEach((knopf) => {
        knopf.addEventListener('click', () => fertig(knopf.dataset.figur), { once: true });
      });
    });
  }

  function spielBeginnt() {
    $('start').hidden = true;
    $('hinweise').hidden = false;
    $('werte').hidden = false;
    $('uhr').hidden = false;
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
  function zeigeQualitaet(name) { $('qualitaet-name').textContent = name; }

  function tod(grund) {
    const t = $('tod');
    $('tod-titel').textContent = `Du bist ${grund}`;
    t.hidden = false;
    t.style.opacity = '1';
  }
  function todVorbei() {
    const t = $('tod');
    t.style.opacity = '0';
    setTimeout(() => { t.hidden = true; }, 1500);
  }

  zeigeInventar(new Map());
  return {
    zeigeEreignis, versteckeEreignis, zeigeInventar, nachricht, warteAufStart, laden, spielBeginnt,
    zeigeWerte, zeigeUhr, zeigeQualitaet, tod, todVorbei,
  };
}
