import path from 'node:path';
import { viteSingleFile } from 'vite-plugin-singlefile';
import type { UserConfig } from 'vite';
import { contentPlugin } from './plugin';
import { repoRoot } from './content';

/** Shared Vite config: `export default appConfig(__dirname)` in apps/<id>/vite.config.ts. */
export function appConfig(appDir: string): UserConfig {
  const id = path.basename(appDir);
  return {
    root: appDir,
    base: './',
    plugins: [contentPlugin(appDir), viteSingleFile({ removeViteModuleLoader: true })],
    build: {
      outDir: path.join(repoRoot, 'dist', id),
      emptyOutDir: true,
      target: 'es2022',
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
      chunkSizeWarningLimit: 4000,
    },
  };
}
