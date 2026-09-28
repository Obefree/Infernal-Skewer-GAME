from pathlib import Path
p = Path('src/game.js')
s = p.read_text()

old = """  if (forward || right) {
    const length = Math.hypot(forward, right);
    forward /= length;
    right /= length;
    const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? SPRINT_SPEED : WALK_SPEED;
    controls.moveForward(forward * speed * dt);
    controls.moveRight(right * speed * dt);
  }

  resolvePlayerWorldCollisions();"""
new = """  if (forward || right) {
    if (MOBILE) {
      // Keep the joystick analog: small deflection = slow precise movement.
      // Do not normalize touch input to full speed.
      controls.moveForward(forward * WALK_SPEED * dt);
    } else {
      const length = Math.hypot(forward, right);
      forward /= length;
      right /= length;
      const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? SPRINT_SPEED : WALK_SPEED;
      controls.moveForward(forward * speed * dt);
      controls.moveRight(right * speed * dt);
    }
  }

  resolvePlayerWorldCollisions();"""
if old not in s:
    raise SystemExit('missing movement normalization block')
s = s.replace(old, new, 1)

old = """    if (playerDistance < 3.8 && playerDistance > 0.01) {
      creature.position.x -= (playerDx / playerDistance) * dt * 0.7;
      creature.position.z -= (playerDz / playerDistance) * dt * 0.7;
    } else if (rivalDistance < 3.4 && rivalDistance > 0.01) {
      creature.position.x -= (rivalDx / rivalDistance) * dt * 0.55;
      creature.position.z -= (rivalDz / rivalDistance) * dt * 0.55;
    }

    creature.position.x = THREE.MathUtils.clamp(creature.position.x, -ARENA_HALF + 1.4, ARENA_HALF - 1.4);"""
new = """    // Ingredients planted on raised beds / tier stay on that surface instead of fleeing into mid-air.
    if ((creature.userData.baseY || 0) <= 0.01) {
      if (playerDistance < 3.8 && playerDistance > 0.01) {
        creature.position.x -= (playerDx / playerDistance) * dt * 0.7;
        creature.position.z -= (playerDz / playerDistance) * dt * 0.7;
      } else if (rivalDistance < 3.4 && rivalDistance > 0.01) {
        creature.position.x -= (rivalDx / rivalDistance) * dt * 0.55;
        creature.position.z -= (rivalDz / rivalDistance) * dt * 0.55;
      }
    }

    creature.position.x = THREE.MathUtils.clamp(creature.position.x, -ARENA_HALF + 1.4, ARENA_HALF - 1.4);"""
if old not in s:
    raise SystemExit('missing creature flee block')
s = s.replace(old, new, 1)
p.write_text(s)
