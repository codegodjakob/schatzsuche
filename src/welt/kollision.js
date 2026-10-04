// Hindernisse, durch die man nicht hindurchlaufen kann: Baumstämme, Felsen, Feuer, Figuren.
// Ein einfaches Raster (Zellen à 8 m), damit nur die nahen Hindernisse geprüft werden.
const ZELLE = 8;
const raster = new Map();
const beweglich = new Set();

function schluessel(ix, iz) { return ix * 100000 + iz; }

export function hindernis(x, z, radius, art = 'fest') {
  const h = { x, z, radius, art };
  const s = schluessel(Math.floor(x / ZELLE), Math.floor(z / ZELLE));
  if (!raster.has(s)) raster.set(s, []);
  raster.get(s).push(h);
  return h;
}

// Für Figuren, die sich bewegen (Einsiedler)
export function beweglichesHindernis(objekt, radius) {
  const h = { objekt, radius };
  beweglich.add(h);
  return h;
}

export function entferneHindernis(h) {
  for (const liste of raster.values()) {
    const i = liste.indexOf(h);
    if (i >= 0) liste.splice(i, 1);
  }
  beweglich.delete(h);
}

// Begehbare Flächen über dem Gelände, z. B. der Steg am Weiher: Rechtecke mit eigener Höhe.
// Sie beginnen am Ort (x, z) und reichen „laenge“ Meter in Richtung „drehung“.
const flaechen = [];
export function laufflaeche(x, z, drehung, breite, laenge, hoehe) {
  flaechen.push({ x, z, sin: Math.sin(drehung), cos: Math.cos(drehung), breite, laenge, hoehe });
}

// Höhe der begehbaren Fläche an dieser Stelle, oder null, wenn dort keine ist
export function flaecheBei(x, z) {
  for (const f of flaechen) {
    const dx = x - f.x, dz = z - f.z;
    const quer = dx * f.cos - dz * f.sin, laengs = dx * f.sin + dz * f.cos;
    if (Math.abs(quer) <= f.breite / 2 && laengs >= 0 && laengs <= f.laenge) return f.hoehe;
  }
  return null;
}

// Schiebt einen Kreis (Spieler) aus allen Hindernissen heraus
export function schiebeHinaus(ort, radius = 0.32) {
  const ix = Math.floor(ort.x / ZELLE), iz = Math.floor(ort.z / ZELLE);
  const pruefe = (hx, hz, hr) => {
    const dx = ort.x - hx, dz = ort.z - hz;
    const d = Math.hypot(dx, dz);
    const min = hr + radius;
    if (d < min && d > 1e-6) {
      ort.x = hx + (dx / d) * min;
      ort.z = hz + (dz / d) * min;
    }
  };
  for (let a = -1; a <= 1; a++) {
    for (let b = -1; b <= 1; b++) {
      const liste = raster.get(schluessel(ix + a, iz + b));
      if (liste) for (const h of liste) pruefe(h.x, h.z, h.radius);
    }
  }
  for (const h of beweglich) pruefe(h.objekt.position.x, h.objekt.position.z, h.radius);
  return ort;
}

// Wie weit kann die Kamera vom Spieler weg sein, ohne in einem Busch oder Stamm zu stecken?
// Gibt den Anteil (0..1) der gewünschten Strecke zurück.
export function freieSicht(von, nach) {
  const dx = nach.x - von.x, dz = nach.z - von.z;
  const laenge = Math.hypot(dx, dz);
  if (laenge < 0.01) return 1;
  const schritte = Math.ceil(laenge / 0.2);
  for (let i = 1; i <= schritte; i++) {
    const t = i / schritte;
    const x = von.x + dx * t, z = von.z + dz * t;
    const ix = Math.floor(x / ZELLE), iz = Math.floor(z / ZELLE);
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        const liste = raster.get(schluessel(ix + a, iz + b));
        if (!liste) continue;
        for (const h of liste) {
          const r = h.art === 'busch' ? h.radius * 2.4 : h.radius + 0.25;
          if (Math.hypot(x - h.x, z - h.z) < r) return Math.max(0, t - 0.2 / laenge);
        }
      }
    }
  }
  return 1;
}

// Ist ein Kreis frei von festen Hindernissen? (zum Bauen und Graben)
export function kreisFrei(x, z, radius) {
  const ix = Math.floor(x / ZELLE), iz = Math.floor(z / ZELLE);
  for (let a = -1; a <= 1; a++) {
    for (let b = -1; b <= 1; b++) {
      for (const h of raster.get(schluessel(ix + a, iz + b)) ?? []) {
        if (Math.hypot(h.x - x, h.z - z) < h.radius + radius) return false;
      }
    }
  }
  return true;
}
