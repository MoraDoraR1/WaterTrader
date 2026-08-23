// index.html + src/main.js(+three.js 번들)을 단일 self-contained HTML로 합쳐
// 다운로드/서버 없이 바로 브라우저에서 실행 가능한 아티팩트를 생성한다.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

mkdirSync('dist', { recursive: true });

const result = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  write: false,
  minify: true,
  target: 'es2020',
});
const bundleJs = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

let html = readFileSync('index.html', 'utf-8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');
html = html.replace(
  /<script type="module" src="\.\/src\/main\.js"><\/script>/,
  () => `<script>\n${bundleJs}\n</script>`
);

writeFileSync('dist/bada-sangin-standalone.html', html);
console.log('artifact built:', 'dist/bada-sangin-standalone.html', (bundleJs.length / 1024).toFixed(0) + 'KB JS');
