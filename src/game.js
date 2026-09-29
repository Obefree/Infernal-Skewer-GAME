import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createArenaNetwork } from './network.js';

const canvas = document.querySelector('#game');
const startScreen = document.querySelector('#start');
const startButton = document.querySelector('#startButton');
const slotsEl = document.querySelector('#slots');
const recipesEl = document.querySelector('#recipes');
const scoreEl = document.querySelector('#score');
const hogStateEl = document.querySelector('#hogState');
const skewerCountEl = document.querySelector('#skewerCount');
const rivalStateEl = document.querySelector('#rivalState');
const roundStateEl = document.querySelector('#roundState');
const onlineStateEl = document.querySelector('#onlineState');
const toastEl = document.querySelector('#toast');
const mobileControls = document.querySelector('#mobileControls');
const movePad = document.querySelector('#movePad');
const moveKnob = document.querySelector('#moveKnob');
const stabButton = document.querySelector('#stabButton');
const jumpButton = document.querySelector('#jumpButton');
const dropButton = document.querySelector('#dropButton');
const useButton = document.querySelector('#useButton');
const lookPad = document.querySelector('#lookPad');
const rotateHint = document.querySelector('#rotateHint');
const playerNameInput = document.querySelector('#playerNameInput');
const botStartToggle = document.querySelector('#botStartToggle');
const botToggleButton = document.querySelector('#botToggleButton');

const MAX_SKEWER = 8;
const ARENA_HALF = 22;
const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.42;
const WALK_SPEED = 6.2;
const SPRINT_SPEED = 9.2;
const JUMP_SPEED = 7.1;
const GRAVITY = 19.5;
const THRUST_COOLDOWN = 0.36;
const THRUST_RANGE = 3.25;
const DROP_LIFETIME = 18;
const CREATURE_RESPAWN_MIN = 3;
const CREATURE_RESPAWN_MAX = 6;
const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 900;
let gameStarted = false;
let botEnabled = localStorage.getItem('infernal-bot-enabled') === '1';
if (playerNameInput) playerNameInput.value = sessionStorage.getItem('infernal-player-name') || '';
if (botStartToggle) botStartToggle.checked = botEnabled;

function getViewportSize() {
  const vv = window.visualViewport;
  return {
    width: Math.max(1, Math.round(vv?.width || innerWidth)),
    height: Math.max(1, Math.round(vv?.height || innerHeight)),
    left: Math.round(vv?.offsetLeft || 0),
    top: Math.round(vv?.offsetTop || 0),
  };
}

const ingredientDefs = {
  meat: { emoji: '🥩', color: 0x8e2c25, shape: 'cube' },
  onion: { emoji: '🧅', color: 0xb897d8, shape: 'sphere' },
  tomato: { emoji: '🍅', color: 0xe13a25, shape: 'sphere' },
  cheese: { emoji: '🧀', color: 0xf4c83f, shape: 'cube' },
  pepper: { emoji: '🌶️', color: 0xc82316, shape: 'cone' },
  mushroom: { emoji: '🍄', color: 0xcbb396, shape: 'sphere' },
};

const recipeTemplates = [
  { id: 'garden-bite', name: 'Garden Bite', items: ['onion', 'tomato', 'mushroom'], points: 150, vegan: true },
  { id: 'fire-garden', name: 'Fire Garden', items: ['pepper', 'tomato', 'mushroom', 'onion'], points: 280, vegan: true },
  { id: 'green-tower', name: 'Green Tower', items: ['mushroom', 'onion', 'pepper', 'tomato', 'mushroom'], points: 360, vegan: true },
  { id: 'cheese-curse', name: 'Cheese Curse', items: ['cheese', 'tomato', 'pepper'], points: 220 },
  { id: 'imp-snack', name: 'Imp Snack', items: ['meat', 'onion'], points: 380, meatRecipe: true },
  { id: 'hell-classic', name: 'Hell Classic', items: ['meat', 'onion', 'tomato'], points: 520, meatRecipe: true },
  { id: 'boar-feast', name: 'Boar Feast', items: ['meat', 'onion', 'meat', 'pepper'], points: 850, meatRecipe: true },
  { id: 'devils-stack', name: "Devil's Stack", items: ['meat', 'pepper', 'cheese', 'meat'], points: 900, meatRecipe: true },
  { id: 'gluttons-spear', name: "Glutton's Spear", items: ['meat', 'onion', 'tomato', 'mushroom', 'pepper', 'cheese', 'meat', 'onion'], points: 1500, meatRecipe: true },
];

