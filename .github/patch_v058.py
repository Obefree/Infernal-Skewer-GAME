from pathlib import Path

p = Path('src/game.js')
s = p.read_text()

def rep(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'missing patch target: {label}')
    s = s.replace(old, new, 1)

# DOM / arena size / camera.
rep("const useButton = document.querySelector('#useButton');", "const useButton = document.querySelector('#useButton');\nconst lookPad = document.querySelector('#lookPad');", 'look pad ref')
rep("const ARENA_HALF = 18;", "const ARENA_HALF = 22;", 'arena size')
rep("scene.fog = new THREE.Fog(0x2b0c08, 22, 62);", "scene.fog = new THREE.Fog(0x2b0c08, 28, 76);", 'fog range')
rep("camera.position.set(0, PLAYER_HEIGHT, 13);", "camera.position.set(0, PLAYER_HEIGHT, 16);", 'camera spawn')
rep("const grid = new THREE.GridHelper(ARENA_HALF * 2, 24, 0x8f321f, 0x512015);", "const grid = new THREE.GridHelper(ARENA_HALF * 2, 30, 0x8f321f, 0x512015);", 'grid')
rep("const pillarPositions = [[-7,-5],[7,-5],[-8,7],[8,7],[-4,1],[4,1]];", "const pillarPositions = [[-9,-7],[9,-7],[-10,9],[10,9],[-5,2],[5,2],[-15,12],[15,12]];", 'pillars')

# Raised tier + garden beds. All are solid and jumpable.
marker = """function makeLabel(text, color = '#ffffff') {"""
raised = """const platformDefs = [];

function addRaisedPlatform(x, z, width, depth, height, baseColor, topColor, kind = 'platform') {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.88 }),
  );
  base.position.y = height / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(0.2, width - 0.22), 0.1, Math.max(0.2, depth - 0.22)),
    new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.96 }),
  );
  top.position.y = height + 0.05;
  top.receiveShadow = true;
  group.add(top);
  scene.add(group);
  const def = { x, z, width, depth, height, kind };
  platformDefs.push(def);
  return def;
}

// A proper second tier: high enough that the player must jump onto it.
addRaisedPlatform(-14, 5, 7.5, 7.0, 1.15, 0x56251d, 0x8b4934, 'tier');

// Raised infernal garden beds. They are low obstacles that can also be jumped onto.
addRaisedPlatform(-14, -10, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');
addRaisedPlatform(-14, -6.2, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');
addRaisedPlatform(14, -10, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');
addRaisedPlatform(14, -6.2, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');

function makeLabel(text, color = '#ffffff') {"""
rep(marker, raised, 'raised world features')

# Ingredient spawns support a raised Y and are distributed across the larger arena.
rep("function spawnIngredient(type, x, z) {\n  const root = new THREE.Group();\n  root.position.set(x, 0, z);", "function spawnIngredient(type, x, z, y = 0) {\n  const root = new THREE.Group();\n  root.position.set(x, y, z);\n  root.userData.baseY = y;", 'spawn ingredient y')
old_spawns = """spawnIngredient('onion', -12, -8);
spawnIngredient('onion', -10, -11);
spawnIngredient('tomato', 12, -8);
spawnIngredient('tomato', 10, -11);
spawnIngredient('cheese', -12, 8);
spawnIngredient('cheese', -9, 10);
spawnIngredient('pepper', 12, 8);
spawnIngredient('pepper', 9, 10);
spawnIngredient('mushroom', -14, 0);
spawnIngredient('mushroom', 14, 0);"""
new_spawns = """spawnIngredient('onion', -14.8, -10, 0.42);
spawnIngredient('onion', -13.0, -6.2, 0.42);
spawnIngredient('tomato', 14.8, -10, 0.42);
spawnIngredient('tomato', 13.0, -6.2, 0.42);
spawnIngredient('cheese', -14.5, 5.0, 1.15);
spawnIngredient('cheese', -11.9, 6.5, 1.15);
spawnIngredient('pepper', 16.5, 8.5);
spawnIngredient('pepper', 12.0, 13.0);
spawnIngredient('mushroom', -12.0, 3.5, 1.15);
spawnIngredient('mushroom', 17.0, 1.0);"""
rep(old_spawns, new_spawns, 'ingredient spawns')
rep("grill.position.set(0, 0, 13.5);", "grill.position.set(0, 0, 17.0);", 'grill position')

# Mobile pitch state.
rep("const mobileMoveSmoothed = new THREE.Vector2();\nlet mobileYaw = 0;", "const mobileMoveSmoothed = new THREE.Vector2();\nlet mobileYaw = 0;\nlet mobilePitch = 0;", 'mobile pitch state')

