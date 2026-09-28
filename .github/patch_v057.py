from pathlib import Path

p = Path('src/game.js')
s = p.read_text()

def rep(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'missing patch target: {label}')
    s = s.replace(old, new, 1)

# Keep pillar locations as gameplay collision data as well as render data.
rep(
"""for (const [x, z] of [[-7,-5],[7,-5],[-8,7],[8,7],[-4,1],[4,1]]) {""",
"""const pillarPositions = [[-7,-5],[7,-5],[-8,7],[8,7],[-4,1],[4,1]];
for (const [x, z] of pillarPositions) {""",
'pillar positions',
)

marker = """function updateMovement(dt) {"""
collision_helpers = """const GRILL_COLLIDER_RADIUS = 1.9;
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

function updateMovement(dt) {"""
rep(marker, collision_helpers, 'collision helpers')

rep(
"""  const limit = ARENA_HALF - PLAYER_RADIUS - 0.6;
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limit, limit);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limit, limit);
}""",
"""  resolvePlayerWorldCollisions();
}""",
'world collision call',
)

p.write_text(s)

p = Path('index.html')
s = p.read_text().replace('ONLINE FPS v0.5.6', 'ONLINE FPS v0.5.7', 1)
p.write_text(s)
