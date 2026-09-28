from pathlib import Path

p = Path('src/game.js')
s = p.read_text()

def rep(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'missing patch target: {label}')
    s = s.replace(old, new, 1)

rep("""const rotateHint = document.querySelector('#rotateHint');""", """const rotateHint = document.querySelector('#rotateHint');
const playerNameInput = document.querySelector('#playerNameInput');
const botStartToggle = document.querySelector('#botStartToggle');
const botToggleButton = document.querySelector('#botToggleButton');""", 'lobby dom refs')

rep("""const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 900;""", """const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 900;
let gameStarted = false;
let botEnabled = localStorage.getItem('infernal-bot-enabled') === '1';
if (playerNameInput) playerNameInput.value = sessionStorage.getItem('infernal-player-name') || '';
if (botStartToggle) botStartToggle.checked = botEnabled;

function getViewportSize() {
  const vv = window.visualViewport;
  return {
    width: Math.max(1, Math.round(vv?.width || innerWidth)),
    height: Math.max(1, Math.round(vv?.height || innerHeight)),
  };
}""", 'mobile state and viewport helper')

rep("""const scene = new THREE.Scene();
scene.background = new THREE.Color(0x160503);
scene.fog = new THREE.Fog(0x160503, 15, 48);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 120);""", """const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2b0c08);
scene.fog = new THREE.Fog(0x2b0c08, 22, 62);

const initialViewport = getViewportSize();
const camera = new THREE.PerspectiveCamera(72, initialViewport.width / initialViewport.height, 0.05, 120);""", 'brighter scene and viewport camera')

rep("""renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);""", """renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(initialViewport.width, initialViewport.height, false);""", 'renderer initial viewport')

rep("""renderer.toneMappingExposure = 1.25;""", """renderer.toneMappingExposure = 1.62;""", 'exposure')
rep("""const hemi = new THREE.HemisphereLight(0xffb08b, 0x180504, 2.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd2b2, 2.6);""", """const hemi = new THREE.HemisphereLight(0xffcfb6, 0x35120c, 3.25);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0xffc7ad, 0.72);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffe2c8, 3.7);""", 'lighting boost')
rep("""new THREE.MeshStandardMaterial({ color: 0x32100b, roughness: 0.92, metalness: 0.05 }),""", """new THREE.MeshStandardMaterial({ color: 0x512017, roughness: 0.9, metalness: 0.04 }),""", 'floor brightness')
rep("""const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a1710, roughness: 0.78 });""", """const wallMat = new THREE.MeshStandardMaterial({ color: 0x6a291e, roughness: 0.76 });""", 'wall brightness')
rep("""new THREE.MeshStandardMaterial({ color: 0x5a1d13, roughness: 0.82 }),""", """new THREE.MeshStandardMaterial({ color: 0x783126, roughness: 0.8 }),""", 'pillar brightness')

rep("""function currentRivalRecipe() {
  return recipes[rival.recipeIndex % recipes.length];
}

function updateHUD() {""", """function currentRivalRecipe() {
  return recipes[rival.recipeIndex % recipes.length];
}

function setBotEnabled(enabled, announce = true) {
  botEnabled = Boolean(enabled);
  localStorage.setItem('infernal-bot-enabled', botEnabled ? '1' : '0');
  if (botStartToggle) botStartToggle.checked = botEnabled;
  rival.root.visible = botEnabled && onlineCount <= 1;
  if (botToggleButton) botToggleButton.textContent = `BOT: ${botEnabled ? 'ON' : 'OFF'}`;
  updateHUD();
  if (announce) showToast(botEnabled ? '😈 RIVAL BOT ON' : 'BOT OFF — SOLO ARENA', 0.9);
}

function updateHUD() {""", 'bot state helper')

rep("""  scoreEl.textContent = onlineCount > 1 ? `You: ${player.score} · Online: ${onlineCount}` : `You: ${player.score} · Rival: ${rival.score}`;""", """  scoreEl.textContent = onlineCount > 1
    ? `You: ${player.score} · Online: ${onlineCount}`
    : (botEnabled ? `You: ${player.score} · Bot: ${rival.score}` : `You: ${player.score}`);""", 'hud score bot')
rep("""  if (rivalStateEl) {
    const itemText = rival.items.map((type) => ingredientDefs[type].emoji).join('') || '—';
    rivalStateEl.textContent = `Rival: ${itemText} (${rival.items.length}/8)`;
  }
}""", """  if (rivalStateEl) {
    if (botEnabled && onlineCount <= 1) {
      const itemText = rival.items.map((type) => ingredientDefs[type].emoji).join('') || '—';
      rivalStateEl.textContent = `Bot: ${itemText} (${rival.items.length}/8)`;
    } else {
      rivalStateEl.textContent = onlineCount > 1 ? 'Bot hidden — real players online' : 'Bot: OFF';
    }
  }
  if (botToggleButton) botToggleButton.textContent = `BOT: ${botEnabled ? 'ON' : 'OFF'}`;
}""", 'rival hud bot')

