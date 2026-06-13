'use strict';

(function () {
  // Per-class attack parameters
  const CFG = {
    ELF:     { type: 'ranged', speed: 8,  damage: 1, cooldown: 18 },
    WIZARD:  { type: 'ranged', speed: 5,  damage: 2, cooldown: 40 },
    WARRIOR: { type: 'melee',  range: 22, damage: 2, cooldown: 30 },
    CLERIC:  { type: 'melee',  range: 22, damage: 1, cooldown: 35, regen: 180 },
  };

  let attackCooldown = 0;
  let regenTimer     = 0;
  let swingTimer     = 0;

  GS.combat = {
    swingActive: false,
    swingFacing: 'down',

    reset: function () {
      attackCooldown    = 0;
      regenTimer        = 0;
      swingTimer        = 0;
      this.swingActive  = false;
    },

    update: function () {
      if (attackCooldown > 0) attackCooldown--;
      if (swingTimer > 0) {
        swingTimer--;
        this.swingActive = swingTimer > 0;
      }

      const cls = GS.selectedClass ? GS.selectedClass.name : 'ELF';
      const cfg = CFG[cls];
      if (!cfg) return;

      if (GS.input.fire && attackCooldown <= 0) {
        if (cfg.type === 'ranged') {
          GS.arrows.fire(cfg.speed, cfg.damage);
        } else {
          this._meleeAttack(cfg.range, cfg.damage);
        }
        attackCooldown = cfg.cooldown;
      }

      // Cleric passive HP regen
      if (cfg.regen) {
        regenTimer++;
        if (regenTimer >= cfg.regen) {
          regenTimer = 0;
          GS.player.hp = Math.min(GS.player.maxHp, GS.player.hp + 1);
        }
      } else {
        regenTimer = 0;
      }
    },

    _meleeAttack: function (range, damage) {
      const p = GS.player;
      let tx = p.x, ty = p.y;

      switch (p.facing) {
        case 'right': tx += range; break;
        case 'left':  tx -= range; break;
        case 'down':  ty += range; break;
        case 'up':    ty -= range; break;
      }

      swingTimer        = 12;
      this.swingActive  = true;
      this.swingFacing  = p.facing;

      const gs = GS.goblins;
      for (let i = gs.length - 1; i >= 0; i--) {
        const g = gs[i];
        if (Math.abs(g.x - tx) < range && Math.abs(g.y - ty) < range) {
          g.hp       -= damage;
          g.hitFlash  = 10;
          g.state     = 'aggro';
          if (g.hp <= 0) gs.splice(i, 1);
        }
      }
    },
  };
}());