function seededRandom(seed) {
  let t = (seed >>> 0) || 1;
  return () => {
    t += 0x6D2B79F5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledCopy(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildRoundRecipes(id = 1) {
  const rng = seededRandom(0x51F15EED ^ Number(id || 1));
  const meat = shuffledCopy(recipeTemplates.filter((r) => r.meatRecipe), rng).slice(0, 3);
  const other = shuffledCopy(recipeTemplates.filter((r) => !r.meatRecipe), rng).slice(0, 3);
  return shuffledCopy([...meat, ...other], rng).map((template) => {
    const items = shuffledCopy(template.items, rng);
    return { ...template, items };
  });
}

let recipes = buildRoundRecipes(1);

function renderRecipes() {
  recipesEl.innerHTML = recipes.map((recipe) => `
    <div class="recipe${recipe.meatRecipe ? ' meat-recipe' : ''}">
      <div class="recipe-row"><strong>${recipe.vegan ? '🌱 ' : (recipe.meatRecipe ? '🐗 ' : '')}${recipe.name}</strong><span class="recipe-points">${recipe.points}</span></div>
      <div class="recipe-items">${recipe.items.map((type) => ingredientDefs[type].emoji).join(' ')}</div>
    </div>
  `).join('');
}

function setRecipesForRound(id) {
  recipes = buildRoundRecipes(id);
  rival.recipeIndex = Math.min(rival.recipeIndex || 0, recipes.length - 1);
  renderRecipes();
}

renderRecipes();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2b0c08);
scene.fog = new THREE.Fog(0x2b0c08, 28, 76);

const initialViewport = getViewportSize();
const camera = new THREE.PerspectiveCamera(72, initialViewport.width / initialViewport.height, 0.05, 120);
camera.position.set(0, PLAYER_HEIGHT, 16);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(initialViewport.width, initialViewport.height, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.62;

const controls = new PointerLockControls(camera, document.body);
controls.pointerSpeed = 0.9;

const hemi = new THREE.HemisphereLight(0xffcfb6, 0x35120c, 3.25);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0xffc7ad, 0.72);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffe2c8, 3.7);
sun.position.set(7, 15, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);
const lavaLight = new THREE.PointLight(0xff3f0a, 65, 28, 2);
lavaLight.position.set(0, 5, 0);
scene.add(lavaLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2),
  new THREE.MeshStandardMaterial({ color: 0x512017, roughness: 0.9, metalness: 0.04 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(ARENA_HALF * 2, 30, 0x8f321f, 0x512015);
grid.position.y = 0.006;
grid.material.opacity = 0.26;
grid.material.transparent = true;
scene.add(grid);

const wallMat = new THREE.MeshStandardMaterial({ color: 0x6a291e, roughness: 0.76 });
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

const pillarPositions = [[-9,-7],[9,-7],[-10,9],[10,9],[-5,2],[5,2],[-15,12],[15,12]];
for (const [x, z] of pillarPositions) {
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.95, 4.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x783126, roughness: 0.8 }),
  );
  pillar.position.set(x, 2.1, z);
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  scene.add(pillar);
}

const platformDefs = [];

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

// Main harvest cascade: four distinct jumps are required to reach the crown.
// Each terrace overlaps the previous one enough to create a readable upward route,
// but the height difference prevents a direct ground-to-top shortcut.
addRaisedPlatform(-17.0, 3.7, 5.8, 5.0, 0.72, 0x4d2519, 0x70402c, 'cascade-1');
addRaisedPlatform(-14.3, 5.1, 5.4, 4.6, 1.44, 0x55271d, 0x7c4931, 'cascade-2');
addRaisedPlatform(-11.8, 6.5, 5.0, 4.2, 2.16, 0x5d2b20, 0x895038, 'cascade-3');
addRaisedPlatform(-9.5, 7.8, 4.7, 3.8, 2.88, 0x663025, 0x965c3f, 'cascade-crown');

// A second, shorter garden cascade on the opposite side gives another vertical route.
addRaisedPlatform(16.5, 5.0, 5.8, 4.6, 0.70, 0x49301b, 0x614421, 'garden-step-1');
addRaisedPlatform(14.0, 6.3, 5.3, 4.2, 1.40, 0x50351c, 0x6b4d25, 'garden-step-2');
addRaisedPlatform(11.8, 7.5, 4.8, 3.8, 2.10, 0x593b20, 0x77582b, 'garden-step-3');

