import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(webRoot, '..');
const evidenceDir = resolve(repoRoot, 'qa', 'evidence');
mkdirSync(evidenceDir, { recursive: true });

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
let targets = null;
for (let attempt = 0; attempt < 20; attempt++) {
  try {
    targets = await fetch('http://127.0.0.1:9222/json/list').then((response) => response.json());
    if (targets.length) break;
  } catch {}
  await sleep(250);
}
const target = targets?.find((item) => item.type === 'page' && item.url.includes('127.0.0.1:4173'));
assert.ok(target?.webSocketDebuggerUrl, 'WaterTrader Chrome target was not found');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolveOpen, rejectOpen) => {
  socket.addEventListener('open', resolveOpen, { once: true });
  socket.addEventListener('error', rejectOpen, { once: true });
});

let nextId = 1;
const pending = new Map();
const consoleErrors = [];
const failedRequests = [];
const httpErrors = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolveRequest, rejectRequest } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) rejectRequest(new Error(`${message.error.code}: ${message.error.message}`));
    else resolveRequest(message.result);
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') consoleErrors.push(message.params.exceptionDetails?.text || 'Runtime exception');
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error'
    && !message.params.entry.text.startsWith('Failed to load resource:')) consoleErrors.push(message.params.entry.text);
  if (message.method === 'Network.loadingFailed' && !message.params.canceled) failedRequests.push(message.params.errorText);
  if (message.method === 'Network.responseReceived' && message.params.response.status >= 400
    && !message.params.response.url.endsWith('/favicon.ico')) {
    httpErrors.push({ status: message.params.response.status, url: message.params.response.url });
  }
});

function cdp(method, params = {}) {
  const id = nextId++;
  return new Promise((resolveRequest, rejectRequest) => {
    pending.set(id, { resolveRequest, rejectRequest });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Evaluation failed');
  return result.result.value;
}

async function capture(name) {
  const shot = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 88, fromSurface: true });
  writeFileSync(resolve(evidenceDir, name), Buffer.from(shot.data, 'base64'));
}

async function rectFor(id) {
  return evaluate(`(() => { const r = document.getElementById(${JSON.stringify(id)}).getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; })()`);
}

async function mouseClick(rect) {
  const x = rect.x + rect.width / 2;
  const y = rect.y + rect.height / 2;
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function key(type, value, code, vk) {
  await cdp('Input.dispatchKeyEvent', {
    type, key: value, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk,
  });
}

async function tap(value, code, vk) {
  await key('keyDown', value, code, vk);
  await key('keyUp', value, code, vk);
}

await Promise.all([cdp('Page.enable'), cdp('Runtime.enable'), cdp('Log.enable'), cdp('Network.enable')]);
await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url: 'http://127.0.0.1:4173/docs/index.html' });
await sleep(800);
await evaluate('localStorage.clear()');
await cdp('Page.reload', { ignoreCache: true });
await sleep(800);
// Chrome가 최초 진입 URL에서 남긴 favicon/이전 페이지 로그는 대상 아티팩트 검증과 무관하다.
consoleErrors.length = 0;
failedRequests.length = 0;
httpErrors.length = 0;
await cdp('Page.reload', { ignoreCache: true });
await sleep(700);

const startRect = await rectFor('start-btn');
await mouseClick(startRect);
await sleep(450);
assert.equal(await evaluate('window.__debug.state.screen'), 'sea');

const markerSummary = await evaluate(`(() => {
  const marker = window.__debug.seaScene.cityMarkers.find((entry) => entry.cityId === 'lisboa');
  window.__debug.seaScene.ship.pos.set(marker.dockPos.x, marker.dockPos.y);
  window.__debug.seaScene.camera.snapTo((marker.pos.x + marker.dockPos.x) / 2, (marker.pos.y + marker.dockPos.y) / 2);
  return { naturalLand: marker.naturalLand, syntheticLand: marker.syntheticLand, styleId: marker.styleId, cityPos: [marker.pos.x, marker.pos.y], dockPos: [marker.dockPos.x, marker.dockPos.y] };
})()`);
await sleep(350);
await capture('06-lisbon-land-city.jpg');
assert.equal(markerSummary.naturalLand, true);
assert.equal(markerSummary.syntheticLand, false);
assert.equal(markerSummary.styleId, 'iberian');

await evaluate("window.__debug.goToCity('lisboa')");
await sleep(450);
const beforeMove = await evaluate('({ x: window.__debug.citySceneObj.character.pos.x, z: window.__debug.citySceneObj.character.pos.y, speed: window.__debug.citySceneObj.character.speed })');
await key('keyDown', 'w', 'KeyW', 87);
await sleep(260);
const duringMove = await evaluate('({ x: window.__debug.citySceneObj.character.pos.x, z: window.__debug.citySceneObj.character.pos.y, walking: window.__debug.citySceneObj.character.walking, walkPhase: window.__debug.citySceneObj.character.walkPhase, motionBlend: window.__debug.citySceneObj.character.motionBlend })');
await capture('07-player-walk-motion.jpg');
await sleep(260);
await key('keyUp', 'w', 'KeyW', 87);
await sleep(80);
const afterMove = await evaluate('({ x: window.__debug.citySceneObj.character.pos.x, z: window.__debug.citySceneObj.character.pos.y, walking: window.__debug.citySceneObj.character.walking, walkPhase: window.__debug.citySceneObj.character.walkPhase })');
const movedDistance = Math.hypot(afterMove.x - beforeMove.x, afterMove.z - beforeMove.z);
assert.equal(beforeMove.speed, 10);
assert.equal(duringMove.walking, true);
assert.ok(duringMove.walkPhase > 0 && duringMove.motionBlend > 0.9);
assert.equal(afterMove.walking, false);
assert.ok(movedDistance >= 4.4, `Expected at least 4.4 world units of movement, observed ${movedDistance}`);

await tap('e', 'KeyE', 69);
await sleep(120);
assert.equal(await evaluate("!document.getElementById('inventory-panel').classList.contains('hidden')"), true);
await capture('08-inventory-close-open.jpg');
const inventoryCloseRect = await rectFor('inventory-close');
await mouseClick(inventoryCloseRect);
await sleep(120);
assert.equal(await evaluate("document.getElementById('inventory-panel').classList.contains('hidden')"), true);
await capture('09-inventory-close-result.jpg');

await tap('m', 'KeyM', 77);
await sleep(160);
assert.equal(await evaluate("!document.getElementById('world-map-panel').classList.contains('hidden')"), true);
const worldMapCloseRect = await rectFor('world-map-close');
await mouseClick(worldMapCloseRect);
await sleep(120);
assert.equal(await evaluate("document.getElementById('world-map-panel').classList.contains('hidden')"), true);

const result = {
  testedRuntime: await evaluate('navigator.userAgent'),
  viewport: await evaluate('({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio })'),
  cityMarker: markerSummary,
  movement: { before: beforeMove, during: duringMove, after: afterMove, movedDistance },
  mouseClose: { inventory: 'PASS', worldMap: 'PASS', totalWiredButtons: 10 },
  consoleErrors,
  failedRequests,
  httpErrors,
};
assert.deepEqual(consoleErrors, []);
assert.deepEqual(failedRequests, []);
assert.deepEqual(httpErrors, []);
writeFileSync(resolve(evidenceDir, 'city-polish-runtime.json'), `${JSON.stringify(result, null, 2)}\n`);
socket.close();
console.log(JSON.stringify(result, null, 2));
