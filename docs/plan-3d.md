# Plan: 3D Renderer (experiment)

An experiment to give Goblin Steel real 3D graphics with [three.js](https://threejs.org/), keeping the same top-down view and the same game. The 3D version lives alongside the current one at **`/3d/`**. The live game at `/` is untouched until (and unless) the 3D version is promoted.

---

## Guiding rules

- **Production stays safe.** Nothing under `/` changes behaviour. Any edit to shared code is a behaviour-neutral refactor, verified with the existing regression checks before merging.
- **Same game, new renderer.** Player, enemies, combat, map generation, progression, potions, sound and effects state are all shared. The 3D page swaps out only the drawing code.
- **No build step.** Plain files served by Cloudflare Pages, exactly as now. three.js is vendored into the repo as a single pinned ES-module file. There's no bundler, no `npm install`, and no CDN dependency at runtime.
- **Merge as we go.** Each step is a small PR merged into `main` and playable at `/3d/` (and on its Pages preview URL before merging). There's no long-lived branch, so the two versions never drift apart.
- **Easy to scrap.** Abandoning the experiment means deleting `/3d/`, `assets/js/3d/` and `assets/vendor/three/`. The few shared refactors are harmless to keep.
- **iPad Safari is the target device.** Every step is checked for frame rate and correctness on the iPad, not just in desktop Chromium.

---

## Architecture

### Two stacked canvases

```
┌──────────────────────────────┐
│ 2D canvas (#gameCanvas)      │  ← HUD, title/select/upgrade/win screens,
│  transparent where the world │    floating text, hurt flash
│  shows through               │
├──────────────────────────────┤
│ WebGL canvas (#worldCanvas)  │  ← three.js dungeon, characters, lights
└──────────────────────────────┘
```

- The **WebGL canvas** draws the dungeon in 3D, sized to the screen × `devicePixelRatio` (capped at 2) so it's sharp on the iPad.
- The existing **2D canvas** sits on top at its usual 800×600 resolution. In the 3D version, the shared `main.js` loop calls `GS.render(ctx)`, which renders the three.js scene and then clears the 2D canvas and draws the HUD and overlays on it.
- The menus (`screens.js`, about 1,500 lines of canvas drawing) keep working unchanged from day one, because they paint an opaque 2D background over everything. They can be restyled later if the experiment sticks.

### Load order without a bundler

three.js is only distributed as ES modules, while the game uses classic scripts sharing the global `GS` object. On `/3d/index.html`, every script tag gets `defer`, and the 3D renderer is a `<script type="module">`. Deferred classic scripts and module scripts run in document order, so the sequence is preserved:

```
constants … screens   (defer, shared)
hud.js                (defer, shared — see Step 0)
assets/js/3d/renderer3d.js   (module: imports three, defines GS.render)
main.js               (defer, shared — starts the loop last)
```

`renderer.js` (the 2D renderer) is simply not loaded on the 3D page.

### World coordinates

The game works in pixels, with 32 px per tile. The 3D scene uses **1 unit = 1 tile**:

| Game | three.js |
|---|---|
| `x` (px) | `X = x / 32` |
| `y` (px) | `Z = y / 32` |
| — | `Y` = height (floor at 0, walls about 1.2 tall) |

### Camera

A perspective camera high above the player, looking down with a small tilt (about 10–15° from vertical) and a narrow field of view (about 35°). This keeps the classic top-down read while showing the faces and height of walls, which is what makes it look like real 3D rather than flat tiles. The visible area should roughly match today's (about 25 × 18 tiles). Tilt, height and FOV are constants to tune on the iPad.

---

## Step 0 — Scaffolding and shared refactors

**Shared refactors (behaviour-neutral, tested against the 2D game):**

1. **Extract the HUD** from `renderer.js` into `assets/js/hud.js` (`GS.hud.draw(ctx)`), used by both renderers. The 2D page must look identical.
2. **World-to-screen hook:** `GS.toScreen(x, y)` returns screen coordinates for a world position. It defaults to the current 2D camera maths; the 3D renderer overrides it by projecting through the three.js camera. `fx.drawOverlay` (floating "+5g", "+16 HP") uses it, so floating text sits over the right spot in both versions.
3. **Map version counter:** `GS.map.version` increments on `rebuild()`, so the 3D renderer knows when to rebuild the dungeon geometry for a new run.

**New files:**

- `3d/index.html`: the page, with both canvases and deferred scripts. It isn't linked from the main game; you reach it by URL.
- `assets/vendor/three/three.module.min.js`: a pinned release (the latest one at least two weeks old when this step is done), with its MIT licence file.
- `assets/js/3d/renderer3d.js`: creates the WebGL renderer, scene and camera, follows the player, and draws floor and walls as flat-coloured boxes. Just enough to walk around the dungeon in 3D with the existing HUD and menus on top.

**Done when:** you can pick a class, walk the dungeon at `/3d/` on the iPad, and the main game at `/` is unchanged.

---

## Step 1 — The dungeon

- **Walls and floor** as `InstancedMesh`es (about 1,200 tiles, so a handful of draw calls), rebuilt when `GS.map.version` changes.
- **Materials:** procedural textures generated on a canvas at startup, in the spirit of today's art: blue-purple running-bond stone for walls, warm flagstones for the floor. There are no image files. Slight per-tile colour variation, and bevelled wall tops so the shapes catch the light.
- **Lighting:** the player carries the torch, as a warm `PointLight` with the same irregular flicker as today. A very dim cool ambient light means unlit areas fall to near-black. Darkness now comes from real light falloff instead of a painted vignette.
- **Shadows:** off at first. Shadows from a point light are the single most expensive feature on a tablet, so they're tried as a toggle in Step 5.

---

## Step 2 — Characters and enemies

- **Low-poly models built in code** from primitives (boxes, capsules, cones, spheres), one builder per class and enemy type, keeping each one's colours and silhouette: the Warrior's shield, the Elf's bow, the Wizard's hat and staff, goblin ears, the skeleton's ribcage, orc tusks, the boss's crown and mace. Like the rest of the project, no model files.
- **Facing** rotates the model, and **walking** (the existing `frame` / `moving` state) swings the legs and adds a bob.
- **Hit flash** as a brief white emissive glow, driven by the existing `hitFlash` / `hurtFlash` counters.
- *Later option, not in this plan:* swap in free CC0 glTF models (for example from Kenney or Quaternius) via `GLTFLoader`. That would mean adding model files to the repo, so it's a separate decision.

---

## Step 3 — Combat and pickups

- **Projectiles:** arrows as thin shafts and Wizard bolts as glowing orbs. The bolts carry a small point light, capped at a few at once.
- **Melee swing:** a short arc mesh in front of the attacker, using `swingActive` / `swingFacing`.
- **Corpses:** the existing `GS.fx.corpses` drive a flash, squash and fade on the model.
- **Particles:** `GS.fx.particles` drawn as one `InstancedMesh` of small cubes or quads, so the sparks are real 3D debris.
- **Potions:** a small flask model with an emissive glow plus a faint point light, so they're visible in the dark without the 2D glint.
- **Overlays stay 2D:** floating text (via `GS.toScreen`) and the red hurt flash are drawn on the 2D canvas.

---

## Step 4 — Feel

- **Screenshake:** the existing `GS.fx.shakeX/Y` offset moves the 3D camera.
- **Hit-stop, sound and music** need no changes, since they're shared.
- **Boss lighting:** the boss room gets a dim red light, and the boss's eyes glow (emissive).
- **Camera tuning:** height, tilt and FOV adjusted on the iPad for readability.

---

## Step 5 — Performance pass (iPad)

- An FPS and draw-call readout at `/3d/?debug`.
- Rendering-resolution cap (`devicePixelRatio` 1.5 vs 2) and a shadows on/off comparison, measured on the iPad.
- Pause rendering of off-screen enemies and particles if needed.
- Target: a steady 60 fps on the iPad during a busy fight.

---

## Step 6 — Decision point

1. **Keep going:** restyle the menus to match, consider glTF models, and so on.
2. **Promote:** make the 3D version the default at `/`, and either keep the 2D one at `/classic/` or retire it.
3. **Scrap:** delete the 3D files. The shared refactors from Step 0 can stay.

---

## Files

| File | Change |
|------|--------|
| `assets/js/hud.js` | **New (shared):** HUD drawing extracted from `renderer.js` |
| `assets/js/renderer.js` | Use `GS.hud.draw`; provide the default `GS.toScreen` |
| `assets/js/fx.js` | Floating text positioned via `GS.toScreen` |
| `assets/js/map.js` | `GS.map.version` counter |
| `index.html` | Load `hud.js` |
| `3d/index.html` | **New:** 3D page with stacked canvases and deferred scripts |
| `assets/js/3d/renderer3d.js` | **New:** three.js renderer (dungeon, models, lights, effects) |
| `assets/js/3d/models.js` | **New (Step 2):** procedural character and enemy builders |
| `assets/vendor/three/` | **New:** pinned `three.module.min.js` and its `LICENSE` |

---

## Risks

- **iPad performance:** the main unknown. Mitigated by measuring from Step 0 onwards, instancing everything, keeping lights few, and leaving shadows off by default.
- **Safari WebGL quirks:** Safari supports WebGL2, but behaviour around canvas sizing, `devicePixelRatio` and context loss after backgrounding needs checking on the device. A lost context should rebuild the scene rather than leave a black screen.
- **Load order:** relies on `defer` and module scripts running in document order. A wrong order shows up immediately as a blank page, which makes it easy to catch.
- **Download size:** three.js minified is several hundred KB, loaded only by `/3d/`. Fine for this project.

---

## Verification (every step)

1. `/` behaves exactly as before: the existing regression checks (damage, armour, gold, effects, sound triggers) pass in headless Chromium, and the 2D game screenshots are unchanged.
2. `/3d/` loads with no console errors in headless Chromium (WebGL via SwiftShader), with screenshots of the new visuals in each PR.
3. A full run on `/3d/` works end to end: select a class, fight, pick up a potion, kill the boss, win, buy an upgrade, start a new run (the dungeon rebuilds).
4. On the iPad, via the PR's Pages preview URL: correct visuals and a smooth frame rate.
