// Procedural dungeon textures, painted on canvases at startup (no image files).
// Each painter returns { map, bump }: a colour texture and a matching height map
// (white = raised stone, black = mortar) so the torchlight picks out the joints.

import * as THREE from 'three';

const SIZE = 128;

function canvasPair() {
  const make = () => {
    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    return c;
  };
  const col  = make();
  const bump = make();
  return { col, bump, cx: col.getContext('2d'), bx: bump.getContext('2d') };
}

function toTextures(col, bump) {
  const finish = (canvas, srgb) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter   = THREE.NearestFilter;            // chunky texels, in keeping with the pixel art
    t.minFilter   = THREE.LinearMipmapLinearFilter; // but smooth in the distance, no shimmer
    t.anisotropy  = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: finish(col, true), bump: finish(bump, false) };
}

// Small random brightness offset, for per-stone variation
function vary(base, amount) {
  const k = 1 + (Math.random() - 0.5) * amount;
  return 'rgb(' + base.map(v => Math.max(0, Math.min(255, Math.round(v * k)))).join(',') + ')';
}

// Speckle noise over the whole canvas
function speckle(cx, count, alpha) {
  for (let i = 0; i < count; i++) {
    cx.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha * 0.6})`;
    cx.fillRect(Math.floor(Math.random() * SIZE), Math.floor(Math.random() * SIZE), 2, 2);
  }
}

// Running-bond bricks: rows of `rows` courses, `perRow` bricks wide, offset every other row
function bricks(p, rows, perRow, stone, mortar, highlight, shadow) {
  const { cx, bx } = p;
  const bh = SIZE / rows;
  const bw = SIZE / perRow;

  cx.fillStyle = mortar;
  cx.fillRect(0, 0, SIZE, SIZE);
  bx.fillStyle = '#000';
  bx.fillRect(0, 0, SIZE, SIZE);

  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * bw / 2;
    for (let b = -1; b < perRow; b++) {
      const x = Math.round(b * bw + off) + 1;
      const y = Math.round(r * bh) + 1;
      const w = Math.round(bw) - 2;
      const h = Math.round(bh) - 2;

      cx.fillStyle = vary(stone, 0.25);
      cx.fillRect(x, y, w, h);
      cx.fillStyle = highlight;                 // bevel: lit top-left edges
      cx.fillRect(x, y, w, 1);
      cx.fillRect(x, y, 1, h);
      cx.fillStyle = shadow;                    // and shaded bottom-right
      cx.fillRect(x, y + h - 1, w, 1);
      cx.fillRect(x + w - 1, y, 1, h);

      bx.fillStyle = '#c0c0c0';
      bx.fillRect(x, y, w, h);
      bx.fillStyle = '#fff';
      bx.fillRect(x + 2, y + 2, w - 4, h - 4);
    }
  }
  speckle(cx, 500, 0.12);
}

// Wall tops: what you mostly see from above, like the 2D wall tiles
export function wallTopTexture() {
  const p = canvasPair();
  bricks(p, 4, 2, [58, 52, 150], '#100c2c', '#6a68e0', '#0c0a24');
  return toTextures(p.col, p.bump);
}

// Wall faces: smaller, purplish courses, like the 2D south-facing wall surface
export function wallSideTexture() {
  const p = canvasPair();
  bricks(p, 6, 3, [74, 36, 92], '#140818', '#8a4aa8', '#1a0a20');
  return toTextures(p.col, p.bump);
}

// Floor: one worn flagstone per tile, with grout border and a few cracks
export function floorTexture() {
  const p = canvasPair();
  const { cx, bx } = p;

  cx.fillStyle = '#1a1206';                     // grout
  cx.fillRect(0, 0, SIZE, SIZE);
  bx.fillStyle = '#000';
  bx.fillRect(0, 0, SIZE, SIZE);

  // Two-by-two slabs per tile
  const half = SIZE / 2;
  for (let sy = 0; sy < 2; sy++)
    for (let sx = 0; sx < 2; sx++) {
      const x = sx * half + 2, y = sy * half + 2, w = half - 4, h = half - 4;
      cx.fillStyle = vary([92, 62, 28], 0.2);
      cx.fillRect(x, y, w, h);
      cx.fillStyle = 'rgba(255,220,160,0.10)';
      cx.fillRect(x, y, w, 2);
      cx.fillStyle = 'rgba(0,0,0,0.25)';
      cx.fillRect(x, y + h - 2, w, 2);
      bx.fillStyle = '#fff';
      bx.fillRect(x, y, w, h);
    }

  // Cracks
  cx.strokeStyle = 'rgba(20,12,4,0.8)';
  bx.strokeStyle = '#303030';
  cx.lineWidth = bx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    let x = Math.random() * SIZE, y = Math.random() * SIZE;
    cx.beginPath(); bx.beginPath();
    cx.moveTo(x, y); bx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      x += (Math.random() - 0.5) * 30;
      y += (Math.random() - 0.5) * 30;
      cx.lineTo(x, y); bx.lineTo(x, y);
    }
    cx.stroke(); bx.stroke();
  }

  speckle(cx, 900, 0.15);
  return toTextures(p.col, p.bump);
}
