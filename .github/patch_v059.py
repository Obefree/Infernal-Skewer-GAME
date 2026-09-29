from pathlib import Path

p = Path('src/game.js')
s = p.read_text()

def rep(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'missing patch target: {label}')
    s = s.replace(old, new, 1)

old_recipes = """const recipes = [
  { name: 'Imp Snack', items: ['meat', 'onion'], points: 100 },
  { name: 'Garden Bite', items: ['onion', 'tomato', 'mushroom'], points: 180, vegan: true },
  { name: 'Hell Classic', items: ['meat', 'onion', 'tomato'], points: 220 },
  { name: 'Cheese Curse', items: ['cheese', 'tomato', 'pepper'], points: 260 },
  { name: 'Fire Garden', items: ['pepper', 'tomato', 'mushroom', 'onion'], points: 340, vegan: true },
  { name: \"Devil's Stack\", items: ['meat', 'pepper', 'cheese', 'meat'], points: 500 },
  { name: \"Glutton's Spear\", items: ['meat', 'onion', 'tomato', 'mushroom', 'pepper', 'cheese', 'meat', 'onion'], points: 950 },
];

recipesEl.innerHTML = recipes.map((recipe) => `
  <div class=\"recipe\">
    <div class=\"recipe-row\"><strong>${recipe.vegan ? '🌱 ' : ''}${recipe.name}</strong><span class=\"recipe-points\">${recipe.points}</span></div>
    <div class=\"recipe-items\">${recipe.items.map((type) => ingredientDefs[type].emoji).join(' ')}</div>
  </div>
`).join('');"""
new_recipes = """const recipeTemplates = [
  { id: 'garden-bite', name: 'Garden Bite', items: ['onion', 'tomato', 'mushroom'], points: 190, vegan: true },
  { id: 'fire-garden', name: 'Fire Garden', items: ['pepper', 'tomato', 'mushroom', 'onion'], points: 330, vegan: true },
  { id: 'green-tower', name: 'Green Tower', items: ['mushroom', 'onion', 'pepper', 'tomato', 'mushroom'], points: 470, vegan: true },
  { id: 'cheese-curse', name: 'Cheese Curse', items: ['cheese', 'tomato', 'pepper'], points: 240 },
  { id: 'imp-snack', name: 'Imp Snack', items: ['meat', 'onion'], points: 260, meatRecipe: true },
  { id: 'hell-classic', name: 'Hell Classic', items: ['meat', 'onion', 'tomato'], points: 420, meatRecipe: true },
  { id: 'boar-feast', name: 'Boar Feast', items: ['meat', 'onion', 'meat', 'pepper'], points: 760, meatRecipe: true },
  { id: 'devils-stack', name: \"Devil's Stack\", items: ['meat', 'pepper', 'cheese', 'meat'], points: 820, meatRecipe: true },
  { id: 'gluttons-spear', name: \"Glutton's Spear\", items: ['meat', 'onion', 'tomato', 'mushroom', 'pepper', 'cheese', 'meat', 'onion'], points: 1450, meatRecipe: true },
];

function seededRandom(seed) {
  let t = (seed >>> 0) || 1;
  return () => {
    t += 0x6D2B79F5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledCopy(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildRoundRecipes(id = 1) {
  const rng = seededRandom(0x51F15EED ^ Number(id || 1));
  const meat = shuffledCopy(recipeTemplates.filter((r) => r.meatRecipe), rng).slice(0, 3);
  const other = shuffledCopy(recipeTemplates.filter((r) => !r.meatRecipe), rng).slice(0, 3);
  return shuffledCopy([...meat, ...other], rng).map((template) => {
    const items = shuffledCopy(template.items, rng);
    return { ...template, items };
  });
}

let recipes = buildRoundRecipes(1);

function renderRecipes() {
  recipesEl.innerHTML = recipes.map((recipe) => `
    <div class=\"recipe${recipe.meatRecipe ? ' meat-recipe' : ''}\">
      <div class=\"recipe-row\"><strong>${recipe.vegan ? '🌱 ' : (recipe.meatRecipe ? '🐗 ' : '')}${recipe.name}</strong><span class=\"recipe-points\">${recipe.points}</span></div>
      <div class=\"recipe-items\">${recipe.items.map((type) => ingredientDefs[type].emoji).join(' ')}</div>
    </div>
  `).join('');
}

function setRecipesForRound(id) {
  recipes = buildRoundRecipes(id);
  rival.recipeIndex = Math.min(rival.recipeIndex || 0, recipes.length - 1);
  renderRecipes();
}

renderRecipes();"""
rep(old_recipes, new_recipes, 'dynamic recipes')

