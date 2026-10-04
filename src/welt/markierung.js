// Ein leuchtender Ring am Boden unter dem, was man gerade benutzen kann (Ast, Blume, Baum …),
// damit man im hohen Gras sieht, was „Benutzen“ nehmen würde.
import * as THREE from 'three';
import { hoeheBei } from './gelaende.js';

export function erzeugeMarkierung() {
  const geo = new THREE.RingGeometry(0.2, 0.27, 40);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.7, depthWrite: false });
  const ring = new THREE.Mesh(geo, mat);
  ring.name = 'markierung';
  ring.visible = false;
  ring.renderOrder = 2;
  let ziel = null, t = 0;

  return {
    objekt: ring,
    zeige(stelle) {
      if (stelle === ziel) return;
      ziel = stelle;
      ring.visible = !!stelle;
      if (!stelle) return;
      // Bei Bäumen umschließt der Ring den Stamm
      const gross = stelle.art === 'baum' ? (stelle.reichweite - 1.0 + 0.2) / 0.24 : stelle.art === 'beeren' ? 3 : 1;
      ring.scale.setScalar(gross);
      ring.position.set(stelle.x, hoeheBei(stelle.x, stelle.z) + 0.04, stelle.z);
    },
    schritt(dt) {
      if (!ring.visible) return;
      t += dt;
      mat.opacity = 0.45 + 0.3 * Math.sin(t * 4) ** 2;
    },
  };
}
