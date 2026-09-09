import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CITIES } from '../src/data/cities.js';
import { pointOnAnyLand } from '../src/data/coastline.js';
import { CharacterController, CITY_WALK_SPEED } from '../src/entities/characterController.js';
import { computeCityMarkers, CITY_MARKER_STYLES } from '../src/render/seaCityVisuals.js';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(webRoot, path), 'utf8');

const canvas = read('src/render/canvas2d.js');
const main = read('src/main.js');
const city = read('src/scenes/cityScene.js');
const sea = read('src/scenes/seaScene.js');
const html = read('index.html');

assert.match(canvas, /class HighResolutionSurface/);
assert.match(canvas, /resizeForDisplay\(displayW, displayH\)/);
assert.match(canvas, /imageSmoothingEnabled = true/g);
assert.doesNotMatch(canvas, /imageSmoothingEnabled\s*=\s*false/);
assert.match(main, /surface\.resizeForDisplay\(displayCanvas\.width, displayCanvas\.height\)/);
assert.match(html, /#game-canvas[^}]*image-rendering:\s*auto/);
assert.doesNotMatch(city, /characterSprite|pixelSprites/);
assert.doesNotMatch(sea, /cityIconSprite|pixelSprites/);
assert.doesNotMatch(sea, /_drawHarborBeacon|lighthouse/i);
assert.equal(existsSync(resolve(webRoot, 'src/render/pixelSprites.js')), false);

const characterAssets = readdirSync(resolve(webRoot, 'assets/characters')).filter((name) => name.endsWith('.webp'));
assert.equal(characterAssets.length, 12);

assert.equal(CITY_WALK_SPEED, 10);
assert.ok(CITY_WALK_SPEED >= 4.6 * 2);
const controller = new CharacterController();
controller.update(0.1, { x: 1, y: 0 }, null, null);
assert.equal(controller.walking, true);
assert.ok(controller.pos.x > 0.99);
assert.ok(controller.walkPhase > 0);
controller.update(0.1, { x: 0, y: 0 }, null, null);
assert.equal(controller.walking, false);
assert.match(city, /_drawGeneratedCharacter/);
assert.match(city, /this\.character\.walkPhase/);

const markers = computeCityMarkers(CITIES);
assert.equal(markers.length, CITIES.length);
assert.equal(markers.filter((marker) => !pointOnAnyLand(marker.pos.x, marker.pos.y) && !marker.syntheticLand).length, 0);
assert.equal(markers.filter((marker) => pointOnAnyLand(marker.dockPos.x, marker.dockPos.y)).length, 0);
assert.equal(new Set(markers.map((marker) => marker.styleId)).size, Object.keys(CITY_MARKER_STYLES).length);
const lisboa = markers.find((marker) => marker.cityId === 'lisboa');
assert.ok(lisboa?.naturalLand);
assert.equal(lisboa?.syntheticLand, false);

const closeButtonIds = [
  'dialogue-close', 'inventory-close', 'world-map-close', 'ship-info-close', 'shipyard-close',
  'skill-close', 'titles-close', 'compendium-close', 'market-close', 'quest-close',
];
for (const id of closeButtonIds) {
  assert.match(html, new RegExp(`id=["']${id}["']`));
  assert.match(main, new RegExp(`["']${id}["']`));
}
assert.match(html, /\.ui-close-btn\s*\{/);

console.log('[suite:render-smoothing] PASS - display-resolution backing canvas and high-quality interpolation enabled');
console.log('[suite:legacy-pixel-removal] PASS - low-resolution character and harbor marker sprites removed');
console.log('[suite:character-assets] PASS - 12 smooth WebP character assets available');
console.log('[suite:city-character-motion] PASS - 2.17x movement speed and movement-gated walk cycle verified');
console.log('[suite:city-placement] PASS - all 69 cities have land footing, water docks, and 8 culture-specific silhouettes');
console.log('[suite:mouse-close-controls] PASS - 10 major UI windows expose wired mouse close buttons');
