/** Example-order guard (stage-pass2, Nov 21; mirrors LS exampleorder.test.ts): the map is house-only until Two poles (SECOND),
 *  where the car corner's Example node introduces it, and the dish stays unnamed until Turn up the gain (PGAIN). Walks every
 *  path from the start through the map's steps: box bodies, line whys, figure text, captions, strip rows and the boxes' quiz
 *  items (core exampleguard.ts). Word, number and figure lists are the tutor's (cs-qchain p2/guard.py). Hard test on the main
 *  path; a side path that skips the host is reported, not failed. Out of scope as in LS: the blurb, the central-question page,
 *  the map caption, the Live-figures gallery and Sources lines. Set EXAMPLE_LEAKS_OUT=<file> to save the report. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { exampleLeaks, formatLeaks, type ExampleGuard, type GNode } from '../../../packages/core/src/exampleguard';

const app = path.resolve(import.meta.dirname, '..');
const graph = parse(fs.readFileSync(path.join(app, 'content', 'graph.yaml'), 'utf8'));
const quiz = parse(fs.readFileSync(path.join(app, 'content', 'quiz.yaml'), 'utf8')) as { id: string; tags?: string[] }[];
const strings = (o: unknown): string[] => typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(strings) : o && typeof o === 'object' ? Object.entries(o).filter(([k]) => k !== 'id' && k !== 'tags' && k !== 'kind').flatMap(([, v]) => strings(v)) : [];
/** a box's quiz items: its quick check (pop.ask) and "quiz this box" (its quizTag) */
const quizOf = (n: GNode): [string, string][] => [
  ...quiz.filter((q) => q.id === n.pop?.ask).map((q) => [`quick check ${q.id}`, strings(q).join(' ')] as [string, string]),
  ...quiz.filter((q) => n.quizTag && q.tags?.includes(n.quizTag) && q.id !== n.pop?.ask).map((q) => [`quiz ${q.id}`, strings(q).join(' ')] as [string, string]),
];
const subj = parse(fs.readFileSync(path.join(app, 'subject.yaml'), 'utf8'));
const host = (id: string) => (subj.runningExample.refs as { id: string; at: string }[]).find((r) => r.id === id)!.at;

export const CORNER_GUARD: ExampleGuard = {
  id: 'corner', at: host('corner'),
  words: ['car', 'cars', "car's", 'corner', 'suspension', 'spring', 'springs', 'shock', 'shocks', 'shock absorber', 'bounce', 'bounces', 'bouncy', 'bouncing', 'road', 'bump', 'bumps', 'wheel', 'ride', 'luggage', 'body'],
  numbers: ['400 kg', '25.6 kN/m', '1.6 kN', '8 rad/s', '0.25', '7.75', '1.27 Hz'],
  figureIds: /^(hero-three|pop-zeta|pop-specs|pop-loopcorner|corner|pop-states|pop-cc|pop-sf|pop-obs|pop-sep|pop-ref)$/,
  boxExtra: quizOf,
};
export const DISH_GUARD: ExampleGuard = {
  id: 'dish', at: host('dish'),
  words: ['dish', 'antenna', 'satellite', 'servo', 'motor', 'torque', 'wind', 'tachometer', 'gust'],
  numbers: ['J = 10', 'B = 20', '0.1/(s(s + 2))', 'N·m', '5.73°', '1.15°', '1.46°'],
  figureIds: /^(hero-three|antenna|pop-pgain|pop-wind|pop-int|pop-der|pop-tune|lab)$/,
  boxExtra: quizOf,
};

const out: string[] = [];
for (const [G, name, sideOk] of [[CORNER_GUARD, 'Two poles', []], [DISH_GUARD, 'Turn up the gain', []]] as [ExampleGuard, string, string[]][]) {
  describe(`example-order guard (CS): the ${G.id} before its host box (${G.at}, ${name}) on any path`, () => {
    const leaks = (graph.maps as { id: string; nodes: never[]; edges: never[] }[]).flatMap((m) => exampleLeaks(m, G));
    const main = leaks.filter((l) => !l.sideOnly), side = leaks.filter((l) => l.sideOnly);
    out.push(`# ${G.id} mentioned before ${G.at}: ${main.length} hits on the main path, ${side.length} only via a side path that skips it\n${formatLeaks(leaks)}\n`);
    if (process.env.EXAMPLE_LEAKS_OUT) fs.writeFileSync(process.env.EXAMPLE_LEAKS_OUT, out.join('\n'));
    it('the guard sees the host box itself (sanity)', () => {
      const big = graph.maps[0], h = big.nodes.find((n: { id: string }) => n.id === G.at);
      expect(exampleLeaks({ id: 't', nodes: [{ ...h, id: 'root' }, { id: 'H' }], edges: [{ from: 'root', to: 'H' }] }, { ...G, at: 'H' }).length).toBeGreaterThan(0);
    });
    it(`no box body, line why, figure, caption, strip row or quiz item on the main path before ${G.at} names the ${G.id}`, () => {
      expect(main, formatLeaks(main)).toEqual([]);
    });
    it(`a side path that skips ${G.at} is reported, not failed`, () => {
      if (side.length) console.log(`[example-order ${G.id}] side-path-only (not failed):\n${formatLeaks(side)}`);
      for (const l of side) expect(sideOk.length === 0 || sideOk.includes(l.id.split('->')[0]), `${l.map} ${l.id}`).toBe(true);
    });
  });
}
