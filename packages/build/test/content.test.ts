import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { loadApp, listApps, repoRoot, ContentError } from '../src';
import { boxBodyWords, lineBodyWords, capReport } from './wordcap';

/** retired apps kept as small, stable test fixtures (packages/build/test/fixtures/apps/<id>) */
const FIXTURES = path.join(repoRoot, 'packages/build/test/fixtures/apps');
const srcOf = (a: string) => (fs.existsSync(path.join(repoRoot, 'apps', a, 'subject.yaml')) ? path.join(repoRoot, 'apps', a) : path.join(FIXTURES, a));
const allApps = () => [...listApps(), ...fs.readdirSync(FIXTURES).filter((a) => !listApps().includes(a))];


function copyApp(app: string): string {
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'study-'));
  const target = path.join(dst, 'apps', app);
  fs.cpSync(srcOf(app), target, { recursive: true, filter: (s) => !s.includes('node_modules') });
  // sibling apps so cross-app link checks work
  for (const other of allApps()) if (other !== app) fs.cpSync(srcOf(other), path.join(dst, 'apps', other), { recursive: true, filter: (s) => !s.includes('node_modules') });
  return target;
}
const edit = (file: string, f: (y: any) => void) => { const y = YAML.parse(fs.readFileSync(file, 'utf8')); f(y); fs.writeFileSync(file, YAML.stringify(y)); };
const errorsOf = (dir: string): string => { try { loadApp(dir); return ''; } catch (e) { expect(e).toBeInstanceOf(ContentError); return (e as Error).message; } };

