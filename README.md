# Goblin Steel

> *Delve deep. Strike fast. Claim the hoard.*

---

## Overview

**Goblin Steel** is a browser-based fantasy dungeon explorer with a retro arcade aesthetic inspired by the golden age of 1980s coin-op gaming. Navigate treacherous dungeons from a top-down perspective as the camera scrolls to keep pace with the action, plunging ever deeper in search of goblin hordes and forgotten treasure.

---

## Gameplay

Players explore procedurally generated dungeons viewed from above, with the viewport following the player character through torch-lit corridors and cavernous chambers. Combat is fast and direct, rewarding positioning and resource management.

### Core Loop

- **Explore** — Navigate dungeon rooms and corridors, revealing the map as you go
- **Fight** — Engage goblin hordes that patrol and swarm in unpredictable waves
- **Loot** — Discover treasure scattered throughout the dungeon depths
- **Survive** — Manage health and abilities to push as deep as possible

---

### Runs and Progression

Each run generates a fresh dungeon populated by goblins, skeletons, orcs and a boss. Slay the boss to win the run. Gold earned from kills is kept between runs and can be spent on permanent upgrades or on unlocking new classes. Progress is saved in your browser.

---

## Controls

| Action | Keys |
|---|---|
| Move | WASD or arrow keys |
| Attack | Space or Z |
| Menus | Mouse |

---

## Character Classes

At the start of a run, players choose one of four classic archetypes. Each brings a distinct playstyle defined by their attributes and weaponry. The Warrior and Elf are available from the start; the Cleric costs 200 gold to unlock, and the Wizard costs 400 gold and requires at least one boss kill.

| Class | Strengths | Weapon |
|---|---|---|
| **Warrior** | High health, strong melee | Sword & shield |
| **Elf** | Agile, ranged attacks | Longbow |
| **Cleric** | Healing, undead resistance | Mace & holy symbol |
| **Wizard** | Powerful spells, fragile | Staff & spellbook |

---

## Visual Style

The game draws on the visual language of 1980s arcade games — chunky sprites, bold colours, and screen-filling action — while establishing its own identity rather than recreating any specific title. Expect:

- Pixel art characters and environments
- Atmospheric dungeon tilesets
- Animated combat effects
- A dark, flickering aesthetic that evokes candlelit stone corridors

---

## Technology

Goblin Steel is a web application playable in any modern browser, with no installation required. It is written in plain JavaScript with no dependencies or build step, and all graphics are drawn directly on an HTML canvas.

### Running locally

Scripts are loaded from root-relative paths, so the game must be served over HTTP rather than opened as a file. From the repository root:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

---

## Project Goals

- Deliver a complete, replayable dungeon crawl experience in the browser
- Capture the immediacy and tension of classic arcade action
- Provide four meaningfully different play experiences through class selection
- Keep the scope tight: one dungeon, four classes, endless replayability

---

## Status

Playable. The core loop, procedural dungeons, multiple enemy types with a boss, and between-run progression are complete. Next up is polish: sound, hit effects and screenshake. See [docs/roadmap.md](docs/roadmap.md).
