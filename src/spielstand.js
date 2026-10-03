// Der Spielstand liegt im Browser (localStorage) und wird regelmäßig von selbst gespeichert.
// Das kleine Skript in index.html liest ihn auch, um „Weiterspielen“ anzubieten; darum stehen
// Name und Kurzbeschreibung (kurz) mit im Spielstand.
export const SCHLUESSEL = 'schatzsuche.spielstand.v1';

export function ladeSpielstand() {
  try {
    const daten = JSON.parse(localStorage.getItem(SCHLUESSEL));
    return daten?.version === 1 ? daten : null;
  } catch {
    return null;
  }
}

export function speichereSpielstand(daten) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify({ version: 1, gespeichert: new Date().toISOString(), ...daten }));
    return true;
  } catch {
    return false; // privates Fenster, voller Speicher: Das Spiel läuft trotzdem weiter
  }
}

export function loescheSpielstand() {
  try { localStorage.removeItem(SCHLUESSEL); } catch { /* egal */ }
}
