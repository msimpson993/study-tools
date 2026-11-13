import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { loadApp, listApps, repoRoot, ContentError } from '../src';

function copyApp(app: string): string {
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'study-'));
  const target = path.join(dst, 'apps', app);
  fs.cpSync(path.join(repoRoot, 'apps', app), target, { recursive: true, filter: (s) => !s.includes('node_modules') });
  // sibling apps so cross-app link checks work
  for (const other of listApps()) if (other !== app) fs.cpSync(path.join(repoRoot, 'apps', other), path.join(dst, 'apps', other), { recursive: true, filter: (s) => !s.includes('node_modules') });
  return target;
}
const edit = (file: string, f: (y: any) => void) => { const y = YAML.parse(fs.readFileSync(file, 'utf8')); f(y); fs.writeFileSync(file, YAML.stringify(y)); };
const errorsOf = (dir: string): string => { try { loadApp(dir); return ''; } catch (e) { expect(e).toBeInstanceOf(ContentError); return (e as Error).message; } };

describe('shipped content', () => {
  it.each(listApps())('%s validates and matches its porting guard', (app) => {
    const { content } = loadApp(path.join(repoRoot, 'apps', app));
    expect(content.maps.length).toBeGreaterThan(0);
  });
  it('linear-systems keeps all 3 maps / 64 nodes / 80 edges / 18 dives', () => {
    const { content } = loadApp(path.join(repoRoot, 'apps', 'linear-systems'));
    expect(content.maps.length).toBe(3);
    expect(content.maps.reduce((n, m) => n + m.nodes.length, 0)).toBe(64);
    expect(content.maps.reduce((n, m) => n + m.edges.length, 0)).toBe(80);
    expect(content.dives.length).toBe(18);
  });
  it('transforms keeps all 20 examples and 9 transform pairs', () => {
    const { content } = loadApp(path.join(repoRoot, 'apps', 'transforms'));
    expect((content.extra.examples as any).examples.length).toBe(20);
    expect(content.subject.board!.pairs.length).toBe(9);
  });
  it('every node and edge has a non-empty popup', () => {
    for (const app of listApps()) {
      const { content } = loadApp(path.join(repoRoot, 'apps', app));
      for (const m of content.maps) {
        for (const n of m.nodes) expect(n.short.trim().length, `${app}/${m.id}/${n.id}`).toBeGreaterThan(19);
        for (const e of m.edges) { expect(e.question.trim().length).toBeGreaterThan(7); expect(e.idea.trim().length).toBeGreaterThan(19); }
      }
    }
  });
});

describe('the build fails on broken content', () => {
  it('dangling edge reference', () => {
    const dir = copyApp('transforms');
    edit(path.join(dir, 'content/graph.yaml'), (y) => { y.maps[0].edges[0].to = 'nope'; });
    expect(errorsOf(dir)).toMatch(/nope/);
  });
  it('empty popup text', () => {
    const dir = copyApp('transforms');
    edit(path.join(dir, 'content/graph.yaml'), (y) => { y.maps[0].nodes[1].short = ''; });
    expect(errorsOf(dir)).not.toBe('');
  });
  it('missing root', () => {
    const dir = copyApp('transforms');
    edit(path.join(dir, 'content/graph.yaml'), (y) => { y.maps[0].nodes[0].id = 'start'; y.maps[0].edges[0].from = 'start'; });
    expect(errorsOf(dir)).toMatch(/root/);
  });
  it('cycle', () => {
    const dir = copyApp('transforms');
    edit(path.join(dir, 'content/graph.yaml'), (y) => { y.maps[0].edges.push({ from: 'stable', to: 'eigenfn', question: 'Does this loop back to the start?', idea: 'It should not: question chains must be acyclic.' }); });
    expect(errorsOf(dir)).toMatch(/cycle/i);
  });
  it('unknown live preset', () => {
    const dir = copyApp('transforms');
    edit(path.join(dir, 'content/graph.yaml'), (y) => { y.maps[0].nodes[1].live = 'board:ft?preset=doesnotexist'; });
    expect(errorsOf(dir)).toMatch(/doesnotexist/);
  });
  it('quiz tag that matches nothing', () => {
    const dir = copyApp('transforms');
    edit(path.join(dir, 'content/quiz.yaml'), (y) => { y[0].tags = ['ghost']; });
    expect(errorsOf(dir)).toMatch(/ghost/);
  });
  it('porting guard: dropped example', () => {
    const dir = copyApp('transforms');
    edit(path.join(dir, 'content/examples.yaml'), (y) => { y.examples.pop(); y.tryThis = y.tryThis.filter((t: any) => t.id !== 'kaiserb'); });
    expect(errorsOf(dir)).toMatch(/examples/);
  });
  it('cross-app link to a missing app', () => {
    const dir = copyApp('transforms');
    edit(path.join(dir, 'content/graph.yaml'), (y) => { y.maps[0].nodes[0].link = { href: '../ghost-app/#/', label: 'x' }; });
    expect(errorsOf(dir)).toMatch(/ghost-app/);
  });
});
