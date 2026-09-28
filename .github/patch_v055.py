from pathlib import Path

# index.html
p = Path('index.html')
s = p.read_text()
s = s.replace(
    'content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"',
    'content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content"',
    1,
)
s = s.replace('ONLINE FPS v0.5.3', 'ONLINE FPS v0.5.5', 1)
p.write_text(s)

# styles.css
p = Path('styles.css')
s = p.read_text()
s = s.replace(
    ':root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; --app-h: 100dvh; }',
    ':root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; --app-w: 100vw; --app-h: 100dvh; --app-x: 0px; --app-y: 0px; }',
    1,
)
s = s.replace(
    'body { user-select: none; position: fixed; inset: 0; width: 100vw; height: var(--app-h); }',
    'body { user-select: none; position: fixed; inset: 0; width: 100vw; height: 100dvh; -webkit-text-size-adjust: 100%; }',
    1,
)
for old, new in [
    ('canvas { position: fixed; inset: 0; display: block; width: 100vw; height: var(--app-h); }',
     'canvas { position: fixed; left: var(--app-x); top: var(--app-y); display: block; width: var(--app-w); height: var(--app-h); }'),
    ('.hud { position: fixed; inset: 0; width: 100vw; height: var(--app-h); pointer-events: none;',
     '.hud { position: fixed; left: var(--app-x); top: var(--app-y); width: var(--app-w); height: var(--app-h); pointer-events: none;'),
    ('.start-screen { position: fixed; inset: 0; width: 100vw; height: var(--app-h);',
     '.start-screen { position: fixed; left: var(--app-x); top: var(--app-y); width: var(--app-w); height: var(--app-h);'),
    ('.mobile-controls, .topdown-mobile-controls { position: fixed; inset: 0; width: 100vw; height: var(--app-h);',
     '.mobile-controls, .topdown-mobile-controls { position: fixed; left: var(--app-x); top: var(--app-y); width: var(--app-w); height: var(--app-h);'),
    ('.rotate-hint { position: fixed; inset: 0; width: 100vw; height: var(--app-h);',
     '.rotate-hint { position: fixed; left: var(--app-x); top: var(--app-y); width: var(--app-w); height: var(--app-h);'),
]:
    if old not in s:
        raise SystemExit(f'missing CSS patch target: {old[:50]}')
    s = s.replace(old, new, 1)
p.write_text(s)

# game.js
p = Path('src/game.js')
s = p.read_text()
old = """function getViewportSize() {
  const vv = window.visualViewport;
  return {
    width: Math.max(1, Math.round(vv?.width || innerWidth)),
    height: Math.max(1, Math.round(vv?.height || innerHeight)),
  };
}"""
new = """function getViewportSize() {
  const vv = window.visualViewport;
  return {
    width: Math.max(1, Math.round(vv?.width || innerWidth)),
    height: Math.max(1, Math.round(vv?.height || innerHeight)),
    left: Math.round(vv?.offsetLeft || 0),
    top: Math.round(vv?.offsetTop || 0),
  };
}"""
if old not in s:
    raise SystemExit('missing viewport helper target')
s = s.replace(old, new, 1)

old = """async function startGame() {
  const requestedName = playerNameInput?.value.trim() || '';"""
new = """async function startGame() {
  const requestedName = playerNameInput?.value.trim() || '';"""
# marker only: keep function intact
if old not in s:
    raise SystemExit('missing start game marker')

old = """    try { if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); } catch {}
    try { if (screen.orientation?.lock) await screen.orientation.lock('landscape'); } catch {}
    mobileYaw = camera.rotation.y;"""
new = """    try {
      const fs = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      if (fs) await fs.call(document.documentElement);
    } catch {}
    try { if (screen.orientation?.lock) await screen.orientation.lock('landscape'); } catch {}
    resizeViewport();
    setTimeout(resizeViewport, 120);
    setTimeout(resizeViewport, 350);
    mobileYaw = camera.rotation.y;"""
if old not in s:
    raise SystemExit('missing fullscreen block')
s = s.replace(old, new, 1)

marker = """startButton.addEventListener('click', startGame);"""
insert = """// iOS Safari can still try gesture zoom even with viewport meta settings.
// Prevent it so the game always stays fitted to the current rotated viewport.
if (MOBILE) {
  for (const eventName of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(eventName, (event) => event.preventDefault(), { passive: false });
  }
  document.addEventListener('dblclick', (event) => event.preventDefault(), { passive: false });
}

startButton.addEventListener('click', startGame);"""
if marker not in s:
    raise SystemExit('missing start listener marker')
s = s.replace(marker, insert, 1)

old = """function resizeViewport() {
  const { width, height } = getViewportSize();
  document.documentElement.style.setProperty('--app-h', `${height}px`);
  camera.aspect = width / height;
  camera.fov = MOBILE && width / height > 1.95 ? 65 : 72;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
}"""
new = """function resizeViewport() {
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
}"""
if old not in s:
    raise SystemExit('missing resize viewport target')
s = s.replace(old, new, 1)

p.write_text(s)
