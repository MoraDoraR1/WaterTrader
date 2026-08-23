const held = new Set();
const justPressed = new Set();

window.addEventListener('keydown', (e) => {
  const k = e.code;
  if (!held.has(k)) justPressed.add(k);
  held.add(k);
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', (e) => held.delete(e.code));
window.addEventListener('blur', () => held.clear());

export function isDown(code) { return held.has(code); }

export function consumeJustPressed(code) {
  if (justPressed.has(code)) { justPressed.delete(code); return true; }
  return false;
}

export function clearFrame() { justPressed.clear(); }
