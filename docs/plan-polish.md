# Plan: Polish and Juice

The game is complete as a roguelite loop: pick a class, clear a procedural dungeon, kill the boss, spend gold, repeat. But it's silent, and most actions have little feedback. Enemies vanish the instant they die, the player gets no signal when they take damage, and the torchlight is static even though the README promises a "dark, flickering aesthetic". This phase makes the game *feel* finished without changing any rules or balance.

All effects stay in the project's no-assets style: sounds are synthesised with the Web Audio API and particles are canvas primitives. No new files beyond JavaScript.

---

## Guiding rules

- **No gameplay changes.** Damage, speed, cooldowns and HP stay exactly as they are. Effects are triggered by game events; they never alter them.
- **One hook per event.** Game code calls `GS.fx.*` / `GS.sfx.play()` at the moment something happens. The effect modules own all timing, pooling and drawing.
- **Cheap and capped.** Particle pool has a hard cap; repeated sounds are throttled so a crowd of enemies can't produce a wall of noise.
- **Respect the player.** Mute toggle (persisted), and screenshake is disabled when the OS reports `prefers-reduced-motion`.

---

## Step 1 — Consolidate enemy damage (prep refactor)

Enemy damage is currently applied in two places with duplicated code: the arrow-collision loop in `enemies.js` and `_meleeAttack()` in `combat.js`. Both do `hp -= dmg; hitFlash = 10; state = 'aggro'; if (hp <= 0) kill(i)`.

Add a single entry point in `enemies.js`:

```js
GS.enemies.damage = function (idx, amount) {
  const e = GS.enemies[idx];
  e.hp      -= amount;
  e.hitFlash = 10;
  e.state    = 'aggro';
  if (e.hp <= 0) GS.enemies.kill(idx);
  // Step 2/3 hooks go here and in kill()
};
```

Both call sites switch to `GS.enemies.damage(i, dmg)`. Behaviour is identical. This gives exactly two hook points for all combat feedback: `damage()` and `kill()`.

Likewise, player damage happens on one line in `enemies.js` (the enemy melee branch). Wrap it in a small `hurtPlayer(amount)` helper in the same file so it can carry hooks too.

---

## Step 2 — `fx.js`: particles, screenshake, hit-stop (new file)

Owns all visual juice. Loaded after `meta.js`, before `screens.js`.

```js
GS.fx = {
  particles: [],      // { x, y, vx, vy, life, maxLife, size, col, gravity }
  texts:     [],      // floating text: { x, y, vy, life, str, col }
  shakeMag:  0,       // current shake magnitude in px, decays each frame
  hitStop:   0,       // frames to freeze gameplay
  hurtFlash: 0,       // frames of red screen-edge pulse
};
GS.fx.burst(x, y, col, count, speed);   // radial spark burst
GS.fx.text(x, y, str, col);             // floating "+5g" etc.
GS.fx.shake(mag);                       // shakeMag = max(shakeMag, mag)
GS.fx.freeze(frames);                   // hitStop = max(hitStop, frames)
GS.fx.update();                         // advance + cull; decay shake
GS.fx.reset();                          // called from resetGame()
```

**Pool cap:** 300 particles; when full, overwrite the oldest. Each particle lives 15–35 frames, shrinks and fades with remaining life.

**Event → effect table:**

| Event (hook site) | Effect |
|---|---|
| Enemy hit (`enemies.damage`) | 6-spark burst in the enemy's colour; shake 1.5 |
| Enemy killed (`enemies.kill`) | 16-spark burst + dust puff; floating `+Ng` gold text; shake 3; hit-stop 3 frames |
| Boss killed | 60-spark burst in gold/red; shake 10; hit-stop 12 frames |
| Projectile hits wall (`arrows.update`) | 3 small grey sparks at impact point |
| Player hurt (`hurtPlayer`) | shake 4; `hurtFlash = 18` |
| Melee swing (`combat._meleeAttack`) | none (the existing swing arc is enough) |

Enemy colours for bursts: goblin green, skeleton bone-white, orc dark olive, boss red. Take them from the existing sprite palette in `renderer.js`.

**Screenshake:** in `camera.js`, after clamping, add a random offset of ±`shakeMag` px to `GS.camera.x/y`. The HUD is drawn at fixed coordinates, so it stays steady automatically. `shakeMag` decays ×0.85 per frame and snaps to 0 below 0.3. Skip the offset entirely when `matchMedia('(prefers-reduced-motion: reduce)').matches`.

