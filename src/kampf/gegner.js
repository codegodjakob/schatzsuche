// Die Gegner: Räuber und ihr Hauptmann. Jeder hat eine eigene Figur (aus einer gemeinsamen Vorlage),
// Leben und einen Zustand: warten, jagen, ausholen, getroffen, heimkehren, tot. Wie stark sie sind und
// was sie fallen lassen, steht in src/inhalte/gegner.js; was ein Treffer beim Spieler anrichtet und
// was ein Sieg bringt, entscheidet main.js über die Rückrufe.
import * as THREE from 'three';
import { BESATZUNG, GEGNER } from '../inhalte/gegner.js';
import { ladeVorlage } from '../spieler/figur.js';
import { inDieHand } from '../welt/waffen.js';
import { hoeheBei } from '../welt/gelaende.js';
import { beweglichesHindernis, entferneHindernis, schiebeHinaus } from '../welt/kollision.js';
import { RAEUBERLAGER } from '../welt/orte.js';
import { zeit } from '../welt/tageszeit.js';

const SICHTWEITE = 100; // weiter weg werden Gegner weder gezeichnet noch bewegt
const jetzt = () => zeit.tag + zeit.stunde / 24;
const zufall = (a, b) => a + Math.random() * (b - a);
const winkelDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function erzeugeGegner({ szene, istAktiv = () => true, beiAlarm = () => {}, beiAngriff = () => {}, beiWarnung = () => {}, beiTreffer = () => {}, beiSieg = () => {} }) {
  const alle = [];
  let laedt = null;
  const tot = new Map(); // id -> Spielzeit, ab der er wiederkommt (für den Spielstand)

  function lade() {
    laedt ??= (async () => {
      const vorlagen = {};
      for (const figur of new Set(BESATZUNG.map((b) => GEGNER[b.art].figur))) vorlagen[figur] = await ladeVorlage(figur);
      BESATZUNG.forEach((b, i) => {
        const def = GEGNER[b.art];
        const figur = vorlagen[def.figur].erzeuge();
        inDieHand(figur, def.waffe);
        const o = figur.objekt;
        o.rotation.order = 'YXZ'; // erst kippen (umfallen), dann drehen
        const g = {
          id: `${b.art}-${i}`, art: b.art, def, figur, objekt: o,
          heimat: { x: RAEUBERLAGER.x + b.x, z: RAEUBERLAGER.z + b.z },
          leben: def.leben, zustand: 'warten', uhr: 0, pause: zufall(0.4, 1.2), angriffe: 0, tempo: 0, blick: 0, blickZiel: 0, taumelnAb: 0,
          hindernis: null, umfallen: 0,
        };
        aufstellen(g);
        szene.add(o);
        alle.push(g);
        if ((tot.get(g.id) ?? 0) > jetzt()) sterbeStill(g);
      });
    })();
    return laedt;
  }

  function aufstellen(g) {
    const o = g.objekt;
    o.position.set(g.heimat.x, hoeheBei(g.heimat.x, g.heimat.z), g.heimat.z);
    g.blick = g.blickZiel = Math.atan2(RAEUBERLAGER.x - g.heimat.x, RAEUBERLAGER.z - g.heimat.z); // zum Feuer
    o.rotation.set(0, g.blick, 0);
    o.visible = true;
    g.leben = g.def.leben;
    g.zustand = 'warten';
    g.umfallen = 0;
    g.angriffe = 0;
    g.hindernis ??= beweglichesHindernis(o, 0.4);
  }

  // Bereits tot (aus dem Spielstand): gar nicht erst zeigen
  function sterbeStill(g) {
    g.zustand = 'tot';
    g.umfallen = 1;
    g.uhr = 999;
    g.objekt.visible = false;
    if (g.hindernis) { entferneHindernis(g.hindernis); g.hindernis = null; }
  }

  function beginneAngriff(g) {
    const schwer = g.def.schwer && (g.angriffe + 1) % g.def.schwer.alle === 0;
    const a = schwer ? g.def.schwer : g.def.angriff;
    g.angriffe += 1;
    g.zustand = 'ausholen';
    g.uhr = 0;
    g.schwer = schwer;
    g.trifftNach = a.trifft / a.tempo;
    g.dauer = g.figur.dauer(a.bewegung) / a.tempo;
    g.getroffenSchon = false;
    g.figur.spiele(a.bewegung, { tempo: a.tempo, ein: 0.15, aus: 0.25 });
    if (schwer) beiWarnung(g, a.warnung);
  }

  // Der Spieler schlägt zu: alle Gegner im Bogen vor ihm und in Reichweite werden getroffen
  function treffe({ ort, richtung, reichweite, schaden, volltreffer }) {
    const getroffen = [];
    for (const g of alle) {
      if (g.zustand === 'tot' || !g.objekt.visible) continue;
      const dx = g.objekt.position.x - ort.x, dz = g.objekt.position.z - ort.z;
      const d = Math.hypot(dx, dz);
      if (d > reichweite + 0.35) continue;
      if (d > 0.5 && Math.abs(winkelDiff(Math.atan2(dx, dz), richtung)) > 1.05) continue; // etwa 60° zu jeder Seite
      g.leben -= schaden;
      getroffen.push(g);
      beiTreffer(g, schaden, volltreffer);
      if (g.leben <= 0) { stirbt(g); continue; }
      // Wer getroffen wird, taumelt kurz, aber nicht öfter als alle anderthalb Sekunden, und wer schon
      // ausholt, schlägt trotzdem zu. Sonst könnte man jeden Gegner einfach festprügeln.
      const warRuhig = g.zustand === 'warten' || g.zustand === 'heim';
      if (g.zustand !== 'ausholen' && g.taumelnAb <= 0) {
        g.zustand = 'getroffen';
        g.uhr = 0;
        g.taumelnAb = 1.5;
        const l = d || 1;
        g.objekt.position.x += (dx / l) * (volltreffer ? 0.3 : 0.12);
        g.objekt.position.z += (dz / l) * (volltreffer ? 0.3 : 0.12);
      } else if (warRuhig) {
        g.zustand = 'jagen';
      }
      if (warRuhig) beiAlarm(g);
    }
    return getroffen;
  }

  function stirbt(g) {
    g.zustand = 'tot';
    g.uhr = 0;
    g.umfallen = 0;
    g.leben = 0;
    if (!g.voruebergehend) tot.set(g.id, jetzt() + g.def.wiederkehr);
    if (g.hindernis) { entferneHindernis(g.hindernis); g.hindernis = null; }
    beiSieg(g);
  }

  function schrittEiner(g, dt, sp) {
    const o = g.objekt;
    if (g.zustand === 'tot') {
      g.uhr += dt;
      if (g.umfallen < 1) {
        g.umfallen = Math.min(1, g.umfallen + dt * 1.8);
        const t = g.umfallen;
        o.rotation.x = -(Math.PI / 2) * t * t; // fällt nach hinten
        g.figur.bewege(dt, 0);
      }
      if (g.uhr > 30) { o.visible = false; if (g.voruebergehend) g.weg = true; }
      if (jetzt() >= (tot.get(g.id) ?? 0) && Math.hypot(sp.ort.x - g.heimat.x, sp.ort.z - g.heimat.z) > 35) {
        tot.delete(g.id);
        aufstellen(g);
      }
      return;
    }
    const dx = sp.ort.x - o.position.x, dz = sp.ort.z - o.position.z;
    const d = Math.hypot(dx, dz);
    if (d > SICHTWEITE) { o.visible = false; return; }
    o.visible = true;
    const def = g.def;
    const vonHeim = Math.hypot(o.position.x - g.heimat.x, o.position.z - g.heimat.z);
    const zumSpieler = Math.atan2(dx, dz);
    const kann = sp.lebt && istAktiv();
    g.uhr += dt;
    g.pause -= dt;
    g.taumelnAb -= dt;
    let ziel = null, tempo = 0;

    if (g.zustand === 'warten') {
      g.leben = Math.min(def.leben, g.leben + dt * 3);
      if (kann && d < def.sieht) { g.zustand = 'jagen'; beiAlarm(g); }
      else if (vonHeim > 1.2) { ziel = g.heimat; tempo = def.tempo.gehen; }
    } else if (g.zustand === 'heim') {
      g.leben = Math.min(def.leben, g.leben + dt * 8);
      ziel = g.heimat;
      tempo = def.tempo.gehen;
      if (vonHeim < 1) { g.zustand = 'warten'; if (g.voruebergehend) g.weg = true; } // Wegelagerer verschwinden im Wald
      else if (kann && d < def.sieht && vonHeim < def.folgt * 0.6) g.zustand = 'jagen';
    } else if (g.zustand === 'jagen') {
      if (!kann || vonHeim > def.folgt || d > def.sieht * 3) g.zustand = 'heim';
      else if (d > def.reichweite * 0.8) { ziel = sp.ort; tempo = d > 4 ? def.tempo.rennen : def.tempo.gehen; }
      else if (g.pause <= 0) beginneAngriff(g);
      g.blickZiel = zumSpieler;
    } else if (g.zustand === 'ausholen') {
      g.blickZiel = zumSpieler;
      if (!g.getroffenSchon && g.uhr >= g.trifftNach) {
        g.getroffenSchon = true;
        const vorne = Math.abs(winkelDiff(zumSpieler, g.blick)) < 1.25;
        if (kann && vorne && d < def.reichweite + 0.45) {
          const [a, b] = g.schwer ? def.schwer.schaden : def.schaden;
          beiAngriff(g, Math.round(zufall(a, b)), g.schwer);
        }
      }
      if (g.uhr >= g.dauer) { g.zustand = 'jagen'; g.pause = def.angriff.pause * zufall(0.8, 1.25); }
    } else if (g.zustand === 'getroffen') {
      if (g.uhr > 0.25) { g.zustand = 'jagen'; g.pause = Math.max(g.pause, 0.25); }
    }

    // Laufen: geradewegs aufs Ziel zu; Bäume, Felsen und andere schieben ihn zur Seite
    const vorher = o.position.clone();
    if (ziel) {
      const rx = ziel.x - o.position.x, rz = ziel.z - o.position.z;
      const l = Math.hypot(rx, rz);
      if (l > 0.05) {
        const s = Math.min(l, tempo * dt);
        o.position.x += (rx / l) * s;
        o.position.z += (rz / l) * s;
        if (g.zustand !== 'jagen') g.blickZiel = Math.atan2(rx, rz);
      }
    }
    schiebeHinaus(o.position, 0.35);
    // nicht in den Spieler hineinlaufen
    const ab = Math.hypot(sp.ort.x - o.position.x, sp.ort.z - o.position.z);
    if (ab < 0.75 && ab > 1e-3) {
      o.position.x = sp.ort.x - ((sp.ort.x - o.position.x) / ab) * 0.75;
      o.position.z = sp.ort.z - ((sp.ort.z - o.position.z) / ab) * 0.75;
    }
    o.position.y = hoeheBei(o.position.x, o.position.z);
    const wirklich = dt > 0 ? Math.hypot(o.position.x - vorher.x, o.position.z - vorher.z) / dt : 0;
    g.tempo = THREE.MathUtils.damp(g.tempo, wirklich, 8, dt);
    g.blick += winkelDiff(g.blickZiel, g.blick) * Math.min(1, dt * (g.zustand === 'ausholen' ? 4 : 8));
    o.rotation.y = g.blick;
    g.figur.bewege(dt, g.zustand === 'ausholen' || g.zustand === 'getroffen' ? 0 : g.tempo);
  }

  return {
    lade,
    schritt(dt, spieler) {
      for (const g of alle) schrittEiner(g, dt, spieler);
      // Wegelagerer, die fort sind, ganz entfernen
      for (let i = alle.length - 1; i >= 0; i--) {
        const g = alle[i];
        if (!g.weg) continue;
        szene.remove(g.objekt);
        if (g.hindernis) entferneHindernis(g.hindernis);
        alle.splice(i, 1);
      }
    },
    // Ein Überfall unterwegs: anzahl Wegelagerer treten in einiger Entfernung aus dem Wald und greifen an
    async ueberfall(ort, anzahl = 2) {
      const vorlage = await ladeVorlage(GEGNER.wegelagerer.figur);
      const w0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < anzahl; i++) {
        const def = GEGNER.wegelagerer;
        const figur = vorlage.erzeuge();
        inDieHand(figur, def.waffe);
        const o = figur.objekt;
        o.rotation.order = 'YXZ';
        const w = w0 + (i - (anzahl - 1) / 2) * 0.5;
        const heimat = { x: ort.x + Math.sin(w) * 16, z: ort.z + Math.cos(w) * 16 };
        const g = {
          id: `wegelagerer-${Date.now()}-${i}`, art: 'wegelagerer', def, figur, objekt: o, heimat, voruebergehend: true,
          leben: def.leben, zustand: 'warten', uhr: 0, pause: zufall(0.8, 1.6), angriffe: 0, tempo: 0, blick: 0, blickZiel: 0, taumelnAb: 0,
          hindernis: null, umfallen: 0,
        };
        aufstellen(g);
        g.zustand = 'jagen';
        szene.add(o);
        alle.push(g);
      }
    },
    treffe,
    get alle() { return alle; },
    // Wer gerade kämpft (für Anzeigen und den Knopf „Schlagen“)
    imKampf: () => alle.filter((g) => g.zustand === 'jagen' || g.zustand === 'ausholen' || g.zustand === 'getroffen'),
    // Der nächste lebende Gegner in einer Entfernung (für das Ausrichten beim Zuschlagen)
    naechster(ort, bis) {
      let beste = null, d = bis;
      for (const g of alle) {
        if (g.zustand === 'tot' || !g.objekt.visible) continue;
        const e = Math.hypot(g.objekt.position.x - ort.x, g.objekt.position.z - ort.z);
        if (e < d) { d = e; beste = g; }
      }
      return beste;
    },
    // Nach dem Tod des Spielers: alle gehen heim und heilen sich
    zurueck() { for (const g of alle) if (g.zustand !== 'tot') g.zustand = 'heim'; },
    speichern: () => ({ tot: [...tot] }),
    laden(daten) {
      tot.clear();
      for (const [id, bis] of daten?.tot ?? []) tot.set(id, bis);
      for (const g of alle) if ((tot.get(g.id) ?? 0) > jetzt()) sterbeStill(g);
    },
  };
}
