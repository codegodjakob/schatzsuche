// Der Einsiedler (Issue #2): ein alter Mann in einer Wollkutte, der am Lagerfeuer am Waldrand lebt.
// Er steht am Feuer, dreht sich zum Spieler, wenn der näher kommt, und winkt zur Begrüßung.
import * as THREE from 'three';
import { ladeFigur } from '../spieler/figur.js';
import { hoeheBei } from '../welt/gelaende.js';
import { LAGER } from '../welt/orte.js';
import { beweglichesHindernis } from '../welt/kollision.js';

export async function erzeugeEinsiedler() {
  const figur = await ladeFigur('einsiedler');
  const o = figur.objekt;
  const x = LAGER.x + 1.4, z = LAGER.z - 0.6;
  o.position.set(x, hoeheBei(x, z), z);
  const zumFeuer = Math.atan2(LAGER.x - x, LAGER.z - z);
  o.rotation.y = zumFeuer;
  beweglichesHindernis(o, 0.45);
  let blick = zumFeuer;

  function aktualisiere(dt, spielerOrt) {
    const d = Math.hypot(spielerOrt.x - o.position.x, spielerOrt.z - o.position.z);
    const ziel = d < 9 ? Math.atan2(spielerOrt.x - o.position.x, spielerOrt.z - o.position.z) : zumFeuer;
    let diff = ziel - blick;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    blick += diff * Math.min(1, dt * 2.2);
    o.rotation.y = blick;
    figur.bewege(dt, 0);
  }

  return { objekt: o, aktualisiere, winke: () => figur.spiele('winken') };
}
