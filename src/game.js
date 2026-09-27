import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const canvas = document.querySelector('#game');
const startScreen = document.querySelector('#start');
const startButton = document.querySelector('#startButton');
const slotsEl = document.querySelector('#slots');
const recipesEl = document.querySelector('#recipes');
const scoreEl = document.querySelector('#score');
const hogStateEl = document.querySelector('#hogState');
const skewerCountEl = document.querySelector('#skewerCount');
const toastEl = document.querySelector('#toast');

const MAX_SKEWER = 8;
const ARENA_HALF = 18;
const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.42;
const WALK_SPEED = 6.2;
const SPRINT_SPEED = 9.2;
const JUMP_SPEED = 7.1;
const GRAVITY = 19.5;
const THRUST_COOLDOWN = 0.36;
const THRUST_RANGE = 3.25;

const ingredientDefs = {
  meat: { emoji: '🥩', color: 0x8e2c25, shape: 'cube' },
  onion: { emoji: '🧅', color: 0xb897d8, shape: 'sphere' },
  tomato: { emoji: '🍅', color: 0xe13a25, shape: 'sphere' },
  cheese: { emoji: '🧀', color: 0xf4c83f, shape: 'cube' },
  pepper: { emoji: '🌶️', color: 0xc82316, shape: 'cone' },
  mushroom: { emoji: '🍄', color: 0xcbb396, shape: 'sphere' },
};

const recipes = [
  { name: 'Imp Snack', items: ['meat', 'onion'], points: 100 },
  { name: 'Hell Classic', items: ['meat', 'onion', 'tomato'], points: 220 },
  { name: "Devil's Stack", items: ['meat', 'pepper', 'cheese', 'meat'], points: 500 },
];

recipesEl.innerHTML = recipes.map((recipe) => `
  <div class="recipe">
    <div class="recipe-row"><strong>${recipe.name}</strong><span class="recipe-points">${recipe.points}</span></div>
    <div class="recipe-items">${recipe.items.map((type) => ingredientDefs[type].emoji).join(' ')}</div>
  </div>
`).join('');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x160503);
scene.fog = new THREE.Fog(0x160503, 15, 48);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 120);
camera.position.set(0, PLAYER_HEIGHT, 13);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const controls = new PointerLockControls(camera, document.body);
controls.pointerSpeed = 0.9;

const hemi = new THREE.HemisphereLight(0xffb08b, 0x180504, 2.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd2b2, 2.6);
sun.position.set(7, 15, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);
const lavaLight = new THREE.PointLight(0xff3f0a, 65, 28, 2);
lavaLight.position.set(0, 5, 0);
scene.add(lavaLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2),
  new THREE.MeshStandardMaterial({ color: 0x32100b, roughness: 0.92, metalness: 0.05 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(ARENA_HALF * 2, 24, 0x8f321f, 0x512015);
grid.position.y = 0.006;
grid.material.opacity = 0.26;
grid.material.transparent = true;
scene.add(grid);

const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a1710, roughness: 0.78 });
for (const [x, z, sx, sz] of [
  [0, -ARENA_HALF, ARENA_HALF * 2 + 1, 1],
  [0, ARENA_HALF, ARENA_HALF * 2 + 1, 1],
  [-ARENA_HALF, 0, 1, ARENA_HALF * 2 + 1],
  [ARENA_HALF, 0, 1, ARENA_HALF * 2 + 1],
]) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, 3.4, sz), wallMat);
  wall.position.set(x, 1.7, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
}

for (const [x, z] of [[-7,-5],[7,-5],[-8,7],[8,7],[-4,1],[4,1]]) {
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.95, 4.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x5a1d13, roughness: 0.82 }),
  );
  pillar.position.set(x, 2.1, z);
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  scene.add(pillar);
}

function makeLabel(text, color = '#ffffff') {
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const ctx = labelCanvas.getContext('2d');
  ctx.font = '900 46px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(20, 24, 472, 80);
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(3.4, 0.85, 1);
  return sprite;
}

