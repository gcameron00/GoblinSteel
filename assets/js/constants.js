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
  FLOOR:        '#1c1208',
  FLOOR_ALT:    '#18100a',
  WALL:         '#0a0a1a',
  WALL_MORTAR:  '#18183a',
  WALL_EDGE:    '#2a2a4a',
  WALL_FACE:    '#241a38',  // south-facing wall surface
  WALL_FACE2:   '#301e48',  // bottom edge of wall face
  HUD_BG:       '#050510',
  HUD_BORDER:   '#3a3a6a',
  HP_FULL:      '#cc2200',
  HP_EMPTY:     '#2a0500',
  TEXT_YELLOW:  '#f0e040',
  TEXT_DIM:     '#888866',
};
