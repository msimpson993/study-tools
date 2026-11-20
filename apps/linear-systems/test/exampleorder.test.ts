/** Example-order guard (Nov 20, LS): the car must not show up on any reading path before its Example node's host (STATE).
 *  Walks every path from the start through box bodies, line whys, figure text, captions and strip rows (core exampleguard.ts).
 *  EXPECTED TO FAIL until the tutor's rewrites land: it is `it.fails` (CI green) and prints the offenders; once the content is
 *  clean `it.fails` itself goes red, which is the signal to flip it to a hard `it`. Set EXAMPLE_LEAKS_OUT=<file> to save the list. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { exampleLeaks, formatLeaks, beforeHost, type ExampleGuard } from '../../../packages/core/src/exampleguard';
import { CAR, CAR_SYM } from '../../../packages/core/src/carModel';
import { carModes } from '../src/figs/car';

const app = path.resolve(import.meta.dirname, '..');
const graph = parse(fs.readFileSync(path.join(app, 'content', 'graph.yaml'), 'utf8'));
const subj = parse(fs.readFileSync(path.join(app, 'subject.yaml'), 'utf8'));
const host = (id: string) => (subj.runningExample.refs as { id: string; at: string }[]).find((r) => r.id === id)!.at;
const thou = (v: number) => v.toLocaleString('en-US');
const [bounce, pitch] = carModes(CAR), [sb, sp] = carModes(CAR_SYM);

/** the car example: its words, and car-only numbers already in the repo (model values, and the derived ones the boxes quote) */
export const CAR_GUARD: ExampleGuard = {
  id: 'car', at: host('car'),
  words: ['car', 'cars', "car's", 'suspension', 'heave', 'bump', 'bumps', 'axle', 'axles', 'wheel', 'wheels', 'tyre', 'tyres', 'road', 'skyhook', 'shock absorber', 'shock absorbers'],
  numbers: [
    `${CAR.m} kg`, `${thou(CAR.m)} kg`, `${CAR.J} kg`, `${thou(CAR.J)} kg`, `${CAR.a} m`, `${CAR.b} m`, `${(CAR.a + CAR.b).toFixed(1)} m`,
    ...[CAR.kf, CAR.kr, CAR.cf, CAR.cr, CAR_SYM.kf, CAR_SYM.kr, CAR_SYM.cr].flatMap((v) => [thou(v), String(v)]),
    `${((CAR.a + CAR.b) / 15).toFixed(2)} s`, '15 m/s', '5 cm', '8.77 mm', '476 N', '652 N', '96,160',
    bounce.fn.toFixed(2), bounce.fn.toFixed(3), pitch.fn.toFixed(2), pitch.fn.toFixed(3), bounce.zeta.toFixed(3), pitch.zeta.toFixed(3),
    sb.fn.toFixed(3), sp.fn.toFixed(3),
  ],
  figureIds: /^pop-(car|bump)/,
  // "pitch" is also a tone's pitch all through the signals half: it counts only beside another car word
  weak: ['pitch', 'pitching'],
  // the earbud cone's own suspension
  ignore: [/\bsuspension stiffness\b/i, /\b(cone|cone's|speaker's|earbud's) suspension\b/i],
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
  const report = formatLeaks(leaks);
  if (process.env.EXAMPLE_LEAKS_OUT) fs.writeFileSync(process.env.EXAMPLE_LEAKS_OUT, `# car mentioned before ${CAR_GUARD.at} (${leaks.length} hits)\n${report}\n`);
  it('the car words and numbers are recognised (sanity: the host itself is full of them)', () => {
    expect(CAR_GUARD.numbers).toContain('1400 kg'); expect(CAR_GUARD.numbers).toContain('0.18 s'); expect(CAR_GUARD.numbers).toContain('1.151');
  });
  // TODO(tutor rewrites): flip to a hard `it` once the content is clean (then this `it.fails` goes red on its own)
  it.fails('no box, line, figure, caption or strip row before STATE names the car (EXPECTED TO FAIL: offenders printed)', () => {
    if (leaks.length) console.log(`[example-order] car before ${CAR_GUARD.at}: ${leaks.length} hits\n${report}`);
    expect(leaks).toEqual([]);
  });
});
