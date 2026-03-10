'use strict';

(function () {
  const SPEED    = 8;
  const COOLDOWN = 18;  // frames between shots (~0.3s at 60fps)

  let cooldown = 0;

  // Pool of active arrows
  GS.arrows = [];

  GS.arrows.fire = function () {
    if (cooldown > 0) return;

    const p = GS.player;
    let vx = 0, vy = 0;

    switch (p.facing) {
      case 'right': vx =  SPEED; break;
      case 'left':  vx = -SPEED; break;
      case 'down':  vy =  SPEED; break;
      case 'up':    vy = -SPEED; break;
    }

    GS.arrows.push({ x: p.x, y: p.y, vx: vx, vy: vy });
    cooldown = COOLDOWN;
  };

  GS.arrows.update = function () {
    if (cooldown > 0) cooldown--;

    if (GS.input.fire) GS.arrows.fire();

    const T = GS.TILE_SIZE;

    for (let i = GS.arrows.length - 1; i >= 0; i--) {
      const a = GS.arrows[i];
      a.x += a.vx;
      a.y += a.vy;

      if (GS.map.isWall(Math.floor(a.x / T), Math.floor(a.y / T))) {
        GS.arrows.splice(i, 1);
      }
    }
  };
}());
