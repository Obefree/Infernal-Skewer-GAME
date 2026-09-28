# Infernal Skewer GAME

Browser prototype of a competitive hell-kitchen arena game.

## High concept

The skewer is simultaneously:

1. your melee weapon;
2. your visible inventory;
3. the recipe you are building.

Stab living ingredients to put them directly onto the skewer. The base skewer has **8 slots**. Meat comes from the shared **Mega Hog**: bait its charge into an arena wall, stab it while stunned, then bring a correct recipe to the **Infernal Grill**.

## Current browser build — v0.4

### Core

- Three.js/WebGL 3D arena;
- base skewer capacity: **8 ingredients**;
- long forward-facing pointed skewer model in FPS;
- living onion / tomato / cheese / pepper / mushroom ingredients;
- after successful harvest the ingredient creature disappears;
- harvested ingredient creature respawns after a random **3–6 seconds** at a new arena position;
- Mega Hog charge → wall crash → stun → meat harvest loop;
- Infernal Grill and exact-order recipes;
- Rival Chef bot with its own visible skewer and score;
- precision steal of the Rival Chef's exposed ingredient;
- knocked-off / manually dropped food becomes a physical world object;
- dropped food remains contestable and can be re-skewered.

### FPS mode — `index.html`

Desktop controls:

| Input | Action |
|---|---|
| Mouse | Look |
| WASD | Move |
| Space | Jump |
| Shift | Sprint |
| LMB | Thrust / harvest / precision steal |
| Q | Drop the exposed last ingredient |
| E | Use / deliver at grill |
| Esc | Release mouse |

Mobile FPS controls:

- landscape/fullscreen is requested when supported;
- left virtual stick — move;
- right half of the screen — swipe to look;
- `STAB` — thrust;
- `JUMP` — jump;
- `DROP` — drop exposed last ingredient;
- `USE` — contextual use / grill.

### Top-down touch demo — `topdown.html`

Experimental second control model for comparison:

- camera above the arena;
- **right thumb** virtual stick sets movement direction;
- **left thumb** action cluster:
  - `STAB`;
  - `DROP`;
  - `USE`;
- player turns toward the movement vector;
- same 8-slot skewer concept;
- ingredient disappearance + delayed random respawn;
- Mega Hog and Infernal Grill included;
- desktop fallback: WASD / Space / Q / E.

## Run locally

Because the build uses ES modules, serve the repository over HTTP:

```bash
python3 -m http.server 8080
```

Then open:

- `http://localhost:8080/` — FPS mode;
- `http://localhost:8080/topdown.html` — top-down demo.

The static root can also be hosted on GitHub Pages, Vercel, Netlify or RawGitHack.

## Core design rules

- Standard skewer capacity is **8 ingredients**.
- A ninth ingredient is rejected for now.
- PvP should alter recipe state rather than become a normal deathmatch.
- Standard punishment should affect at most one ingredient.
- The exposed last ingredient is the default steal / knock-off / manual-drop target.
- Harvest sources should not be infinitely farmable in one fixed position.
- Dropped food remains contestable rather than being deleted.
- Combat, harvesting, inventory and recipe-building stay in one continuous loop.

## Next prototype pass

1. compare FPS vs top-down readability and control comfort;
2. shoulder dash / bump;
3. skewer-vs-skewer clash when both attacks meet;
4. short vulnerable cooking timer at the Infernal Grill;
5. stronger Rival Chef combat telegraph / thrust animation;
6. 5–6 minute match timer and win state;
7. first real multiplayer networking test after these interactions feel good.
