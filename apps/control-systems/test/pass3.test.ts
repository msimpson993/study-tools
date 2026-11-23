/** Pass 3 (Nov 21): the tuning table on the figure's convention, the Lab's recovery readout and the never-settling lag case,
 *  each checked against the tutor's [PASS3] section of numbers.py (test/fixtures/numbers_output.txt, lines 437–467). */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as M from '../src/model/plants';
import { labRun } from '../src/figs/lab';
import { TUNE_NUM, TUNE_START, TUNE_ROWS } from '../src/figs/dish';

const OUT = fs.readFileSync(path.join(__dirname, 'fixtures/numbers_output.txt'), 'utf8').split('\n');
const line = (start: string) => { const l = OUT.find((x) => x.startsWith(start)); if (!l) throw new Error(`no line ${start}`); return l; };
const num = (l: string, re: RegExp) => { const m = l.match(re); if (!m) throw new Error(`no ${re} in ${l}`); return Number(m[1].replace('+', '')); };
const r1 = (x: number, d: number) => Number(x.toFixed(d));

describe('[PASS3] fixture', () => {
  it('is the tutor\'s 502-line run (pass 4c), ending EXIT 0', () => { expect(OUT.filter((l, i) => i < OUT.length - 1 || l).length).toBe(502); expect(OUT.filter(Boolean).at(-1)).toBe('EXIT 0'); });
});

describe('[PASS3] item 1: the tuning table uses the figure\'s convention (gust 10 s after the step)', () => {
  const at = (g: string) => line(`P3 tuning (${g}):`);
  it('start row: 7.4 %, 2.2 s, 0.557°', () => {
    const l = at('2000, 1000, 200');
    expect(TUNE_START).toEqual({ os: r1(num(l, /exact %OS ([\d.]+) %/), 1), ts: r1(num(l, /Ts ([\d.]+) s/), 1), wind: r1(num(l, /after the step: .*peak ([\d.]+) deg/), 3) });
  });
  for (const [id, g, tsd] of [['Kp', '4000, 1000, 200', 2], ['Ki', '2000, 3000, 200', 2], ['Kd', '2000, 1000, 400', 2]] as const) it(`${id}: %OS, Tₛ and wind peak from l.439–442`, () => {
    const l = at(g), row = TUNE_NUM.find((r) => r.id === id)!;
    expect(row.os).toBe(r1(num(l, /exact %OS ([\d.]+) %/), 1)); expect(row.ts).toBe(r1(num(l, /Ts ([\d.]+) s/), tsd)); expect(row.wind).toBe(r1(num(l, /after the step: .*peak ([\d.]+) deg/), 3));
  });
  it('Ki 3000 is 16.7 % (16.746 % exact), in the table and its bar data', () => {
    expect(num(at('2000, 3000, 200'), /exact %OS ([\d.]+) %/)).toBeCloseTo(16.746, 3);
    expect(TUNE_ROWS[1][2]).toBe('↑ 7.4→16.7 %'); expect(TUNE_ROWS[0][5]).toBe('↑ 4.8→7.1 s');
  });
});

describe('[PASS3] item 12: the Lab recovery readout (filtered D, gust at 10 s)', () => {
  const P: [string, Record<string, unknown>][] = [
    ['P 1000', { Kp: 1000 }], ['PD (1000, 0, 120)', { Kp: 1000, Kd: 120 }], ['tuned (2000, 1000, 200)', { Kp: 2000, Ki: 1000, Kd: 200 }],
    ['too much I (2000, 3000, 200)', { Kp: 2000, Ki: 3000, Kd: 200 }], ['too much Kd (2000, 1000, 400)', { Kp: 2000, Ki: 1000, Kd: 400 }],
    ['derivative kick (D on the error)', { Kp: 2000, Ki: 1000, Kd: 200, dm: false }], ['windup 2 rad, no anti-windup', { Kp: 2000, Ki: 1000, Kd: 200, step: 2 }],
    ['windup 2 rad, clamping', { Kp: 2000, Ki: 1000, Kd: 200, step: 2, aw: 'clamp' }], ['ZN + lag (264, 531.5, 32.8)', { plant: 'lag', Kp: 264, Ki: 531.5, Kd: 32.8 }],
    ['worked example (2000, 500, 200)', { Kp: 2000, Ki: 500, Kd: 200 }],
  ];
  for (const [name, v] of P) it(name, () => {
    const l = line(`P3 Lab recovery, ${name}:`);
    for (const T of [16, 21, 40]) {
      const seg = l.split(`window ${T} s: `)[1].split(';')[0], r = labRun({ plant: 'dish', wind: true, ...v, T } as never);
      if (seg.startsWith('not back')) { expect(r.back, `${name} T=${T}`).toBe(false); expect(M.deg(r.offEnd)).toBeCloseTo(num(seg, /offset at end ([-\d.]+) deg/), 2); }
      else { expect(r.back, `${name} T=${T}`).toBe(true); expect(Math.abs(r.rec - num(seg, /^([\d.]+) s/))).toBeLessThanOrEqual(0.006); }
    }
  });
  it('the lag plant at P 440 never settles (poles on the jω axis), so its final-value rows read a dash', () => {
    const l = line('P3 Lab lag plant, P 440'), r = labRun({ plant: 'lag', Kp: 440, wind: true, T: 16 } as never);
    const maxRe = Math.max(...r.poles.map((p) => p.re));
    expect(Math.abs(maxRe)).toBeLessThan(1e-3); expect(l).toContain('still oscillating');
  });
});
