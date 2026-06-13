# Plan: Expand the World

The game now has a single hand-coded 40×30 dungeon and one enemy type. This plan makes the world feel larger and more varied: a procedurally generated map each run, two new enemy types (skeleton and orc), and a boss encounter at the dungeon's end.

---

## Step 1 — Procedural map generation

**What to change:** Replace the explicit `fill()` calls inside `buildDungeon()` in `map.js` with a room-placement algorithm. The public API (`GS.map.data`, `getTile`, `isWall`) is unchanged, so the rest of the codebase requires no edits.

**Suggested algorithm — random room placement:**
1. Start with a grid full of walls.
2. Attempt to place N rectangular rooms (e.g. 6–10) at random positions, rejecting any that overlap.
3. Sort placed rooms by centre-x (left→right) and connect each consecutive pair with an L-shaped corridor (horizontal then vertical, or vice versa, chosen randomly).
4. Mark one room as the **spawn room** (smallest or top-left) — the player starts there with no enemies.
5. Mark one room as the **boss room** (largest or farthest from spawn).
6. Return the generated grid.

**Spawn positions:** After generation, dynamically pick floor tiles for enemy spawns instead of hardcoding coordinates. A simple approach: for each non-spawn, non-boss room, randomly pick 2–3 floor tiles that are ≥ 3 tiles from any wall.

**Files:** `map.js` only. Constants (`MAP_COLS`, `MAP_ROWS`) stay at 40×30.

**Player start:** `player.js` currently starts at `(5.5 * T, 5.0 * T)`. After generation, `map.js` should expose `GS.map.spawnPos` (tile coords) so `player.reset()` reads from it.

---

## Step 2 — Multiple enemy types

**Refactor `goblins.js` → `enemies.js`**

Add a `type` field to each enemy object and parameterise AI constants by type.

| Type     | HP | Speed | Aggro | Melee dmg | Behaviour |
|----------|----|-------|-------|-----------|-----------|
| Goblin   | 3  | 1.4   | 155   | 1         | Patrol + chase |
| Skeleton | 5  | 1.8   | 200   | 1         | Chase only (no patrol) |
| Orc      | 8  | 0.9   | 130   | 3         | Patrol + charge (short burst sprint to player) |

A `ENEMY_CFG` lookup object maps type → constants. `makeEnemy(type, col, row)` replaces `makeGoblin`. The main update loop (`GS.enemies.update`) dispatches behaviour by `e.type`.

**Rename** `GS.goblins` → `GS.enemies` everywhere (map.js spawn logic, main.js win check, renderer, combat.js melee targeting, arrow collision).

---

## Step 3 — New enemy sprites

Rename `drawGoblins()` → `drawEnemies()` in `renderer.js`. Inside the loop, dispatch to type-specific draw functions:

```
switch (e.type) {
  case 'goblin':   drawGoblinSprite(ctx, e);   break;
  case 'skeleton': drawSkeletonSprite(ctx, e); break;
  case 'orc':      drawOrcSprite(ctx, e);      break;
  case 'boss':     drawBossSprite(ctx, e);     break;
}
```

Extract the existing goblin draw code into `drawGoblinSprite`. Add two new canvas-primitive sprites:

- **Skeleton:** White/grey bone body, hollow eye sockets, carrying a rusty sword — no skin fill, visible rib structure drawn with `fillRect`.
- **Orc:** Larger oval body (scale ~1.3× goblin), darker green, tusks, wielding a two-handed axe.

The generic hit-flash, shadow, and health bar code already sits outside the sprite call and doesn't need to change.

---

## Step 4 — Boss encounter

**Placement:** `buildDungeon()` designates the boss room. `enemies.js` places a single boss enemy in that room.

**Boss stats:**
- HP: 25, maxHp: 25
- AGGRO_RANGE: 220 (sees farther, no patrol)
- CHASE_SPEED: 1.1
- MELEE_DAMAGE: 4, MELEE_RANGE: 20, MELEE_CD: 40 frames

**Sprite:** Render at 1.5× scale via `ctx.scale(1.5, 1.5)` applied before calling a `drawBossSprite` (a goblin variant with horns, crown, and a heavier club). Health bar is wider (32px) and visible always (not just when damaged).

**Win condition tweak:** Victory triggers only when the boss is dead, not when all enemies are cleared. Add a `boss` flag to the enemy object. In `main.js`: `GS.enemies.some(e => e.boss) === false → win`.

---

## Files to modify

| File | Change |
|------|--------|
| `assets/js/map.js` | Replace `buildDungeon()` with procedural algorithm; expose `GS.map.spawnPos` and `GS.map.bossRoom` |
| `assets/js/goblins.js` → `enemies.js` | Rename; add `type` field; `ENEMY_CFG` table; new `makeEnemy()`; add Orc charge behaviour |
| `assets/js/renderer.js` | Rename `drawGoblins` → `drawEnemies`; add `drawSkeletonSprite`, `drawOrcSprite`, `drawBossSprite` |
| `assets/js/player.js` | Read `GS.map.spawnPos` in `reset()` |
| `assets/js/main.js` | Update `GS.goblins` → `GS.enemies`; update win condition to check boss flag |
| `assets/js/combat.js` | Update `GS.goblins` → `GS.enemies` for melee targeting |
| `index.html` | Rename script tag from `goblins.js` to `enemies.js` |

---

## Verification

1. Reload — confirm a new dungeon layout each time (rooms differ)
2. Walk into each room — confirm correct enemy types spawn (goblins in early rooms, orc in mid, skeleton in far)
3. Find boss room — confirm boss has visible health bar, aggros immediately, deals heavy damage
4. Kill all non-boss enemies — confirm no win screen yet
5. Kill boss — confirm win screen appears
6. Play Again — confirm a new map is generated (layout different from previous run)
