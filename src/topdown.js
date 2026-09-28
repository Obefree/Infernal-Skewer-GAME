import * as THREE from 'three';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#game');
const start = $('#start');
const startButton = $('#startButton');
const slotsEl = $('#slots');
const scoreEl = $('#score');
const toastEl = $('#toast');
const movePad = $('#movePad');
const moveKnob = $('#moveKnob');
const stabButton = $('#stabButton');
const dropButton = $('#dropButton');
const useButton = $('#useButton');
const rotateHint = $('#rotateHint');

const ARENA_HALF = 16;
const MAX_SKEWER = 8;
const SPEED = 6.2;
const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 900;
const ingredients = {
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

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x180604);
scene.fog = new THREE.Fog(0x180604, 22, 50);
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 18, 14);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
scene.add(new THREE.HemisphereLight(0xffb38f, 0x160504, 2.5));
const sun = new THREE.DirectionalLight(0xffd4b4, 3);
sun.position.set(5, 14, 8); sun.castShadow = true; scene.add(sun);
const lava = new THREE.PointLight(0xff4711, 55, 25, 2); lava.position.set(0, 5, 0); scene.add(lava);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2), new THREE.MeshStandardMaterial({ color: 0x32100b, roughness: 0.95 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const grid = new THREE.GridHelper(ARENA_HALF * 2, 24, 0x8f321f, 0x512015); grid.position.y = 0.01; grid.material.opacity = .25; grid.material.transparent = true; scene.add(grid);

function meshFor(type, size = .6) {
  const def = ingredients[type];
  let geo;
  if (def.shape === 'cube') geo = new THREE.BoxGeometry(size, size * .8, size * .85);
  else if (def.shape === 'cone') geo = new THREE.ConeGeometry(size * .3, size, 12);
  else geo = new THREE.SphereGeometry(size * .52, 16, 12);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: def.color, roughness: .58 }));
  mesh.castShadow = true;
  return mesh;
}

const grill = new THREE.Group();
grill.position.set(0, 0, 11.5);
const grillBody = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, .9, 18), new THREE.MeshStandardMaterial({ color: 0x21100d, metalness: .5, roughness: .35 }));
grillBody.position.y = .45; grill.add(grillBody);
const grillFire = new THREE.PointLight(0xff5b12, 45, 10, 2); grillFire.position.y = 1.8; grill.add(grillFire); scene.add(grill);

const creatures = [];
function randomPos() {
  let x, z;
  do { x = THREE.MathUtils.randFloat(-13.5, 13.5); z = THREE.MathUtils.randFloat(-13.5, 13.5); }
  while (Math.hypot(x, z - 11.5) < 3.5 || Math.hypot(x, z) < 3);
  return new THREE.Vector3(x, 0, z);
}
function spawnCreature(type, x, z) {
  const root = new THREE.Group(); root.position.set(x, 0, z); root.userData.type = type; root.userData.active = true; root.userData.respawn = 0;
  const body = meshFor(type, .9); body.position.y = .55; root.add(body);
  scene.add(root); creatures.push(root);
}
[['onion',-10,-7],['tomato',10,-7],['cheese',-10,7],['pepper',10,7],['mushroom',-13,0],['mushroom',13,0]].forEach(([t,x,z]) => spawnCreature(t,x,z));
function consumeCreature(c) { c.userData.active = false; c.userData.respawn = THREE.MathUtils.randFloat(3,6); c.visible = false; }
function updateCreatures(dt, t) {
  for (const c of creatures) {
    if (!c.userData.active) { c.userData.respawn -= dt; if (c.userData.respawn <= 0) { c.position.copy(randomPos()); c.visible = true; c.userData.active = true; } continue; }
    c.position.y = Math.sin(t * 2 + c.id) * .06; c.rotation.y += dt * .55;
  }
}

const hog = new THREE.Group(); hog.position.set(0,0,0); hog.userData.state = 'roam'; hog.userData.timer = 2.5; hog.userData.stun = 0; hog.userData.velocity = new THREE.Vector3(); hog.userData.harvestCooldown = 0;
const hogBody = new THREE.Mesh(new THREE.SphereGeometry(1.25,22,16), new THREE.MeshStandardMaterial({ color: 0x7b251c, roughness: .7 })); hogBody.scale.set(1.4,.85,1.5); hogBody.position.y = .85; hog.add(hogBody);
const snout = new THREE.Mesh(new THREE.BoxGeometry(.85,.5,.42), new THREE.MeshStandardMaterial({ color: 0xb64b39 })); snout.position.set(0,.8,-1.3); hog.add(snout); scene.add(hog);