// Low garden beds remain useful ground-level harvest lanes.
addRaisedPlatform(-14, -10, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');
addRaisedPlatform(-14, -6.2, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');
addRaisedPlatform(14, -10, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');
addRaisedPlatform(14, -6.2, 6.8, 2.8, 0.42, 0x4d2519, 0x2d1a10, 'garden');

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
const droppedIngredients = [];
const droppedTargets = [];
const rivalTargets = [];

function spawnIngredient(type, x, z, y = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.userData.baseY = y;
  root.userData.type = type;
  root.userData.phase = Math.random() * Math.PI * 2;
  root.userData.active = true;
  root.userData.respawnTimer = 0;

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

spawnIngredient('onion', -14.8, -10, 0.42);
spawnIngredient('onion', -13.0, -6.2, 0.42);
spawnIngredient('tomato', 14.8, -10, 0.42);
spawnIngredient('tomato', 13.0, -6.2, 0.42);
spawnIngredient('cheese', -9.6, 7.8, 2.88);
spawnIngredient('cheese', -11.7, 6.4, 2.16);
spawnIngredient('pepper', 11.8, 7.5, 2.10);
spawnIngredient('pepper', 14.0, 6.3, 1.40);
spawnIngredient('mushroom', -14.3, 5.1, 1.44);
spawnIngredient('mushroom', 16.5, 5.0, 0.70);

const grill = new THREE.Group();
grill.position.set(0, 0, 17.0);
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
hog.userData.chargeTarget = 'player';
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
skewerView.position.set(0.48, -0.46, -0.05);
camera.add(skewerView);
const handle = new THREE.Mesh(
  new THREE.CylinderGeometry(0.055, 0.07, 0.42, 12),
  new THREE.MeshStandardMaterial({ color: 0x29100a, roughness: 0.72 }),
);
handle.rotation.x = Math.PI / 2;
handle.position.set(0, 0, -0.48);
skewerView.add(handle);
const rod = new THREE.Mesh(
  new THREE.CylinderGeometry(0.012, 0.012, 2.72, 8),
  new THREE.MeshStandardMaterial({ color: 0xe3e1d9, metalness: 0.92, roughness: 0.14 }),
);
rod.rotation.x = Math.PI / 2;
rod.position.set(0, 0, -1.92);
skewerView.add(rod);
const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.34, 10), rod.material);
tip.rotation.x = -Math.PI / 2;
tip.position.set(0, 0, -3.43);
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

function createRivalChef() {
  const root = new THREE.Group();
  root.position.set(-6, 0, 4);

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x53121a, roughness: 0.55, metalness: 0.1 });
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x191313, roughness: 0.68 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xbd5a45, roughness: 0.7 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xd9d7cf, metalness: 0.9, roughness: 0.18 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.75, 6, 12), bodyMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  torso.userData.rivalBody = true;
  root.add(torso);
  rivalTargets.push(torso);

  const apron = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.08), apronMat);
  apron.position.set(0, 0.95, -0.4);
  root.add(apron);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), skinMat);
  head.position.set(0, 1.82, 0);
  head.castShadow = true;
  head.userData.rivalBody = true;
  root.add(head);
  rivalTargets.push(head);

  const hornMat = new THREE.MeshStandardMaterial({ color: 0x24100c, roughness: 0.8 });
  for (const x of [-0.22, 0.22]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.4, 9), hornMat);
    horn.position.set(x, 2.13, 0);
    horn.rotation.z = x < 0 ? 0.35 : -0.35;
    root.add(horn);
  }

  const label = makeLabel('😈 RIVAL CHEF', '#ffb1b1');
  label.position.y = 2.8;
  root.add(label);

  const skewer = new THREE.Group();
  skewer.position.set(0.55, 1.05, -0.42);
  root.add(skewer);
  const rivalRod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.05, 8), metalMat);
  rivalRod.rotation.x = Math.PI / 2;
  rivalRod.position.z = -0.85;
  skewer.add(rivalRod);
  const rivalTip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.23, 8), metalMat);
  rivalTip.rotation.x = -Math.PI / 2;
  rivalTip.position.z = -1.98;
  skewer.add(rivalTip);
  const itemGroup = new THREE.Group();
  skewer.add(itemGroup);

  scene.add(root);
  return {
    root,
    skewer,
    itemGroup,
    items: [],
    score: 0,
    recipeIndex: 0,
    attackCooldown: 0,
    collectCooldown: 0,
    stagger: 0,
    speed: 3.65,
    stolenGrace: 0,
    stolenType: null,
  };
}

const rival = createRivalChef();

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


const keys = new Set();
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
const clock = new THREE.Clock();
let toastTimeout = 0;
const mobileMove = new THREE.Vector2();
const mobileMoveSmoothed = new THREE.Vector2();
let mobileYaw = 0;
let mobilePitch = 0;
let onlineCount = 1;
let roundEndsAt = Date.now() + 180000;
let roundId = 1;

function showToast(text, seconds = 1) {
  toastEl.textContent = text;
  toastEl.classList.remove('hidden');
  toastTimeout = seconds;
}

