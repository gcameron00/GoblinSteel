// Experimental three.js renderer (step 1: textured dungeon and torchlight).
// Draws the dungeon in 3D on #worldCanvas, then the shared HUD and overlays on
// the 2D #gameCanvas above it. Game state is read from GS; nothing here changes it.
// World mapping: 1 unit = 1 tile; game x -> X, game y -> Z, Y is up.

import * as THREE from 'three';
import { wallTopTexture, wallSideTexture, floorTexture } from './textures.js';

const T      = GS.TILE_SIZE;
const WALL_H = 1.2;

// Camera: high above the player, tilted slightly so wall faces and height show
const FOV       = 35;                       // vertical, degrees
const TILT      = 12 * Math.PI / 180;       // from straight down
const CAM_DIST  = (GS.VIEW_H / T / 2) / Math.tan(FOV / 2 * Math.PI / 180);   // ~18 tiles tall in view

const ENEMY_COL = { goblin: 0x4a7a1e, skeleton: 0xc8c8b8, orc: 0x2a4a10, boss: 0x306020 };

// ---- Renderer, scene, camera -------------------------------------------------

const canvas   = document.getElementById('worldCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(GS.VIEW_W, GS.VIEW_H, false);   // CSS size comes from the page stylesheet
renderer.toneMapping         = THREE.ACESFilmicToneMapping;   // soft roll-off near the torch
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(FOV, GS.VIEW_W / GS.VIEW_H, 0.1, 200);

// Near-black ambient: beyond the torch's reach the dungeon falls into darkness
scene.add(new THREE.AmbientLight(0x404a80, 0.15));

// The player's torch, carried high and a little toward the camera, so it lights
// the floor and wall faces around the player without blowing out their head
const TORCH_I      = 190;
const TORCH_HEIGHT = 4.5;
const TORCH_RANGE  = 12;   // tiles (3D distance): roughly where the 2D vignette went dark
const torch = new THREE.PointLight(0xffd8a0, TORCH_I, TORCH_RANGE, 2);
scene.add(torch);

// Browsers can drop the WebGL context (e.g. after backgrounding on iPad); let it restore
canvas.addEventListener('webglcontextlost', e => e.preventDefault());

// ---- Dungeon geometry ------------------------------------------------------

const topTex   = wallTopTexture();
const sideTex  = wallSideTexture();
const floorTex = floorTexture();

function stoneMat(tex, bumpScale) {
  return new THREE.MeshStandardMaterial({ map: tex.map, bumpMap: tex.bump, bumpScale, roughness: 0.92 });
}
const wallSideMat = stoneMat(sideTex, 2.5);
const wallTopMat  = stoneMat(topTex, 2.5);
// BoxGeometry face order: +x, -x, +y (top), -y, +z, -z
const wallMat  = [wallSideMat, wallSideMat, wallTopMat, wallSideMat, wallSideMat, wallSideMat];
const floorMat = stoneMat(floorTex, 3);
const wallGeo  = new THREE.BoxGeometry(1, WALL_H, 1);
const floorGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

let dungeon      = null;
let builtVersion = 0;

// Only walls touching a floor tile are visible, so only those get an instance
function isVisibleWall(c, r) {
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++)
      if (!GS.map.isWall(c + dc, r + dr)) return true;
  return false;
}

function buildDungeon() {
  if (dungeon) {
    scene.remove(dungeon);
    dungeon.children.forEach(m => m.dispose());
  }
  dungeon = new THREE.Group();

  const walls = [], floors = [];
  for (let r = 0; r < GS.MAP_ROWS; r++)
    for (let c = 0; c < GS.MAP_COLS; c++) {
      if (!GS.map.isWall(c, r)) floors.push([c, r]);
      else if (isVisibleWall(c, r)) walls.push([c, r]);
    }

  const m    = new THREE.Matrix4();
  const spin = new THREE.Matrix4();
  const col  = new THREE.Color();

  const wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, walls.length);
  walls.forEach(([c, r], i) => {
    wallMesh.setMatrixAt(i, m.makeTranslation(c + 0.5, WALL_H / 2, r + 0.5));
    wallMesh.setColorAt(i, col.setScalar(0.85 + Math.random() * 0.3));
  });

  const floorMesh = new THREE.InstancedMesh(floorGeo, floorMat, floors.length);
  floors.forEach(([c, r], i) => {
    // A random quarter-turn per tile hides the repeat of the single floor texture
    spin.makeRotationY(Math.floor(Math.random() * 4) * Math.PI / 2);
    floorMesh.setMatrixAt(i, m.makeTranslation(c + 0.5, 0, r + 0.5).multiply(spin));
    floorMesh.setColorAt(i, col.setScalar(0.8 + Math.random() * 0.35));
  });

  dungeon.add(wallMesh, floorMesh);
  scene.add(dungeon);
  builtVersion = GS.map.version;
}

// ---- Actors (placeholders until step 2) --------------------------------------

// Simple body + nose cone so facing is readable
function makeActor(colour, radius, height) {
  const g    = new THREE.Group();
  const mat  = new THREE.MeshStandardMaterial({ color: colour, roughness: 1 });   // matte: overhead torch + overhead camera = glare otherwise
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.1, height, 12), mat);
  body.position.y = height / 2;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.4, radius * 0.9, 8), mat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, height * 0.7, radius * 1.1);
  g.add(body, nose);
  g.userData.mat = mat;
  return g;
}

const FACING_ANGLE = { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 };

function place(obj, x, y, facing) {
  obj.position.set(x / T, 0, y / T);
  if (facing) obj.rotation.y = FACING_ANGLE[facing] || 0;
}

