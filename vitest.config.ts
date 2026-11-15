import { defineConfig } from 'vitest/config';

/** App figure tests import @study/core, which pulls theme.css / virtual:katex-css. Stub those in unit tests. */
function stubCss() {
  const virtual = '\0stub-css';
  return {
    name: 'stub-css-for-tests',
    resolveId(id: string) {
      if (id === 'virtual:katex-css' || id.endsWith('.css') || id.endsWith('.css?inline')) return virtual;
    },
    load(id: string) { if (id === virtual) return 'export default "";'; },
  };
}

export default defineConfig({
  plugins: [stubCss()],
  test: { include: ['packages/*/test/**/*.test.ts', 'apps/*/test/**/*.test.ts'], environment: 'node' },
});