const player = { root: new THREE.Group(), items: [], score: 0, attackCd: 0, forward: new THREE.Vector3(0,0,-1) };
player.root.position.set(0,0,12.5); scene.add(player.root);
const chefBody = new THREE.Mesh(new THREE.CapsuleGeometry(.42,.65,6,12), new THREE.MeshStandardMaterial({ color: 0x702019, roughness: .55 })); chefBody.position.y = .85; chefBody.castShadow = true; player.root.add(chefBody);
const chefHead = new THREE.Mesh(new THREE.SphereGeometry(.3,16,12), new THREE.MeshStandardMaterial({ color: 0xd17055 })); chefHead.position.y = 1.55; player.root.add(chefHead);
const skewer = new THREE.Group(); skewer.position.set(.48,.9,-.2); player.root.add(skewer);
const metal = new THREE.MeshStandardMaterial({ color: 0xe0ded7, metalness: .9, roughness: .15 });
const rod = new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,2.4,8), metal); rod.rotation.x = Math.PI/2; rod.position.z = -1.05; skewer.add(rod);
const tip = new THREE.Mesh(new THREE.ConeGeometry(.06,.28,8), metal); tip.rotation.x = -Math.PI/2; tip.position.z = -2.38; skewer.add(tip);
const itemGroup = new THREE.Group(); skewer.add(itemGroup);

const drops = [];
function updateHud() {
  slotsEl.innerHTML = '';
  for (let i=0;i<MAX_SKEWER;i++) { const d=document.createElement('div'); d.className=`slot${player.items[i]?' filled':''}`; d.textContent=player.items[i]?ingredients[player.items[i]].emoji:'·'; slotsEl.appendChild(d); }
  scoreEl.textContent = `Score: ${player.score}`;
}
function rebuild() {
  itemGroup.clear(); player.items.forEach((type,i)=>{ const m=meshFor(type,.24); m.position.set(0,0,-.45-i*.24); itemGroup.add(m); }); updateHud();
}
function toast(text) { toastEl.textContent=text; toastEl.classList.remove('hidden'); clearTimeout(toast._id); toast._id=setTimeout(()=>toastEl.classList.add('hidden'),900); }
function add(type) { if(player.items.length>=MAX_SKEWER){toast('SKEWER FULL');return false;} player.items.push(type); rebuild(); toast(`+ ${ingredients[type].emoji}`); return true; }
function spawnDrop(type, pos, velocity = new THREE.Vector3()) { const m=meshFor(type,.48); m.position.copy(pos); m.position.y=.4; m.userData.type=type; m.userData.velocity=velocity.clone(); m.userData.life=15; scene.add(m); drops.push(m); }
function dropLast() { if(!player.items.length){toast('EMPTY');return;} const type=player.items.pop(); spawnDrop(type,player.root.position.clone().add(player.forward.clone().multiplyScalar(1.2)),player.forward.clone().multiplyScalar(2)); rebuild(); toast(`DROP ${ingredients[type].emoji}`); }

function frontCandidate() {
  let best = null; let bestScore = Infinity;
  const origin = player.root.position.clone();
  const check = (obj, type, kind) => {
    const to = obj.position.clone().sub(origin); const dist = to.length(); if(dist>2.6 || dist<.01) return;
    const dot = to.normalize().dot(player.forward); if(dot<.52) return;
    const score = dist - dot*.5; if(score<bestScore){bestScore=score;best={obj,type,kind};}
  };
  creatures.forEach(c=>{if(c.userData.active) check(c,c.userData.type,'creature');});
  drops.forEach(d=>check(d,d.userData.type,'drop'));
  if(hog.userData.state==='stunned') check(hog,'meat','hog');
  return best;
}
function stab() {
  if(player.attackCd>0) return; player.attackCd=.34;
  const target=frontCandidate(); if(!target){toast('WHIFF');return;}
  if(target.kind==='creature'){ if(add(target.type)) consumeCreature(target.obj); }
  if(target.kind==='drop'){ if(add(target.type)){ scene.remove(target.obj); drops.splice(drops.indexOf(target.obj),1); } }
  if(target.kind==='hog'){ if(add('meat')) hog.userData.harvestCooldown=.6; }
}
function use() {
  if(player.root.position.distanceTo(grill.position)>2.8){toast('GET TO GRILL');return;}
  const recipe=recipes.find(r=>r.items.length===player.items.length&&r.items.every((v,i)=>player.items[i]===v));
  if(!recipe){toast('WRONG RECIPE');return;} player.score+=recipe.points; player.items=[]; rebuild(); toast(`🔥 +${recipe.points}`);
}

