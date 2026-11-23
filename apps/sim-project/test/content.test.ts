/** Content guards for sim-project (question-chain format). */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadApp, repoRoot } from '../../../packages/build/src';
import { boxBodyWords, lineBodyWords, capReport } from '../../../packages/build/test/wordcap';

const load = () => loadApp(path.join(repoRoot, 'apps', 'sim-project')).content;

describe('sim-project content', () => {
  it('keeps its 1 map / 22 boxes / 21 lines / 8 dives / 2 review pages / 69 questions', () => {
    const c = load();
    expect(c.maps.map((m) => m.id)).toEqual(['chain']);
    expect(c.maps[0].nodes.length).toBe(22);
    expect(c.maps[0].edges.length).toBe(21);
    expect(c.dives.length).toBe(8);
    expect((c.review ?? []).map((r) => r.id).sort()).toEqual(['practice', 'report-guide']);
    expect(c.quiz.length).toBe(69);
    expect(c.figures.map((f) => f.id)).toEqual(['blocks', 'motor', 'borer', 'tradeoff', 'sens', 'disk', 'pi', 'tuner', 'knobs']);
  });
  it('every box pop-up follows the template (answer, rough words, running example, captioned figures, intuition question)', () => {
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
    }
  });
  it('box and line pop-ups keep to the soft word cap (~400 words of main body; fails only past 600)', () => {
    const c = load(), counts: Record<string, number> = {};
    for (const m of c.maps) { for (const n of m.nodes) counts[`${m.id}/${n.id}`] = boxBodyWords(n); for (const e of m.edges) counts[`${m.id}/line ${e.from}->${e.to}`] = lineBodyWords(e); }
    expect(capReport('sim-project', counts)).toEqual([]);
  });
  it('lines carry their question and why; non-root boxes restate an incoming question', () => {
    const c = load(), m = c.maps[0];
    for (const e of m.edges) {
      expect(e.question, `${e.from}->${e.to}`).toBeTruthy();
      expect((e.why ?? '').length, `${e.from}->${e.to} why`).toBeGreaterThan(20);
    }
    for (const n of m.nodes) if (n.pop && n.id !== 'root') expect(m.edges.find((e) => e.to === n.id && !e.dashed)?.question ?? '', `${n.id} incoming`).toMatch(/\?/);
  });
  it('dives have a level, a live figure, a worked example, what it can\'t do, and 2 checks', () => {
    const c = load();
    for (const d of c.dives) {
      expect(d.level, d.id).toMatch(/Conceptual|Some algebra|Worked calculation/);
      expect(d.html, `${d.id} live figure`).toMatch(/data-figure=|figure="|class="figure/);
      expect(d.html, `${d.id} worked`).toMatch(/Worked example/);
      expect(d.html, `${d.id} can't`).toMatch(/What it can(’|'|&#39;)t do/);
      expect((d.check ?? []).length, d.id).toBeGreaterThanOrEqual(2);
      expect((d.check ?? []).length, d.id).toBeLessThanOrEqual(3);
    }
  });
});