# Manual vertical look replaces automatic pitch in normal movement.
rep("    camera.rotation.y = mobileYaw;\n    updateMobileAutoPitch(dt);\n    forward = mobileMoveSmoothed.y * 0.82;", "    camera.rotation.y = mobileYaw;\n    camera.rotation.x = mobilePitch;\n    forward = mobileMoveSmoothed.y * 0.82;", 'manual pitch')
rep("    mobileYaw = camera.rotation.y;", "    mobileYaw = camera.rotation.y;\n    mobilePitch = camera.rotation.x;", 'start pitch')

# More reliable Android joystick: deadzone + global release/lost-capture reset.
old_move_pad = """if (movePad) {
  let movePointer = null;
  const radius = 46;
  const updateMove = (event) => {
    const rect = movePad.getBoundingClientRect();
    let x = event.clientX - rect.left - rect.width / 2;
    let y = event.clientY - rect.top - rect.height / 2;
    const length = Math.hypot(x, y) || 1;
    if (length > radius) { x *= radius / length; y *= radius / length; }
    mobileMove.set(x / radius, -y / radius);
    if (moveKnob) moveKnob.style.transform = `translate(${x}px, ${y}px)`;
  };
  movePad.addEventListener('pointerdown', (event) => { movePointer = event.pointerId; movePad.setPointerCapture(movePointer); updateMove(event); });
  movePad.addEventListener('pointermove', (event) => { if (event.pointerId === movePointer) updateMove(event); });
  const endMove = (event) => {
    if (event.pointerId !== movePointer) return;
    movePointer = null;
    mobileMove.set(0, 0);
    if (moveKnob) moveKnob.style.transform = 'translate(0,0)';
  };
  movePad.addEventListener('pointerup', endMove);
  movePad.addEventListener('pointercancel', endMove);
}"""
new_move_pad = """if (movePad) {
  let movePointer = null;
  const radius = 46;
  const resetMove = () => {
    movePointer = null;
    mobileMove.set(0, 0);
    mobileMoveSmoothed.set(0, 0);
    if (moveKnob) moveKnob.style.transform = 'translate(0,0)';
  };
  const updateMove = (event) => {
    const rect = movePad.getBoundingClientRect();
    let x = event.clientX - rect.left - rect.width / 2;
    let y = event.clientY - rect.top - rect.height / 2;
    const length = Math.hypot(x, y) || 1;
    if (length > radius) { x *= radius / length; y *= radius / length; }
    let nx = x / radius;
    let ny = -y / radius;
    if (Math.hypot(nx, ny) < 0.14) {
      x = 0; y = 0; nx = 0; ny = 0;
    }
    mobileMove.set(nx, ny);
    if (moveKnob) moveKnob.style.transform = `translate(${x}px, ${y}px)`;
  };
  movePad.addEventListener('pointerdown', (event) => {
    if (movePointer !== null) return;
    event.preventDefault();
    movePointer = event.pointerId;
    try { movePad.setPointerCapture(movePointer); } catch {}
    updateMove(event);
  });
  movePad.addEventListener('pointermove', (event) => {
    if (event.pointerId === movePointer) updateMove(event);
  });
  const endMove = (event) => {
    if (movePointer === null) return;
    if (event?.pointerId != null && event.pointerId !== movePointer) return;
    resetMove();
  };
  movePad.addEventListener('pointerup', endMove);
  movePad.addEventListener('pointercancel', endMove);
  movePad.addEventListener('lostpointercapture', resetMove);
  window.addEventListener('pointerup', endMove, { passive: true });
  window.addEventListener('pointercancel', endMove, { passive: true });
  window.addEventListener('blur', resetMove);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetMove(); });
}"""
rep(old_move_pad, new_move_pad, 'android joystick reset')