function ingredientGeometry(type, size = 0.5) {
  const def = ingredientDefs[type];
  let geometry;
  if (def.shape === 'cube') geometry = new THREE.BoxGeometry(size, size * 0.75, size * 0.8);
  else if (def.shape === 'cone') geometry = new THREE.ConeGeometry(size * 0.28, size * 0.95, 12);
  else geometry = new THREE.SphereGeometry(size * 0.52, 18, 14);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.58, metalness: 0.05 }),
  );
  mesh.castShadow = true;
  return mesh;
}

const harvestTargets = [];
const ingredientCreatures = [];
function spawnIngredient(type, x, z) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.userData.type = type;
  root.userData.phase = Math.random() * Math.PI * 2;
  root.userData.home = new THREE.Vector3(x, 0, z);

  const body = ingredientGeometry(type, 0.9);
  body.position.y = 0.78;
  body.userData.harvestRoot = root;
  root.add(body);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x120402 });
  for (const ex of [-0.16, 0.16]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), eyeMat);
    eye.position.set(ex, 0.92, -0.42);
    root.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), pupilMat);
    pupil.position.set(ex, 0.92, -0.48);
    root.add(pupil);
  }

  const label = makeLabel(`${ingredientDefs[type].emoji} ${type.toUpperCase()}`);
  label.position.y = 1.75;
  root.add(label);

  scene.add(root);
  ingredientCreatures.push(root);
  harvestTargets.push(body);
}

spawnIngredient('onion', -12, -8);
spawnIngredient('onion', -10, -11);
spawnIngredient('tomato', 12, -8);
spawnIngredient('tomato', 10, -11);
spawnIngredient('cheese', -12, 8);
spawnIngredient('cheese', -9, 10);
spawnIngredient('pepper', 12, 8);
spawnIngredient('pepper', 9, 10);
spawnIngredient('mushroom', -14, 0);
spawnIngredient('mushroom', 14, 0);

const grill = new THREE.Group();
grill.position.set(0, 0, 13.5);
const grillBase = new THREE.Mesh(
  new THREE.CylinderGeometry(1.65, 1.85, 1.1, 20),
  new THREE.MeshStandardMaterial({ color: 0x20100d, metalness: 0.55, roughness: 0.35 }),
);
grillBase.position.y = 0.55;
grillBase.castShadow = true;
grill.add(grillBase);
const fire = new THREE.PointLight(0xff5a12, 55, 12, 2);
fire.position.y = 2.3;
grill.add(fire);
const grillLabel = makeLabel('🔥 INFERNAL GRILL', '#ffb27a');
grillLabel.position.y = 2.35;
grill.add(grillLabel);
scene.add(grill);

const hog = new THREE.Group();
hog.position.set(0, 0, 0);
hog.userData.state = 'roam';
hog.userData.timer = 2.4;
hog.userData.stun = 0;
hog.userData.harvestCooldown = 0;
hog.userData.velocity = new THREE.Vector3();
const hogBody = new THREE.Mesh(
  new THREE.SphereGeometry(1.28, 28, 20),
  new THREE.MeshStandardMaterial({ color: 0x7a251d, roughness: 0.68 }),
);
hogBody.scale.set(1.35, 0.88, 1.55);
hogBody.position.y = 1.05;
hogBody.castShadow = true;
hogBody.userData.harvestRoot = hog;
hog.add(hogBody);
const snout = new THREE.Mesh(
  new THREE.BoxGeometry(0.9, 0.55, 0.45),
  new THREE.MeshStandardMaterial({ color: 0xb84d3b, roughness: 0.7 }),
);
snout.position.set(0, 0.98, -1.35);
hog.add(snout);
for (const x of [-0.68, 0.68]) {
  const tusk = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.7, 12),
    new THREE.MeshStandardMaterial({ color: 0xf0ddc0, roughness: 0.5 }),
  );
  tusk.rotation.x = Math.PI / 2;
  tusk.position.set(x, 0.86, -1.5);
  hog.add(tusk);
}
const hogLabel = makeLabel('🐗 MEGA HOG', '#ff9a6c');
hogLabel.position.y = 2.8;
hog.add(hogLabel);
scene.add(hog);
harvestTargets.push(hogBody);

