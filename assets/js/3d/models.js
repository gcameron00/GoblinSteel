// Low-poly character and enemy models built from primitives (no model files).
// Every model faces +Z (the game's 'down'), stands on y = 0 and is about one tile
// tall or less. buildActor(kind) returns a THREE.Group whose userData holds the
// parts the renderer animates:
//   rig      - group that bobs while walking
//   legL/R   - hip pivots (rotate x to stride)
//   armL/R   - shoulder pivots (rotate x to swing / attack)
//   mats     - materials that flash white when hit
//   eyes     - emissive eye materials (glow brighter when aggressive)
//   torso    - main body material (the orc tints it while charging)

import * as THREE from 'three';

// ---- Small helpers ----------------------------------------------------------

function newMat(mats, color, opts) {
  const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.95 }, opts));
  mats.push(m);
  return m;
}

function glowMat(eyes, color) {
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, roughness: 1 });
  eyes.push(m);
  return m;
}

function mesh(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x || 0, y || 0, z || 0);
  return m;
}

const box  = (w, h, d)        => new THREE.BoxGeometry(w, h, d);
const cyl  = (rt, rb, h, s, open) => new THREE.CylinderGeometry(rt, rb, h, s || 10, 1, !!open);
const ball = (r, s)           => new THREE.SphereGeometry(r, s || 12, Math.max(6, (s || 12) * 0.6 | 0));
const cone = (r, h, s)        => new THREE.ConeGeometry(r, h, s || 10);

// A limb hanging from a pivot: rotate the pivot to swing the limb
function limb(parent, x, y, z, geo, mat, length) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  pivot.add(mesh(geo, mat, 0, -length / 2, 0));
  parent.add(pivot);
  return pivot;
}

// Soft dark disc on the floor so models sit in the scene rather than float
const shadowGeo = new THREE.CircleGeometry(0.3, 20).rotateX(-Math.PI / 2);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false });

// Shared humanoid frame: legs, torso, arms, head. Returns parts for decorating.
function humanoid(c) {
  const root = new THREE.Group();
  const rig  = new THREE.Group();
  root.add(mesh(shadowGeo, shadowMat, 0, 0.01, 0), rig);

  const mats = [], eyes = [];
  const skin  = newMat(mats, c.skin);
  const body  = newMat(mats, c.body, c.bodyOpts);
  const legsM = newMat(mats, c.legs);

  const hipY = c.hipY || 0.3;
  const legL = limb(rig, -0.07, hipY, 0, box(0.08, hipY, 0.09), legsM, hipY);
  const legR = limb(rig,  0.07, hipY, 0, box(0.08, hipY, 0.09), legsM, hipY);

  const torsoH = c.torsoH || 0.3;
  const torsoW = c.torsoW || 0.28;
  const torso  = mesh(box(torsoW, torsoH, 0.17), body, 0, hipY + torsoH / 2, 0);
  rig.add(torso);

  const shoulderY = hipY + torsoH - 0.03;
  const armLen    = c.armLen || 0.27;
  const armM      = c.armMat === 'body' ? body : skin;
  const armL = limb(rig, -(torsoW / 2 + 0.04), shoulderY, 0, box(0.07, armLen, 0.07), armM, armLen);
  const armR = limb(rig,  (torsoW / 2 + 0.04), shoulderY, 0, box(0.07, armLen, 0.07), armM, armLen);

  const headR = c.headR || 0.12;
  const headY = hipY + torsoH + headR * 0.85;
  const head  = mesh(ball(headR), skin, 0, headY, 0);
  rig.add(head);

  root.userData = { rig, legL, legR, armL, armR, mats, eyes, torso: body };
  return { root, rig, mats, eyes, skin, body, legsM, armL, armR, headY, headR, shoulderY, armLen };
}

// Something held in a hand: attach to the arm pivot, at the hand end
function holdIn(arm, armLen, obj) {
  obj.position.y -= armLen;
  arm.add(obj);
}

function eyePair(h, color, y, z, spread, size) {
  const m = glowMat(h.eyes, color);
  const g = box(size, size, 0.02);
  h.rig.add(mesh(g, m, -spread, y, z), mesh(g, m, spread, y, z));
}

// ---- Player classes ---------------------------------------------------------

