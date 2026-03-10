'use strict';

window.GS = window.GS || {};

GS.TILE_SIZE = 32;

GS.MAP_COLS = 40;
GS.MAP_ROWS = 30;

GS.VIEW_W = 800;
GS.VIEW_H = 576;  // leaves 24px for HUD at top
GS.HUD_H  = 24;

// Tile IDs
GS.T = {
  FLOOR: 0,
  WALL:  1,
};

// Colour palette — arcade dungeon
GS.C = {
  BG:             '#000000',

  // Walls — deep blue-purple arcade stone
  WALL_MORTAR:    '#090720',   // mortar base (darkest)
  WALL_STONE:     '#161250',   // stone block fill
  WALL_HIGHLIGHT: '#4040c8',   // beveled top-left edge (bright arcade blue)
  WALL_SHADOW:    '#050312',   // beveled bottom-right edge
  WALL_FACE:      '#30183a',   // south-facing wall surface base
  WALL_FACE2:     '#4a2058',   // south-facing wall surface bottom rim

  // Floor — warm torchlit stone
  FLOOR_MORTAR:   '#120e05',   // grout between floor tiles
  FLOOR_STONE:    '#2e1e0c',   // floor tile base
  FLOOR_STONE2:   '#341e08',   // slight variation
  FLOOR_STONE3:   '#281808',   // slight variation

  // HUD
  HUD_BG:         '#04040e',
  HUD_BORDER:     '#3a3a70',
  HP_FULL:        '#dd2200',
  HP_EMPTY:       '#2a0400',
  TEXT_YELLOW:    '#f8e840',
  TEXT_DIM:       '#8888aa',
};
