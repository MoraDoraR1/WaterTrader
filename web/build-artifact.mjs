// index.html + Canvas2D 게임 번들 + UI 이미지 자산을 단일 self-contained HTML로 합쳐
// 별도 정적 파일 없이도 바로 브라우저에서 실행 가능한 아티팩트를 생성한다.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { SHIPS } from './src/data/ships.js';

const CHARACTER_IDS = [
  'player_male', 'player_female',
  'european_male', 'european_female',
  'mediterranean_male', 'mediterranean_female',
  'east_asian_male', 'east_asian_female',
  'korean_male', 'korean_female',
  'tropical_male', 'tropical_female',
];

const rootDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(rootDir, 'dist');
mkdirSync(distDir, { recursive: true });

const result = await build({
  absWorkingDir: rootDir,
  entryPoints: [resolve(rootDir, 'src/main.js')],
  bundle: true,
  format: 'iife',
  write: false,
  minify: true,
  target: 'es2020',
  tsconfigRaw: { compilerOptions: {} },
});
const bundleJs = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const shipImageData = Object.fromEntries(SHIPS.map((ship) => {
  const bytes = readFileSync(resolve(rootDir, 'assets', 'ships', `${ship.id}.webp`));
  return [ship.id, `data:image/webp;base64,${bytes.toString('base64')}`];
}));
const shipImageScript = `<script>globalThis.__SHIP_IMAGE_DATA__=${JSON.stringify(shipImageData)};<\/script>`;
const characterImageData = Object.fromEntries(CHARACTER_IDS.map((id) => {
  const bytes = readFileSync(resolve(rootDir, 'assets', 'characters', `${id}.webp`));
  return [id, `data:image/webp;base64,${bytes.toString('base64')}`];
}));
const characterImageScript = `<script>globalThis.__CHARACTER_IMAGE_DATA__=${JSON.stringify(characterImageData)};<\/script>`;

let html = readFileSync(resolve(rootDir, 'index.html'), 'utf-8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');
html = html.replace(
  /<script type="module" src="\.\/src\/main\.js"><\/script>/,
  () => `${shipImageScript}\n${characterImageScript}\n<script>\n${bundleJs}\n</script>`
);

const imageAssets = [
  ['assets/title-harbor-hero.webp', 'image/webp'],
  ['assets/panel-nautical-texture.webp', 'image/webp'],
];
for (const [assetPath, mime] of imageAssets) {
  const dataUrl = `data:${mime};base64,${readFileSync(resolve(rootDir, assetPath)).toString('base64')}`;
  html = html.replaceAll(`./${assetPath}`, dataUrl);
}

writeFileSync(resolve(distDir, 'bada-sangin-standalone.html'), html);
console.log(
  'artifact built:',
  'dist/bada-sangin-standalone.html',
  (bundleJs.length / 1024).toFixed(0) + 'KB JS',
  `${imageAssets.length + SHIPS.length + CHARACTER_IDS.length} embedded images (${SHIPS.length} ships, ${CHARACTER_IDS.length} characters)`,
);
