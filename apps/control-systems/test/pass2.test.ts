/** Pass 2 (Nov 21): the ideal-derivative figures (R4), the Lab's post-gust offset readout (R2) and the index optimum on the dish,
 *  each checked against the tutor's [PASS2] section of numbers.py (test/fixtures/numbers_output.txt). */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as M from '../src/model/plants';
import { DISH } from '../src/model/params';
import { labRun } from '../src/figs/lab';

const OUT = fs.readFileSync(path.join(__dirname, 'fixtures/numbers_output.txt'), 'utf8').split('\n');
const line = (start: string) => { const l = OUT.find((x) => x.startsWith(start)); if (!l) throw new Error(`no line ${start}`); return l; };
const num = (l: string, re: RegExp) => { const m = l.match(re); if (!m) throw new Error(`no ${re} in ${l}`); return Number(m[1].replace('+', '')); };
const nearAbs = (a: number, b: number, tol: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);

describe('[PASS2] R4: ideal derivative in the tuning figures', () => {
  for (const [Kp, Ki, Kd] of [[2000, 1000, 200], [4000, 1000, 200], [2000, 3000, 200], [2000, 1000, 400]]) it(`gains figure (${Kp}, ${Ki}, ${Kd})`, () => {
    const l = line(`P2 gains figure (${Kp}, ${Ki}, ${Kd}): ideal D`);
    const sm = M.stepMetrics(M.dishPid(Kp, Ki, Kd), 20), W = DISH.windAt;
    const s = M.dishSim({ Kp, Ki, Kd, T: 20, dt: 1e-4, every: 2, idealD: true, d: (t) => (t >= W ? DISH.wind : 0) });
    let pk = 0, last: number = W; for (let i = 0; i < s.t.length; i++) if (s.t[i] >= W) { const e = Math.abs(M.deg(s.y[i] - DISH.step)); if (e > pk) pk = e; if (e > 0.05) last = s.t[i]; }
    // %OS from the exact TF step (the sim's Euler run reads 16.7 % for Ki 3000 against the exact 16.75 %)
    nearAbs(sm.OS, num(l, /ideal D OS ([\d.]+) %/), 0.06); nearAbs(sm.Ts, num(l, /Ts ([\d.]+) s, wind/), 0.011);
    nearAbs(pk, num(l, /wind peak ([\d.]+) deg, back/), 0.0006); nearAbs(last - W, num(l, /back in 0\.05 deg ([\d.]+) s/), 0.06);
  });
  // exact TF %OS: 7.37 / 14.34 / 16.75 / 7.62 ([P10] line "(2000, 3000, 200): … OS=16.75"). The exact Ki-3000 value is 16.746 %, so the
  // figure's one-decimal readout shows 16.7 %; the tutor's "16.8 %" rounds the two-decimal 16.75 again (open question for the tutor)
  it('the tutor\'s figure values: exact-TF %OS 7.37 / 14.34 / 16.75 / 7.62 %, Tₛ 2.20 / 0.31 / 1.45 / 3.59 s', () => {
    const r = [[2000, 1000, 200], [4000, 1000, 200], [2000, 3000, 200], [2000, 1000, 400]].map(([a, b, c]) => M.stepMetrics(M.dishPid(a, b, c), 20));
    [7.37, 14.34, 16.75, 7.62].forEach((v, i) => nearAbs(r[i].OS, v, 0.006));
    expect(r.map((m) => m.Ts.toFixed(2))).toEqual(['2.20', '0.31', '1.45', '3.59']);
  });
  it('Box 11 figure: PD (1000, 0, 120) ideal D on the measurement 4.6 % (Tₛ 0.60 s); on the error 15.6 % (exact TF)', () => {
    const l = line('P2 Box 11 figure PD (1000, 0, 120)');
    const s = M.dishSim({ Kp: 1000, Kd: 120, T: 4, dt: 1e-4, idealD: true }), m = M.dishMetrics(s.t, s.y, DISH.step);
    nearAbs(m.OS, num(l, /ideal D OS ([\d.]+) %/), 0.05); nearAbs(m.Ts, num(l, /ideal D OS [\d.]+ % \(Ts ([\d.]+) s/), 0.011);
    nearAbs(M.stepMetrics(M.dishPid(1000, 0, 120, true), 4).OS, num(l, /D on the error \(ideal, \[P5\]\) ([\d.]+) %/), 0.05);
  });
  it('ideal D on the error has no finite step: dishSim refuses it', () => {
    expect(() => M.dishSim({ Kp: 1000, Kd: 120, dm: false, idealD: true })).toThrow();
  });
});

describe('[PASS2] R2: every Lab preset with wind on (window 16 s, gust at 10 s), including the new "Offset at end"', () => {
  const presets: [string, Record<string, unknown>][] = [
    ['P 1000', { Kp: 1000 }], ['PD (1000, 0, 120)', { Kp: 1000, Kd: 120 }], ['tuned (2000, 1000, 200)', { Kp: 2000, Ki: 1000, Kd: 200 }],
    ['too much I (2000, 3000, 200)', { Kp: 2000, Ki: 3000, Kd: 200 }], ['too much Kd (2000, 1000, 400)', { Kp: 2000, Ki: 1000, Kd: 400 }],
    ['derivative kick (D on error)', { Kp: 2000, Ki: 1000, Kd: 200, dm: false }], ['windup 2 rad, none', { Kp: 2000, Ki: 1000, Kd: 200, step: 2 }],
    ['windup 2 rad, clamp', { Kp: 2000, Ki: 1000, Kd: 200, step: 2, aw: 'clamp' }], ['ZN + lag (264, 531.5, 32.8)', { plant: 'lag', Kp: 264, Ki: 531.5, Kd: 32.8, dm: false }],
    ['worked example (2000, 500, 200)', { Kp: 2000, Ki: 500, Kd: 200 }], ['stiff PD (2000, 0, 200)', { Kp: 2000, Kd: 200 }],
    ['worked example (2000, 500, 200), window 21 s', { Kp: 2000, Ki: 500, Kd: 200, T: 21 }],
  ];
  for (const [name, v] of presets) it(name, () => {
    const l = line(`P2 Lab ${name}, wind on`), r = labRun({ wind: true, ...v } as never), T = (v.T as number) ?? 16;
    expect(Number(r.OS.toFixed(1))).toBe(num(l, /OS ([\d.]+) %/));
    nearAbs(M.deg(r.ess), num(l, /steady error at 9\.9 s ([+-][\d.]+) deg/), 0.0006);
    nearAbs(r.windPeak, num(l, /wind peak ([\d.]+) deg/), 0.0006);
    const off = num(l, new RegExp(`offset at ${T} s ([+-][\\d.]+) deg`)); nearAbs(M.deg(r.offEnd), off, 0.0006);
    expect(Math.abs(M.deg(r.offEnd)) < 0.05, 'offset pass mark').toBe(/\(pass < 0\.05\)/.test(l));
  });
  it('PD: the offset is −T_d/Kp = −20/1000 rad = −1.146°', () => {
    nearAbs(M.deg(-DISH.wind / 1000), num(line('P2 PD offset check'), /= 20\/1000 rad = ([\d.]+) deg/) * -1, 0.0006);
  });
});
