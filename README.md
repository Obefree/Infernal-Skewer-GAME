# Infernal Skewer GAME

Browser prototype of a competitive hell-kitchen arena game.

## High concept

The skewer is simultaneously:

1. your melee weapon;
2. your visible inventory;
3. the recipe you are building.

Stab living ingredients to put them directly onto the skewer. The base skewer has **8 slots**. Meat comes from the shared **Mega Hog**: bait its charge into an arena wall, stab it while stunned, then bring a correct recipe to the **Infernal Grill**.

## Current browser build — v0.5 online MVP

### Online arena

The FPS build now uses **Supabase Realtime**.

- opening the same room puts players into the same realtime arena channel;
- default room: `public`;
- separate test rooms can be opened with `?room=ROOM_NAME`;
- connected players are visible as blue chefs;
- position, facing, skewer contents and score are broadcast approximately 10 times per second;
- Presence tracks who is online;
- when a second real player joins, the local Rival Chef bot is hidden;
- when alone, the Rival Chef remains active as a fallback opponent;
- exposed ingredients can be precision-stolen from real online players;
- one client is automatically elected room host for the prototype timer;
- rounds currently last **3 minutes**;
- at the end of a round the score and current skewer are reset and the next round begins automatically.

Current networking limitation: ingredient creatures, dropped world food and Mega Hog simulation are still client-local. The next networking pass should make arena resources host-authoritative/shared.

### Core

- Three.js/WebGL 3D arena;
- base skewer capacity: **8 ingredients**;
- long forward-facing pointed skewer model in FPS;
- living onion / tomato / cheese / pepper / mushroom ingredients;
- after successful harvest the ingredient creature disappears;
- harvested ingredient creature respawns after a random **3–6 seconds** at a new arena position;
- Mega Hog charge → wall crash → stun → meat harvest loop;
- Infernal Grill and exact-order recipes;
- precision steal;
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
- **left thumb** virtual stick handles navigation;
- horizontal stick movement automatically turns the camera;
- vertical stick movement moves forward/backward;
- **right thumb** uses action buttons:
  - `STAB`;
  - `JUMP`;
  - `DROP`;
  - `USE`.

There is no separate mobile camera-look zone in the current control experiment.

### Top-down touch demo — `topdown.html`

Experimental second camera/control model:

- camera above the arena;
- **left thumb** virtual stick controls movement and facing;
- **right thumb** action cluster:
  - `STAB`;
  - `DROP`;
  - `USE`;
- player turns toward the movement vector;
- same 8-slot skewer concept;
- ingredient disappearance + delayed random respawn;
- Mega Hog and Infernal Grill included;
- desktop fallback: WASD / Space / Q / E.

The top-down demo is still primarily a control prototype; FPS is the first networking target.

## Online / local run

The repository is a static site and can be served directly by static hosting. For local development:

```bash
python3 -m http.server 8080
```

Then open:

- `http://localhost:8080/` — FPS mode;
- `http://localhost:8080/topdown.html` — top-down demo.

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

1. make ingredient/Hog/drop state shared and host-authoritative;
2. add simple lobby / room-code UI rather than relying on query parameters;
3. add match end screen / leaderboard before automatic reset;
4. shoulder dash / bump;
5. skewer-vs-skewer clash;
6. short vulnerable cooking timer at the Infernal Grill;
7. deploy to a permanent branded URL instead of relying on development static hosting.