function currentRivalRecipe() {
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

function updateHUD() {
  slotsEl.innerHTML = '';
  for (let i = 0; i < MAX_SKEWER; i += 1) {
    const slot = document.createElement('div');
    slot.className = `slot${player.items[i] ? ' filled' : ''}`;
    slot.textContent = player.items[i] ? ingredientDefs[player.items[i]].emoji : '·';
    slotsEl.appendChild(slot);
  }
  scoreEl.textContent = onlineCount > 1
    ? `You: ${player.score} · Online: ${onlineCount}`
    : (botEnabled ? `You: ${player.score} · Bot: ${rival.score}` : `You: ${player.score}`);
  skewerCountEl.textContent = `Skewer: ${player.items.length}/${MAX_SKEWER}`;
  hogStateEl.textContent = hog.userData.state === 'stunned'
    ? '🐗 PINNED! 2s — STAB → 🥩'
    : '🐗 CALM — NEVER KNOCKS FOOD · STAB → WALL';
  if (rivalStateEl) {
    if (botEnabled && onlineCount <= 1) {
      const itemText = rival.items.map((type) => ingredientDefs[type].emoji).join('') || '—';
      const hot = rival.stolenGrace > 0 && rival.stolenType
        ? ` · YOUR ${ingredientDefs[rival.stolenType].emoji} — STAB HIM!`
        : '';
      rivalStateEl.textContent = `Bot: ${itemText} (${rival.items.length}/8)${hot}`;
    } else {
      rivalStateEl.textContent = onlineCount > 1 ? 'Bot hidden — real players online' : 'Bot: OFF';
    }
  }
  if (botToggleButton) botToggleButton.textContent = `BOT: ${botEnabled ? 'ON' : 'OFF'}`;
}

function rebuildSkewerView() {
  skewerItemGroup.clear();
  player.items.forEach((type, index) => {
    const mesh = ingredientGeometry(type, 0.17);
    mesh.position.set(0, 0, -0.84 - index * 0.31);
    mesh.rotation.set(Math.random() * 0.4, Math.random() * 0.4, Math.random() * 0.4);
    skewerItemGroup.add(mesh);
  });
}

function rebuildRivalSkewer() {
  rival.itemGroup.clear();
  for (let i = rivalTargets.length - 1; i >= 0; i -= 1) {
    if (rivalTargets[i].userData.rivalIngredient) rivalTargets.splice(i, 1);
  }

  rival.items.forEach((type, index) => {
    const mesh = ingredientGeometry(type, 0.28);
    mesh.position.set(0, 0, -0.28 - index * 0.2);
    mesh.rotation.set(Math.random() * 0.35, Math.random() * 0.35, Math.random() * 0.35);
    const isHotStolenTip = rival.stolenGrace > 0
      && index === rival.items.length - 1
      && type === rival.stolenType;
    if (isHotStolenTip) {
      mesh.scale.setScalar(1.35);
      mesh.material.emissive = new THREE.Color(0xff3b16);
      mesh.material.emissiveIntensity = 1.7;
    }
    mesh.userData.rivalIngredient = true;
    mesh.userData.rivalIngredientIndex = index;
    mesh.userData.ingredientType = type;
    rival.itemGroup.add(mesh);
    rivalTargets.push(mesh);
  });
  updateHUD();
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

function addRivalIngredient(type) {
  if (rival.items.length >= MAX_SKEWER) return false;
  rival.items.push(type);
  rebuildRivalSkewer();
  return true;
}

function spawnDroppedIngredient(type, position, impulse = new THREE.Vector3()) {
  const mesh = ingredientGeometry(type, 0.46);
  mesh.position.copy(position);
  mesh.position.y = Math.max(0.45, position.y || 0.45);
  mesh.userData.dropType = type;
  mesh.userData.velocity = impulse.clone();
  mesh.userData.velocity.y = Math.max(mesh.userData.velocity.y, 2.4);
  mesh.userData.life = DROP_LIFETIME;
  mesh.userData.spin = new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(6),
    THREE.MathUtils.randFloatSpread(6),
    THREE.MathUtils.randFloatSpread(6),
  );
  scene.add(mesh);
  droppedIngredients.push(mesh);
  droppedTargets.push(mesh);
  return mesh;
}

function removeDroppedIngredient(mesh) {
  const i = droppedIngredients.indexOf(mesh);
  if (i >= 0) droppedIngredients.splice(i, 1);
  const j = droppedTargets.indexOf(mesh);
  if (j >= 0) droppedTargets.splice(j, 1);
  scene.remove(mesh);
}

function loseLastIngredient(reason, worldPosition = camera.position, impulse = new THREE.Vector3()) {
  if (!player.items.length) return null;
  const type = player.items.pop();
  spawnDroppedIngredient(type, worldPosition.clone(), impulse);
  rebuildSkewerView();
  updateHUD();
  showToast(`${reason}: ${ingredientDefs[type].emoji} DROPPED!`);
  return type;
}

function dropPlayerLast() {
  if (!player.items.length) {
    showToast('SKEWER IS EMPTY');
    return;
  }
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const position = camera.position.clone().add(direction.clone().multiplyScalar(1.0));
  position.y -= 0.55;
  loseLastIngredient('MANUAL DROP', position, direction.multiplyScalar(2.2));
}


network = createArenaNetwork({
  onPlayerState: applyRemoteState,
  onPresence: ({ ids, count, room }) => {
    onlineCount = count;
    if (onlineStateEl) onlineStateEl.textContent = `Online: ${count} · room ${room}`;
    syncRemotePresence(ids);
    updateHUD();
  },
  onRound: ({ id, endsAt }) => {
    const changed = id !== roundId;
    roundId = id;
    roundEndsAt = endsAt;
    if (changed) setRecipesForRound(id);
  },
  onRoundReset: ({ id, endsAt }) => {
    roundId = id;
    roundEndsAt = endsAt;
    setRecipesForRound(id);
    player.score = 0;
    player.items = [];
    rival.score = 0;
    rival.items = [];
    rebuildSkewerView();
    rebuildRivalSkewer();
    updateHUD();
    showToast(`🔥 ROUND ${id} — NEW ORDERS!`, 1.4);
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

function loseRivalLast(reason = 'RIVAL DROPPED') {
  if (!rival.items.length) return null;
  const type = rival.items.pop();
  const pos = rival.root.position.clone().add(new THREE.Vector3(0, 1, 0));
  spawnDroppedIngredient(type, pos, new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(2.2),
    2.8,
    THREE.MathUtils.randFloatSpread(2.2),
  ));
  rebuildRivalSkewer();
  showToast(`${reason}: ${ingredientDefs[type].emoji}`);
  return type;
}

function pointInsidePlatform(x, z, platform, margin = 0) {
  return Math.abs(x - platform.x) <= platform.width / 2 + margin
    && Math.abs(z - platform.z) <= platform.depth / 2 + margin;
}

function randomArenaPosition() {
  // Roughly one third of respawns go onto reachable terraces, preserving the
  // vertical routing game after the initial vegetables have been harvested.
  if (Math.random() < 0.34 && platformDefs.length) {
    const platform = platformDefs[Math.floor(Math.random() * platformDefs.length)];
    const margin = 0.7;
    return new THREE.Vector3(
      THREE.MathUtils.randFloat(platform.x - platform.width / 2 + margin, platform.x + platform.width / 2 - margin),
      platform.height,
      THREE.MathUtils.randFloat(platform.z - platform.depth / 2 + margin, platform.z + platform.depth / 2 - margin),
    );
  }

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
}

function deactivateCreature(creature) {
  creature.userData.active = false;
  creature.userData.respawnTimer = THREE.MathUtils.randFloat(CREATURE_RESPAWN_MIN, CREATURE_RESPAWN_MAX);
  creature.visible = false;
}

function reactivateCreature(creature) {
  creature.position.copy(randomArenaPosition());
  creature.userData.baseY = creature.position.y;
  creature.userData.active = true;
  creature.visible = true;
}

function takeRivalTip(isReclaim = false) {
  if (!rival.items.length) return false;
  const type = rival.items[rival.items.length - 1];
  const hotMatch = rival.stolenGrace > 0 && type === rival.stolenType;
  rival.items.pop();
  rival.stolenGrace = 0;
  rival.stolenType = null;
  rival.stagger = 0.8;

  if (player.items.length >= MAX_SKEWER) {
    const pos = rival.root.position.clone().add(new THREE.Vector3(0, 1, 0));
    spawnDroppedIngredient(type, pos, new THREE.Vector3(0, 2.8, 0));
    rebuildRivalSkewer();
    showToast(`${ingredientDefs[type].emoji} KNOCKED FREE — YOUR SKEWER IS FULL`, 1.2);
    return true;
  }

  player.items.push(type);
  rebuildRivalSkewer();
  rebuildSkewerView();
  updateHUD();
  showToast(
    (isReclaim || hotMatch)
      ? `↩ GOT YOUR ${ingredientDefs[type].emoji} BACK!`
      : `STOLEN! ${ingredientDefs[type].emoji} ${type.toUpperCase()}`,
    1.3,
  );
  return true;
}

function handleRivalHit(object) {
  // For a few seconds after the bot steals from you, the stolen tip is "hot".
  // Any clean STAB on the bot or its skewer reclaims that exposed piece.
  if (rival.stolenGrace > 0 && rival.items.length) {
    takeRivalTip(true);
    return;
  }

  if (object.userData.rivalIngredient) {
    const index = object.userData.rivalIngredientIndex;
    if (index !== rival.items.length - 1) {
      showToast('HIT THE EXPOSED END PIECE!');
      return;
    }
    takeRivalTip(false);
    return;
  }

  rival.stagger = 0.55;
  const away = rival.root.position.clone().sub(camera.position).setY(0);
  if (away.lengthSq() > 0.01) rival.root.position.add(away.normalize().multiplyScalar(0.85));
  showToast(rival.items.length ? 'HIT THE GLOWING TIP FOOD!' : 'CLANG!');
}

function getMobileAssistTarget(maxRange = 4.0) {
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
    ...(botEnabled && onlineCount <= 1 ? rivalTargets : []),
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

    const isHog = root === hog;
    const isStunnedHog = isHog && hog.userData.state === 'stunned';
    const isFood = Boolean(target.userData.remoteIngredient || target.userData.rivalIngredient || target.userData.dropType || (root && root !== hog));
    const minDot = isStunnedHog ? 0.35 : (isHog ? 0.55 : (isFood ? 0.62 : 0.76));
    if (dot < minDot) continue;

    let priority = 3;
    if (isStunnedHog) priority = 0;
    else if (target.userData.remoteIngredient || target.userData.rivalIngredient) priority = 1;
    else if (target.userData.dropType || (root && root !== hog)) priority = 2;
    else if (isHog) priority = 2;

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
  camera.rotation.x += (desiredPitch - camera.rotation.x) * Math.min(1, dt * 5.4);
}

function thrust() {
  if (!controls.isLocked && !MOBILE) return;
  const now = clock.elapsedTime;
  if (now - player.lastThrustAt < THRUST_COOLDOWN) return;
  player.lastThrustAt = now;
  player.thrustAnim = 1;

  let hit = null;
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
    const targets = [...networkTargets, ...(botEnabled && onlineCount <= 1 ? rivalTargets : []), ...droppedTargets, ...activeHarvestTargets];
    const hits = raycaster.intersectObjects(targets, false);
    if (!hits.length) return;
    hit = hits[0].object;
  }

  if (hit.userData.remoteOwner) {
    handleRemoteHit(hit);
    return;
  }

  if (hit.userData.rivalIngredient || hit.userData.rivalBody) {
    handleRivalHit(hit);
    return;
  }

  if (hit.userData.dropType) {
    const type = hit.userData.dropType;
    if (addIngredient(type)) removeDroppedIngredient(hit);
    return;
  }

  const root = hit.userData.harvestRoot;
  if (!root) return;

  if (root === hog) {
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
  }

  const type = root.userData.type;
  if (type && root.userData.active && addIngredient(type)) deactivateCreature(root);
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

async function startGame() {
  const requestedName = playerNameInput?.value.trim() || '';
  if (!requestedName) {
    playerNameInput?.focus();
    playerNameInput?.setAttribute('placeholder', 'Enter your name first');
    return;
  }
  await network?.setPlayerName(requestedName);
  gameStarted = true;
  setBotEnabled(Boolean(botStartToggle?.checked), false);

  if (MOBILE) {
    startScreen.classList.add('hidden');
    mobileControls?.classList.remove('hidden');
    try {
      const fs = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      if (fs) await fs.call(document.documentElement);
    } catch {}
    try { if (screen.orientation?.lock) await screen.orientation.lock('landscape'); } catch {}
    resizeViewport();
    setTimeout(resizeViewport, 120);
    setTimeout(resizeViewport, 350);
    mobileYaw = camera.rotation.y;
    mobilePitch = camera.rotation.x;
  } else {
    controls.lock();
  }
}

// iOS Safari can still try gesture zoom even with viewport meta settings.
// Prevent it so the game always stays fitted to the current rotated viewport.
if (MOBILE) {
  for (const eventName of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(eventName, (event) => event.preventDefault(), { passive: false });
  }
  document.addEventListener('dblclick', (event) => event.preventDefault(), { passive: false });
}

startButton.addEventListener('click', startGame);
botToggleButton?.addEventListener('click', () => setBotEnabled(!botEnabled));
playerNameInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    startGame();
  }
});
controls.addEventListener('lock', () => startScreen.classList.add('hidden'));
controls.addEventListener('unlock', () => { if (!MOBILE) startScreen.classList.remove('hidden'); });
document.addEventListener('keydown', (event) => {
  keys.add(event.code);
  if (event.code === 'Space' && controls.isLocked && player.grounded) {
    player.velocityY = JUMP_SPEED;
    player.grounded = false;
  }
  if (event.code === 'KeyE') tryDeliver();
  if (event.code === 'KeyQ') dropPlayerLast();
});
document.addEventListener('keyup', (event) => keys.delete(event.code));
document.addEventListener('mousedown', (event) => {
  if (event.button === 0 && !MOBILE) thrust();
});

