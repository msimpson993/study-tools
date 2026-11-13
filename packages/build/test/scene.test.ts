import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { loadApp, listApps, repoRoot, ContentError } from '../src';

/** `runningExample.scene` + `exampleScene: {overlays}` on dives and map nodes: schema, catalogue validation, inheritance. Temp copy of a shipped app. */
function copyApp(app: string): string {
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'study-sc-')), target = path.join(dst, 'apps', app);
  for (const a of listApps()) fs.cpSync(path.join(repoRoot, 'apps', a), path.join(dst, 'apps', a), { recursive: true, filter: (s) => !s.includes('node_modules') });
  return target;
}
const edit = (file: string, f: (y: any) => void) => { const y = YAML.parse(fs.readFileSync(file, 'utf8')); f(y); fs.writeFileSync(file, YAML.stringify(y)); };
const front = (file: string, f: (fm: any) => void) => { const raw = fs.readFileSync(file, 'utf8'), m = /^---\n([\s\S]*?)\n---\n/.exec(raw)!; const fm = YAML.parse(m[1]); f(fm); fs.writeFileSync(file, `---\n${YAML.stringify(fm)}---\n${raw.slice(m[0].length)}`); };
const msg = (dir: string) => { try { loadApp(dir); return ''; } catch (e) { expect(e).toBeInstanceOf(ContentError); return (e as Error).message; } };
const APP = 'transforms';
/** transforms ships with scenes on every dive; strip them so each test states exactly what it adds */
const withScene = (overlays?: string[]) => {
  const dir = copyApp(APP); edit(path.join(dir, 'subject.yaml'), (y) => { y.runningExample.scene = { id: 'tine', ...(overlays ? { overlays } : {}) }; });
  for (const f of fs.readdirSync(path.join(dir, 'content/dives'))) front(path.join(dir, 'content/dives', f), (fm) => { delete fm.exampleScene; });
  return dir;
};

describe('example scene content field', () => {
  it('subject scene + dive overlays pass through to the built content', () => {
    const dir = withScene(['envelope']); front(path.join(dir, 'content/dives/ring.md'), (fm) => { fm.exampleScene = { overlays: ['envelope', 'poles'], caption: 'the ring and its poles' }; });
    const { content } = loadApp(dir);
    expect(content.subject.runningExample?.scene).toEqual({ id: 'tine', overlays: ['envelope'] });
    expect(content.dives.find((d) => d.id === 'ring')?.exampleScene).toEqual({ overlays: ['envelope', 'poles'], caption: 'the ring and its poles' });
  });
  it('a dive inherits the overlays of a map node that links to it', () => {
    const dir = withScene(); edit(path.join(dir, 'content/graph.yaml'), (y) => { const n = y.maps[0].nodes.find((x: any) => x.dive === 'zmap'); n.exampleScene = { overlays: ['poles', 'zpoles'] }; });
    expect(loadApp(dir).content.dives.find((d) => d.id === 'zmap')?.exampleScene).toEqual({ overlays: ['poles', 'zpoles'] });
  });
  it('dives without exampleScene only warn (the default overlays are shown)', () => { expect(loadApp(withScene()).warnings.join('\n')).toMatch(/dives\/ring: no exampleScene/); });
  it.each([
    ['unknown scene id', (dir: string) => edit(path.join(dir, 'subject.yaml'), (y) => { y.runningExample.scene = { id: 'bogus' }; }), /unknown scene "bogus"/],
    ['unknown overlay on a dive', (dir: string) => front(path.join(dir, 'content/dives/ring.md'), (fm) => { fm.exampleScene = { overlays: ['forces'] }; }), /dives\/ring exampleScene: unknown overlay "forces" for scene "tine"/],
    ['three panels at once', (dir: string) => front(path.join(dir, 'content/dives/ring.md'), (fm) => { fm.exampleScene = { overlays: ['poles', 'spectrum', 'zpoles'] }; }), /at most 2/],
    ['empty overlay list', (dir: string) => front(path.join(dir, 'content/dives/ring.md'), (fm) => { fm.exampleScene = { overlays: [] }; }), /overlays|minItems/],
    ['unknown key', (dir: string) => front(path.join(dir, 'content/dives/ring.md'), (fm) => { fm.exampleScene = { overlays: ['poles'], speed: 2 }; }), /additional|speed/i],
    ['bad overlay on a map node', (dir: string) => edit(path.join(dir, 'content/graph.yaml'), (y) => { y.maps[0].nodes[1].exampleScene = { overlays: ['nope'] }; }), /unknown overlay "nope"/],
  ])('rejects %s', (_n, mut, re) => { const dir = withScene(); mut(dir); expect(msg(dir)).toMatch(re); });
  it('exampleScene without a runningExample.scene is ignored with a warning', () => {
    const dir = copyApp(APP); edit(path.join(dir, 'subject.yaml'), (y) => { delete y.runningExample.scene; });
    expect(msg(dir)).toBe(''); expect(loadApp(dir).warnings.join('\n')).toMatch(/dives\/ring: exampleScene is ignored/);
  });
  it('shipped: linear-systems and transforms give every dive an exampleScene that validates', () => {
    for (const [app, scene] of [['linear-systems', 'cart'], ['transforms', 'tine']] as const) {
      const { content, warnings } = loadApp(path.join(repoRoot, 'apps', app));
      expect(content.subject.runningExample?.scene?.id).toBe(scene);
      for (const d of content.dives) expect(d.exampleScene?.overlays?.length, `${app}/${d.id}`).toBeGreaterThan(0);
      expect(warnings.filter((w) => /exampleScene/.test(w))).toEqual([]);
    }
  });
});
