from pathlib import Path

p = Path('src/game.js')
s = p.read_text()

def rep(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'missing patch target: {label}')
    s = s.replace(old, new, 1)

rep("""  hogStateEl.textContent = hog.userData.state === 'stunned'
    ? '🐗 STUNNED — GET CLOSE + STAB → 🥩'
    : '🐗 MEAT — BAIT HOG INTO A WALL';""", """  hogStateEl.textContent = hog.userData.state === 'stunned'
    ? '🐗 PINNED! 2s — STAB → 🥩'
    : '🐗 STAB TO PUSH → PIN TO WALL FOR MEAT';""", 'hog hud')

old_hog_hit = """  if (root === hog) {
    if (hog.userData.state === 'stunned' && hog.userData.harvestCooldown <= 0) {
      if (addIngredient('meat')) {
        hog.userData.harvestCooldown = 0.55;
        showToast('🥩 MEAT ON YOUR SKEWER!', 1.2);
      }
    } else if (hog.userData.state === 'stunned') {
      showToast('HOG IS STUNNED — STAB AGAIN!', 0.8);
    } else {
      showToast('🐗 BAIT THE HOG INTO A WALL FIRST!', 1.2);
    }
    return;
  }"""
new_hog_hit = """  if (root === hog) {
    if (hog.userData.state === 'stunned') {
      if (hog.userData.harvestCooldown <= 0 && addIngredient('meat')) {
        hog.userData.harvestCooldown = 0.55;
        showToast('🥩 MEAT ON YOUR SKEWER!', 1.2);
      }
      return;
    }

    const push = hog.position.clone().sub(camera.position).setY(0);
    if (push.lengthSq() < 0.01) {
      camera.getWorldDirection(push);
      push.y = 0;
    }
    push.normalize();
    hog.position.addScaledVector(push, 2.35);
    hog.position.x = THREE.MathUtils.clamp(hog.position.x, -ARENA_HALF + 1.55, ARENA_HALF - 1.55);
    hog.position.z = THREE.MathUtils.clamp(hog.position.z, -ARENA_HALF + 1.55, ARENA_HALF - 1.55);
    hog.userData.velocity.set(0, 0, 0);

    const pinned = Math.abs(hog.position.x) >= ARENA_HALF - 1.7 || Math.abs(hog.position.z) >= ARENA_HALF - 1.7;
    if (pinned) {
      hog.userData.stun = 2.0;
      hog.userData.harvestCooldown = 0;
      setHogState('stunned');
      showToast('🐗 PINNED TO WALL! 2s — STAB FOR 🥩', 1.2);
    } else {
      hog.userData.timer = 0.85;
      setHogState('roam');
      showToast('🐗 PUSH IT INTO A WALL!', 0.65);
    }
    return;
  }"""
rep(old_hog_hit, new_hog_hit, 'hog stab push behavior')

old_wall = """  const hitWall = Math.abs(hog.position.x) > ARENA_HALF - 1.8 || Math.abs(hog.position.z) > ARENA_HALF - 1.8;
  if (hitWall) {
    hog.position.x = THREE.MathUtils.clamp(hog.position.x, -ARENA_HALF + 1.8, ARENA_HALF - 1.8);
    hog.position.z = THREE.MathUtils.clamp(hog.position.z, -ARENA_HALF + 1.8, ARENA_HALF - 1.8);
    hog.userData.stun = 3.2;
    setHogState('stunned');
    showToast('🐗 STUNNED — STAB FOR MEAT!', 1.25);
    return;
  }"""
new_wall = """  const hitWall = Math.abs(hog.position.x) > ARENA_HALF - 1.8 || Math.abs(hog.position.z) > ARENA_HALF - 1.8;
  if (hitWall) {
    hog.position.x = THREE.MathUtils.clamp(hog.position.x, -ARENA_HALF + 1.8, ARENA_HALF - 1.8);
    hog.position.z = THREE.MathUtils.clamp(hog.position.z, -ARENA_HALF + 1.8, ARENA_HALF - 1.8);
    hog.userData.velocity.set(0, 0, 0);
    hog.userData.timer = 1.15;
    setHogState('roam');
    return;
  }"""
rep(old_wall, new_wall, 'natural wall collision no meat')

old_stun_end = """      hog.userData.timer = 2.3;
      setHogState('roam');"""
new_stun_end = """      hog.userData.timer = 1.4;
      setHogState('roam');"""
rep(old_stun_end, new_stun_end, 'stun recovery')

# Make the hog a friendlier mobile aim target even before it is pinned.
rep("""    const isStunnedHog = root === hog && hog.userData.state === 'stunned';
    const isFood = Boolean(target.userData.remoteIngredient || target.userData.rivalIngredient || target.userData.dropType || (root && root !== hog));
    const minDot = isStunnedHog ? 0.35 : (isFood ? 0.62 : 0.76);""", """    const isHog = root === hog;
    const isStunnedHog = isHog && hog.userData.state === 'stunned';
    const isFood = Boolean(target.userData.remoteIngredient || target.userData.rivalIngredient || target.userData.dropType || (root && root !== hog));
    const minDot = isStunnedHog ? 0.35 : (isHog ? 0.55 : (isFood ? 0.62 : 0.76));""", 'mobile hog aim cone')

rep("""    let priority = 3;
    if (isStunnedHog) priority = 0;
    else if (target.userData.remoteIngredient || target.userData.rivalIngredient) priority = 1;
    else if (target.userData.dropType || (root && root !== hog)) priority = 2;""", """    let priority = 3;
    if (isStunnedHog) priority = 0;
    else if (target.userData.remoteIngredient || target.userData.rivalIngredient) priority = 1;
    else if (target.userData.dropType || (root && root !== hog)) priority = 2;
    else if (isHog) priority = 2;""", 'mobile hog priority')

p.write_text(s)
