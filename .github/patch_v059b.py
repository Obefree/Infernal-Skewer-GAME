from pathlib import Path

p = Path('src/game.js')
s = p.read_text()

def rep(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'missing patch target: {label}')
    s = s.replace(old, new, 1)

# Meat is deliberately the premium resource: even the shortest meat order
# is worth more than the longest non-meat order in the current pool.
for old, new, label in [
    ("points: 190, vegan: true", "points: 150, vegan: true", 'garden points'),
    ("points: 330, vegan: true", "points: 280, vegan: true", 'fire garden points'),
    ("points: 470, vegan: true", "points: 360, vegan: true", 'green tower points'),
    ("points: 240 }", "points: 220 }", 'cheese curse points'),
    ("points: 260, meatRecipe: true", "points: 380, meatRecipe: true", 'imp snack points'),
    ("points: 420, meatRecipe: true", "points: 520, meatRecipe: true", 'hell classic points'),
    ("points: 760, meatRecipe: true", "points: 850, meatRecipe: true", 'boar feast points'),
    ("points: 820, meatRecipe: true", "points: 900, meatRecipe: true", 'devils stack points'),
    ("points: 1450, meatRecipe: true", "points: 1500, meatRecipe: true", 'glutton points'),
]:
    rep(old, new, label)

# True sequential cascades: second tier is above the player's maximum jump
# from ground, while each adjacent height difference remains jumpable.
for old, new, label in [
    ("5.8, 5.0, 0.48,", "5.8, 5.0, 0.72,", 'cascade 1 height'),
    ("5.4, 4.6, 1.02,", "5.4, 4.6, 1.44,", 'cascade 2 height'),
    ("5.0, 4.2, 1.56,", "5.0, 4.2, 2.16,", 'cascade 3 height'),
    ("4.7, 3.8, 2.10,", "4.7, 3.8, 2.88,", 'cascade crown height'),
    ("5.8, 4.6, 0.46,", "5.8, 4.6, 0.70,", 'garden cascade 1'),
    ("5.3, 4.2, 0.96,", "5.3, 4.2, 1.40,", 'garden cascade 2'),
    ("4.8, 3.8, 1.46,", "4.8, 3.8, 2.10,", 'garden cascade 3'),
    ("-9.6, 7.8, 2.10", "-9.6, 7.8, 2.88", 'cheese crown y'),
    ("-11.7, 6.4, 1.56", "-11.7, 6.4, 2.16", 'cheese tier 3 y'),
    ("11.8, 7.5, 1.46", "11.8, 7.5, 2.10", 'pepper garden crown y'),
    ("14.0, 6.3, 0.96", "14.0, 6.3, 1.40", 'pepper garden tier 2 y'),
    ("-14.3, 5.1, 1.02", "-14.3, 5.1, 1.44", 'mushroom tier 2 y'),
    ("16.5, 5.0, 0.46", "16.5, 5.0, 0.70", 'mushroom garden tier 1 y'),
]:
    rep(old, new, label)

# Elevated ingredients stay on their terrace instead of fleeing off the edge
# while retaining their vertical height.
old = """    if (playerDistance < 3.8 && playerDistance > 0.01) {
      creature.position.x -= (playerDx / playerDistance) * dt * 0.7;
      creature.position.z -= (playerDz / playerDistance) * dt * 0.7;
    } else if (rivalDistance < 3.4 && rivalDistance > 0.01) {
      creature.position.x -= (rivalDx / rivalDistance) * dt * 0.55;
      creature.position.z -= (rivalDz / rivalDistance) * dt * 0.55;
    }

    creature.position.x = THREE.MathUtils.clamp(creature.position.x, -ARENA_HALF + 1.4, ARENA_HALF - 1.4);
    creature.position.z = THREE.MathUtils.clamp(creature.position.z, -ARENA_HALF + 1.4, ARENA_HALF - 1.4);"""
new = """    if ((creature.userData.baseY || 0) <= 0.05) {
      if (playerDistance < 3.8 && playerDistance > 0.01) {
        creature.position.x -= (playerDx / playerDistance) * dt * 0.7;
        creature.position.z -= (playerDz / playerDistance) * dt * 0.7;
      } else if (rivalDistance < 3.4 && rivalDistance > 0.01) {
        creature.position.x -= (rivalDx / rivalDistance) * dt * 0.55;
        creature.position.z -= (rivalDz / rivalDistance) * dt * 0.55;
      }

      creature.position.x = THREE.MathUtils.clamp(creature.position.x, -ARENA_HALF + 1.4, ARENA_HALF - 1.4);
      creature.position.z = THREE.MathUtils.clamp(creature.position.z, -ARENA_HALF + 1.4, ARENA_HALF - 1.4);
    }"""
rep(old, new, 'lock elevated ingredients')

p.write_text(s)