function warrior() {
  const steel = { metalness: 0.35, roughness: 0.6 };
  const h = humanoid({ skin: 0xd8a080, body: 0x6a7080, bodyOpts: steel, legs: 0x5a4030,
                       torsoW: 0.3, armMat: 'body' });
  const steelM = newMat(h.mats, 0x7a8294, steel);
  // Helmet with a red crest running front to back (very readable from above)
  h.rig.add(mesh(ball(h.headR * 1.08, 12), steelM, 0, h.headY + 0.02, 0));
  h.rig.add(mesh(box(0.035, 0.07, 0.24), newMat(h.mats, 0xc02020), 0, h.headY + 0.13, -0.01));
  eyePair(h, 0x202020, h.headY, h.headR * 0.95, 0.04, 0.025);
  // Shield on the left arm: red with a gold boss
  const shield = new THREE.Group();
  shield.add(mesh(box(0.04, 0.3, 0.26), newMat(h.mats, 0xa82020), 0, 0, 0));
  shield.add(mesh(ball(0.045, 8), newMat(h.mats, 0xe0b030, steel), -0.03, 0, 0));
  shield.position.set(-0.05, 0.08, 0.06);
  holdIn(h.armL, h.armLen, shield);
  // Sword in the right hand, pointing forward
  const sword = new THREE.Group();
  sword.add(mesh(box(0.025, 0.02, 0.4), newMat(h.mats, 0xe0e4f0, { metalness: 0.6, roughness: 0.3 }), 0, 0, 0.22));
  sword.add(mesh(box(0.14, 0.03, 0.03), newMat(h.mats, 0xc0a040), 0, 0, 0.02));
  holdIn(h.armR, h.armLen, sword);
  return h.root;
}

function elf() {
  const h = humanoid({ skin: 0xe8c098, body: 0x2f8a2a, legs: 0x4a3a20, torsoW: 0.24, headR: 0.11 });
  const hood = newMat(h.mats, 0x1f6a1e);
  // Hood: cone tipped backwards
  const hd = mesh(cone(h.headR * 1.15, 0.26, 10), hood, 0, h.headY + 0.07, -0.04);
  hd.rotation.x = -0.5;
  h.rig.add(hd);
  // Pointed ears
  [-1, 1].forEach(s => {
    const ear = mesh(cone(0.025, 0.12, 6), h.skin, s * (h.headR + 0.03), h.headY + 0.02, 0);
    ear.rotation.z = -s * 1.2;
    h.rig.add(ear);
  });
  eyePair(h, 0x2a6020, h.headY, h.headR * 0.95, 0.035, 0.022);
  // Quiver on the back
  h.rig.add(mesh(cyl(0.04, 0.04, 0.3, 8), newMat(h.mats, 0x6a4020), 0.08, h.shoulderY - 0.05, -0.11));
  // Longbow in the left hand, held upright
  const bow = mesh(new THREE.TorusGeometry(0.22, 0.015, 6, 16, Math.PI), newMat(h.mats, 0x8a5a20), 0, 0, 0.05);
  bow.rotation.set(0, Math.PI / 2, Math.PI / 2);
  holdIn(h.armL, h.armLen, bow);
  return h.root;
}

function cleric() {
  const h = humanoid({ skin: 0xe0b090, body: 0xd8c070, legs: 0x8a7040, torsoW: 0.3, armMat: 'body' });
  // Robe skirt over the legs
  h.rig.add(mesh(cyl(0.16, 0.22, 0.24, 12), h.body, 0, 0.2, 0));
  // White tabard with a red cross on the chest
  const tabard = newMat(h.mats, 0xf0ece0);
  h.rig.add(mesh(box(0.16, 0.26, 0.02), tabard, 0, 0.45, 0.09));
  const red = newMat(h.mats, 0xc02020);
  h.rig.add(mesh(box(0.035, 0.14, 0.02), red, 0, 0.47, 0.105), mesh(box(0.1, 0.035, 0.02), red, 0, 0.49, 0.105));
  // Gold cap
  h.rig.add(mesh(cyl(h.headR * 0.95, h.headR * 1.05, 0.08, 12), newMat(h.mats, 0xe0b030, { metalness: 0.4 }), 0, h.headY + 0.07, 0));
  eyePair(h, 0x302010, h.headY - 0.01, h.headR * 0.95, 0.04, 0.022);
  // Mace in the right hand
  const mace = new THREE.Group();
  mace.add(mesh(cyl(0.015, 0.015, 0.28, 6), newMat(h.mats, 0x6a4a20), 0, 0, 0.12).rotateX(Math.PI / 2));
  mace.add(mesh(ball(0.06, 10), newMat(h.mats, 0xb0b0c0, { metalness: 0.5 }), 0, 0, 0.28));
  holdIn(h.armR, h.armLen, mace);
  return h.root;
}

