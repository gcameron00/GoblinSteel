'use strict';

(function () {
  const F = GS.T.FLOOR;
  const W = GS.T.WALL;

  const MIN_ROOM = 6;
  const MAX_ROOM = 10;
  const ATTEMPTS = 60;
  const TARGET   = 8;

  function rnd(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  // Returns { tiles, spawnTile, enemyRooms }
  function buildDungeon() {
    const ROWS = GS.MAP_ROWS;
    const COLS = GS.MAP_COLS;

    const tiles = [];
    for (let r = 0; r < ROWS; r++) tiles.push(new Array(COLS).fill(W));

    function fill(c1, r1, c2, r2) {
      for (let r = r1; r <= r2; r++)
        for (let c = c1; c <= c2; c++)
          tiles[r][c] = F;
    }

    // Place non-overlapping rooms (1-tile margin between them)
    const rooms = [];
    for (let attempt = 0; attempt < ATTEMPTS && rooms.length < TARGET; attempt++) {
      const rw = rnd(MIN_ROOM, MAX_ROOM);
      const rh = rnd(MIN_ROOM, MAX_ROOM);
      const rc = rnd(1, COLS - rw - 2);
      const rr = rnd(1, ROWS - rh - 2);

      const overlap = rooms.some(rm =>
        rc <= rm.c2 + 1 && rc + rw >= rm.c1 - 1 &&
        rr <= rm.r2 + 1 && rr + rh >= rm.r1 - 1
      );
      if (!overlap) rooms.push({ c1: rc, r1: rr, c2: rc + rw - 1, r2: rr + rh - 1 });
    }

    // Fallback if too few rooms placed
    if (rooms.length < 2) {
      rooms.length = 0;
      rooms.push({ c1: 2,  r1: 2,  c2: 9,  r2: 8  });
      rooms.push({ c1: 16, r1: 2,  c2: 25, r2: 10 });
      rooms.push({ c1: 16, r1: 17, c2: 27, r2: 25 });
      rooms.push({ c1: 2,  r1: 16, c2: 11, r2: 25 });
    }

    rooms.forEach(rm => fill(rm.c1, rm.r1, rm.c2, rm.r2));

    // Sort left-to-right, connect consecutive pairs with L-corridors
    rooms.sort((a, b) => a.c1 - b.c1);
    for (let i = 0; i < rooms.length - 1; i++) {
      const a  = rooms[i];
      const b  = rooms[i + 1];
      const ac = Math.floor((a.c1 + a.c2) / 2);
      const ar = Math.floor((a.r1 + a.r2) / 2);
      const bc = Math.floor((b.c1 + b.c2) / 2);
      const br = Math.floor((b.r1 + b.r2) / 2);

      if (Math.random() < 0.5) {
        fill(Math.min(ac, bc), ar, Math.max(ac, bc), ar);
        fill(bc, Math.min(ar, br), bc, Math.max(ar, br));
      } else {
        fill(ac, Math.min(ar, br), ac, Math.max(ar, br));
        fill(Math.min(ac, bc), br, Math.max(ac, bc), br);
      }
    }

    const spawnRoom = rooms[0];
    const bossRoom  = rooms[rooms.length - 1];

    return {
      tiles,
      spawnTile: {
        col: Math.floor((spawnRoom.c1 + spawnRoom.c2) / 2),
        row: Math.floor((spawnRoom.r1 + spawnRoom.r2) / 2),
      },
      enemyRooms: rooms.slice(1).map(rm => ({ room: rm, isBoss: rm === bossRoom })),
    };
  }

  // Build initial dungeon
  let result = buildDungeon();

  // The live tile array — mutated in-place on rebuild so camera/renderer refs stay valid
  const tiles = result.tiles;

  GS.map = {
    data:       tiles,
    spawnTile:  result.spawnTile,
    enemyRooms: result.enemyRooms,

    getTile: function (col, row) {
      if (row < 0 || row >= GS.MAP_ROWS || col < 0 || col >= GS.MAP_COLS) return GS.T.WALL;
      return tiles[row][col];
    },

    isWall: function (col, row) {
      return GS.map.getTile(col, row) === GS.T.WALL;
    },

    rebuild: function () {
      result = buildDungeon();
      for (let r = 0; r < GS.MAP_ROWS; r++)
        for (let c = 0; c < GS.MAP_COLS; c++)
          tiles[r][c] = result.tiles[r][c];
      GS.map.spawnTile  = result.spawnTile;
      GS.map.enemyRooms = result.enemyRooms;
    },
  };
}());
