import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import type { Plugin } from 'vite';
import { loadApp, ContentError } from './content';

const VIRTUAL = 'virtual:study-content';
const KATEX_CSS = 'virtual:katex-css';

/** Build a KaTeX stylesheet with only woff2 fonts, inlined as data URIs (keeps single-file output lean). */
function katexCss(): string {
  const base = path.dirname(require.resolve('katex/package.json'));
  let css = fs.readFileSync(path.join(base, 'dist', 'katex.min.css'), 'utf8');
  css = css.replace(/src:url\(fonts\/([^)]+?)\.woff2\) format\("woff2"\),url\([^)]*\) format\("woff"\),url\([^)]*\) format\("truetype"\)/g, (_m, name) => {
    const b64 = fs.readFileSync(path.join(base, 'dist', 'fonts', `${name}.woff2`)).toString('base64');
    return `src:url(data:font/woff2;base64,${b64}) format("woff2")`;
  });
  return css;
}

export function contentPlugin(appDir: string): Plugin {
  let cached: string | null = null;
  return {
    name: 'study-content',
    resolveId(id) { if (id === VIRTUAL || id === KATEX_CSS) return '\0' + id; return null; },
    load(id) {
      if (id === '\0' + VIRTUAL) {
        try {
          const { content } = loadApp(appDir);
          cached = JSON.stringify(content);
        } catch (e) {
          if (e instanceof ContentError) { this.error(e.message); }
          throw e;
        }
        return `export default ${cached};`;
      }
      if (id === '\0' + KATEX_CSS) return `export default ${JSON.stringify(katexCss())};`;
      return null;
    },
    configureServer(server) {
      const dir = path.join(appDir, 'content');
      server.watcher.add([dir, path.join(appDir, 'subject.yaml')]);
      server.watcher.on('change', (f) => {
        if (f.startsWith(dir) || f.endsWith('subject.yaml')) {
          const mod = server.moduleGraph.getModuleById('\0' + VIRTUAL);
          if (mod) { server.moduleGraph.invalidateModule(mod); server.ws.send({ type: 'full-reload' }); }
        }
      });
    },
  };
}
