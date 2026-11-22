import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadApp, repoRoot } from '../src';
import { wrapText } from '../../core/src/maplayout';
import { boxBodyWords, lineBodyWords, capReport } from './wordcap';

/** Guards for the control-systems question-chain rebuild (Nov 2026): three running examples, pid-tuning folded in. */
const load = () => loadApp(path.join(repoRoot, 'apps', 'control-systems')).content;
const words = (h: string) => h.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
type Content = ReturnType<typeof load>;
type Node = Content['maps'][number]['nodes'][number];
type Map = Content['maps'][number];
export const boxWords = (m: Map, n: Node) => {
  const example = n.pop?.example ?? n.addsToExample ?? '';
  const next = n.pop?.next ?? m.edges.find((e) => e.from === n.id && !e.dashed)?.question ?? '';
  const figs = n.pop?.figures ?? [];
  return words(n.short ?? '') + words(n.pop?.rough ?? '') + words(example) + words(next) + words(n.pop?.eqKey ?? '') + words(n.pop?.figCaption ?? '') + figs.reduce((a, f) => a + words(f.caption ?? ''), 0);
};

describe('control-systems (question-chain rebuild)', () => {
  it('keeps its 2 maps / 62 nodes / 66 edges / 33 dives / 2 review pages / 262 questions', () => {
    const c = load();
    expect(c.maps.map((m) => m.id)).toEqual(['big', 'detail']);
    expect(c.maps.map((m) => m.nodes.length)).toEqual([22, 40]);
    expect(c.maps.map((m) => m.edges.length)).toEqual([24, 42]);
    expect(c.dives.length).toBe(33);
    expect((c.review ?? []).map((r) => r.id).sort()).toEqual(['mini-exam-1', 'mini-exam-2']);
    expect(c.quiz.length).toBe(262);
  });
  it('every box pop-up follows the template (answer, rough words, running example, next question, captioned figures, ≤ 4 figures, word budget)', () => {
    const c = load();
    for (const m of c.maps) for (const n of m.nodes) {
      if (!n.pop) continue;
      const id = `${m.id}/${n.id}`;
      expect(n.short, id).toBeTruthy();
      expect(n.pop.rough, id).toBeTruthy();
      expect(n.pop.example ?? n.addsToExample, id).toBeTruthy();
      if (n.id !== 'root') expect(n.pop.ask, `${id} intuition question`).toBeTruthy();
      const figs = n.pop.figures ?? [];
      if (figs.length) expect(n.pop.figCaption, `${id} figure caption`).toBeTruthy();
      if (figs.length > 1) figs.forEach((f, i) => { const L = String.fromCharCode(97 + i); expect(f.caption ?? '', `${id} panel ${L}`).toMatch(new RegExp(`^\\(${L}\\)`)); expect(n.pop!.figCaption ?? '', `${id} caption walks (${L})`).toContain(`(${L})`); });
      expect(figs.length, id).toBeLessThanOrEqual(4);
    }
  });
  it('box and line pop-ups keep to the soft word cap (~400 words of main body; prints the over-cap list, fails only past 600)', () => {
    const c = load(), counts: Record<string, number> = {};
    for (const m of c.maps) { for (const n of m.nodes) counts[`${m.id}/${n.id}`] = boxBodyWords(n); for (const e of m.edges) counts[`${m.id}/line ${e.from}->${e.to}`] = lineBodyWords(e); }
    expect(capReport('control-systems', counts)).toEqual([]);
  });
  it('lines carry their question and why; non-root boxes restate a solid incoming question; the root asks the central question', () => {
    const c = load();
    const big = c.maps.find((m) => m.id === 'big')!;
    for (const e of big.edges) expect(e.question, `${e.from}->${e.to}`).toBeTruthy();
    for (const m of c.maps) for (const e of m.edges) if (!e.dashed || m.id === 'big') expect((e.why ?? '').length, `${m.id} ${e.from}->${e.to} why`).toBeGreaterThan(20);
    for (const m of c.maps) for (const n of m.nodes) if (n.pop && n.id !== 'root') expect(m.edges.find((e) => e.to === n.id && !e.dashed)?.question ?? '', `${m.id}/${n.id} incoming question`).toMatch(/\?/);
    expect(big.nodes.find((n) => n.id === 'root')!.label).toMatch(/\?$/);
    for (const e of big.edges) {
      const w = e.why ?? '', id = `${e.from}->${e.to}`;
      for (const part of ['Still open:', 'Why it matters:', 'What we want:']) expect(w, `${id} why: ${part}`).toContain(part);
    }
  });
  it('dives follow the dive template and open on their map question', () => {
    const c = load();
    for (const d of c.dives) {
      expect(['Conceptual', 'Some algebra', 'Worked calculation'], d.id).toContain(d.level);
      expect(d.check?.length ?? 0, d.id).toBeGreaterThanOrEqual(2);
      expect(d.check?.length ?? 0, d.id).toBeLessThanOrEqual(3);
      for (const q of d.check ?? []) expect(c.quiz.some((x) => x.id === q), `${d.id} check ${q}`).toBe(true);
      expect(d.html, d.id).toMatch(/<h3[^>]*>Worked example: on /);
      expect(d.html, d.id).toMatch(/<h3[^>]*>What it can(’|'|&#39;)t do/);
      expect(d.html, d.id).toMatch(/<h3[^>]*>The big idea/);
      expect((d.html.match(/data-figure=|class="figure|data-testid="figure/g) ?? []).length, `${d.id} interactive figures`).toBeGreaterThanOrEqual(1);
      expect(d.chain, d.id).toEqual([]);
      expect(d.html.trimStart().startsWith('<p><strong>The question:</strong>'), d.id).toBe(true);
    }
    const withDeriv = c.dives.filter((d) => d.html.includes('data-testid="derivation"')).map((d) => d.id).sort();
    expect(withDeriv).toEqual(['blocks', 'index', 'reduce', 'refin', 'second', 'sens', 'sep', 'ss2tf', 'sse']);
  });
  it('pid-tuning is folded in: no links to the removed page anywhere in the content', () => {
    const c = load();
    const all = JSON.stringify(c);
    expect(all).not.toMatch(/pid-tuning\//);
    for (const id of ['lab', 'tuning', 'windup', 'methods', 'failures', 'integral', 'derivative']) expect(c.dives.some((d) => d.id === id), id).toBe(true);
    expect(c.figures.filter((f) => f.id.startsWith('fail-')).length).toBe(14);
  });
});

describe('map label wrapping (root label at 390 px)', () => {
  it('breaks a long hyphenated word after its hyphen, not mid-word', () => {
    const lines = wrapText('How do we make an approximately-known system do what we command?', 14, 6);
    expect(lines).toContain('approximately-');
    expect(lines.join(' ')).not.toContain('…');
    expect(lines.every((l) => l.length <= 14)).toBe(true);
  });
  it('still hard-splits a long word without a hyphen', () => {
    expect(wrapText('abcdefghijklmnop', 8, 3)[0]).toBe('abcdefg-');
  });
});
