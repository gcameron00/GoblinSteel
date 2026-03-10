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
          // Solid wall block
          ctx.fillStyle = GS.C.WALL;
          ctx.fillRect(sx, sy, T, T);

          // Lit top-left edges for faux depth
          ctx.fillStyle = GS.C.WALL_EDGE;
          ctx.fillRect(sx,     sy,     T, 2);  // top edge
          ctx.fillRect(sx,     sy,     2, T);  // left edge
        } else {
          // Floor — subtle checkerboard for texture
          const alt = (c + r) % 2 === 0;
          ctx.fillStyle = alt ? GS.C.FLOOR : GS.C.FLOOR_ALT;
          ctx.fillRect(sx, sy, T, T);
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
    drawHUD(ctx);
  };
}());
