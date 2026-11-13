import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { simulatePid, pidMetrics, pidClosedLoopPoles } from '@study/core/dsp';
import { PRE, windowFor, labOptions, runLab, type LabValues } from '../src/lab/model';

const S = createRequire(import.meta.url)('./legacy-pidsim.cjs');
const plants = ['p3', 'p2', 'p1'] as const;
const names = ['P', 'PI', 'PID', 'I', 'Ku', 'ZN'] as const;
const base = (plant: LabValues['plant'], g: [number, number, number], T: number): LabValues => ({ plant, Kp: g[0], Ki: g[1], Kd: g[2], N: 20, T, dist: false, noise: false, sat: false, aw: 'none', dm: false });
const legacyOpts = (v: LabValues) => ({ plant: v.plant, Kp: v.Kp, Ki: v.Ki, Kd: v.Kd, N: v.N, T: v.T, dt: 0.01, dist: v.dist ? { t: v.T / 2, amp: -0.5 } : null, noise: v.noise ? 0.01 : 0, umax: v.sat ? 1.2 : null, aw: v.aw !== 'none', dmeas: v.dm, seed: 99 });
const maxDiff = (a: number[], b: number[]) => a.reduce((m, x, i) => Math.max(m, Math.abs(x - b[i])), 0);

describe('PID Lab on the core simulator agrees with the original page (default presets)', () => {
  for (const pl of plants) for (const nm of names) {
    const g = PRE[pl][nm]; if (!g) continue;
    it(`${pl} · ${nm}: trajectories y and e to 1e-5, u to 5e-4 (core sub-steps the fast derivative filter, see pid.ts; u carries the t = 0 derivative kick) and the readouts to the displayed precision`, () => {
      const v = base(pl, g, windowFor(pl, nm)), core = simulatePid(labOptions(v)), old = S.simulate(legacyOpts(v));
      expect(core.unstable).toBe(old.unstable);
      const n = Math.min(core.y.length, old.y.length); expect(n).toBeGreaterThan(100);
      expect(maxDiff(core.y.slice(0, n), old.y.slice(0, n))).toBeLessThan(1e-5);
      expect(maxDiff(core.u.slice(0, n), old.u.slice(0, n))).toBeLessThan(5e-4);
      expect(maxDiff(core.e.slice(0, n), old.e.slice(0, n))).toBeLessThan(1e-5);
      if (core.unstable) return;
      const mc = pidMetrics(core), ml = S.metrics(old, null, 1);
      expect(mc.yFinal).toBeCloseTo(ml.yf, 5); expect(mc.ess).toBeCloseTo(ml.ess, 5); expect(mc.peakU).toBeCloseTo(ml.umax, 4); expect(mc.settled).toBe(ml.settled);
      if (ml.yf > 0) expect(mc.overshootPct).toBeCloseTo(ml.os, 2);
      expect(mc.peak).toBeCloseTo(ml.peak, 4);
      if (ml.settled) expect(Math.abs(mc.settlingTime - ml.ts)).toBeLessThanOrEqual(0.0101); // legacy reports the first sample after the last violation; core interpolates the band edge
    });
    it(`${pl} · ${nm}: closed-loop poles match`, () => {
      const v = base(pl, g, 10), a = pidClosedLoopPoles(pl, v).map((p) => p.re).sort((x, y) => x - y), b = S.closedLoopPoles(pl, v.Kp, v.Ki, v.Kd, v.N).map((p: number[]) => p[0]).sort((x: number, y: number) => x - y);
      expect(a.length).toBe(b.length); a.forEach((x, i) => expect(x).toBeCloseTo(b[i], 5));
    });
  }
  it('the toggles agree too: disturbance + noise + limit + clamp + D on measurement (PID on p2)', () => {
    const v: LabValues = { ...base('p2', PRE.p2.PID!, 10), dist: true, noise: true, sat: true, aw: 'clamp', dm: true };
    const core = simulatePid(labOptions(v)), old = S.simulate(legacyOpts(v)), n = Math.min(core.y.length, old.y.length);
    expect(maxDiff(core.y.slice(0, n), old.y.slice(0, n))).toBeLessThan(1e-5);
    expect(maxDiff(core.u.slice(0, n), old.u.slice(0, n))).toBeLessThan(5e-4);
  });
  it('runLab reports the Ziegler–Nichols ultimate gain as marginally stable (Ku = 8 on p3)', () => {
    const r = runLab(base('p3', PRE.p3.Ku!, 30)); expect(Math.abs(r.maxRe)).toBeLessThan(2e-3); expect(r.mg!.wcp ?? r.mg!.wcg).toBeGreaterThan(1.5);
  });
});