# Vertical look strip on mobile. It is separate from movement and action buttons.
insert_after_move = new_move_pad + """

if (lookPad) {
  let lookPointer = null;
  let lastY = 0;
  const stopLook = (event) => {
    if (lookPointer === null) return;
    if (event?.pointerId != null && event.pointerId !== lookPointer) return;
    lookPointer = null;
    lookPad.classList.remove('active');
  };
  lookPad.addEventListener('pointerdown', (event) => {
    if (lookPointer !== null) return;
    event.preventDefault();
    lookPointer = event.pointerId;
    lastY = event.clientY;
    lookPad.classList.add('active');
    try { lookPad.setPointerCapture(lookPointer); } catch {}
  });
  lookPad.addEventListener('pointermove', (event) => {
    if (event.pointerId !== lookPointer) return;
    event.preventDefault();
    const dy = event.clientY - lastY;
    lastY = event.clientY;
    mobilePitch = THREE.MathUtils.clamp(mobilePitch - dy * 0.0052, -0.82, 0.62);
    camera.rotation.x = mobilePitch;
  });
  lookPad.addEventListener('pointerup', stopLook);
  lookPad.addEventListener('pointercancel', stopLook);
  lookPad.addEventListener('lostpointercapture', () => stopLook());
  window.addEventListener('pointerup', stopLook, { passive: true });
  window.addEventListener('pointercancel', stopLook, { passive: true });
}"""
# replace just-created block with itself + look block
if new_move_pad not in s:
    raise SystemExit('new move pad block not found for look insertion')
s = s.replace(new_move_pad, insert_after_move, 1)

# Random respawns avoid raised geometry and preserve baseY.
old_random = """function randomArenaPosition() {
  let x; let z;
  do {
    x = THREE.MathUtils.randFloat(-ARENA_HALF + 2.2, ARENA_HALF - 2.2);
    z = THREE.MathUtils.randFloat(-ARENA_HALF + 2.2, ARENA_HALF - 2.2);
  } while (Math.hypot(x - grill.position.x, z - grill.position.z) < 4 || Math.hypot(x, z) < 3.2);
  return new THREE.Vector3(x, 0, z);
}"""
new_random = """function pointInsidePlatform(x, z, platform, margin = 0) {
  return Math.abs(x - platform.x) <= platform.width / 2 + margin
    && Math.abs(z - platform.z) <= platform.depth / 2 + margin;
}

function randomArenaPosition() {
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
rep(old_random, new_random, 'random position platforms')
rep("  creature.position.copy(randomArenaPosition());\n  creature.userData.active = true;", "  creature.position.copy(randomArenaPosition());\n  creature.userData.baseY = 0;\n  creature.userData.active = true;", 'respawn base y')
rep("    creature.position.y = Math.sin(time * 2.2 + phase) * 0.05;", "    creature.position.y = (creature.userData.baseY || 0) + Math.sin(time * 2.2 + phase) * 0.05;", 'creature base y')

# Raised platform side collision + landing.
old_collision_end = """  // Re-apply wall bounds in case a circle collision pushed the player outward.
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limit, limit);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limit, limit);
}"""
new_collision_end = """  // Re-apply wall bounds in case a circle collision pushed the player outward.
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limit, limit);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limit, limit);
}

function resolveRaisedPlatformSides(previousX, previousZ) {
  for (const platform of platformDefs) {
    const margin = PLAYER_RADIUS;
    if (!pointInsidePlatform(camera.position.x, camera.position.z, platform, margin)) continue;
    const topCameraY = PLAYER_HEIGHT + platform.height;
    // Once the player's feet are high enough, allow horizontal entry so they can land on top.
    if (camera.position.y >= topCameraY - 0.08) continue;

    const wasOutside = !pointInsidePlatform(previousX, previousZ, platform, margin);
    if (wasOutside) {
      camera.position.x = previousX;
      camera.position.z = previousZ;
      continue;
    }

    const left = Math.abs(camera.position.x - (platform.x - platform.width / 2 - margin));
    const right = Math.abs((platform.x + platform.width / 2 + margin) - camera.position.x);
    const front = Math.abs(camera.position.z - (platform.z - platform.depth / 2 - margin));
    const back = Math.abs((platform.z + platform.depth / 2 + margin) - camera.position.z);
    const smallest = Math.min(left, right, front, back);
    if (smallest === left) camera.position.x = platform.x - platform.width / 2 - margin;
    else if (smallest === right) camera.position.x = platform.x + platform.width / 2 + margin;
    else if (smallest === front) camera.position.z = platform.z - platform.depth / 2 - margin;
    else camera.position.z = platform.z + platform.depth / 2 + margin;
  }
}

