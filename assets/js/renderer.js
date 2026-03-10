'use strict';

(function () {
  const T = GS.TILE_SIZE;

  // -------------------------------------------------------------------------
  // Tile drawing
  // -------------------------------------------------------------------------
  function drawTiles(ctx) {
    const cam  = GS.camera;
    const map  = GS.map;
    const cols = GS.MAP_COLS;
    const rows = GS.MAP_ROWS;

    const c0 = Math.max(0,        Math.floor(cam.x / T));
    const c1 = Math.min(cols - 1, Math.ceil((cam.x + GS.VIEW_W) / T));
    const r0 = Math.max(0,        Math.floor(cam.y / T));
    const r1 = Math.min(rows - 1, Math.ceil((cam.y + GS.VIEW_H) / T));

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const sx = Math.round(c * T - cam.x);
        const sy = Math.round(r * T - cam.y) + GS.HUD_H;

        if (map.isWall(c, r)) {
          // --- Base stone fill ---
          ctx.fillStyle = GS.C.WALL;
          ctx.fillRect(sx, sy, T, T);

          // --- Masonry: mortar lines forming a running-bond brick pattern ---
          ctx.fillStyle = GS.C.WALL_MORTAR;

          // Horizontal mortar at midpoint
          ctx.fillRect(sx, sy + 15, T, 2);

          // Vertical seams — offset alternates every row for brick bond
          const topSeam = (r % 2 === 0) ? 16 : 8;
          const botSeam = (r % 2 === 0) ? 8  : 24;
          ctx.fillRect(sx + topSeam - 1, sy,      2, 15);
          ctx.fillRect(sx + botSeam - 1, sy + 17, 2, 15);

          // --- Top & left corner highlight (simulated NW light source) ---
          ctx.fillStyle = GS.C.WALL_EDGE;
          ctx.fillRect(sx, sy, T, 1);
          ctx.fillRect(sx, sy, 1, T);

          // --- South wall face: warmer band when floor lies directly below ---
          if (!map.isWall(c, r + 1)) {
            ctx.fillStyle = GS.C.WALL_FACE;
            ctx.fillRect(sx, sy + T - 6, T, 4);
            ctx.fillStyle = GS.C.WALL_FACE2;
            ctx.fillRect(sx, sy + T - 2, T, 2);
          }
        } else {
          // --- Floor ---
          const alt = (c + r) % 2 === 0;
          ctx.fillStyle = alt ? GS.C.FLOOR : GS.C.FLOOR_ALT;
          ctx.fillRect(sx, sy, T, T);

          // --- Shadow cast by wall to the north ---
          if (map.isWall(c, r - 1)) {
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(sx, sy, T, 7);
            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.fillRect(sx, sy + 7, T, 5);
          }

          // --- Shadow cast by wall to the west ---
          if (map.isWall(c - 1, r)) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(sx, sy, 5, T);
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Elf sprite  (top-down pixel-art style, drawn with canvas primitives)
  // -------------------------------------------------------------------------
  function drawElf(ctx) {
    const p   = GS.player;
    const cam = GS.camera;

    const sx = Math.round(p.x - cam.x);
    const sy = Math.round(p.y - cam.y) + GS.HUD_H;

    ctx.save();
    ctx.translate(sx, sy);

    const f = p.facing;
    const frame = p.frame;

    // --- Shadow ---
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 9, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Legs (two-frame walk cycle) ---
    ctx.fillStyle = '#3a2a6a';  // dark trousers
    if (frame === 0) {
      // Feet together
      ctx.fillRect(-3, 5, 3, 6);
      ctx.fillRect( 1, 5, 3, 6);
    } else {
      // Feet apart (stride)
      ctx.fillRect(-4, 4, 3, 7);
      ctx.fillRect( 2, 6, 3, 5);
    }

    // --- Cloak / body ---
    ctx.fillStyle = '#2a5e1e';  // forest green
    ctx.fillRect(-6, -4, 13, 12);

    // Cloak shadow (gives depth)
    ctx.fillStyle = '#1e4614';
    ctx.fillRect(-6, 4, 13, 4);

    // Belt
    ctx.fillStyle = '#7a3a0a';
    ctx.fillRect(-6, 2, 13, 2);

    // --- Head ---
    ctx.fillStyle = '#c8905a';   // skin
    ctx.beginPath();
    ctx.arc(0, -10, 6, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#5a3a0a';   // dark auburn
    ctx.beginPath();
    ctx.arc(0, -12, 6, Math.PI, 0);
    ctx.fill();

    // --- Elf ears (both sides, always visible from above) ---
    ctx.fillStyle = '#c8905a';
    // Left ear
    ctx.beginPath();
    ctx.moveTo(-5, -12);
    ctx.lineTo(-11, -9);
    ctx.lineTo(-5,  -7);
    ctx.closePath();
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.moveTo(5,  -12);
    ctx.lineTo(11, -9);
    ctx.lineTo(5,  -7);
    ctx.closePath();
    ctx.fill();

    // Eyes (two dark pixels)
    ctx.fillStyle = '#1a0500';
    ctx.fillRect(-3, -11, 2, 2);
    ctx.fillRect( 2, -11, 2, 2);

    // --- Bow ---
    // Position the bow to the leading side based on facing
    const bowRight = (f === 'right' || f === 'down');
    const bx = bowRight ? 10 : -10;

    ctx.strokeStyle = '#8a4a0a';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    if (bowRight) {
      ctx.arc(bx - 4, -5, 9, -Math.PI * 0.55, Math.PI * 0.55);
    } else {
      ctx.arc(bx + 4, -5, 9, Math.PI - Math.PI * 0.55, Math.PI + Math.PI * 0.55);
    }
    ctx.stroke();

    // Bowstring
    ctx.strokeStyle = '#d8d8b0';
    ctx.lineWidth   = 1;
    const bcy = -5;
    const brad = 9;
    const angle = Math.PI * 0.55;
    if (bowRight) {
      const cx2 = bx - 4;
      ctx.beginPath();
      ctx.moveTo(cx2 + Math.cos(-angle) * brad, bcy + Math.sin(-angle) * brad);
      ctx.lineTo(cx2 + Math.cos( angle) * brad, bcy + Math.sin( angle) * brad);
      ctx.stroke();
    } else {
      const cx2 = bx + 4;
      ctx.beginPath();
      ctx.moveTo(cx2 + Math.cos(Math.PI - angle) * brad, bcy + Math.sin(Math.PI - angle) * brad);
      ctx.lineTo(cx2 + Math.cos(Math.PI + angle) * brad, bcy + Math.sin(Math.PI + angle) * brad);
      ctx.stroke();
    }

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // Arrows in flight
  // -------------------------------------------------------------------------
  function drawArrows(ctx) {
    const cam = GS.camera;

    for (let i = 0; i < GS.arrows.length; i++) {
      const a  = GS.arrows[i];
      const sx = Math.round(a.x - cam.x);
      const sy = Math.round(a.y - cam.y) + GS.HUD_H;
      const horiz = a.vx !== 0;

      ctx.save();
      ctx.translate(sx, sy);

      // Shaft (wood)
      ctx.fillStyle = '#a0621e';
      if (horiz) {
        ctx.fillRect(-7, -1, 14, 2);
      } else {
        ctx.fillRect(-1, -7, 2, 14);
      }

      // Arrowhead (metal)
      ctx.fillStyle = '#c8c8b0';
      if      (a.vx > 0) { ctx.fillRect( 5, -2, 5, 4); }   // right
      else if (a.vx < 0) { ctx.fillRect(-10, -2, 5, 4); }  // left
      else if (a.vy > 0) { ctx.fillRect(-2,  5, 4, 5); }   // down
      else               { ctx.fillRect(-2, -10, 4, 5); }   // up

      // Fletching (red feathers at tail)
      ctx.fillStyle = '#cc3030';
      if (a.vx > 0) {
        ctx.fillRect(-10, -3, 4, 2);
        ctx.fillRect(-10,  1, 4, 2);
      } else if (a.vx < 0) {
        ctx.fillRect(  6, -3, 4, 2);
        ctx.fillRect(  6,  1, 4, 2);
      } else if (a.vy > 0) {
        ctx.fillRect(-3, -10, 2, 4);
        ctx.fillRect( 1, -10, 2, 4);
      } else {
        ctx.fillRect(-3,   6, 2, 4);
        ctx.fillRect( 1,   6, 2, 4);
      }

      ctx.restore();
    }
  }

  // -------------------------------------------------------------------------
  // HUD
  // -------------------------------------------------------------------------
  function drawHUD(ctx) {
    const p = GS.player;
    const w = GS.VIEW_W;
    const h = GS.HUD_H;

    // Background
    ctx.fillStyle = GS.C.HUD_BG;
    ctx.fillRect(0, 0, w, h);

    // Bottom border line
    ctx.fillStyle = GS.C.HUD_BORDER;
    ctx.fillRect(0, h - 1, w, 1);

    // Class name
    ctx.font         = 'bold 14px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = GS.C.TEXT_YELLOW;
    ctx.fillText('ELF', 10, h / 2);

    // HP label
    ctx.fillStyle = GS.C.TEXT_DIM;
    ctx.font      = '11px monospace';
    ctx.fillText('HP', 60, h / 2);

    // HP bar
    const barX = 82;
    const barW = 120;
    const barH = 10;
    const barY = Math.floor(h / 2 - barH / 2);

    ctx.fillStyle = GS.C.HP_EMPTY;
    ctx.fillRect(barX, barY, barW, barH);

    const filled = Math.round((p.hp / p.maxHp) * barW);
    ctx.fillStyle = GS.C.HP_FULL;
    ctx.fillRect(barX, barY, filled, barH);

    // HP border
    ctx.strokeStyle = '#660000';
    ctx.lineWidth   = 1;
    ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);

    // HP numbers
    ctx.fillStyle = GS.C.TEXT_DIM;
    ctx.font      = '10px monospace';
    ctx.fillText(p.hp + '/' + p.maxHp, barX + barW + 6, h / 2);
  }

  // -------------------------------------------------------------------------
  // Public render function
  // -------------------------------------------------------------------------
  GS.render = function (ctx) {
    // Clear full canvas
    ctx.fillStyle = GS.C.BG;
    ctx.fillRect(0, 0, GS.VIEW_W, GS.VIEW_H + GS.HUD_H);

    drawTiles(ctx);
    drawElf(ctx);
    drawArrows(ctx);
    drawHUD(ctx);
  };
}());
