/** Build the core control-visuals gallery to dist/_gallery/index.html (single file). Used by the e2e tests; not listed on the hub. */
import path from 'node:path';
import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { repoRoot } from '../packages/build/src';

const root = path.join(repoRoot, 'packages/core/gallery');
await build({
  root, base: './', logLevel: 'warn',
  plugins: [{ name: 'no-katex', resolveId: (id) => (id === 'virtual:katex-css' ? '\0katex-css' : null), load: (id) => (id === '\0katex-css' ? 'export default ""' : null) }, viteSingleFile({ removeViteModuleLoader: true })],
  build: { outDir: path.join(repoRoot, 'dist', '_gallery'), emptyOutDir: true, target: 'es2022', assetsInlineLimit: 100_000_000, cssCodeSplit: false, chunkSizeWarningLimit: 4000 },
});
console.log('✓ gallery: dist/_gallery/index.html');