function wizard() {
  const h = humanoid({ skin: 0xe0b898, body: 0x5a2a8a, legs: 0x3a1a5a, torsoW: 0.26, armMat: 'body' });
  // Long robe to the floor
  h.rig.add(mesh(cyl(0.14, 0.22, 0.32, 12), h.body, 0, 0.16, 0));
  // Tall pointed hat with a wide brim: the class's signature from above
  const hatM = newMat(h.mats, 0x4a1a7a);
  h.rig.add(mesh(cyl(0.22, 0.22, 0.02, 16), hatM, 0, h.headY + 0.06, 0));
  const hat = mesh(cone(0.13, 0.38, 12), hatM, 0, h.headY + 0.25, -0.02);
  hat.rotation.x = -0.15;
  h.rig.add(hat);
  // Stars on the hat
  const star = newMat(h.mats, 0xf0d040, { emissive: 0x403000 });
  h.rig.add(mesh(ball(0.02, 6), star, 0.06, h.headY + 0.15, 0.08), mesh(ball(0.015, 6), star, -0.05, h.headY + 0.24, 0.05));
  // White beard
  const beard = mesh(cone(0.07, 0.16, 8), newMat(h.mats, 0xe8e8e8), 0, h.headY - 0.1, h.headR * 0.75);
  beard.rotation.x = Math.PI;
  h.rig.add(beard);
  eyePair(h, 0x202040, h.headY + 0.01, h.headR * 0.95, 0.04, 0.022);
  // Staff with a glowing orb, held upright in the right hand
  const staff = new THREE.Group();
  staff.add(mesh(cyl(0.018, 0.018, 0.8, 6), newMat(h.mats, 0x6a4020), 0, 0.2, 0.04));
  const orb = new THREE.MeshStandardMaterial({ color: 0xc080ff, emissive: 0x9040ff, emissiveIntensity: 1.5 });
  h.eyes.push(orb);
  staff.add(mesh(ball(0.06, 12), orb, 0, 0.62, 0.04));
  holdIn(h.armR, h.armLen, staff);
  return h.root;
}

// ---- Enemies ----------------------------------------------------------------

// Goblin frame shared by the goblin and the boss
function goblinBody(skinCol, bodyCol) {
  const h = humanoid({ skin: skinCol, body: bodyCol, legs: 0x2a1e08, hipY: 0.24, torsoH: 0.24,
                       torsoW: 0.26, headR: 0.15, armLen: 0.24 });
  // Big bat ears sticking out sideways
  [-1, 1].forEach(s => {
    const ear = mesh(cone(0.06, 0.22, 4), h.skin, s * (h.headR + 0.07), h.headY + 0.05, 0);
    ear.rotation.z = -s * 1.25;
    ear.scale.z = 0.35;
    h.rig.add(ear);
  });
  eyePair(h, 0xff2020, h.headY + 0.02, h.headR * 0.92, 0.05, 0.035);
  return h;
}

function goblin() {
  const h = goblinBody(0x4a7a1e, 0x5a3a14);
  // Club
  const club = new THREE.Group();
  club.add(mesh(cyl(0.05, 0.025, 0.3, 8), newMat(h.mats, 0x6a3a08), 0, 0, 0.13).rotateX(Math.PI / 2));
  holdIn(h.armR, h.armLen, club);
  return h.root;
}

function skeleton() {
  const root = new THREE.Group();
  const rig  = new THREE.Group();
  root.add(mesh(shadowGeo, shadowMat, 0, 0.01, 0), rig);
  const mats = [], eyes = [];
  const bone = newMat(mats, 0xd8d8c8);

  const legL = limb(rig, -0.06, 0.3, 0, cyl(0.022, 0.022, 0.3, 6), bone, 0.3);
  const legR = limb(rig,  0.06, 0.3, 0, cyl(0.022, 0.022, 0.3, 6), bone, 0.3);
  rig.add(mesh(box(0.18, 0.05, 0.08), bone, 0, 0.31, 0));                    // pelvis
  rig.add(mesh(cyl(0.02, 0.02, 0.3, 6), bone, 0, 0.46, -0.03));              // spine
  for (let i = 0; i < 3; i++) {                                              // ribs
    const rib = mesh(new THREE.TorusGeometry(0.1 - i * 0.012, 0.014, 4, 14), bone, 0, 0.42 + i * 0.07, 0);
    rib.rotation.x = Math.PI / 2;
    rig.add(rib);
  }
  const armL = limb(rig, -0.14, 0.58, 0, cyl(0.02, 0.02, 0.26, 6), bone, 0.26);
  const armR = limb(rig,  0.14, 0.58, 0, cyl(0.02, 0.02, 0.26, 6), bone, 0.26);
  rig.add(mesh(ball(0.12, 12), bone, 0, 0.74, 0));                           // skull
  rig.add(mesh(box(0.14, 0.05, 0.1), bone, 0, 0.64, 0.03));                  // jaw
  const sockets = glowMat(eyes, 0x101008);
  sockets.emissive.setHex(0x000000);
  rig.add(mesh(box(0.04, 0.04, 0.02), sockets, -0.045, 0.75, 0.11), mesh(box(0.04, 0.04, 0.02), sockets, 0.045, 0.75, 0.11));
  // Rusty sword
  const sword = new THREE.Group();
  sword.add(mesh(box(0.025, 0.015, 0.34), newMat(mats, 0x887060, { metalness: 0.3 }), 0, 0, 0.2));
  sword.add(mesh(box(0.1, 0.025, 0.025), newMat(mats, 0x604030), 0, 0, 0.03));
  sword.position.y = -0.26;
  armR.add(sword);

  root.userData = { rig, legL, legR, armL, armR, mats, eyes, torso: bone };
  return root;
}

