/** Content guards for the tabbed sim-project page. */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadApp, repoRoot } from '../../../packages/build/src';

const load = () => loadApp(path.join(repoRoot, 'apps', 'sim-project')).content;

describe('sim-project tabs content', () => {
  it('loads five tabs, 71 questions, 55 glossary terms, 10 figures and the practice page', () => {
    const c = load();
    expect(c.maps).toEqual([]);
    expect(c.dives).toEqual([]);
    expect(c.tabs?.map((t) => t.id)).toEqual(['overview', 'engine', 'motor', 'borer', 'disk']);
    expect(c.tabs?.map((t) => t.title)).toEqual([
      'Overview',
      'Engine speed with the PID Tuner',
      'Speed controlled motor',
      'Boring machine',
      'Disk drive head',
    ]);
    expect((c.review ?? []).map((r) => r.id)).toEqual(['practice']);
    expect(c.quiz.length).toBe(71);
    expect(c.glossary.length).toBe(55);
    expect(c.figures.map((f) => f.id)).toEqual([
      'blocks', 'motor', 'borer', 'tradeoff', 'sens', 'disk', 'pi', 'tuner', 'loop', 'engine-fit',
    ]);
    expect(c.figures.some((f) => f.id === 'knobs')).toBe(false);
  });

  it('every figure fence names a figure (and preset when given) that exists', () => {
    const c = load();
    const figs = new Map(c.figures.map((f) => [f.id, new Set(f.presets.map((p) => p.id))]));
    const fences: { tab: string; id: string; preset?: string }[] = [];
    for (const tab of c.tabs ?? []) {
      const re = /class="viz-slot"[^>]*data-figure="([^"]+)"([^>]*)>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(tab.html))) {
        const preset = /data-preset="([^"]+)"/.exec(m[2])?.[1];
        fences.push({ tab: tab.id, id: m[1], preset });
      }
    }
    expect(fences.length, 'live figures were embedded').toBeGreaterThanOrEqual(20);
    for (const f of fences) {
      expect(figs.has(f.id), `${f.tab}: figure ${f.id}`).toBe(true);
      if (f.preset) expect(figs.get(f.id)?.has(f.preset), `${f.tab}: ${f.id} preset ${f.preset}`).toBe(true);
    }
  });

  it('each problem tab has sections (a)–(f) and the Eq. 4.69 callout is on the disk tab', () => {
    const c = load();
    for (const id of ['motor', 'borer', 'disk', 'engine']) {
      const tab = c.tabs!.find((t) => t.id === id)!;
      const titles = tab.sections.map((s) => s.title);
      expect(titles.some((s) => s.includes('(a)')), id).toBe(true);
      expect(titles.some((s) => s.includes('(b)')), id).toBe(true);
      expect(titles.some((s) => s.includes('(c)')), id).toBe(true);
      expect(titles.some((s) => s.includes('(d)')), id).toBe(true);
      expect(titles.some((s) => s.includes('(e)')), id).toBe(true);
      expect(titles.some((s) => s.includes('(f)')), id).toBe(true);
    }
    const disk = c.tabs!.find((t) => t.id === 'disk')!;
    expect(disk.html).toMatch(/Eq\.\s*4\.69/);
    expect(disk.html).toMatch(/minus sign|no minus/i);
  });

  it('glossary keeps the tutor section names', () => {
    const c = load();
    const sections = [...new Set(c.glossary.map((g) => g.section).filter(Boolean))];
    expect(sections.sort()).toEqual([
      'Blocks & loops', 'Boring machine', 'Disk head', 'Engine & tuner', 'Math', 'Motor', 'Specs',
    ].sort());
  });

  it('every quiz question is tagged to a tab', () => {
    const c = load();
    const tags = new Set(c.tabs!.flatMap((t) => t.quizTags ?? [t.id]));
    for (const q of c.quiz) expect(q.tags.some((t) => tags.has(t)), q.id).toBe(true);
  });
});
