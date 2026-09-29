from pathlib import Path

p = Path('src/game.js')
s = p.read_text()

def rep(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'missing patch target: {label}')
    s = s.replace(old, new, 1)

rep(
"""    stagger: 0,
    speed: 3.65,
  };""",
"""    stagger: 0,
    speed: 3.65,
    stolenGrace: 0,
    stolenType: null,
  };""",
'bot stolen state',
)

rep(
"""  rival.items.forEach((type, index) => {
    const mesh = ingredientGeometry(type, 0.28);
    mesh.position.set(0, 0, -0.28 - index * 0.2);
    mesh.rotation.set(Math.random() * 0.35, Math.random() * 0.35, Math.random() * 0.35);
    mesh.userData.rivalIngredient = true;""",
"""  rival.items.forEach((type, index) => {
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
    mesh.userData.rivalIngredient = true;""",
'highlight stolen tip',
)

rep(
"""      rivalStateEl.textContent = `Bot: ${itemText} (${rival.items.length}/8)`;""",
"""      const hot = rival.stolenGrace > 0 && rival.stolenType
        ? ` · YOUR ${ingredientDefs[rival.stolenType].emoji} — STAB HIM!`
        : '';
      rivalStateEl.textContent = `Bot: ${itemText} (${rival.items.length}/8)${hot}`;""",
'hot stolen HUD',
)

old_handle = """function handleRivalHit(object) {
  if (object.userData.rivalIngredient) {
    const index = object.userData.rivalIngredientIndex;
    if (index !== rival.items.length - 1) {
      showToast('HIT THE EXPOSED END PIECE!');
      return;
    }
    const type = rival.items[index];
    if (player.items.length >= MAX_SKEWER) {
      loseRivalLast('RIVAL LOST');
      return;
    }
    rival.items.pop();
    rebuildRivalSkewer();
    player.items.push(type);
    rebuildSkewerView();
    updateHUD();
    rival.stagger = 0.45;
    showToast(`STOLEN! ${ingredientDefs[type].emoji} ${type.toUpperCase()}`, 1.2);
    return;
  }

  rival.stagger = 0.55;
  const away = rival.root.position.clone().sub(camera.position).setY(0);
  if (away.lengthSq() > 0.01) rival.root.position.add(away.normalize().multiplyScalar(0.85));
  showToast(rival.items.length ? 'HIT THE FOOD TO STEAL IT!' : 'CLANG!');
}"""
new_handle = """function takeRivalTip(isReclaim = false) {
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
}"""
rep(old_handle, new_handle, 'counter steal handler')

rep(
"""function updateRival(dt) {
  rival.attackCooldown = Math.max(0, rival.attackCooldown - dt);
  rival.collectCooldown = Math.max(0, rival.collectCooldown - dt);
  rival.stagger = Math.max(0, rival.stagger - dt);
  if (rival.stagger > 0) return;

  chooseRivalRecipe();""",
"""function updateRival(dt) {
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

  chooseRivalRecipe();""",
'grace timer',
)

rep(
"""  if (rival.items.length === recipe.items.length) {
    const distance = moveRivalToward(grill.position, dt, rival.speed * 1.08);""",
"""  if (rival.items.length === recipe.items.length) {
    if (rival.stolenGrace > 0) {
      // Give the victim a readable counter-steal window before the stolen piece can score.
      const away = rival.root.position.clone().sub(camera.position).setY(0);
      if (away.lengthSq() > 0.01) {
        const retreat = rival.root.position.clone().add(away.normalize().multiplyScalar(2.2));
        moveRivalToward(retreat, dt, rival.speed * 0.42);
      }
      return;
    }
    const distance = moveRivalToward(grill.position, dt, rival.speed * 1.08);""",
'block instant score',
)

rep(
"""      if (stolen && addRivalIngredient(stolen)) {
        rebuildSkewerView();
        updateHUD();
        const away = camera.position.clone().sub(rival.root.position).setY(0);
        if (away.lengthSq() > 0.01) camera.position.add(away.normalize().multiplyScalar(0.9));
        showToast(`😈 RIVAL STOLE YOUR ${ingredientDefs[stolen].emoji}!`, 1.3);
      }""",
"""      if (stolen && addRivalIngredient(stolen)) {
        rival.stolenType = stolen;
        rival.stolenGrace = 4.5;
        rival.stagger = 0.55;
        rebuildRivalSkewer();
        rebuildSkewerView();
        updateHUD();
        const away = camera.position.clone().sub(rival.root.position).setY(0);
        if (away.lengthSq() > 0.01) camera.position.add(away.normalize().multiplyScalar(0.9));
        showToast(`😈 STOLE ${ingredientDefs[stolen].emoji} — 4.5s TO STAB IT BACK!`, 1.5);
      }""",
'set reclaim window',
)

p.write_text(s)

p = Path('index.html')
s = p.read_text().replace('ONLINE FPS v0.5.9', 'ONLINE FPS v0.5.10', 1)
p.write_text(s)
