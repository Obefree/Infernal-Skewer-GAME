from pathlib import Path

p = Path('src/game.js')
s = p.read_text()

def rep(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'missing patch target: {label}')
    s = s.replace(old, new, 1)

rep("""const mobileMove = new THREE.Vector2();
let mobileYaw = 0;""", """const mobileMove = new THREE.Vector2();
const mobileMoveSmoothed = new THREE.Vector2();
let mobileYaw = 0;""", 'mobile smoothing vector')

rep("""function updateMobileAutoPitch(dt) {
  if (!MOBILE) return;""", """function updateMobileAutoPitch(dt) {
  if (!MOBILE) return;""", 'auto pitch marker')

rep("""  camera.rotation.x += (desiredPitch - camera.rotation.x) * Math.min(1, dt * 7.5);""", """  camera.rotation.x += (desiredPitch - camera.rotation.x) * Math.min(1, dt * 5.4);""", 'softer auto pitch')

old_mobile = """  if (MOBILE) {
    mobileYaw -= mobileMove.x * 2.5 * dt;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = mobileYaw;
    updateMobileAutoPitch(dt);
    forward = mobileMove.y;
    right = 0;
  } else {"""
new_mobile = """  if (MOBILE) {
    const smooth = Math.min(1, dt * 7.0);
    mobileMoveSmoothed.lerp(mobileMove, smooth);
    mobileYaw -= mobileMoveSmoothed.x * 1.75 * dt;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = mobileYaw;
    updateMobileAutoPitch(dt);
    forward = mobileMoveSmoothed.y * 0.82;
    right = 0;
  } else {"""
rep(old_mobile, new_mobile, 'mobile speed turn smoothing')

old_roam = """  if (hog.userData.state === 'roam') {
    hog.userData.timer -= dt;
    hog.rotation.y += dt * 0.45;
    if (hog.userData.timer <= 0) {
      const targetRival = botEnabled && onlineCount <= 1 && Math.random() < 0.35;
      hog.userData.chargeTarget = targetRival ? 'rival' : 'player';
      const target = targetRival
        ? new THREE.Vector3(rival.root.position.x, 0, rival.root.position.z)
        : new THREE.Vector3(camera.position.x, 0, camera.position.z);
      const direction = target.sub(hog.position).setY(0).normalize();
      hog.userData.velocity.copy(direction.multiplyScalar(12.5));
      hog.lookAt(hog.position.clone().add(direction));
      setHogState('charge');
      showToast(`🐗 HOG CHARGE → ${targetRival ? 'RIVAL' : 'YOU'}!`, 0.7);
    }
    return;
  }

  hog.position.addScaledVector(hog.userData.velocity, dt);"""
new_roam = """  if (hog.userData.state === 'roam') {
    // Passive Hog: it never initiates a charge. It only idles/wanders visually
    // and can be displaced by player STAB hits.
    hog.userData.velocity.set(0, 0, 0);
    hog.userData.timer -= dt;
    hog.rotation.y += Math.sin(clock.elapsedTime * 0.45) * dt * 0.16;
    if (hog.userData.timer <= 0) hog.userData.timer = THREE.MathUtils.randFloat(1.6, 3.4);
    return;
  }

  hog.position.addScaledVector(hog.userData.velocity, dt);"""
rep(old_roam, new_roam, 'passive hog')

# The old charge-hit punishment remains unreachable unless a future state explicitly starts charge.
# Update HUD wording so behavior is obvious.
rep("""    : '🐗 STAB TO PUSH → PIN TO WALL FOR MEAT';""", """    : '🐗 PASSIVE — STAB TO PUSH → PIN TO WALL';""", 'passive hog hud')

# Make mobile weapon bob use smoothed movement too, so visuals match input feel.
rep("""  const moving = MOBILE ? mobileMove.length() > 0.1 : keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD');""", """  const moving = MOBILE ? mobileMoveSmoothed.length() > 0.1 : keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD');""", 'smoothed mobile bob')

p.write_text(s)
