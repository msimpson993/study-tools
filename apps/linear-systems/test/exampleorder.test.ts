/** Example-order guard (Nov 20, LS): the map is earbud-only until STATE, where the car's Example node introduces it. Walks every
 *  path from the start through the map's steps: box bodies, line whys, figure text, captions, strip rows and the boxes' quiz
 *  items (core exampleguard.ts). Hard test since the tutor's examples switch landed. Out of scope by ruling: the blurb, the
 *  central-question page and the Live-figures gallery (they may say the car comes later). A side path that skips STATE
 *  (the PZ → STAB shortcut) is reported, not failed: STAB names where the car was met for readers who take it.
 *  Set EXAMPLE_LEAKS_OUT=<file> to save the report. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { exampleLeaks, formatLeaks, beforeHost, type ExampleGuard, type GNode } from '../../../packages/core/src/exampleguard';
import { CAR, CAR_SYM } from '../../../packages/core/src/carModel';
import { carModes } from '../src/figs/car';

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
const thou = (v: number) => v.toLocaleString('en-US');
const [bounce, pitch] = carModes(CAR), [sb, sp] = carModes(CAR_SYM);

/** the car example: its words, and car-only numbers already in the repo (model values, and the derived ones the boxes quote) */
export const CAR_GUARD: ExampleGuard = {
  id: 'car', at: host('car'),
  words: ['car', 'cars', "car's", 'heave', 'bump', 'bumps', 'axle', 'axles', 'wheel', 'wheels', 'tyre', 'tyres', 'road', 'skyhook', 'shock absorber', 'shock absorbers'],
  numbers: [
    `${CAR.m} kg`, `${thou(CAR.m)} kg`, `${CAR.J} kg`, `${thou(CAR.J)} kg`, `${CAR.a} m`, `${CAR.b} m`, `${(CAR.a + CAR.b).toFixed(1)} m`,
    ...[CAR.kf, CAR.kr, CAR.cf, CAR.cr, CAR_SYM.kf, CAR_SYM.kr, CAR_SYM.cr].flatMap((v) => [thou(v), String(v)]),
    `${((CAR.a + CAR.b) / 15).toFixed(2)} s`, '15 m/s', '5 cm', '8.77 mm', '476 N', '652 N', '96,160',
    bounce.fn.toFixed(2), bounce.fn.toFixed(3), pitch.fn.toFixed(2), pitch.fn.toFixed(3), bounce.zeta.toFixed(3), pitch.zeta.toFixed(3),
    sb.fn.toFixed(3), sp.fn.toFixed(3),
  ],
  figureIds: /^pop-(car|bump)/,
  // "pitch" is also a tone's pitch all through the signals half, and the earbud's cone has a suspension too: these count
  // only beside another car word
  weak: ['pitch', 'pitching', 'suspension'],
  boxExtra: quizOf,
};

