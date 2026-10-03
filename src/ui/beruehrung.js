// Steuerung für Handy und Tablet: Daumen links ist ein Laufstick (ganz ausgelenkt = rennen),
// Wischen auf der rechten Seite dreht den Blick, Knöpfe springen, wechseln den Blickwinkel,
// machen Feuer, öffnen das Inventar und schalten die Grafik um. Die Knöpfe lösen dieselben
// Tasten aus wie die Tastatur, darum gilt alles andere im Spiel unverändert.
// Eingeschaltet wird das auf Geräten, die man hauptsächlich mit dem Finger bedient, und sobald
// jemand den Bildschirm berührt.
const RADIUS = 56; // so weit (Pixel) lässt sich der Stick ziehen
const TOTZONE = 0.18; // kleine Auslenkung zählt noch nicht
const RENNEN_AB = 0.9; // ab hier wird gerannt
const BLICK = 1.8; // Wischen dreht stärker als die Maus

export function erzeugeBeruehrung({ flaeche, steuerung }) {
  const stick = document.getElementById('stick');
  const knauf = document.getElementById('stick-knauf');
  let lauf = null, blick = null;

  const einschalten = () => document.documentElement.classList.add('beruehrung');
  if (matchMedia('(pointer: coarse)').matches) einschalten();

  flaeche.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    einschalten();
    if (!steuerung.zustand.aktiv) return;
    flaeche.setPointerCapture?.(e.pointerId);
    if (!lauf && e.clientX < innerWidth * 0.45) {
      lauf = { id: e.pointerId, x: e.clientX, y: e.clientY };
      stick.style.left = `${e.clientX}px`;
      stick.style.top = `${e.clientY}px`;
      stick.classList.add('aktiv');
    } else if (!blick) {
      blick = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  });

  flaeche.addEventListener('pointermove', (e) => {
    if (lauf && e.pointerId === lauf.id) {
      let dx = e.clientX - lauf.x, dy = e.clientY - lauf.y;
      const laenge = Math.hypot(dx, dy);
      if (laenge > RADIUS) { dx *= RADIUS / laenge; dy *= RADIUS / laenge; }
      knauf.style.transform = `translate(${dx}px, ${dy}px)`;
      const auslenkung = Math.min(laenge / RADIUS, 1);
      if (auslenkung < TOTZONE) steuerung.setzeStick(0, 0, false);
      else steuerung.setzeStick(-dy / RADIUS, dx / RADIUS, auslenkung >= RENNEN_AB);
    } else if (blick && e.pointerId === blick.id) {
      steuerung.umsehen((e.clientX - blick.x) * BLICK, (e.clientY - blick.y) * BLICK);
      blick.x = e.clientX;
      blick.y = e.clientY;
    }
  });

  function loslassen(e) {
    if (lauf && e.pointerId === lauf.id) {
      lauf = null;
      steuerung.setzeStick(0, 0, false);
      knauf.style.transform = '';
      stick.style.left = stick.style.top = '';
      stick.classList.remove('aktiv');
    }
    if (blick && e.pointerId === blick.id) blick = null;
  }
  flaeche.addEventListener('pointerup', loslassen);
  flaeche.addEventListener('pointercancel', loslassen);

  for (const knopf of document.querySelectorAll('#knoepfe [data-taste]')) {
    const code = knopf.dataset.taste;
    const senden = (art) => dispatchEvent(new KeyboardEvent(art, { code }));
    knopf.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      knopf.setPointerCapture?.(e.pointerId);
      senden('keydown');
    });
    knopf.addEventListener('pointerup', () => senden('keyup'));
    knopf.addEventListener('pointercancel', () => senden('keyup'));
    knopf.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
