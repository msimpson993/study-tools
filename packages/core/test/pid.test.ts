import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { simulatePid, pidMetrics, pidTF, pidClosedLoopTF, pidClosedLoopPoles, seededRng, PID_PLANTS, tf, tfSeries, tfParallel, step, stepinfo, TFError, polyEvalReal, type PidSimOptions } from '../src/dsp';

const fixture = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', 'pidsim-legacy.json'), 'utf8'));
const maxDiff = (a: number[], b: number[]) => Math.max(...a.map((x, i) => Math.abs(x - b[i])));

describe('matches the legacy PIDSIM page (frozen fixture, plants p1/p2/p3)', () => {
  for (const c of fixture.cases) {
    it(c.id, () => {
      const o = c.o, opts: PidSimOptions = { plant: o.plant, Kp: o.Kp, Ki: o.Ki, Kd: o.Kd, N: o.N, T: o.T, dt: o.dt, umax: o.umax ?? null, aw: o.aw ? 'clamp' : 'none', dOnMeasurement: !!o.dmeas, dist: o.dist ?? null, noise: o.noise, seed: o.seed };
      const s = simulatePid(opts);
      const tol = s.substeps === 1 ? 1e-9 : 2e-5; // legacy is plain RK4 at dt; we substep when h·|λ| > 0.2, so the legacy trace itself carries O(1e-6) error there
      expect(s.t.length).toBe(c.n);
      const pick = (a: number[]) => a.filter((_, i) => i % fixture.every === 0);
      expect(maxDiff(pick(s.y), c.y)).toBeLessThan(tol);
      expect(maxDiff(pick(s.u), c.u)).toBeLessThan(tol * 10);
      expect(maxDiff(pick(s.e), c.e)).toBeLessThan(tol);
      const m = pidMetrics(s), L = c.metrics;
      expect(m.settled).toBe(L.settled);
      expect(m.yFinal).toBeCloseTo(L.yf, 4); expect(m.ess).toBeCloseTo(L.ess, 4);
      if (L.yf > 0) expect(Math.abs(m.overshootPct - L.os)).toBeLessThan(0.02);
      expect(Math.abs(m.settlingTime - L.ts)).toBeLessThan(2 * o.dt + 1e-9);
      expect(Math.abs(m.riseTime - L.tr)).toBeLessThan(2 * o.dt + 1e-9);
      expect(m.peakU).toBeCloseTo(L.umax, 3);
    });
  }
});

describe('linear closed loop equals the transfer-function answer', () => {
  const gains = { Kp: 2, Ki: 1, Kd: 1, N: 20 };
  it('PID on p3: y(t) = step response of C·G/(1+C·G)', () => {
    const s = simulatePid({ plant: 'p3', ...gains, T: 20, dt: 0.01 });
    const ref = step(pidClosedLoopTF('p3', gains), s.t);
    expect(maxDiff(s.y, ref.y)).toBeLessThan(1e-7);
    expect(pidMetrics(s).overshootPct).toBeCloseTo(stepinfo(pidClosedLoopTF('p3', gains), { tEnd: 20, n: 2001 }).overshootPct, 1);
  });
  it('derivative on measurement: T = C_pi·G / (1 + (C_pi + C_d)·G)', () => {
    const s = simulatePid({ plant: 'p2', ...gains, dOnMeasurement: true, T: 15, dt: 0.01 });
    const G = PID_PLANTS.p2.tf, Cpi = pidTF({ Kp: 2, Ki: 1, Kd: 0 }), Cd = pidTF({ Kp: 0, Ki: 0, Kd: 1, N: 20 });
    const fwd = tfSeries(Cpi, G), loop = tfSeries(tfParallel(Cpi, Cd), G);
    const Tdm = tf(polyMulLocal(fwd.num, loop.den), polyMulLocal(fwd.den, polyAddLocal(loop.den, loop.num)));
    expect(maxDiff(s.y, step(Tdm, s.t).y)).toBeLessThan(1e-7);
    expect(Math.abs(s.ud[1])).toBeLessThan(0.01); // no derivative kick on the setpoint step
    const kick = simulatePid({ plant: 'p2', ...gains, T: 1, dt: 0.01 });
    expect(Math.abs(kick.ud[1])).toBeGreaterThan(0.1); // derivative on error does kick
  });
  it('setpoint weight b: y = Cr·G / (1 + C·G) · r with Cr = b·Kp + Ki/s', () => {
    const s = simulatePid({ plant: 'p1', Kp: 3, Ki: 6, Kd: 0, b: 0.4, T: 10, dt: 0.01 });
    const G = PID_PLANTS.p1.tf, C = pidTF({ Kp: 3, Ki: 6, Kd: 0 }), Cr = pidTF({ Kp: 0.4 * 3, Ki: 6, Kd: 0 });
    const L = tfSeries(C, G), fwd = tfSeries(Cr, G);
    const Tr = tf(polyMulLocal(fwd.num, L.den), polyMulLocal(fwd.den, polyAddLocal(L.den, L.num)));
    expect(maxDiff(s.y, step(Tr, s.t).y)).toBeLessThan(1e-7);
    const b1 = pidMetrics(simulatePid({ plant: 'p1', Kp: 3, Ki: 6, T: 10 })), b04 = pidMetrics(s);
    expect(b04.overshootPct).toBeLessThan(b1.overshootPct / 2); expect(b04.ess).toBeCloseTo(0, 3);
  });
  it('load disturbance at the plant input follows G/(1+CG) from t = td', () => {
    const s = simulatePid({ plant: 'p1', Kp: 2, Ki: 1, r: 0, dist: { t: 2, amp: 1 }, T: 12, dt: 0.01 });
    const G = PID_PLANTS.p1.tf, C = pidTF({ Kp: 2, Ki: 1, Kd: 0 });
    const Td = tf(polyMulLocal(G.num, C.den), polyAddLocal(polyMulLocal(G.den, C.den), polyMulLocal(G.num, C.num)));
    const ref = step(Td, s.t.slice(0, 1001));
    for (let i = 200; i <= 1000; i += 100) expect(Math.abs(s.y[i] - ref.y[i - 200])).toBeLessThan(2e-3); // the step is resolved to O(dt)
    expect(Math.abs(s.y[1199])).toBeLessThan(0.03); // integral action rejects it
  });
});
function polyMulLocal(a: number[], b: number[]) { const r = new Array(a.length + b.length - 1).fill(0); for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) r[i + j] += a[i] * b[j]; return r; }
function polyAddLocal(a: number[], b: number[]) { const n = Math.max(a.length, b.length), r = new Array(n).fill(0); a.forEach((x, i) => (r[n - a.length + i] += x)); b.forEach((x, i) => (r[n - b.length + i] += x)); return r; }