function bindMobileButton(button, action) {
  button?.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  });
}
bindMobileButton(stabButton, thrust);
bindMobileButton(jumpButton, () => {
  if (player.grounded) {
    player.velocityY = JUMP_SPEED;
    player.grounded = false;
  }
});
bindMobileButton(dropButton, dropPlayerLast);
bindMobileButton(useButton, tryDeliver);

if (movePad) {
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
}

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
}

function updateOrientationHint() {
  if (!MOBILE || !rotateHint) return;
  const orientationType = screen.orientation?.type || '';
  const viewport = getViewportSize();
  const landscape = viewport.width >= viewport.height || orientationType.startsWith('landscape');
  rotateHint.classList.toggle('hidden', landscape);
}

const scheduleOrientationHintUpdate = () => {
  updateOrientationHint();
  requestAnimationFrame(updateOrientationHint);
  setTimeout(updateOrientationHint, 120);
  setTimeout(updateOrientationHint, 350);
};

addEventListener('orientationchange', scheduleOrientationHintUpdate);
addEventListener('resize', scheduleOrientationHintUpdate);
visualViewport?.addEventListener('resize', scheduleOrientationHintUpdate);
try {
  matchMedia('(orientation: landscape)').addEventListener('change', scheduleOrientationHintUpdate);
} catch {}
scheduleOrientationHintUpdate();

