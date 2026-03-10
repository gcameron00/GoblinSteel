'use strict';

(function () {
  const T  = GS.TILE_SIZE;
  const HW = 9;   // half-width of collision box
  const HH = 9;   // half-height of collision box

  // Start in the centre of the spawn room
  GS.player = {
    x:      5.5 * T,   // world-space centre X
    y:      5.0 * T,   // world-space centre Y
    speed:  2.5,
    facing: 'down',
    hp:     80,
    maxHp:  80,
    name:   'Elf',

    // Walk animation state
    moving:       false,
    frameTimer:   0,
    frame:        0,
    frameDuration: 8,   // ticks between frame flip
  };

  // Returns true if the player centre (px, py) keeps all four AABB corners on floor tiles
  function canOccupy(px, py) {
    const m = GS.map;
    const S = T;

    function clear(wx, wy) {
      return !m.isWall(Math.floor(wx / S), Math.floor(wy / S));
    }

    return (
      clear(px - HW, py - HH) &&
      clear(px + HW, py - HH) &&
      clear(px - HW, py + HH) &&
      clear(px + HW, py + HH)
    );
  }

  GS.player.update = function () {
    const p  = GS.player;
    const sp = p.speed;
    let dx = 0, dy = 0;

    if (GS.input.left)  dx -= sp;
    if (GS.input.right) dx += sp;
    if (GS.input.up)    dy -= sp;
    if (GS.input.down)  dy += sp;

    // Normalise diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    p.moving = (dx !== 0 || dy !== 0);

    // Update facing (horizontal takes priority)
    if      (dx > 0) p.facing = 'right';
    else if (dx < 0) p.facing = 'left';
    else if (dy > 0) p.facing = 'down';
    else if (dy < 0) p.facing = 'up';

    // Resolve collision per axis separately to prevent corner sticking
    if (dx !== 0 && canOccupy(p.x + dx, p.y))      p.x += dx;
    if (dy !== 0 && canOccupy(p.x,      p.y + dy)) p.y += dy;

    // Walk animation
    if (p.moving) {
      p.frameTimer++;
      if (p.frameTimer >= p.frameDuration) {
        p.frameTimer = 0;
        p.frame      = 1 - p.frame;
      }
    } else {
      p.frame      = 0;
      p.frameTimer = 0;
    }
  };
}());
