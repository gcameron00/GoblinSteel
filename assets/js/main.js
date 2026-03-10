'use strict';

(function () {
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');

  canvas.width  = GS.VIEW_W;
  canvas.height = GS.VIEW_H + GS.HUD_H;

  ctx.imageSmoothingEnabled = false;

  // Initialise title/select system
  GS.screen.init(canvas);

  // Prime camera position so game starts correctly
  GS.camera.update();

  function update() {
    if (GS.screen.phase() !== 'game') {
      GS.screen.update();
      return;
    }
    GS.player.update();
    GS.arrows.update();
    GS.goblins.update();
    GS.camera.update();
  }

  function loop() {
    update();
    if (GS.screen.phase() !== 'game') {
      GS.screen.render(ctx);
    } else {
      GS.render(ctx);
    }
    requestAnimationFrame(loop);
  }

  loop();
}());
