from pathlib import Path

p = Path('src/game.js')
s = p.read_text()
old = """function updateOrientationHint() {
  if (!MOBILE || !rotateHint) return;
  rotateHint.classList.toggle('hidden', innerWidth >= innerHeight);
}
addEventListener('orientationchange', updateOrientationHint);
updateOrientationHint();"""
new = """function updateOrientationHint() {
  if (!MOBILE || !rotateHint) return;
  const orientationType = screen.orientation?.type || '';
  const landscape = innerWidth >= innerHeight || orientationType.startsWith('landscape');
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
scheduleOrientationHintUpdate();"""
if old not in s:
    raise SystemExit('orientation hint target not found')
s = s.replace(old, new, 1)
p.write_text(s)