const move = new THREE.Vector2();
const keys = new Set();
let started = false;
async function startGame(){started=true;start.classList.add('hidden');try{if(MOBILE&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch{}try{if(MOBILE&&screen.orientation?.lock)await screen.orientation.lock('landscape');}catch{}}
startButton.addEventListener('click',startGame);
document.addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='Space')stab();if(e.code==='KeyQ')dropLast();if(e.code==='KeyE')use();});
document.addEventListener('keyup',e=>keys.delete(e.code));

function bind(btn,fn){btn?.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();fn();});}
bind(stabButton,stab);bind(dropButton,dropLast);bind(useButton,use);
function setupRightMovePad(){
  let id=null; const radius=54;
  const update=e=>{const r=movePad.getBoundingClientRect();let x=e.clientX-r.left-r.width/2;let y=e.clientY-r.top-r.height/2;const l=Math.hypot(x,y)||1;if(l>radius){x*=radius/l;y*=radius/l;}move.set(x/radius,-y/radius);moveKnob.style.transform=`translate(${x}px,${y}px)`;};
  movePad.addEventListener('pointerdown',e=>{id=e.pointerId;movePad.setPointerCapture(id);update(e);});
  movePad.addEventListener('pointermove',e=>{if(e.pointerId===id)update(e);});
  const end=e=>{if(e.pointerId===id){id=null;move.set(0,0);moveKnob.style.transform='translate(0,0)';}};movePad.addEventListener('pointerup',end);movePad.addEventListener('pointercancel',end);
}
setupRightMovePad();
function orientationHint(){if(!MOBILE)return;rotateHint.classList.toggle('hidden',innerWidth>=innerHeight);}addEventListener('resize',orientationHint);orientationHint();

function updateMovement(dt){
  if(!started)return;
  let x=move.x,z=move.y;
  if(!MOBILE){x=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);z=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0);const len=Math.hypot(x,z)||1;x/=len;z/=len;}
  if(Math.hypot(x,z)>.08){player.forward.set(x,0,-z).normalize();player.root.rotation.y=Math.atan2(-player.forward.x,-player.forward.z);player.root.position.x+=x*SPEED*dt;player.root.position.z-=z*SPEED*dt;}
  player.root.position.x=THREE.MathUtils.clamp(player.root.position.x,-ARENA_HALF+1,ARENA_HALF-1);player.root.position.z=THREE.MathUtils.clamp(player.root.position.z,-ARENA_HALF+1,ARENA_HALF-1);
}
function updateHog(dt){
  hog.userData.harvestCooldown=Math.max(0,hog.userData.harvestCooldown-dt);
  if(hog.userData.state==='stunned'){hog.userData.stun-=dt;if(hog.userData.stun<=0){hog.userData.state='roam';hog.userData.timer=2.4;}return;}
  if(hog.userData.state==='roam'){hog.userData.timer-=dt;hog.rotation.y+=dt*.4;if(hog.userData.timer<=0){const dir=player.root.position.clone().sub(hog.position).setY(0).normalize();hog.userData.velocity.copy(dir.multiplyScalar(10));hog.lookAt(hog.position.clone().add(dir));hog.userData.state='charge';}return;}
  hog.position.addScaledVector(hog.userData.velocity,dt);const hit=Math.abs(hog.position.x)>ARENA_HALF-1.7||Math.abs(hog.position.z)>ARENA_HALF-1.7;
  if(hit){hog.position.x=THREE.MathUtils.clamp(hog.position.x,-ARENA_HALF+1.7,ARENA_HALF-1.7);hog.position.z=THREE.MathUtils.clamp(hog.position.z,-ARENA_HALF+1.7,ARENA_HALF-1.7);hog.userData.state='stunned';hog.userData.stun=3;toast('🐗 STUNNED');return;}
  if(hog.position.distanceTo(player.root.position)<1.6){dropLast();hog.userData.state='roam';hog.userData.timer=2.5;}
}
function updateDrops(dt){for(let i=drops.length-1;i>=0;i--){const d=drops[i];d.userData.life-=dt;d.position.addScaledVector(d.userData.velocity,dt);d.userData.velocity.multiplyScalar(.96);if(d.userData.life<=0){scene.remove(d);drops.splice(i,1);}}}

const clock=new THREE.Clock();
function animate(){const dt=Math.min(clock.getDelta(),.04),t=clock.elapsedTime;player.attackCd=Math.max(0,player.attackCd-dt);updateMovement(dt);updateCreatures(dt,t);updateHog(dt);updateDrops(dt);grillFire.intensity=40+Math.sin(t*10)*8;renderer.render(scene,camera);requestAnimationFrame(animate);}animate();rebuild();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
