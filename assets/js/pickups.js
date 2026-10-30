'use strict';

(function () {
  // Chance that a killed enemy drops a health potion (the boss's death ends the run)
  const DROP_CHANCE = { goblin: 0.15, skeleton: 0.20, orc: 0.35 };
  const HEAL_FRACTION = 0.2;   // of max HP, so potions keep pace with HP upgrades
  const PICKUP_RANGE  = 14;    // px from the player's centre

  const SPARKLE = ['#ff5060', '#ff9aa0', '#ffffff'];

  let t = 0;   // animation clock for bob and glint

  GS.pickups = [];   // { x, y, phase }

  GS.pickups.drop = function (e) {
    if (Math.random() >= (DROP_CHANCE[e.type] || 0)) return;
    GS.pickups.push({ x: e.x, y: e.y + 4, phase: Math.random() * Math.PI * 2 });
  };

  GS.pickups.reset = function () {
    GS.pickups.length = 0;
  };

  GS.pickups.update = function () {
    t++;
    const p = GS.player;
    if (p.hp >= p.maxHp) return;   // leave potions on the floor for later

    for (let i = GS.pickups.length - 1; i >= 0; i--) {
      const k = GS.pickups[i];
      if (Math.abs(k.x - p.x) > PICKUP_RANGE || Math.abs(k.y - p.y) > PICKUP_RANGE) continue;

      const before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(p.maxHp * HEAL_FRACTION)));
      GS.pickups.splice(i, 1);

      GS.fx.burst(k.x, k.y, SPARKLE, 12, 2, { gravity: -0.04 });
      GS.fx.text(p.x, p.y - 18, '+' + (p.hp - before) + ' HP', '#60e060');
      GS.sfx.play('potion');
      if (p.hp >= p.maxHp) return;
    }
  };

  // ---- Rendering (called from renderer.js) ----------------------------------

  // Small corked flask with a gentle bob; drawn before lighting like other sprites
  GS.pickups.draw = function (ctx) {
    const cam = GS.camera;
    for (const k of GS.pickups) {
      const sx = Math.round(k.x - cam.x);
      const sy = Math.round(k.y - cam.y) + GS.HUD_H;
      const by = Math.round(Math.sin(t * 0.08 + k.phase));

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(sx, sy + 5, 5, 2, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#c01828';                                  // liquid
      ctx.beginPath(); ctx.arc(sx, sy + by, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e83848';
      ctx.fillRect(sx - 3, sy + by - 2, 6, 1);                    // liquid surface
      ctx.fillStyle = '#ffb0b8';
      ctx.fillRect(sx - 2, sy + by - 1, 1, 2);                    // glass highlight
      ctx.fillStyle = '#a8b0c0';
      ctx.fillRect(sx - 1, sy + by - 7, 3, 3);                    // neck
      ctx.fillStyle = '#8a5a20';
      ctx.fillRect(sx - 2, sy + by - 9, 5, 2);                    // cork
    }
  };

  // Faint pulsing glint drawn after lighting, so potions can be spotted in the dark
  GS.pickups.drawGlow = function (ctx) {
    const cam = GS.camera;
    for (const k of GS.pickups) {
      const sx    = Math.round(k.x - cam.x);
      const sy    = Math.round(k.y - cam.y) + GS.HUD_H;
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.06 + k.phase);
      const g     = ctx.createRadialGradient(sx, sy, 0, sx, sy, 14);
      g.addColorStop(0, 'rgba(255,60,70,' + (0.10 + 0.15 * pulse).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,60,70,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - 14, sy - 14, 28, 28);
    }
  };
}());
