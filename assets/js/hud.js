'use strict';

// HUD bar (class name, HP bar with damage trail, sound toggle, gold), shared by
// the 2D renderer and the experimental 3D renderer
(function () {
  let trailHp   = 0;
  let trailHold = 0;
  let lastHp    = 0;

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
    ctx.textAlign    = 'left';
    ctx.fillStyle    = GS.selectedClass ? GS.selectedClass.col : GS.C.TEXT_YELLOW;
    ctx.fillText(GS.player.name, 10, h / 2);
    const labelX = 10 + Math.ceil(ctx.measureText(GS.player.name).width) + 12;

    // HP label (positioned after the class name so longer names don't overlap)
    ctx.fillStyle = GS.C.TEXT_DIM;
    ctx.font      = '11px monospace';
    ctx.fillText('HP', labelX, h / 2);

    // HP bar
    const barX = labelX + 22;
    const barW = 120;
    const barH = 10;
    const barY = Math.floor(h / 2 - barH / 2);

    ctx.fillStyle = GS.C.HP_EMPTY;
    ctx.fillRect(barX, barY, barW, barH);

    // Damage trail: lost HP shows pale, holds briefly, then drains toward the real value
    if (p.hp >= trailHp || trailHp > p.maxHp) {   // healed, or a new run with a smaller max HP
      trailHp   = p.hp;
      trailHold = 0;
    } else if (p.hp < lastHp) {
      trailHold = 12;
    } else if (trailHold > 0) {
      trailHold--;
    } else {
      trailHp = Math.max(p.hp, trailHp - Math.max(0.25, (trailHp - p.hp) * 0.1));
    }
    lastHp = p.hp;

    const trail = Math.round((trailHp / p.maxHp) * barW);
    ctx.fillStyle = '#ffb080';
    ctx.fillRect(barX, barY, trail, barH);

    const filled = Math.round((p.hp / p.maxHp) * barW);
    ctx.fillStyle = GS.C.HP_FULL;
    ctx.fillRect(barX, barY, filled, barH);

    ctx.strokeStyle = '#660000';
    ctx.lineWidth   = 1;
    ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);

    ctx.fillStyle = GS.C.TEXT_DIM;
    ctx.font      = '10px monospace';
    ctx.fillText(p.hp + '/' + p.maxHp, barX + barW + 6, h / 2);

    // Gold counter (right side)
    const goldStr = GS.runStats.gold + 'g';
    ctx.textAlign = 'right';
    ctx.font      = 'bold 12px monospace';
    ctx.fillStyle = '#f0c020';
    ctx.fillText(goldStr, w - 8, h / 2);

    // Sound on/off indicator (M toggles), left of the gold counter
    const spkX = w - 8 - Math.ceil(ctx.measureText(goldStr).width) - 26;
    drawSpeaker(ctx, spkX, h / 2, GS.sfx.muted);

    // If audio isn't running (and isn't muted), say why, so dropouts can be reported
    const audio = GS.sfx.state();
    if (!GS.sfx.muted && audio !== 'running') {
      ctx.textAlign = 'right';
      ctx.font      = '10px monospace';
      ctx.fillStyle = '#e0a020';
      ctx.fillText('audio: ' + audio, spkX - 6, h / 2);
    }
  }

  function drawSpeaker(ctx, x, cy, muted) {
    ctx.fillStyle = GS.C.TEXT_DIM;
    ctx.fillRect(x, cy - 2, 3, 5);
    ctx.beginPath();
    ctx.moveTo(x + 3, cy - 2); ctx.lineTo(x + 7, cy - 5);
    ctx.lineTo(x + 7, cy + 6); ctx.lineTo(x + 3, cy + 3);
    ctx.closePath(); ctx.fill();

    ctx.strokeStyle = muted ? '#aa3030' : GS.C.TEXT_DIM;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    if (muted) {
      ctx.moveTo(x + 10, cy - 3); ctx.lineTo(x + 15, cy + 3);
      ctx.moveTo(x + 15, cy - 3); ctx.lineTo(x + 10, cy + 3);
    } else {
      ctx.arc(x + 8, cy + 0.5, 4, -Math.PI / 3, Math.PI / 3);
      ctx.moveTo(x + 8 + 7 * Math.cos(-Math.PI / 3), cy + 0.5 + 7 * Math.sin(-Math.PI / 3));
      ctx.arc(x + 8, cy + 0.5, 7, -Math.PI / 3, Math.PI / 3);
    }
    ctx.stroke();
  }

  GS.hud = { draw: drawHUD };
}());
