# Plan: Deepen the Existing Loop

The game's core loop (explore → encounter → fight) works for the Elf class, but three of four classes are placeholders and there's no win/loss condition. The goal is to make this a completable game without changing the genre or scope.

## Steps

### 1. Wire the selected class into game state

**Problem:** After the character select fade, `selectedClass` (local var in screens.js) is thrown away. The game hardcodes `name: 'Elf'` in player.js.

**Fix:**
- In `screens.js`, write the chosen class index to `GS.selectedClass` before transitioning to `'game'`
- In `player.js` init, read `GS.selectedClass` to set name, HP, and stats from the `CLASSES` array

### 2. Create `assets/js/combat.js` — class-aware attack dispatch

Currently arrows.js fires unconditionally regardless of class. Introduce a dispatcher:

```js
GS.combat = {
  executeAttack(player) { ... dispatch by class ... }
}
```

Each class entry defines: `type` (melee/ranged/magic), `cooldown`, `range`/`speed`, and an `attack()` function.

Replace the raw `GS.arrows.fire()` calls in the game loop with `GS.combat.executeAttack(GS.player)`.

### 3. Implement the three missing classes

| Class   | Attack type | Mechanic |
|---------|-------------|----------|
| Warrior | Melee       | Instant damage to goblins within ~22px in facing direction; cooldown ~30 frames; high HP (120) |
| Cleric  | Hybrid      | Melee smite + passive slow HP regen (~1 HP every 180 frames) |
| Wizard  | Ranged      | Slower magic bolt (speed 5) that deals 2 HP (vs arrow's 1); cooldown ~40 frames |

**Melee collision** (Warrior/Cleric): add `doMeleeAttack()` in combat.js that checks goblins for proximity + facing direction. Reuse the existing HP/hit-flash logic in goblins.js.

**Sprites:** Add `drawWarrior()`, `drawCleric()`, `drawWizard()` to `renderer.js` in the same canvas-primitive style as `drawElf()`. Switch on `GS.player.classIndex` in the render call.

### 4. Add win and loss conditions

- **Win:** `GS.goblins.length === 0` → new `'win'` phase in screens.js
- **Loss:** `GS.player.hp <= 0` → new `'dead'` phase

Both screens offer a "Play Again" button that resets state and returns to `'title'`.

### 5. (Optional) Loot drops

When a goblin dies in goblins.js, drop a health potion pickup (small red cross on the floor). Store drops on `GS`, render in renderer.js, pick up on player collision for ~15 HP restore.

---

## Files to modify

| File | Change |
|------|--------|
| `assets/js/screens.js` | Write `GS.selectedClass` on transition; add `'win'` and `'dead'` phases |
| `assets/js/player.js` | Read class from `GS.selectedClass` on init; add `attackCooldown` field |
| `assets/js/goblins.js` | Expose hit logic for melee; add loot drop on death (optional) |
| `assets/js/renderer.js` | Add `drawWarrior/Cleric/Wizard`; switch on classIndex; render loot (optional) |
| `assets/js/arrows.js` | Replace direct fire call with `GS.combat.executeAttack()` |
| `assets/js/main.js` | Call `GS.combat` update each frame; handle new screen phases |
| `index.html` | Add `<script src="assets/js/combat.js">` before main.js |

**New file:** `assets/js/combat.js`

---

## Verification

1. Open `index.html` in a browser
2. Select each of the four classes — confirm correct sprite and attack behaviour
3. Kill all 9 goblins → win screen appears
4. Let goblins reduce HP to 0 → death screen appears
5. Click "Play Again" → clean reset to title