const skewerView = new THREE.Group();
skewerView.position.set(0.52, -0.42, -0.82);
skewerView.rotation.set(-0.12, -0.18, -0.42);
camera.add(skewerView);
const handle = new THREE.Mesh(
  new THREE.CylinderGeometry(0.05, 0.065, 0.38, 12),
  new THREE.MeshStandardMaterial({ color: 0x2b120c, roughness: 0.7 }),
);
handle.rotation.z = Math.PI / 2;
handle.position.x = -0.14;
skewerView.add(handle);
const rod = new THREE.Mesh(
  new THREE.CylinderGeometry(0.012, 0.012, 1.55, 8),
  new THREE.MeshStandardMaterial({ color: 0xd9d7cf, metalness: 0.9, roughness: 0.18 }),
);
rod.rotation.z = Math.PI / 2;
rod.position.x = 0.78;
skewerView.add(rod);
const tip = new THREE.Mesh(
  new THREE.ConeGeometry(0.045, 0.22, 8),
  rod.material,
);
tip.rotation.z = -Math.PI / 2;
tip.position.x = 1.65;
skewerView.add(tip);
const skewerItemGroup = new THREE.Group();
skewerView.add(skewerItemGroup);

const player = {
  score: 0,
  items: [],
  velocityY: 0,
  grounded: true,
  lastThrustAt: -999,
  thrustAnim: 0,
};

const keys = new Set();
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
const clock = new THREE.Clock();
let toastTimeout = 0;

function showToast(text, seconds = 1) {
  toastEl.textContent = text;
  toastEl.classList.remove('hidden');
  toastTimeout = seconds;
}

function updateHUD() {
  slotsEl.innerHTML = '';
  for (let i = 0; i < MAX_SKEWER; i += 1) {
    const slot = document.createElement('div');
    slot.className = `slot${player.items[i] ? ' filled' : ''}`;
    slot.textContent = player.items[i] ? ingredientDefs[player.items[i]].emoji : '·';
    slotsEl.appendChild(slot);
  }
  scoreEl.textContent = `Score: ${player.score}`;
  skewerCountEl.textContent = `Skewer: ${player.items.length}/${MAX_SKEWER}`;
  hogStateEl.textContent = `Mega Hog: ${hog.userData.state}`;
}

function rebuildSkewerView() {
  skewerItemGroup.clear();
  player.items.forEach((type, index) => {
    const mesh = ingredientGeometry(type, 0.17);
    mesh.position.x = 0.22 + index * 0.16;
    mesh.rotation.set(Math.random() * 0.4, Math.random() * 0.4, Math.random() * 0.4);
    skewerItemGroup.add(mesh);
  });
}

function addIngredient(type) {
  if (player.items.length >= MAX_SKEWER) {
    showToast('SKEWER FULL — 8/8');
    return false;
  }
  player.items.push(type);
  rebuildSkewerView();
  updateHUD();
  showToast(`+ ${ingredientDefs[type].emoji} ${type.toUpperCase()}`);
  return true;
}

function loseLastIngredient(reason) {
  if (!player.items.length) return;
  const type = player.items.pop();
  rebuildSkewerView();
  updateHUD();
  showToast(`${reason}: ${ingredientDefs[type].emoji}`);
}

function respawnCreature(creature) {
  const angle = Math.random() * Math.PI * 2;
  creature.position.copy(creature.userData.home);
  creature.position.x += Math.cos(angle) * 1.2;
  creature.position.z += Math.sin(angle) * 1.2;
}

