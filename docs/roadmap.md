# GoblinSteel — Roadmap

Five broad directions for taking the project forward, roughly in order of priority:

1. **Deepen the existing loop** — Add the three missing classes (Warrior, Cleric, Wizard), a win/loss condition, and loot drops. ✅ *Complete — see [plan-deepen-loop.md](plan-deepen-loop.md).*

2. **Expand the world** — Procedural map generation, more enemy types beyond goblins, boss encounters. ✅ *Complete — see [plan-expand-world.md](plan-expand-world.md).*

3. **Add progression / meta-game** — Between-run upgrades, save system, unlockable classes. Shifts it toward a roguelite. ✅ *Complete — see [plan-progression.md](plan-progression.md).*

4. **Polish and juice** — Sound/music (Web Audio API), particle effects on hits, screenshake, more animation frames. The visual identity is already strong; this makes it feel finished. ✅ *Complete — see [plan-polish.md](plan-polish.md).*

5. **Multiplayer** — WebSockets for co-op or PvP. Large technical lift; the global `GS` state architecture would need a rework.

6. **3D renderer (experiment)** — Real 3D graphics with three.js, keeping the top-down view, built alongside the current game at `/3d/` until it's promoted or scrapped. 📝 *Planned — see [plan-3d.md](plan-3d.md).*
