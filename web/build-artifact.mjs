// index.html + Canvas2D 게임 번들 + UI 이미지 자산을 단일 self-contained HTML로 합쳐
// 별도 정적 파일 없이도 바로 브라우저에서 실행 가능한 아티팩트를 생성한다.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { SHIPS } from './src/data/ships.js';

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

let html = readFileSync(resolve(rootDir, 'index.html'), 'utf-8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');
html = html.replace(
  /<script type="module" src="\.\/src\/main\.js"><\/script>/,
  () => `${shipImageScript}\n<script>\n${bundleJs}\n</script>`
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
  `${imageAssets.length + SHIPS.length} embedded images (${SHIPS.length} ships)`,
);
