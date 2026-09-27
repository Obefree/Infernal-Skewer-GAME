# Infernal Skewer GAME

Early browser prototype of a competitive hell-kitchen arena game.

## High concept

The skewer is simultaneously:

1. your melee weapon;
2. your visible inventory;
3. the recipe you are building.

Stab living ingredients to put them directly onto the skewer. The base skewer has **8 slots**. Meat comes from the shared **Mega Hog**: bait its charge into an arena wall, stab it while stunned, then bring a correct recipe to the **Infernal Grill**.

## Current browser build

Implemented now:

- real 3D scene with Three.js/WebGL;
- FPS mouse look / pointer lock;
- `WASD` movement;
- `Space` jump;
- `Shift` sprint;
- `LMB` skewer thrust;
- `E` recipe delivery near the Infernal Grill;
- 8 visible skewer slots;
- living onion / tomato / cheese / pepper / mushroom ingredients;
- Mega Hog charge → wall crash → stun → meat harvest loop;
- three exact-order recipes and score;
- no HP/death loop yet.

## Run

Because the build uses ES modules, run it from a local web server instead of opening `index.html` directly:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

The root is also suitable for simple static hosting (GitHub Pages, Vercel, Netlify, RawGitHack, etc.).

## Controls

| Input | Action |
|---|---|
| Mouse | Look |
| WASD | Move |
| Space | Jump |
| Shift | Sprint |
| LMB | Thrust / harvest |
| E | Deliver recipe at grill |
| Esc | Release mouse |

## Core design rules

- Standard skewer capacity is **8 ingredients**.
- A ninth ingredient is rejected for now; overflow behavior will be tested later.
- PvP should alter recipe state, not become a normal deathmatch.
- Standard hits should remove at most one ingredient.
- Combat, harvesting, inventory and recipe-building should stay in one continuous loop.

## Next prototype pass

- physical dropped ingredients;
- second player / bot with its own visible skewer;
- precision steal of the exposed tip ingredient;
- shoulder dash / bump;
- skewer clash;
- vulnerable grill cooking timer;
- first multiplayer test after the solo core feels good.
