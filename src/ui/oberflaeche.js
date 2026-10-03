// Alles, was über dem Spielbild liegt: Startbildschirm, Ereignisse, Inventar, Nachrichten.
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
    setTimeout(() => el.classList.add('weg'), 3800);
    setTimeout(() => el.remove(), 4600);
  }

  addEventListener('keydown', (e) => {
    if (e.code === 'KeyI' && $('start').hidden) inventar.hidden = !inventar.hidden;
  });

  // Startbildschirm: Figur wählen. Gibt die Wahl ('er' / 'sie') zurück.
  function warteAufStart() {
    return new Promise((fertig) => {
      document.querySelectorAll('[data-figur]').forEach((knopf) => {
        knopf.addEventListener('click', () => {
          $('start').hidden = true;
          $('hinweise').hidden = false;
          fertig(knopf.dataset.figur);
        }, { once: true });
      });
    });
  }

  zeigeInventar(new Map());
  return { zeigeEreignis, versteckeEreignis, zeigeInventar, nachricht, warteAufStart };
}
