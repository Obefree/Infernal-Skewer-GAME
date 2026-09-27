# Infernal Skewer GAME

Early browser prototype of a competitive hell-kitchen arena game.

## High concept

The skewer is simultaneously:

1. your melee weapon;
2. your visible inventory;
3. the recipe you are building.

Stab living ingredients to put them directly onto the skewer. The base skewer has **8 slots**. Meat comes from the shared **Mega Hog**: bait its charge into an arena wall, stab it while stunned, then bring a correct recipe to the **Infernal Grill**.

## Current browser build — v0.3

Implemented now:

- real 3D scene with Three.js/WebGL;
- FPS mouse look / pointer lock;
- `WASD` movement;
- `Space` jump;
- `Shift` sprint;
- `LMB` skewer thrust;
- `E` recipe delivery near the Infernal Grill;
- 8 visible player skewer slots;
- living onion / tomato / cheese / pepper / mushroom ingredients;
- Mega Hog charge → wall crash → stun → meat harvest loop;
- Mega Hog can target either the player or the Rival Chef;
- three exact-order recipes and score;
- **Rival Chef bot** with its own visible skewer and score;
- bot chooses a recipe, hunts required ingredients, uses stunned Mega Hog and delivers at the grill;
- bot can target the player when the exposed player ingredient is exactly what its recipe needs;
- **precision steal**: stab the exposed last ingredient on the Rival Chef's skewer to transfer it to your own skewer;
- normal body hit staggers the rival but does not magically steal food;
- knocked-off ingredients become physical world objects instead of disappearing;
- dropped ingredients bounce, remain on the floor temporarily and can be re-skewered by either side;
- Hog and Rival Chef can knock the player's last ingredient onto the floor;
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
| LMB | Thrust / harvest / precision steal |
| E | Deliver recipe at grill |
| Esc | Release mouse |

## Core design rules

- Standard skewer capacity is **8 ingredients**.
- A ninth ingredient is rejected for now; overflow behavior will be tested later.
- PvP should alter recipe state, not become a normal deathmatch.
- Standard punishment should affect at most one ingredient.
- The exposed last ingredient is the default steal/knock-off target.
- Dropped food remains contestable rather than being deleted.
- Combat, harvesting, inventory and recipe-building stay in one continuous loop.

## Next prototype pass

1. shoulder dash / bump on Space-modifier or dedicated key;
2. skewer-vs-skewer clash when both attacks meet;
3. short vulnerable cooking timer at the Infernal Grill instead of instant delivery;
4. stronger bot combat telegraph / thrust animation;
5. simple 5–6 minute match timer and win state;
6. first real multiplayer networking test after these interactions feel good.