**Hit-stop:** in `main.js` `update()`, if `GS.fx.hitStop > 0`, decrement it, run `GS.fx.update()` and return before the gameplay updates. Rendering continues, so the frozen frame stays on screen with its sparks.

**Rendering** (`renderer.js`): add `drawFx(ctx)` between `drawArrows` and `drawLighting`, so particles are darkened by the vignette like everything else. Floating text and the hurt flash go after `drawLighting`, before `drawHUD`, so they stay readable. The hurt flash is a red radial gradient on the screen edges at `alpha = hurtFlash / 18 * 0.45`.

---

## Step 3 — `audio.js`: synthesised sound effects (new file)

Owns the `AudioContext`, a master gain and every sound. Loaded right after `input.js`.

```js
GS.sfx = {
  muted: false,
  play(name),         // no-op if muted or context not started
  unlock(),           // create/resume AudioContext — call on first user gesture
  toggleMute(),       // flips + persists to localStorage 'gs_settings'
};
```

**Starting audio:** browsers block audio until a user gesture. The first click on the title/select screen already happens before any gameplay, so call `GS.sfx.unlock()` at the top of `handleClick` in `screens.js` and from the keydown listener in `audio.js`.

**Signal chain:** each sound → its own `GainNode` envelope → master gain (0.35) → `DynamicsCompressor` → destination. The compressor keeps overlapping sounds from clipping.

> *As built:* the compressor was dropped. Chromium's `DynamicsCompressor` cut short sounds to about a third of their level even when tuned as a limiter, so the chain is envelope → master gain (0.6) → destination, with per-sound volumes chosen so the busiest overlap stays under clipping. Safari on iPadOS also needed extra unlock handling (see PR #6).

**Mute:** `M` key toggles. Stored in a separate `gs_settings` key so `GS.meta.wipe()` (not yet exposed in the UI) won't reset it. Show a small speaker / crossed-speaker glyph in the HUD just left of the gold counter.

**Throttle:** each sound name has a minimum gap (e.g. `enemyHit` 4 frames, `step` 10). Calls inside the gap are dropped.

**Sound list** (all short, built from oscillators + a shared 1-second white-noise buffer):

| Name | Trigger | Recipe |
|---|---|---|
| `bow` | Elf fires | Triangle 700→280 Hz, 90 ms, fast attack |
| `bolt` | Wizard fires | Sine 500→1200 Hz sweep with 30 Hz vibrato, 180 ms |
| `swing` | Warrior/Cleric attack | Noise through bandpass 1.8 kHz (Cleric: 2.6 kHz), 70 ms |
| `enemyHit` | `enemies.damage` | Square 180 Hz, 45 ms + noise click |
| `enemyDie` | `enemies.kill` | Noise through lowpass sweeping 2 kHz→150 Hz, 220 ms |
| `bossDie` | boss kill | `enemyDie` ×3 staggered + sine 110→40 Hz rumble, 900 ms |
| `coin` | gold awarded | Two sine blips B5 → E6, 50 ms each |
| `hurt` | `hurtPlayer` | Sawtooth 220→90 Hz, 140 ms |
| `wallTap` | projectile hits wall | Noise, highpass 3 kHz, 25 ms, quiet |
| `uiClick` | any menu button | Square 1 kHz, 25 ms |
| `unlock` | upgrade bought / class unlocked | Rising arpeggio C5-E5-G5-C6, 60 ms per note |
| `win` | `GS.screen.win()` | Fanfare: C-E-G-C' then held C' chord, ~1.2 s |
| `death` | `GS.screen.dead()` | Descending minor line A4-F4-D4-A3, ~1 s |
| `revive` | Second Wind triggers | Reverse of `hurt` + `unlock` arpeggio |

Fire sounds are triggered from `combat.update()` next to the existing `GS.arrows.fire` / `_meleeAttack` calls, keyed on class.

---

## Step 4 — Animation and atmosphere

**Enemy walk cycle:** enemies currently have no animation frames. Add `frame` / `frameTimer` to each enemy in `makeEnemy()`, toggled every 10 frames while the enemy moved this tick (the same pattern as `player.js`). In each `draw*Sprite` in `renderer.js`, use the frame for a 1 px vertical bob plus alternating foot positions. This needs no new art, just offsets on the existing primitives.