const GRILL_COLLIDER_RADIUS = 1.9;
const HOG_COLLIDER_RADIUS = 1.95;
const PILLAR_COLLIDER_RADIUS = 0.95;

function resolvePlayerCircleCollision(centerX, centerZ, objectRadius) {
  const minDistance = PLAYER_RADIUS + objectRadius;
  let dx = camera.position.x - centerX;
  let dz = camera.position.z - centerZ;
  let distanceSq = dx * dx + dz * dz;
  if (distanceSq >= minDistance * minDistance) return;

  // If the player is exactly at the center, choose a stable escape direction.
  if (distanceSq < 0.000001) {
    dx = Math.sin(camera.rotation.y) || 0.001;
    dz = Math.cos(camera.rotation.y) || 1;
    distanceSq = dx * dx + dz * dz;
  }

  const distance = Math.sqrt(distanceSq);
  const scale = minDistance / distance;
  camera.position.x = centerX + dx * scale;
  camera.position.z = centerZ + dz * scale;
}

function resolvePlayerWorldCollisions() {
  // Arena walls: wall meshes are 1 unit thick and centered on +/- ARENA_HALF.
  const wallInnerEdge = ARENA_HALF - 0.5;
  const limit = wallInnerEdge - PLAYER_RADIUS;
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limit, limit);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limit, limit);

  // Solid arena props.
  resolvePlayerCircleCollision(grill.position.x, grill.position.z, GRILL_COLLIDER_RADIUS);
  resolvePlayerCircleCollision(hog.position.x, hog.position.z, HOG_COLLIDER_RADIUS);
  for (const [x, z] of pillarPositions) {
    resolvePlayerCircleCollision(x, z, PILLAR_COLLIDER_RADIUS);
  }

  // Re-apply wall bounds in case a circle collision pushed the player outward.
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
}

