# Infernal Skewer — compact design brief

## Core fantasy

A fast competitive 3D arena game set in Hell's kitchen. Players run through a dangerous kitchen with a skewer. Hitting ingredient-creatures physically adds food to the weapon. Recipes score only when delivered to the Infernal Grill.

## Core loop

1. Read the available orders.
2. Choose a route to the needed ingredient sources.
3. Stab creatures to build the recipe directly on the skewer.
4. Enter shared danger zones for valuable ingredients such as meat.
5. Protect the increasingly valuable visible skewer from rivals.
6. Reach the shared Infernal Grill.
7. Cook/deliver and score.
8. Immediately choose another order.

## Design pillars

### Skewer = weapon = inventory = recipe
The defining rule. Avoid systems that split fighting, gathering and inventory into separate modes.

### Shared conflict zones
The map should force intersections. First anchors:
- Mega Hog pit for meat;
- Infernal Grill for scoring.

### Visible value creates danger
A nearly complete 8-slot skewer should be obvious to every rival. More progress naturally makes the carrier a more attractive target.

### Sabotage, not deathmatch
PvP changes recipes: knock off, steal, burn, swap or contaminate ingredients. Kills should not become the dominant source of points.

### Readable chaos
Players should understand at a glance what they carry, what they need next and why an ingredient was lost.

## Base skewer

- 8 ingredient slots.
- New ingredients append toward the exposed tip.
- The last ingredient is the first target for normal knock-off / precision steal.
- Ninth ingredient is currently rejected.

## First arena anchors

### Mega Hog
A dangerous roaming central resource. Meat cannot be harvested normally. The Hog charges a player; if it collides with an arena wall it becomes stunned for a short window and can be stabbed for meat.

### Infernal Grill
The shared scoring point. The first build delivers instantly; later versions should require a short vulnerable cooking hold.

## MVP recipes

- Imp Snack: Meat + Onion — 100
- Hell Classic: Meat + Onion + Tomato — 220
- Devil's Stack: Meat + Pepper + Cheese + Meat — 500

## Intended match direction

Target later: 4–8 players, roughly 5–7 minute matches, shared recipe board, escalating central hazards, no long respawn downtime.
