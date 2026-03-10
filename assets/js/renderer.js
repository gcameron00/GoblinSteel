'use strict';

(function () {
  const T = GS.TILE_SIZE;

  // Running-bond masonry constants (in pixels)
  const BRICK_W = 14;
  const BRICK_H = 13;
  const PERIOD  = 16;  // brick width + 2px mortar gap

  // -------------------------------------------------------------------------
  // Helper: draw one beveled stone block (arcade-style bevel)
  // -------------------------------------------------------------------------
  function bevelRect(ctx, x, y, w, h) {
    if (w <= 0 || h <= 0) return;

    ctx.fillStyle = GS.C.WALL_STONE;
    ctx.fillRect(x, y, w, h);

    if (w > 1 && h > 1) {
      ctx.fillStyle = GS.C.WALL_HIGHLIGHT;
      ctx.fillRect(x,         y,         w, 1);   // top edge
      ctx.fillRect(x,         y,         1, h);   // left edge

      ctx.fillStyle = GS.C.WALL_SHADOW;
      ctx.fillRect(x,         y + h - 1, w, 1);  // bottom edge
      ctx.fillRect(x + w - 1, y,         1, h);  // right edge
    }
  }

  // -------------------------------------------------------------------------
  // Tiles
  // -------------------------------------------------------------------------
  function drawTiles(ctx) {
    const cam = GS.camera;
    const map = GS.map;

    const c0 = Math.max(0,              Math.floor(cam.x / T));
    const c1 = Math.min(GS.MAP_COLS-1,  Math.ceil((cam.x + GS.VIEW_W) / T));
    const r0 = Math.max(0,              Math.floor(cam.y / T));
    const r1 = Math.min(GS.MAP_ROWS-1,  Math.ceil((cam.y + GS.VIEW_H) / T));

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const sx       = Math.round(c * T - cam.x);
        const sy       = Math.round(r * T - cam.y) + GS.HUD_H;
        const tileLeft = c * T;

        if (map.isWall(c, r)) {
          // --- Mortar base ---
          ctx.fillStyle = GS.C.WALL_MORTAR;
          ctx.fillRect(sx, sy, T, T);

          // --- Running-bond stone blocks, continuous across tiles ---
          // Alternate the brick offset every tile row for a true running bond
          const rowOdd = r % 2;

          // TOP ROW of bricks (y: sy+1, height: BRICK_H)
          const offTop   = rowOdd * 8;
          const startTop = Math.floor((tileLeft - offTop) / PERIOD) * PERIOD + offTop;
          for (let bx = startTop; bx < tileLeft + T; bx += PERIOD) {
            const lx = Math.max(bx, tileLeft);
            const rx = Math.min(bx + BRICK_W, tileLeft + T);
            bevelRect(ctx, sx + (lx - tileLeft), sy + 1, rx - lx, BRICK_H);
          }

          // BOTTOM ROW of bricks (y: sy+17, height: BRICK_H)
          const offBot   = (1 - rowOdd) * 8;
          const startBot = Math.floor((tileLeft - offBot) / PERIOD) * PERIOD + offBot;
          for (let bx = startBot; bx < tileLeft + T; bx += PERIOD) {
            const lx = Math.max(bx, tileLeft);
            const rx = Math.min(bx + BRICK_W, tileLeft + T);
            bevelRect(ctx, sx + (lx - tileLeft), sy + 17, rx - lx, BRICK_H);
          }

          // --- South wall face: visible stone face when floor is below ---
          if (!map.isWall(c, r + 1)) {
            ctx.fillStyle = GS.C.WALL_FACE;
            ctx.fillRect(sx, sy + T - 7, T, 5);
            ctx.fillStyle = GS.C.WALL_FACE2;
            ctx.fillRect(sx, sy + T - 2, T, 2);
          }

        } else {
          // --- Floor grout base ---
          ctx.fillStyle = GS.C.FLOOR_MORTAR;
          ctx.fillRect(sx, sy, T, T);

          // --- Stone tile interior with deterministic colour variation ---
          const hash = (c * 17 + r * 31) % 6;
          ctx.fillStyle = hash < 2 ? GS.C.FLOOR_STONE  :
                          hash < 4 ? GS.C.FLOOR_STONE2 :
                                     GS.C.FLOOR_STONE3;
          ctx.fillRect(sx + 1, sy + 1, T - 2, T - 2);

          // --- Occasional floor detail (cracks/grain) ---
          if (hash === 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(sx + 6,  sy + 14, 14, 1);
            ctx.fillRect(sx + 18, sy + 15,  7, 1);
          } else if (hash === 3) {
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(sx + 17, sy + 5, 1, 12);
          }

          // --- Shadow from wall to the north ---
          if (map.isWall(c, r - 1)) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(sx, sy, T, 7);
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(sx, sy + 7, T, 6);
          }

          // --- Shadow from wall to the west ---
          if (map.isWall(c - 1, r)) {
            ctx.fillStyle = 'rgba(0,0,0,0.38)';
            ctx.fillRect(sx, sy, 6, T);
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Goblin sprites
  // -------------------------------------------------------------------------
  function drawGoblins(ctx) {
    const cam = GS.camera;
    const gs  = GS.goblins;

    for (let i = 0; i < gs.length; i++) {
      const g  = gs[i];
      const sx = Math.round(g.x - cam.x);
      const sy = Math.round(g.y - cam.y) + GS.HUD_H;

      ctx.save();
      ctx.translate(sx, sy);

      // Hit-flash: overlay white when struck
      const flashing = g.hitFlash > 0;

      // --- Shadow ---
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(1, 9, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // --- Legs ---
      ctx.fillStyle = flashing ? '#ffffff' : '#2a1e08';
      ctx.fillRect(-3, 7, 3, 5);
      ctx.fillRect( 1, 7, 3, 5);

      // --- Body (squat, hunched) ---
      ctx.fillStyle = flashing ? '#ffffff' : '#3a5a18';
      ctx.beginPath();
      ctx.ellipse(0, 1, 9, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ragged tunic seam (darker stripe)
      if (!flashing) {
        ctx.fillStyle = '#2a4010';
        ctx.fillRect(-1, -6, 2, 12);
      }

      // --- Head (large, round, grotesque) ---
      ctx.fillStyle = flashing ? '#ffffff' : '#4a7a1e';
      ctx.beginPath();
      ctx.arc(0, -8, 7, 0, Math.PI * 2);
      ctx.fill();

      // --- Big bat ears ---
      ctx.fillStyle = flashing ? '#ffffff' : '#3a6018';
      ctx.beginPath();
      ctx.moveTo(-5, -12);
      ctx.lineTo(-12, -18);
      ctx.lineTo(-7,  -7);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo( 5, -12);
      ctx.lineTo( 12, -18);
      ctx.lineTo(  7,  -7);
      ctx.closePath();
      ctx.fill();

      // --- Eyes — red, glowing (brighter when aggro) ---
      const eyeColor = g.state === 'aggro' ? '#ff2020' : '#cc1010';
      ctx.fillStyle = eyeColor;
      ctx.fillRect(-3, -10, 2, 3);
      ctx.fillRect( 2, -10, 2, 3);

      // Eye glint
      ctx.fillStyle = '#ff9090';
      ctx.fillRect(-3, -10, 1, 1);
      ctx.fillRect( 2, -10, 1, 1);

      // Nostrils
      if (!flashing) {
        ctx.fillStyle = '#2a4a08';
        ctx.fillRect(-2, -6, 1, 1);
        ctx.fillRect( 2, -6, 1, 1);
      }

      // --- Club weapon (stubby, to the side based on facing) ---
      if (!flashing) {
        const clubRight = (g.facing === 'right' || g.facing === 'down');
        const cx2       = clubRight ? 10 : -10;

        // Handle
        ctx.fillStyle = '#6a3a08';
        ctx.fillRect(clubRight ? 8 : -11, -2, 3, 9);

        // Head of club
        ctx.fillStyle = '#4a2a04';
        ctx.fillRect(clubRight ? 7 : -12, -5, 5, 5);
        // Club highlight
        ctx.fillStyle = '#8a5010';
        ctx.fillRect(clubRight ? 7 : -12, -5, 5, 1);
        ctx.fillRect(clubRight ? 7 : -12, -5, 1, 5);
      }

      // --- Health bar (shown when damaged) ---
      if (g.hp < g.maxHp) {
        const bw  = 18;
        const bh  = 3;
        const bx  = -bw / 2;
        const by  = -22;
        ctx.fillStyle = '#440000';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#cc2200';
        ctx.fillRect(bx, by, Math.round((g.hp / g.maxHp) * bw), bh);
      }

      ctx.restore();
    }
  }

  // -------------------------------------------------------------------------
  // Elf sprite
  // -------------------------------------------------------------------------
  function drawElf(ctx) {
    const p   = GS.player;
    const cam = GS.camera;

    const sx = Math.round(p.x - cam.x);
    const sy = Math.round(p.y - cam.y) + GS.HUD_H;

    ctx.save();
    ctx.translate(sx, sy);

    const f     = p.facing;
    const frame = p.frame;

    // --- Ground shadow ---
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(1, 11, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Boots/legs (peek out below cloak) ---
    ctx.fillStyle = '#2e1e50';
    if (frame === 0) {
      ctx.fillRect(-3, 10, 3, 6);
      ctx.fillRect( 1, 10, 3, 6);
    } else {
      ctx.fillRect(-4,  9, 3, 7);
      ctx.fillRect( 2, 11, 3, 5);
    }

    // --- Cloak body (large oval, richly coloured) ---
    ctx.fillStyle = '#1a5014';
    ctx.beginPath();
    ctx.ellipse(0, 2, 12, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cloak rim highlight (bright arcade green)
    ctx.strokeStyle = '#38c028';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 2, 12, 13, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Cloak centre fold shadow
    ctx.fillStyle = '#112e0d';
    ctx.fillRect(-1, -4, 2, 14);

    // --- Belt ---
    ctx.fillStyle = '#7a3808';
    ctx.fillRect(-10, 4, 20, 2);
    // Buckle
    ctx.fillStyle = '#e8b818';
    ctx.fillRect(-2, 4, 4, 2);

    // --- Head (skin) ---
    ctx.fillStyle = '#d09460';
    ctx.beginPath();
    ctx.arc(0, -9, 6, 0, Math.PI * 2);
    ctx.fill();

    // Hood rim (bright green arc framing head)
    ctx.strokeStyle = '#38c028';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(0, -9, 8, -Math.PI * 0.85, 0.1);
    ctx.stroke();

    // --- Hair ---
    ctx.fillStyle = '#b07020';
    ctx.beginPath();
    ctx.arc(0, -11, 5, Math.PI, 0);
    ctx.fill();

    // --- Pointed ears ---
    ctx.fillStyle = '#d09460';
    ctx.beginPath();
    ctx.moveTo(-5, -11);
    ctx.lineTo(-14, -6);
    ctx.lineTo( -4, -5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo( 5, -11);
    ctx.lineTo( 14, -6);
    ctx.lineTo(  4, -5);
    ctx.closePath();
    ctx.fill();

    // --- Eyes ---
    ctx.fillStyle = '#1a0800';
    ctx.fillRect(-3, -10, 2, 2);
    ctx.fillRect( 2, -10, 2, 2);
    // Eye glints (arcade crispness)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -10, 1, 1);
    ctx.fillRect( 3, -10, 1, 1);

    // --- Bow ---
    const bowRight = (f === 'right' || f === 'down');
    const bCx      = bowRight ? 9 : -9;
    const bArcCx   = bowRight ? bCx - 5 : bCx + 5;
    const bRad     = 11;
    const bAngle   = Math.PI * 0.52;
    const bcy      = -4;

    // Stave
    ctx.strokeStyle = '#7a3c08';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    if (bowRight) {
      ctx.arc(bArcCx, bcy, bRad, -bAngle, bAngle);
    } else {
      ctx.arc(bArcCx, bcy, bRad, Math.PI - bAngle, Math.PI + bAngle);
    }
    ctx.stroke();

    // Stave edge highlight
    ctx.strokeStyle = '#b86418';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    if (bowRight) {
      ctx.arc(bArcCx - 1, bcy - 1, bRad, -bAngle, bAngle * 0.5);
    } else {
      ctx.arc(bArcCx + 1, bcy - 1, bRad, Math.PI - bAngle, Math.PI + bAngle * 0.5);
    }
    ctx.stroke();

    // String
    ctx.strokeStyle = '#e0e0b8';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    if (bowRight) {
      ctx.moveTo(bArcCx + Math.cos(-bAngle) * bRad, bcy + Math.sin(-bAngle) * bRad);
      ctx.lineTo(bArcCx + Math.cos( bAngle) * bRad, bcy + Math.sin( bAngle) * bRad);
    } else {
      ctx.moveTo(bArcCx + Math.cos(Math.PI - bAngle) * bRad, bcy + Math.sin(Math.PI - bAngle) * bRad);
      ctx.lineTo(bArcCx + Math.cos(Math.PI + bAngle) * bRad, bcy + Math.sin(Math.PI + bAngle) * bRad);
    }
    ctx.stroke();

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

      ctx.save();
      ctx.translate(sx, sy);

      // Shaft
      ctx.fillStyle = '#a0621e';
      if (a.vx !== 0) {
        ctx.fillRect(-7, -1, 14, 2);
      } else {
        ctx.fillRect(-1, -7, 2, 14);
      }

      // Arrowhead
      ctx.fillStyle = '#c8c8b0';
      if      (a.vx > 0) { ctx.fillRect( 5, -2, 5, 4); }
      else if (a.vx < 0) { ctx.fillRect(-10, -2, 5, 4); }
      else if (a.vy > 0) { ctx.fillRect(-2,  5, 4, 5); }
      else               { ctx.fillRect(-2, -10, 4, 5); }

      // Fletching
      ctx.fillStyle = '#cc3030';
      if      (a.vx > 0) { ctx.fillRect(-10, -3, 4, 2); ctx.fillRect(-10,  1, 4, 2); }
      else if (a.vx < 0) { ctx.fillRect(  6, -3, 4, 2); ctx.fillRect(  6,  1, 4, 2); }
      else if (a.vy > 0) { ctx.fillRect(-3, -10, 2, 4); ctx.fillRect(  1,-10, 2, 4); }
      else               { ctx.fillRect(-3,   6, 2, 4); ctx.fillRect(  1,  6, 2, 4); }

      ctx.restore();
    }
  }

  // -------------------------------------------------------------------------
  // Torch-light vignette — the biggest single atmosphere upgrade
  // -------------------------------------------------------------------------
  function drawLighting(ctx) {
    const p   = GS.player;
    const cam = GS.camera;

    const cx = Math.round(p.x - cam.x);
    const cy = Math.round(p.y - cam.y) + GS.HUD_H;

    // Darkness ring — fades in from about 1/3 of the way out
    const dark = ctx.createRadialGradient(cx, cy, 75, cx, cy, 305);
    dark.addColorStop(0,    'rgba(0,0,0,0)');
    dark.addColorStop(0.30, 'rgba(0,0,0,0)');
    dark.addColorStop(0.62, 'rgba(0,0,0,0.70)');
    dark.addColorStop(1,    'rgba(0,0,0,0.96)');

    ctx.fillStyle = dark;
    ctx.fillRect(0, GS.HUD_H, GS.VIEW_W, GS.VIEW_H);

    // Warm torch glow at the very centre (subtle orange tint)
    const warm = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90);
    warm.addColorStop(0, 'rgba(255,140,20,0.07)');
    warm.addColorStop(1, 'rgba(255,100,0,0)');

    ctx.fillStyle = warm;
    ctx.fillRect(0, GS.HUD_H, GS.VIEW_W, GS.VIEW_H);
  }

  // -------------------------------------------------------------------------
  // HUD
  // -------------------------------------------------------------------------
  function drawHUD(ctx) {
    const p = GS.player;
    const w = GS.VIEW_W;
    const h = GS.HUD_H;

    ctx.fillStyle = GS.C.HUD_BG;
    ctx.fillRect(0, 0, w, h);

    // Border line
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

    ctx.strokeStyle = '#660000';
    ctx.lineWidth   = 1;
    ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);

    ctx.fillStyle = GS.C.TEXT_DIM;
    ctx.font      = '10px monospace';
    ctx.fillText(p.hp + '/' + p.maxHp, barX + barW + 6, h / 2);
  }

  // -------------------------------------------------------------------------
  // Public render — order matters: tiles → sprites → lighting → HUD
  // The vignette darkens both tiles and sprites at the edges for atmosphere
  // -------------------------------------------------------------------------
  GS.render = function (ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GS.VIEW_W, GS.VIEW_H + GS.HUD_H);

    drawTiles(ctx);
    drawGoblins(ctx);
    drawElf(ctx);
    drawArrows(ctx);
    drawLighting(ctx);
    drawHUD(ctx);
  };
}());