function orc() {
  const h = humanoid({ skin: 0x3a5a18, body: 0x2a4a10, legs: 0x1a3a08, hipY: 0.32, torsoH: 0.38,
                       torsoW: 0.42, headR: 0.14, armLen: 0.34 });
  // Heavy brow and tusks
  h.rig.add(mesh(box(0.24, 0.05, 0.08), newMat(h.mats, 0x1a3008), 0, h.headY + 0.05, h.headR * 0.7));
  const tusk = newMat(h.mats, 0xe8e0b0);
  [-1, 1].forEach(s => {
    const t = mesh(cone(0.022, 0.09, 6), tusk, s * 0.05, h.headY - 0.07, h.headR * 0.85);
    h.rig.add(t);
  });
  eyePair(h, 0xffcc00, h.headY + 0.01, h.headR * 0.95, 0.045, 0.03);
  // Shoulder pads
  const pad = newMat(h.mats, 0x5a4a3a, { metalness: 0.3 });
  h.rig.add(mesh(ball(0.09, 8), pad, -0.24, h.shoulderY + 0.02, 0), mesh(ball(0.09, 8), pad, 0.24, h.shoulderY + 0.02, 0));
  // Axe
  const axe = new THREE.Group();
  axe.add(mesh(cyl(0.022, 0.022, 0.5, 6), newMat(h.mats, 0x706050), 0, 0, 0.2).rotateX(Math.PI / 2));
  axe.add(mesh(box(0.03, 0.2, 0.14), newMat(h.mats, 0x8898a8, { metalness: 0.5, roughness: 0.4 }), 0, 0.06, 0.4));
  holdIn(h.armR, h.armLen, axe);
  return h.root;
}

function boss() {
  const h = goblinBody(0x306020, 0x401818);
  // Gold crown with red gems: visible from above
  const gold = newMat(h.mats, 0xd0a018, { metalness: 0.5, roughness: 0.4 });
  gold.side = THREE.DoubleSide;   // open ring: see inside it from above
  h.rig.add(mesh(cyl(h.headR * 0.85, h.headR * 0.9, 0.06, 12, true), gold, 0, h.headY + h.headR * 0.85, 0));
  const gem = glowMat(h.eyes, 0xff2020);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const x = Math.sin(a) * h.headR * 0.85, z = Math.cos(a) * h.headR * 0.85;
    h.rig.add(mesh(cone(0.025, 0.07, 4), gold, x, h.headY + h.headR * 0.85 + 0.06, z));
    h.rig.add(mesh(ball(0.015, 6), gem, x, h.headY + h.headR * 0.85 + 0.01, z * 1.05));
  }
  // Red cape
  h.rig.add(mesh(box(0.3, 0.42, 0.03), newMat(h.mats, 0x8a1010), 0, 0.33, -0.1));
  // Spiked mace
  const mace = new THREE.Group();
  mace.add(mesh(cyl(0.02, 0.02, 0.3, 6), newMat(h.mats, 0x706050), 0, 0, 0.12).rotateX(Math.PI / 2));
  const headM = newMat(h.mats, 0x3a1c04);
  mace.add(mesh(ball(0.08, 10), headM, 0, 0, 0.3));
  for (let i = 0; i < 6; i++) {
    const s = mesh(cone(0.02, 0.07, 4), headM, 0, 0, 0.3);
    s.rotation.set((i % 3) * 1.05, i * 1.1, 0);
    s.translateY(0.08);
    mace.add(s);
  }
  holdIn(h.armR, h.armLen, mace);
  h.root.scale.setScalar(1.5);
  return h.root;
}

const BUILDERS = {
  WARRIOR: warrior, ELF: elf, CLERIC: cleric, WIZARD: wizard,
  goblin, skeleton, orc, boss,
};

export function buildActor(kind) {
  return (BUILDERS[kind] || goblin)();
}