describe('numerical stability and time step', () => {
  it('converges as dt shrinks (dt = 0.01 vs 0.001)', () => {
    const a = simulatePid({ plant: 'p3', Kp: 2, Ki: 1, Kd: 1, T: 10, dt: 0.01 }), b = simulatePid({ plant: 'p3', Kp: 2, Ki: 1, Kd: 1, T: 10, dt: 0.001 });
    expect(maxDiff(a.y, b.y.filter((_, i) => i % 10 === 0))).toBeLessThan(1e-8);
  });
  it('a very fast derivative filter (N = 2000) auto-substeps and stays accurate', () => {
    const g = { Kp: 2, Ki: 1, Kd: 0.5, N: 2000 }, s = simulatePid({ plant: 'p3', ...g, T: 10, dt: 0.01 });
    expect(s.substeps).toBeGreaterThan(50); expect(s.unstable).toBe(false);
    expect(maxDiff(s.y, step(pidClosedLoopTF('p3', g), s.t).y)).toBeLessThan(1e-5);
  });
  it('flags an unstable loop instead of returning garbage', () => {
    const s = simulatePid({ plant: 'p3', Kp: 20, T: 30, dt: 0.01 }); expect(s.unstable).toBe(true); expect(pidMetrics(s).unstable).toBe(true);
    expect(pidClosedLoopPoles('p3', { Kp: 20, Ki: 0, Kd: 0 }).some((p) => p.re > 0)).toBe(true);
  });
  it('warns (rather than hides) when the 400-substep cap binds', () => {
    const s = simulatePid({ plant: 'p1', Kp: 1, Kd: 1, N: 1e6, T: 0.05, dt: 0.01 }); expect(s.warnings.length).toBe(1);
  });
});

describe('actuator limit and anti-windup', () => {
  const base: PidSimOptions = { plant: 'p1', Kp: 2, Ki: 4, r: 0.9, umax: 1, T: 15, dt: 0.01 };
  it('the applied control never exceeds ±umax', () => { const s = simulatePid({ ...base, aw: 'none' }); expect(Math.max(...s.u.map(Math.abs))).toBeLessThanOrEqual(1 + 1e-12); });
  it('windup: no AW overshoots most; clamp and back-calculation both cut it', () => {
    const os = (aw: PidSimOptions['aw'], Kt?: number) => pidMetrics(simulatePid({ ...base, aw, Kt }), { tEnd: 15 }).overshootPct;
    const none = os('none'), clamp = os('clamp'), bc = os('backcalc', 5);
    expect(none).toBeGreaterThan(clamp + 1); expect(none).toBeGreaterThan(bc + 1);
    expect(bc).toBeGreaterThanOrEqual(0);
  });
  it('without saturation all AW modes are identical', () => {
    const a = simulatePid({ plant: 'p1', Kp: 2, Ki: 1, T: 5 }), b = simulatePid({ plant: 'p1', Kp: 2, Ki: 1, T: 5, aw: 'backcalc' });
    expect(maxDiff(a.y, b.y)).toBe(0);
  });
});