function groundHeightAt(x, z) {
  let ground = PLAYER_HEIGHT;
  for (const platform of platformDefs) {
    if (pointInsidePlatform(x, z, platform, -0.05)) {
      ground = Math.max(ground, PLAYER_HEIGHT + platform.height);
    }
  }
  return ground;
}"""
rep(old_collision_end, new_collision_end, 'platform collision helpers')

# Replace movement with side collision and platform landing.
start = s.index('function updateMovement(dt) {')
end = s.index('\nfunction updateCreatures', start)
new_movement = """function updateMovement(dt) {
  if (!controls.isLocked && !MOBILE) return;
  const previousX = camera.position.x;
  const previousZ = camera.position.z;
  let forward = 0;
  let right = 0;
  if (MOBILE) {
    const smooth = Math.min(1, dt * 7.0);
    mobileMoveSmoothed.lerp(mobileMove, smooth);
    mobileYaw -= mobileMoveSmoothed.x * 1.75 * dt;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = mobileYaw;
    camera.rotation.x = mobilePitch;
    forward = mobileMoveSmoothed.y * 0.82;
    right = 0;
  } else {
    if (keys.has('KeyW')) forward += 1;
    if (keys.has('KeyS')) forward -= 1;
    if (keys.has('KeyD')) right += 1;
    if (keys.has('KeyA')) right -= 1;
  }

  if (forward || right) {
    const length = Math.hypot(forward, right);
    forward /= length;
    right /= length;
    const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? SPRINT_SPEED : WALK_SPEED;
    controls.moveForward(forward * speed * dt);
    controls.moveRight(right * speed * dt);
  }

  resolvePlayerWorldCollisions();
  resolveRaisedPlatformSides(previousX, previousZ);

  player.velocityY -= GRAVITY * dt;
  camera.position.y += player.velocityY * dt;
  const groundHeight = groundHeightAt(camera.position.x, camera.position.z);
  if (player.velocityY <= 0 && camera.position.y <= groundHeight) {
    camera.position.y = groundHeight;
    player.velocityY = 0;
    player.grounded = true;
  } else if (camera.position.y > groundHeight + 0.03) {
    player.grounded = false;
  }
}
"""
s = s[:start] + new_movement + s[end:]

# Keep explicit calm-Hog guarantee in comments/HUD; it never knocks ingredients.
rep("    : '🐗 CALM — STAB TO PUSH → PIN TO WALL';", "    : '🐗 CALM — NEVER KNOCKS FOOD · STAB → WALL';", 'hog no knock HUD')

p.write_text(s)

# HTML: mobile look strip + version + copy.
p = Path('index.html')
s = p.read_text()
s = s.replace('ONLINE FPS v0.5.7', 'ONLINE FPS v0.5.8', 1)
s = s.replace(
    '<div id="movePad" class="touch-pad move-pad"><div id="moveKnob" class="touch-knob"></div><span>MOVE / TURN</span></div>\n    <div class="action-stack right-actions">',
    '<div id="movePad" class="touch-pad move-pad"><div id="moveKnob" class="touch-knob"></div><span>MOVE / TURN</span></div>\n    <div id="lookPad" class="look-pad"><span>LOOK<br>↑ ↓</span></div>\n    <div class="action-stack right-actions">',
    1,
)
s = s.replace(
    'Mobile: left thumb moves/turns; right thumb uses STAB / JUMP / DROP / USE.',
    'Mobile: left thumb moves/turns; swipe LOOK vertically to aim up/down; right thumb uses STAB / JUMP / DROP / USE.',
    1,
)
p.write_text(s)

# CSS for the look strip.
p = Path('styles.css')
s = p.read_text()
needle = ".right-actions { right: max(22px, env(safe-area-inset-right)); bottom: max(20px, env(safe-area-inset-bottom)); grid-template-columns: 1fr 1fr; }"
addition = needle + "\n.look-pad { pointer-events: auto; position: absolute; right: max(190px, calc(env(safe-area-inset-right) + 174px)); top: 24%; width: 78px; height: 48%; border-radius: 22px; border: 1px solid #ffffff24; background: #12050440; display: grid; place-items: center; touch-action: none; }\n.look-pad span { font-size: 10px; font-weight: 900; letter-spacing: .08em; opacity: .5; text-align: center; line-height: 1.35; }\n.look-pad.active { background: #ff70443d; border-color: #ff9b725c; }"
if needle not in s:
    raise SystemExit('missing CSS right-actions marker')
s = s.replace(needle, addition, 1)
needle2 = "  .right-actions { right: max(12px, env(safe-area-inset-right)); bottom: max(9px, env(safe-area-inset-bottom)); gap: 5px; }"
addition2 = needle2 + "\n  .look-pad { right: max(156px, calc(env(safe-area-inset-right) + 146px)); top: 22%; width: 62px; height: 52%; border-radius: 18px; }\n  .look-pad span { font-size: 8px; }"
if needle2 not in s:
    raise SystemExit('missing compact CSS right-actions marker')
s = s.replace(needle2, addition2, 1)
p.write_text(s)
