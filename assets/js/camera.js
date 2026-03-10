'use strict';

(function () {
  const worldW = GS.MAP_COLS * GS.TILE_SIZE;
  const worldH = GS.MAP_ROWS * GS.TILE_SIZE;

  GS.camera = {
    x: 0,
    y: 0,
  };

  GS.camera.update = function () {
    const p = GS.player;

    // Centre on player
    let cx = p.x - GS.VIEW_W / 2;
    let cy = p.y - GS.VIEW_H / 2;

    // Clamp to world bounds
    GS.camera.x = Math.max(0, Math.min(cx, worldW - GS.VIEW_W));
    GS.camera.y = Math.max(0, Math.min(cy, worldH - GS.VIEW_H));
  };
}());
