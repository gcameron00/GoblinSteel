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

// Colour palette — retro dungeon
GS.C = {
  BG:           '#000000',
  FLOOR:        '#1a120a',
  FLOOR_ALT:    '#1e150c',
  WALL:         '#0d0d1f',
  WALL_EDGE:    '#2a2a4a',
  HUD_BG:       '#050510',
  HUD_BORDER:   '#3a3a6a',
  HP_FULL:      '#cc2200',
  HP_EMPTY:     '#2a0500',
  TEXT_YELLOW:  '#f0e040',
  TEXT_DIM:     '#888866',
};
