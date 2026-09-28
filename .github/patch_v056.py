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
  { name: 'Hell Classic', items: ['meat', 'onion', 'tomato'], points: 220 },
  { name: \"Devil's Stack\", items: ['meat', 'pepper', 'cheese', 'meat'], points: 500 },
];"""
new_recipes = """const recipes = [
  { name: 'Imp Snack', items: ['meat', 'onion'], points: 100 },
  { name: 'Garden Bite', items: ['onion', 'tomato', 'mushroom'], points: 180, vegan: true },
  { name: 'Hell Classic', items: ['meat', 'onion', 'tomato'], points: 220 },
  { name: 'Cheese Curse', items: ['cheese', 'tomato', 'pepper'], points: 260 },
  { name: 'Fire Garden', items: ['pepper', 'tomato', 'mushroom', 'onion'], points: 340, vegan: true },
  { name: \"Devil's Stack\", items: ['meat', 'pepper', 'cheese', 'meat'], points: 500 },
  { name: \"Glutton's Spear\", items: ['meat', 'onion', 'tomato', 'mushroom', 'pepper', 'cheese', 'meat', 'onion'], points: 950 },
];"""
rep(old_recipes, new_recipes, 'recipes')

old_render = """    <div class=\"recipe-row\"><strong>${recipe.name}</strong><span class=\"recipe-points\">${recipe.points}</span></div>"""
new_render = """    <div class=\"recipe-row\"><strong>${recipe.vegan ? '🌱 ' : ''}${recipe.name}</strong><span class=\"recipe-points\">${recipe.points}</span></div>"""
rep(old_render, new_render, 'recipe vegan label')

start = s.index('function updateHog(dt) {')
end = s.index('\nfunction recipePrefixMatches', start)
new_hog = """function updateHog(dt) {
  hog.userData.harvestCooldown = Math.max(0, hog.userData.harvestCooldown - dt);

  // Mega Hog is deliberately NON-AGGRESSIVE in this prototype.
  // No charge state, no player collision damage, no knockback and no ingredient loss.
  hog.userData.velocity.set(0, 0, 0);

  if (hog.userData.state === 'stunned') {
    hog.userData.stun -= dt;
    hog.rotation.z = Math.sin(clock.elapsedTime * 18) * 0.05;
    if (hog.userData.stun <= 0) {
      hog.rotation.z = 0;
      hog.userData.timer = THREE.MathUtils.randFloat(1.6, 3.4);
      setHogState('roam');
    }
    return;
  }

  // Force any stale/legacy state back to passive roam immediately.
  if (hog.userData.state !== 'roam') setHogState('roam');
  hog.userData.timer -= dt;
  hog.rotation.y += Math.sin(clock.elapsedTime * 0.45) * dt * 0.12;
  if (hog.userData.timer <= 0) hog.userData.timer = THREE.MathUtils.randFloat(1.6, 3.4);
}
"""
s = s[:start] + new_hog + s[end:]

rep("""    : '🐗 PASSIVE — STAB TO PUSH → PIN TO WALL';""", """    : '🐗 CALM — STAB TO PUSH → PIN TO WALL';""", 'hog hud calm wording')

p.write_text(s)

p = Path('styles.css')
s = p.read_text()
s = s.replace('  .recipe:nth-child(n+3) { display: none; }\n', '')
s = s.replace(
    '  .recipe { padding: 5px 7px; border-radius: 8px; }\n  .recipe-row { font-size: 9px; }\n  .recipe-items { font-size: 14px; letter-spacing: 1px; margin-top: 1px; }',
    '  .recipe { padding: 4px 6px; border-radius: 8px; }\n  .recipe-row { font-size: 8.5px; }\n  .recipe-items { font-size: 12px; letter-spacing: 0; margin-top: 1px; }',
    1,
)
s = s.replace(
    '  .recipes { top: max(38px, calc(env(safe-area-inset-top) + 29px)); width: 150px; }',
    '  .recipes { top: max(36px, calc(env(safe-area-inset-top) + 27px)); width: 158px; gap: 2px; }',
    1,
)
p.write_text(s)

p = Path('index.html')
s = p.read_text().replace('ONLINE FPS v0.5.5', 'ONLINE FPS v0.5.6', 1)
p.write_text(s)