describe('sensor noise', () => {
  it('is seeded: same seed same trace, different seed different trace, sigma = 0 is clean', () => {
    const o = { plant: 'p1' as const, Kp: 2, Ki: 1, T: 5, noise: 0.05 };
    const a = simulatePid({ ...o, seed: 3 }), b = simulatePid({ ...o, seed: 3 }), c = simulatePid({ ...o, seed: 4 });
    expect(a.y).toEqual(b.y); expect(a.y).not.toEqual(c.y);
    expect(simulatePid({ ...o, noise: 0 }).ym).toEqual(simulatePid({ ...o, noise: 0 }).y);
  });
  it('measured − true has the requested standard deviation', () => {
    const s = simulatePid({ plant: 'p1', Kp: 1, T: 200, noise: 0.1, seed: 11 });
    const d = s.ym.map((v, i) => v - s.y[i]), mean = d.reduce((x, y) => x + y, 0) / d.length, sd = Math.sqrt(d.reduce((x, y) => x + (y - mean) ** 2, 0) / d.length);
    expect(sd).toBeGreaterThan(0.09); expect(sd).toBeLessThan(0.11); expect(Math.abs(mean)).toBeLessThan(0.01);
    expect(seededRng(5)()).toBeGreaterThan(0);
  });
  it('noise makes the derivative term (and u) busier', () => {
    const q = simulatePid({ plant: 'p2', Kp: 2, Ki: 1, Kd: 1, N: 50, T: 10 }), n = simulatePid({ plant: 'p2', Kp: 2, Ki: 1, Kd: 1, N: 50, T: 10, noise: 0.02 });
    expect(pidMetrics(n).peakU).toBeGreaterThan(pidMetrics(q).peakU);
  });
});

describe('metrics', () => {
  it('P control on p1: IAE and ISE match their closed forms (finite horizon T = 10)', () => {
    const m = pidMetrics(simulatePid({ plant: 'p1', Kp: 4, T: 10, dt: 0.005 }));
    expect(m.iae).toBeCloseTo(0.2 * 10 + 0.8 / 5, 3); expect(m.ise).toBeCloseTo(0.04 * 10 + 0.32 / 5 + 0.64 / 10, 3);
    expect(m.ess).toBeCloseTo(0.2, 6); expect(m.overshootPct).toBeLessThan(1e-6); expect(m.peakU).toBeCloseTo(4, 6);
  });
  it('PID on p3 (2, 1, 1): overshoot near 16 %, tEnd windows work', () => {
    const s = simulatePid({ plant: 'p3', Kp: 2, Ki: 1, Kd: 1, T: 20 }); expect(pidMetrics(s).overshootPct).toBeCloseTo(16.34, 1);
    expect(pidMetrics(s, { tEnd: 10 }).iae).toBeLessThan(pidMetrics(s).iae);
  });
});

describe('validation and helpers', () => {
  it('rejects bad options', () => {
    for (const o of [{ T: -1 }, { dt: 0 }, { dt: 100 }, { b: 2 }, { umax: 0 }, { Kp: NaN }, { Kd: 1, N: 0 }]) expect(() => simulatePid({ plant: 'p1', Kp: 1, ...o })).toThrow(TFError);
    expect(() => simulatePid({ plant: 'p9' as never })).toThrow(TFError);
    expect(() => simulatePid({ plant: tf([1, 1], [1, 2]) })).toThrow(TFError); // biproper: algebraic loop
  });
  it('pidTF: Kp + Ki/s + Kd·N·s/(s+N)', () => {
    const c = pidTF({ Kp: 2, Ki: 1, Kd: 0.5, N: 10 });
    expect(c.den.length).toBe(3); expect(polyEvalReal(c.num, 1) / polyEvalReal(c.den, 1)).toBeCloseTo(2 + 1 + (0.5 * 10 * 1) / 11, 12);
  });
  it('closed-loop poles of the legacy example P on p3 with Kp = 8 lie on the imaginary axis (ultimate gain)', () => {
    const p = pidClosedLoopPoles('p3', { Kp: 8, Ki: 0, Kd: 0 }); expect(Math.max(...p.map((x) => x.re))).toBeCloseTo(0, 4);
  });
});
