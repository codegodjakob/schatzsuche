// Werte (Statuspunkte) und Berufe. Was die Werte bewirken, rechnet src/spieler/fortschritt.js aus;
// hier steht, wie sie heißen und was man dem Spieler darüber sagt.

export const WERTE = {
  staerke: { name: 'Stärke', wirkung: 'Härtere Schläge und mehr Ertrag beim Holzhacken und Sammeln. Später: sichtbare Muskeln.' },
  geschick: { name: 'Geschick', wirkung: 'Öfter Volltreffer (doppelter Schaden), beim Herstellen manchmal ein Stück mehr. Später: Fernkampf.' },
  ausdauer: { name: 'Ausdauer', wirkung: 'Hunger, Durst und Kälte zehren langsamer; Leben heilt schneller.' },
  verstand: { name: 'Verstand', wirkung: 'Mehr Erfahrung für alles. Später: mehr Rezepte und Magie.' },
  ausstrahlung: { name: 'Ausstrahlung', wirkung: 'Bessere Preise und mehr Einfluss. Wirkt ab dem Dorf Erlenbach.' },
};

// Ränge innerhalb eines Berufs
export const BERUFSRAENGE = [
  { ab: 1, name: 'Lehrling' },
  { ab: 10, name: 'Geselle' },
  { ab: 25, name: 'Meister' },
];

export const BERUFE = {
  sammeln: { name: 'Sammeln', wirkung: 'Mehr Ertrag bei Ästen, Steinen, Fasern, Beeren und Pilzen.' },
  kraeuterkunde: { name: 'Kräuterkunde', wirkung: 'Mehr Kräuter; Heilsalben und später Tränke.' },
  holzfaellen: { name: 'Holzfällen', wirkung: 'Mehr Holz pro Baum.' },
  handwerk: { name: 'Handwerk', wirkung: 'Neue Rezepte für Werkzeug und Waffen.' },
  kochen: { name: 'Kochen', wirkung: 'Bessere Mahlzeiten, die länger satt machen.' },
};