old_platforms = """// A proper second tier: high enough that the player must jump onto it.
addRaisedPlatform(-14, 5, 7.5, 7.0, 1.15, 0x56251d, 0x8b4934, 'tier');

// Raised infernal garden beds. They are low obstacles that can also be jumped onto.
addRaisedPlatform(-14, -10, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');
addRaisedPlatform(-14, -6.2, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');
addRaisedPlatform(14, -10, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');
addRaisedPlatform(14, -6.2, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');"""
new_platforms = """// Main harvest cascade: four distinct jumps are required to reach the crown.
// Each terrace overlaps the previous one enough to create a readable upward route,
// but the height difference prevents a direct ground-to-top shortcut.
addRaisedPlatform(-17.0, 3.7, 5.8, 5.0, 0.48, 0x4d2519, 0x70402c, 'cascade-1');
addRaisedPlatform(-14.3, 5.1, 5.4, 4.6, 1.02, 0x55271d, 0x7c4931, 'cascade-2');
addRaisedPlatform(-11.8, 6.5, 5.0, 4.2, 1.56, 0x5d2b20, 0x895038, 'cascade-3');
addRaisedPlatform(-9.5, 7.8, 4.7, 3.8, 2.10, 0x663025, 0x965c3f, 'cascade-crown');

// A second, shorter garden cascade on the opposite side gives another vertical route.
addRaisedPlatform(16.5, 5.0, 5.8, 4.6, 0.46, 0x49301b, 0x614421, 'garden-step-1');
addRaisedPlatform(14.0, 6.3, 5.3, 4.2, 0.96, 0x50351c, 0x6b4d25, 'garden-step-2');
addRaisedPlatform(11.8, 7.5, 4.8, 3.8, 1.46, 0x593b20, 0x77582b, 'garden-step-3');

// Low garden beds remain useful ground-level harvest lanes.
addRaisedPlatform(-14, -10, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');
addRaisedPlatform(-14, -6.2, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');
addRaisedPlatform(14, -10, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');
addRaisedPlatform(14, -6.2, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');"""
rep(old_platforms, new_platforms, 'cascade platforms')

old_spawns = """spawnIngredient('onion', -14.8, -10, 0.42);
spawnIngredient('onion', -13.0, -6.2, 0.42);
spawnIngredient('tomato', 14.8, -10, 0.42);
spawnIngredient('tomato', 13.0, -6.2, 0.42);
spawnIngredient('cheese', -14.5, 5.0, 1.15);
spawnIngredient('cheese', -11.9, 6.5, 1.15);
spawnIngredient('pepper', 16.5, 8.5);
spawnIngredient('pepper', 12.0, 13.0);
spawnIngredient('mushroom', -12.0, 3.5, 1.15);
spawnIngredient('mushroom', 17.0, 1.0);"""
new_spawns = """spawnIngredient('onion', -14.8, -10, 0.42);
spawnIngredient('onion', -13.0, -6.2, 0.42);
spawnIngredient('tomato', 14.8, -10, 0.42);
spawnIngredient('tomato', 13.0, -6.2, 0.42);
spawnIngredient('cheese', -9.6, 7.8, 2.10);
spawnIngredient('cheese', -11.7, 6.4, 1.56);
spawnIngredient('pepper', 11.8, 7.5, 1.46);
spawnIngredient('pepper', 14.0, 6.3, 0.96);
spawnIngredient('mushroom', -14.3, 5.1, 1.02);
spawnIngredient('mushroom', 16.5, 5.0, 0.46);"""
rep(old_spawns, new_spawns, 'cascade ingredient spawns')

