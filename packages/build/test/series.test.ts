import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { loadApp, listApps, repoRoot, ContentError } from '../src';

/** graph.yaml `seriesNames` (colour-family legend): pass-through, warning when `series` is used without names, error when an index has no name. */
function copyApp(app: string): string {
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'study-ser-')), target = path.join(dst, 'apps', app);
  for (const a of listApps()) fs.cpSync(path.join(repoRoot, 'apps', a), path.join(dst, 'apps', a), { recursive: true, filter: (s) => !s.includes('node_modules') });
  return target;
}
const edit = (file: string, f: (y: any) => void) => { const y = YAML.parse(fs.readFileSync(file, 'utf8')); f(y); fs.writeFileSync(file, YAML.stringify(y)); };
const APP = 'transforms';

describe('seriesNames', () => {
  it('transforms names its four chapters, in order', () => {
    const { content, warnings } = loadApp(path.join(repoRoot, 'apps', APP));
    expect(content.maps[0].seriesNames).toEqual(['Eigenfunction idea', 'Continuous transforms', 'Sampling and discrete time', 'Finite records (DFT)']);
    expect(warnings.filter((w) => /seriesNames/.test(w))).toEqual([]);
  });
  it('linear-systems names the colours of all three maps and every used series has a name', () => {
    const { content, warnings } = loadApp(path.join(repoRoot, 'apps', 'linear-systems'));
    for (const m of content.maps) { expect(m.seriesNames?.length, m.id).toBeGreaterThanOrEqual(3); for (const n of m.nodes) if (n.series !== undefined) expect(n.series, `${m.id}/${n.id}`).toBeLessThan(m.seriesNames!.length); }
    expect(warnings.filter((w) => /seriesNames/.test(w))).toEqual([]);
  });
  it('series without seriesNames is a warning, not an error', () => {
    const dir = copyApp(APP); edit(path.join(dir, 'content/graph.yaml'), (y) => { delete y.maps[0].seriesNames; });
    const { warnings } = loadApp(dir);
    expect(warnings.join('\n')).toMatch(/graph\.yaml chain: nodes use series 0, 1, 2, 3 but the map has no seriesNames/);
  });
  it('a series index beyond the names is an error; too many names is a warning; more than four names is rejected', () => {
    let dir = copyApp(APP); edit(path.join(dir, 'content/graph.yaml'), (y) => { y.maps[0].seriesNames = ['a name', 'b name']; });
    expect(() => loadApp(dir)).toThrow(ContentError); try { loadApp(dir); } catch (e) { expect((e as Error).message).toMatch(/series 2 is used but seriesNames has only 2 names/); }
    dir = copyApp(APP); edit(path.join(dir, 'content/graph.yaml'), (y) => { y.maps[0].seriesNames = ['n one', 'n two', 'n three', 'n four']; for (const n of y.maps[0].nodes) if (n.series === 3) n.series = 2; });
    expect(loadApp(dir).warnings.join('\n')).toMatch(/lists 4 names but only series 0, 1, 2 are used/);
    dir = copyApp(APP); edit(path.join(dir, 'content/graph.yaml'), (y) => { y.maps[0].seriesNames = ['aaa', 'bbb', 'ccc', 'ddd', 'eee']; });
    expect(() => loadApp(dir)).toThrow(/seriesNames/);
  });
});
