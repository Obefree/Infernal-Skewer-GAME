from pathlib import Path
import re

p = Path('src/game.js')
s = p.read_text()

def rep(old, new, label, count=1):
    global s
    if old not in s:
        raise SystemExit(f'missing patch target: {label}')
    s = s.replace(old, new, count)

rep("import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';", "import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';\nimport { createArenaNetwork } from './network.js';", 'network import')
rep("const rivalStateEl = document.querySelector('#rivalState');\nconst toastEl = document.querySelector('#toast');", "const rivalStateEl = document.querySelector('#rivalState');\nconst roundStateEl = document.querySelector('#roundState');\nconst onlineStateEl = document.querySelector('#onlineState');\nconst toastEl = document.querySelector('#toast');", 'online dom')
s = s.replace("const lookPad = document.querySelector('#lookPad');\n", '')
rep("let mobileLookPointer = null;\nlet lastLookX = 0;\nlet lastLookY = 0;\nlet mobileYaw = 0;\nlet mobilePitch = 0;", "let mobileYaw = 0;\nlet onlineCount = 1;\nlet roundEndsAt = Date.now() + 180000;\nlet roundId = 1;", 'mobile network state')

remote_block = r'''
const remotePlayers = new Map();
const networkTargets = [];
let network = null;

function removeNetworkTargets(ownerId) {
  for (let i = networkTargets.length - 1; i >= 0; i -= 1) {
    if (networkTargets[i].userData.remoteOwner === ownerId) networkTargets.splice(i, 1);
  }
}

function createRemoteChef(id, name = 'Chef') {
  const root = new THREE.Group();
  root.position.set(0, 0, -4);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x245b8a, roughness: 0.58, metalness: 0.08 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd07a5d, roughness: 0.68 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xe1dfd8, metalness: 0.9, roughness: 0.16 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.72, 6, 12), bodyMat);
  torso.position.y = 1.04;
  torso.castShadow = true;
  torso.userData.remoteOwner = id;
  torso.userData.remoteBody = true;
  root.add(torso);
  networkTargets.push(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), skinMat);
  head.position.y = 1.78;
  head.userData.remoteOwner = id;
  head.userData.remoteBody = true;
  root.add(head);
  networkTargets.push(head);
  const label = makeLabel(name, '#9bd7ff');
  label.position.y = 2.55;
  label.scale.set(2.6, 0.65, 1);
  root.add(label);
  const skewer = new THREE.Group();
  skewer.position.set(0.52, 1.0, -0.32);
  root.add(skewer);
  const r = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 2.2, 8), metalMat);
  r.rotation.x = Math.PI / 2;
  r.position.z = -0.95;
  skewer.add(r);
  const t = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.28, 8), metalMat);
  t.rotation.x = -Math.PI / 2;
  t.position.z = -2.18;
  skewer.add(t);
  const itemGroup = new THREE.Group();
  skewer.add(itemGroup);
  const remote = { id, name, root, itemGroup, items: [], score: 0, targetPosition: root.position.clone(), targetYaw: 0 };
  scene.add(root);
  remotePlayers.set(id, remote);
  return remote;
}

function rebuildRemoteSkewer(remote, items) {
  removeNetworkTargets(remote.id);
  remote.root.traverse((obj) => { if (obj.userData.remoteBody) networkTargets.push(obj); });
  remote.itemGroup.clear();
  remote.items = [...(items || [])];
  remote.items.forEach((type, index) => {
    if (!ingredientDefs[type]) return;
    const mesh = ingredientGeometry(type, 0.26);
    mesh.position.set(0, 0, -0.34 - index * 0.22);
    mesh.userData.remoteOwner = remote.id;
    mesh.userData.remoteIngredient = true;
    mesh.userData.remoteIngredientIndex = index;
    remote.itemGroup.add(mesh);
    networkTargets.push(mesh);
  });
}

function applyRemoteState(state) {
  let remote = remotePlayers.get(state.id);
  if (!remote) remote = createRemoteChef(state.id, state.name || 'Chef');
  remote.targetPosition.set(state.x || 0, 0, state.z || 0);
  remote.targetYaw = Number.isFinite(state.yaw) ? state.yaw : 0;
  remote.score = state.score || 0;
  const nextItems = state.items || [];
  if (JSON.stringify(nextItems) !== JSON.stringify(remote.items)) rebuildRemoteSkewer(remote, nextItems);
}

function syncRemotePresence(ids) {
  const live = new Set(ids);
  for (const [id, remote] of remotePlayers) {
    if (live.has(id)) continue;
    removeNetworkTargets(id);
    scene.remove(remote.root);
    remotePlayers.delete(id);
  }
}

function updateRemotePlayers(dt) {
  for (const remote of remotePlayers.values()) {
    remote.root.position.lerp(remote.targetPosition, Math.min(1, dt * 12));
    const delta = Math.atan2(Math.sin(remote.targetYaw - remote.root.rotation.y), Math.cos(remote.targetYaw - remote.root.rotation.y));
    remote.root.rotation.y += delta * Math.min(1, dt * 10);
  }
}

function handleRemoteHit(object) {
  const id = object.userData.remoteOwner;
  const remote = remotePlayers.get(id);
  if (!remote) return;
  if (!object.userData.remoteIngredient) {
    showToast('CLANG! AIM AT THE EXPOSED FOOD');
    return;
  }
  if (object.userData.remoteIngredientIndex !== remote.items.length - 1) {
    showToast('HIT THE EXPOSED END PIECE!');
    return;
  }
  network?.requestSteal(id);
  showToast(`STEAL REQUEST → ${remote.name}`, 0.8);
}
'''
rep("const rival = createRivalChef();", "const rival = createRivalChef();\n" + remote_block, 'remote players')
rep("scoreEl.textContent = `You: ${player.score} · Rival: ${rival.score}`;", "scoreEl.textContent = onlineCount > 1 ? `You: ${player.score} · Online: ${onlineCount}` : `You: ${player.score} · Rival: ${rival.score}`;", 'online score')

