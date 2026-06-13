# Plan: Meta-Progression

The game now has a satisfying single-run loop but resets completely between runs. This phase adds persistence: gold that accumulates across runs, between-run upgrade picks, class unlocks, and a localStorage save system.

---

## Overview of the loop

```
Run → Win/Lose → collect gold → pick one upgrade → select class → new run
                                  ↓ (enough gold)
                              unlock new class
```

---

## Step 1 — `meta.js` (new file, loads before screens.js)

Owns all cross-run state and the save/load mechanism.

```js
GS.meta = {
  gold: 0,
  bossKills: 0,
  upgrades: {},           // { upgradeId: level }
  unlockedClasses: { WARRIOR: true, ELF: true, CLERIC: false, WIZARD: false },
};
GS.meta.save = function () { localStorage.setItem('gs_meta', JSON.stringify(GS.meta)); /* exclude methods */ };
GS.meta.load = function () { /* merge localStorage into GS.meta */ };
GS.meta.wipe = function () { localStorage.removeItem('gs_meta'); /* reset to defaults */ };
```

Call `GS.meta.load()` at the top of `main.js` before `GS.screen.init()`.

**Class unlock thresholds** (checked dynamically when rendering/clicking cards):

| Class   | Condition |
|---------|-----------|
| Warrior | Always unlocked |
| Elf     | Always unlocked |
| Cleric  | 200 gold |
| Wizard  | 400 gold + 1 boss kill |

---

## Step 2 — Gold drops and run stats tracking

**`GS.runStats`** (added to `meta.js`, reset each run):
```js
GS.runStats = { gold: 0, kills: 0 };
GS.runStats.reset = function () { this.gold = 0; this.kills = 0; };
```

**Enemy gold values** (in `enemies.js`, when an enemy is spliced out on death):
```
goblin: 5g  |  skeleton: 8g  |  orc: 15g  |  boss: 50g
```

Add to the arrow-collision and melee-kill paths: `GS.runStats.gold += GOLD[e.type]; GS.runStats.kills++;`

**HUD** (`renderer.js` → `drawHUD`): Add a gold counter on the right side of the HUD bar: `⬡ {GS.runStats.gold}`.

---

## Step 3 — Upgrade pool

Defined in `meta.js`. Eight upgrades, each with up to 3 levels:

| ID | Name | Effect per level | Max |
|----|------|-----------------|-----|
| `hp_up` | Iron Constitution | +20 maxHp | 3 |
| `speed_up` | Fleet Foot | +0.3 move speed | 3 |
| `power_up` | Sharp Edge | +1 attack damage | 3 |
| `cooldown` | Swift Strike | −15% attack cooldown | 3 |
| `armor` | Thick Hide | −1 incoming damage (min 1) | 3 |
| `regen` | Vitality | Passive regen every 120 frames | 3 |
| `gold_find` | Fortune | +50% gold per kill | 3 |
| `second_wind` | Second Wind | Revive once per run at 10 HP | 1 |

**Applying upgrades** — in `player.js reset()` and `combat.js`:
- `hp_up`: `player.maxHp += level * 20`
- `speed_up`: `player.speed += level * 0.3`
- `power_up`: add to `cfg.damage` in combat.js dispatch
- `cooldown`: multiply `cfg.cooldown` by `0.85 ^ level`
- `armor`: stored on `GS.meta`, subtracted from incoming damage in `enemies.js` melee hit
- `regen`: override Cleric's regen timer (or add regen to all classes)
- `gold_find`: multiply `GS.runStats.gold` increment
- `second_wind`: flag checked in `main.js` death condition — trigger once

---

## Step 4 — Upgrade pick screen (new phase `'upgrade'`)

**Flow:** win/dead → `'upgrade'` phase (upgrade pick) → `resetGame()`

**When to offer upgrades:**
- Always shown after a run ends (win or loss)
- On loss: offer 2 random upgrades from the pool (consolation)
- On win: offer 3 random upgrades + extra gold bonus

**Rendering** (in `screens.js` → `drawUpgradeScreen`):
- Dark overlay (same style as end screen)
- Header: `"CHOOSE AN UPGRADE"` / remaining gold shown
- 2–3 upgrade cards displayed horizontally, each showing: name, description, current level → next level, cost in gold
- Click to select; deduct gold; call `GS.meta.save()` then `resetGame()`
- "Skip" option if player can't afford anything

**New public methods on `GS.screen`:**
```js
GS.screen.upgrade = function () { phase = 'upgrade'; prepareUpgradeOffers(); };
```

Called from `GS.screen.win()` and `GS.screen.dead()` instead of going directly to the overlay — or, the restart button on the end screen now goes to 'upgrade' first.

---

## Step 5 — Class unlock screen

Add a small "UNLOCK" indicator on locked class cards in the select screen:
- Show lock icon + cost: `"🔒 200g"` / `"🔒 400g + 1 boss"`
- Clicking an unlockable (affordable) locked card attempts purchase: deduct gold → set `GS.meta.unlockedClasses[name] = true` → `GS.meta.save()`
- Cards already check `cls.active`; change that check to `GS.meta.unlockedClasses[cls.name]`

---

## Files to modify / create

| File | Change |
|------|--------|
| `assets/js/meta.js` | **New** — GS.meta, GS.runStats, upgrade definitions, save/load |
| `assets/js/enemies.js` | Drop gold on kill; increment GS.runStats |
| `assets/js/player.js` | Apply upgrade modifiers in `reset()` |
| `assets/js/combat.js` | Apply damage/cooldown upgrades; check second_wind |
| `assets/js/screens.js` | Add `'upgrade'` phase + `drawUpgradeScreen`; class unlock checks; end screen routes to upgrade |
| `assets/js/renderer.js` | Add gold counter to `drawHUD` |
| `assets/js/main.js` | Call `GS.meta.load()` at startup; add `'upgrade'` to loop render dispatch |
| `index.html` | Add `meta.js` before `player.js` |

---

## Verification

1. Start a fresh game — Cleric and Wizard cards should show locked with gold cost
2. Complete a run — upgrade screen appears before restarting
3. Earn 200g total across runs — Cleric unlocks
4. Kill the boss — `bossKills` increments; after reaching 400g + 1 boss kill, Wizard unlocks
5. Select an upgrade — it persists to next run (test HP/speed/damage visibly changed)
6. Refresh the page — `GS.meta.load()` restores gold, upgrades, and class unlocks
7. Second Wind: take lethal damage — should revive at 10 HP once per run
