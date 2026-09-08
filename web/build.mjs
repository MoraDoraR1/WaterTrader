import { build } from 'esbuild';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(rootDir, 'dist');
mkdirSync(distDir, { recursive: true });

await build({
  absWorkingDir: rootDir,
  entryPoints: [resolve(rootDir, 'src/main.js')],
  bundle: true,
  format: 'esm',
  outfile: resolve(distDir, 'bundle.js'),
  minify: false,
  sourcemap: false,
  target: 'es2020',
  tsconfigRaw: { compilerOptions: {} },
});
console.log('build ok');
