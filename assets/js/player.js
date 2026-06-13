'use strict';

(function () {
  const T  = GS.TILE_SIZE;
  const HW = 9;   // half-width of collision box
  const HH = 9;   // half-height of collision box

  // Start in the centre of the spawn room
  GS.player = {
    x:      5.5 * T,
    y:      5.0 * T,
    speed:  2.5,
    facing: 'down',
    hp:     80,
    maxHp:  80,
    name:   'ELF',

    moving:        false,
    frameTimer:    0,
    frame:         0,
    frameDuration: 8,
  };

  GS.player.reset = function () {
    const cls  = GS.selectedClass;
    const tile = GS.map.spawnTile;
    const upgs = GS.meta ? GS.meta.upgrades : {};

    GS.player.x       = tile ? (tile.col + 0.5) * T : 5.5 * T;
    GS.player.y       = tile ? (tile.row + 0.5) * T : 5.0 * T;
    GS.player.facing  = 'down';
    GS.player.name    = cls ? cls.name  : 'ELF';
    GS.player.moving  = false;
    GS.player.frameTimer = 0;
    GS.player.frame   = 0;

    // Base stats — reset before applying upgrades
    const baseHp      = cls ? cls.maxHp : 80;
    GS.player.maxHp   = baseHp + (upgs.hp_up || 0) * 20;
    GS.player.hp      = GS.player.maxHp;
    GS.player.speed   = 2.5 + (upgs.speed_up || 0) * 0.3;
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
