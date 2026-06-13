'use strict';

(function () {
  const T  = GS.TILE_SIZE;
  const HW = 8;
  const HH = 8;

  // Per-type configuration
  const CFG = {
    goblin: {
      hp: 3, aggroRange: 155, leashRange: 260,
      chaseSpeed: 1.4, patrolSpeed: 0.7,
      meleeDamage: 1, meleeRange: 14, meleeCd: 50,
      patrol: true,
    },
    skeleton: {
      hp: 5, aggroRange: 200, leashRange: 320,
      chaseSpeed: 1.8, patrolSpeed: 0,
      meleeDamage: 1, meleeRange: 14, meleeCd: 40,
      patrol: false,   // skeletons stand still until they spot you
    },
    orc: {
      hp: 8, aggroRange: 130, leashRange: 240,
      chaseSpeed: 0.9, patrolSpeed: 0.5,
      meleeDamage: 3, meleeRange: 16, meleeCd: 70,
      patrol: true,
      charge: true,    // short speed-burst when closing in
    },
    boss: {
      hp: 25, aggroRange: 220, leashRange: 9999,
      chaseSpeed: 1.1, patrolSpeed: 0,
      meleeDamage: 4, meleeRange: 20, meleeCd: 40,
      patrol: false,
    },
  };

  function canOccupy(px, py) {
    return (
      !GS.map.isWall(Math.floor((px - HW) / T), Math.floor((py - HH) / T)) &&
      !GS.map.isWall(Math.floor((px + HW) / T), Math.floor((py - HH) / T)) &&
      !GS.map.isWall(Math.floor((px - HW) / T), Math.floor((py + HH) / T)) &&
      !GS.map.isWall(Math.floor((px + HW) / T), Math.floor((py + HH) / T))
    );
  }

  function makeEnemy(type, col, row) {
    const cfg = CFG[type];
    return {
      type,
      x:           (col + 0.5) * T,
      y:           (row + 0.5) * T,
      hp:          cfg.hp,
      maxHp:       cfg.hp,
      state:       'idle',
      facing:      'down',
      patrolDx:    0,
      patrolDy:    0,
      patrolTimer: Math.floor(Math.random() * 60),
      attackTimer: 0,
      hitFlash:    0,
      chargeTimer: 0,   // orc charge burst frames remaining
    };
  }

  // Pick random floor tiles inside a room, away from walls
  function pickSpawns(room, count) {
    const positions = [];
    const { c1, r1, c2, r2 } = room;
    // inner tiles only (1 tile margin from room walls)
    for (let r = r1 + 1; r <= r2 - 1; r++)
      for (let c = c1 + 1; c <= c2 - 1; c++)
        positions.push([c, r]);

    // shuffle
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    return positions.slice(0, count);
  }

  function spawnEnemies() {
    const list = [];
    const rooms = GS.map.enemyRooms;

    rooms.forEach(({ room, isBoss }, idx) => {
      if (isBoss) {
        // Boss room: one boss + two orc guards
        const spots = pickSpawns(room, 3);
        if (spots[0]) { const e = makeEnemy('boss', spots[0][0], spots[0][1]); e.boss = true; list.push(e); }
        if (spots[1]) list.push(makeEnemy('orc',  spots[1][0], spots[1][1]));
        if (spots[2]) list.push(makeEnemy('orc',  spots[2][0], spots[2][1]));
      } else {
        // Earlier rooms: mix goblins + skeletons, later rooms get orcs
        const isLate = idx >= Math.floor(rooms.length * 0.6);
        const spots  = pickSpawns(room, 3);
        spots.forEach((pos, si) => {
          const type = isLate
            ? (si === 0 ? 'orc' : 'skeleton')
            : (si === 0 ? 'skeleton' : 'goblin');
          list.push(makeEnemy(type, pos[0], pos[1]));
        });
      }
    });

    return list;
  }

  GS.enemies = spawnEnemies();

  const GOLD_DROP = { goblin: 5, skeleton: 8, orc: 15, boss: 50 };

  GS.enemies.kill = function (idx) {
    const e    = GS.enemies[idx];
    const base = GOLD_DROP[e.type] || 5;
    const mult = GS.meta ? (1 + 0.5 * (GS.meta.upgrades.gold_find || 0)) : 1;
    GS.runStats.gold += Math.round(base * mult);
    GS.runStats.kills++;
    if (e.boss && GS.meta) GS.meta.bossKills++;
    GS.enemies.splice(idx, 1);
  };

  GS.enemies.reset = function () {
    GS.enemies.splice(0, GS.enemies.length);
    spawnEnemies().forEach(e => GS.enemies.push(e));
  };

  GS.enemies.update = function () {
    const p  = GS.player;
    const es = GS.enemies;

    for (let i = es.length - 1; i >= 0; i--) {
      const e   = es[i];
      const cfg = CFG[e.type];
      const dx  = p.x - e.x;
      const dy  = p.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (e.hitFlash   > 0) e.hitFlash--;
      if (e.attackTimer > 0) e.attackTimer--;
      if (e.chargeTimer > 0) e.chargeTimer--;

      // State transitions
      if (e.state === 'idle' && dist < cfg.aggroRange) {
        e.state = 'aggro';
      } else if (e.state === 'aggro' && dist > cfg.leashRange) {
        e.state       = 'idle';
        e.patrolTimer = 0;
        e.chargeTimer = 0;
      }

      if (e.state === 'aggro') {
        if (dist > cfg.meleeRange) {
          const nx  = dx / dist;
          const ny  = dy / dist;
          // Orc: activate charge burst when within 60px
          const spd = (cfg.charge && dist < 60 && e.chargeTimer <= 0)
            ? (e.chargeTimer = 20, cfg.chaseSpeed * 2.5)
            : (cfg.charge && e.chargeTimer > 0 ? cfg.chaseSpeed * 2.5 : cfg.chaseSpeed);

          if (canOccupy(e.x + nx * spd, e.y))          e.x += nx * spd;
          if (canOccupy(e.x,            e.y + ny * spd)) e.y += ny * spd;
        } else {
          if (e.attackTimer <= 0) {
            const armor = GS.meta ? (GS.meta.upgrades.armor || 0) : 0;
            p.hp = Math.max(0, p.hp - Math.max(1, cfg.meleeDamage - armor));
            e.attackTimer = cfg.meleeCd;
          }
        }

        if (Math.abs(dx) >= Math.abs(dy)) {
          e.facing = dx > 0 ? 'right' : 'left';
        } else {
          e.facing = dy > 0 ? 'down' : 'up';
        }

      } else if (cfg.patrol) {
        // Idle patrol
        e.patrolTimer--;
        if (e.patrolTimer <= 0) {
          const roll = Math.random();
          const spd  = cfg.patrolSpeed;
          if      (roll < 0.22) { e.patrolDx =  spd; e.patrolDy = 0;   e.facing = 'right'; }
          else if (roll < 0.44) { e.patrolDx = -spd; e.patrolDy = 0;   e.facing = 'left';  }
          else if (roll < 0.60) { e.patrolDx = 0;    e.patrolDy =  spd; e.facing = 'down'; }
          else if (roll < 0.76) { e.patrolDx = 0;    e.patrolDy = -spd; e.facing = 'up';   }
          else                  { e.patrolDx = 0;    e.patrolDy = 0; }
          e.patrolTimer = 55 + Math.floor(Math.random() * 65);
        }
        if (e.patrolDx !== 0) {
          if (canOccupy(e.x + e.patrolDx, e.y)) { e.x += e.patrolDx; }
          else { e.patrolDx = 0; e.patrolTimer = 0; }
        }
        if (e.patrolDy !== 0) {
          if (canOccupy(e.x, e.y + e.patrolDy)) { e.y += e.patrolDy; }
          else { e.patrolDy = 0; e.patrolTimer = 0; }
        }
      }
    }

    // Arrow vs enemy collision
    const arrows = GS.arrows;
    for (let ai = arrows.length - 1; ai >= 0; ai--) {
      const a = arrows[ai];
      for (let ei = es.length - 1; ei >= 0; ei--) {
        const e   = es[ei];
        const adx = a.x - e.x;
        const ady = a.y - e.y;
        if (Math.abs(adx) < 13 && Math.abs(ady) < 13) {
          e.hp       -= (a.damage || 1);
          e.hitFlash  = 10;
          e.state     = 'aggro';
          arrows.splice(ai, 1);
          if (e.hp <= 0) GS.enemies.kill(ei);
          break;
        }
      }
    }
  };
}());