function thrust() {
  if (!controls.isLocked) return;
  const now = clock.elapsedTime;
  if (now - player.lastThrustAt < THRUST_COOLDOWN) return;
  player.lastThrustAt = now;
  player.thrustAnim = 1;

  raycaster.setFromCamera(center, camera);
  raycaster.far = THRUST_RANGE;
  const hits = raycaster.intersectObjects(harvestTargets, false);
  if (!hits.length) return;

  const root = hits[0].object.userData.harvestRoot;
  if (!root) return;

  if (root === hog) {
    if (hog.userData.state === 'stunned' && hog.userData.harvestCooldown <= 0) {
      if (addIngredient('meat')) hog.userData.harvestCooldown = 0.55;
    } else {
      showToast('BAIT THE HOG INTO A WALL!');
    }
    return;
  }

  const type = root.userData.type;
  if (type && addIngredient(type)) respawnCreature(root);
}

function tryDeliver() {
  const flatDistance = Math.hypot(camera.position.x - grill.position.x, camera.position.z - grill.position.z);
  if (flatDistance > 3.2) {
    showToast('GET CLOSER TO THE 🔥 GRILL');
    return;
  }
  const recipe = recipes.find((r) => r.items.length === player.items.length && r.items.every((type, index) => player.items[index] === type));
  if (!recipe) {
    showToast(player.items.length ? 'WRONG RECIPE OR ORDER' : 'EMPTY SKEWER');
    return;
  }
  player.score += recipe.points;
  player.items = [];
  rebuildSkewerView();
  updateHUD();
  showToast(`🔥 ${recipe.name.toUpperCase()} +${recipe.points}`, 1.4);
}

function startGame() {
  controls.lock();
}

startButton.addEventListener('click', startGame);
controls.addEventListener('lock', () => startScreen.classList.add('hidden'));
controls.addEventListener('unlock', () => startScreen.classList.remove('hidden'));
document.addEventListener('keydown', (event) => {
  keys.add(event.code);
  if (event.code === 'Space' && controls.isLocked && player.grounded) {
    player.velocityY = JUMP_SPEED;
    player.grounded = false;
  }
  if (event.code === 'KeyE') tryDeliver();
});
document.addEventListener('keyup', (event) => keys.delete(event.code));
document.addEventListener('mousedown', (event) => {
  if (event.button === 0) thrust();
});

function updateMovement(dt) {
  if (!controls.isLocked) return;
  let forward = 0;
  let right = 0;
  if (keys.has('KeyW')) forward += 1;
  if (keys.has('KeyS')) forward -= 1;
  if (keys.has('KeyD')) right += 1;
  if (keys.has('KeyA')) right -= 1;

  if (forward || right) {
    const length = Math.hypot(forward, right);
    forward /= length;
    right /= length;
    const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? SPRINT_SPEED : WALK_SPEED;
    controls.moveForward(forward * speed * dt);
    controls.moveRight(right * speed * dt);
  }

  player.velocityY -= GRAVITY * dt;
  camera.position.y += player.velocityY * dt;
  if (camera.position.y <= PLAYER_HEIGHT) {
    camera.position.y = PLAYER_HEIGHT;
    player.velocityY = 0;
    player.grounded = true;
  }

  const limit = ARENA_HALF - PLAYER_RADIUS - 0.6;
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limit, limit);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limit, limit);
}

function updateCreatures(dt, time) {
  ingredientCreatures.forEach((creature) => {
    const phase = creature.userData.phase;
    creature.position.y = Math.sin(time * 2.2 + phase) * 0.05;
    creature.rotation.y += dt * 0.5;
    const dx = camera.position.x - creature.position.x;
    const dz = camera.position.z - creature.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 3.8 && distance > 0.01) {
      creature.position.x -= (dx / distance) * dt * 0.7;
      creature.position.z -= (dz / distance) * dt * 0.7;
    }
    creature.position.x = THREE.MathUtils.clamp(creature.position.x, -ARENA_HALF + 1.4, ARENA_HALF - 1.4);
    creature.position.z = THREE.MathUtils.clamp(creature.position.z, -ARENA_HALF + 1.4, ARENA_HALF - 1.4);
  });
}

