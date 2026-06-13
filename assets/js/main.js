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
    const phase = GS.screen.phase();
    if (phase !== 'game') {
      GS.screen.update();
      return;
    }
    GS.player.update();
    GS.combat.update();
    GS.arrows.update();
    GS.enemies.update();
    GS.camera.update();

    // Win when the boss is dead
    if (GS.enemies.length === 0 || !GS.enemies.some(e => e.boss)) GS.screen.win();
    if (GS.player.hp   <= 0)      GS.screen.dead();
  }

  function loop() {
    update();
    const phase = GS.screen.phase();
    if (phase === 'title' || phase === 'select' || phase === 'play-fade') {
      GS.screen.render(ctx);
    } else if (phase === 'win' || phase === 'dead') {
      GS.render(ctx);           // frozen dungeon behind overlay
      GS.screen.render(ctx);    // end-screen overlay
    } else {
      GS.render(ctx);
    }
    requestAnimationFrame(loop);
  }

  loop();
}());
