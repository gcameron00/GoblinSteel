'use strict';

(function () {
  const T = GS.TILE_SIZE;
  const HW = 8;   // collision half-width
  const HH = 8;   // collision half-height

  const AGGRO_RANGE  = 155;  // pixels — won't notice elf from starting room
  const LEASH_RANGE  = 260;  // pixels — gives up chase beyond this
  const CHASE_SPEED  = 1.4;
  const PATROL_SPEED = 0.7;
  const MELEE_RANGE  = 14;   // pixels — close enough to strike
  const MELEE_DAMAGE = 1;
  const MELEE_CD     = 50;   // frames between melee hits (~0.8s)

  function canOccupy(px, py) {
    return (
      !GS.map.isWall(Math.floor((px - HW) / T), Math.floor((py - HH) / T)) &&
      !GS.map.isWall(Math.floor((px + HW) / T), Math.floor((py - HH) / T)) &&
      !GS.map.isWall(Math.floor((px - HW) / T), Math.floor((py + HH) / T)) &&
      !GS.map.isWall(Math.floor((px + HW) / T), Math.floor((py + HH) / T))
    );
  }

  function makeGoblin(col, row) {
    return {
      x:           (col + 0.5) * T,
      y:           (row + 0.5) * T,
      hp:          3,
      maxHp:       3,
      state:       'idle',   // 'idle' | 'aggro'
      facing:      'down',
      // Patrol state
      patrolDx:    0,
      patrolDy:    0,
      patrolTimer: Math.floor(Math.random() * 60),  // stagger initial movement
      // Combat
      attackTimer: 0,
      // Visual flash when hit
      hitFlash:    0,
    };
  }

  // Place goblins in the three rooms away from spawn
  GS.goblins = [
    // Upper-right room (cols 16-25, rows 2-10)
    makeGoblin(18, 4),
    makeGoblin(21, 5),
    makeGoblin(23, 8),

    // Lower-right room (cols 16-27, rows 17-25)
    makeGoblin(18, 19),
    makeGoblin(22, 20),
    makeGoblin(24, 18),
    makeGoblin(20, 23),

    // Lower-left room (cols 2-11, rows 16-25)
    makeGoblin(4, 18),
    makeGoblin(7, 20),
    makeGoblin(9, 23),
  ];

  GS.goblins.update = function () {
    const p  = GS.player;
    const gs = GS.goblins;

    for (let i = gs.length - 1; i >= 0; i--) {
      const g  = gs[i];
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Hit flash countdown
      if (g.hitFlash > 0) g.hitFlash--;

      // Reduce attack cooldown
      if (g.attackTimer > 0) g.attackTimer--;

      // --- State transitions ---
      if (g.state === 'idle' && dist < AGGRO_RANGE) {
        g.state = 'aggro';
      } else if (g.state === 'aggro' && dist > LEASH_RANGE) {
        g.state       = 'idle';
        g.patrolTimer = 0;
      }

      // --- Behaviour ---
      if (g.state === 'aggro') {
        if (dist > MELEE_RANGE) {
          // Move toward player
          const nx = dx / dist;
          const ny = dy / dist;
          const mx = nx * CHASE_SPEED;
          const my = ny * CHASE_SPEED;

          if (canOccupy(g.x + mx, g.y))      g.x += mx;
          if (canOccupy(g.x,      g.y + my)) g.y += my;
        } else {
          // Melee strike
          if (g.attackTimer <= 0) {
            p.hp = Math.max(0, p.hp - MELEE_DAMAGE);
            g.attackTimer = MELEE_CD;
          }
        }

        // Update facing toward player
        if (Math.abs(dx) >= Math.abs(dy)) {
          g.facing = dx > 0 ? 'right' : 'left';
        } else {
          g.facing = dy > 0 ? 'down' : 'up';
        }

      } else {
        // --- Idle patrol ---
        g.patrolTimer--;

        if (g.patrolTimer <= 0) {
          // Pick a new random direction (or pause)
          const roll = Math.random();
          if      (roll < 0.22) { g.patrolDx =  PATROL_SPEED; g.patrolDy = 0; g.facing = 'right'; }
          else if (roll < 0.44) { g.patrolDx = -PATROL_SPEED; g.patrolDy = 0; g.facing = 'left';  }
          else if (roll < 0.60) { g.patrolDx = 0; g.patrolDy =  PATROL_SPEED; g.facing = 'down';  }
          else if (roll < 0.76) { g.patrolDx = 0; g.patrolDy = -PATROL_SPEED; g.facing = 'up';    }
          else                  { g.patrolDx = 0; g.patrolDy = 0; }   // pause

          g.patrolTimer = 55 + Math.floor(Math.random() * 65);
        }

        // Move — stop and re-pick direction if wall is hit
        if (g.patrolDx !== 0) {
          if (canOccupy(g.x + g.patrolDx, g.y)) {
            g.x += g.patrolDx;
          } else {
            g.patrolDx = 0;
            g.patrolTimer = 0;
          }
        }
        if (g.patrolDy !== 0) {
          if (canOccupy(g.x, g.y + g.patrolDy)) {
            g.y += g.patrolDy;
          } else {
            g.patrolDy = 0;
            g.patrolTimer = 0;
          }
        }
      }
    }

    // --- Arrow vs goblin collision ---
    const arrows = GS.arrows;
    for (let ai = arrows.length - 1; ai >= 0; ai--) {
      const a = arrows[ai];
      for (let gi = gs.length - 1; gi >= 0; gi--) {
        const g   = gs[gi];
        const adx = a.x - g.x;
        const ady = a.y - g.y;
        if (Math.abs(adx) < 13 && Math.abs(ady) < 13) {
          g.hp--;
          g.hitFlash   = 10;
          g.state      = 'aggro';   // getting shot makes them angry
          arrows.splice(ai, 1);
          if (g.hp <= 0) gs.splice(gi, 1);
          break;
        }
      }
    }
  };
}());