describe('example-order guard (core): a self-test on a small map', () => {
  const map = { id: 't', nodes: [
    { id: 'root', label: 'Start', short: 'nothing yet' }, { id: 'A', label: 'A', short: 'a car goes over a bump' },
    { id: 'H', label: 'Host', short: 'meet the car' }, { id: 'B', label: 'B', short: 'the car again, 1400 kg' }, { id: 'S', label: 'Side', short: 'pitch only, 1400kg' },
  ], edges: [
    { from: 'root', to: 'A', why: 'plain' }, { from: 'A', to: 'H', why: 'the road is next' }, { from: 'H', to: 'B', why: 'car, fine here' },
    { from: 'root', to: 'S', why: 'no' }, { from: 'S', to: 'B', why: 'ok' }, { from: 'B', to: 'A', dashed: true, why: 'car, cross-link' },
  ] };
  const g: ExampleGuard = { id: 'car', at: 'H', words: ['car', 'bump', 'pitch', 'road'], numbers: ['1400 kg'] };
  it('walks paths up to the host only, includes boxes reached around it, and scans cross-links at a box before it', () => {
    const { boxes, lines } = beforeHost(map, 'H');
    expect([...boxes.keys()].sort()).toEqual(['A', 'B', 'S', 'root']); // B is reached via the side box, before the host
    expect(lines.has('H->B')).toBe(false); expect(lines.has('A->H')).toBe(true); expect(lines.has('B->A')).toBe(true);
    const leaks = exampleLeaks(map, g), at = leaks.map((l) => `${l.id}:${l.term}`).sort();
    expect(at).toEqual(['A->H:road', 'A:bump', 'A:car', 'B->A:car', 'B:1400 kg', 'B:car', 'S:1400 kg', 'S:pitch']);
    expect(leaks.find((l) => l.id === 'B')!.path).toEqual(['root', 'S', 'B']);
  });
  it('a side line leaving a box before the host is read there; a look-back counts only at the box that looks back', () => {
    const m5 = { id: 's', nodes: [{ id: 'root', label: 'r' }, { id: 'P', label: 'p' }, { id: 'H', label: 'h' }, { id: 'S', label: 'the car' }, { id: 'L', label: 'l' }],
      edges: [{ from: 'root', to: 'P' }, { from: 'P', to: 'H' }, { from: 'P', to: 'S', side: true, why: 'a car ahead' }, { from: 'H', to: 'S' }, { from: 'P', to: 'L', dashed: true, reverse: true, why: 'the car again' }] };
    const ls = exampleLeaks(m5, g);
    expect(ls.filter((l) => !l.sideOnly).map((l) => l.id)).toEqual(['P->S']); // the shortcut's own why is read at P
    expect(ls.filter((l) => l.sideOnly).map((l) => l.id)).toEqual(['S']);    // the box only reached by skipping the host
  });
  it('matches whole words and whole numbers only', () => {
    const m2 = { id: 'u', nodes: [{ id: 'root', label: 'carry the cart; 11400 kg; 1400 kgs' }, { id: 'H', label: 'h' }], edges: [{ from: 'root', to: 'H' }] };
    expect(exampleLeaks(m2, g)).toEqual([]);
    const m3 = { id: 'v', nodes: [{ id: 'root', label: 'sine at each pitch' }, { id: 'H', label: 'h' }], edges: [{ from: 'root', to: 'H' }] };
    expect(exampleLeaks(m3, g)).toHaveLength(1); expect(exampleLeaks(m3, { ...g, ignore: [/each pitch/i] })).toEqual([]);
    // a weak word alone does not count; beside a strong one it does
    const gw = { ...g, words: ['car'], weak: ['pitch'] }, m4 = { id: 'w', nodes: [{ id: 'root', label: 'each pitch', short: 'the car and its pitch' }, { id: 'H', label: 'h' }], edges: [{ from: 'root', to: 'H' }] };
    expect(exampleLeaks(m4, gw).map((l) => `${l.field}:${l.term}`).sort()).toEqual(['body:car', 'body:pitch']);
  });
});

describe(`example-order guard (LS): the car before its host box (${CAR_GUARD.at}) on any path`, () => {
  const leaks = (graph.maps as { id: string; nodes: never[]; edges: never[] }[]).flatMap((m) => exampleLeaks(m, CAR_GUARD));
  const main = leaks.filter((l) => !l.sideOnly), side = leaks.filter((l) => l.sideOnly), report = formatLeaks(leaks);
  if (process.env.EXAMPLE_LEAKS_OUT) fs.writeFileSync(process.env.EXAMPLE_LEAKS_OUT, `# car mentioned before ${CAR_GUARD.at}: ${main.length} hits on the main path, ${side.length} only via a side path that skips it\n${report}\n`);
  it('the car words and numbers are recognised (sanity)', () => {
    expect(CAR_GUARD.numbers).toContain('1400 kg'); expect(CAR_GUARD.numbers).toContain('0.18 s'); expect(CAR_GUARD.numbers).toContain('1.151');
    // the host itself is full of them: the guard would see them if they moved earlier
    const big = graph.maps[0], state = big.nodes.find((n: { id: string }) => n.id === CAR_GUARD.at);
    expect(exampleLeaks({ id: 't', nodes: [{ ...state, id: 'root' }, { id: 'H' }], edges: [{ from: 'root', to: 'H' }] }, { ...CAR_GUARD, at: 'H' }).length).toBeGreaterThan(3);
  });
  it('no box body, line why, figure, caption, strip row or quiz item on the main path before STATE names the car', () => {
    expect(main, formatLeaks(main)).toEqual([]);
  });
  it('a side path that skips STATE (reported, not failed): only the boxes after the PZ → STAB shortcut', () => {
    if (side.length) console.log(`[example-order] side-path-only (not failed):\n${formatLeaks(side)}`);
    const ok = new Set(['STAB', 'INOUT', 'WORK', 'CO', 'OBS', 'PBH', 'GRAM', 'OPT', 'FB', 'FILT']);
    for (const l of side) expect(ok.has(l.id.split('->')[0]), `${l.map} ${l.id}`).toBe(true);
  });
});
