// Combat visuals for the 3D renderer: arrows and bolts, the melee swing arc,
// spark particles and potions. Everything is read from shared game state
// (GS.arrows, GS.fx.particles, GS.pickups, GS.combat); nothing here changes it.
//
// Lights are a fixed pool (switched off when unused) because three.js recompiles
// shaders whenever the number of lights changes, which would stutter mid-fight.

import * as THREE from 'three';

const T = GS.TILE_SIZE;

const BOLT_LIGHTS   = 3;
const POTION_LIGHTS = 2;
const MAX_PARTICLES = 300;
const SWING_FRAMES  = 12;

export function createEffects(scene) {
  const temp  = new THREE.Object3D();
  const color = new THREE.Color();

  // ---- Light pool -----------------------------------------------------------

  function lightPool(n, hex, distance) {
    const lights = [];
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(hex, 0, distance, 2);
      scene.add(l);
      lights.push(l);
    }
    return lights;
  }
  const boltLights   = lightPool(BOLT_LIGHTS, 0xb070ff, 4);
  const potionLights = lightPool(POTION_LIGHTS, 0xff3040, 3);

  // ---- Projectiles ----------------------------------------------------------

  // Arrow: shaft, steel head, pale fletching; points along +Z
  function makeArrow() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.55), new THREE.MeshBasicMaterial({ color: 0xc89858 })));
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), new THREE.MeshBasicMaterial({ color: 0xe0e4f0 }));
    head.rotation.x = Math.PI / 2;
    head.position.z = 0.32;
    const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.12), new THREE.MeshBasicMaterial({ color: 0xf0f0e0 }));
    fletch.position.z = -0.24;
    g.add(head, fletch);
    return g;
  }

  // Bolt: bright core inside a soft additive halo
  const boltCoreMat = new THREE.MeshBasicMaterial({ color: 0xf0d8ff });
  const boltHaloMat = new THREE.MeshBasicMaterial({ color: 0x9040ff, transparent: true, opacity: 0.45,
                                                   blending: THREE.AdditiveBlending, depthWrite: false });
  function makeBolt() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), boltCoreMat));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), boltHaloMat));
    return g;
  }

  const arrows = [], bolts = [];
  function poolFor(list, make, n) {
    while (list.length < n) { const o = make(); scene.add(o); list.push(o); }
    list.forEach((o, i) => { o.visible = i < n; });
  }

  function syncProjectiles() {
    const wizard = GS.selectedClass && GS.selectedClass.name === 'WIZARD';
    const list   = GS.arrows;
    poolFor(arrows, makeArrow, wizard ? 0 : list.length);
    poolFor(bolts,  makeBolt,  wizard ? list.length : 0);

    const objs = wizard ? bolts : arrows;
    list.forEach((a, i) => {
      const o = objs[i];
      o.position.set(a.x / T, 0.9, a.y / T);
      o.rotation.y = Math.atan2(a.vx, a.vy);
      if (wizard) o.children[1].scale.setScalar(0.9 + Math.random() * 0.25);   // crackle
    });

    boltLights.forEach((l, i) => {
      const a = wizard ? list[i] : null;
      l.intensity = a ? 5 : 0;
      if (a) l.position.set(a.x / T, 1.0, a.y / T);
    });
  }

  // ---- Melee swing arc ------------------------------------------------------

  // Flat crescent on the floor in front of the attacker, centred on +Z
  const arcGeo = new THREE.RingGeometry(0.45, 1.0, 20, 1, -Math.PI / 2 - Math.PI * 0.4, Math.PI * 0.8)
    .rotateX(-Math.PI / 2);
  const arcMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false,
                                              blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const arc = new THREE.Mesh(arcGeo, arcMat);
  arc.position.y = 0.6;
  arc.visible = false;
  scene.add(arc);
  let swingT = 0;
  let wasSwinging = false;

  const FACING_ANGLE = { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 };

  function syncSwing() {
    const swinging = !!(GS.combat && GS.combat.swingActive);
    if (swinging && !wasSwinging) {
      swingT = SWING_FRAMES;
      arcMat.color.setHex(GS.player.name === 'CLERIC' ? 0xffe060 : 0xc0d0f0);
      arc.rotation.y = FACING_ANGLE[GS.combat.swingFacing] || 0;
    }
    wasSwinging = swinging;

    arc.visible = swingT > 0;
    if (swingT > 0) {
      const k = swingT / SWING_FRAMES;
      arc.position.x = GS.player.x / T;
      arc.position.z = GS.player.y / T;
      arcMat.opacity = 0.7 * k;
      arc.scale.setScalar(1.15 - 0.15 * k);   // a slight outward sweep as it fades
      swingT--;
    }
  }

  // ---- Spark particles ------------------------------------------------------

  const sparks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
                                         new THREE.MeshBasicMaterial(), MAX_PARTICLES);
  sparks.setColorAt(0, color.set(0xffffff));   // allocate per-instance colour
  sparks.frustumCulled = false;
  sparks.count = 0;
  scene.add(sparks);

  function syncParticles() {
    const ps = GS.fx.particles;
    const n  = Math.min(ps.length, MAX_PARTICLES);
    for (let i = 0; i < n; i++) {
      const p = ps[i];
      const k = p.life / p.maxLife;
      // Sparks fly out and fall to the floor; rising sparkles (negative gravity) do the opposite
      const h = p.gravity < 0 ? 1.4 - 0.9 * k : 0.08 + 0.85 * k;
      const s = Math.max(0.04, (p.size / T) * 5 * k);   // chunkier than the 2D pixels so they read in 3D
      temp.position.set(p.x / T, h, p.y / T);
      temp.rotation.set(i * 0.7, i * 1.3, 0);
      temp.scale.setScalar(s);
      temp.updateMatrix();
      sparks.setMatrixAt(i, temp.matrix);
      sparks.setColorAt(i, color.set(p.col));
    }
    sparks.count = n;
    sparks.instanceMatrix.needsUpdate = true;
    if (sparks.instanceColor) sparks.instanceColor.needsUpdate = true;
  }

  // ---- Potions --------------------------------------------------------------

  const glassMat  = new THREE.MeshStandardMaterial({ color: 0xc01828, emissive: 0x700010, roughness: 0.3 });
  const neckMat   = new THREE.MeshStandardMaterial({ color: 0xa8b0c0, roughness: 0.4 });
  const corkMat   = new THREE.MeshStandardMaterial({ color: 0x8a5a20, roughness: 1 });
  const haloMat   = new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0.3,
                                                  blending: THREE.AdditiveBlending, depthWrite: false });
  function makePotion() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), glassMat);
    body.position.y = 0.2;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.14, 8), neckMat);
    neck.position.y = 0.4;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.07, 8), corkMat);
    cork.position.y = 0.5;
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), haloMat);
    halo.position.y = 0.24;
    g.add(body, neck, cork, halo);
    return g;
  }

  const potions = [];
  let t = 0;

  function syncPickups() {
    t++;
    const list = GS.pickups;
    poolFor(potions, makePotion, list.length);
    list.forEach((k, i) => {
      const o = potions[i];
      o.position.set(k.x / T, 0.04 * Math.sin(t * 0.08 + k.phase), k.y / T);
      o.rotation.y = t * 0.02 + k.phase;
      o.children[3].scale.setScalar(0.85 + 0.2 * Math.sin(t * 0.06 + k.phase));
    });

    // The nearest potions get a real red glow on the floor around them
    const p = GS.player;
    const nearest = list.slice().sort((a, b) =>
      (Math.abs(a.x - p.x) + Math.abs(a.y - p.y)) - (Math.abs(b.x - p.x) + Math.abs(b.y - p.y)));
    potionLights.forEach((l, i) => {
      const k = nearest[i];
      l.intensity = k ? 2.5 + 0.8 * Math.sin(t * 0.06 + k.phase) : 0;
      if (k) l.position.set(k.x / T, 0.6, k.y / T);
    });
  }

  return {
    update() {
      syncProjectiles();
      syncSwing();
      syncParticles();
      syncPickups();
    },
  };
}
