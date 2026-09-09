import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
assert.equal(existsSync(resolve(webRoot, 'src/render/pixelSprites.js')), false);

const characterAssets = readdirSync(resolve(webRoot, 'assets/characters')).filter((name) => name.endsWith('.webp'));
assert.equal(characterAssets.length, 12);

console.log('[suite:render-smoothing] PASS - display-resolution backing canvas and high-quality interpolation enabled');
console.log('[suite:legacy-pixel-removal] PASS - low-resolution character and harbor marker sprites removed');
console.log('[suite:character-assets] PASS - 12 smooth WebP character assets available');