function setHogState(state) {
  hog.userData.state = state;
  updateHUD();
}

function updateHog(dt) {
  hog.userData.harvestCooldown = Math.max(0, hog.userData.harvestCooldown - dt);

  if (hog.userData.state === 'stunned') {
    hog.userData.stun -= dt;
    hog.rotation.z = Math.sin(clock.elapsedTime * 18) * 0.05;
    if (hog.userData.stun <= 0) {
      hog.rotation.z = 0;
      hog.userData.timer = 2.3;
      setHogState('roam');
    }
    return;
  }

  if (hog.userData.state === 'roam') {
    hog.userData.timer -= dt;
    hog.rotation.y += dt * 0.45;
    if (hog.userData.timer <= 0) {
      const target = new THREE.Vector3(camera.position.x, 0, camera.position.z);
      const direction = target.sub(hog.position).setY(0).normalize();
      hog.userData.velocity.copy(direction.multiplyScalar(12.5));
      hog.lookAt(hog.position.clone().add(direction));
      setHogState('charge');
      showToast('🐗 MEGA HOG CHARGE!', 0.7);
    }
    return;
  }

  hog.position.addScaledVector(hog.userData.velocity, dt);

  const hitWall = Math.abs(hog.position.x) > ARENA_HALF - 1.8 || Math.abs(hog.position.z) > ARENA_HALF - 1.8;
  if (hitWall) {
    hog.position.x = THREE.MathUtils.clamp(hog.position.x, -ARENA_HALF + 1.8, ARENA_HALF - 1.8);
    hog.position.z = THREE.MathUtils.clamp(hog.position.z, -ARENA_HALF + 1.8, ARENA_HALF - 1.8);
    hog.userData.stun = 3.2;
    setHogState('stunned');
    showToast('🐗 STUNNED — STAB FOR MEAT!', 1.25);
    return;
  }

  const dx = camera.position.x - hog.position.x;
  const dz = camera.position.z - hog.position.z;
  if (Math.hypot(dx, dz) < 1.65) {
    const knock = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(2.5);
    camera.position.add(knock);
    player.velocityY = Math.max(player.velocityY, 3.5);
    player.grounded = false;
    loseLastIngredient('HOG KNOCKED OFF');
    hog.userData.timer = 2.8;
    setHogState('roam');
  }
}

function animateWeapon(dt) {
  if (player.thrustAnim > 0) {
    player.thrustAnim = Math.max(0, player.thrustAnim - dt * 5.2);
    const pulse = Math.sin((1 - player.thrustAnim) * Math.PI);
    skewerView.position.z = -0.82 - pulse * 0.48;
  } else {
    skewerView.position.z += (-0.82 - skewerView.position.z) * Math.min(1, dt * 12);
  }
  skewerView.position.y = -0.42 + Math.sin(clock.elapsedTime * 8) * 0.006 * (keys.has('KeyW') ? 1 : 0);
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.04);
  const elapsed = clock.elapsedTime;

  updateMovement(dt);
  updateCreatures(dt, elapsed);
  updateHog(dt);
  animateWeapon(dt);

  fire.intensity = 48 + Math.sin(elapsed * 9) * 10 + Math.sin(elapsed * 15) * 5;
  lavaLight.intensity = 58 + Math.sin(elapsed * 2.4) * 8;

  if (toastTimeout > 0) {
    toastTimeout -= dt;
    if (toastTimeout <= 0) toastEl.classList.add('hidden');
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

updateHUD();
rebuildSkewerView();
animate();