describe('shipped content', () => {
  it.each(listApps())('%s validates and matches its porting guard', (app) => {
    const { content } = loadApp(srcOf(app));
    expect(content.maps.length).toBeGreaterThan(0);
  });
  it('linear-systems keeps its 2 maps / 52 nodes / 55 edges / 31 dives (Big picture + Full detail rebuild)', () => {
    const { content } = loadApp(path.join(repoRoot, 'apps', 'linear-systems'));
    expect(content.maps.map((m) => m.id)).toEqual(['big', 'full']);
    expect(content.maps.reduce((n, m) => n + m.nodes.length, 0)).toBe(52);
    expect(content.maps.reduce((n, m) => n + m.edges.length, 0)).toBe(55);
    expect(content.dives.length).toBe(31);
    expect((content.review ?? []).map((r) => r.id)).toEqual(['part-a', 'part-b', 'formula-sheet', 'self-test']);
    expect(content.quiz.length).toBe(103); // 97 + 4 kept from the retired transforms page + 2 skyhook (Nov 19)
    expect(content.quiz.filter((q) => q.tags?.includes('variants')).length).toBe(21);
  });
  it('linear-systems Big-picture boxes follow the fixed pop-up template (answer, rough words, running example, next question; every figure captioned)', () => {
    const { content } = loadApp(path.join(repoRoot, 'apps', 'linear-systems'));
    const big = content.maps.find((m) => m.id === 'big')!;
    expect(big.nodes.length).toBe(15);
    const words = (h: string) => h.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    for (const n of big.nodes) {
      expect(n.short, n.id).toBeTruthy();
      expect(n.pop?.rough, n.id).toBeTruthy();
      const example = n.pop?.example ?? n.addsToExample;
      expect(example, n.id).toBeTruthy();
      const next = n.pop?.next ?? big.edges.find((e) => e.from === n.id && !e.dashed)?.question;
      if (n.id !== 'WORK') expect(next, n.id).toBeTruthy();
      if (n.id !== 'root') expect(n.pop?.ask, `${n.id} has an intuition question`).toBeTruthy();
      const figs = n.pop?.figures ?? [];
      // every figure strip has a caption saying what it shows and what it proves; several panels are labelled (a), (b)… and walked through in order
      if (figs.length) expect(n.pop?.figCaption, `${n.id} figure caption`).toBeTruthy();
      if (figs.length > 1) figs.forEach((f, i) => { const L = String.fromCharCode(97 + i); expect(f.caption ?? '', `${n.id} panel ${L} label`).toMatch(new RegExp(`^\\(${L}\\)`)); const cap = (n.pop?.figCaption ?? '').replace(/\((\w)–(\w)\)/g, (_, x: string, y: string) => Array.from({ length: y.charCodeAt(0) - x.charCodeAt(0) + 1 }, (_, j) => `(${String.fromCharCode(x.charCodeAt(0) + j)})`).join(' ')); expect(cap, `${n.id} caption walks through (${L})`).toContain(`(${L})`); });
      // length: the soft word cap (main body only) is checked in its own test below
      expect((n.pop?.figures ?? []).length, n.id).toBeLessThanOrEqual(4);
    }
    // every outgoing edge carries the question the box ends on
    for (const e of big.edges) expect(e.question, `${e.from}->${e.to}`).toBeTruthy();
    // every main-chain (solid) line says why you would ask its question there; the full map's lines too
    for (const m of content.maps) for (const e of m.edges) if (!e.dashed || m.id === 'big') expect((e.why ?? '').length, `${m.id} ${e.from}->${e.to} why`).toBeGreaterThan(20);
    // every non-root box pop-up can restate its question: it has a solid incoming line carrying one (the root states the central question as its label)
    for (const m of content.maps) for (const n of m.nodes) if (n.pop && m.edges.some((e) => e.from === n.id) && n.id !== 'root') expect(m.edges.find((e) => e.to === n.id && !e.dashed)?.question ?? '', `${m.id}/${n.id} incoming question`).toMatch(/\?/);
    expect(big.nodes.find((n) => n.id === 'root')!.label).toMatch(/\?$/);
    // every main-chain line of the big map (the dashed look-back too) teaches the move: what is still open, why it matters, what answer we want;
    // any figure it borrows is captioned (its length: the soft word cap below)
    for (const e of big.edges) {
      const w = e.why ?? '', id = `${e.from}->${e.to}`;
      for (const part of ['Still open:', 'Why it matters:', 'What we want:']) expect(w, `${id} why: ${part}`).toContain(part);
      if (e.whyFigures?.length) { expect((e.whyFigCaption ?? '').length, `${id} why figure caption`).toBeGreaterThan(40); for (const f of e.whyFigures) expect(f.alt.length, id).toBeGreaterThan(8); }
    }
  });
  it('linear-systems box and line pop-ups keep to the soft word cap (~400 words of main body; prints the over-cap list, fails only past 600)', () => {
    const { content } = loadApp(path.join(repoRoot, 'apps', 'linear-systems')), counts: Record<string, number> = {};
    for (const m of content.maps) { for (const n of m.nodes) counts[`${m.id}/${n.id}`] = boxBodyWords(n); for (const e of m.edges) counts[`${m.id}/line ${e.from}->${e.to}`] = lineBodyWords(e); }
    expect(capReport('linear-systems', counts)).toEqual([]);
  });
  it('linear-systems dives follow the dive template (level tag, worked example, what it can\'t do, 2-3 checks, >= 1 interactive figure)', () => {
    const { content } = loadApp(path.join(repoRoot, 'apps', 'linear-systems'));
    for (const d of content.dives) {
      expect(['Conceptual', 'Some algebra', 'Worked calculation'], d.id).toContain(d.level);
      expect(d.check?.length ?? 0, d.id).toBeGreaterThanOrEqual(2);
      expect(d.check?.length ?? 0, d.id).toBeLessThanOrEqual(3);
      expect(d.html, d.id).toMatch(/<h3[^>]*>Worked example: on /);
      expect(d.html, d.id).toMatch(/<h3[^>]*>What it can(’|'|&#39;)t do/);
      expect(d.html, d.id).toMatch(/<h3[^>]*>The big idea/);
      expect((d.html.match(/data-figure=|class="figure|data-testid="figure/g) ?? []).length, `${d.id} interactive figures`).toBeGreaterThanOrEqual(1);
    }
    const withDeriv = content.dives.filter((d) => d.html.includes('data-testid="derivation"')).map((d) => d.id).sort();
    expect(withDeriv).toEqual(['expm', 'gramian', 'optimal']);
  });
  it('linear-systems dives open on their map question and parent box (no chain fold)', () => {
    const { content } = loadApp(path.join(repoRoot, 'apps', 'linear-systems'));
    for (const d of content.dives) {
      expect(d.chain, d.id).toEqual([]);
      expect(d.html.trimStart().startsWith('<p><strong>The question:</strong>'), d.id).toBe(true);
    }
  });
  it('linear-systems glossary: 107 terms, every one in a section, no raw ^{…} outside math', () => {
    const { content } = loadApp(path.join(repoRoot, 'apps', 'linear-systems'));
    expect(content.glossary.length).toBe(107);
    expect(content.glossary.every((t) => !!t.section)).toBe(true);
    expect(new Set(content.glossary.map((t) => t.section)).size).toBe(8);
    for (const t of content.glossary) expect(t.meaning.replace(/<span class="katex[\s\S]*?<\/math>/g, '')).not.toMatch(/\^\{/);
  });
  it('linear-systems carries the six-domains board (folded in from transforms): all 20 examples (plus the Earbud preset) and 9 transform pairs', () => {
    const { content } = loadApp(path.join(repoRoot, 'apps', 'linear-systems'));
    expect((content.extra.examples as any).examples.length).toBe(21); // 20 from transforms + the Earbud preset
    expect(content.subject.board!.pairs.length).toBe(9);
  });
  it('every node and edge has a non-empty popup', () => {
    for (const app of listApps()) {
      const { content } = loadApp(srcOf(app));
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

describe('running example (visual-first / central-example schema)', () => {
  const ls = () => copyApp('linear-systems');
  it('linear-systems declares a running example and every node says what it adds and what it accounts for', () => {
    const { content, warnings } = loadApp(path.join(repoRoot, 'apps', 'linear-systems'));
    expect(content.subject.runningExample?.title).toMatch(/speaker/i);
    expect(content.subject.runningExample?.moreScenes?.map((m) => m.id)).toEqual(['car']);
    for (const m of content.maps) for (const n of m.nodes) if (n.id !== 'root') expect(n.addsToExample?.length ?? 0, `${m.id}/${n.id}`).toBeGreaterThan(14);
    expect(warnings.filter((w) => /addsToExample/.test(w))).toEqual([]);
  });
  it('FAILS when a running example is declared and a node lacks addsToExample', () => {
    const dir = ls();
    edit(path.join(dir, 'content/graph.yaml'), (y) => { delete y.maps[1].nodes[3].addsToExample; });
    expect(errorsOf(dir)).toMatch(/addsToExample/);
  });
  it('only WARNS when there is no running example', () => {
    const dir = ls();
    edit(path.join(dir, 'subject.yaml'), (y) => { delete y.runningExample; });
    edit(path.join(dir, 'content/graph.yaml'), (y) => { delete y.maps[1].nodes[3].addsToExample; });
    expect(errorsOf(dir)).toBe('');
    const { warnings } = loadApp(dir);
    expect(warnings.join('\n')).toMatch(/no runningExample/);
  });
  it('per-box examples must name an Example node, and a host must list its own', () => {
    const dir = ls();
    edit(path.join(dir, 'content/graph.yaml'), (y) => { y.maps[0].nodes[3].examples = ['bike']; const sys = y.maps[0].nodes.find((n: any) => n.id === 'SYS'); sys.examples = ['car']; });
    const e = errorsOf(dir);
    expect(e).toMatch(/examples: "bike" is not a runningExample\.refs id/); expect(e).toMatch(/big\/SYS: host of Example node "earbud" must list it/);
  });
  it('rejects a too-short addsToExample (schema)', () => {
    const dir = ls();
    edit(path.join(dir, 'content/graph.yaml'), (y) => { y.maps[1].nodes[3].addsToExample = 'tiny'; });
    expect(errorsOf(dir)).not.toBe('');
  });
  it('rejects an invalid runningExample (schema)', () => {
    const dir = ls();
    edit(path.join(dir, 'subject.yaml'), (y) => { y.runningExample = { title: 'x' }; });
    expect(errorsOf(dir)).not.toBe('');
  });
  it('a figure fence that names no figure fails the build', () => {
    const dir = ls();
    const p = path.join(dir, 'content/dives/eig.md');
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8') + '\n```figure:no-such-figure\n```\n');
    expect(errorsOf(dir)).toMatch(/no-such-figure/);
  });
  it('a dive without addsToExample (own or inherited from a node) fails when a running example exists', () => {
    const dir = ls();
    const p = path.join(dir, 'content/graph.yaml');
    edit(p, (y) => { for (const m of y.maps) for (const n of m.nodes) if (n.dive === 'eig') delete n.addsToExample; });
    expect(errorsOf(dir)).toMatch(/addsToExample/);
  });
  it('every linear-systems dive embeds at least one live figure that exists', () => {
    const { content } = loadApp(path.join(repoRoot, 'apps', 'linear-systems'));
    const ids = new Set(((content.figures ?? []) as { id: string }[]).map((f) => f.id));
    for (const d of content.dives) {
      const refs = [...d.html.matchAll(/data-figure="([^"]+)"/g)].map((m) => m[1]);
      expect(refs.length, `dive ${d.id} has a figure`).toBeGreaterThan(0);
      for (const r of refs) expect(ids.has(r), `${d.id} -> ${r}`).toBe(true);
    }
  });
});
