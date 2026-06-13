'use strict';

(function () {
  // Pool of active projectiles (arrows + wizard bolts)
  GS.arrows = [];

  // Spawn a projectile from the player's position.
  // speed: pixels/frame, damage: HP to deal on hit
  GS.arrows.fire = function (speed, damage) {
    const p = GS.player;
    let vx = 0, vy = 0;

    switch (p.facing) {
      case 'right': vx =  speed; break;
      case 'left':  vx = -speed; break;
      case 'down':  vy =  speed; break;
      case 'up':    vy = -speed; break;
    }

    GS.arrows.push({ x: p.x, y: p.y, vx: vx, vy: vy, damage: damage || 1 });
  };

  GS.arrows.update = function () {
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