network_block = r'''
network = createArenaNetwork({
  onPlayerState: applyRemoteState,
  onPresence: ({ ids, count, room }) => {
    onlineCount = count;
    if (onlineStateEl) onlineStateEl.textContent = `Online: ${count} · room ${room}`;
    syncRemotePresence(ids);
    updateHUD();
  },
  onRound: ({ id, endsAt }) => { roundId = id; roundEndsAt = endsAt; },
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
  },
  onStealRequest: (from) => {
    if (!player.items.length) return;
    const type = player.items.pop();
    rebuildSkewerView();
    updateHUD();
    network.grantSteal(from, type);
    showToast(`ONLINE CHEF STOLE ${ingredientDefs[type].emoji}!`, 1.1);
  },
  onStealGrant: (type) => {
    if (addIngredient(type)) showToast(`ONLINE STEAL! ${ingredientDefs[type].emoji}`, 1.1);
  },
});
window.addEventListener('beforeunload', () => network?.disconnect());
'''
rep("function loseRivalLast(reason = 'RIVAL DROPPED') {", network_block + "\nfunction loseRivalLast(reason = 'RIVAL DROPPED') {", 'network init')
rep("const targets = [...rivalTargets, ...droppedTargets, ...activeHarvestTargets];", "const targets = [...networkTargets, ...rivalTargets, ...droppedTargets, ...activeHarvestTargets];", 'network targets')
rep("  if (hit.userData.rivalIngredient || hit.userData.rivalBody) {", "  if (hit.userData.remoteOwner) {\n    handleRemoteHit(hit);\n    return;\n  }\n\n  if (hit.userData.rivalIngredient || hit.userData.rivalBody) {", 'remote hit')

s = re.sub(r"\nif \(lookPad\) \{.*?\n\}\n\nfunction updateOrientationHint", "\nfunction updateOrientationHint", s, flags=re.S)
rep("    try { if (screen.orientation?.lock) await screen.orientation.lock('landscape'); } catch {}", "    try { if (screen.orientation?.lock) await screen.orientation.lock('landscape'); } catch {}\n    mobileYaw = camera.rotation.y;", 'initial mobile yaw')
rep("""  if (MOBILE) {
    forward = mobileMove.y;
    right = mobileMove.x;
  } else {""", """  if (MOBILE) {
    mobileYaw -= mobileMove.x * 2.5 * dt;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = mobileYaw;
    camera.rotation.x = 0;
    forward = mobileMove.y;
    right = 0;
  } else {""", 'one stick mobile steering')

online_update = r'''
function updateOnline(dt) {
  network?.update(Date.now());
  network?.sendPlayerState({ x: camera.position.x, z: camera.position.z, yaw: camera.rotation.y, items: player.items, score: player.score });
  updateRemotePlayers(dt);
  const remaining = Math.max(0, roundEndsAt - Date.now());
  const seconds = Math.ceil(remaining / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  if (roundStateEl) roundStateEl.textContent = `Round ${roundId}: ${mm}:${ss}`;
}
'''
rep("function animate() {", online_update + "\nfunction animate() {", 'online updater')
rep("  updateHog(dt);\n  updateRival(dt);\n  updateRivalPlayerBump();", "  updateHog(dt);\n  rival.root.visible = onlineCount <= 1;\n  if (onlineCount <= 1) {\n    updateRival(dt);\n    updateRivalPlayerBump();\n  }\n  updateOnline(dt);", 'hide bot online')

p.write_text(s)