rep("""    const targets = [...networkTargets, ...rivalTargets, ...droppedTargets, ...activeHarvestTargets];""", """    const targets = [...networkTargets, ...(botEnabled && onlineCount <= 1 ? rivalTargets : []), ...droppedTargets, ...activeHarvestTargets];""", 'desktop hidden bot raycast')
rep("""    ...(onlineCount <= 1 ? rivalTargets : []),""", """    ...(botEnabled && onlineCount <= 1 ? rivalTargets : []),""", 'mobile hidden bot raycast')

rep("""async function startGame() {
  if (MOBILE) {""", """async function startGame() {
  const requestedName = playerNameInput?.value.trim() || '';
  if (!requestedName) {
    playerNameInput?.focus();
    playerNameInput?.setAttribute('placeholder', 'Enter your name first');
    return;
  }
  await network?.setPlayerName(requestedName);
  gameStarted = true;
  setBotEnabled(Boolean(botStartToggle?.checked), false);

  if (MOBILE) {""", 'start with name and bot')

rep("""startButton.addEventListener('click', startGame);
controls.addEventListener('lock', () => startScreen.classList.add('hidden'));""", """startButton.addEventListener('click', startGame);
botToggleButton?.addEventListener('click', () => setBotEnabled(!botEnabled));
playerNameInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    startGame();
  }
});
controls.addEventListener('lock', () => startScreen.classList.add('hidden'));""", 'lobby listeners')

rep("""  const orientationType = screen.orientation?.type || '';
  const landscape = innerWidth >= innerHeight || orientationType.startsWith('landscape');""", """  const orientationType = screen.orientation?.type || '';
  const viewport = getViewportSize();
  const landscape = viewport.width >= viewport.height || orientationType.startsWith('landscape');""", 'orientation visual viewport')

rep("""    const rivalDx = rival.root.position.x - creature.position.x;
    const rivalDz = rival.root.position.z - creature.position.z;
    const rivalDistance = Math.hypot(rivalDx, rivalDz);""", """    const rivalActive = botEnabled && onlineCount <= 1;
    const rivalDx = rival.root.position.x - creature.position.x;
    const rivalDz = rival.root.position.z - creature.position.z;
    const rivalDistance = rivalActive ? Math.hypot(rivalDx, rivalDz) : Infinity;""", 'creature bot avoidance')

rep("""      const targetRival = Math.random() < 0.35;""", """      const targetRival = botEnabled && onlineCount <= 1 && Math.random() < 0.35;""", 'hog bot target')
rep("""  const rdx = rival.root.position.x - hog.position.x;
  const rdz = rival.root.position.z - hog.position.z;
  if (Math.hypot(rdx, rdz) < 1.8) {""", """  const rdx = rival.root.position.x - hog.position.x;
  const rdz = rival.root.position.z - hog.position.z;
  if (botEnabled && onlineCount <= 1 && Math.hypot(rdx, rdz) < 1.8) {""", 'hog hidden bot collision')

rep("""function updateOnline(dt) {
  network?.update(Date.now());
  network?.sendPlayerState({ x: camera.position.x, z: camera.position.z, yaw: camera.rotation.y, items: player.items, score: player.score });""", """function updateOnline(dt) {
  network?.update(Date.now());
  if (gameStarted) {
    network?.sendPlayerState({ x: camera.position.x, z: camera.position.z, yaw: camera.rotation.y, items: player.items, score: player.score });
  }""", 'only broadcast active player')

rep("""  rival.root.visible = onlineCount <= 1;
  if (onlineCount <= 1) {
    updateRival(dt);
    updateRivalPlayerBump();
  }""", """  rival.root.visible = botEnabled && onlineCount <= 1;
  if (botEnabled && onlineCount <= 1) {
    updateRival(dt);
    updateRivalPlayerBump();
  }""", 'animate bot toggle')

old_resize = """addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});"""
new_resize = """function resizeViewport() {
  const { width, height } = getViewportSize();
  document.documentElement.style.setProperty('--app-h', `${height}px`);
  camera.aspect = width / height;
  camera.fov = MOBILE && width / height > 1.95 ? 65 : 72;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
}

addEventListener('resize', resizeViewport);
visualViewport?.addEventListener('resize', resizeViewport);
visualViewport?.addEventListener('scroll', resizeViewport);
resizeViewport();"""
rep(old_resize, new_resize, 'visual viewport resize')

rep("""updateHUD();
rebuildSkewerView();
rebuildRivalSkewer();
animate();""", """updateHUD();
rebuildSkewerView();
rebuildRivalSkewer();
setBotEnabled(botEnabled, false);
animate();""", 'initial bot state')

p.write_text(s)
