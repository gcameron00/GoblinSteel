'use strict';

(function () {
  const F = GS.T.FLOOR;
  const W = GS.T.WALL;

  // Build the dungeon by filling rooms and corridors into a wall-filled grid
  function buildDungeon() {
    const rows = GS.MAP_ROWS;
    const cols = GS.MAP_COLS;
    const map  = [];

    for (let r = 0; r < rows; r++) {
      map.push(new Array(cols).fill(W));
    }

    function fill(c1, r1, c2, r2) {
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          map[r][c] = F;
        }
      }
    }

    // --- Rooms ---
    // Spawn room (top-left area)
    fill(2,  2,  9,  8);

    // Upper corridor heading east
    fill(9,  4,  16, 6);

    // Upper-right room
    fill(16, 2,  25, 10);

    // Corridor heading south from upper-right room
    fill(20, 10, 22, 17);

    // Lower-right room
    fill(16, 17, 27, 25);

    // Corridor heading west from lower-right room
    fill(10, 20, 16, 22);

    // Lower-left room
    fill(2,  16, 11, 25);

    // Corridor connecting spawn room south to lower-left room
    fill(4,  8,  6,  16);

    return map;
  }

  const map = buildDungeon();

  GS.map = {
    data: map,

    getTile: function (col, row) {
      if (row < 0 || row >= GS.MAP_ROWS || col < 0 || col >= GS.MAP_COLS) {
        return GS.T.WALL;
      }
      return map[row][col];
    },

    isWall: function (col, row) {
      return GS.map.getTile(col, row) === GS.T.WALL;
    },
  };
}());
