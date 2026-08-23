import { build } from 'esbuild';
import { mkdirSync } from 'fs';

mkdirSync('dist', { recursive: true });

await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/bundle.js',
  minify: false,
  sourcemap: false,
  target: 'es2020',
});
console.log('build ok');