old_round = """  onRound: ({ id, endsAt }) => { roundId = id; roundEndsAt = endsAt; },
  onRoundReset: ({ id, endsAt }) => {
    roundId = id;
    roundEndsAt = endsAt;
    player.score = 0;
    player.items = [];
    rival.score = 0;
    rival.items = [];
    rebuildSkewerView();
    rebuildRivalSkewer();
    updateHUD();
    showToast(`🔥 ROUND ${id} — SCORE RESET`, 1.4);
  },"""
new_round = """  onRound: ({ id, endsAt }) => {
    const changed = id !== roundId;
    roundId = id;
    roundEndsAt = endsAt;
    if (changed) setRecipesForRound(id);
  },
  onRoundReset: ({ id, endsAt }) => {
    roundId = id;
    roundEndsAt = endsAt;
    setRecipesForRound(id);
    player.score = 0;
    player.items = [];
    rival.score = 0;
    rival.items = [];
    rebuildSkewerView();
    rebuildRivalSkewer();
    updateHUD();
    showToast(`🔥 ROUND ${id} — NEW ORDERS!`, 1.4);
  },"""
rep(old_round, new_round, 'round recipe rotation')

old_random = """function randomArenaPosition() {
  let x; let z;
  do {
    x = THREE.MathUtils.randFloat(-ARENA_HALF + 2.2, ARENA_HALF - 2.2);
    z = THREE.MathUtils.randFloat(-ARENA_HALF + 2.2, ARENA_HALF - 2.2);
  } while (
    Math.hypot(x - grill.position.x, z - grill.position.z) < 4
    || Math.hypot(x, z) < 3.2
    || platformDefs.some((platform) => pointInsidePlatform(x, z, platform, 1.1))
  );
  return new THREE.Vector3(x, 0, z);
}"""
new_random = """function randomArenaPosition() {
  // Roughly one third of respawns go onto reachable terraces, preserving the
  // vertical routing game after the initial vegetables have been harvested.
  if (Math.random() < 0.34 && platformDefs.length) {
    const platform = platformDefs[Math.floor(Math.random() * platformDefs.length)];
    const margin = 0.7;
    return new THREE.Vector3(
      THREE.MathUtils.randFloat(platform.x - platform.width / 2 + margin, platform.x + platform.width / 2 - margin),
      platform.height,
      THREE.MathUtils.randFloat(platform.z - platform.depth / 2 + margin, platform.z + platform.depth / 2 - margin),
    );
  }

  let x; let z;
  do {
    x = THREE.MathUtils.randFloat(-ARENA_HALF + 2.2, ARENA_HALF - 2.2);
    z = THREE.MathUtils.randFloat(-ARENA_HALF + 2.2, ARENA_HALF - 2.2);
  } while (
    Math.hypot(x - grill.position.x, z - grill.position.z) < 4
    || Math.hypot(x, z) < 3.2
    || platformDefs.some((platform) => pointInsidePlatform(x, z, platform, 1.1))
  );
  return new THREE.Vector3(x, 0, z);
}"""
rep(old_random, new_random, 'vertical respawns')

rep("""  creature.position.copy(randomArenaPosition());
  creature.userData.baseY = 0;
  creature.userData.active = true;""", """  creature.position.copy(randomArenaPosition());
  creature.userData.baseY = creature.position.y;
  creature.userData.active = true;""", 'respawn height')

p.write_text(s)

p = Path('index.html')
s = p.read_text().replace('ONLINE FPS v0.5.8', 'ONLINE FPS v0.5.9', 1)
p.write_text(s)

p = Path('styles.css')
s = p.read_text()
needle = ".recipe-points { color: #ffd166; font-weight: 800; }"
replacement = needle + "\n.recipe.meat-recipe { border-color: #ff6f4a88; box-shadow: inset 3px 0 0 #ff6f4a66; }"
if needle not in s:
    raise SystemExit('missing recipe style target')
s = s.replace(needle, replacement, 1)
p.write_text(s)