function updateMovement(dt) {
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

function updateCreatures(dt, time) {
  ingredientCreatures.forEach((creature) => {
    if (!creature.userData.active) {
      creature.userData.respawnTimer -= dt;
      if (creature.userData.respawnTimer <= 0) reactivateCreature(creature);
      return;
    }
    const phase = creature.userData.phase;
    creature.position.y = (creature.userData.baseY || 0) + Math.sin(time * 2.2 + phase) * 0.05;
    creature.rotation.y += dt * 0.5;

    const playerDx = camera.position.x - creature.position.x;
    const playerDz = camera.position.z - creature.position.z;
    const playerDistance = Math.hypot(playerDx, playerDz);
    const rivalActive = botEnabled && onlineCount <= 1;
    const rivalDx = rival.root.position.x - creature.position.x;
    const rivalDz = rival.root.position.z - creature.position.z;
    const rivalDistance = rivalActive ? Math.hypot(rivalDx, rivalDz) : Infinity;

    // Ingredients planted on raised beds / tier stay on that surface instead of fleeing into mid-air.
    if ((creature.userData.baseY || 0) <= 0.01) {
      if (playerDistance < 3.8 && playerDistance > 0.01) {
        creature.position.x -= (playerDx / playerDistance) * dt * 0.7;
        creature.position.z -= (playerDz / playerDistance) * dt * 0.7;
      } else if (rivalDistance < 3.4 && rivalDistance > 0.01) {
        creature.position.x -= (rivalDx / rivalDistance) * dt * 0.55;
        creature.position.z -= (rivalDz / rivalDistance) * dt * 0.55;
      }
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

function recipePrefixMatches(items, recipe) {
  return items.every((type, index) => recipe.items[index] === type);
}

function chooseRivalRecipe() {
  if (recipePrefixMatches(rival.items, currentRivalRecipe())) return;

  const valid = recipes
    .map((recipe, index) => ({ recipe, index }))
    .filter(({ recipe }) => recipePrefixMatches(rival.items, recipe));
  if (valid.length) {
    rival.recipeIndex = valid[Math.floor(Math.random() * valid.length)].index;
    return;
  }

  if (rival.items.length) loseRivalLast('RIVAL FIXES RECIPE');
  if (!rival.items.length) rival.recipeIndex = Math.floor(Math.random() * recipes.length);
}

function closestCreatureOfType(type) {
  let best = null;
  let bestDistance = Infinity;
  ingredientCreatures.forEach((creature) => {
    if (!creature.userData.active || creature.userData.type !== type) return;
    const distance = rival.root.position.distanceTo(creature.position);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = creature;
    }
  });
  return best;
}

function closestDroppedOfType(type) {
  let best = null;
  let bestDistance = Infinity;
  droppedIngredients.forEach((drop) => {
    if (drop.userData.dropType !== type) return;
    const distance = rival.root.position.distanceTo(drop.position);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = drop;
    }
  });
  return best;
}

function moveRivalToward(target, dt, speed = rival.speed) {
  const direction = target.clone().sub(rival.root.position).setY(0);
  const distance = direction.length();
  if (distance > 0.05) {
    direction.normalize();
    rival.root.position.addScaledVector(direction, speed * dt);
    rival.root.lookAt(rival.root.position.clone().add(direction));
  }
  const limit = ARENA_HALF - 1.2;
  rival.root.position.x = THREE.MathUtils.clamp(rival.root.position.x, -limit, limit);
  rival.root.position.z = THREE.MathUtils.clamp(rival.root.position.z, -limit, limit);
  return distance;
}

function updateRival(dt) {
  rival.attackCooldown = Math.max(0, rival.attackCooldown - dt);
  rival.collectCooldown = Math.max(0, rival.collectCooldown - dt);
  rival.stagger = Math.max(0, rival.stagger - dt);
  const wasHot = rival.stolenGrace > 0;
  rival.stolenGrace = Math.max(0, rival.stolenGrace - dt);
  if (wasHot && rival.stolenGrace <= 0) {
    rival.stolenType = null;
    rebuildRivalSkewer();
  }
  if (rival.stagger > 0) return;

  chooseRivalRecipe();
  const recipe = currentRivalRecipe();

  if (rival.items.length === recipe.items.length) {
    if (rival.stolenGrace > 0) {
      // Give the victim a readable counter-steal window before the stolen piece can score.
      const away = rival.root.position.clone().sub(camera.position).setY(0);
      if (away.lengthSq() > 0.01) {
        const retreat = rival.root.position.clone().add(away.normalize().multiplyScalar(2.2));
        moveRivalToward(retreat, dt, rival.speed * 0.42);
      }
      return;
    }
    const distance = moveRivalToward(grill.position, dt, rival.speed * 1.08);
    if (distance < 2.5) {
      rival.score += recipe.points;
      rival.items = [];
      rival.recipeIndex = (rival.recipeIndex + 1) % recipes.length;
      rebuildRivalSkewer();
      showToast(`😈 RIVAL SERVED ${recipe.name.toUpperCase()} +${recipe.points}`, 1.2);
    }
    return;
  }

  const needed = recipe.items[rival.items.length];

  const playerLast = player.items[player.items.length - 1];
  if (playerLast === needed && rival.attackCooldown <= 0) {
    const playerTarget = new THREE.Vector3(camera.position.x, 0, camera.position.z);
    const distance = moveRivalToward(playerTarget, dt, rival.speed * 1.16);
    if (distance < 1.75) {
      rival.attackCooldown = 1.15;
      const stolen = player.items.pop();
      if (stolen && addRivalIngredient(stolen)) {
        rival.stolenType = stolen;
        rival.stolenGrace = 4.5;
        rival.stagger = 0.55;
        rebuildRivalSkewer();
        rebuildSkewerView();
        updateHUD();
        const away = camera.position.clone().sub(rival.root.position).setY(0);
        if (away.lengthSq() > 0.01) camera.position.add(away.normalize().multiplyScalar(0.9));
        showToast(`😈 STOLE ${ingredientDefs[stolen].emoji} — 4.5s TO STAB IT BACK!`, 1.5);
      }
    }
    return;
  }

  const dropped = closestDroppedOfType(needed);
  if (dropped) {
    const distance = moveRivalToward(dropped.position, dt);
    if (distance < 1.15 && rival.collectCooldown <= 0) {
      rival.collectCooldown = 0.55;
      addRivalIngredient(needed);
      removeDroppedIngredient(dropped);
    }
    return;
  }

  if (needed === 'meat') {
    if (hog.userData.state === 'stunned') {
      const distance = moveRivalToward(hog.position, dt, rival.speed * 1.08);
      if (distance < 2.15 && rival.collectCooldown <= 0 && hog.userData.harvestCooldown <= 0) {
        rival.collectCooldown = 0.7;
        hog.userData.harvestCooldown = 0.55;
        addRivalIngredient('meat');
      }
    } else {
      const orbit = new THREE.Vector3(
        hog.position.x + Math.cos(clock.elapsedTime * 0.65) * 5.5,
        0,
        hog.position.z + Math.sin(clock.elapsedTime * 0.65) * 5.5,
      );
      moveRivalToward(orbit, dt, rival.speed * 0.85);
    }
    return;
  }

  const creature = closestCreatureOfType(needed);
  if (creature) {
    const distance = moveRivalToward(creature.position, dt);
    if (distance < 1.35 && rival.collectCooldown <= 0) {
      rival.collectCooldown = 0.65;
      if (addRivalIngredient(needed)) deactivateCreature(creature);
    }
  }
}

function updateDrops(dt) {
  for (let i = droppedIngredients.length - 1; i >= 0; i -= 1) {
    const drop = droppedIngredients[i];
    drop.userData.life -= dt;
    const velocity = drop.userData.velocity;
    velocity.y -= GRAVITY * dt * 0.8;
    drop.position.addScaledVector(velocity, dt);
    drop.rotation.x += drop.userData.spin.x * dt;
    drop.rotation.y += drop.userData.spin.y * dt;
    drop.rotation.z += drop.userData.spin.z * dt;

    if (drop.position.y < 0.3) {
      drop.position.y = 0.3;
      if (Math.abs(velocity.y) > 0.6) velocity.y *= -0.35;
      else velocity.y = 0;
      velocity.x *= 0.82;
      velocity.z *= 0.82;
    }

    if (drop.userData.life <= 0) removeDroppedIngredient(drop);
  }
}

function updateRivalPlayerBump() {
  if (rival.attackCooldown > 0 || rival.stagger > 0) return;
  const dx = camera.position.x - rival.root.position.x;
  const dz = camera.position.z - rival.root.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 1.25 && player.items.length) {
    rival.attackCooldown = 1.25;
    const direction = new THREE.Vector3(dx, 0, dz).normalize();
    camera.position.add(direction.clone().multiplyScalar(0.8));
    loseLastIngredient('RIVAL KNOCKED OFF', camera.position, direction.multiplyScalar(2.2));
  }
}

function animateWeapon(dt) {
  const baseZ = -0.05;
  if (player.thrustAnim > 0) {
    player.thrustAnim = Math.max(0, player.thrustAnim - dt * 5.8);
    const pulse = Math.sin((1 - player.thrustAnim) * Math.PI);
    skewerView.position.z = baseZ - pulse * 0.62;
  } else {
    skewerView.position.z += (baseZ - skewerView.position.z) * Math.min(1, dt * 12);
  }
  const moving = MOBILE ? mobileMoveSmoothed.length() > 0.1 : keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD');
  skewerView.position.y = -0.46 + Math.sin(clock.elapsedTime * 8) * 0.008 * (moving ? 1 : 0);
}


function updateOnline(dt) {
  network?.update(Date.now());
  if (gameStarted) {
    network?.sendPlayerState({ x: camera.position.x, z: camera.position.z, yaw: camera.rotation.y, items: player.items, score: player.score });
  }
  updateRemotePlayers(dt);
  const remaining = Math.max(0, roundEndsAt - Date.now());
  const seconds = Math.ceil(remaining / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  if (roundStateEl) roundStateEl.textContent = `Round ${roundId}: ${mm}:${ss}`;
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.04);
  const elapsed = clock.elapsedTime;

  updateMovement(dt);
  updateCreatures(dt, elapsed);
  updateHog(dt);
  rival.root.visible = botEnabled && onlineCount <= 1;
  if (botEnabled && onlineCount <= 1) {
    updateRival(dt);
    updateRivalPlayerBump();
  }
  updateOnline(dt);
  updateDrops(dt);
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

function resizeViewport() {
  const { width, height, left, top } = getViewportSize();
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--app-w', `${width}px`);
  rootStyle.setProperty('--app-h', `${height}px`);
  rootStyle.setProperty('--app-x', `${left}px`);
  rootStyle.setProperty('--app-y', `${top}px`);
  camera.aspect = width / height;
  camera.fov = MOBILE && width / height > 1.95 ? 65 : 72;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
}

addEventListener('resize', resizeViewport);
visualViewport?.addEventListener('resize', resizeViewport);
visualViewport?.addEventListener('scroll', resizeViewport);
resizeViewport();

updateHUD();
rebuildSkewerView();
rebuildRivalSkewer();
setBotEnabled(botEnabled, false);
animate();
