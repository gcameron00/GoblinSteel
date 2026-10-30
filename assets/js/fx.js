'use strict';

(function () {
  const MAX_PARTICLES = 300;
  const HURT_FRAMES   = 18;
  const CORPSE_FRAMES = 20;
  const PLAYER_FLASH  = 6;

  // Spark colours per enemy type (taken from the sprite palette in renderer.js)
  const COLOURS = {
    goblin:   ['#4a7a1e', '#8ac040', '#ffffff'],
    skeleton: ['#c8c8b8', '#a8a898', '#ffffff'],
    orc:      ['#2a4a10', '#50a020', '#ffffff'],
    boss:     ['#f0c020', '#dd2200', '#ff8020'],
  };
  const DUST = ['#5a4a30', '#3e3020', '#6a5a40'];
  const WALL = ['#8888aa', '#c0c0d8'];

  // Reduced-motion preference disables screenshake (particles and hit-stop remain)
  const reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  GS.fx = {
    particles: [],   // { x, y, vx, vy, life, maxLife, size, col, gravity }
    texts:     [],   // { x, y, vy, life, maxLife, str, col }
    shakeMag:  0,    // current shake magnitude in px, decays each frame
    shakeX:    0,
    shakeY:    0,
    hitStop:   0,    // frames to freeze gameplay
    hurtFlash: 0,    // frames of red screen-edge pulse
    corpses:   [],   // dying enemies fading out: { type, x, y, facing, boss, life }
  };

  // Radial spark burst in world coordinates
  GS.fx.burst = function (x, y, colours, count, speed, opts) {
    const o = opts || {};
    for (let i = 0; i < count; i++) {
      if (GS.fx.particles.length >= MAX_PARTICLES) GS.fx.particles.shift();
      const ang  = Math.random() * Math.PI * 2;
      const spd  = speed * (0.4 + Math.random() * 0.6);
      const life = 15 + Math.floor(Math.random() * 20);
      GS.fx.particles.push({
        x, y,
        vx:      Math.cos(ang) * spd,
        vy:      Math.sin(ang) * spd,
        life,
        maxLife: life,
        size:    o.size || (2 + Math.floor(Math.random() * 2)),
        col:     pick(colours),
        gravity: o.gravity || 0,
      });
    }
  };

  // Floating text that rises and fades (e.g. "+5g")
  GS.fx.text = function (x, y, str, col) {
    GS.fx.texts.push({ x, y, vy: -0.6, life: 45, maxLife: 45, str, col });
  };

  GS.fx.shake = function (mag) {
    GS.fx.shakeMag = Math.max(GS.fx.shakeMag, mag);
  };

  GS.fx.freeze = function (frames) {
    GS.fx.hitStop = Math.max(GS.fx.hitStop, frames);
  };

  // ---- Game-event helpers (called from enemies.js / arrows.js) -------------

  GS.fx.enemyHit = function (e) {
    GS.fx.burst(e.x, e.y, COLOURS[e.type] || COLOURS.goblin, 6, 2.2);
    GS.fx.shake(1.5);
  };

  GS.fx.enemyKilled = function (e, gold) {
    GS.fx.corpses.push({ type: e.type, x: e.x, y: e.y, facing: e.facing, boss: e.boss, life: CORPSE_FRAMES });
    if (e.boss) {
      GS.fx.burst(e.x, e.y, COLOURS.boss, 60, 4.5, { size: 3 });
      GS.fx.burst(e.x, e.y, DUST, 20, 1.5, { gravity: 0.05 });
      GS.fx.shake(10);
      GS.fx.freeze(12);
    } else {
      GS.fx.burst(e.x, e.y, COLOURS[e.type] || COLOURS.goblin, 16, 3);
      GS.fx.burst(e.x, e.y, DUST, 6, 1, { gravity: 0.05 });
      GS.fx.shake(3);
      GS.fx.freeze(3);
    }
    GS.fx.text(e.x, e.y - 14, '+' + gold + 'g', '#f0c020');
  };

  GS.fx.playerHurt = function () {
    GS.fx.shake(4);
    GS.fx.hurtFlash = HURT_FRAMES;
    GS.player.hurtFlash = PLAYER_FLASH;
  };

  GS.fx.wallImpact = function (x, y) {
    GS.fx.burst(x, y, WALL, 3, 1.5, { size: 2 });
  };

  // ---- Per-frame update -----------------------------------------------------

  GS.fx.update = function () {
    const ps = GS.fx.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vx *= 0.9;
      p.vy  = p.vy * 0.9 + p.gravity;
      if (--p.life <= 0) ps.splice(i, 1);
    }

    const ts = GS.fx.texts;
    for (let i = ts.length - 1; i >= 0; i--) {
      const t = ts[i];
      t.y += t.vy;
      if (--t.life <= 0) ts.splice(i, 1);
    }

    if (GS.fx.hurtFlash > 0) GS.fx.hurtFlash--;
    if (GS.player.hurtFlash > 0) GS.player.hurtFlash--;

    const cs = GS.fx.corpses;
    for (let i = cs.length - 1; i >= 0; i--) {
      if (--cs[i].life <= 0) cs.splice(i, 1);
    }

    GS.fx.shakeMag *= 0.85;
    if (GS.fx.shakeMag < 0.3 || reduceMotion.matches) GS.fx.shakeMag = 0;
    GS.fx.shakeX = Math.round((Math.random() * 2 - 1) * GS.fx.shakeMag);
    GS.fx.shakeY = Math.round((Math.random() * 2 - 1) * GS.fx.shakeMag);
  };

  GS.fx.reset = function () {
    GS.fx.particles.length = 0;
    GS.fx.texts.length     = 0;
    GS.fx.shakeMag  = 0;
    GS.fx.shakeX    = 0;
    GS.fx.shakeY    = 0;
    GS.fx.hitStop   = 0;
    GS.fx.hurtFlash = 0;
    GS.fx.corpses.length = 0;
    GS.player.hurtFlash  = 0;
  };

  GS.fx.CORPSE_FRAMES = CORPSE_FRAMES;

  // ---- Rendering (called from renderer.js) ----------------------------------

  // Particles: drawn before lighting so the vignette darkens them like sprites
  GS.fx.drawParticles = function (ctx) {
    const cam = GS.camera;
    for (const p of GS.fx.particles) {
      const k  = p.life / p.maxLife;
      const sz = Math.max(1, Math.round(p.size * k + 0.5));
      ctx.globalAlpha = Math.min(1, k * 1.5);
      ctx.fillStyle   = p.col;
      ctx.fillRect(Math.round(p.x - cam.x - sz / 2), Math.round(p.y - cam.y - sz / 2) + GS.HUD_H, sz, sz);
    }
    ctx.globalAlpha = 1;
  };

  // Floating text + hurt flash: drawn after lighting so they stay readable
  GS.fx.drawOverlay = function (ctx) {
    if (GS.fx.texts.length) {
      ctx.font         = 'bold 11px monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      for (const t of GS.fx.texts) {
        const { x: sx, y: sy } = GS.toScreen(t.x, t.y);
        ctx.globalAlpha = Math.min(1, (t.life / t.maxLife) * 2);
        ctx.fillStyle   = '#000';
        ctx.fillText(t.str, sx + 1, sy + 1);
        ctx.fillStyle   = t.col;
        ctx.fillText(t.str, sx, sy);
      }
      ctx.globalAlpha = 1;
    }

    if (GS.fx.hurtFlash > 0) {
      const w  = GS.VIEW_W;
      const h  = GS.VIEW_H;
      const cx = w / 2;
      const cy = GS.HUD_H + h / 2;
      const a  = (GS.fx.hurtFlash / HURT_FRAMES) * 0.3;
      const g  = ctx.createRadialGradient(cx, cy, h * 0.45, cx, cy, w * 0.65);
      g.addColorStop(0, 'rgba(220,0,0,0)');
      g.addColorStop(1, 'rgba(220,0,0,' + a.toFixed(3) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, GS.HUD_H, w, h);
    }
  };
}());
