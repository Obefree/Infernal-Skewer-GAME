from pathlib import Path

p = Path('src/game.js')
s = p.read_text()

def rep(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'missing patch target: {label}')
    s = s.replace(old, new, 1)

rep("  hogStateEl.textContent = `Mega Hog: ${hog.userData.state}`;", """  hogStateEl.textContent = hog.userData.state === 'stunned'
    ? '🐗 STUNNED — GET CLOSE + STAB → 🥩'
    : '🐗 MEAT — BAIT HOG INTO A WALL';""", 'hog hud instructions')

marker = """function thrust() {
  if (!controls.isLocked && !MOBILE) return;"""
assist = r'''function getMobileAssistTarget(maxRange = 4.0) {
  if (!MOBILE) return null;

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
  forward.normalize();

  const activeHarvestTargets = harvestTargets.filter((target) =>
    target.userData.harvestRoot === hog || target.userData.harvestRoot?.userData.active !== false
  );
  const candidates = [
    ...networkTargets,
    ...(onlineCount <= 1 ? rivalTargets : []),
    ...droppedTargets,
    ...activeHarvestTargets,
  ];

  let best = null;
  let bestScore = Infinity;
  const world = new THREE.Vector3();
  const flat = new THREE.Vector3();

  for (const target of candidates) {
    if (!target) continue;
    const root = target.userData.harvestRoot;
    if (root && root !== hog && root.userData.active === false) continue;

    target.getWorldPosition(world);
    flat.set(world.x - camera.position.x, 0, world.z - camera.position.z);
    const distance = flat.length();
    if (distance < 0.05 || distance > maxRange) continue;
    flat.normalize();
    const dot = forward.dot(flat);

    const isStunnedHog = root === hog && hog.userData.state === 'stunned';
    const isFood = Boolean(target.userData.remoteIngredient || target.userData.rivalIngredient || target.userData.dropType || (root && root !== hog));
    const minDot = isStunnedHog ? 0.35 : (isFood ? 0.62 : 0.76);
    if (dot < minDot) continue;

    let priority = 3;
    if (isStunnedHog) priority = 0;
    else if (target.userData.remoteIngredient || target.userData.rivalIngredient) priority = 1;
    else if (target.userData.dropType || (root && root !== hog)) priority = 2;

    const score = priority * 8 + distance - dot * 1.4;
    if (score < bestScore) {
      bestScore = score;
      best = target;
    }
  }
  return best;
}

function updateMobileAutoPitch(dt) {
  if (!MOBILE) return;
  const target = getMobileAssistTarget(5.2);
  let desiredPitch = 0;
  if (target) {
    const world = new THREE.Vector3();
    target.getWorldPosition(world);
    const horizontal = Math.hypot(world.x - camera.position.x, world.z - camera.position.z);
    desiredPitch = THREE.MathUtils.clamp(
      Math.atan2(world.y - camera.position.y, Math.max(0.25, horizontal)),
      -0.58,
      0.18,
    );
  }
  camera.rotation.x += (desiredPitch - camera.rotation.x) * Math.min(1, dt * 7.5);
}

function thrust() {
  if (!controls.isLocked && !MOBILE) return;'''
rep(marker, assist, 'mobile assist helpers')

old_raycast = """  raycaster.setFromCamera(center, camera);
  raycaster.far = THRUST_RANGE;
  const activeHarvestTargets = harvestTargets.filter((target) => target.userData.harvestRoot === hog || target.userData.harvestRoot?.userData.active !== false);
  const targets = [...networkTargets, ...rivalTargets, ...droppedTargets, ...activeHarvestTargets];
  const hits = raycaster.intersectObjects(targets, false);
  if (!hits.length) return;
  const hit = hits[0].object;"""
new_raycast = """  let hit = null;
  if (MOBILE) {
    hit = getMobileAssistTarget(4.15);
    if (!hit) {
      showToast('FACE THE TARGET AND MOVE CLOSER');
      return;
    }
  } else {
    raycaster.setFromCamera(center, camera);
    raycaster.far = THRUST_RANGE;
    const activeHarvestTargets = harvestTargets.filter((target) => target.userData.harvestRoot === hog || target.userData.harvestRoot?.userData.active !== false);
    const targets = [...networkTargets, ...rivalTargets, ...droppedTargets, ...activeHarvestTargets];
    const hits = raycaster.intersectObjects(targets, false);
    if (!hits.length) return;
    hit = hits[0].object;
  }"""
rep(old_raycast, new_raycast, 'mobile assisted thrust')

old_hog = """    if (hog.userData.state === 'stunned' && hog.userData.harvestCooldown <= 0) {
      if (addIngredient('meat')) hog.userData.harvestCooldown = 0.55;
    } else {
      showToast('BAIT THE HOG INTO A WALL!');
    }"""
new_hog = """    if (hog.userData.state === 'stunned' && hog.userData.harvestCooldown <= 0) {
      if (addIngredient('meat')) {
        hog.userData.harvestCooldown = 0.55;
        showToast('🥩 MEAT ON YOUR SKEWER!', 1.2);
      }
    } else if (hog.userData.state === 'stunned') {
      showToast('HOG IS STUNNED — STAB AGAIN!', 0.8);
    } else {
      showToast('🐗 BAIT THE HOG INTO A WALL FIRST!', 1.2);
    }"""
rep(old_hog, new_hog, 'hog harvest feedback')

old_mobile = """    camera.rotation.order = 'YXZ';
    camera.rotation.y = mobileYaw;
    camera.rotation.x = 0;
    forward = mobileMove.y;"""
new_mobile = """    camera.rotation.order = 'YXZ';
    camera.rotation.y = mobileYaw;
    updateMobileAutoPitch(dt);
    forward = mobileMove.y;"""
rep(old_mobile, new_mobile, 'mobile auto pitch')

p.write_text(s)
