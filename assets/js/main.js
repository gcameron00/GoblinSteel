'use strict';

(function () {
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');

  canvas.width  = GS.VIEW_W;
  canvas.height = GS.VIEW_H + GS.HUD_H;

  ctx.imageSmoothingEnabled = false;

  function update() {
    GS.player.update();
    GS.camera.update();
  }

  function loop() {
    update();
    GS.render(ctx);
    requestAnimationFrame(loop);
  }

  // Kick off the camera so it starts centred on the player
  GS.camera.update();

  loop();
}());