**Death animation:** instead of disappearing from `GS.enemies` instantly, `kill()` pushes a lightweight corpse record `{ type, x, y, facing, life: 20 }` to `GS.fx.corpses`. The renderer draws the enemy's normal sprite with `globalAlpha = life / 20`, squashed vertically and tinted white for the first 4 frames. Corpses don't collide or count as enemies, so the win check in `main.js` is unaffected.

**Torch flicker:** in `drawLighting`, modulate the inner and outer darkness radii and the warm-glow alpha with a cheap smoothed noise: sum two sines at unrelated frequencies plus a small random jitter, ±6% radius. This delivers the "flickering" look the README describes.

**Player hit flash:** the hurt flash in Step 2 covers the screen edges. Also draw the player sprite with a white silhouette for 6 frames (same technique as the enemy `hitFlash`), driven by a `GS.player.hurtFlash` counter set in `hurtPlayer`.

**HP bar easing:** in `drawHUD`, keep a `displayHp` that lerps toward `p.hp`, and draw the lost portion as a pale "damage trail" segment that drains over ~20 frames.

---

## Step 5 — Music (optional, last)

A small procedural loop, kept deliberately modest:

- **Drone:** two detuned sawtooth oscillators on D2 through a lowpass at 400 Hz, at very low gain.
- **Arpeggio:** D-minor pattern (D-F-A-C) on a square wave, one note per 8th at 100 BPM, scheduled with a 100 ms look-ahead timer (the standard Web Audio scheduling pattern, not `setInterval` per note).
- **Boss state:** when any boss enemy is in `'aggro'`, raise the tempo to 130 BPM and open the drone filter to 900 Hz.
- Music plays only in the `'game'` phase and fades out over 500 ms on win/death. `M` mutes music and SFX together.

If this step turns out to be noisy or distracting in practice, ship Steps 1–4 without it.

---

## Files to modify / create

| File | Change |
|------|--------|
| `assets/js/fx.js` | **New**: particles, floating text, shake, hit-stop, hurt flash, corpses |
| `assets/js/audio.js` | **New**: AudioContext, SFX recipes, throttle, mute + persistence, music (Step 5) |
| `assets/js/enemies.js` | Add `GS.enemies.damage()` and `hurtPlayer()`; fx/sfx hooks in `damage`/`kill`; walk-frame counters |
| `assets/js/combat.js` | Use `GS.enemies.damage()`; fire-sound hooks per class |
| `assets/js/arrows.js` | Wall-impact sparks + `wallTap` |
| `assets/js/camera.js` | Apply shake offset (skip under reduced motion) |
| `assets/js/renderer.js` | `drawFx`, corpses, hurt flash, enemy walk bob, torch flicker, HP trail, mute glyph |
| `assets/js/screens.js` | `GS.sfx.unlock()` on first click; UI/unlock/win/death sounds; `GS.fx.reset()` in `resetGame()` |
| `assets/js/main.js` | Hit-stop early-out; `GS.fx.update()`; Second Wind `revive` effect |
| `index.html` | Add `audio.js` after `input.js`, and `fx.js` after `meta.js` |
| `README.md` | Add `M` (mute) to the controls table |

---

## Verification

1. **No regressions:** start a run with each class. Damage dealt, damage taken, gold per kill and cooldowns match the values before this phase (compare `GS.runStats` after killing a known enemy).
2. **Audio unlock:** load the page with sound on. Nothing plays and no console warning appears until the first click; after that, the UI click sound plays.
3. **Each SFX:** fire as every class, hit and kill each enemy type, take damage, buy an upgrade, win and die. Each sound in the table plays once per event.
4. **Throttle:** stand in a crowd with the Warrior and attack repeatedly. Audio stays clean, with no clipping or stacked volume.
5. **Mute:** press `M` and the HUD glyph changes. Reload the page: still muted. Run `GS.meta.wipe()` in the console and reload: still muted.
6. **Shake and hit-stop:** a kill produces a brief freeze and a shake, and the HUD does not move. With reduced motion enabled in the OS, there's no shake, but the freeze and particles remain.
7. **Corpses:** killing the boss shows its fade-out and still triggers the win screen at the same moment as before.
8. **Performance:** with 300 particles active, the game holds 60 fps in Chrome and Safari (check with DevTools performance panel).
9. **Restart hygiene:** after win/death and starting a new run, there are no leftover particles, corpses, shake or music from the previous run.