function flash(obj, on) {
  obj.userData.mat.emissive.setHex(on ? 0xffffff : 0x000000);
}

let playerObj   = null;
let playerClass = null;

function syncPlayer() {
  const p   = GS.player;
  const cls = GS.selectedClass ? GS.selectedClass.name : 'ELF';
  if (cls !== playerClass) {
    if (playerObj) scene.remove(playerObj);
    playerObj   = makeActor(new THREE.Color(GS.selectedClass ? GS.selectedClass.col : '#40a040'), 0.28, 0.8);
    playerClass = cls;
    scene.add(playerObj);
  }
  place(playerObj, p.x, p.y, p.facing);
  flash(playerObj, p.hurtFlash > 0);
}

const enemyObjs = new Map();   // enemy object -> three.js group

function syncEnemies() {
  const alive = new Set(GS.enemies);
  for (const [e, obj] of enemyObjs) {
    if (!alive.has(e)) { scene.remove(obj); enemyObjs.delete(e); }
  }
  for (const e of GS.enemies) {
    let obj = enemyObjs.get(e);
    if (!obj) {
      obj = makeActor(ENEMY_COL[e.type] || 0x4a7a1e, e.boss ? 0.4 : 0.26, e.boss ? 1.1 : 0.7);
      enemyObjs.set(e, obj);
      scene.add(obj);
    }
    place(obj, e.x, e.y, e.facing);
    flash(obj, e.hitFlash > 0);
  }
}

// Small pooled meshes for projectiles and potions
function pool(geo, mat) {
  const items = [];
  return function sync(list, y) {
    while (items.length < list.length) {
      const m = new THREE.Mesh(geo, mat);
      items.push(m);
      scene.add(m);
    }
    items.forEach((m, i) => {
      m.visible = i < list.length;
      if (m.visible) m.position.set(list[i].x / T, y, list[i].y / T);
    });
  };
}

const syncArrows  = pool(new THREE.SphereGeometry(0.08, 8, 6),
                         new THREE.MeshBasicMaterial({ color: 0xf0e0a0 }));
const syncPickups = pool(new THREE.SphereGeometry(0.14, 12, 8),
                         new THREE.MeshStandardMaterial({ color: 0xc01828, emissive: 0x801018 }));

// ---- Camera and torch ------------------------------------------------------

let flickerT = 0;
let flickerN = 0;

function syncCamera() {
  const p  = GS.player;
  const tx = (p.x + GS.fx.shakeX) / T;
  const tz = (p.y + GS.fx.shakeY) / T;
  camera.position.set(tx, CAM_DIST * Math.cos(TILT), tz + CAM_DIST * Math.sin(TILT));
  camera.lookAt(tx, 0, tz);

  // Same irregular flicker as the 2D torch
  flickerT++;
  flickerN = flickerN * 0.9 + (Math.random() - 0.5) * 0.4;
  const f = 1 + 0.06 * (0.5 * Math.sin(flickerT * 0.13) + 0.3 * Math.sin(flickerT * 0.31 + 1) + flickerN);
  torch.position.set(p.x / T, TORCH_HEIGHT, p.y / T + 0.6);
  torch.intensity = TORCH_I * f;
}

// ---- Debug readout (/3d/?debug) ---------------------------------------------

const DEBUG   = /[?&]debug\b/.test(location.search);
let fpsFrames = 0;
let fpsSince  = performance.now();
let fpsText   = '';

function drawDebug(ctx) {
  fpsFrames++;
  const now = performance.now();
  if (now - fpsSince > 2000) {        // 3D drawing just resumed (menus don't call this): start afresh
    fpsFrames = 0;
    fpsSince  = now;
  } else if (now - fpsSince >= 1000) {
    const info = renderer.info.render;
    fpsText   = Math.round(fpsFrames * 1000 / (now - fpsSince)) + ' fps  ' +
                info.calls + ' draws  ' + Math.round(info.triangles / 1000) + 'k tris  ' +
                'dpr ' + renderer.getPixelRatio();
    fpsFrames = 0;
    fpsSince  = now;
  }
  ctx.font         = '11px monospace';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle    = 'rgba(0,0,0,0.6)';
  ctx.fillRect(4, GS.HUD_H + 4, ctx.measureText(fpsText).width + 8, 15);
  ctx.fillStyle    = '#60e060';
  ctx.fillText(fpsText, 8, GS.HUD_H + 6);
}

// ---- Shared hooks -----------------------------------------------------------

const projected = new THREE.Vector3();

// World position (px) -> 2D canvas position, through the 3D camera
GS.toScreen = function (x, y) {
  projected.set(x / T, 0.5, y / T).project(camera);
  return {
    x: Math.round((projected.x + 1) / 2 * GS.VIEW_W),
    y: Math.round((1 - projected.y) / 2 * GS.VIEW_H) + GS.HUD_H,
  };
};

GS.render = function (ctx) {
  if (builtVersion !== GS.map.version) buildDungeon();
  syncCamera();
  syncPlayer();
  syncEnemies();
  syncArrows(GS.arrows, 0.5);
  syncPickups(GS.pickups, 0.2);
  renderer.render(scene, camera);

  // 2D layer: clear so the world shows through, then overlays and HUD
  ctx.clearRect(0, 0, GS.VIEW_W, GS.VIEW_H + GS.HUD_H);
  GS.fx.drawOverlay(ctx);
  GS.hud.draw(ctx);
  if (DEBUG) drawDebug(ctx);
};
